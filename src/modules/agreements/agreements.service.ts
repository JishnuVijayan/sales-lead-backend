import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agreement, AgreementStage } from '../../entities/agreement.entity';
import { AgreementStageHistory } from '../../entities/agreement-stage-history.entity';
import { Lead } from '../../entities/lead.entity';
import { User, UserRole } from '../../entities/user.entity';
import { ApprovalContext, ApprovalStatus } from '../../entities/approval.entity';
import { CreateAgreementDto, UpdateAgreementDto, ChangeStageDto, SignAgreementDto, TerminateAgreementDto } from './dto/agreement.dto';
import { AgreementApprovalConfigsService } from '../agreement-approval-configs/agreement-approval-configs.service';
import { ApprovalsService } from '../approvals/approvals.service';
import { ApprovalType } from '../../entities/agreement-approval-config.entity';

@Injectable()
export class AgreementsService {
  constructor(
    @InjectRepository(Agreement)
    private agreementsRepository: Repository<Agreement>,
    @InjectRepository(AgreementStageHistory)
    private stageHistoryRepository: Repository<AgreementStageHistory>,
    @InjectRepository(Lead)
    private leadsRepository: Repository<Lead>,
    private agreementApprovalConfigsService: AgreementApprovalConfigsService,
    private approvalsService: ApprovalsService,
  ) {}

  async create(createAgreementDto: CreateAgreementDto, userId: string): Promise<Agreement> {
    // Verify lead exists
    const lead = await this.leadsRepository.findOne({ where: { id: createAgreementDto.leadId } });
    if (!lead) {
      throw new NotFoundException(`Lead with ID ${createAgreementDto.leadId} not found`);
    }

    // Generate agreement number (AGR-YYYYMMDD-XXXX)
    const timestamp = new Date();
    const dateStr = timestamp.toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const agreementNumber = `AGR-${dateStr}-${randomNum}`;

    const agreement = this.agreementsRepository.create({
      ...createAgreementDto,
      agreementNumber,
      createdById: userId,
    });

    const savedAgreement = await this.agreementsRepository.save(agreement);

    // Create initial stage history
    await this.createStageHistory(
      savedAgreement.id,
      AgreementStage.DRAFT,
      AgreementStage.DRAFT,
      'Agreement created',
      userId,
    );

    return savedAgreement;
  }

  async findAll(filters?: any): Promise<Agreement[]> {
    const query = this.agreementsRepository.createQueryBuilder('agreement')
      .leftJoinAndSelect('agreement.lead', 'lead')
      .leftJoinAndSelect('agreement.createdBy', 'createdBy')
      .leftJoinAndSelect('agreement.assignedTo', 'assignedTo');

    if (filters?.leadId) {
      query.andWhere('agreement.leadId = :leadId', { leadId: filters.leadId });
    }

    if (filters?.stage) {
      query.andWhere('agreement.stage = :stage', { stage: filters.stage });
    }

    if (filters?.isActive !== undefined) {
      query.andWhere('agreement.isActive = :isActive', { isActive: filters.isActive });
    }

    query.orderBy('agreement.createdDate', 'DESC');

    return query.getMany();
  }

  async findOne(id: string): Promise<Agreement> {
    const agreement = await this.agreementsRepository.findOne({
      where: { id },
      relations: ['lead', 'createdBy', 'assignedTo', 'companySignedBy', 'terminatedBy', 'stageHistory', 'stageHistory.changedBy'],
    });

    if (!agreement) {
      throw new NotFoundException(`Agreement with ID ${id} not found`);
    }

    return agreement;
  }

  async findByLead(leadId: string): Promise<Agreement[]> {
    return this.agreementsRepository.find({
      where: { leadId },
      relations: ['createdBy', 'assignedTo'],
      order: { createdDate: 'DESC' },
    });
  }

  async update(id: string, updateAgreementDto: UpdateAgreementDto, userId: string): Promise<Agreement> {
    const agreement = await this.findOne(id);

    // Prevent updates to signed/active agreements without proper workflow
    if ([AgreementStage.SIGNED, AgreementStage.ACTIVE].includes(agreement.stage)) {
      throw new BadRequestException('Cannot update signed or active agreements. Use change stage workflow.');
    }

    Object.assign(agreement, updateAgreementDto);
    return this.agreementsRepository.save(agreement);
  }

