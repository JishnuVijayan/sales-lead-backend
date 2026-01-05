import {
  IsNotEmpty,
  IsUUID,
  IsEnum,
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApprovalType } from '../../../entities/proposal-approval-config.entity';

export class CreateProposalApprovalConfigDto {
  @IsUUID()
  @IsNotEmpty()
  proposalId: string;

  @IsUUID()
  @IsOptional()
  approverId?: string;

  @IsString()
  @IsOptional()
  approverRole?: string;

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsInt()
  @IsNotEmpty()
  sequenceOrder: number;

  @IsBoolean()
  @IsOptional()
  isMandatory?: boolean;

  @IsEnum(ApprovalType)
  @IsNotEmpty()
  approvalType: ApprovalType;
}

export class ApproverConfigDto {
  @IsUUID()
  @IsOptional()
  approverId?: string;

  @IsString()
  @IsOptional()
  approverRole?: string;

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsInt()
  @IsNotEmpty()
  sequenceOrder: number;

  @IsBoolean()
  @IsOptional()
  isMandatory?: boolean;

  @IsEnum(ApprovalType)
  @IsNotEmpty()
  approvalType: ApprovalType;
}

export class DefineProposalApprovalFlowDto {
  @IsUUID()
  @IsNotEmpty()
  proposalId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApproverConfigDto)
  approvers: ApproverConfigDto[];
}
