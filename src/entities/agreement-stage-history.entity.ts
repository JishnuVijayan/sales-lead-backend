import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Agreement } from './agreement.entity';
import { User } from './user.entity';

// Local enum definition for TypeORM - must match AgreementStage enum
export enum AgreementStageEnum {
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

@Entity('agreement_stage_history')
export class AgreementStageHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'agreement_id' })
  agreementId: string;

  @ManyToOne(() => Agreement, (agreement) => agreement.stageHistory, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'agreement_id' })
  agreement: Agreement;

  @Column({
    type: 'enum',
    enum: AgreementStageEnum,
  })
  fromStage: string;

  @Column({
    type: 'enum',
    enum: AgreementStageEnum,
  })
  toStage: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'changed_by', nullable: true })
  changedById?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'changed_by' })
  changedBy: User;

  @CreateDateColumn({ name: 'changed_date' })
  changedDate: Date;
}
