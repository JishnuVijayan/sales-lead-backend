import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Lead } from '../../entities/lead.entity';
import { User } from '../../entities/user.entity';
import { LeadActivity } from '../../entities/lead-activity.entity';
import { Proposal } from '../../entities/proposal.entity';
import { WorkOrder } from '../../entities/work-order.entity';
import { Agreement } from '../../entities/agreement.entity';
import { AgreementStageHistory } from '../../entities/agreement-stage-history.entity';
import { SLAConfig } from '../../entities/sla-config.entity';
import { Notification } from '../../entities/notification.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Lead,
      User,
      LeadActivity,
      Proposal,
      WorkOrder,
      Agreement,
      AgreementStageHistory,
      SLAConfig,
      Notification,
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}