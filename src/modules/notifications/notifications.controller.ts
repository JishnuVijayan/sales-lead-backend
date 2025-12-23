import { Controller, Get, Post, Param, Query, UseGuards, Request } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { NotificationFilterDto } from './dto/notification.dto';
import { NotificationStatus } from '../../entities/notification.entity';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(@Request() req, @Query('status') status?: NotificationStatus) {
    return this.notificationsService.findAll({
      recipientId: req.user.userId,
      status,
    });
  }

  @Post(':id/mark-read')
  markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }
}
