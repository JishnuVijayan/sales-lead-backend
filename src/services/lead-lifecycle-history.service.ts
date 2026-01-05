import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Lead,
  LeadActivity,
  User,
  Proposal,
  ProposalActivity,
  Agreement,
  AgreementActivity,
  Negotiation,
  WorkOrder,
  Approval,
  ApprovalContext,
  ApprovalStatus,
} from '../entities';

export interface LifecycleHistoryItem {
  id: string;
  timestamp: Date;
  eventType: LifecycleEventType;
  entityType: 'lead' | 'proposal' | 'agreement' | 'negotiation' | 'workorder';
  entityId: string;
  title: string;
  description: string;
  user?: {
    id: string;
    name: string;
    role: string;
  };
  metadata?: {
    fromStatus?: string;
    toStatus?: string;
    amount?: number;
    approvalDecision?: 'approved' | 'rejected' | 'returned';
    activityType?: string;
    duration?: number;
    reason?: string;
    [key: string]: any;
  };
}

export enum LifecycleEventType {
  LEAD_CREATED = 'lead_created',
  LEAD_CLAIMED = 'lead_claimed',
  LEAD_STATUS_CHANGED = 'lead_status_changed',
  LEAD_ACTIVITY = 'lead_activity',
  PROPOSAL_CREATED = 'proposal_created',
  PROPOSAL_STATUS_CHANGED = 'proposal_status_changed',
  PROPOSAL_ACTIVITY = 'proposal_activity',
  PROPOSAL_APPROVAL_DECISION = 'proposal_approval_decision',
  NEGOTIATION_CREATED = 'negotiation_created',
  NEGOTIATION_ACTIVITY = 'negotiation_activity',
  WORKORDER_CREATED = 'workorder_created',
  WORKORDER_ACTIVITY = 'workorder_activity',
  AGREEMENT_CREATED = 'agreement_created',
  AGREEMENT_STATUS_CHANGED = 'agreement_status_changed',
  AGREEMENT_ACTIVITY = 'agreement_activity',
  AGREEMENT_APPROVAL_DECISION = 'agreement_approval_decision',
  AGREEMENT_SIGNED = 'agreement_signed',
}

