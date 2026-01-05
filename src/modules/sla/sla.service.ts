import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SLAConfig, SLAStageType } from '../../entities/sla-config.entity';
import { CreateSLAConfigDto, UpdateSLAConfigDto } from './dto/sla-config.dto';

@Injectable()
export class SLAService {
  constructor(
    @InjectRepository(SLAConfig)
    private slaRepository: Repository<SLAConfig>,
  ) {}

  async create(createDto: CreateSLAConfigDto): Promise<SLAConfig> {
    const sla = this.slaRepository.create(createDto);
    return await this.slaRepository.save(sla);
  }

  async findAll(): Promise<SLAConfig[]> {
    return await this.slaRepository.find({
      order: { stage: 'ASC' },
    });
  }

  async findOne(id: string): Promise<SLAConfig> {
    const sla = await this.slaRepository.findOne({ where: { id } });
    if (!sla) {
      throw new NotFoundException(`SLA Config with ID ${id} not found`);
    }
    return sla;
  }

  async findByStage(stage: SLAStageType): Promise<SLAConfig | null> {
    return await this.slaRepository.findOne({
      where: { stage, isActive: true },
    });
  }

  async update(id: string, updateDto: UpdateSLAConfigDto): Promise<SLAConfig> {
    const sla = await this.findOne(id);
    Object.assign(sla, updateDto);
    return await this.slaRepository.save(sla);
  }

  async remove(id: string): Promise<void> {
    const sla = await this.findOne(id);
    await this.slaRepository.remove(sla);
  }

  async initializeDefaultSLAs(): Promise<void> {
    const defaults = [
      {
        stage: SLAStageType.LEAD_NEW,
        warning: 3,
        critical: 5,
        escalation: 7,
        desc: 'New lead initial contact',
      },
      {
        stage: SLAStageType.LEAD_QUALIFIED,
        warning: 5,
        critical: 7,
        escalation: 10,
        desc: 'Qualified lead follow-up',
      },
      {
        stage: SLAStageType.LEAD_PROPOSAL,
        warning: 7,
        critical: 10,
        escalation: 14,
        desc: 'Proposal stage',
      },
      {
        stage: SLAStageType.LEAD_NEGOTIATION,
        warning: 5,
        critical: 7,
        escalation: 10,
        desc: 'Negotiation stage',
      },
      {
        stage: SLAStageType.AGREEMENT_DRAFT,
        warning: 2,
        critical: 3,
        escalation: 5,
        desc: 'Agreement drafting',
      },
      {
        stage: SLAStageType.AGREEMENT_LEGAL_REVIEW,
        warning: 3,
        critical: 5,
        escalation: 7,
        desc: 'Legal review',
      },
      {
        stage: SLAStageType.AGREEMENT_DELIVERY_REVIEW,
        warning: 2,
        critical: 3,
        escalation: 5,
        desc: 'Delivery review',
      },
      {
        stage: SLAStageType.AGREEMENT_PROCUREMENT_REVIEW,
        warning: 2,
        critical: 3,
        escalation: 5,
        desc: 'Procurement review',
      },
      {
        stage: SLAStageType.AGREEMENT_FINANCE_REVIEW,
        warning: 2,
        critical: 3,
        escalation: 5,
        desc: 'Finance review',
      },
      {
        stage: SLAStageType.AGREEMENT_CLIENT_REVIEW,
        warning: 5,
        critical: 7,
        escalation: 10,
        desc: 'Client review',
      },
      {
        stage: SLAStageType.AGREEMENT_CEO_APPROVAL,
        warning: 1,
        critical: 2,
        escalation: 3,
        desc: 'CEO approval',
      },
      {
        stage: SLAStageType.AGREEMENT_ULCCS_APPROVAL,
        warning: 2,
        critical: 3,
        escalation: 5,
        desc: 'ULCCS approval',
      },
    ];

    for (const def of defaults) {
      const existing = await this.findByStage(def.stage);
      if (!existing) {
        await this.create({
          stageType: def.stage,
          warningThresholdDays: def.warning,
          criticalThresholdDays: def.critical,
          escalationThresholdDays: def.escalation,
        });
      }
    }
  }
}
