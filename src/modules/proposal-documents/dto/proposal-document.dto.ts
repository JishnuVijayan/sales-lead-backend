import {
  IsNotEmpty,
  IsUUID,
  IsEnum,
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
} from 'class-validator';
import { UploadReason } from '../../../entities/proposal-document.entity';

export class CreateProposalDocumentDto {
  @IsUUID()
  @IsNotEmpty()
  proposalId: string;

  @IsUUID()
  @IsNotEmpty()
  documentId: string;

  @IsInt()
  @IsOptional()
  version?: number;

  @IsEnum(UploadReason)
  @IsOptional()
  uploadReason?: UploadReason;

  @IsString()
  @IsOptional()
  revisionNotes?: string;

  @IsBoolean()
  @IsOptional()
  isCurrentVersion?: boolean;

  @IsBoolean()
  @IsOptional()
  isFinalVersion?: boolean;
}

export class UpdateProposalDocumentDto {
  @IsBoolean()
  @IsOptional()
  isCurrentVersion?: boolean;

  @IsBoolean()
  @IsOptional()
  isFinalVersion?: boolean;

  @IsString()
  @IsOptional()
  revisionNotes?: string;
}

export class UploadProposalDocumentDto {
  @IsUUID()
  @IsNotEmpty()
  proposalId: string;

  @IsEnum(UploadReason)
  @IsOptional()
  uploadReason?: UploadReason;

  @IsString()
  @IsOptional()
  revisionNotes?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