@Injectable()
export class LeadLifecycleHistoryService {
  constructor(
    @InjectRepository(Lead)
    private leadsRepository: Repository<Lead>,
    @InjectRepository(LeadActivity)
    private leadActivitiesRepository: Repository<LeadActivity>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Proposal)
    private proposalsRepository: Repository<Proposal>,
    @InjectRepository(ProposalActivity)
    private proposalActivitiesRepository: Repository<ProposalActivity>,
    @InjectRepository(Agreement)
    private agreementsRepository: Repository<Agreement>,
    @InjectRepository(AgreementActivity)
    private agreementActivitiesRepository: Repository<AgreementActivity>,
    @InjectRepository(Negotiation)
    private negotiationsRepository: Repository<Negotiation>,
    @InjectRepository(WorkOrder)
    private workOrdersRepository: Repository<WorkOrder>,
    @InjectRepository(Approval)
    private approvalsRepository: Repository<Approval>,
  ) {}

  async getLeadLifecycleHistory(
    leadId: string,
  ): Promise<LifecycleHistoryItem[]> {
    const lead = await this.leadsRepository.findOne({ where: { id: leadId } });
    if (!lead) {
      throw new Error('Lead not found');
    }

    const allEvents: LifecycleHistoryItem[] = [];

    // Get all related entity IDs
    const relatedEntities = await this.getRelatedEntityIds(leadId);

    // Collect events from all sources
    const [
      leadEvents,
      proposalEvents,
      agreementEvents,
      negotiationEvents,
      workOrderEvents,
    ] = await Promise.all([
      this.getLeadEvents(leadId),
      this.getProposalEvents(relatedEntities.proposals),
      this.getAgreementEvents(relatedEntities.agreements),
      this.getNegotiationEvents(relatedEntities.negotiations),
      this.getWorkOrderEvents(relatedEntities.workOrders),
    ]);

    allEvents.push(...leadEvents);
    allEvents.push(...proposalEvents);
    allEvents.push(...agreementEvents);
    allEvents.push(...negotiationEvents);
    allEvents.push(...workOrderEvents);

    // Sort by timestamp (newest first)
    return allEvents.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );
  }

  private async getRelatedEntityIds(leadId: string): Promise<{
    proposals: string[];
    agreements: string[];
    negotiations: string[];
    workOrders: string[];
  }> {
    const [proposals, agreements, negotiations, workOrders] = await Promise.all(
      [
        this.proposalsRepository.find({
          where: { leadId },
          select: ['id'],
        }),
        this.agreementsRepository.find({
          where: { leadId },
          select: ['id'],
        }),
        this.negotiationsRepository.find({
          where: { leadId },
          select: ['id'],
        }),
        this.workOrdersRepository.find({
          where: { leadId },
          select: ['id'],
        }),
      ],
    );

    return {
      proposals: proposals.map((p) => p.id),
      agreements: agreements.map((a) => a.id),
      negotiations: negotiations.map((n) => n.id),
      workOrders: workOrders.map((w) => w.id),
    };
  }

  private async getLeadEvents(leadId: string): Promise<LifecycleHistoryItem[]> {
    const events: LifecycleHistoryItem[] = [];

    // Get lead with creator and assignee info
    const lead = await this.leadsRepository.findOne({
      where: { id: leadId },
      relations: ['createdBy', 'assignedTo'],
    });

    if (!lead) return events;

    // Lead created event
    events.push({
      id: `lead-created-${lead.id}`,
      timestamp: lead.createdDate,
      eventType: LifecycleEventType.LEAD_CREATED,
      entityType: 'lead',
      entityId: lead.id,
      title: 'Lead Created',
      description: `Lead "${lead.name}" was created`,
      user: lead.createdBy
        ? {
            id: lead.createdBy.id,
            name: lead.createdBy.name,
            role: lead.createdBy.role,
          }
        : undefined,
      metadata: {
        leadName: lead.name,
        source: lead.source,
        estimatedBudget: lead.estimatedBudget,
      },
    });

    // Lead claimed event (if assigned to someone other than creator)
    if (lead.assignedTo && lead.assignedTo.id !== lead.createdBy?.id) {
      // For now, we'll use the first assignment as the claim event
      // In a real implementation, you'd track assignment history
      events.push({
        id: `lead-claimed-${lead.id}`,
        timestamp: lead.createdDate, // Approximate timestamp
        eventType: LifecycleEventType.LEAD_CLAIMED,
        entityType: 'lead',
        entityId: lead.id,
        title: 'Lead Claimed',
        description: `Lead was assigned to ${lead.assignedTo.name}`,
        user: {
          id: lead.assignedTo.id,
          name: lead.assignedTo.name,
          role: lead.assignedTo.role,
        },
      });
    }

    // Lead activities
    const activities = await this.leadActivitiesRepository.find({
      where: { leadId },
      relations: ['createdBy'],
      order: { createdDate: 'DESC' },
    });

    for (const activity of activities) {
      events.push({
        id: `lead-activity-${activity.id}`,
        timestamp: activity.createdDate,
        eventType: LifecycleEventType.LEAD_ACTIVITY,
        entityType: 'lead',
        entityId: lead.id,
        title: `${activity.type} Activity`,
        description: activity.description || `${activity.type} with lead`,
        user: activity.createdBy
          ? {
              id: activity.createdBy.id,
              name: activity.createdBy.name,
              role: activity.createdBy.role,
            }
          : undefined,
        metadata: {
          type: activity.type,
          scheduledDate: activity.scheduledDate,
          completedDate: activity.completedDate,
          assignedTo: activity.assignedTo
            ? {
                id: activity.assignedTo.id,
                name: activity.assignedTo.name,
              }
            : undefined,
        },
      });
    }

    return events;
  }

  private async getProposalEvents(
    proposalIds: string[],
  ): Promise<LifecycleHistoryItem[]> {
    const events: LifecycleHistoryItem[] = [];

    if (proposalIds.length === 0) return events;

    const proposals = await this.proposalsRepository.find({
      where: { id: proposalIds.length === 1 ? proposalIds[0] : undefined },
      relations: ['createdBy', 'lead'],
    });

    for (const proposal of proposals) {
      // Proposal created event
      events.push({
        id: `proposal-created-${proposal.id}`,
        timestamp: proposal.createdDate,
        eventType: LifecycleEventType.PROPOSAL_CREATED,
        entityType: 'proposal',
        entityId: proposal.id,
        title: 'Proposal Created',
        description: `Proposal "${proposal.title}" was created for lead "${proposal.lead?.name}"`,
        user: proposal.createdBy
          ? {
              id: proposal.createdBy.id,
              name: proposal.createdBy.name,
              role: proposal.createdBy.role,
            }
          : undefined,
        metadata: {
          proposalTitle: proposal.title,
          totalAmount: proposal.totalAmount,
          leadName: proposal.lead?.name,
        },
      });

      // Proposal activities
      const activities = await this.proposalActivitiesRepository.find({
        where: { proposalId: proposal.id },
        relations: ['createdBy'],
        order: { createdDate: 'DESC' },
      });

      for (const activity of activities) {
        events.push({
          id: `proposal-activity-${activity.id}`,
          timestamp: activity.createdDate,
          eventType: LifecycleEventType.PROPOSAL_ACTIVITY,
          entityType: 'proposal',
          entityId: proposal.id,
          title: `${activity.activityType} Activity`,
          description:
            activity.description ||
            `${activity.activityType} activity on proposal`,
          user: activity.createdBy
            ? {
                id: activity.createdBy.id,
                name: activity.createdBy.name,
                role: activity.createdBy.role,
              }
            : undefined,
          metadata: {
            activityType: activity.activityType,
            subject: activity.subject,
            isCompleted: activity.isCompleted,
          },
        });
      }

      // Proposal approval decisions
      const approvals = await this.approvalsRepository.find({
        where: { entityId: proposal.id, context: ApprovalContext.PROPOSAL },
        relations: ['approver'],
        order: { respondedDate: 'DESC' },
      });

      for (const approval of approvals) {
        if (approval.status !== ApprovalStatus.PENDING) {
          events.push({
            id: `proposal-approval-${approval.id}`,
            timestamp: approval.respondedDate || approval.createdDate,
            eventType: LifecycleEventType.PROPOSAL_APPROVAL_DECISION,
            entityType: 'proposal',
            entityId: proposal.id,
            title: `Proposal ${approval.status === ApprovalStatus.APPROVED ? 'Approved' : approval.status === ApprovalStatus.REJECTED ? 'Rejected' : 'Returned'}`,
            description: `${approval.status === ApprovalStatus.APPROVED ? 'Approved' : approval.status === ApprovalStatus.REJECTED ? 'Rejected' : 'Returned'} by ${approval.approver?.name || 'Unknown'}`,
            user: approval.approver
              ? {
                  id: approval.approver.id,
                  name: approval.approver.name,
                  role: approval.approver.role,
                }
              : undefined,
            metadata: {
              stage: approval.stage,
              comments: approval.comments,
              approvalDecision:
                approval.status === ApprovalStatus.APPROVED
                  ? 'approved'
                  : approval.status === ApprovalStatus.REJECTED
                    ? 'rejected'
                    : 'returned',
            },
          });
        }
      }
    }

    return events;
  }

  private async getAgreementEvents(
    agreementIds: string[],
  ): Promise<LifecycleHistoryItem[]> {
    const events: LifecycleHistoryItem[] = [];

    if (agreementIds.length === 0) return events;

    const agreements = await this.agreementsRepository.find({
      where: { id: agreementIds.length === 1 ? agreementIds[0] : undefined },
      relations: ['createdBy', 'lead'],
    });

    for (const agreement of agreements) {
      // Agreement created event
      events.push({
        id: `agreement-created-${agreement.id}`,
        timestamp: agreement.createdDate,
        eventType: LifecycleEventType.AGREEMENT_CREATED,
        entityType: 'agreement',
        entityId: agreement.id,
        title: 'Agreement Created',
        description: `Agreement was created for lead "${agreement.lead?.name}"`,
        user: agreement.createdBy
          ? {
              id: agreement.createdBy.id,
              name: agreement.createdBy.name,
              role: agreement.createdBy.role,
            }
          : undefined,
        metadata: {
          contractValue: agreement.contractValue,
          leadName: agreement.lead?.name,
        },
      });

      // Agreement signed events
      if (agreement.clientSignedDate) {
        events.push({
          id: `agreement-client-signed-${agreement.id}`,
          timestamp: agreement.clientSignedDate,
          eventType: LifecycleEventType.AGREEMENT_SIGNED,
          entityType: 'agreement',
          entityId: agreement.id,
          title: 'Agreement Signed by Client',
          description: 'Client signed the agreement',
          metadata: {
            signedBy: 'client',
          },
        });
      }

      if (agreement.companySignedDate) {
        events.push({
          id: `agreement-company-signed-${agreement.id}`,
          timestamp: agreement.companySignedDate,
          eventType: LifecycleEventType.AGREEMENT_SIGNED,
          entityType: 'agreement',
          entityId: agreement.id,
          title: 'Agreement Signed by Company',
          description: 'Company signed the agreement',
          metadata: {
            signedBy: 'company',
          },
        });
      }

      // Agreement activities
      const activities = await this.agreementActivitiesRepository.find({
        where: { agreementId: agreement.id },
        relations: ['createdBy'],
        order: { createdDate: 'DESC' },
      });

      for (const activity of activities) {
        events.push({
          id: `agreement-activity-${activity.id}`,
          timestamp: activity.createdDate,
          eventType: LifecycleEventType.AGREEMENT_ACTIVITY,
          entityType: 'agreement',
          entityId: agreement.id,
          title: `${activity.activityType} Activity`,
          description:
            activity.description ||
            `${activity.activityType} activity on agreement`,
          user: activity.createdBy
            ? {
                id: activity.createdBy.id,
                name: activity.createdBy.name,
                role: activity.createdBy.role,
              }
            : undefined,
          metadata: {
            activityType: activity.activityType,
            subject: activity.subject,
            isCompleted: activity.isCompleted,
          },
        });
      }

      // Agreement approval decisions
      const approvals = await this.approvalsRepository.find({
        where: { entityId: agreement.id, context: ApprovalContext.AGREEMENT },
        relations: ['approver'],
        order: { respondedDate: 'DESC' },
      });

      for (const approval of approvals) {
        if (approval.status !== ApprovalStatus.PENDING) {
          events.push({
            id: `agreement-approval-${approval.id}`,
            timestamp: approval.respondedDate || approval.createdDate,
            eventType: LifecycleEventType.AGREEMENT_APPROVAL_DECISION,
            entityType: 'agreement',
            entityId: agreement.id,
            title: `Agreement ${approval.status === ApprovalStatus.APPROVED ? 'Approved' : approval.status === ApprovalStatus.REJECTED ? 'Rejected' : 'Returned'}`,
            description: `${approval.status === ApprovalStatus.APPROVED ? 'Approved' : approval.status === ApprovalStatus.REJECTED ? 'Rejected' : 'Returned'} by ${approval.approver?.name || 'Unknown'}`,
            user: approval.approver
              ? {
                  id: approval.approver.id,
                  name: approval.approver.name,
                  role: approval.approver.role,
                }
              : undefined,
            metadata: {
              stage: approval.stage,
              comments: approval.comments,
              approvalDecision:
                approval.status === ApprovalStatus.APPROVED
                  ? 'approved'
                  : approval.status === ApprovalStatus.REJECTED
                    ? 'rejected'
                    : 'returned',
            },
          });
        }
      }
    }

    return events;
  }

  private async getNegotiationEvents(
    negotiationIds: string[],
  ): Promise<LifecycleHistoryItem[]> {
    const events: LifecycleHistoryItem[] = [];

    if (negotiationIds.length === 0) return events;

    const negotiations = await this.negotiationsRepository.find({
      where: {
        id: negotiationIds.length === 1 ? negotiationIds[0] : undefined,
      },
      relations: ['createdBy', 'lead'],
    });

    for (const negotiation of negotiations) {
      // Negotiation created event
      events.push({
        id: `negotiation-created-${negotiation.id}`,
        timestamp: negotiation.createdDate,
        eventType: LifecycleEventType.NEGOTIATION_CREATED,
        entityType: 'negotiation',
        entityId: negotiation.id,
        title: 'Negotiation Started',
        description: `Negotiation started for lead "${negotiation.lead?.name}"`,
        user: negotiation.negotiator
          ? {
              id: negotiation.negotiator.id,
              name: negotiation.negotiator.name,
              role: negotiation.negotiator.role,
            }
          : undefined,
        metadata: {
          expectedAmount: negotiation.expectedAmount,
          finalAmount: negotiation.finalAmount,
          leadName: negotiation.lead?.name,
        },
      });

      // For now, we'll add a placeholder for negotiation activities
      // In a real implementation, you'd have a NegotiationActivity entity
      events.push({
        id: `negotiation-activity-${negotiation.id}`,
        timestamp: negotiation.createdDate,
        eventType: LifecycleEventType.NEGOTIATION_ACTIVITY,
        entityType: 'negotiation',
        entityId: negotiation.id,
        title: 'Negotiation Activity',
        description: 'Negotiation process initiated',
        user: negotiation.negotiator
          ? {
              id: negotiation.negotiator.id,
              name: negotiation.negotiator.name,
              role: negotiation.negotiator.role,
            }
          : undefined,
      });
    }

    return events;
  }

  private async getWorkOrderEvents(
    workOrderIds: string[],
  ): Promise<LifecycleHistoryItem[]> {
    const events: LifecycleHistoryItem[] = [];

    if (workOrderIds.length === 0) return events;

    const workOrders = await this.workOrdersRepository.find({
      where: { id: workOrderIds.length === 1 ? workOrderIds[0] : undefined },
      relations: ['createdBy', 'lead'],
    });

    for (const workOrder of workOrders) {
      // Work order created event
      events.push({
        id: `workorder-created-${workOrder.id}`,
        timestamp: workOrder.createdDate,
        eventType: LifecycleEventType.WORKORDER_CREATED,
        entityType: 'workorder',
        entityId: workOrder.id,
        title: 'Work Order Created',
        description: `Work order created for lead "${workOrder.lead?.name}"`,
        user: workOrder.createdBy
          ? {
              id: workOrder.createdBy.id,
              name: workOrder.createdBy.name,
              role: workOrder.createdBy.role,
            }
          : undefined,
        metadata: {
          orderValue: workOrder.orderValue,
          leadName: workOrder.lead?.name,
        },
      });

      // For now, we'll add a placeholder for work order activities
      // In a real implementation, you'd have a WorkOrderActivity entity
      events.push({
        id: `workorder-activity-${workOrder.id}`,
        timestamp: workOrder.createdDate,
        eventType: LifecycleEventType.WORKORDER_ACTIVITY,
        entityType: 'workorder',
        entityId: workOrder.id,
        title: 'Work Order Activity',
        description: 'Work order processing initiated',
        user: workOrder.createdBy
          ? {
              id: workOrder.createdBy.id,
              name: workOrder.createdBy.name,
              role: workOrder.createdBy.role,
            }
          : undefined,
      });
    }

    return events;
  }
}
