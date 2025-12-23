import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

export enum NotificationType {
  LEAD_IDLE = 'Lead Idle',
  LEAD_ESCALATION = 'Lead Escalation',
  AGREEMENT_STAGE_DELAY = 'Agreement Stage Delay',
  CEO_APPROVAL_PENDING = 'CEO Approval Pending',
  CLIENT_REVIEW_REMINDER = 'Client Review Reminder',
  SLA_WARNING = 'SLA Warning',
  SLA_CRITICAL = 'SLA Critical',
}

export enum NotificationStatus {
  PENDING = 'Pending',
  SENT = 'Sent',
  FAILED = 'Failed',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column({ name: 'recipient_id' })
  recipientId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'recipient_id' })
  recipient: User;

  @Column()
  subject: string;

  @Column('text')
  message: string;

  @Column({ nullable: true })
  entityType: string; // 'Lead', 'Agreement', etc.

  @Column({ nullable: true })
  entityId: string;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
  })
  status: NotificationStatus;

  @Column({ type: 'timestamp', nullable: true })
  sentDate: Date;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @CreateDateColumn()
  createdDate: Date;
}
