import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsNumber,
  IsDateString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProposalStatus } from '../../../entities';

export class ProposalItemDto {
  @IsString()
  itemName: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  quantity: number;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsNumber()
  unitPrice: number;
}

export class CreateProposalDto {
  @IsUUID()
  leadId: string;

  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  taxPercent?: number;

  @IsNumber()
  @IsOptional()
  discountPercent?: number;

  @IsDateString()
  @IsOptional()
  validUntil?: string;

  @IsString()
  @IsOptional()
  termsAndConditions?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProposalItemDto)
  items: ProposalItemDto[];

  @IsUUID()
  @IsOptional()
  createdById?: string;
}

export class UpdateProposalDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ProposalStatus)
  @IsOptional()
  status?: ProposalStatus;

  @IsNumber()
  @IsOptional()
  taxPercent?: number;

  @IsNumber()
  @IsOptional()
  discountPercent?: number;

  @IsDateString()
  @IsOptional()
  validUntil?: string;

  @IsString()
  @IsOptional()
  termsAndConditions?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProposalItemDto)
  @IsOptional()
  items?: ProposalItemDto[];
}
