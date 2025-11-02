import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkOrder } from '../../entities';
import { CreateWorkOrderDto, UpdateWorkOrderDto } from './dto/work-order.dto';
import { LeadsService } from '../leads/leads.service';

@Injectable()
export class WorkOrdersService {
  constructor(
    @InjectRepository(WorkOrder)
    private workOrdersRepository: Repository<WorkOrder>,
    private leadsService: LeadsService,
  ) {}

  async create(createWorkOrderDto: CreateWorkOrderDto): Promise<WorkOrder> {
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

    return this.findOne(savedWorkOrder.id);
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
