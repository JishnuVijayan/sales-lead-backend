import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgreementsService } from './agreements.service';
import { AgreementsController } from './agreements.controller';
import { Agreement } from '../../entities/agreement.entity';
import { AgreementStageHistory } from '../../entities/agreement-stage-history.entity';
import { Lead } from '../../entities/lead.entity';
import { AgreementApprovalConfigsModule } from '../agreement-approval-configs/agreement-approval-configs.module';
import { ApprovalsModule } from '../approvals/approvals.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Agreement, AgreementStageHistory, Lead]),
    AgreementApprovalConfigsModule,
    forwardRef(() => ApprovalsModule),
    NotificationsModule,
  ],
  controllers: [AgreementsController],
  providers: [AgreementsService],
  exports: [AgreementsService],
})
export class AgreementsModule {}
