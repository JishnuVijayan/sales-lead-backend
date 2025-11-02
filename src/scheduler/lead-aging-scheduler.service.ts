import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Lead, LeadStatus } from '../entities';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LeadAgingSchedulerService {
  private readonly logger = new Logger(LeadAgingSchedulerService.name);

  constructor(
    @InjectRepository(Lead)
    private leadsRepository: Repository<Lead>,
    private configService: ConfigService,
  ) {}

  // Run daily at 2 AM to check for dormant leads
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

  // Run daily at 9 AM to check for overdue leads and log escalation warnings
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleEscalationCheck() {
    this.logger.log('Starting escalation check job');

    try {
      const escalationThreshold = +this.configService.get('AGING_ESCALATION_THRESHOLD', 10);

      // Find leads that need escalation (overdue leads assigned to executives)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - escalationThreshold);

      const overdueLeads = await this.leadsRepository.find({
        where: {
          isActive: true,
          isConverted: false,
          lastActionDate: LessThan(cutoffDate),
          assignedToId: LessThan(''), // Has an assigned executive
        },
        relations: ['assignedTo'],
      });

      // Log escalation warnings (in a real app, this would send emails/SMS)
      for (const lead of overdueLeads) {
        this.logger.warn(
          `ESCALATION ALERT: Lead "${lead.name}" (ID: ${lead.id}) assigned to ${lead.assignedTo?.name} ` +
          `has been inactive for ${Math.floor((new Date().getTime() - new Date(lead.lastActionDate).getTime()) / (1000 * 60 * 60 * 24))} days`
        );

        // Add escalation note to lead
        lead.internalNotes = (lead.internalNotes || '') + `\n\nEscalation alert sent on ${new Date().toISOString()}`;
        await this.leadsRepository.save(lead);
      }

      this.logger.log(`Found ${overdueLeads.length} leads requiring escalation`);
    } catch (error) {
      this.logger.error('Error in escalation check job', error);
    }
  }

  // Run every hour to update lead aging status (for real-time aging display)
  @Cron(CronExpression.EVERY_HOUR)
  async updateLeadAgingStatus() {
    // This is mainly for cache invalidation or real-time updates
    // The aging calculation is done on-demand in the service
    this.logger.log('Lead aging status update check completed');
  }
}