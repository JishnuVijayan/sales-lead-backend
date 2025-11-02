import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Lead } from './lead.entity';
import { User } from './user.entity';

export enum DocumentType {
  RFP = 'RFP',
  QUOTATION = 'Quotation',
  PROPOSAL = 'Proposal',
  CONTRACT = 'Contract',
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

  @ManyToOne(() => Lead, lead => lead.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @Column({ name: 'lead_id' })
  leadId: string;

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
