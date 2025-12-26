import { IsString, IsEnum, IsOptional, IsUUID, IsBoolean, IsDateString } from 'class-validator';
import { ActivityType } from '../../../entities';

export class CreateActivityDto {
  @IsUUID()
  leadId: string;

  @IsEnum(ActivityType)
  type: ActivityType;

  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  scheduledDate?: string;

  @IsUUID()
  @IsOptional()
  createdById?: string;

  @IsUUID()
  @IsOptional()
  assignedToId?: string;
}

export class UpdateActivityDto {
  @IsEnum(ActivityType)
  @IsOptional()
  type?: ActivityType;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  scheduledDate?: string;

  @IsBoolean()
  @IsOptional()
  isCompleted?: boolean;

  @IsDateString()
  @IsOptional()
  completedDate?: string;
}
