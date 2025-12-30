import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsNumber,
} from 'class-validator';
import { DocumentType } from '../../../entities';

export class CreateDocumentDto {
  @IsUUID()
  leadId: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(DocumentType)
  @IsOptional()
  documentType?: DocumentType;
}

export class UpdateDocumentDto {
  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(DocumentType)
  @IsOptional()
  documentType?: DocumentType;
}
