import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Lead } from './entities/lead.entity';
import { User } from './entities/user.entity';
import { LeadActivity } from './entities/lead-activity.entity';
import { Proposal } from './entities/proposal.entity';
import { ProposalItem } from './entities/proposal-item.entity';
import { ProposalDocument } from './entities/proposal-document.entity';
import { ProposalActivity } from './entities/proposal-activity.entity';
import { ProposalApprovalConfig } from './entities/proposal-approval-config.entity';
import { WorkOrder } from './entities/work-order.entity';
import { Document } from './entities/document.entity';
import { Negotiation } from './entities/negotiation.entity';
import { Approval } from './entities/approval.entity';
import { Agreement } from './entities/agreement.entity';
import { AgreementStageHistory } from './entities/agreement-stage-history.entity';
import { AgreementApprovalConfig } from './entities/agreement-approval-config.entity';
import { AgreementActivity } from './entities/agreement-activity.entity';
import { SLAConfig } from './entities/sla-config.entity';
import { Notification } from './entities/notification.entity';
import { LeadsModule } from './modules/leads/leads.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { ProposalsModule } from './modules/proposals/proposals.module';
import { ProposalDocumentsModule } from './modules/proposal-documents/proposal-documents.module';
import { ProposalActivitiesModule } from './modules/proposal-activities/proposal-activities.module';
import { ProposalApprovalConfigsModule } from './modules/proposal-approval-configs/proposal-approval-configs.module';
import { WorkOrdersModule } from './modules/work-orders/work-orders.module';
import { UsersModule } from './modules/users/users.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { NegotiationsModule } from './modules/negotiations/negotiations.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { AuthModule } from './auth/auth.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ApprovalsModule } from './modules/approvals/approvals.module';
import { AgreementsModule } from './modules/agreements/agreements.module';
import { AgreementApprovalConfigsModule } from './modules/agreement-approval-configs/agreement-approval-configs.module';
import { AgreementActivitiesModule } from './modules/agreement-activities/agreement-activities.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SLAModule } from './modules/sla/sla.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: +configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: [Lead, User, LeadActivity, Proposal, ProposalItem, ProposalDocument, ProposalActivity, ProposalApprovalConfig, WorkOrder, Document, Negotiation, Approval, Agreement, AgreementStageHistory, AgreementActivity, AgreementApprovalConfig, SLAConfig, Notification],
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
        // Enable SSL for production Postgres (Neon requires sslmode=require)
        ssl: configService.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    LeadsModule,
    ActivitiesModule,
    ProposalsModule,
    ProposalDocumentsModule,
    ProposalActivitiesModule,
    ProposalApprovalConfigsModule,
    WorkOrdersModule,
    UsersModule,
    DocumentsModule,
    NegotiationsModule,
    SchedulerModule,
    AuthModule,
    ApprovalsModule,
    AgreementsModule,
    AgreementApprovalConfigsModule,
    AgreementActivitiesModule,
    ReportsModule,
    NotificationsModule,
    SLAModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