  async changeStage(id: string, changeStageDto: ChangeStageDto, userId: string): Promise<Agreement> {
    const agreement = await this.findOne(id);
    const oldStage = agreement.stage;

    // Validate stage transition
    this.validateStageTransition(oldStage, changeStageDto.newStage);

    agreement.stage = changeStageDto.newStage;

    // Update dates based on new stage
    if (changeStageDto.newStage === AgreementStage.ACTIVE && !agreement.startDate) {
      agreement.startDate = new Date();
    }

    await this.agreementsRepository.save(agreement);

    // Create stage history
    await this.createStageHistory(
      agreement.id,
      oldStage,
      changeStageDto.newStage,
      changeStageDto.notes || '',
      userId,
    );

    // Reload agreement with all relations to ensure frontend gets complete data
    return this.findOne(id);
  }

  async signByClient(id: string, signDto: SignAgreementDto, userId: string): Promise<Agreement> {
    const agreement = await this.findOne(id);

    if (agreement.stage !== AgreementStage.PENDING_SIGNATURE) {
      throw new BadRequestException('Agreement must be in Pending Signature stage');
    }

    agreement.clientSignedBy = signDto.signedBy;
    agreement.clientSignedDate = signDto.signedDate || new Date();

    // If company already signed, move to Signed stage
    if (agreement.companySignedDate) {
      agreement.stage = AgreementStage.SIGNED;
      await this.createStageHistory(
        agreement.id,
        AgreementStage.PENDING_SIGNATURE,
        AgreementStage.SIGNED,
        signDto.notes || 'Client signed agreement',
        userId,
      );
    }

    return this.agreementsRepository.save(agreement);
  }

  async signByCompany(id: string, signDto: SignAgreementDto, userId: string): Promise<Agreement> {
    const agreement = await this.findOne(id);

    if (![AgreementStage.PENDING_SIGNATURE, AgreementStage.DRAFT].includes(agreement.stage)) {
      throw new BadRequestException('Agreement must be in Draft or Pending Signature stage');
    }

    agreement.companySignedById = userId;
    agreement.companySignedDate = signDto.signedDate || new Date();

    // If client already signed, move to Signed stage
    if (agreement.clientSignedDate) {
      agreement.stage = AgreementStage.SIGNED;
      await this.createStageHistory(
        agreement.id,
        agreement.stage,
        AgreementStage.SIGNED,
        signDto.notes || 'Company signed agreement',
        userId,
      );
    } else if (agreement.stage === AgreementStage.DRAFT) {
      // Move to pending signature
      agreement.stage = AgreementStage.PENDING_SIGNATURE;
      await this.createStageHistory(
        agreement.id,
        AgreementStage.DRAFT,
        AgreementStage.PENDING_SIGNATURE,
        signDto.notes || 'Company signed, awaiting client signature',
        userId,
      );
    }

    return this.agreementsRepository.save(agreement);
  }

  async terminate(id: string, terminateDto: TerminateAgreementDto, userId: string): Promise<Agreement> {
    const agreement = await this.findOne(id);

    if (![AgreementStage.ACTIVE, AgreementStage.SIGNED].includes(agreement.stage)) {
      throw new BadRequestException('Only active or signed agreements can be terminated');
    }

    const oldStage = agreement.stage;
    agreement.stage = AgreementStage.TERMINATED;
    agreement.terminationDate = terminateDto.terminationDate || new Date();
    agreement.terminationReason = terminateDto.reason;
    agreement.terminatedById = userId;
    agreement.isActive = false;

    const savedAgreement = await this.agreementsRepository.save(agreement);

    await this.createStageHistory(
      agreement.id,
      oldStage,
      AgreementStage.TERMINATED,
      terminateDto.notes || terminateDto.reason,
      userId,
    );

    return savedAgreement;
  }

  async cancel(id: string, reason: string, userId: string): Promise<Agreement> {
    const agreement = await this.findOne(id);

    if ([AgreementStage.ACTIVE, AgreementStage.SIGNED].includes(agreement.stage)) {
      throw new BadRequestException('Cannot cancel active or signed agreements. Use terminate instead.');
    }

    const oldStage = agreement.stage;
    agreement.stage = AgreementStage.CANCELLED;
    agreement.isActive = false;

    const savedAgreement = await this.agreementsRepository.save(agreement);

    await this.createStageHistory(
      agreement.id,
      oldStage,
      AgreementStage.CANCELLED,
      reason,
      userId,
    );

    return savedAgreement;
  }

