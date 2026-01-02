import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgreementActivitiesService } from './agreement-activities.service';
import { AgreementActivitiesController } from './agreement-activities.controller';
import { AgreementActivity } from '../../entities/agreement-activity.entity';
import { Agreement } from '../../entities/agreement.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AgreementActivity, Agreement]),
    NotificationsModule,
  ],
  controllers: [AgreementActivitiesController],
  providers: [AgreementActivitiesService],
  exports: [AgreementActivitiesService],
})
export class AgreementActivitiesModule {}
