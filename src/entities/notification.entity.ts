import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

export enum NotificationType {
  // Lead Lifecycle Notifications
  LEAD_CREATED = 'Lead Created',
  LEAD_ASSIGNED = 'Lead Assigned',
  LEAD_IDLE = 'Lead Idle',
  LEAD_ESCALATION = 'Lead Escalation',
  LEAD_QUALIFIED = 'Lead Qualified',
  LEAD_QUALIFICATION_REJECTED = 'Lead Qualification Rejected',
  
  // Proposal & Negotiation Notifications
  PROPOSAL_CREATED = 'Proposal Created',
  PROPOSAL_APPROVAL_REQUIRED = 'Proposal Approval Required',
  PROPOSAL_APPROVED = 'Proposal Approved',
  PROPOSAL_REJECTED = 'Proposal Rejected',
  PROPOSAL_SENT_TO_CLIENT = 'Proposal Sent to Client',
  NEGOTIATION_STARTED = 'Negotiation Started',
  NEGOTIATION_UPDATED = 'Negotiation Updated',
  
  // Work Order Notifications
  WORK_ORDER_CREATED = 'Work Order Created',
  WORK_ORDER_ASSIGNED = 'Work Order Assigned',
  LEAD_WON = 'Lead Won',
  LEAD_LOST = 'Lead Lost',
  
  // Agreement Lifecycle Notifications
  AGREEMENT_CREATED = 'Agreement Created',
  AGREEMENT_STAGE_CHANGE = 'Agreement Stage Changed',
  AGREEMENT_STAGE_DELAY = 'Agreement Stage Delay',
  
  // Agreement Approval Notifications
  LEGAL_REVIEW_REQUIRED = 'Legal Review Required',
  LEGAL_REVIEW_COMPLETED = 'Legal Review Completed',
  DELIVERY_REVIEW_REQUIRED = 'Delivery Review Required',
  DELIVERY_REVIEW_COMPLETED = 'Delivery Review Completed',
  PROCUREMENT_REVIEW_REQUIRED = 'Procurement Review Required',
  PROCUREMENT_REVIEW_COMPLETED = 'Procurement Review Completed',
  FINANCE_REVIEW_REQUIRED = 'Finance Review Required',
  FINANCE_REVIEW_COMPLETED = 'Finance Review Completed',
  CLIENT_REVIEW_REQUIRED = 'Client Review Required',
  CLIENT_REVIEW_REMINDER = 'Client Review Reminder',
  CEO_APPROVAL_PENDING = 'CEO Approval Pending',
  CEO_APPROVAL_COMPLETED = 'CEO Approval Completed',
  ULCCS_APPROVAL_PENDING = 'ULCCS Approval Pending',
  ULCCS_APPROVAL_COMPLETED = 'ULCCS Approval Completed',
  
  // Signing Notifications
  AGREEMENT_READY_FOR_SIGNING = 'Agreement Ready for Signing',
  COMPANY_SIGNED = 'Company Signed',
  CLIENT_SIGNED = 'Client Signed',
  AGREEMENT_FULLY_EXECUTED = 'Agreement Fully Executed',
  
  // SLA & Escalation Notifications
  SLA_WARNING = 'SLA Warning',
  SLA_CRITICAL = 'SLA Critical',
  SLA_BREACHED = 'SLA Breached',
  
  // Activity Notifications
  ACTIVITY_ADDED = 'Activity Added',
  COMMENT_ADDED = 'Comment Added',
  DOCUMENT_UPLOADED = 'Document Uploaded',
}

export enum NotificationStatus {
  PENDING = 'Pending',
  SENT = 'Sent',
  FAILED = 'Failed',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column({ name: 'recipient_id' })
  recipientId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'recipient_id' })
  recipient: User;

  @Column()
  subject: string;

  @Column('text')
  message: string;

  @Column({ nullable: true })
  entityType: string; // 'Lead', 'Agreement', etc.

  @Column({ nullable: true })
  entityId: string;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
  })
  status: NotificationStatus;

  @Column({ type: 'timestamp', nullable: true })
  sentDate: Date;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @CreateDateColumn()
  createdDate: Date;
}
