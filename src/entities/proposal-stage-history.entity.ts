import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Proposal } from './proposal.entity';
import { User } from './user.entity';
import { ProposalStatus } from './proposal.entity';

@Entity('proposal_stage_history')
export class ProposalStageHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proposal_id' })
  proposalId: string;

  @ManyToOne(() => Proposal, (proposal) => proposal.stageHistory, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'proposal_id' })
  proposal: Proposal;

  @Column({
    type: 'enum',
    enum: ['Draft', 'Sent', 'Viewed', 'Accepted', 'Rejected', 'Revised'],
  })
  fromStatus: ProposalStatus;

  @Column({
    type: 'enum',
    enum: ['Draft', 'Sent', 'Viewed', 'Accepted', 'Rejected', 'Revised'],
  })
  toStatus: ProposalStatus;

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