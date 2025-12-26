import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProposalApprovalConfigsService } from './proposal-approval-configs.service';
import { ProposalApprovalConfigsController } from './proposal-approval-configs.controller';
import { ProposalApprovalConfig } from '../../entities/proposal-approval-config.entity';
import { Proposal } from '../../entities/proposal.entity';
import { User } from '../../entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProposalApprovalConfig, Proposal, User])],
  controllers: [ProposalApprovalConfigsController],
  providers: [ProposalApprovalConfigsService],
  exports: [ProposalApprovalConfigsService],
})
export class ProposalApprovalConfigsModule {}
