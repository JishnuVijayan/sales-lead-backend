import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
  Sse,
  UnauthorizedException,
  MessageEvent,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { NotificationsService } from './notifications.service';
import { SseNotificationsService } from './sse-notifications.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';
import { NotificationFilterDto } from './dto/notification.dto';
import { NotificationStatus } from '../../entities/notification.entity';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly sseNotificationsService: SseNotificationsService,
    private readonly jwtService: JwtService,
  ) {}

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

  /**
   * SSE endpoint for real-time notifications
   * Uses query param for authentication since SSE cannot send custom headers
   */
  @Sse('stream')
  async streamNotifications(
    @Query('token') token: string,
  ): Promise<Observable<MessageEvent>> {
    if (!token) {
      throw new UnauthorizedException('Token is required');
    }

    try {
      // Verify JWT token
      const payload = await this.jwtService.verifyAsync(token);
      const userId = payload.sub; // JWT standard claim for user ID

      if (!userId) {
        throw new UnauthorizedException('Invalid token');
      }

      // Create SSE stream for this user
      return this.sseNotificationsService.createStream(userId);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Get unread notifications (for initial load when user logs in)
   */
  @Get('unread')
  @UseGuards(JwtAuthGuard)
  async getUnreadNotifications(@Request() req) {
    const notifications = await this.notificationsService.findAll({
      recipientId: req.user.userId,
      status: NotificationStatus.PENDING,
    });

    return {
      notifications,
      count: notifications.length,
    };
  }

  /**
   * Get SSE connection statistics (admin only)
   */
  @Get('stats')
  @UseGuards(JwtAuthGuard)
  getConnectionStats(@Request() req) {
    // TODO: Add admin role check
    return this.sseNotificationsService.getStats();
  }

  /**
   * Health check endpoint
   */
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      activeConnections:
        this.sseNotificationsService.getStats().activeConnections,
    };
  }
}
