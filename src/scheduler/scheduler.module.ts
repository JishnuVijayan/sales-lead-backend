import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { LeadAgingSchedulerService } from './lead-aging-scheduler.service';
import { Lead } from '../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lead]),
    ScheduleModule,
  ],
  providers: [LeadAgingSchedulerService],
  exports: [LeadAgingSchedulerService],
})
export class SchedulerModule {}