import { IsString, IsEnum, IsOptional, IsUUID, IsNumber, IsDateString } from 'class-validator';
import { WorkOrderStatus } from '../../../entities';

export class CreateWorkOrderDto {
  @IsUUID()
  leadId: string;

  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  orderValue?: number;

  @IsDateString()
  @IsOptional()
  expectedDeliveryDate?: string;

  @IsUUID()
  @IsOptional()
  assignedToOperationsId?: string;

  @IsUUID()
  @IsOptional()
  assignedToAccountsId?: string;

  @IsUUID()
  @IsOptional()
  createdById?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateWorkOrderDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(WorkOrderStatus)
  @IsOptional()
  status?: WorkOrderStatus;

  @IsNumber()
  @IsOptional()
  orderValue?: number;

  @IsDateString()
  @IsOptional()
  expectedDeliveryDate?: string;

  @IsDateString()
  @IsOptional()
  actualDeliveryDate?: string;

  @IsUUID()
  @IsOptional()
  assignedToOperationsId?: string;

  @IsUUID()
  @IsOptional()
  assignedToAccountsId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
