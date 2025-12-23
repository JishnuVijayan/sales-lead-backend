import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkOrder, AgreementType, PaymentTerms } from '../../entities';
import { CreateWorkOrderDto, UpdateWorkOrderDto } from './dto/work-order.dto';
import { LeadsService } from '../leads/leads.service';
import { AgreementsService } from '../agreements/agreements.service';
import { ComprehensiveNotificationsService } from '../notifications/comprehensive-notifications.service';

@Injectable()
export class WorkOrdersService {
  constructor(
    @InjectRepository(WorkOrder)
    private workOrdersRepository: Repository<WorkOrder>,
    private leadsService: LeadsService,
    private agreementsService: AgreementsService,
    private notificationsService: ComprehensiveNotificationsService,
  ) {}

  async create(createWorkOrderDto: CreateWorkOrderDto): Promise<WorkOrder> {
    // Check if a work order already exists for this lead
    const existingWorkOrder = await this.workOrdersRepository.findOne({
      where: { leadId: createWorkOrderDto.leadId },
    });

    if (existingWorkOrder) {
      throw new Error('A work order already exists for this lead');
    }

    // Generate work order number
    const count = await this.workOrdersRepository.count();
    const workOrderNumber = `WO-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const workOrder = this.workOrdersRepository.create({
      ...createWorkOrderDto,
      workOrderNumber,
    });

    const savedWorkOrder = await this.workOrdersRepository.save(workOrder);

    // Mark lead as converted
    await this.leadsService.convertToWon(createWorkOrderDto.leadId);
    
    // Send lead won notification
    try {
      const lead = await this.leadsService.findOne(createWorkOrderDto.leadId);
      await this.notificationsService.notifyLeadWon(
        createWorkOrderDto.leadId,
        lead.organization || lead.name,
        savedWorkOrder.id,
      );
    } catch (error) {
      console.error('Failed to send notification:', error);
    }

    // Phase 2: Auto-create Agreement when Work Order is created
    if (createWorkOrderDto.createdById) {
      await this.createAgreementFromWorkOrder(savedWorkOrder, createWorkOrderDto.createdById);
    }

    return this.findOne(savedWorkOrder.id);
  }

  // Phase 2: Auto-create Agreement
  private async createAgreementFromWorkOrder(workOrder: WorkOrder, userId: string): Promise<void> {
    try {
      await this.agreementsService.create({
        leadId: workOrder.leadId,
        title: `Agreement for ${workOrder.title}`,
        description: workOrder.description,
        agreementType: AgreementType.CONTRACT,
        contractValue: workOrder.orderValue,
        paymentTerms: PaymentTerms.NET_30,
        scopeOfWork: workOrder.description,
        assignedToId: workOrder.assignedToOperationsId,
      }, userId);
    } catch (error) {
      // Log error but don't fail work order creation
      console.error('Failed to auto-create agreement:', error);
    }
  }

  async findAll(): Promise<{ data: WorkOrder[]; total: number; page: number; limit: number }> {
    const [workOrders, total] = await this.workOrdersRepository.findAndCount({
      relations: ['lead', 'assignedToOperations', 'assignedToAccounts', 'createdBy'],
      order: { createdDate: 'DESC' },
    });

    return {
      data: workOrders,
      total,
      page: 1,
      limit: total,
    };
  }

  async findByLead(leadId: string): Promise<{ data: WorkOrder[]; total: number; page: number; limit: number }> {
    const [workOrders, total] = await this.workOrdersRepository.findAndCount({
      where: { leadId },
      relations: ['assignedToOperations', 'assignedToAccounts', 'createdBy'],
      order: { createdDate: 'DESC' },
    });

    return {
      data: workOrders,
      total,
      page: 1,
      limit: total,
    };
  }

  async findOne(id: string): Promise<WorkOrder> {
    const workOrder = await this.workOrdersRepository.findOne({
      where: { id },
      relations: ['lead', 'assignedToOperations', 'assignedToAccounts', 'createdBy'],
    });

    if (!workOrder) {
      throw new NotFoundException(`Work Order with ID ${id} not found`);
    }

    return workOrder;
  }

  async update(id: string, updateWorkOrderDto: UpdateWorkOrderDto): Promise<WorkOrder> {
    const workOrder = await this.findOne(id);

    const updatedWorkOrder = this.workOrdersRepository.merge(workOrder, updateWorkOrderDto);
    await this.workOrdersRepository.save(updatedWorkOrder);

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const workOrder = await this.findOne(id);
    await this.workOrdersRepository.remove(workOrder);
  }
}