  async checkExpiredAgreements(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiredAgreements = await this.agreementsRepository
      .createQueryBuilder('agreement')
      .where('agreement.stage = :stage', { stage: AgreementStage.ACTIVE })
      .andWhere('agreement.endDate < :today', { today })
      .getMany();

    for (const agreement of expiredAgreements) {
      agreement.stage = AgreementStage.EXPIRED;
      agreement.isActive = false;
      await this.agreementsRepository.save(agreement);

      await this.createStageHistory(
        agreement.id,
        AgreementStage.ACTIVE,
        AgreementStage.EXPIRED,
        'Agreement expired automatically',
        null,
      );
    }
  }

  async getStageHistory(agreementId: string): Promise<AgreementStageHistory[]> {
    return this.stageHistoryRepository.find({
      where: { agreementId },
      relations: ['changedBy'],
      order: { changedDate: 'ASC' },
    });
  }

  private async createStageHistory(
    agreementId: string,
    fromStage: AgreementStage,
    toStage: AgreementStage,
    notes: string,
    userId: string | null,
  ): Promise<void> {
    const history = this.stageHistoryRepository.create({
      agreementId,
      fromStage,
      toStage,
      notes,
      changedById: userId || undefined,
    });

    await this.stageHistoryRepository.save(history);
  }

  private validateStageTransition(from: AgreementStage, to: AgreementStage): void {
    const validTransitions: Record<AgreementStage, AgreementStage[]> = {
      [AgreementStage.DRAFT]: [AgreementStage.LEGAL_REVIEW, AgreementStage.CANCELLED],
      [AgreementStage.LEGAL_REVIEW]: [AgreementStage.DELIVERY_REVIEW, AgreementStage.DRAFT, AgreementStage.CANCELLED],
      [AgreementStage.DELIVERY_REVIEW]: [AgreementStage.PROCUREMENT_REVIEW, AgreementStage.LEGAL_REVIEW, AgreementStage.CANCELLED],
      [AgreementStage.PROCUREMENT_REVIEW]: [AgreementStage.FINANCE_REVIEW, AgreementStage.DELIVERY_REVIEW, AgreementStage.CANCELLED],
      [AgreementStage.FINANCE_REVIEW]: [AgreementStage.CLIENT_REVIEW, AgreementStage.PROCUREMENT_REVIEW, AgreementStage.CANCELLED],
      [AgreementStage.CLIENT_REVIEW]: [AgreementStage.CEO_APPROVAL, AgreementStage.FINANCE_REVIEW, AgreementStage.CANCELLED],
      [AgreementStage.CEO_APPROVAL]: [AgreementStage.ULCCS_APPROVAL, AgreementStage.PENDING_SIGNATURE, AgreementStage.CLIENT_REVIEW, AgreementStage.CANCELLED],
      [AgreementStage.ULCCS_APPROVAL]: [AgreementStage.PENDING_SIGNATURE, AgreementStage.CEO_APPROVAL, AgreementStage.CANCELLED],
      [AgreementStage.PENDING_SIGNATURE]: [AgreementStage.SIGNED, AgreementStage.DRAFT, AgreementStage.CANCELLED],
      [AgreementStage.SIGNED]: [AgreementStage.ACTIVE, AgreementStage.TERMINATED],
      [AgreementStage.ACTIVE]: [AgreementStage.EXPIRED, AgreementStage.TERMINATED],
      [AgreementStage.EXPIRED]: [AgreementStage.ACTIVE], // Allow reactivation
      [AgreementStage.TERMINATED]: [], // Terminal state
      [AgreementStage.CANCELLED]: [], // Terminal state
    };

    if (!validTransitions[from]?.includes(to)) {
      throw new BadRequestException(`Invalid stage transition from ${from} to ${to}`);
    }
  }

  async remove(id: string): Promise<void> {
    const agreement = await this.findOne(id);

    // Only allow deletion of Draft or Cancelled agreements
    if (![AgreementStage.DRAFT, AgreementStage.CANCELLED].includes(agreement.stage)) {
      throw new BadRequestException('Only draft or cancelled agreements can be deleted');
    }

    await this.agreementsRepository.remove(agreement);
  }

