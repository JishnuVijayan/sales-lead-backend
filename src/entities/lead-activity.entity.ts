import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Lead } from './lead.entity';
import { User } from './user.entity';

export enum ActivityType {
  CALL = 'Call',
  EMAIL = 'Email',
  MEETING = 'Meeting',
  SITE_VISIT = 'Site Visit',
  DEMO = 'Demo',
  FOLLOW_UP = 'Follow Up',
  NOTE = 'Note',
  STATUS_CHANGE = 'Status Change',
  OTHER = 'Other',
}

@Entity('lead_activities')
export class LeadActivity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Lead, (lead) => lead.activities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @Column({ name: 'lead_id' })
  leadId: string;

  @Column({
    type: 'enum',
    enum: ActivityType,
    default: ActivityType.NOTE,
  })
  type: ActivityType;

  @Column()
  title: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({ type: 'timestamp', nullable: true })
  scheduledDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedDate: Date;

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_by', nullable: true })
  createdById: string;

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'assigned_to' })
  assignedTo: User;

  @Column({ name: 'assigned_to', nullable: true })
  assignedToId: string;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @Column({ default: false })
  isCompleted: boolean;
}
