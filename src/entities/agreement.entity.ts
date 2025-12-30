import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Lead } from './lead.entity';
import { User } from './user.entity';
import { AgreementStageHistory } from './agreement-stage-history.entity';
import { AgreementApprovalConfig } from './agreement-approval-config.entity';

export enum AgreementStage {
  DRAFT = 'Draft',
  LEGAL_REVIEW = 'Legal Review',
  DELIVERY_REVIEW = 'Delivery Review',
  PROCUREMENT_REVIEW = 'Procurement Review',
  FINANCE_REVIEW = 'Finance Review',
  CLIENT_REVIEW = 'Client Review',
  CEO_APPROVAL = 'CEO Approval',
  ULCCS_APPROVAL = 'ULCCS Approval',
  PENDING_SIGNATURE = 'Pending Signature',
  SIGNED = 'Signed',
  ACTIVE = 'Active',
  EXPIRED = 'Expired',
  TERMINATED = 'Terminated',
  CANCELLED = 'Cancelled',
}

export enum AgreementType {
  MASTER_SERVICE_AGREEMENT = 'Master Service Agreement',
  STATEMENT_OF_WORK = 'Statement of Work',
  PURCHASE_ORDER = 'Purchase Order',
  CONTRACT = 'Contract',
  NDA = 'Non-Disclosure Agreement',
  OTHER = 'Other',
}

export enum PaymentTerms {
  NET_15 = 'Net 15',
  NET_30 = 'Net 30',
  NET_45 = 'Net 45',
  NET_60 = 'Net 60',
  NET_90 = 'Net 90',
  DUE_ON_RECEIPT = 'Due on Receipt',
  ADVANCE_50_PERCENT = '50% Advance',
  MILESTONE_BASED = 'Milestone Based',
  CUSTOM = 'Custom',
}

