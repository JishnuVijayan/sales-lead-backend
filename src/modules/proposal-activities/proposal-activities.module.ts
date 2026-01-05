import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProposalActivitiesService } from './proposal-activities.service';
import { ProposalActivitiesController } from './proposal-activities.controller';
import { ProposalActivity } from '../../entities/proposal-activity.entity';
import { Proposal } from '../../entities/proposal.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProposalActivity, Proposal]),
    NotificationsModule,
  ],
  controllers: [ProposalActivitiesController],
  providers: [ProposalActivitiesService],
  exports: [ProposalActivitiesService],
})
export class ProposalActivitiesModule {}
