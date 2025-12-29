import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Agreement } from './agreement.entity';
import { Lead } from './lead.entity';
import { User } from './user.entity';

export enum AgreementActivityType {
  COMMENT = 'Comment',
  MANUAL_NOTE = 'Manual Note',
  STAGE_CHANGED = 'Stage Changed',
  SENT_FOR_REVIEW = 'Sent For Review',
  REVIEW_COMPLETED = 'Review Completed',
  REVIEW_REJECTED = 'Review Rejected',
  SENT_FOR_APPROVAL = 'Sent For Approval',
  APPROVAL_RECEIVED = 'Approval Received',
  APPROVAL_REJECTED = 'Approval Rejected',
  SENT_FOR_SIGNATURE = 'Sent For Signature',
  SIGNED_BY_CLIENT = 'Signed By Client',
  SIGNED_BY_COMPANY = 'Signed By Company',
  DOCUMENT_UPLOADED = 'Document Uploaded',
  DOCUMENT_UPDATED = 'Document Updated',
  PM_ALLOCATED = 'PM Allocated',
  ACTIVATED = 'Activated',
  EXPIRED = 'Expired',
  TERMINATED = 'Terminated',
  RENEWAL_REMINDER = 'Renewal Reminder',
}

@Entity('agreement_activities')
export class AgreementActivity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Agreement, agreement => agreement.activities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agreement_id' })
  agreement: Agreement;

  @Column({ name: 'agreement_id' })
  agreementId: string;

  @ManyToOne(() => Lead, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @Column({ name: 'lead_id' })
  leadId: string;

  @Column({
    type: 'enum',
    enum: AgreementActivityType,
  })
  activityType: AgreementActivityType;

  @Column()
  subject: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @Column({ name: 'created_by_id' })
  createdById: string;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @Column({ name: 'is_completed', default: false })
  isCompleted: boolean;

  @Column({ name: 'completed_date', type: 'timestamp', nullable: true })
  completedDate: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'completed_by_id' })
  completedBy: User;

  @Column({ name: 'completed_by_id', nullable: true })
  completedById: string;
}
