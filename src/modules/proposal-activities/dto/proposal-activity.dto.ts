import { IsNotEmpty, IsUUID, IsEnum, IsString, IsOptional } from 'class-validator';
import { ProposalActivityType } from '../../../entities/proposal-activity.entity';

export class CreateProposalActivityDto {
  @IsUUID()
  @IsNotEmpty()
  proposalId: string;

  @IsUUID()
  @IsNotEmpty()
  leadId: string;

  @IsEnum(ProposalActivityType)
  @IsNotEmpty()
  activityType: ProposalActivityType;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class CreateProposalActivityCommentDto {
  @IsUUID()
  @IsNotEmpty()
  proposalId: string;

  @IsString()
  @IsNotEmpty()
  comment: string;
}
