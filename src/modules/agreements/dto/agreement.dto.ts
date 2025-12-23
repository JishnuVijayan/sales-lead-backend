import { IsString, IsOptional, IsEnum, IsNumber, IsDate, IsBoolean, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { AgreementType, AgreementStage, PaymentTerms } from '../../../entities/agreement.entity';

export class CreateAgreementDto {
  @IsUUID()
  leadId: string;

  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(AgreementType)
  @IsOptional()
  agreementType?: AgreementType;

  @IsNumber()
  @IsOptional()
  contractValue?: number;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  startDate?: Date;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  endDate?: Date;

  @IsEnum(PaymentTerms)
  @IsOptional()
  paymentTerms?: PaymentTerms;

  @IsString()
  @IsOptional()
  customPaymentTerms?: string;

  @IsString()
  @IsOptional()
  termsAndConditions?: string;

  @IsString()
  @IsOptional()
  deliverables?: string;

  @IsString()
  @IsOptional()
  milestones?: string;

  @IsString()
  @IsOptional()
  scopeOfWork?: string;

  @IsString()
  @IsOptional()
  specialClauses?: string;

  @IsBoolean()
  @IsOptional()
  isRenewable?: boolean;

  @IsNumber()
  @IsOptional()
  renewalNoticeDays?: number;

  @IsBoolean()
  @IsOptional()
  autoRenew?: boolean;

  @IsString()
  @IsOptional()
  internalNotes?: string;

  @IsUUID()
  @IsOptional()
  assignedToId?: string;

  @IsBoolean()
  @IsOptional()
  requiresULCCSApproval?: boolean;
}

export class UpdateAgreementDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(AgreementType)
  @IsOptional()
  agreementType?: AgreementType;

  @IsNumber()
  @IsOptional()
  contractValue?: number;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  startDate?: Date;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  endDate?: Date;

  @IsEnum(PaymentTerms)
  @IsOptional()
  paymentTerms?: PaymentTerms;

  @IsString()
  @IsOptional()
  customPaymentTerms?: string;

  @IsString()
  @IsOptional()
  termsAndConditions?: string;

  @IsString()
  @IsOptional()
  deliverables?: string;

  @IsString()
  @IsOptional()
  milestones?: string;

  @IsString()
  @IsOptional()
  scopeOfWork?: string;

  @IsString()
  @IsOptional()
  specialClauses?: string;

  @IsBoolean()
  @IsOptional()
  isRenewable?: boolean;

  @IsNumber()
  @IsOptional()
  renewalNoticeDays?: number;

  @IsBoolean()
  @IsOptional()
  autoRenew?: boolean;

  @IsString()
  @IsOptional()
  internalNotes?: string;

  @IsUUID()
  @IsOptional()
  assignedToId?: string;

  @IsBoolean()
  @IsOptional()
  requiresULCCSApproval?: boolean;
}

export class ChangeStageDto {
  @IsEnum(AgreementStage)
  newStage: AgreementStage;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class SignAgreementDto {
  @IsString()
  signedBy: string;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  signedDate?: Date;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class TerminateAgreementDto {
  @IsString()
  reason: string;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  terminationDate?: Date;

  @IsString()
  @IsOptional()
  notes?: string;
}
