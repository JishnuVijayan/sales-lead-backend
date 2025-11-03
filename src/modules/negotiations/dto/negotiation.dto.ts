import { IsNotEmpty, IsNumber, IsOptional, IsString, IsDateString, IsEnum, Min, IsUUID } from 'class-validator';
import { NegotiationStatus, NegotiationOutcome } from '../../../entities/negotiation.entity';

export class CreateNegotiationDto {
  @IsUUID()
  @IsNotEmpty()
  leadId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsNotEmpty()
  expectedAmount: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  finalAmount?: number;

  @IsString()
  @IsOptional()
  negotiationDetails?: string;

  @IsString()
  @IsOptional()
  negotiationApproach?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  callCount?: number = 0;

  @IsNumber()
  @Min(0)
  @IsOptional()
  meetingCount?: number = 0;

  @IsNumber()
  @Min(0)
  @IsOptional()
  emailCount?: number = 0;

  @IsString()
  @IsOptional()
  clientFeedback?: string;

  @IsString()
  @IsOptional()
  internalNotes?: string;

  @IsDateString()
  @IsOptional()
  expectedClosureDate?: string;

  @IsUUID()
  @IsOptional()
  negotiatorId?: string;

  @IsString()
  @IsOptional()
  specialTerms?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  discountOffered?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  negotiationDuration?: number;
}

export class UpdateNegotiationDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  expectedAmount?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  finalAmount?: number;

  @IsString()
  @IsOptional()
  negotiationDetails?: string;

  @IsString()
  @IsOptional()
  negotiationApproach?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  callCount?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  meetingCount?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  emailCount?: number;

  @IsString()
  @IsOptional()
  clientFeedback?: string;

  @IsString()
  @IsOptional()
  internalNotes?: string;

  @IsEnum(NegotiationStatus)
  @IsOptional()
  status?: NegotiationStatus;

  @IsEnum(NegotiationOutcome)
  @IsOptional()
  outcome?: NegotiationOutcome;

  @IsDateString()
  @IsOptional()
  expectedClosureDate?: string;

  @IsDateString()
  @IsOptional()
  actualClosureDate?: string;

  @IsUUID()
  @IsOptional()
  negotiatorId?: string;

  @IsString()
  @IsOptional()
  specialTerms?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  discountOffered?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  negotiationDuration?: number;
}