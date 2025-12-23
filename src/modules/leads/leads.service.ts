import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between, MoreThan, LessThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Lead, LeadStatus, LeadAgingStatus } from '../../entities';
import { CreateLeadDto, UpdateLeadDto, QualifyLeadDto, FilterLeadsDto } from './dto/lead.dto';
import { RequestQualificationDto, ApproveQualificationDto } from './dto/lead.dto';
import { ComprehensiveNotificationsService } from '../notifications/comprehensive-notifications.service';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private leadsRepository: Repository<Lead>,
    private configService: ConfigService,
    private notificationsService: ComprehensiveNotificationsService,
  ) {}

  async create(createLeadDto: CreateLeadDto, userId: string): Promise<Lead> {
    const lead = this.leadsRepository.create({
      ...createLeadDto,
      status: LeadStatus.NEW,
      isActive: true,
      lastActionDate: new Date(),
      createdById: userId,
    });

    const savedLead = await this.leadsRepository.save(lead);
    
    // Send in-app notification
    try {
      await this.notificationsService.notifyLeadCreated(savedLead.id, userId);
    } catch (error) {
      // Log error but don't fail lead creation
      console.error('Failed to send notification:', error);
    }

    return savedLead;
  }

  async findAll(filterDto: FilterLeadsDto): Promise<{ data: Lead[]; total: number; page: number; limit: number }> {
    const { status, source, assignedToId, minAge, maxAge, search, page = 1, limit = 10 } = filterDto;

    const query = this.leadsRepository.createQueryBuilder('lead')
      .leftJoinAndSelect('lead.assignedTo', 'assignedTo')
      .leftJoinAndSelect('lead.createdBy', 'createdBy')
      .orderBy('lead.createdDate', 'DESC');

    if (status) {
      query.andWhere('lead.status = :status', { status });
    }

    if (source) {
      query.andWhere('lead.source = :source', { source });
    }

    if (assignedToId) {
      query.andWhere('lead.assignedToId = :assignedToId', { assignedToId });
    }

    if (search) {
      query.andWhere(
        '(lead.name ILIKE :search OR lead.organization ILIKE :search OR lead.email ILIKE :search OR lead.phone ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    const [results, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // Calculate aging for each lead
    const data = results.map(lead => this.calculateLeadAging(lead));

    // Filter by age range if specified
    let filteredData = data;
    if (minAge !== undefined || maxAge !== undefined) {
      filteredData = data.filter(lead => {
        const age = lead.leadAge || 0;
        if (minAge !== undefined && age < minAge) return false;
        if (maxAge !== undefined && age > maxAge) return false;
        return true;
      });
    }

    return {
      data: filteredData,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<Lead> {
    const lead = await this.leadsRepository.findOne({
      where: { id },
      relations: ['assignedTo', 'createdBy', 'activities', 'proposals', 'documents', 'workOrders'],
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    return this.calculateLeadAging(lead);
  }

  async update(id: string, updateLeadDto: UpdateLeadDto): Promise<Lead> {
    const lead = await this.findOne(id);

    // Update last action date on any update
    const updatedLead = this.leadsRepository.merge(lead, {
      ...updateLeadDto,
      lastActionDate: new Date(),
    });

    return await this.leadsRepository.save(updatedLead);
  }

  async qualify(id: string, qualifyDto: QualifyLeadDto, userId?: string): Promise<Lead> {
    const lead = await this.findOne(id);

    const updatedLead = this.leadsRepository.merge(lead, {
      ...qualifyDto,
      status: LeadStatus.QUALIFIED,
      qualifiedDate: new Date(),
      lastActionDate: new Date(),
    });

    const savedLead = await this.leadsRepository.save(updatedLead);
    
    // Send in-app notification
    try {
      await this.notificationsService.notifyLeadQualified(savedLead.id, userId || savedLead.createdById);
    } catch (error) {
      console.error('Failed to send notification:', error);
    }

    return savedLead;
  }

  async convertToWon(id: string): Promise<Lead> {
    const lead = await this.findOne(id);

    lead.status = LeadStatus.WON;
    lead.isConverted = true;
    lead.convertedDate = new Date();
    lead.closedDate = new Date();
    lead.wonDate = new Date();
    lead.lastActionDate = new Date();

    const savedLead = await this.leadsRepository.save(lead);
    
    // Note: notifyLeadWon will be called from work-orders service
    // when work order is created with the workOrderId

    return savedLead;
  }

  async markAsLost(id: string, reason?: string): Promise<Lead> {
    const lead = await this.findOne(id);

    lead.status = LeadStatus.LOST;
    lead.closedDate = new Date();
    lead.lostDate = new Date();
    lead.lastActionDate = new Date();
    if (reason) {
      lead.internalNotes = (lead.internalNotes || '') + `\n\nLost Reason: ${reason}`;
    }

    return await this.leadsRepository.save(lead);
  }

  async moveToProposal(id: string): Promise<Lead> {
    const lead = await this.findOne(id);

    lead.status = LeadStatus.PROPOSAL;
    lead.proposalDate = new Date();
    lead.lastActionDate = new Date();

    return await this.leadsRepository.save(lead);
  }

  async moveToNegotiation(id: string): Promise<Lead> {
    const lead = await this.findOne(id);

    lead.status = LeadStatus.NEGOTIATION;
    lead.negotiationDate = new Date();
    lead.lastActionDate = new Date();

    return await this.leadsRepository.save(lead);
  }

  async markAsDormant(id: string): Promise<Lead> {
    const lead = await this.findOne(id);

    lead.status = LeadStatus.DORMANT;
    lead.dormantDate = new Date();
    lead.isActive = false;
    lead.lastActionDate = new Date();

    return await this.leadsRepository.save(lead);
  }

  async claim(id: string, userId: string): Promise<Lead> {
    const lead = await this.findOne(id);

    lead.assignedToId = userId;
    lead.lastActionDate = new Date();

    return await this.leadsRepository.save(lead);
  }

  async getAgingSummary(): Promise<{
    totalLeads: number;
    activeLeads: number;
    averageAge: number;
    overdueCount: number;
    needsAttentionCount: number;
    byStatus: Record<string, number>;
  }> {
    const allLeads = await this.leadsRepository.find({
      where: { isActive: true },
    });

    const leadsWithAging = allLeads.map(lead => this.calculateLeadAging(lead));

    const overdueCount = leadsWithAging.filter(
      lead => lead.agingStatus === LeadAgingStatus.OVERDUE
    ).length;

    const needsAttentionCount = leadsWithAging.filter(
      lead => lead.agingStatus === LeadAgingStatus.NEEDS_ATTENTION
    ).length;

    const totalAge = leadsWithAging.reduce((sum, lead) => sum + (lead.leadAge || 0), 0);
    const averageAge = leadsWithAging.length > 0 ? totalAge / leadsWithAging.length : 0;

    const byStatus = allLeads.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalLeads: allLeads.length,
      activeLeads: leadsWithAging.filter(l => l.isActive).length,
      averageAge: Math.round(averageAge * 10) / 10,
      overdueCount,
      needsAttentionCount,
      byStatus,
    };
  }

  async getOverdueLeads(): Promise<Lead[]> {
    const allLeads = await this.leadsRepository.find({
      where: { 
        isActive: true,
        isConverted: false,
      },
      relations: ['assignedTo'],
    });

    const leadsWithAging = allLeads.map(lead => this.calculateLeadAging(lead));

    return leadsWithAging.filter(
      lead => lead.agingStatus === LeadAgingStatus.OVERDUE
    );
  }

  private calculateLeadAging(lead: Lead): Lead {
    const now = new Date();
    const createdDate = new Date(lead.createdDate);
    const lastActionDate = new Date(lead.lastActionDate);

    // Calculate lead age in days from creation
    const leadAge = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate days since last action
    const daysSinceLastAction = Math.floor((now.getTime() - lastActionDate.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate stage-wise aging
    const stageAging = {
      new: lead.qualifiedDate
        ? Math.floor((new Date(lead.qualifiedDate).getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
        : leadAge, // If not qualified yet, all time is in New stage
      qualified: lead.proposalDate && lead.qualifiedDate
        ? Math.floor((new Date(lead.proposalDate).getTime() - new Date(lead.qualifiedDate).getTime()) / (1000 * 60 * 60 * 24))
        : lead.qualifiedDate && !lead.proposalDate
        ? Math.floor((now.getTime() - new Date(lead.qualifiedDate).getTime()) / (1000 * 60 * 60 * 24))
        : 0,
      proposal: lead.negotiationDate && lead.proposalDate
        ? Math.floor((new Date(lead.negotiationDate).getTime() - new Date(lead.proposalDate).getTime()) / (1000 * 60 * 60 * 24))
        : lead.proposalDate && !lead.negotiationDate
        ? Math.floor((now.getTime() - new Date(lead.proposalDate).getTime()) / (1000 * 60 * 60 * 24))
        : 0,
      negotiation: lead.wonDate && lead.negotiationDate
        ? Math.floor((new Date(lead.wonDate).getTime() - new Date(lead.negotiationDate).getTime()) / (1000 * 60 * 60 * 24))
        : lead.lostDate && lead.negotiationDate
        ? Math.floor((new Date(lead.lostDate).getTime() - new Date(lead.negotiationDate).getTime()) / (1000 * 60 * 60 * 24))
        : lead.negotiationDate
        ? Math.floor((now.getTime() - new Date(lead.negotiationDate).getTime()) / (1000 * 60 * 60 * 24))
        : 0,
      won: lead.wonDate ? Math.floor((now.getTime() - new Date(lead.wonDate).getTime()) / (1000 * 60 * 60 * 24)) : 0,
      lost: lead.lostDate ? Math.floor((now.getTime() - new Date(lead.lostDate).getTime()) / (1000 * 60 * 60 * 24)) : 0,
      dormant: lead.dormantDate ? Math.floor((now.getTime() - new Date(lead.dormantDate).getTime()) / (1000 * 60 * 60 * 24)) : 0,
    };

    // Determine aging status based on days since last action
    const activeThreshold = +this.configService.get('AGING_ACTIVE_THRESHOLD', 3);
    const attentionThreshold = +this.configService.get('AGING_ATTENTION_THRESHOLD', 7);

    let agingStatus: LeadAgingStatus;

    if (lead.isConverted || lead.status === LeadStatus.WON || lead.status === LeadStatus.LOST) {
      agingStatus = LeadAgingStatus.ACTIVE; // Don't show aging for closed leads
    } else if (daysSinceLastAction <= activeThreshold) {
      agingStatus = LeadAgingStatus.ACTIVE;
    } else if (daysSinceLastAction <= attentionThreshold) {
      agingStatus = LeadAgingStatus.NEEDS_ATTENTION;
    } else {
      agingStatus = LeadAgingStatus.OVERDUE;
    }

    return {
      ...lead,
      leadAge,
      daysSinceLastAction,
      agingStatus,
      stageAging,
    };
  }

  // Phase 2: New workflow methods
  async requestQualification(id: string, requestDto: RequestQualificationDto, userId: string): Promise<Lead> {
    const lead = await this.findOne(id);

    if (lead.status !== LeadStatus.NEW) {
      throw new BadRequestException('Only NEW leads can request qualification');
    }

    const updatedLead = this.leadsRepository.merge(lead, {
      ...requestDto,
      qualificationStatus: 'Pending',
      lastActionDate: new Date(),
    });

    return await this.leadsRepository.save(updatedLead);
  }

  async approveQualification(id: string, approvalDto: ApproveQualificationDto, userId: string): Promise<Lead> {
    const lead = await this.findOne(id);

    if (lead.qualificationStatus !== 'Pending') {
      throw new BadRequestException('Lead is not pending qualification approval');
    }

    if (approvalDto.approved) {
      lead.qualificationStatus = 'Approved';
      lead.status = LeadStatus.QUALIFIED;
      lead.qualifiedDate = new Date();
      lead.qualifiedById = userId;
    } else {
      lead.qualificationStatus = 'Rejected';
      lead.rejectionReason = approvalDto.rejectionReason || approvalDto.comments || '';
    }

    lead.lastActionDate = new Date();

    return await this.leadsRepository.save(lead);
  }

  async remove(id: string): Promise<void> {
    const lead = await this.findOne(id);
    await this.leadsRepository.remove(lead);
  }
}
