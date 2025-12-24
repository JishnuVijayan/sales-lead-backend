import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Lead } from './lead.entity';
import { User } from './user.entity';

export enum NegotiationStatus {
  ACTIVE = 'Active',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled',
}

export enum NegotiationOutcome {
  ACCEPTED = 'Accepted',
  REJECTED = 'Rejected',
  COUNTER_OFFER = 'Counter Offer',
  PENDING = 'Pending',
}

@Entity('negotiations')
export class Negotiation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Lead, lead => lead.negotiations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @Column({ name: 'lead_id' })
  leadId: string;

  @Column('decimal', { precision: 15, scale: 2 })
  expectedAmount: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  finalAmount: number;

  @Column('text', { nullable: true })
  negotiationDetails: string;

  @Column('text', { nullable: true })
  negotiationApproach: string;

  @Column({ type: 'int', default: 0 })
  callCount: number;

  @Column({ type: 'int', default: 0 })
  meetingCount: number;

  @Column({ type: 'int', default: 0 })
  emailCount: number;

  @Column('text', { nullable: true })
  clientFeedback: string;

  @Column('text', { nullable: true })
  internalNotes: string;

  @Column({
    type: 'enum',
    enum: NegotiationStatus,
    default: NegotiationStatus.ACTIVE,
  })
  status: NegotiationStatus;

  @Column({
    type: 'enum',
    enum: NegotiationOutcome,
    nullable: true,
  })
  outcome: NegotiationOutcome;

  @Column({ type: 'date', nullable: true })
  expectedClosureDate: Date;

  @Column({ type: 'date', nullable: true })
  actualClosureDate: Date;

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'negotiator_id' })
  negotiator: User;

  @Column({ name: 'negotiator_id', nullable: true })
  negotiatorId: string;

  @CreateDateColumn()
  createdDate: Date;

  @UpdateDateColumn()
  updatedDate: Date;

  @Column('text', { nullable: true })
  specialTerms: string;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  discountOffered: number;

  @Column({ type: 'int', nullable: true })
  negotiationDuration: number; // in days

  // Phase 2 Module 2.5: Revision tracking
  @Column({ type: 'int', default: 1 })
  revisionNumber: number;

  @Column({ type: 'boolean', default: false })
  requiresApproval: boolean;

  @Column({
    type: 'enum',
    enum: ['Pending', 'Approved', 'Rejected'],
    nullable: true,
  })
  revisionStatus: string;

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'revision_requested_by_id' })
  revisionRequestedBy: User;

  @Column({ name: 'revision_requested_by_id', nullable: true })
  revisionRequestedById: string;

  @Column({ type: 'timestamp', nullable: true })
  revisionRequestedDate: Date;

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'revision_approved_by_id' })
  revisionApprovedBy: User;

  @Column({ name: 'revision_approved_by_id', nullable: true })
  revisionApprovedById: string;

  @Column({ type: 'timestamp', nullable: true })
  revisionApprovedDate: Date;

  @Column('text', { nullable: true })
  revisionReason: string;

  @Column('text', { nullable: true })
  revisionNotes: string;
}