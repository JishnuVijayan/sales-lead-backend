import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification, User, Lead, Agreement } from '../../entities';
import { NotificationsService } from './notifications.service';
import { ComprehensiveNotificationsService } from './comprehensive-notifications.service';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, User, Lead, Agreement])],
  controllers: [NotificationsController],
  providers: [NotificationsService, ComprehensiveNotificationsService],
  exports: [NotificationsService, ComprehensiveNotificationsService],
})
export class NotificationsModule {}
