import {
  IsNotEmpty,
  IsUUID,
  IsEnum,
  IsString,
  IsOptional,
  ValidateIf,
} from 'class-validator';
import { AgreementActivityType } from '../../../entities/agreement-activity.entity';

export class CreateAgreementActivityDto {
  @IsUUID()
  @IsNotEmpty()
  agreementId: string;

  @ValidateIf((o) => o.leadId !== undefined && o.leadId !== '')
  @IsUUID()
  @IsOptional()
  leadId?: string;

  @IsEnum(AgreementActivityType)
  @IsNotEmpty()
  activityType: AgreementActivityType;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  assignedToId?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class CreateAgreementActivityCommentDto {
  @IsUUID()
  @IsNotEmpty()
  agreementId: string;

  @IsString()
  @IsNotEmpty()
  comment: string;
}

export class UpdateAgreementActivityDto {
  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}
