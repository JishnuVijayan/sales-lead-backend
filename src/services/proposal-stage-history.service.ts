import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProposalStageHistory, ProposalStatus } from '../entities';

@Injectable()
export class ProposalStageHistoryService {
  constructor(
    @InjectRepository(ProposalStageHistory)
    private stageHistoryRepository: Repository<ProposalStageHistory>,
  ) {}

  async createStageHistory(
    proposalId: string,
    fromStatus: ProposalStatus,
    toStatus: ProposalStatus,
    notes?: string,
    changedById?: string,
  ): Promise<ProposalStageHistory> {
    const history = this.stageHistoryRepository.create({
      proposalId,
      fromStatus,
      toStatus,
      notes,
      changedById,
    });

    return await this.stageHistoryRepository.save(history);
  }

  async getStageHistory(proposalId: string): Promise<ProposalStageHistory[]> {
    return await this.stageHistoryRepository.find({
      where: { proposalId },
      relations: ['changedBy'],
      order: { changedDate: 'DESC' },
    });
  }
}