import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { LeadAgingSchedulerService } from './lead-aging-scheduler.service';
import { Lead, User } from '../entities';
import { NotificationsModule } from '../modules/notifications/notifications.module';
import { SLAModule } from '../modules/sla/sla.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lead, User]),
    ScheduleModule,
    NotificationsModule,
    SLAModule,
  ],
  providers: [LeadAgingSchedulerService],
  exports: [LeadAgingSchedulerService],
})
export class SchedulerModule {}