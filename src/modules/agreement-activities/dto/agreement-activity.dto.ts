import { IsNotEmpty, IsUUID, IsEnum, IsString, IsOptional } from 'class-validator';
import { AgreementActivityType } from '../../../entities/agreement-activity.entity';

export class CreateAgreementActivityDto {
  @IsUUID()
  @IsNotEmpty()
  agreementId: string;

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
