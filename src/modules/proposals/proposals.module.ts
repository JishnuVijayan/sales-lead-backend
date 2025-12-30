import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Proposal, ProposalItem, ProposalStageHistory } from '../../entities';
import { ProposalsService } from './proposals.service';
import { ProposalsController } from './proposals.controller';
import { LeadsModule } from '../leads/leads.module';
import { UsersModule } from '../users/users.module';
import { ApprovalsModule } from '../approvals/approvals.module';
import { ProposalApprovalConfigsModule } from '../proposal-approval-configs/proposal-approval-configs.module';
import { PdfService } from '../../services/pdf.service';
import { ProposalStageHistoryService } from '../../services/proposal-stage-history.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Proposal, ProposalItem, ProposalStageHistory]),
    forwardRef(() => LeadsModule),
    UsersModule,
    ApprovalsModule,
    ProposalApprovalConfigsModule,
  ],
  controllers: [ProposalsController],
  providers: [ProposalsService, PdfService, ProposalStageHistoryService],
  exports: [ProposalsService],
})
export class ProposalsModule {}
