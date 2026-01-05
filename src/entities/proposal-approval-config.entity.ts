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

export enum ApprovalType {
  SPECIFIC_USER = 'Specific User',
  ROLE = 'Role',
  DEPARTMENT = 'Department',
}

@Entity('proposal_approval_configs')
export class ProposalApprovalConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Proposal, (proposal) => proposal.approvalConfigs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'proposal_id' })
  proposal: Proposal;

  @Column({ name: 'proposal_id' })
  proposalId: string;

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'approver_id' })
  approver: User;

  @Column({ name: 'approver_id', nullable: true })
  approverId: string;

  @Column({ nullable: true })
  approverRole: string;

  @Column({ name: 'department_id', nullable: true })
  departmentId: string;

  @Column({ type: 'int' })
  sequenceOrder: number;

  @Column({ type: 'boolean', default: true })
  isMandatory: boolean;

  @Column({
    type: 'enum',
    enum: ApprovalType,
  })
  approvalType: ApprovalType;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @Column({ name: 'created_by_id' })
  createdById: string;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;
}
