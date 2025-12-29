import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgreementApprovalConfigsService } from './agreement-approval-configs.service';
import { AgreementApprovalConfigsController } from './agreement-approval-configs.controller';
import { AgreementApprovalConfig } from '../../entities/agreement-approval-config.entity';
import { Agreement } from '../../entities/agreement.entity';
import { User } from '../../entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AgreementApprovalConfig, Agreement, User]),
  ],
  controllers: [AgreementApprovalConfigsController],
  providers: [AgreementApprovalConfigsService],
  exports: [AgreementApprovalConfigsService],
})
export class AgreementApprovalConfigsModule {}