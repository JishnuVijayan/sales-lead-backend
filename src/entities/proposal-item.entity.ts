import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Proposal } from './proposal.entity';

@Entity('proposal_items')
export class ProposalItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Proposal, (proposal) => proposal.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'proposal_id' })
  proposal: Proposal;

  @Column({ name: 'proposal_id' })
  proposalId: string;

  @Column()
  itemName: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('decimal', { precision: 10, scale: 2, default: 1 })
  quantity: number;

  @Column({ nullable: true })
  unit: string;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  unitPrice: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  totalPrice: number;

  @Column({ type: 'int', default: 1 })
  sortOrder: number;
}
