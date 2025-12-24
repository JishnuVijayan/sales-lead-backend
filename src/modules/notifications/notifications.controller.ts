import { Controller, Get, Post, Patch, Param, Query, UseGuards, Request } from '@nestjs/common';
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

  @Get('my-notifications')
  getMyNotifications(@Request() req) {
    return this.notificationsService.findAll({
      recipientId: req.user.userId,
    });
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    const notifications = await this.notificationsService.findAll({
      recipientId: req.user.userId,
      status: NotificationStatus.PENDING,
    });
    return { count: notifications.length };
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Patch('mark-all-read')
  async markAllAsRead(@Request() req) {
    const notifications = await this.notificationsService.findAll({
      recipientId: req.user.userId,
      status: NotificationStatus.PENDING,
    });
    
    for (const notification of notifications) {
      await this.notificationsService.markAsRead(notification.id);
    }
    
    return { message: 'All notifications marked as read' };
  }

  @Post(':id/mark-read')
  markAsReadLegacy(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }
}
