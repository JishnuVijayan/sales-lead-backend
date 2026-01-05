import {
  IsEnum,
  IsString,
  IsUUID,
  IsOptional,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ApprovalStatus,
  ApprovalStage,
  ApprovalContext,
} from '../../../entities/approval.entity';

export class CreateApprovalDto {
  @IsEnum(ApprovalContext)
  context: ApprovalContext;

  @IsUUID()
  entityId: string;

  @IsUUID()
  @IsOptional()
  leadId?: string;

  @IsEnum(ApprovalStage)
  stage: ApprovalStage;

  @IsString()
  approverRole: string;

  @IsUUID()
  @IsOptional()
  approverId?: string;

  @IsBoolean()
  @IsOptional()
  isMandatory?: boolean = true;

  @IsInt()
  sequenceOrder: number;
}

export class UpdateApprovalDto {
  @IsEnum(ApprovalStatus)
  @IsOptional()
  status?: ApprovalStatus;

  @IsString()
  @IsOptional()
  comments?: string;

  @IsUUID()
  @IsOptional()
  approverId?: string;
}

export class RespondToApprovalDto {
  @IsEnum(ApprovalStatus)
  @IsNotEmpty()
  status: ApprovalStatus; // Must be Approved, Rejected, or Returned

  @IsString()
  @IsOptional()
  comments?: string;

  @IsArray()
  @IsOptional()
  attachments?: Array<{
    fileName: string;
    filePath: string;
  }>;
}

export class ApprovalStageDto {
  @IsEnum(ApprovalStage)
  stage: ApprovalStage;

  @IsString()
  approverRole: string;

  @IsUUID()
  @IsOptional()
  approverId?: string;

  @IsBoolean()
  @IsOptional()
  isMandatory?: boolean;

  @IsInt()
  sequenceOrder: number;
}

export class BulkCreateApprovalsDto {
  @IsEnum(ApprovalContext)
  context: ApprovalContext;

  @IsUUID()
  entityId: string;

  @IsUUID()
  @IsOptional()
  leadId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApprovalStageDto)
  stages: ApprovalStageDto[];
}