@Entity('agreements')
export class Agreement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'agreement_number', unique: true })
  agreementNumber: string;

  @Column({ nullable: true })
  projectId: string;

  @Column({ name: 'pm_allocated_id', nullable: true })
  pmAllocatedId: string;

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'pm_allocated_id' })
  pmAllocated: User;

  @Column({ type: 'timestamp', nullable: true })
  pmAllocatedDate: Date;

  @Column({ name: 'lead_id' })
  leadId: string;

  @ManyToOne(() => Lead, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: AgreementType,
    default: AgreementType.CONTRACT,
  })
  agreementType: AgreementType;

  @Column({
    type: 'enum',
    enum: AgreementStage,
    default: AgreementStage.DRAFT,
  })
  stage: AgreementStage;

  @Column({ name: 'has_custom_approval_flow', default: false })
  hasCustomApprovalFlow: boolean;

  @Column({ name: 'approval_in_progress', default: false })
  approvalInProgress: boolean;

  @OneToMany(() => AgreementApprovalConfig, (config) => config.agreement)
  approvalConfigs: AgreementApprovalConfig[];

  @OneToMany('AgreementActivity', 'agreement')
  activities: any[];

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  contractValue: number;

  @Column({ type: 'date', nullable: true })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  @Column({
    type: 'enum',
    enum: PaymentTerms,
    default: PaymentTerms.NET_30,
  })
  paymentTerms: PaymentTerms;

  @Column({ type: 'text', nullable: true })
  customPaymentTerms: string;

  @Column({ type: 'text', nullable: true })
  termsAndConditions: string;

  @Column({ type: 'text', nullable: true })
  deliverables: string;

  @Column({ type: 'text', nullable: true })
  milestones: string;

  @Column({ type: 'text', nullable: true })
  scopeOfWork: string;

  @Column({ type: 'text', nullable: true })
  specialClauses: string;

  // Document attachments and versioning
  @Column({ nullable: true })
  documentPath: string;

  @Column({ nullable: true })
  signedDocumentPath: string;

  @Column({ type: 'int', default: 1 })
  documentVersion: number;

  @Column({ type: 'jsonb', nullable: true })
  documentVersionHistory: Array<{
    version: number;
    path: string;
    uploadedBy: string;
    uploadedAt: string;
    comments?: string;
  }>;

  // Legal drafting tracking
  @Column({ name: 'drafted_by', nullable: true })
  draftedById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'drafted_by' })
  draftedBy: User;

  @Column({ type: 'timestamp', nullable: true })
  draftedDate: Date;

  @Column({ type: 'text', nullable: true })
  legalNotes: string;

  // Module 11: Review tracking fields
  // Delivery Review
  @Column({ name: 'delivery_reviewed_by', nullable: true })
  deliveryReviewedById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'delivery_reviewed_by' })
  deliveryReviewedBy: User;

  @Column({ type: 'timestamp', nullable: true })
  deliveryReviewedDate: Date;

  @Column({ type: 'text', nullable: true })
  deliveryComments: string;

  @Column({ type: 'boolean', nullable: true })
  deliveryApproved: boolean;

  // Procurement Review
  @Column({ name: 'procurement_reviewed_by', nullable: true })
  procurementReviewedById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'procurement_reviewed_by' })
  procurementReviewedBy: User;

  @Column({ type: 'timestamp', nullable: true })
  procurementReviewedDate: Date;

  @Column({ type: 'text', nullable: true })
  procurementComments: string;

  @Column({ type: 'boolean', nullable: true })
  procurementApproved: boolean;

  // Finance Review
  @Column({ name: 'finance_reviewed_by', nullable: true })
  financeReviewedById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'finance_reviewed_by' })
  financeReviewedBy: User;

  @Column({ type: 'timestamp', nullable: true })
  financeReviewedDate: Date;

  @Column({ type: 'text', nullable: true })
  financeComments: string;

  @Column({ type: 'boolean', nullable: true })
  financeApproved: boolean;

  // Module 12: CEO Approval
  @Column({ name: 'ceo_approved_by', nullable: true })
  ceoApprovedById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'ceo_approved_by' })
  ceoApprovedBy: User;

  @Column({ type: 'timestamp', nullable: true })
  ceoApprovedDate: Date;

  @Column({ type: 'text', nullable: true })
  ceoComments: string;

  @Column({ type: 'boolean', nullable: true })
  ceoApproved: boolean;

  // ULCCS Approval (conditional)
  @Column({ name: 'ulccs_approved_by', nullable: true })
  ulccsApprovedById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'ulccs_approved_by' })
  ulccsApprovedBy: User;

  @Column({ type: 'timestamp', nullable: true })
  ulccsApprovedDate: Date;

  @Column({ type: 'text', nullable: true })
  ulccsComments: string;

  @Column({ type: 'boolean', nullable: true })
  ulccsApproved: boolean;

  @Column({ default: false })
  requiresULCCSApproval: boolean;

  // Client Review
  @Column({ name: 'client_reviewed_by', nullable: true })
  clientReviewedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  clientReviewedDate: Date;

  @Column({ type: 'text', nullable: true })
  clientComments: string;

  @Column({ type: 'boolean', nullable: true })
  clientApproved: boolean;

  // Signature tracking
  @Column({ type: 'timestamp', nullable: true })
  clientSignedDate: Date;

  @Column({ nullable: true })
  clientSignedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  companySignedDate: Date;

  @Column({ name: 'company_signed_by', nullable: true })
  companySignedById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'company_signed_by' })
  companySignedBy: User;

  // Renewal tracking
  @Column({ default: false })
  isRenewable: boolean;

  @Column({ type: 'int', nullable: true })
  renewalNoticeDays: number;

  @Column({ type: 'date', nullable: true })
  renewalNoticeDate: Date;

  @Column({ default: false })
  autoRenew: boolean;

  // Termination tracking
  @Column({ type: 'date', nullable: true })
  terminationDate: Date;

  @Column({ type: 'text', nullable: true })
  terminationReason: string;

  @Column({ name: 'terminated_by', nullable: true })
  terminatedById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'terminated_by' })
  terminatedBy: User;

  // Ownership tracking
  @Column({ name: 'created_by', nullable: true })
  createdById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'assigned_to', nullable: true })
  assignedToId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigned_to' })
  assignedTo: User;

  // Internal notes
  @Column({ type: 'text', nullable: true })
  internalNotes: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'updated_date' })
  updatedDate: Date;

  @OneToMany(() => AgreementStageHistory, (history) => history.agreement)
  stageHistory: AgreementStageHistory[];
}
