import { IsString, IsEnum, IsUUID, IsOptional, IsDateString } from 'class-validator';
import { NotificationType, NotificationStatus } from '../../../entities/notification.entity';

export class CreateNotificationDto {
  @IsEnum(NotificationType)
  type: NotificationType;

  @IsUUID()
  recipientId: string;

  @IsString()
  subject: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  entityId?: string;
}

export class UpdateNotificationDto {
  @IsOptional()
  @IsEnum(NotificationStatus)
  status?: NotificationStatus;

  @IsOptional()
  @IsDateString()
  readDate?: Date;
}

export class NotificationFilterDto {
  @IsOptional()
  @IsEnum(NotificationStatus)
  status?: NotificationStatus;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @IsString()
  entityType?: string;
}
