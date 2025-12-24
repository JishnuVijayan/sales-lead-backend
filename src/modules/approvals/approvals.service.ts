import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Approval, ApprovalStatus, ApprovalStage, ApprovalContext } from '../../entities/approval.entity';
import { User } from '../../entities/user.entity';
import { CreateApprovalDto, UpdateApprovalDto, RespondToApprovalDto, BulkCreateApprovalsDto } from './dto/approval.dto';

@Injectable()
export class ApprovalsService {
  constructor(
    @InjectRepository(Approval)
    private approvalsRepository: Repository<Approval>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  /**
   * Create a single approval
   */
  async create(createDto: CreateApprovalDto): Promise<Approval> {
    const approval = this.approvalsRepository.create(createDto);
    return await this.approvalsRepository.save(approval);
  }

  /**
   * Create approval workflow for proposal/agreement
   * Creates all approval stages in sequence
   */
  async createApprovalWorkflow(bulkDto: BulkCreateApprovalsDto): Promise<Approval[]> {
    const approvals: Approval[] = [];
    
    for (const stageConfig of bulkDto.stages) {
      // Find a user with the matching role to assign as approver
      let approverId = stageConfig.approverId;
      if (!approverId && stageConfig.approverRole) {
        const userWithRole = await this.usersRepository.findOne({
          where: { role: stageConfig.approverRole as any },
        });
        if (userWithRole) {
          approverId = userWithRole.id;
        }
      }

      const approval = this.approvalsRepository.create({
        context: bulkDto.context,
        entityId: bulkDto.entityId,
        leadId: bulkDto.leadId,
        stage: stageConfig.stage,
        approverRole: stageConfig.approverRole,
        approverId: approverId,
        isMandatory: stageConfig.isMandatory ?? true,
        sequenceOrder: stageConfig.sequenceOrder,
        status: ApprovalStatus.PENDING,
      });
      
      approvals.push(approval);
    }
    
    return await this.approvalsRepository.save(approvals);
  }

  /**
   * Get all approvals for an entity
   */
  async findByEntity(context: ApprovalContext, entityId: string): Promise<Approval[]> {
    return await this.approvalsRepository.find({
      where: { context, entityId },
      relations: ['approver', 'lead'],
      order: { sequenceOrder: 'ASC' },
    });
  }

  /**
   * Get pending approvals for a user
   */
  async findPendingForUser(userId: string): Promise<Approval[]> {
    return await this.approvalsRepository.find({
      where: {
        approverId: userId,
        status: ApprovalStatus.PENDING,
      },
      relations: ['lead'],
      order: { requestedDate: 'ASC' },
    });
  }

  /**
   * Get pending approvals by role (for unassigned approvals)
   */
  async findPendingByRole(role: string): Promise<Approval[]> {
    return await this.approvalsRepository.find({
      where: {
        approverRole: role,
        status: ApprovalStatus.PENDING,
      },
      relations: ['lead'],
      order: { requestedDate: 'ASC' },
    });
  }

  /**
   * Respond to approval (approve/reject)
   */
  async respondToApproval(
    id: string,
    userId: string,
    respondDto: RespondToApprovalDto,
  ): Promise<Approval> {
    const approval = await this.approvalsRepository.findOne({
      where: { id },
      relations: ['approver'],
    });

    if (!approval) {
      throw new NotFoundException(`Approval with ID ${id} not found`);
    }

    // Get current user to check role
    const currentUser = await this.usersRepository.findOne({ where: { id: userId } });
    if (!currentUser) {
      throw new ForbiddenException('User not found');
    }

    // Authorization check - allow if user is the assigned approver OR has the required role
    const isAssignedApprover = approval.approverId === userId;
    const hasRequiredRole = approval.approverRole && currentUser.role === approval.approverRole;
    
    if (!isAssignedApprover && !hasRequiredRole) {
      throw new ForbiddenException('You are not authorized to respond to this approval');
    }

    // Status validation
    if (approval.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException(`Approval already ${approval.status.toLowerCase()}`);
    }

    // Validate status
    if (![ApprovalStatus.APPROVED, ApprovalStatus.REJECTED].includes(respondDto.status)) {
      throw new BadRequestException('Status must be Approved or Rejected');
    }

    // Update approval
    approval.status = respondDto.status;
    if (respondDto.comments) {
      approval.comments = respondDto.comments;
    }
    approval.approverId = userId;
    approval.respondedDate = new Date();

    return await this.approvalsRepository.save(approval);
  }

  /**
   * Check if all mandatory approvals are completed
   */
  async areAllApprovalsCompleted(context: ApprovalContext, entityId: string): Promise<boolean> {
    const mandatoryApprovals = await this.approvalsRepository.find({
      where: {
        context,
        entityId,
        isMandatory: true,
      },
    });

    return mandatoryApprovals.every(
      (approval) => approval.status === ApprovalStatus.APPROVED || approval.status === ApprovalStatus.SKIPPED,
    );
  }

  /**
   * Get next pending approval in sequence
   */
  async getNextPendingApproval(context: ApprovalContext, entityId: string): Promise<Approval | null> {
    const approval = await this.approvalsRepository.findOne({
      where: {
        context,
        entityId,
        status: ApprovalStatus.PENDING,
      },
      relations: ['approver'],
      order: { sequenceOrder: 'ASC' },
    });

    return approval || null;
  }

  /**
   * Skip non-mandatory approval
   */
  async skipApproval(id: string, reason: string): Promise<Approval> {
    const approval = await this.approvalsRepository.findOneBy({ id });

    if (!approval) {
      throw new NotFoundException(`Approval with ID ${id} not found`);
    }

    if (approval.isMandatory) {
      throw new BadRequestException('Cannot skip mandatory approval');
    }

    approval.status = ApprovalStatus.SKIPPED;
    approval.comments = `Skipped: ${reason}`;
    approval.respondedDate = new Date();

    return await this.approvalsRepository.save(approval);
  }

  /**
   * Reset approval workflow (for revisions)
   */
  async resetApprovals(context: ApprovalContext, entityId: string, fromStage?: ApprovalStage): Promise<void> {
    const query = this.approvalsRepository.createQueryBuilder()
      .update(Approval)
      .set({
        status: ApprovalStatus.PENDING,
        approverId: () => 'NULL',
        respondedDate: () => 'NULL',
        comments: () => 'NULL',
      })
      .where('context = :context', { context })
      .andWhere('entityId = :entityId', { entityId });

    if (fromStage) {
      // Reset only approvals from this stage onwards
      const stageOrder = await this.approvalsRepository.findOne({
        where: { context, entityId, stage: fromStage },
      });
      
      if (stageOrder) {
        query.andWhere('sequenceOrder >= :order', { order: stageOrder.sequenceOrder });
      }
    }

    await query.execute();
  }

  /**
   * Get approval summary
   */
  async getApprovalSummary(context: ApprovalContext, entityId: string): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    percentComplete: number;
  }> {
    const approvals = await this.findByEntity(context, entityId);
    
    const total = approvals.length;
    const pending = approvals.filter(a => a.status === ApprovalStatus.PENDING).length;
    const approved = approvals.filter(a => a.status === ApprovalStatus.APPROVED).length;
    const rejected = approvals.filter(a => a.status === ApprovalStatus.REJECTED).length;
    const percentComplete = total > 0 ? Math.round((approved / total) * 100) : 0;

    return { total, pending, approved, rejected, percentComplete };
  }

  /**
   * Delete approvals (for entity deletion)
   */
  async deleteByEntity(context: ApprovalContext, entityId: string): Promise<void> {
    await this.approvalsRepository.delete({ context, entityId });
  }

  /**
   * Find one approval by ID
   */
  async findOne(id: string): Promise<Approval> {
    const approval = await this.approvalsRepository.findOne({
      where: { id },
      relations: ['approver', 'lead'],
    });

    if (!approval) {
      throw new NotFoundException(`Approval with ID ${id} not found`);
    }

    return approval;
  }
}
