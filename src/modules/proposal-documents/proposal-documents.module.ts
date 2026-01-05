import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProposalDocumentsService } from './proposal-documents.service';
import { ProposalDocumentsController } from './proposal-documents.controller';
import { ProposalDocument } from '../../entities/proposal-document.entity';
import { Proposal } from '../../entities/proposal.entity';
import { Document } from '../../entities/document.entity';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProposalDocument, Proposal, Document]),
    DocumentsModule,
  ],
  controllers: [ProposalDocumentsController],
  providers: [ProposalDocumentsService],
  exports: [ProposalDocumentsService],
})
export class ProposalDocumentsModule {}
