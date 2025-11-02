import { IsString, IsEmail, IsEnum, IsOptional, IsNumber, IsBoolean, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';
import { LeadSource, LeadStatus } from '../../../entities';

export class CreateLeadDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  organization?: string;

  @IsEmail()
  email: string;

  @IsString()
  phone: string;

  @IsString()
  @IsOptional()
  alternatePhone?: string;

  @IsEnum(LeadSource)
  source: LeadSource;

  @IsString()
  @IsOptional()
  industry?: string;

  @IsString()
  @IsOptional()
  segment?: string;

  @IsNumber()
  @IsOptional()
  estimatedBudget?: number;

  @IsString()
  @IsOptional()
  timeline?: string;

  @IsString()
  @IsOptional()
  productInterest?: string;

  @IsString()
  @IsOptional()
  requirementSummary?: string;

  @IsString()
  @IsOptional()
  qualificationNotes?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsUUID()
  @IsOptional()
  assignedToId?: string;

  @IsString()
  @IsOptional()
  internalNotes?: string;
}

export class UpdateLeadDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  organization?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  alternatePhone?: string;

  @IsEnum(LeadSource)
  @IsOptional()
  source?: LeadSource;

  @IsEnum(LeadStatus)
  @IsOptional()
  status?: LeadStatus;

  @IsString()
  @IsOptional()
  industry?: string;

  @IsString()
  @IsOptional()
  segment?: string;

  @IsNumber()
  @IsOptional()
  estimatedBudget?: number;

  @IsString()
  @IsOptional()
  timeline?: string;

  @IsString()
  @IsOptional()
  productInterest?: string;

  @IsString()
  @IsOptional()
  requirementSummary?: string;

  @IsString()
  @IsOptional()
  qualificationNotes?: string;

  @IsNumber()
  @IsOptional()
  leadScore?: number;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsUUID()
  @IsOptional()
  assignedToId?: string;

  @IsString()
  @IsOptional()
  internalNotes?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class QualifyLeadDto {
  @IsEnum(LeadStatus)
  status: LeadStatus;

  @IsString()
  @IsOptional()
  qualificationNotes?: string;

  @IsNumber()
  @IsOptional()
  leadScore?: number;

  @IsString()
  @IsOptional()
  industry?: string;

  @IsString()
  @IsOptional()
  segment?: string;

  @IsNumber()
  @IsOptional()
  estimatedBudget?: number;
}

export class FilterLeadsDto {
  @IsEnum(LeadStatus)
  @IsOptional()
  status?: LeadStatus;

  @IsEnum(LeadSource)
  @IsOptional()
  source?: LeadSource;

  @IsUUID()
  @IsOptional()
  assignedToId?: string;

  @IsNumber()
  @IsOptional()
  minAge?: number;

  @IsNumber()
  @IsOptional()
  maxAge?: number;

  @IsString()
  @IsOptional()
  search?: string;

  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @IsOptional()
  page?: number;

  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @IsOptional()
  limit?: number;
}
