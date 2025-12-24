import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SLAConfig } from '../../entities';
import { SLAService } from './sla.service';
import { SLAController } from './sla.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SLAConfig])],
  controllers: [SLAController],
  providers: [SLAService],
  exports: [SLAService],
})
export class SLAModule {}
