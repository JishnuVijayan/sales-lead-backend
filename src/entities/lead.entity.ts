import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { LeadActivity } from './lead-activity.entity';
import { Proposal } from './proposal.entity';
import { WorkOrder } from './work-order.entity';
import { Document } from './document.entity';
import { User } from './user.entity';
import { Negotiation } from './negotiation.entity';

export enum LeadStatus {
  NEW = 'New',
  QUALIFIED = 'Qualified',
  PROPOSAL = 'Proposal',
  NEGOTIATION = 'Negotiation',
  WON = 'Won',
  LOST = 'Lost',
  DORMANT = 'Dormant',
}

export enum LeadSource {
  WEBSITE = 'Website',
  CALL_CENTER = 'Call Center',
  EMAIL = 'Email',
  TRADE_FAIR = 'Trade Fair',
  REFERRAL = 'Referral',
  GOVERNMENT_TENDER = 'Government Tender',
  EXTERNAL_IMPORT = 'External Import',
  OTHER = 'Other',
}

export enum LeadAgingStatus {
  ACTIVE = 'Active',
  NEEDS_ATTENTION = 'Needs Attention',
  OVERDUE = 'Overdue',
}

@Entity('leads')
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  organization: string;

  @Column()
  email: string;

  @Column()
  phone: string;

  @Column({ nullable: true })
  alternatePhone: string;

  @Column({
    type: 'enum',
    enum: LeadSource,
    default: LeadSource.WEBSITE,
  })
  source: LeadSource;

  @Column({
    type: 'enum',
    enum: LeadStatus,
    default: LeadStatus.NEW,
  })
  status: LeadStatus;

  @Column({ nullable: true })
  industry: string;

  @Column({ nullable: true })
  segment: string;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  estimatedBudget: number;

  @Column({ nullable: true })
  timeline: string;

  @Column('text', { nullable: true })
  productInterest: string;

  @Column('text', { nullable: true })
  requirementSummary: string;

  @Column('text', { nullable: true })
  qualificationNotes: string;

  @Column({ type: 'int', nullable: true })
  leadScore: number;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  country: string;

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'assigned_to' })
  assignedTo: User;

  @Column({ name: 'assigned_to', nullable: true })
  assignedToId: string;

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_by', nullable: true })
  createdById: string;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @Column({ name: 'last_action_date', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastActionDate: Date;

  @UpdateDateColumn({ name: 'updated_date' })
  updatedDate: Date;

  @Column({ name: 'converted_date', type: 'timestamp', nullable: true })
  convertedDate: Date;

  @Column({ name: 'closed_date', type: 'timestamp', nullable: true })
  closedDate: Date;

  @Column('text', { nullable: true })
  internalNotes: string;

  @Column({ default: false })
  isConverted: boolean;

  @Column({ default: false })
  isActive: boolean;

  // Stage transition timestamps for aging calculations
  @Column({ name: 'qualified_date', type: 'timestamp', nullable: true })
  qualifiedDate: Date;

  @Column({ name: 'proposal_date', type: 'timestamp', nullable: true })
  proposalDate: Date;

  @Column({ name: 'negotiation_date', type: 'timestamp', nullable: true })
  negotiationDate: Date;

  @Column({ name: 'won_date', type: 'timestamp', nullable: true })
  wonDate: Date;

  @Column({ name: 'lost_date', type: 'timestamp', nullable: true })
  lostDate: Date;

  @Column({ name: 'dormant_date', type: 'timestamp', nullable: true })
  dormantDate: Date;

  @OneToMany(() => LeadActivity, activity => activity.lead)
  activities: LeadActivity[];

  @OneToMany(() => Proposal, proposal => proposal.lead)
  proposals: Proposal[];

  @OneToMany(() => Document, document => document.lead)
  documents: Document[];

  @OneToMany(() => WorkOrder, workOrder => workOrder.lead)
  workOrders: WorkOrder[];

  @OneToMany(() => Negotiation, negotiation => negotiation.lead)
  negotiations: Negotiation[];

  // Virtual fields for aging calculation
  leadAge?: number;
  agingStatus?: LeadAgingStatus;
  daysSinceLastAction?: number;
  stageAging?: {
    new: number;
    qualified: number;
    proposal: number;
    negotiation: number;
    won: number;
    lost: number;
    dormant: number;
  };
}
