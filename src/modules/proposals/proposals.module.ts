import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Proposal, ProposalItem } from '../../entities';
import { ProposalsService } from './proposals.service';
import { ProposalsController } from './proposals.controller';
import { LeadsModule } from '../leads/leads.module';
import { PdfService } from '../../services/pdf.service';

@Module({
  imports: [TypeOrmModule.forFeature([Proposal, ProposalItem]), LeadsModule],
  controllers: [ProposalsController],
  providers: [ProposalsService, PdfService],
})
export class ProposalsModule {}
