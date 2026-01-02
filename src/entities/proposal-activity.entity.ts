import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Proposal } from './proposal.entity';
import { Lead } from './lead.entity';
import { User } from './user.entity';

export enum ProposalActivityType {
  COMMENT = 'Comment',
  MANUAL_NOTE = 'Manual Note',
  DOCUMENT_UPLOADED = 'Document Uploaded',
  REVISION_REQUESTED = 'Revision Requested',
  STATUS_CHANGED = 'Status Changed',
  SENT_FOR_APPROVAL = 'Sent For Approval',
  APPROVAL_RECEIVED = 'Approval Received',
  APPROVAL_REJECTED = 'Approval Rejected',
  APPROVAL_RETURNED = 'Approval Returned',
  APPROVAL_SKIPPED = 'Approval Skipped',
  SENT_TO_CLIENT = 'Sent To Client',
  CLIENT_VIEWED = 'Client Viewed',
  VERSION_CREATED = 'Version Created',
  MARKED_AS_FINAL = 'Marked As Final',
}

@Entity('proposal_activities')
export class ProposalActivity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Proposal, (proposal) => proposal.activities, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'proposal_id' })
  proposal: Proposal;

  @Column({ name: 'proposal_id' })
  proposalId: string;

  @ManyToOne(() => Lead, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @Column({ name: 'lead_id' })
  leadId: string;

  @Column({
    type: 'enum',
    enum: ProposalActivityType,
  })
  activityType: ProposalActivityType;

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

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigned_to_id' })
  assignedTo: User;

  @Column({ name: 'assigned_to_id', nullable: true })
  assignedToId: string;

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
