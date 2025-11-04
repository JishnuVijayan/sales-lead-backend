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
import { WorkOrder } from './entities/work-order.entity';
import { Document } from './entities/document.entity';
import { Negotiation } from './entities/negotiation.entity';
import { LeadsModule } from './modules/leads/leads.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { ProposalsModule } from './modules/proposals/proposals.module';
import { WorkOrdersModule } from './modules/work-orders/work-orders.module';
import { UsersModule } from './modules/users/users.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { NegotiationsModule } from './modules/negotiations/negotiations.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { AuthModule } from './auth/auth.module';
import { ReportsModule } from './modules/reports/reports.module';

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
        entities: [Lead, User, LeadActivity, Proposal, ProposalItem, WorkOrder, Document, Negotiation],
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
    WorkOrdersModule,
    UsersModule,
    DocumentsModule,
    NegotiationsModule,
    SchedulerModule,
    AuthModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
