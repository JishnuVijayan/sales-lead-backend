import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgreementActivity, AgreementActivityType } from '../../entities/agreement-activity.entity';
import { Agreement } from '../../entities/agreement.entity';
import { CreateAgreementActivityDto, CreateAgreementActivityCommentDto } from './dto/agreement-activity.dto';

@Injectable()
export class AgreementActivitiesService {
  constructor(
    @InjectRepository(AgreementActivity)
    private agreementActivitiesRepository: Repository<AgreementActivity>,
    @InjectRepository(Agreement)
    private agreementsRepository: Repository<Agreement>,
  ) {}

  async create(createDto: CreateAgreementActivityDto, userId: string): Promise<AgreementActivity> {
    const agreement = await this.agreementsRepository.findOne({
      where: { id: createDto.agreementId },
      relations: ['lead'],
    });

    if (!agreement) {
      throw new NotFoundException('Agreement not found');
    }

    const activity = this.agreementActivitiesRepository.create({
      ...createDto,
      leadId: createDto.leadId || agreement.leadId,
      createdById: userId,
    });

    return await this.agreementActivitiesRepository.save(activity);
  }

  async createComment(dto: CreateAgreementActivityCommentDto, userId: string): Promise<AgreementActivity> {
    const agreement = await this.agreementsRepository.findOne({
      where: { id: dto.agreementId },
      relations: ['lead'],
    });

    if (!agreement) {
      throw new NotFoundException('Agreement not found');
    }

    const activity = this.agreementActivitiesRepository.create({
      agreementId: dto.agreementId,
      leadId: agreement.leadId,
      activityType: AgreementActivityType.COMMENT,
      subject: 'Comment added',
      description: dto.comment,
      createdById: userId,
    });

    return await this.agreementActivitiesRepository.save(activity);
  }

  async createAutoActivity(
    agreementId: string,
    activityType: AgreementActivityType,
    subject: string,
    description?: string,
    metadata?: Record<string, any>,
    userId?: string,
  ): Promise<AgreementActivity> {
    const agreement = await this.agreementsRepository.findOne({
      where: { id: agreementId },
      relations: ['lead'],
    });

    if (!agreement) {
      throw new NotFoundException('Agreement not found');
    }

    const activity = this.agreementActivitiesRepository.create({
      agreementId,
      leadId: agreement.leadId,
      activityType,
      subject,
      description,
      metadata,
      createdById: userId || agreement.createdById,
    });

    return await this.agreementActivitiesRepository.save(activity);
  }

  async findAll(agreementId?: string, activityType?: AgreementActivityType): Promise<AgreementActivity[]> {
    const where: any = {};
    if (agreementId) where.agreementId = agreementId;
    if (activityType) where.activityType = activityType;

    return await this.agreementActivitiesRepository.find({
      where,
      relations: ['agreement', 'lead', 'createdBy', 'completedBy'],
      order: { createdDate: 'DESC' },
    });
  }

  async findByAgreement(agreementId: string): Promise<AgreementActivity[]> {
    return await this.agreementActivitiesRepository.find({
      where: { agreementId },
      relations: ['createdBy', 'completedBy'],
      order: { createdDate: 'DESC' },
    });
  }

  async findOne(id: string): Promise<AgreementActivity> {
    const activity = await this.agreementActivitiesRepository.findOne({
      where: { id },
      relations: ['agreement', 'lead', 'createdBy', 'completedBy'],
    });

    if (!activity) {
      throw new NotFoundException('Agreement activity not found');
    }

    return activity;
  }

  async remove(id: string): Promise<void> {
    const activity = await this.findOne(id);
    await this.agreementActivitiesRepository.remove(activity);
  }

  async complete(id: string, userId: string): Promise<AgreementActivity> {
    const activity = await this.findOne(id);
    
    activity.isCompleted = true;
    activity.completedDate = new Date();
    activity.completedById = userId;

    return await this.agreementActivitiesRepository.save(activity);
  }
}
