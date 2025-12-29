import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgreementActivitiesService } from './agreement-activities.service';
import { AgreementActivitiesController } from './agreement-activities.controller';
import { AgreementActivity } from '../../entities/agreement-activity.entity';
import { Agreement } from '../../entities/agreement.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AgreementActivity, Agreement]),
  ],
  controllers: [AgreementActivitiesController],
  providers: [AgreementActivitiesService],
  exports: [AgreementActivitiesService],
})
export class AgreementActivitiesModule {}
