import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Not } from 'typeorm';
import { Lead, LeadStatus, LeadAgingStatus, User, UserRole } from '../entities';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from '../modules/notifications/notifications.service';
import { SLAService } from '../modules/sla/sla.service';
import { SLAStageType } from '../entities/sla-config.entity';

@Injectable()
export class LeadAgingSchedulerService {
  private readonly logger = new Logger(LeadAgingSchedulerService.name);

  constructor(
    @InjectRepository(Lead)
    private leadsRepository: Repository<Lead>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private configService: ConfigService,
    private notificationsService: NotificationsService,
    private slaService: SLAService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleAutoCloseDormantLeads() {
    this.logger.log('Starting auto-close dormant leads job');

    try {
      const dormantThreshold = +this.configService.get('AGING_DORMANT_THRESHOLD', 30);

      // Find leads that haven't had action for more than the dormant threshold
      // and are not already closed or dormant
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - dormantThreshold);

      const dormantLeads = await this.leadsRepository.find({
        where: {
          isActive: true,
          isConverted: false,
          lastActionDate: LessThan(cutoffDate),
          status: LeadStatus.NEW, // Only auto-close leads that are still in NEW status
        },
      });

      let closedCount = 0;
      for (const lead of dormantLeads) {
        lead.status = LeadStatus.DORMANT;
        lead.dormantDate = new Date();
        lead.isActive = false;
        lead.internalNotes = (lead.internalNotes || '') + `\n\nAuto-closed as dormant on ${new Date().toISOString()}`;

        await this.leadsRepository.save(lead);
        closedCount++;
      }

      this.logger.log(`Auto-closed ${closedCount} dormant leads`);
    } catch (error) {
      this.logger.error('Error in auto-close dormant leads job', error);
    }
  }

  // Run daily at 9 AM to check for overdue leads and send notifications based on SLA
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleEscalationCheck() {
    this.logger.log('Starting escalation check job');

    try {
      // Find all active leads to check against SLA thresholds
      const activeLeads = await this.leadsRepository.find({
        where: {
          isActive: true,
          isConverted: false,
        },
        relations: ['assignedTo'],
      });

      let idleCount = 0;
      let escalationCount = 0;

      for (const lead of activeLeads) {
        const daysIdle = Math.floor(
          (new Date().getTime() - new Date(lead.lastActionDate).getTime()) / (1000 * 60 * 60 * 24)
        );

        // Get SLA config for lead's current status
        let slaStageType: SLAStageType;
        switch (lead.status) {
          case LeadStatus.NEW:
            slaStageType = SLAStageType.LEAD_NEW;
            break;
          case LeadStatus.QUALIFIED:
            slaStageType = SLAStageType.LEAD_QUALIFIED;
            break;
          case LeadStatus.PROPOSAL:
            slaStageType = SLAStageType.LEAD_PROPOSAL;
            break;
          case LeadStatus.NEGOTIATION:
            slaStageType = SLAStageType.LEAD_NEGOTIATION;
            break;
          default:
            continue; // Skip closed/won/lost leads
        }

        const slaConfig = await this.slaService.findByStage(slaStageType);
        if (!slaConfig) continue;

        // Check if lead has breached SLA thresholds
        if (daysIdle >= slaConfig.escalationThresholdDays && lead.assignedTo) {
          // Escalate to Sales Manager
          const salesManager = await this.usersRepository.findOne({
            where: { role: UserRole.SALES_MANAGER },
          });

          if (salesManager) {
            await this.notificationsService.notifyLeadEscalation(
              lead.id,
              salesManager.id,
              lead.assignedTo.name,
              daysIdle
            );
            escalationCount++;

            // Add escalation note to lead
            lead.internalNotes = (lead.internalNotes || '') + 
              `\n\nEscalated to Sales Manager on ${new Date().toISOString()} (${daysIdle} days idle)`;
            await this.leadsRepository.save(lead);

            this.logger.warn(
              `ESCALATED: Lead "${lead.name}" (ID: ${lead.id}) to Sales Manager after ${daysIdle} days`
            );
          }
        } else if (daysIdle >= slaConfig.criticalThresholdDays && lead.assignedTo) {
          // Send critical SLA notification
          await this.notificationsService.notifySLACritical(
            'Lead',
            lead.id,
            lead.assignedTo.id,
            slaStageType
          );
          idleCount++;
        } else if (daysIdle >= slaConfig.warningThresholdDays && lead.assignedTo) {
          // Send warning notification
          await this.notificationsService.notifySLAWarning(
            'Lead',
            lead.id,
            lead.assignedTo.id,
            slaStageType
          );
          idleCount++;
        }
      }

      this.logger.log(`Sent ${idleCount} idle lead notifications and ${escalationCount} escalations`);
    } catch (error) {
      this.logger.error('Error in escalation check job', error);
    }
  }

