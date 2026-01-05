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
import { WorkOrder } from './work-order.entity';
import { Agreement } from './agreement.entity';

export enum DocumentType {
  RFP = 'RFP',
  QUOTATION = 'Quotation',
  PROPOSAL = 'Proposal',
  CONTRACT = 'Contract',
  AGREEMENT = 'Agreement',
  WORK_ORDER = 'Work Order',
  EMAIL_ATTACHMENT = 'Email Attachment',
  REQUIREMENT_DOC = 'Requirement Document',
  PRESENTATION = 'Presentation',
  IMAGE = 'Image',
  OTHER = 'Other',
}

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Lead, (lead) => lead.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @Column({ name: 'lead_id' })
  leadId: string;

  @ManyToOne(() => WorkOrder, { nullable: true })
  @JoinColumn({ name: 'work_order_id' })
  workOrder: WorkOrder;

  @Column({ name: 'work_order_id', nullable: true })
  workOrderId: string;

  @ManyToOne(() => Agreement, { nullable: true })
  @JoinColumn({ name: 'agreement_id' })
  agreement: Agreement;

  @Column({ name: 'agreement_id', nullable: true })
  agreementId: string;

  @Column()
  fileName: string;

  @Column()
  filePath: string;

  @Column()
  fileSize: number;

  @Column()
  mimeType: string;

  @Column({
    type: 'enum',
    enum: DocumentType,
    default: DocumentType.OTHER,
  })
  documentType: DocumentType;

  @Column('text', { nullable: true })
  description: string;

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'uploaded_by' })
  uploadedBy: User;

  @Column({ name: 'uploaded_by', nullable: true })
  uploadedById: string;

  @CreateDateColumn({ name: 'uploaded_date' })
  uploadedDate: Date;
}
