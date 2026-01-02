import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ProposalActivity,
  ProposalActivityType,
} from '../../entities/proposal-activity.entity';
import { Proposal } from '../../entities/proposal.entity';
import {
  CreateProposalActivityDto,
  CreateProposalActivityCommentDto,
} from './dto/proposal-activity.dto';
import { ComprehensiveNotificationsService } from '../notifications/comprehensive-notifications.service';

@Injectable()
export class ProposalActivitiesService {
  constructor(
    @InjectRepository(ProposalActivity)
    private proposalActivitiesRepository: Repository<ProposalActivity>,
    @InjectRepository(Proposal)
    private proposalsRepository: Repository<Proposal>,
    private notificationsService: ComprehensiveNotificationsService,
  ) {}

  async create(
    createDto: CreateProposalActivityDto,
    userId: string,
  ): Promise<ProposalActivity> {
    const proposal = await this.proposalsRepository.findOne({
      where: { id: createDto.proposalId },
      relations: ['lead'],
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    const activity = this.proposalActivitiesRepository.create({
      ...createDto,
      leadId: createDto.leadId || proposal.leadId,
      createdById: userId,
    });

    const savedActivity = await this.proposalActivitiesRepository.save(activity);

    // Send notifications
    const stakeholders = await this.notificationsService.getEntityStakeholders('Lead', createDto.leadId || proposal.leadId);

    // Notify stakeholders about new activity (excluding the creator and assignee)
    if (stakeholders.length > 0) {
      const filteredStakeholders = stakeholders.filter(
        id => id !== userId && id !== createDto.assignedToId
      );
      if (filteredStakeholders.length > 0) {
        await this.notificationsService.notifyActivityAdded(
          'Proposal',
          createDto.proposalId,
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
        'Proposal',
        createDto.proposalId,
        proposal.title || 'Unknown Proposal',
        undefined // No scheduled date for proposal activities
      );
    }

    return savedActivity;
  }

  async createComment(
    dto: CreateProposalActivityCommentDto,
    userId: string,
  ): Promise<ProposalActivity> {
    const proposal = await this.proposalsRepository.findOne({
      where: { id: dto.proposalId },
      relations: ['lead'],
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    const activity = this.proposalActivitiesRepository.create({
      proposalId: dto.proposalId,
      leadId: proposal.leadId,
      activityType: ProposalActivityType.COMMENT,
      subject: 'Comment added',
      description: dto.comment,
      createdById: userId,
    });

    return await this.proposalActivitiesRepository.save(activity);
  }

  async createAutoActivity(
    proposalId: string,
    activityType: ProposalActivityType,
    subject: string,
    description?: string,
    metadata?: Record<string, any>,
    userId?: string,
  ): Promise<ProposalActivity> {
    const proposal = await this.proposalsRepository.findOne({
      where: { id: proposalId },
      relations: ['lead'],
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    const activity = this.proposalActivitiesRepository.create({
      proposalId,
      leadId: proposal.leadId,
      activityType,
      subject,
      description,
      metadata,
      createdById: userId || proposal.createdById,
    });

    return await this.proposalActivitiesRepository.save(activity);
  }

  async findAll(
    proposalId?: string,
    activityType?: ProposalActivityType,
  ): Promise<ProposalActivity[]> {
    const where: any = {};
    if (proposalId) where.proposalId = proposalId;
    if (activityType) where.activityType = activityType;

    return await this.proposalActivitiesRepository.find({
      where,
      relations: ['proposal', 'lead', 'createdBy', 'completedBy'],
      order: { createdDate: 'DESC' },
    });
  }

  async findOne(id: string): Promise<ProposalActivity> {
    const activity = await this.proposalActivitiesRepository.findOne({
      where: { id },
      relations: ['proposal', 'lead', 'createdBy', 'completedBy'],
    });

    if (!activity) {
      throw new NotFoundException('Proposal activity not found');
    }

    return activity;
  }

  async remove(id: string): Promise<void> {
    const activity = await this.findOne(id);
    await this.proposalActivitiesRepository.remove(activity);
  }

  async complete(id: string, userId: string): Promise<ProposalActivity> {
    const activity = await this.findOne(id);

    activity.isCompleted = true;
    activity.completedDate = new Date();
    activity.completedById = userId;

    return await this.proposalActivitiesRepository.save(activity);
  }
}
