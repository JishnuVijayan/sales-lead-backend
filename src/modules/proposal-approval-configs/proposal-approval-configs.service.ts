import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProposalApprovalConfig } from '../../entities/proposal-approval-config.entity';
import { Proposal } from '../../entities/proposal.entity';
import { User } from '../../entities/user.entity';
import { CreateProposalApprovalConfigDto, DefineProposalApprovalFlowDto } from './dto/proposal-approval-config.dto';

@Injectable()
export class ProposalApprovalConfigsService {
  constructor(
    @InjectRepository(ProposalApprovalConfig)
    private configsRepository: Repository<ProposalApprovalConfig>,
    @InjectRepository(Proposal)
    private proposalsRepository: Repository<Proposal>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createDto: CreateProposalApprovalConfigDto, userId: string): Promise<ProposalApprovalConfig> {
    const proposal = await this.proposalsRepository.findOne({
      where: { id: createDto.proposalId },
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    const config = this.configsRepository.create({
      ...createDto,
      createdById: userId,
    });

    return await this.configsRepository.save(config);
  }

  async defineApprovalFlow(dto: DefineProposalApprovalFlowDto, userId: string): Promise<ProposalApprovalConfig[]> {
    const proposal = await this.proposalsRepository.findOne({
      where: { id: dto.proposalId },
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    // Delete existing approval configs for this proposal
    await this.configsRepository.delete({ proposalId: dto.proposalId });

    // Create new approval configs
    const configs: ProposalApprovalConfig[] = [];
    
    for (const approverConfig of dto.approvers) {
      const config = this.configsRepository.create({
        proposalId: dto.proposalId,
        approverId: approverConfig.approverId,
        approverRole: approverConfig.approverRole,
        departmentId: approverConfig.departmentId,
        sequenceOrder: approverConfig.sequenceOrder,
        isMandatory: approverConfig.isMandatory !== undefined ? approverConfig.isMandatory : true,
        approvalType: approverConfig.approvalType,
        createdById: userId,
      });
      
      configs.push(config);
    }

    const savedConfigs = await this.configsRepository.save(configs);

    // Mark proposal as having custom approval flow
    await this.proposalsRepository.update(dto.proposalId, { hasCustomApprovalFlow: true });

    return savedConfigs;
  }

  async findAll(proposalId?: string): Promise<ProposalApprovalConfig[]> {
    const where = proposalId ? { proposalId } : {};
    return await this.configsRepository.find({
      where,
      relations: ['proposal', 'approver', 'createdBy'],
      order: { sequenceOrder: 'ASC' },
    });
  }

  async findByProposal(proposalId: string): Promise<ProposalApprovalConfig[]> {
    return this.findAll(proposalId);
  }

  async findOne(id: string): Promise<ProposalApprovalConfig> {
    const config = await this.configsRepository.findOne({
      where: { id },
      relations: ['proposal', 'approver', 'createdBy'],
    });

    if (!config) {
      throw new NotFoundException('Proposal approval config not found');
    }

    return config;
  }

  async getAvailableApprovers(): Promise<User[]> {
    return await this.usersRepository.find({
      select: ['id', 'name', 'email', 'role'],
      order: { name: 'ASC' },
    });
  }

  async remove(id: string): Promise<void> {
    const config = await this.findOne(id);
    await this.configsRepository.remove(config);
  }

  async removeByProposal(proposalId: string): Promise<void> {
    await this.configsRepository.delete({ proposalId });
  }
}
