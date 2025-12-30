import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { WorkOrderStatus } from '../../../entities';
import { Transform } from 'class-transformer';

export class CreateWorkOrderDto {
  @IsUUID()
  leadId: string;

  @IsUUID()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  negotiationId?: string;

  @IsString()
  title: string;

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
  @Transform(({ value }) => (value === '' ? undefined : value))
  assignedToOperationsId?: string;

  @IsUUID()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  assignedToAccountsId?: string;

  @IsUUID()
  @IsOptional()
  createdById?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateWorkOrderDto {
  @IsUUID()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  negotiationId?: string;

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
  @Transform(({ value }) => (value === '' ? undefined : value))
  assignedToOperationsId?: string;

  @IsUUID()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  assignedToAccountsId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
