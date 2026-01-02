import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Approval } from '../../entities/approval.entity';
import { User } from '../../entities/user.entity';
import { ApprovalsService } from './approvals.service';
import { ApprovalsController } from './approvals.controller';
import { ProposalActivitiesModule } from '../proposal-activities/proposal-activities.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProposalsModule } from '../proposals/proposals.module';
import { AgreementsModule } from '../agreements/agreements.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Approval, User]),
    ProposalActivitiesModule,
    NotificationsModule,
    forwardRef(() => ProposalsModule),
    forwardRef(() => AgreementsModule),
  ],
  providers: [ApprovalsService],
  controllers: [ApprovalsController],
  exports: [ApprovalsService],
})
export class ApprovalsModule {}
