import { Injectable, NotFoundException, BadRequestException, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proposal, ProposalItem, ProposalStatus, UserRole, ApprovalContext } from '../../entities';
import { CreateProposalDto, UpdateProposalDto } from './dto/proposal.dto';
import { LeadsService } from '../leads/leads.service';
import { UsersService } from '../users/users.service';
import { PdfService } from '../../services/pdf.service';
import { ApprovalsService } from '../approvals/approvals.service';

@Injectable()
export class ProposalsService {
  constructor(
    @InjectRepository(Proposal)
    private proposalsRepository: Repository<Proposal>,
    @InjectRepository(ProposalItem)
    private proposalItemsRepository: Repository<ProposalItem>,
    @Inject(forwardRef(() => LeadsService))
    private leadsService: LeadsService,
    private usersService: UsersService,
    private pdfService: PdfService,
    private approvalsService: ApprovalsService,
  ) {}

  async create(createProposalDto: CreateProposalDto, userId: string): Promise<Proposal> {
    const { items, ...proposalData } = createProposalDto;

    // Generate proposal number
    const count = await this.proposalsRepository.count();
    const proposalNumber = `PROP-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const taxAmount = subtotal * ((proposalData.taxPercent || 0) / 100);
    const discountAmount = subtotal * ((proposalData.discountPercent || 0) / 100);
    const totalAmount = subtotal + taxAmount - discountAmount;

    const proposal = this.proposalsRepository.create({
      ...proposalData,
      proposalNumber,
      subtotal,
      taxAmount,
      discountAmount,
      totalAmount,
      taxPercent: proposalData.taxPercent || 0,
      discountPercent: proposalData.discountPercent || 0,
      createdById: userId,
    });

    const savedProposal = await this.proposalsRepository.save(proposal);

    // Save items
    const proposalItems = items.map((item, index) => 
      this.proposalItemsRepository.create({
        ...item,
        proposalId: savedProposal.id,
        totalPrice: item.quantity * item.unitPrice,
        sortOrder: index + 1,
      })
    );

    await this.proposalItemsRepository.save(proposalItems);

    // Update lead's last action date
    // Update lead's last action date
    await this.leadsService.update(createProposalDto.leadId, {});

    return this.findOne(savedProposal.id);
  }

  async findAll(): Promise<{ data: Proposal[]; total: number; page: number; limit: number }> {
    const [proposals, total] = await this.proposalsRepository.findAndCount({
      relations: ['items', 'lead', 'createdBy'],
      order: { createdDate: 'DESC' },
    });

    return {
      data: proposals,
      total,
      page: 1,
      limit: total,
    };
  }

  async findByLead(leadId: string): Promise<Proposal[]> {
    return await this.proposalsRepository.find({
      where: { leadId },
      relations: ['items', 'createdBy'],
      order: { createdDate: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Proposal> {
    const proposal = await this.proposalsRepository.findOne({
      where: { id },
      relations: ['items', 'lead', 'createdBy'],
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal with ID ${id} not found`);
    }

    return proposal;
  }

  async update(id: string, updateProposalDto: UpdateProposalDto): Promise<Proposal> {
    const proposal = await this.findOne(id);
    const { items, ...proposalData } = updateProposalDto;

    // Recalculate if items or percentages changed
    if (items || proposalData.taxPercent !== undefined || proposalData.discountPercent !== undefined) {
      const currentItems = items || proposal.items;
      const subtotal = currentItems.reduce((sum, item) => {
        const qty = item.quantity;
        const price = item.unitPrice;
        return sum + (qty * price);
      }, 0);

      const taxPercent = proposalData.taxPercent ?? proposal.taxPercent;
      const discountPercent = proposalData.discountPercent ?? proposal.discountPercent;
      const taxAmount = subtotal * (taxPercent / 100);
      const discountAmount = subtotal * (discountPercent / 100);
      const totalAmount = subtotal + taxAmount - discountAmount;

      Object.assign(proposalData, {
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount,
      });
    }

    // Update proposal
    const updatedProposal = this.proposalsRepository.merge(proposal, proposalData);
    await this.proposalsRepository.save(updatedProposal);

    // Update items if provided
    if (items) {
      await this.proposalItemsRepository.delete({ proposalId: id });
      const proposalItems = items.map((item, index) =>
        this.proposalItemsRepository.create({
          ...item,
          proposalId: id,
          totalPrice: item.quantity * item.unitPrice,
          sortOrder: index + 1,
        })
      );
      await this.proposalItemsRepository.save(proposalItems);
    }

    // Update lead's last action date
    // Update lead's last action date
    await this.leadsService.update(proposal.leadId, {});

    return this.findOne(id);
  }

  async markAsSent(id: string): Promise<Proposal> {
    const proposal = await this.findOne(id);
    
    proposal.status = ProposalStatus.SENT;
    proposal.sentDate = new Date();

    return await this.proposalsRepository.save(proposal);
  }

  async remove(id: string): Promise<void> {
    const proposal = await this.findOne(id);
    await this.proposalsRepository.remove(proposal);
  }

  async createNewVersion(id: string): Promise<Proposal> {
    const originalProposal = await this.findOne(id);
    
    // Create new proposal data based on original
    const newProposalData = {
      leadId: originalProposal.leadId,
      title: `${originalProposal.title} (v${originalProposal.version + 1})`,
      description: originalProposal.description,
      taxPercent: originalProposal.taxPercent,
      discountPercent: originalProposal.discountPercent,
      validUntil: originalProposal.validUntil,
      termsAndConditions: originalProposal.termsAndConditions,
      version: originalProposal.version + 1,
      status: ProposalStatus.DRAFT,
    };

    // Create the new version
    const newProposal = this.proposalsRepository.create(newProposalData);
    const savedProposal = await this.proposalsRepository.save(newProposal);

    // Copy all items from original proposal
    const originalItems = await this.proposalItemsRepository.find({
      where: { proposalId: originalProposal.id }
    });

    const newItems = originalItems.map(item => 
      this.proposalItemsRepository.create({
        proposalId: savedProposal.id,
        itemName: item.itemName,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        sortOrder: item.sortOrder,
      })
    );

    await this.proposalItemsRepository.save(newItems);

    // Recalculate totals for the new version
    const subtotal = newItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const taxAmount = subtotal * ((newProposalData.taxPercent || 0) / 100);
    const discountAmount = subtotal * ((newProposalData.discountPercent || 0) / 100);
    const totalAmount = subtotal + taxAmount - discountAmount;

    await this.proposalsRepository.update(savedProposal.id, {
      subtotal,
      taxAmount,
      discountAmount,
      totalAmount,
    });

    // Update lead's last action date
    await this.leadsService.update(originalProposal.leadId, {});

    return this.findOne(savedProposal.id);
  }

  async generatePdf(id: string, userId: string): Promise<Buffer> {
    const proposal = await this.findOne(id);
    
    // Check permissions
    if (!(await this.canAccessProposal(proposal, userId))) {
      throw new Error('Access denied: You do not have permission to access this proposal');
    }
    
    return await this.pdfService.generateProposalPdf(proposal);
  }

  private async canAccessProposal(proposal: Proposal, userId: string): Promise<boolean> {
    // If user created the proposal, they can access it
    if (proposal.createdById === userId) {
      return true;
    }
    
    // If user is assigned to the lead, they can access proposals for that lead
    if (proposal.lead?.assignedToId === userId) {
      return true;
    }
    
    // Check user role for broader access
    const user = await this.usersService.findOne(userId);
    if (user.role === UserRole.ADMIN || user.role === UserRole.SALES_MANAGER) {
      return true;
    }
    
    return false;
  }

  // Phase 2: Multi-level approval workflow
  async sendForApproval(id: string, userId: string): Promise<Proposal> {
    const proposal = await this.findOne(id);

    if (proposal.status !== ProposalStatus.DRAFT) {
      throw new BadRequestException('Only draft proposals can be sent for approval');
    }

    // Define approval workflow based on proposal value
    const approvalStages: Array<{ stage: any; approverRole: string; isMandatory: boolean; sequenceOrder: number }> = [];
    const value = proposal.totalAmount;

    // Account Manager approval (always required)
    approvalStages.push({ stage: 'Account Manager', approverRole: UserRole.ACCOUNT_MANAGER, isMandatory: true, sequenceOrder: 1 });

    // Finance approval for all proposals
    approvalStages.push({ stage: 'Finance', approverRole: UserRole.FINANCE, isMandatory: true, sequenceOrder: 2 });

    // Procurement approval for proposals > 50000
    if (value > 50000) {
      approvalStages.push({ stage: 'Procurement', approverRole: UserRole.PROCUREMENT, isMandatory: true, sequenceOrder: 3 });
    }

    // Delivery Manager approval for proposals > 100000
    if (value > 100000) {
      approvalStages.push({ stage: 'Delivery Manager', approverRole: UserRole.DELIVERY_MANAGER, isMandatory: true, sequenceOrder: 4 });
    }

    // CEO approval for proposals > 500000
    if (value > 500000) {
      approvalStages.push({ stage: 'CEO', approverRole: UserRole.CEO, isMandatory: true, sequenceOrder: 5 });
    }

    // ULCCS approval for proposals > 1000000
    if (value > 1000000) {
      approvalStages.push({ stage: 'ULCCS', approverRole: UserRole.ULCCS_APPROVER, isMandatory: true, sequenceOrder: 6 });
    }

    // Create approval workflow
    await this.approvalsService.createApprovalWorkflow({
      context: ApprovalContext.PROPOSAL,
      entityId: proposal.id,
      leadId: proposal.leadId,
      stages: approvalStages,
    });

    // Update proposal status
    proposal.status = ProposalStatus.SENT;
    proposal.sentDate = new Date();
    await this.proposalsRepository.save(proposal);

    return proposal;
  }

  async checkApprovalStatus(id: string): Promise<{ allApproved: boolean; pendingStage?: string }> {
    const allApproved = await this.approvalsService.areAllApprovalsCompleted(
      ApprovalContext.PROPOSAL,
      id
    );

    if (allApproved) {
      // Move proposal to Accepted status
      const proposal = await this.findOne(id);
      proposal.status = ProposalStatus.ACCEPTED;
      await this.proposalsRepository.save(proposal);
    }

    const pendingApproval = await this.approvalsService.getNextPendingApproval(
      ApprovalContext.PROPOSAL,
      id
    );

    return {
      allApproved,
      pendingStage: pendingApproval?.stage,
    };
  }
}