  // Module 10: Legal Drafting Methods
  async uploadDraft(
    id: string,
    documentPath: string,
    userId: string,
    comments?: string
  ): Promise<Agreement> {
    const agreement = await this.findOne(id);

    if (agreement.stage !== AgreementStage.DRAFT) {
      throw new BadRequestException('Document can only be uploaded for agreements in Draft stage');
    }

    // Initialize version history if not exists
    const versionHistory = agreement.documentVersionHistory || [];
    const newVersion = agreement.documentVersion + 1;

    // Add current document to version history
    if (agreement.documentPath) {
      versionHistory.push({
        version: agreement.documentVersion,
        path: agreement.documentPath,
        uploadedBy: userId,
        uploadedAt: new Date().toISOString(),
        comments: comments || 'Previous version',
      });
    }

    // Update agreement with new document
    agreement.documentPath = documentPath;
    agreement.documentVersion = newVersion;
    agreement.documentVersionHistory = versionHistory;
    agreement.draftedById = userId;
    agreement.draftedDate = new Date();

    return await this.agreementsRepository.save(agreement);
  }

  async submitForLegalReview(
    id: string,
    userId: string,
    legalNotes?: string
  ): Promise<Agreement> {
    const agreement = await this.findOne(id);

    if (agreement.stage !== AgreementStage.DRAFT) {
      throw new BadRequestException('Only draft agreements can be submitted for legal review');
    }

    if (!agreement.documentPath) {
      throw new BadRequestException('Agreement document must be uploaded before submitting for legal review');
    }

    // Update stage
    agreement.stage = AgreementStage.LEGAL_REVIEW;
    agreement.legalNotes = legalNotes || '';

    // Create stage history
    await this.createStageHistory(
      agreement.id,
      AgreementStage.DRAFT,
      AgreementStage.LEGAL_REVIEW,
      'Submitted for legal review',
      userId,
    );

    return await this.agreementsRepository.save(agreement);
  }

  async updateLegalNotes(
    id: string,
    userId: string,
    legalNotes: string
  ): Promise<Agreement> {
    const agreement = await this.findOne(id);

    if (![AgreementStage.DRAFT, AgreementStage.LEGAL_REVIEW].includes(agreement.stage)) {
      throw new BadRequestException('Legal notes can only be updated in Draft or Legal Review stages');
    }

    agreement.legalNotes = legalNotes;
    return await this.agreementsRepository.save(agreement);
  }

  async getDocumentVersionHistory(id: string): Promise<any> {
    const agreement = await this.findOne(id);

    return {
      currentVersion: agreement.documentVersion,
      currentPath: agreement.documentPath,
      history: agreement.documentVersionHistory || [],
    };
  }

  // Module 11: Review Methods
  async reviewByDelivery(
    id: string,
    userId: string,
    approved: boolean,
    comments?: string
  ): Promise<Agreement> {
    const agreement = await this.findOne(id);

    if (agreement.stage !== AgreementStage.DELIVERY_REVIEW) {
      throw new BadRequestException('Agreement must be in Delivery Review stage');
    }

    agreement.deliveryReviewedById = userId;
    agreement.deliveryReviewedDate = new Date();
    agreement.deliveryComments = comments || '';
    agreement.deliveryApproved = approved;

    if (approved) {
      // Move to next stage
      agreement.stage = AgreementStage.PROCUREMENT_REVIEW;
      await this.createStageHistory(
        agreement.id,
        AgreementStage.DELIVERY_REVIEW,
        AgreementStage.PROCUREMENT_REVIEW,
        `Delivery review approved: ${comments || 'No comments'}`,
        userId,
      );
    } else {
      // Send back to Legal Review
      agreement.stage = AgreementStage.LEGAL_REVIEW;
      await this.createStageHistory(
        agreement.id,
        AgreementStage.DELIVERY_REVIEW,
        AgreementStage.LEGAL_REVIEW,
        `Delivery review rejected: ${comments || 'No comments'}`,
        userId,
      );
    }

    return await this.agreementsRepository.save(agreement);
  }

  async reviewByProcurement(
    id: string,
    userId: string,
    approved: boolean,
    comments?: string
  ): Promise<Agreement> {
    const agreement = await this.findOne(id);

    if (agreement.stage !== AgreementStage.PROCUREMENT_REVIEW) {
      throw new BadRequestException('Agreement must be in Procurement Review stage');
    }

    agreement.procurementReviewedById = userId;
    agreement.procurementReviewedDate = new Date();
    agreement.procurementComments = comments || '';
    agreement.procurementApproved = approved;

    if (approved) {
      // Move to next stage
      agreement.stage = AgreementStage.FINANCE_REVIEW;
      await this.createStageHistory(
        agreement.id,
        AgreementStage.PROCUREMENT_REVIEW,
        AgreementStage.FINANCE_REVIEW,
        `Procurement review approved: ${comments || 'No comments'}`,
        userId,
      );
    } else {
      // Send back to Delivery Review
      agreement.stage = AgreementStage.DELIVERY_REVIEW;
      await this.createStageHistory(
        agreement.id,
        AgreementStage.PROCUREMENT_REVIEW,
        AgreementStage.DELIVERY_REVIEW,
        `Procurement review rejected: ${comments || 'No comments'}`,
        userId,
      );
    }

    return await this.agreementsRepository.save(agreement);
  }