  // Run every hour to update lead aging status (for real-time aging display)
  @Cron(CronExpression.EVERY_HOUR)
  async updateLeadAgingStatus() {
    this.logger.log('Starting lead aging status update');

    try {
      const activeLeads = await this.leadsRepository.find({
        where: {
          isActive: true,
          isConverted: false,
        },
      });

      for (const lead of activeLeads) {
        const now = new Date();
        const leadAge = Math.floor(
          (now.getTime() - new Date(lead.createdDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        const daysSinceLastAction = Math.floor(
          (now.getTime() - new Date(lead.lastActionDate).getTime()) / (1000 * 60 * 60 * 24)
        );

        lead.leadAge = leadAge;
        lead.daysSinceLastAction = daysSinceLastAction;

        // Update aging status based on SLA thresholds
        let slaStageType: SLAStageType;
        switch (lead.status) {
          case LeadStatus.NEW:
            slaStageType = SLAStageType.LEAD_NEW;
            break;
          case LeadStatus.QUALIFIED:
            slaStageType = SLAStageType.LEAD_QUALIFIED;
            break;
          case LeadStatus.PROPOSAL:
            slaStageType = SLAStageType.LEAD_PROPOSAL;
            break;
          case LeadStatus.NEGOTIATION:
            slaStageType = SLAStageType.LEAD_NEGOTIATION;
            break;
          default:
            continue;
        }

        const slaConfig = await this.slaService.findByStage(slaStageType);
        if (slaConfig) {
          if (daysSinceLastAction <= slaConfig.warningThresholdDays) {
            lead.agingStatus = LeadAgingStatus.ACTIVE;
          } else if (daysSinceLastAction <= slaConfig.criticalThresholdDays) {
            lead.agingStatus = LeadAgingStatus.NEEDS_ATTENTION;
          } else {
            lead.agingStatus = LeadAgingStatus.OVERDUE;
          }
        }
      }

      await this.leadsRepository.save(activeLeads);
      this.logger.log(`Updated aging status for ${activeLeads.length} leads`);
    } catch (error) {
      this.logger.error('Error updating lead aging status', error);
    }
  }

  // Run daily at 8 AM to check agreement stage delays
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handleAgreementStageMonitoring() {
    this.logger.log('Starting agreement stage monitoring job');

    try {
      const { Agreement, AgreementStage } = await import('../entities/index.js');
      const agreementRepo = this.leadsRepository.manager.getRepository(Agreement);

      const activeAgreements = await agreementRepo.find({
        where: [
          { stage: AgreementStage.DRAFT },
          { stage: AgreementStage.LEGAL_REVIEW },
          { stage: AgreementStage.DELIVERY_REVIEW },
          { stage: AgreementStage.PROCUREMENT_REVIEW },
          { stage: AgreementStage.FINANCE_REVIEW },
          { stage: AgreementStage.CLIENT_REVIEW },
          { stage: AgreementStage.CEO_APPROVAL },
          { stage: AgreementStage.ULCCS_APPROVAL },
        ],
        relations: ['lead', 'lead.assignedTo', 'stageHistory'],
      });

      let delayCount = 0;

      for (const agreement of activeAgreements) {
        // Get current stage from most recent stage history entry
        const currentStageHistory = agreement.stageHistory?.sort(
          (a, b) => new Date(b.changedDate).getTime() - new Date(a.changedDate).getTime()
        )[0];

        if (!currentStageHistory) continue;

        const daysInStage = Math.floor(
          (new Date().getTime() - new Date(currentStageHistory.changedDate).getTime()) / (1000 * 60 * 60 * 24)
        );

        // Map agreement stage to SLA stage type
        let slaStageType: SLAStageType;
        switch (agreement.stage) {
          case AgreementStage.DRAFT:
            slaStageType = SLAStageType.AGREEMENT_DRAFT;
            break;
          case AgreementStage.LEGAL_REVIEW:
            slaStageType = SLAStageType.AGREEMENT_LEGAL_REVIEW;
            break;
          case AgreementStage.DELIVERY_REVIEW:
            slaStageType = SLAStageType.AGREEMENT_DELIVERY_REVIEW;
            break;
          case AgreementStage.PROCUREMENT_REVIEW:
            slaStageType = SLAStageType.AGREEMENT_PROCUREMENT_REVIEW;
            break;
          case AgreementStage.FINANCE_REVIEW:
            slaStageType = SLAStageType.AGREEMENT_FINANCE_REVIEW;
            break;
          case AgreementStage.CLIENT_REVIEW:
            slaStageType = SLAStageType.AGREEMENT_CLIENT_REVIEW;
            break;
          case AgreementStage.CEO_APPROVAL:
            slaStageType = SLAStageType.AGREEMENT_CEO_APPROVAL;
            break;
          case AgreementStage.ULCCS_APPROVAL:
            slaStageType = SLAStageType.AGREEMENT_ULCCS_APPROVAL;
            break;
          default:
            continue;
        }

        const slaConfig = await this.slaService.findByStage(slaStageType);
        if (!slaConfig) continue;

        // Check SLA thresholds and send appropriate notifications
        if (daysInStage >= slaConfig.criticalThresholdDays) {
          // Send critical delay notification to assigned executive
          const recipient = agreement.lead?.assignedTo;
          
          if (recipient) {
            await this.notificationsService.notifyAgreementStageDelay(
              agreement.id,
              recipient.id,
              agreement.stage,
              daysInStage
            );
          }

          // Special handling for CEO approval
          if (agreement.stage === AgreementStage.CEO_APPROVAL) {
            const ceo = await this.usersRepository.findOne({
              where: { role: UserRole.CEO },
            });
            if (ceo) {
              await this.notificationsService.notifyCEOApprovalPending(agreement.id, ceo.id);
            }
          }

          // Special handling for client review
          if (agreement.stage === AgreementStage.CLIENT_REVIEW && agreement.lead?.assignedTo) {
            await this.notificationsService.notifyClientReviewReminder(
              agreement.id,
              agreement.lead.assignedTo.id,
              daysInStage
            );
          }

          delayCount++;
          this.logger.warn(
            `AGREEMENT DELAY: Agreement ${agreement.id} in ${agreement.stage} for ${daysInStage} days`
          );
        } else if (daysInStage >= slaConfig.warningThresholdDays) {
          // Send warning notification
          const recipient = agreement.lead?.assignedTo;
          if (recipient) {
            await this.notificationsService.notifySLAWarning(
              'Agreement',
              agreement.id,
              recipient.id,
              slaStageType
            );
          }
        }
      }

      this.logger.log(`Found ${delayCount} delayed agreements`);
    } catch (error) {
      this.logger.error('Error in agreement stage monitoring job', error);
    }
  }
}
