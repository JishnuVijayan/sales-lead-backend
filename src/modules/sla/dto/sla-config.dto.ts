import { IsEnum, IsInt, IsBoolean, IsOptional, Min } from 'class-validator';
import { SLAStageType } from '../../../entities/sla-config.entity';

export class CreateSLAConfigDto {
  @IsEnum(SLAStageType)
  stageType: SLAStageType;

  @IsInt()
  @Min(1)
  warningThresholdDays: number;

  @IsInt()
  @Min(1)
  criticalThresholdDays: number;

  @IsInt()
  @Min(1)
  escalationThresholdDays: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateSLAConfigDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  warningThresholdDays?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  criticalThresholdDays?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  escalationThresholdDays?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