  async reviewByFinance(
    id: string,
    userId: string,
    approved: boolean,
    comments?: string
  ): Promise<Agreement> {
    const agreement = await this.findOne(id);

    if (agreement.stage !== AgreementStage.FINANCE_REVIEW) {
      throw new BadRequestException('Agreement must be in Finance Review stage');
    }

    agreement.financeReviewedById = userId;
    agreement.financeReviewedDate = new Date();
    agreement.financeComments = comments || '';
    agreement.financeApproved = approved;

    if (approved) {
      // Move to Client Review
      agreement.stage = AgreementStage.CLIENT_REVIEW;
      await this.createStageHistory(
        agreement.id,
        AgreementStage.FINANCE_REVIEW,
        AgreementStage.CLIENT_REVIEW,
        `Finance review approved: ${comments || 'No comments'}`,
        userId,
      );
    } else {
      // Send back to Procurement Review
      agreement.stage = AgreementStage.PROCUREMENT_REVIEW;
      await this.createStageHistory(
        agreement.id,
        AgreementStage.FINANCE_REVIEW,
        AgreementStage.PROCUREMENT_REVIEW,
        `Finance review rejected: ${comments || 'No comments'}`,
        userId,
      );
    }

    return await this.agreementsRepository.save(agreement);
  }

  async getReviewStatus(id: string): Promise<any> {
    const agreement = await this.findOne(id);

    return {
      agreementId: agreement.id,
      currentStage: agreement.stage,
      reviews: {
        delivery: {
          reviewed: agreement.deliveryReviewedById ? true : false,
          reviewedBy: agreement.deliveryReviewedBy,
          reviewedDate: agreement.deliveryReviewedDate,
          approved: agreement.deliveryApproved,
          comments: agreement.deliveryComments,
        },
        procurement: {
          reviewed: agreement.procurementReviewedById ? true : false,
          reviewedBy: agreement.procurementReviewedBy,
          reviewedDate: agreement.procurementReviewedDate,
          approved: agreement.procurementApproved,
          comments: agreement.procurementComments,
        },
        finance: {
          reviewed: agreement.financeReviewedById ? true : false,
          reviewedBy: agreement.financeReviewedBy,
          reviewedDate: agreement.financeReviewedDate,
          approved: agreement.financeApproved,
          comments: agreement.financeComments,
        },
      },
    };
  }

  // Critical Gap: Client Review Methods
  async reviewByClient(
    id: string,
    clientReviewedBy: string,
    approved: boolean,
    comments?: string
  ): Promise<Agreement> {
    const agreement = await this.findOne(id);

    if (agreement.stage !== AgreementStage.CLIENT_REVIEW) {
      throw new BadRequestException('Agreement must be in Client Review stage');
    }

    agreement.clientReviewedBy = clientReviewedBy;
    agreement.clientReviewedDate = new Date();
    agreement.clientComments = comments || '';
    agreement.clientApproved = approved;

    if (approved) {
      // Move to CEO Approval
      agreement.stage = AgreementStage.CEO_APPROVAL;
      await this.createStageHistory(
        agreement.id,
        AgreementStage.CLIENT_REVIEW,
        AgreementStage.CEO_APPROVAL,
        `Client approved: ${comments || 'No comments'}`,
        clientReviewedBy,
      );
    } else {
      // Send back to Finance Review
      agreement.stage = AgreementStage.FINANCE_REVIEW;
      await this.createStageHistory(
        agreement.id,
        AgreementStage.CLIENT_REVIEW,
        AgreementStage.FINANCE_REVIEW,
        `Client requested changes: ${comments || 'No comments'}`,
        clientReviewedBy,
      );
    }

    return await this.agreementsRepository.save(agreement);
  }

