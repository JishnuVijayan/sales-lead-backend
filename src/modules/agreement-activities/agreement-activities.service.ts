import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AgreementActivity,
  AgreementActivityType,
} from '../../entities/agreement-activity.entity';
import { Agreement } from '../../entities/agreement.entity';
import {
  CreateAgreementActivityDto,
  CreateAgreementActivityCommentDto,
} from './dto/agreement-activity.dto';
import { ComprehensiveNotificationsService } from '../notifications/comprehensive-notifications.service';

@Injectable()
export class AgreementActivitiesService {
  constructor(
    @InjectRepository(AgreementActivity)
    private agreementActivitiesRepository: Repository<AgreementActivity>,
    @InjectRepository(Agreement)
    private agreementsRepository: Repository<Agreement>,
    private notificationsService: ComprehensiveNotificationsService,
  ) {}

  async create(
    createDto: CreateAgreementActivityDto,
    userId: string,
  ): Promise<AgreementActivity> {
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

    const savedActivity = await this.agreementActivitiesRepository.save(activity);

    // Send notifications
    const stakeholders = await this.notificationsService.getEntityStakeholders('Lead', createDto.leadId || agreement.leadId);

    // Notify stakeholders about new activity (excluding the creator and assignee)
    if (stakeholders.length > 0) {
      const filteredStakeholders = stakeholders.filter(
        id => id !== userId && id !== createDto.assignedToId
      );
      if (filteredStakeholders.length > 0) {
        await this.notificationsService.notifyActivityAdded(
          'Agreement',
          createDto.agreementId,
          createDto.activityType,
          userId,
          filteredStakeholders
        );
      }
    }

    // Notify assigned user if activity is assigned
    if (createDto.assignedToId) {
      await this.notificationsService.notifyActivityAssigned(
        savedActivity.id,
        savedActivity.subject,
        savedActivity.activityType,
        createDto.assignedToId,
        userId,
        'Agreement',
        createDto.agreementId,
        agreement.title || 'Unknown Agreement',
        undefined // No scheduled date for agreement activities
      );
    }

    return savedActivity;
  }

  async createComment(
    dto: CreateAgreementActivityCommentDto,
    userId: string,
  ): Promise<AgreementActivity> {
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

  async findAll(
    agreementId?: string,
    activityType?: AgreementActivityType,
  ): Promise<AgreementActivity[]> {
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
