import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Lead,
  LeadActivity,
  User,
  Proposal,
  ProposalActivity,
  Agreement,
  AgreementActivity,
  Negotiation,
  WorkOrder,
  Approval,
} from '../../entities';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { LeadLifecycleHistoryService } from '../../services/lead-lifecycle-history.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Lead,
      LeadActivity,
      User,
      Proposal,
      ProposalActivity,
      Agreement,
      AgreementActivity,
      Negotiation,
      WorkOrder,
      Approval,
    ]),
    NotificationsModule
  ],
  controllers: [LeadsController],
  providers: [LeadsService, LeadLifecycleHistoryService],
  exports: [LeadsService, LeadLifecycleHistoryService],
})
export class LeadsModule {}
