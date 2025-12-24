import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Negotiation, NegotiationStatus, NegotiationOutcome } from '../../entities';
import { CreateNegotiationDto, UpdateNegotiationDto } from './dto/negotiation.dto';
import { ApprovalsService } from '../approvals/approvals.service';
import { ApprovalContext, ApprovalStage } from '../../entities/approval.entity';
import { UserRole } from '../../entities/user.entity';

@Injectable()
export class NegotiationsService {
  constructor(
    @InjectRepository(Negotiation)
    private negotiationsRepository: Repository<Negotiation>,
    @Inject(forwardRef(() => ApprovalsService))
    private approvalsService: ApprovalsService,
  ) {}

  async create(createNegotiationDto: CreateNegotiationDto): Promise<Negotiation> {
    const negotiation = this.negotiationsRepository.create({
      ...createNegotiationDto,
      status: NegotiationStatus.ACTIVE,
      callCount: createNegotiationDto.callCount || 0,
      meetingCount: createNegotiationDto.meetingCount || 0,
      emailCount: createNegotiationDto.emailCount || 0,
    });

    return await this.negotiationsRepository.save(negotiation);
  }

  async findAll(leadId?: string): Promise<Negotiation[]> {
    const query = this.negotiationsRepository.createQueryBuilder('negotiation')
      .leftJoinAndSelect('negotiation.lead', 'lead')
      .leftJoinAndSelect('negotiation.negotiator', 'negotiator')
      .orderBy('negotiation.createdDate', 'DESC');

    if (leadId) {
      query.andWhere('negotiation.leadId = :leadId', { leadId });
    }

    return await query.getMany();
  }

  async findOne(id: string): Promise<Negotiation> {
    const negotiation = await this.negotiationsRepository.findOne({
      where: { id },
      relations: ['lead', 'negotiator'],
    });

    if (!negotiation) {
      throw new NotFoundException(`Negotiation with ID ${id} not found`);
    }

    return negotiation;
  }

  async update(id: string, updateNegotiationDto: UpdateNegotiationDto): Promise<Negotiation> {
    const negotiation = await this.findOne(id);

    // If status is being updated to completed, set actual closure date
    if (updateNegotiationDto.status === NegotiationStatus.COMPLETED && !negotiation.actualClosureDate) {
      updateNegotiationDto.actualClosureDate = new Date().toISOString().split('T')[0];
    }

    Object.assign(negotiation, updateNegotiationDto);
    return await this.negotiationsRepository.save(negotiation);
  }

  async remove(id: string): Promise<void> {
    const negotiation = await this.findOne(id);
    await this.negotiationsRepository.remove(negotiation);
  }

  async completeNegotiation(id: string, outcome: NegotiationOutcome, finalAmount?: number): Promise<Negotiation> {
    const negotiation = await this.findOne(id);

    return await this.update(id, {
      status: NegotiationStatus.COMPLETED,
      outcome,
      finalAmount,
      actualClosureDate: new Date().toISOString().split('T')[0],
    });
  }

  async getNegotiationStats(leadId: string): Promise<{
    totalNegotiations: number;
    activeNegotiations: number;
    completedNegotiations: number;
    totalCalls: number;
    totalMeetings: number;
    averageExpectedAmount: number;
  }> {
    const negotiations = await this.findAll(leadId);

    const stats = {
      totalNegotiations: negotiations.length,
      activeNegotiations: negotiations.filter(n => n.status === NegotiationStatus.ACTIVE).length,
      completedNegotiations: negotiations.filter(n => n.status === NegotiationStatus.COMPLETED).length,
      totalCalls: negotiations.reduce((sum, n) => sum + n.callCount, 0),
      totalMeetings: negotiations.reduce((sum, n) => sum + n.meetingCount, 0),
      averageExpectedAmount: negotiations.length > 0
        ? negotiations.reduce((sum, n) => sum + n.expectedAmount, 0) / negotiations.length
        : 0,
    };

    return stats;
  }

  // Phase 2 Module 2.5: Negotiation Revision Loop
  async requestRevision(
    id: string,
    userId: string,
    revisionReason: string,
    changes: Partial<UpdateNegotiationDto>
  ): Promise<Negotiation> {
    const negotiation = await this.findOne(id);

    if (negotiation.status !== NegotiationStatus.ACTIVE) {
      throw new BadRequestException('Only active negotiations can be revised');
    }

    // Check if significant changes require approval (amount change > 10% or discount change)
    const requiresApproval = this.checkIfRevisionRequiresApproval(negotiation, changes);

    // Increment revision number
    const revisionNumber = negotiation.revisionNumber + 1;

    // Apply changes
    Object.assign(negotiation, {
      ...changes,
      revisionNumber,
      requiresApproval,
      revisionStatus: requiresApproval ? 'Pending' : null,
      revisionRequestedById: userId,
      revisionRequestedDate: new Date(),
      revisionReason,
    });

    await this.negotiationsRepository.save(negotiation);

    // If approval required, create approval workflow
    if (requiresApproval) {
      await this.approvalsService.createApprovalWorkflow({
        context: ApprovalContext.NEGOTIATION_REVISION,
        entityId: negotiation.id,
        leadId: negotiation.leadId,
        stages: [
          { stage: ApprovalStage.SALES_MANAGER, approverRole: UserRole.SALES_MANAGER, isMandatory: true, sequenceOrder: 1 },
        ],
      });
    }

    return negotiation;
  }

  private checkIfRevisionRequiresApproval(
    negotiation: Negotiation,
    changes: Partial<UpdateNegotiationDto>
  ): boolean {
    // Require approval if amount changes by more than 10%
    if (changes.expectedAmount) {
      const percentChange = Math.abs(
        ((changes.expectedAmount - negotiation.expectedAmount) / negotiation.expectedAmount) * 100
      );
      if (percentChange > 10) return true;
    }

    // Require approval if discount changes
    if (changes.discountOffered !== undefined && changes.discountOffered !== negotiation.discountOffered) {
      return true;
    }

    // Require approval if special terms are added/modified
    if (changes.specialTerms && changes.specialTerms !== negotiation.specialTerms) {
      return true;
    }

    return false;
  }

  async approveRevision(id: string, userId: string, approved: boolean, notes?: string): Promise<Negotiation> {
    const negotiation = await this.findOne(id);

    if (!negotiation.requiresApproval) {
      throw new BadRequestException('This negotiation revision does not require approval');
    }

    if (negotiation.revisionStatus !== 'Pending') {
      throw new BadRequestException('This revision has already been processed');
    }

    negotiation.revisionStatus = approved ? 'Approved' : 'Rejected';
    negotiation.revisionApprovedById = userId;
    negotiation.revisionApprovedDate = new Date();
    negotiation.revisionNotes = notes || '';

    // If rejected, revert to previous state (could be enhanced to store revision history)
    if (!approved) {
      negotiation.requiresApproval = false;
    }

    return await this.negotiationsRepository.save(negotiation);
  }

  async getRevisionHistory(id: string): Promise<any> {
    const negotiation = await this.findOne(id);
    
    return {
      negotiationId: negotiation.id,
      currentRevision: negotiation.revisionNumber,
      requiresApproval: negotiation.requiresApproval,
      revisionStatus: negotiation.revisionStatus,
      revisionRequestedBy: negotiation.revisionRequestedBy,
      revisionRequestedDate: negotiation.revisionRequestedDate,
      revisionApprovedBy: negotiation.revisionApprovedBy,
      revisionApprovedDate: negotiation.revisionApprovedDate,
      revisionReason: negotiation.revisionReason,
      revisionNotes: negotiation.revisionNotes,
    };
  }
}