  async allocatePM(
    id: string,
    pmAllocatedId: string,
    projectId?: string
  ): Promise<Agreement> {
    const agreement = await this.findOne(id);

    agreement.pmAllocatedId = pmAllocatedId;
    agreement.pmAllocatedDate = new Date();
    
    if (projectId) {
      agreement.projectId = projectId;
    }

    return await this.agreementsRepository.save(agreement);
  }

  async updateProjectId(
    id: string,
    projectId: string
  ): Promise<Agreement> {
    const agreement = await this.findOne(id);
    agreement.projectId = projectId;
    return await this.agreementsRepository.save(agreement);
  }

  // Module 12: CEO & ULCCS Approval Methods
  async approveByCEO(
    id: string,
    userId: string,
    approved: boolean,
    comments?: string
  ): Promise<Agreement> {
    const agreement = await this.findOne(id);

    if (agreement.stage !== AgreementStage.CEO_APPROVAL) {
      throw new BadRequestException('Agreement must be in CEO Approval stage');
    }

    agreement.ceoApprovedById = userId;
    agreement.ceoApprovedDate = new Date();
    agreement.ceoComments = comments || '';
    agreement.ceoApproved = approved;

    if (approved) {
      // Check if ULCCS approval required
      const lead = await this.leadsRepository.findOne({ where: { id: agreement.leadId } });
      
      if (lead?.isULCCSProject) {
        // Require ULCCS approval
        agreement.requiresULCCSApproval = true;
        agreement.stage = AgreementStage.ULCCS_APPROVAL;
        await this.createStageHistory(
          agreement.id,
          AgreementStage.CEO_APPROVAL,
          AgreementStage.ULCCS_APPROVAL,
          `CEO approved, requires ULCCS approval: ${comments || 'No comments'}`,
          userId,
        );
      } else {
        // Skip ULCCS, move to Pending Signature
        agreement.stage = AgreementStage.PENDING_SIGNATURE;
        await this.createStageHistory(
          agreement.id,
          AgreementStage.CEO_APPROVAL,
          AgreementStage.PENDING_SIGNATURE,
          `CEO approved, ready for signature: ${comments || 'No comments'}`,
          userId,
        );
      }
    } else {
      // Send back to Finance Review
      agreement.stage = AgreementStage.FINANCE_REVIEW;
      await this.createStageHistory(
        agreement.id,
        AgreementStage.CEO_APPROVAL,
        AgreementStage.FINANCE_REVIEW,
        `CEO rejected: ${comments || 'No comments'}`,
        userId,
      );
    }

    return await this.agreementsRepository.save(agreement);
  }

  async approveByULCCS(
    id: string,
    userId: string,
    approved: boolean,
    comments?: string
  ): Promise<Agreement> {
    const agreement = await this.findOne(id);

    if (agreement.stage !== AgreementStage.ULCCS_APPROVAL) {
      throw new BadRequestException('Agreement must be in ULCCS Approval stage');
    }

    if (!agreement.requiresULCCSApproval) {
      throw new BadRequestException('This agreement does not require ULCCS approval');
    }

    agreement.ulccsApprovedById = userId;
    agreement.ulccsApprovedDate = new Date();
    agreement.ulccsComments = comments || '';
    agreement.ulccsApproved = approved;

    if (approved) {
      // Move to Pending Signature
      agreement.stage = AgreementStage.PENDING_SIGNATURE;
      await this.createStageHistory(
        agreement.id,
        AgreementStage.ULCCS_APPROVAL,
        AgreementStage.PENDING_SIGNATURE,
        `ULCCS approved, ready for signature: ${comments || 'No comments'}`,
        userId,
      );
    } else {
      // Send back to CEO Approval
      agreement.stage = AgreementStage.CEO_APPROVAL;
      await this.createStageHistory(
        agreement.id,
        AgreementStage.ULCCS_APPROVAL,
        AgreementStage.CEO_APPROVAL,
        `ULCCS rejected: ${comments || 'No comments'}`,
        userId,
      );
    }

    return await this.agreementsRepository.save(agreement);
  }

  async getFinalApprovalStatus(id: string): Promise<any> {
    const agreement = await this.findOne(id);
    const lead = await this.leadsRepository.findOne({ where: { id: agreement.leadId } });

    return {
      agreementId: agreement.id,
      currentStage: agreement.stage,
      isULCCSProject: lead?.isULCCSProject || false,
      requiresULCCSApproval: agreement.requiresULCCSApproval,
      ceo: {
        reviewed: agreement.ceoApprovedById ? true : false,
        reviewedBy: agreement.ceoApprovedBy,
        reviewedDate: agreement.ceoApprovedDate,
        approved: agreement.ceoApproved,
        comments: agreement.ceoComments,
      },
      ulccs: {
        required: agreement.requiresULCCSApproval,
        reviewed: agreement.ulccsApprovedById ? true : false,
        reviewedBy: agreement.ulccsApprovedBy,
        reviewedDate: agreement.ulccsApprovedDate,
        approved: agreement.ulccsApproved,
        comments: agreement.ulccsComments,
      },
    };
  }

