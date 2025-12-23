import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkOrder } from '../../entities';
import { WorkOrdersService } from './work-orders.service';
import { WorkOrdersController } from './work-orders.controller';
import { LeadsModule } from '../leads/leads.module';
import { AgreementsModule } from '../agreements/agreements.module';

@Module({
  imports: [TypeOrmModule.forFeature([WorkOrder]), LeadsModule, AgreementsModule],
  controllers: [WorkOrdersController],
  providers: [WorkOrdersService],
})
export class WorkOrdersModule {}
