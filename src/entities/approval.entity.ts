import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Lead } from './lead.entity';

export enum ApprovalStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  SKIPPED = 'Skipped',
}

export enum ApprovalStage {
  ACCOUNT_MANAGER = 'Account Manager',
  SALES_MANAGER = 'Sales Manager',
  FINANCE = 'Finance',
  PROCUREMENT = 'Procurement',
  DELIVERY_MANAGER = 'Delivery Manager',
  CEO = 'CEO',
  ULCCS = 'ULCCS',
}

export enum ApprovalContext {
  PROPOSAL = 'Proposal',
  AGREEMENT = 'Agreement',
  NEGOTIATION_REVISION = 'Negotiation Revision',
}

@Entity('approvals')
export class Approval {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ApprovalContext,
  })
  context: ApprovalContext;

  @Column({ name: 'entity_id' })
  entityId: string; // proposal_id or agreement_id

  @ManyToOne(() => Lead, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @Column({ name: 'lead_id', nullable: true })
  leadId: string;

  @Column({
    type: 'enum',
    enum: ApprovalStage,
  })
  stage: ApprovalStage;

  @Column({
    type: 'enum',
    enum: ApprovalStatus,
    default: ApprovalStatus.PENDING,
  })
  status: ApprovalStatus;

  @Column({ name: 'approver_role' })
  approverRole: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approver_id' })
  approver: User;

  @Column({ name: 'approver_id', nullable: true })
  approverId: string;

  @Column('text', { nullable: true })
  comments: string;

  @Column({ name: 'requested_date', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  requestedDate: Date;

  @Column({ name: 'responded_date', type: 'timestamp', nullable: true })
  respondedDate: Date;

  @Column({ name: 'is_mandatory', default: true })
  isMandatory: boolean;

  @Column({ name: 'sequence_order' })
  sequenceOrder: number;

  @Column({ type: 'boolean', default: false })
  isCustomFlow: boolean;

  @Column({ name: 'department_id', nullable: true })
  departmentId: string;

  @Column({ name: 'custom_approver_name', nullable: true })
  customApproverName: string;

  @Column({ name: 'created_by_user_id', nullable: true })
  createdByUserId: string;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'updated_date' })
  updatedDate: Date;
}
