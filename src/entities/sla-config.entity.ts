import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum SLAStageType {
  LEAD_NEW = 'Lead - New',
  LEAD_QUALIFIED = 'Lead - Qualified',
  LEAD_PROPOSAL = 'Lead - Proposal',
  LEAD_NEGOTIATION = 'Lead - Negotiation',
  AGREEMENT_DRAFT = 'Agreement - Draft',
  AGREEMENT_LEGAL_REVIEW = 'Agreement - Legal Review',
  AGREEMENT_DELIVERY_REVIEW = 'Agreement - Delivery Review',
  AGREEMENT_PROCUREMENT_REVIEW = 'Agreement - Procurement Review',
  AGREEMENT_FINANCE_REVIEW = 'Agreement - Finance Review',
  AGREEMENT_CLIENT_REVIEW = 'Agreement - Client Review',
  AGREEMENT_CEO_APPROVAL = 'Agreement - CEO Approval',
  AGREEMENT_ULCCS_APPROVAL = 'Agreement - ULCCS Approval',
}

@Entity('sla_configs')
export class SLAConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: SLAStageType,
    unique: true,
  })
  stage: SLAStageType;

  @Column({ type: 'int' })
  warningThresholdDays: number; // Days before warning notification

  @Column({ type: 'int' })
  criticalThresholdDays: number; // Days before critical alert

  @Column({ type: 'int' })
  escalationThresholdDays: number; // Days before escalation to manager

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdDate: Date;

  @UpdateDateColumn()
  updatedDate: Date;
}
