import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgreementApprovalConfig } from '../../entities/agreement-approval-config.entity';
import { Agreement } from '../../entities/agreement.entity';
import { User } from '../../entities/user.entity';
import { CreateAgreementApprovalConfigDto, DefineAgreementApprovalFlowDto } from './dto/agreement-approval-config.dto';

@Injectable()
export class AgreementApprovalConfigsService {
  constructor(
    @InjectRepository(AgreementApprovalConfig)
    private configsRepository: Repository<AgreementApprovalConfig>,
    @InjectRepository(Agreement)
    private agreementsRepository: Repository<Agreement>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createDto: CreateAgreementApprovalConfigDto, userId: string): Promise<AgreementApprovalConfig> {
    const agreement = await this.agreementsRepository.findOne({
      where: { id: createDto.agreementId },
    });

    if (!agreement) {
      throw new NotFoundException('Agreement not found');
    }

    const config = this.configsRepository.create({
      ...createDto,
      createdById: userId,
    });

    return await this.configsRepository.save(config);
  }

  async defineApprovalFlow(dto: DefineAgreementApprovalFlowDto, userId: string): Promise<AgreementApprovalConfig[]> {
    const agreement = await this.agreementsRepository.findOne({
      where: { id: dto.agreementId },
    });

    if (!agreement) {
      throw new NotFoundException('Agreement not found');
    }

    // Delete existing approval configs for this agreement
    await this.configsRepository.delete({ agreementId: dto.agreementId });

    // Create new approval configs
    const configs: AgreementApprovalConfig[] = [];

    for (const approverConfig of dto.approvers) {
      const config = this.configsRepository.create({
        agreementId: dto.agreementId,
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

    // Mark agreement as having custom approval flow
    await this.agreementsRepository.update(dto.agreementId, { hasCustomApprovalFlow: true });

    return savedConfigs;
  }

  async findAll(agreementId?: string): Promise<AgreementApprovalConfig[]> {
    const where = agreementId ? { agreementId } : {};
    return await this.configsRepository.find({
      where,
      relations: ['agreement', 'approver', 'createdBy'],
      order: { sequenceOrder: 'ASC' },
    });
  }

  async findByAgreement(agreementId: string): Promise<AgreementApprovalConfig[]> {
    return this.findAll(agreementId);
  }

  async findOne(id: string): Promise<AgreementApprovalConfig> {
    const config = await this.configsRepository.findOne({
      where: { id },
      relations: ['agreement', 'approver', 'createdBy'],
    });

    if (!config) {
      throw new NotFoundException('Agreement approval config not found');
    }

    return config;
  }

  async remove(id: string): Promise<void> {
    const config = await this.findOne(id);
    await this.configsRepository.remove(config);
  }

  async removeByAgreement(agreementId: string): Promise<void> {
    await this.configsRepository.delete({ agreementId });
  }
}