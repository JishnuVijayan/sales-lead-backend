import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Lead } from './lead.entity';
import { User } from './user.entity';
import { ProposalItem } from './proposal-item.entity';

export enum ProposalStatus {
  DRAFT = 'Draft',
  SENT = 'Sent',
  VIEWED = 'Viewed',
  ACCEPTED = 'Accepted',
  REJECTED = 'Rejected',
  REVISED = 'Revised',
}

@Entity('proposals')
export class Proposal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  proposalNumber: string;

  @ManyToOne(() => Lead, lead => lead.proposals, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @Column({ name: 'lead_id' })
  leadId: string;

  @Column()
  title: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ProposalStatus,
    default: ProposalStatus.DRAFT,
  })
  status: ProposalStatus;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  subtotal: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  taxPercent: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  taxAmount: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  discountPercent: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  discountAmount: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ type: 'date', nullable: true })
  validUntil: Date;

  @Column({ nullable: true })
  termsAndConditions: string;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'timestamp', nullable: true })
  sentDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  viewedDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  respondedDate: Date;

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_by', nullable: true })
  createdById: string;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @OneToMany(() => ProposalItem, item => item.proposal, { cascade: true })
  items: ProposalItem[];
}
