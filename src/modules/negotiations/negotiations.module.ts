import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Negotiation } from '../../entities';
import { NegotiationsService } from './negotiations.service';
import { NegotiationsController } from './negotiations.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Negotiation])],
  controllers: [NegotiationsController],
  providers: [NegotiationsService],
  exports: [NegotiationsService],
})
export class NegotiationsModule {}