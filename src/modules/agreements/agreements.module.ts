import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgreementsService } from './agreements.service';
import { AgreementsController } from './agreements.controller';
import { Agreement } from '../../entities/agreement.entity';
import { AgreementStageHistory } from '../../entities/agreement-stage-history.entity';
import { Lead } from '../../entities/lead.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Agreement, AgreementStageHistory, Lead])],
  controllers: [AgreementsController],
  providers: [AgreementsService],
  exports: [AgreementsService],
})
export class AgreementsModule {}
