import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeadActivity } from '../../entities';
import { CreateActivityDto, UpdateActivityDto } from './dto/activity.dto';
import { LeadsService } from '../leads/leads.service';
import { ComprehensiveNotificationsService } from '../notifications/comprehensive-notifications.service';

@Injectable()
export class ActivitiesService {
  constructor(
    @InjectRepository(LeadActivity)
    private activitiesRepository: Repository<LeadActivity>,
    private leadsService: LeadsService,
    private notificationsService: ComprehensiveNotificationsService,
  ) {}

  async create(
    createActivityDto: CreateActivityDto,
    userId: string,
  ): Promise<LeadActivity> {
    const activity = this.activitiesRepository.create(createActivityDto);
    const savedActivity = await this.activitiesRepository.save(activity);

    // Update lead's last action date
    await this.leadsService.update(createActivityDto.leadId, {});

    // Send notifications
    const lead = await this.leadsService.findOne(createActivityDto.leadId);
    const stakeholders = await this.notificationsService.getEntityStakeholders(
      'Lead',
      createActivityDto.leadId,
    );

    // Notify stakeholders about new activity (excluding the creator and assignee)
    if (stakeholders.length > 0) {
      const filteredStakeholders = stakeholders.filter(
        (id) => id !== userId && id !== createActivityDto.assignedToId,
      );
      if (filteredStakeholders.length > 0) {
        await this.notificationsService.notifyActivityAdded(
          'Lead',
          createActivityDto.leadId,
          savedActivity.type,
          userId,
          filteredStakeholders,
        );
      }
    }

    // Notify assigned user if activity is assigned
    if (createActivityDto.assignedToId) {
      await this.notificationsService.notifyActivityAssigned(
        savedActivity.id,
        savedActivity.title,
        savedActivity.type,
        createActivityDto.assignedToId,
        userId,
        'Lead',
        createActivityDto.leadId,
        lead.name || 'Unknown Lead',
        savedActivity.scheduledDate,
      );
    }

    return savedActivity;
  }

  async findAll(): Promise<{
    data: LeadActivity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const [activities, total] = await this.activitiesRepository.findAndCount({
      relations: ['lead', 'createdBy', 'assignedTo'],
      order: { createdDate: 'DESC' },
    });

    return {
      data: activities,
      total,
      page: 1,
      limit: total,
    };
  }

  async findByLead(leadId: string): Promise<LeadActivity[]> {
    return await this.activitiesRepository.find({
      where: { leadId },
      relations: ['createdBy', 'assignedTo'],
      order: { createdDate: 'DESC' },
    });
  }

  async findOne(id: string): Promise<LeadActivity> {
    const activity = await this.activitiesRepository.findOne({
      where: { id },
      relations: ['lead', 'createdBy'],
    });

    if (!activity) {
      throw new NotFoundException(`Activity with ID ${id} not found`);
    }

    return activity;
  }

  async update(
    id: string,
    updateActivityDto: UpdateActivityDto,
  ): Promise<LeadActivity> {
    const activity = await this.findOne(id);

    const updatedActivity = this.activitiesRepository.merge(
      activity,
      updateActivityDto,
    );
    const savedActivity = await this.activitiesRepository.save(updatedActivity);

    // Update lead's last action date
    await this.leadsService.update(activity.leadId, {});

    return savedActivity;
  }

  async markAsCompleted(id: string): Promise<LeadActivity> {
    const activity = await this.findOne(id);

    activity.isCompleted = true;
    activity.completedDate = new Date();

    const savedActivity = await this.activitiesRepository.save(activity);

    // Update lead's last action date
    await this.leadsService.update(activity.leadId, {});

    return savedActivity;
  }

  async remove(id: string): Promise<void> {
    const activity = await this.findOne(id);
    await this.activitiesRepository.remove(activity);
  }
}
