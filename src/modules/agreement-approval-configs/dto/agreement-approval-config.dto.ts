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
import { ApprovalType } from '../../../entities/agreement-approval-config.entity';

export class CreateAgreementApprovalConfigDto {
  @IsUUID()
  @IsNotEmpty()
  agreementId: string;

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

export class AgreementApproverConfigDto {
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

export class DefineAgreementApprovalFlowDto {
  @IsUUID()
  @IsNotEmpty()
  agreementId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AgreementApproverConfigDto)
  approvers: AgreementApproverConfigDto[];
}
