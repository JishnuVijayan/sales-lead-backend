import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Lead } from '../../entities/lead.entity';
import { User } from '../../entities/user.entity';
import { LeadActivity } from '../../entities/lead-activity.entity';
import { Proposal } from '../../entities/proposal.entity';
import { WorkOrder } from '../../entities/work-order.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Lead,
      User,
      LeadActivity,
      Proposal,
      WorkOrder,
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}