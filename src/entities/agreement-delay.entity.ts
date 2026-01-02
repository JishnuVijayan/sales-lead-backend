import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Agreement, AgreementStage } from './agreement.entity';
import { User } from './user.entity';

export enum DelayReason {
  APPROVAL_PENDING = 'approval_pending',
  REVIEW_PENDING = 'review_pending',
  DOCUMENTATION_MISSING = 'documentation_missing',
  OWNER_UNAVAILABLE = 'owner_unavailable',
  OTHER = 'other',
}

@Entity('agreement_delays')
export class AgreementDelay {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Agreement, (agreement) => agreement.delays, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'agreement_id' })
  agreement: Agreement;

  @Column({ name: 'agreement_id' })
  agreementId: string;

  @Column({ type: 'varchar' })
  stage: string;

  @Column({
    type: 'enum',
    enum: DelayReason,
  })
  delayReason: DelayReason;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'responsible_owner_id' })
  responsibleOwner: User;

  @Column({ name: 'responsible_owner_id', nullable: true })
  responsibleOwnerId: string;

  @Column({ name: 'start_date', type: 'timestamp' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamp', nullable: true })
  endDate: Date;

  @Column('text', { nullable: true })
  description: string;

  @Column({ name: 'delay_duration_days', type: 'int', nullable: true })
  delayDurationDays: number;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'updated_date' })
  updatedDate: Date;
}