  async getAgreementMetrics(id: string): Promise<any> {
    const agreement = await this.findOne(id);
    const stageHistory = agreement.stageHistory || [];

    // Calculate time spent in each stage
    const stageMetrics = {};
    for (let i = 0; i < stageHistory.length - 1; i++) {
      const current = stageHistory[i];
      const next = stageHistory[i + 1];
      const stage = current.toStage;
      const timeSpent = new Date(next.changedDate).getTime() - new Date(current.changedDate).getTime();
      const days = Math.floor(timeSpent / (1000 * 60 * 60 * 24));
      
      if (!stageMetrics[stage]) {
        stageMetrics[stage] = 0;
      }
      stageMetrics[stage] += days;
    }

    // Calculate total cycle time
    const firstEntry = stageHistory[0];
    const lastEntry = stageHistory[stageHistory.length - 1];
    const totalCycleTime = firstEntry && lastEntry 
      ? Math.floor((new Date(lastEntry.changedDate).getTime() - new Date(firstEntry.changedDate).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      agreementId: agreement.id,
      agreementNumber: agreement.agreementNumber,
      currentStage: agreement.stage,
      totalCycleTime,
      stageMetrics,
      totalStageTransitions: stageHistory.length,
      contractValue: agreement.contractValue,
      createdDate: agreement.createdDate,
      isSigned: agreement.stage === AgreementStage.SIGNED || agreement.stage === AgreementStage.ACTIVE,
    };
  }

  // Send agreement for approval workflow
  async sendForApproval(id: string, userId: string): Promise<Agreement> {
    const agreement = await this.findOne(id);

    // Validate agreement is in draft stage
    if (agreement.stage !== AgreementStage.DRAFT) {
      throw new BadRequestException('Only draft agreements can be sent for approval');
    }

    // Check if approval already in progress
    if (agreement.approvalInProgress) {
      throw new BadRequestException('Approval workflow already in progress');
    }

    // Clean up any existing approvals for this agreement (in case of previous failed attempts)
    await this.approvalsService.deleteByEntity(ApprovalContext.AGREEMENT, id);

    // Check if custom approval flow is defined
    if (!agreement.hasCustomApprovalFlow) {
      throw new BadRequestException('No custom approval flow defined. Please configure approval flow first.');
    }

    // Fetch custom approval configs
    const approvalConfigs = await this.agreementApprovalConfigsService.findByAgreement(id);
    
    if (!approvalConfigs || approvalConfigs.length === 0) {
      throw new BadRequestException('No approval configurations found');
    }

    // Sort by sequence order
    const sortedConfigs = approvalConfigs.sort((a, b) => a.sequenceOrder - b.sequenceOrder);

    // Clean up any existing approvals for this agreement before creating new ones
    await this.approvalsService.deleteByEntity(ApprovalContext.AGREEMENT, id);

    // Map approval configs to approval stages
    const approvalStages = sortedConfigs.map((config, index) => {
      let approverRole: string;
      
      if (config.approvalType === ApprovalType.SPECIFIC_USER && config.approver) {
        approverRole = config.approver.role || UserRole.ACCOUNT_MANAGER;
      } else if (config.approverRole) {
        approverRole = config.approverRole;
      } else {
        approverRole = UserRole.ACCOUNT_MANAGER; // Default fallback
      }

      const stage: any = {
        stage: approverRole,
        approverRole: approverRole,
        isMandatory: config.isMandatory,
        sequenceOrder: config.sequenceOrder,
      };

      if (config.approvalType === ApprovalType.SPECIFIC_USER && config.approverId) {
        stage.approverId = config.approverId;
      }

      return stage;
    });

    // Create approval workflow
    await this.approvalsService.createApprovalWorkflow({
      context: ApprovalContext.AGREEMENT,
      entityId: agreement.id,
      leadId: agreement.leadId,
      stages: approvalStages,
    });

    // Update agreement status - keep stage as DRAFT during custom approval
    agreement.approvalInProgress = true;
    await this.agreementsRepository.save(agreement);

    // Create stage history
    const firstApprover = approvalStages[0];
    await this.createStageHistory(
      agreement.id,
      AgreementStage.DRAFT,
      AgreementStage.DRAFT,
      `Submitted for approval - pending ${firstApprover.approverRole}`,
      userId,
    );

    return agreement;
  }

  // Check approval status
  async checkApprovalStatus(id: string): Promise<{ inProgress: boolean; allApproved: boolean; pendingApprovals: any[] }> {
    const agreement = await this.findOne(id);
    
    if (!agreement.approvalInProgress) {
      return {
        inProgress: false,
        allApproved: false,
        pendingApprovals: [],
      };
    }

    const approvals = await this.approvalsService.findByEntity(ApprovalContext.AGREEMENT, id);
    const pendingApprovals = approvals.filter(a => a.status === 'Pending');
    const allApproved = approvals.length > 0 && pendingApprovals.length === 0;

    return {
      inProgress: agreement.approvalInProgress,
      allApproved,
      pendingApprovals: pendingApprovals.map(a => ({
        id: a.id,
        stage: a.stage,
        approverRole: a.approverRole,
        approverName: a.approver?.name || a.approverRole,
        sequenceOrder: a.sequenceOrder,
      })),
    };
  }

  // Return agreement to sales team
  async returnToCreator(id: string, userId: string, reason: string): Promise<Agreement> {
    const agreement = await this.findOne(id);

    if (!agreement.approvalInProgress) {
      throw new BadRequestException('No approval workflow in progress');
    }

    // Get all approvals for this agreement
    const approvals = await this.approvalsService.findByEntity(ApprovalContext.AGREEMENT, id);

    // Find the approval being returned
    const currentApproval = approvals.find(a => a.status === ApprovalStatus.PENDING);
    if (currentApproval) {
      await this.approvalsService.returnToCreator(currentApproval.id, userId, reason);
    }

    // Skip all subsequent pending approvals
    for (const approval of approvals) {
      if (approval.status === ApprovalStatus.PENDING && approval.id !== currentApproval?.id) {
        await this.approvalsService.skipApproval(approval.id, userId, `Skipped due to return: ${reason}`);
      }
    }

    // Reset agreement to draft
    agreement.approvalInProgress = false;
    agreement.stage = AgreementStage.DRAFT;
    await this.agreementsRepository.save(agreement);

    // Create stage history
    await this.createStageHistory(
      agreement.id,
      agreement.stage,
      AgreementStage.DRAFT,
      `Returned to ${agreement.createdBy?.role || 'creator'}: ${reason}`,
      userId,
    );

    return agreement;
  }

  // Update agreement stage after approval action
  async updateStageAfterApproval(id: string, userId: string): Promise<Agreement> {
    const agreement = await this.findOne(id);

    if (!agreement.approvalInProgress) {
      return agreement;
    }

    const approvals = await this.approvalsService.findByEntity(ApprovalContext.AGREEMENT, id);
    
    // Check if any approval was rejected
    const rejectedApproval = approvals.find(a => a.status === ApprovalStatus.REJECTED);
    if (rejectedApproval) {
      // If rejected, return to draft
      const oldStage = agreement.stage;
      agreement.stage = AgreementStage.DRAFT;
      agreement.approvalInProgress = false;
      await this.agreementsRepository.save(agreement);
      
      await this.createStageHistory(
        agreement.id,
        oldStage,
        AgreementStage.DRAFT,
        `Approval rejected by ${rejectedApproval.approver?.name || rejectedApproval.approverRole}`,
        userId,
      );
      
      return agreement;
    }

    // Check if all mandatory approvals are completed
    const allApproved = await this.approvalsService.areAllApprovalsCompleted(ApprovalContext.AGREEMENT, id);
    
    if (allApproved) {
      // All approvals completed - move to Pending Signature
      const oldStage = agreement.stage;
      agreement.stage = AgreementStage.PENDING_SIGNATURE;
      agreement.approvalInProgress = false;
      await this.agreementsRepository.save(agreement);
      
      await this.createStageHistory(
        agreement.id,
        oldStage,
        AgreementStage.PENDING_SIGNATURE,
        'All approvals completed',
        userId,
      );
    }
    // Note: For custom approval workflows, we keep the stage as DRAFT during approvals
    // The approval progress is tracked via the approvalInProgress flag and Approval entities

    return agreement;
  }
}

