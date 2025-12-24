import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Notification, NotificationType } from '../../entities/notification.entity';
import { User, UserRole } from '../../entities/user.entity';
import { Lead } from '../../entities/lead.entity';
import { Agreement } from '../../entities/agreement.entity';
import { NotificationsService } from './notifications.service';

@Injectable()
export class ComprehensiveNotificationsService {
  private readonly logger = new Logger(ComprehensiveNotificationsService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Lead)
    private leadsRepository: Repository<Lead>,
    @InjectRepository(Agreement)
    private agreementsRepository: Repository<Agreement>,
    private notificationsService: NotificationsService,
  ) {}

  // ==================== LEAD LIFECYCLE NOTIFICATIONS ====================

  /**
   * Stage 1: Lead Creation
   */
  async notifyLeadCreated(leadId: string, createdById: string): Promise<void> {
    const lead = await this.leadsRepository.findOne({
      where: { id: leadId },
      relations: ['assignedTo'],
    });

    if (!lead) return;

    // Fetch creator user info
    const creator = await this.usersRepository.findOne({
      where: { id: createdById },
    });
    const creatorName = creator?.name || 'Unknown User';

    // Notify assigned user (if different from creator)
    if (lead.assignedToId && lead.assignedToId !== createdById) {
      await this.notificationsService.createNotification(
        lead.assignedToId,
        NotificationType.LEAD_ASSIGNED,
        'New Lead Assigned to You',
        `<p>A new lead <strong>${lead.organization || lead.name}</strong> has been assigned to you by <strong>${creatorName}</strong>.</p>
         <p><strong>Contact:</strong> ${lead.name}</p>
         <p><strong>Source:</strong> ${lead.source}</p>
         <p>Please review and take appropriate action.</p>`,
        'Lead',
        leadId,
      );
    }

    // Notify Sales Manager
    const salesManagers = await this.usersRepository.find({
      where: { role: UserRole.SALES_MANAGER },
    });

    for (const manager of salesManagers) {
      await this.notificationsService.createNotification(
        manager.id,
        NotificationType.LEAD_CREATED,
        'New Lead Created',
        `<p>A new lead <strong>${lead.organization || lead.name}</strong> has been created by <strong>${creatorName}</strong>.</p>
         <p><strong>Status:</strong> ${lead.status}</p>`,
        'Lead',
        leadId,
      );
    }
  }

  /**
   * Stage 2: Lead Qualification
   */
  async notifyLeadQualified(leadId: string, qualifiedById: string): Promise<void> {
    const lead = await this.leadsRepository.findOne({
      where: { id: leadId },
      relations: ['createdBy', 'assignedTo'],
    });

    if (!lead) return;

    const recipients: string[] = [];
    
    // Notify lead creator
    if (lead.createdById && lead.createdById !== qualifiedById) {
      recipients.push(lead.createdById);
    }

    // Notify assigned user
    if (lead.assignedToId && lead.assignedToId !== qualifiedById) {
      recipients.push(lead.assignedToId);
    }

    for (const recipientId of [...new Set(recipients)]) {
      await this.notificationsService.createNotification(
        recipientId,
        NotificationType.LEAD_QUALIFIED,
        'Lead Qualified',
        `<p>Lead <strong>${lead.organization || lead.name}</strong> has been qualified.</p>
         <p><strong>Estimated Budget:</strong> ₹${lead.estimatedBudget?.toLocaleString('en-IN') || 'N/A'}</p>
         <p>You can now proceed with proposal preparation.</p>
         <p><a href="${process.env.FRONTEND_URL}/app/leads/${leadId}">View Lead</a></p>`,
        'Lead',
        leadId,
      );
    }
  }

  async notifyLeadQualificationRejected(leadId: string, reason: string): Promise<void> {
    const lead = await this.leadsRepository.findOne({
      where: { id: leadId },
      relations: ['createdBy', 'assignedTo'],
    });

    if (!lead) return;

    const recipients = [lead.createdById, lead.assignedToId].filter(Boolean);

    for (const recipientId of [...new Set(recipients)]) {
      await this.notificationsService.createNotification(
        recipientId,
        NotificationType.LEAD_QUALIFICATION_REJECTED,
        'Lead Qualification Rejected',
        `<p>Lead <strong>${lead.organization || lead.name}</strong> qualification was rejected.</p>
         <p><strong>Reason:</strong> ${reason}</p>
         <p><a href="${process.env.FRONTEND_URL}/app/leads/${leadId}">View Lead</a></p>`,
        'Lead',
        leadId,
      );
    }
  }

  /**
   * Stage 4: Proposal Creation
   */
  async notifyProposalCreated(proposalId: string, leadId: string, createdById: string): Promise<void> {
    const lead = await this.leadsRepository.findOne({
      where: { id: leadId },
      relations: ['assignedTo'],
    });

    if (!lead) return;

    // Notify presales team
    const presalesUsers = await this.usersRepository.find({
      where: { role: UserRole.PRESALES },
    });

    for (const user of presalesUsers) {
      await this.notificationsService.createNotification(
        user.id,
        NotificationType.PROPOSAL_CREATED,
        'New Proposal Created - Review Required',
        `<p>A new proposal has been created for lead <strong>${lead.organization || lead.name}</strong>.</p>
         <p>Your technical review is required.</p>
         <p><a href="${process.env.FRONTEND_URL}/app/proposals/${proposalId}">View Proposal</a></p>`,
        'Proposal',
        proposalId,
      );
    }
  }

  /**
   * Stage 5: Internal Approvals
   */
  async notifyProposalApprovalRequired(proposalId: string, approverRole: UserRole, leadName: string): Promise<void> {
    const approvers = await this.usersRepository.find({
      where: { role: approverRole },
    });

    const roleNames = {
      [UserRole.ACCOUNT_MANAGER]: 'Account Manager',
      [UserRole.FINANCE]: 'Finance Team',
      [UserRole.PROCUREMENT]: 'Procurement Team',
      [UserRole.DELIVERY_MANAGER]: 'Delivery Manager',
    };

    for (const approver of approvers) {
      await this.notificationsService.createNotification(
        approver.id,
        NotificationType.PROPOSAL_APPROVAL_REQUIRED,
        `Proposal Approval Required - ${roleNames[approverRole] || approverRole}`,
        `<p>A proposal for <strong>${leadName}</strong> requires your approval.</p>
         <p>Please review and approve or provide feedback.</p>
         <p><a href="${process.env.FRONTEND_URL}/app/proposals/${proposalId}">Review Proposal</a></p>`,
        'Proposal',
        proposalId,
      );
    }
  }

  async notifyProposalApproved(proposalId: string, approvedBy: string, approverRole: string, accountManagerId: string): Promise<void> {
    await this.notificationsService.createNotification(
      accountManagerId,
      NotificationType.PROPOSAL_APPROVED,
      `Proposal Approved by ${approverRole}`,
      `<p>Your proposal has been approved by ${approverRole}.</p>
       <p><a href="${process.env.FRONTEND_URL}/app/proposals/${proposalId}">View Proposal</a></p>`,
      'Proposal',
      proposalId,
    );
  }

  async notifyProposalRejected(proposalId: string, rejectedBy: string, reason: string, accountManagerId: string): Promise<void> {
    await this.notificationsService.createNotification(
      accountManagerId,
      NotificationType.PROPOSAL_REJECTED,
      'Proposal Requires Revision',
      `<p>Your proposal requires revision.</p>
       <p><strong>Feedback:</strong> ${reason}</p>
       <p><a href="${process.env.FRONTEND_URL}/app/proposals/${proposalId}">View Proposal</a></p>`,
      'Proposal',
      proposalId,
    );
  }

  /**
   * Stage 6: Client Negotiation
   */
  async notifyNegotiationStarted(negotiationId: string, leadName: string, accountManagerId: string): Promise<void> {
    // Notify Sales Manager
    const salesManagers = await this.usersRepository.find({
      where: { role: UserRole.SALES_MANAGER },
    });

    for (const manager of salesManagers) {
      await this.notificationsService.createNotification(
        manager.id,
        NotificationType.NEGOTIATION_STARTED,
        'Negotiation Started',
        `<p>Negotiation has started for <strong>${leadName}</strong>.</p>
         <p><a href="${process.env.FRONTEND_URL}/app/negotiations/${negotiationId}">View Negotiation</a></p>`,
        'Negotiation',
        negotiationId,
      );
    }
  }

  async notifyNegotiationUpdated(negotiationId: string, leadName: string, updateType: string, stakeholders: string[]): Promise<void> {
    for (const userId of stakeholders) {
      await this.notificationsService.createNotification(
        userId,
        NotificationType.NEGOTIATION_UPDATED,
        `Negotiation Update - ${updateType}`,
        `<p>Negotiation for <strong>${leadName}</strong> has been updated.</p>
         <p><strong>Update:</strong> ${updateType}</p>
         <p><a href="${process.env.FRONTEND_URL}/app/negotiations/${negotiationId}">View Negotiation</a></p>`,
        'Negotiation',
        negotiationId,
      );
    }
  }

  /**
   * Stage 7: Work Order & Lead Won
   */
  async notifyLeadWon(leadId: string, leadName: string, workOrderId: string): Promise<void> {
    const lead = await this.leadsRepository.findOne({
      where: { id: leadId },
      relations: ['createdBy', 'assignedTo'],
    });

    if (!lead) return;

    const recipients = [lead.createdById, lead.assignedToId].filter(Boolean);

    // Notify Account Manager and Creator
    for (const recipientId of [...new Set(recipients)]) {
      await this.notificationsService.createNotification(
        recipientId,
        NotificationType.LEAD_WON,
        '🎉 Congratulations! Lead Won',
        `<p><strong>Congratulations!</strong> Lead <strong>${leadName}</strong> has been marked as Won.</p>
         <p>A work order has been created.</p>
         <p><a href="${process.env.FRONTEND_URL}/app/work-orders/${workOrderId}">View Work Order</a></p>`,
        'Lead',
        leadId,
      );
    }

    // Notify Sales Manager
    const salesManagers = await this.usersRepository.find({
      where: { role: UserRole.SALES_MANAGER },
    });

    for (const manager of salesManagers) {
      await this.notificationsService.createNotification(
        manager.id,
        NotificationType.LEAD_WON,
        'Lead Won - Work Order Created',
        `<p>Lead <strong>${leadName}</strong> has been successfully converted to Won.</p>
         <p><a href="${process.env.FRONTEND_URL}/app/work-orders/${workOrderId}">View Work Order</a></p>`,
        'Lead',
        leadId,
      );
    }

    // Notify Delivery Manager
    const deliveryManagers = await this.usersRepository.find({
      where: { role: UserRole.DELIVERY_MANAGER },
    });

    for (const dm of deliveryManagers) {
      await this.notificationsService.createNotification(
        dm.id,
        NotificationType.WORK_ORDER_CREATED,
        'New Work Order - Action Required',
        `<p>A new work order has been created for <strong>${leadName}</strong>.</p>
         <p>Please review and begin planning for delivery.</p>
         <p><a href="${process.env.FRONTEND_URL}/app/work-orders/${workOrderId}">View Work Order</a></p>`,
        'WorkOrder',
        workOrderId,
      );
    }
  }

  async notifyWorkOrderAssigned(workOrderId: string, assignedToId: string, workOrderTitle: string): Promise<void> {
    await this.notificationsService.createNotification(
      assignedToId,
      NotificationType.WORK_ORDER_ASSIGNED,
      'Work Order Assigned to You',
      `<p>Work order <strong>${workOrderTitle}</strong> has been assigned to you.</p>
       <p>Please review the requirements and begin planning.</p>
       <p><a href="${process.env.FRONTEND_URL}/app/work-orders/${workOrderId}">View Work Order</a></p>`,
      'WorkOrder',
      workOrderId,
    );
  }

  // ==================== AGREEMENT LIFECYCLE NOTIFICATIONS ====================

  /**
   * Stage 8: Agreement Drafting
   */
  async notifyAgreementCreated(agreementId: string, leadName: string): Promise<void> {
    // Notify Legal Team
    const legalTeam = await this.usersRepository.find({
      where: { role: UserRole.LEGAL },
    });

    for (const user of legalTeam) {
      await this.notificationsService.createNotification(
        user.id,
        NotificationType.LEGAL_REVIEW_REQUIRED,
        'New Agreement - Legal Review Required',
        `<p>A new agreement for <strong>${leadName}</strong> has been created.</p>
         <p>Please draft or review the agreement and ensure legal compliance.</p>
         <p><a href="${process.env.FRONTEND_URL}/app/agreements/${agreementId}">Review Agreement</a></p>`,
        'Agreement',
        agreementId,
      );
    }
  }

  /**
   * Agreement Stage Change Notifications
   */
  async notifyAgreementStageChange(agreementId: string, newStage: string, agreement: any): Promise<void> {
    const stageNotificationMap = {
      'Legal Review': { role: UserRole.LEGAL, type: NotificationType.LEGAL_REVIEW_REQUIRED },
      'Delivery Review': { role: UserRole.DELIVERY_MANAGER, type: NotificationType.DELIVERY_REVIEW_REQUIRED },
      'Procurement Review': { role: UserRole.PROCUREMENT, type: NotificationType.PROCUREMENT_REVIEW_REQUIRED },
      'Finance Review': { role: UserRole.FINANCE, type: NotificationType.FINANCE_REVIEW_REQUIRED },
      'Client Review': { role: null, type: NotificationType.CLIENT_REVIEW_REQUIRED }, // Account Manager
      'CEO Approval': { role: UserRole.CEO, type: NotificationType.CEO_APPROVAL_PENDING },
      'ULCCS Approval': { role: UserRole.ULCCS_APPROVER, type: NotificationType.ULCCS_APPROVAL_PENDING },
    };

    const config = stageNotificationMap[newStage];
    if (!config) return;

    let recipients: User[] = [];

    if (config.role) {
      recipients = await this.usersRepository.find({
        where: { role: config.role },
      });
    } else if (newStage === 'Client Review') {
      // Notify Account Manager for client review
      if (agreement.lead?.assignedToId) {
        const accountManager = await this.usersRepository.findOne({
          where: { id: agreement.lead.assignedToId },
        });
        if (accountManager) recipients = [accountManager];
      }
    }

    const actionMessages = {
      'Legal Review': 'review the agreement for legal compliance',
      'Delivery Review': 'review the delivery scope and timeline',
      'Procurement Review': 'review procurement requirements and dependencies',
      'Finance Review': 'review commercial terms and profitability',
      'Client Review': 'coordinate with client for their review and feedback',
      'CEO Approval': 'review and approve this agreement',
      'ULCCS Approval': 'provide ULCCS approval for this agreement',
    };

    for (const recipient of recipients) {
      await this.notificationsService.createNotification(
        recipient.id,
        config.type,
        `Agreement Review Required - ${newStage}`,
        `<p>Agreement for <strong>${agreement.title}</strong> is now in <strong>${newStage}</strong> stage.</p>
         <p>Please ${actionMessages[newStage] || 'take appropriate action'}.</p>
         <p><strong>Contract Value:</strong> ₹${agreement.contractValue?.toLocaleString('en-IN') || 'N/A'}</p>
         <p><a href="${process.env.FRONTEND_URL}/app/agreements/${agreementId}">Review Agreement</a></p>`,
        'Agreement',
        agreementId,
      );
    }
  }

  /**
   * Stage completion notifications
   */
  async notifyStageCompleted(agreementId: string, completedStage: string, completedBy: string, nextStage: string, accountManagerId: string): Promise<void> {
    const stageTypeMap = {
      'Legal Review': NotificationType.LEGAL_REVIEW_COMPLETED,
      'Delivery Review': NotificationType.DELIVERY_REVIEW_COMPLETED,
      'Procurement Review': NotificationType.PROCUREMENT_REVIEW_COMPLETED,
      'Finance Review': NotificationType.FINANCE_REVIEW_COMPLETED,
      'CEO Approval': NotificationType.CEO_APPROVAL_COMPLETED,
      'ULCCS Approval': NotificationType.ULCCS_APPROVAL_COMPLETED,
    };

    const notificationType = stageTypeMap[completedStage] || NotificationType.AGREEMENT_STAGE_CHANGE;

    await this.notificationsService.createNotification(
      accountManagerId,
      notificationType,
      `${completedStage} Completed`,
      `<p>${completedStage} for your agreement has been completed.</p>
       <p><strong>Next Stage:</strong> ${nextStage}</p>
       <p><a href="${process.env.FRONTEND_URL}/app/agreements/${agreementId}">View Agreement</a></p>`,
      'Agreement',
      agreementId,
    );
  }

  /**
   * Stage 9: CEO & ULCCS Approvals
   */
  async notifyCEOApprovalRequired(agreementId: string, agreementTitle: string, contractValue: number): Promise<void> {
    const ceos = await this.usersRepository.find({
      where: { role: UserRole.CEO },
    });

    for (const ceo of ceos) {
      await this.notificationsService.createNotification(
        ceo.id,
        NotificationType.CEO_APPROVAL_PENDING,
        'CEO Approval Required - High Value Agreement',
        `<p>Agreement <strong>${agreementTitle}</strong> requires your approval.</p>
         <p><strong>Contract Value:</strong> ₹${contractValue?.toLocaleString('en-IN')}</p>
         <p>Please review strategic importance, risk exposure, and commercial value.</p>
         <p><a href="${process.env.FRONTEND_URL}/app/agreements/${agreementId}">Review & Approve</a></p>`,
        'Agreement',
        agreementId,
      );
    }
  }

  async notifyULCCSApprovalRequired(agreementId: string, agreementTitle: string): Promise<void> {
    const ulccsApprovers = await this.usersRepository.find({
      where: { role: UserRole.ULCCS_APPROVER },
    });

    for (const approver of ulccsApprovers) {
      await this.notificationsService.createNotification(
        approver.id,
        NotificationType.ULCCS_APPROVAL_PENDING,
        'ULCCS Approval Required',
        `<p>ULCCS-related agreement <strong>${agreementTitle}</strong> requires your approval.</p>
         <p>Please review and provide approval.</p>
         <p><a href="${process.env.FRONTEND_URL}/app/agreements/${agreementId}">Review & Approve</a></p>`,
        'Agreement',
        agreementId,
      );
    }
  }

  /**
   * Stage 10: Agreement Signing
   */
  async notifyAgreementReadyForSigning(agreementId: string, agreementTitle: string, accountManagerId: string): Promise<void> {
    await this.notificationsService.createNotification(
      accountManagerId,
      NotificationType.AGREEMENT_READY_FOR_SIGNING,
      'Agreement Ready for Signing',
      `<p>Agreement <strong>${agreementTitle}</strong> has received all approvals.</p>
       <p>You can now proceed with signing and coordinate with the client for their signature.</p>
       <p><a href="${process.env.FRONTEND_URL}/app/agreements/${agreementId}">View Agreement</a></p>`,
      'Agreement',
      agreementId,
    );
  }

  async notifyCompanySigned(agreementId: string, agreementTitle: string, accountManagerId: string): Promise<void> {
    await this.notificationsService.createNotification(
      accountManagerId,
      NotificationType.COMPANY_SIGNED,
      'Company Signature Completed',
      `<p>Company has signed the agreement <strong>${agreementTitle}</strong>.</p>
       <p>Please coordinate with client for their signature to complete the agreement.</p>
       <p><a href="${process.env.FRONTEND_URL}/app/agreements/${agreementId}">View Agreement</a></p>`,
      'Agreement',
      agreementId,
    );
  }

  async notifyAgreementFullyExecuted(agreementId: string, agreementTitle: string, stakeholders: string[]): Promise<void> {
    for (const userId of stakeholders) {
      await this.notificationsService.createNotification(
        userId,
        NotificationType.AGREEMENT_FULLY_EXECUTED,
        '✅ Agreement Fully Executed',
        `<p><strong>Success!</strong> Agreement <strong>${agreementTitle}</strong> has been fully executed.</p>
         <p>Both company and client signatures are complete.</p>
         <p>You can now proceed with project kickoff.</p>
         <p><a href="${process.env.FRONTEND_URL}/app/agreements/${agreementId}">View Agreement</a></p>`,
        'Agreement',
        agreementId,
      );
    }
  }

  /**
   * Activity Notifications
   */
  async notifyActivityAdded(entityType: string, entityId: string, activityType: string, addedBy: string, stakeholders: string[]): Promise<void> {
    const activityUser = await this.usersRepository.findOne({ where: { id: addedBy } });
    
    for (const userId of stakeholders.filter(id => id !== addedBy)) {
      await this.notificationsService.createNotification(
        userId,
        NotificationType.ACTIVITY_ADDED,
        `New ${activityType} Activity`,
        `<p>${activityUser?.name || 'Someone'} added a new ${activityType} activity.</p>
         <p><a href="${process.env.FRONTEND_URL}/app/${entityType.toLowerCase()}s/${entityId}">View Details</a></p>`,
        entityType,
        entityId,
      );
    }
  }

  async notifyDocumentUploaded(entityType: string, entityId: string, documentName: string, uploadedBy: string, stakeholders: string[]): Promise<void> {
    const uploader = await this.usersRepository.findOne({ where: { id: uploadedBy } });
    
    for (const userId of stakeholders.filter(id => id !== uploadedBy)) {
      await this.notificationsService.createNotification(
        userId,
        NotificationType.DOCUMENT_UPLOADED,
        'New Document Uploaded',
        `<p>${uploader?.name || 'Someone'} uploaded a document: <strong>${documentName}</strong></p>
         <p><a href="${process.env.FRONTEND_URL}/app/${entityType.toLowerCase()}s/${entityId}">View Details</a></p>`,
        entityType,
        entityId,
      );
    }
  }

  /**
   * Get all stakeholders for an entity
   */
  private async getEntityStakeholders(entityType: string, entityId: string): Promise<string[]> {
    const stakeholders: string[] = [];

    if (entityType === 'Lead') {
      const lead = await this.leadsRepository.findOne({
        where: { id: entityId },
      });
      if (lead) {
        if (lead.createdById) stakeholders.push(lead.createdById);
        if (lead.assignedToId) stakeholders.push(lead.assignedToId);
      }
    } else if (entityType === 'Agreement') {
      const agreement = await this.agreementsRepository.findOne({
        where: { id: entityId },
        relations: ['lead'],
      });
      if (agreement?.lead) {
        if (agreement.lead.createdById) stakeholders.push(agreement.lead.createdById);
        if (agreement.lead.assignedToId) stakeholders.push(agreement.lead.assignedToId);
      }
    }

    return [...new Set(stakeholders)];
  }
}
