import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Proposal } from './proposal.entity';
import { Document } from './document.entity';
import { User } from './user.entity';

export enum UploadReason {
  INITIAL = 'Initial',
  CLIENT_REVISION = 'Client Revision',
  INTERNAL_REVISION = 'Internal Revision',
  FINAL = 'Final',
  OTHER = 'Other',
}

@Entity('proposal_documents')
export class ProposalDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Proposal, (proposal) => proposal.proposalDocuments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'proposal_id' })
  proposal: Proposal;

  @Column({ name: 'proposal_id' })
  proposalId: string;

  @ManyToOne(() => Document, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: Document;

  @Column({ name: 'document_id' })
  documentId: string;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'boolean', default: true })
  isCurrentVersion: boolean;

  @Column({ type: 'boolean', default: false })
  isFinalVersion: boolean;

  @Column({
    type: 'enum',
    enum: UploadReason,
    default: UploadReason.INITIAL,
  })
  uploadReason: UploadReason;

  @Column('text', { nullable: true })
  revisionNotes: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'uploaded_by_id' })
  uploadedBy: User;

  @Column({ name: 'uploaded_by_id' })
  uploadedById: string;

  @CreateDateColumn({ name: 'uploaded_date' })
  uploadedDate: Date;
}
