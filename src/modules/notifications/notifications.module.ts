import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Notification, User, Lead, Agreement, Proposal } from '../../entities';
import { NotificationsService } from './notifications.service';
import { ComprehensiveNotificationsService } from './comprehensive-notifications.service';
import { SseNotificationsService } from './sse-notifications.service';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, User, Lead, Agreement, Proposal]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    ComprehensiveNotificationsService,
    SseNotificationsService,
  ],
  exports: [
    NotificationsService,
    ComprehensiveNotificationsService,
    SseNotificationsService,
  ],
})
export class NotificationsModule {}
