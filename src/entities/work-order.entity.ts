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
import { Negotiation } from './negotiation.entity';

export enum WorkOrderStatus {
  PENDING = 'Pending',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled',
}

@Entity('work_orders')
export class WorkOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  workOrderNumber: string;

  @ManyToOne(() => Lead, (lead) => lead.workOrders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @Column({ name: 'lead_id' })
  leadId: string;

  @ManyToOne(() => Negotiation, { nullable: true, eager: true })
  @JoinColumn({ name: 'negotiation_id' })
  negotiation: Negotiation;

  @Column({ name: 'negotiation_id', nullable: true })
  negotiationId: string;

  @Column()
  title: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: WorkOrderStatus,
    default: WorkOrderStatus.PENDING,
  })
  status: WorkOrderStatus;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  orderValue: number;

  @Column({ type: 'date', nullable: true })
  expectedDeliveryDate: Date;

  @Column({ type: 'date', nullable: true })
  actualDeliveryDate: Date;

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'assigned_to_operations' })
  assignedToOperations: User;

  @Column({ name: 'assigned_to_operations', nullable: true })
  assignedToOperationsId: string;

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'assigned_to_accounts' })
  assignedToAccounts: User;

  @Column({ name: 'assigned_to_accounts', nullable: true })
  assignedToAccountsId: string;

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_by', nullable: true })
  createdById: string;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @Column('text', { nullable: true })
  notes: string;
}
