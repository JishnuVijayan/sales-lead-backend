import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Notification,
  NotificationType,
  NotificationStatus,
} from '../../entities/notification.entity';
import { User } from '../../entities/user.entity';
import * as nodemailer from 'nodemailer';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {
    // Configure email transporter (update with your SMTP settings)
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async createNotification(
    recipientId: string,
    type: NotificationType,
    subject: string,
    message: string,
    entityType?: string,
    entityId?: string,
    sendEmail: boolean = false, // Email disabled by default - only in-app notifications
  ): Promise<Notification> {
    const notification = this.notificationsRepository.create({
      recipientId,
      type,
      subject,
      message,
      entityType,
      entityId,
      status: NotificationStatus.PENDING,
    });

    const saved = await this.notificationsRepository.save(notification);

    // Send email only if explicitly requested
    if (sendEmail && process.env.SMTP_USER) {
      this.sendEmail(saved.id).catch((err) =>
        this.logger.error(
          `Failed to send notification ${saved.id}: ${err.message}`,
        ),
      );
    } else {
      // Mark as "sent" for in-app notifications (no email needed)
      saved.status = NotificationStatus.SENT;
      await this.notificationsRepository.save(saved);
    }

    return saved;
  }

  async sendEmail(notificationId: string): Promise<void> {
    const notification = await this.notificationsRepository.findOne({
      where: { id: notificationId },
      relations: ['recipient'],
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    if (!notification.recipient?.email) {
      notification.status = NotificationStatus.FAILED;
      notification.errorMessage = 'Recipient email not found';
      await this.notificationsRepository.save(notification);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@leadsales.com',
        to: notification.recipient.email,
        subject: notification.subject,
        html: this.buildEmailTemplate(notification),
      });

      notification.status = NotificationStatus.SENT;
      notification.sentDate = new Date();
      await this.notificationsRepository.save(notification);

      this.logger.log(
        `Email sent successfully to ${notification.recipient.email}`,
      );
    } catch (error) {
      notification.status = NotificationStatus.FAILED;
      notification.errorMessage = error.message;
      await this.notificationsRepository.save(notification);
      this.logger.error(`Failed to send email: ${error.message}`);
    }
  }

  private buildEmailTemplate(notification: Notification): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 10px 20px; border-radius: 5px; }
          .content { padding: 20px; background-color: #f9f9f9; border-radius: 5px; margin-top: 10px; }
          .footer { margin-top: 20px; font-size: 12px; color: #777; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>${notification.subject}</h2>
          </div>
          <div class="content">
            ${notification.message}
          </div>
          <div class="footer">
            <p>This is an automated notification from Lead Sales Management System.</p>
            <p>Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Notification triggers
  async notifyLeadIdle(
    leadId: string,
    assignedToId: string,
    daysSinceLastAction: number,
  ): Promise<void> {
    await this.createNotification(
      assignedToId,
      NotificationType.LEAD_IDLE,
      'Lead Requires Attention',
      `<p>A lead has been idle for <strong>${daysSinceLastAction} days</strong>.</p>
       <p>Please take action to move the lead forward.</p>
       <p><a href="${process.env.FRONTEND_URL}/leads/${leadId}">View Lead</a></p>`,
      'Lead',
      leadId,
    );
  }

  async notifyLeadEscalation(
    leadId: string,
    managerId: string,
    assignedToName: string,
    daysSinceLastAction: number,
  ): Promise<void> {
    await this.createNotification(
      managerId,
      NotificationType.LEAD_ESCALATION,
      'Lead Escalation Required',
      `<p>A lead assigned to <strong>${assignedToName}</strong> has been idle for <strong>${daysSinceLastAction} days</strong>.</p>
       <p>Immediate attention required.</p>
       <p><a href="${process.env.FRONTEND_URL}/leads/${leadId}">View Lead</a></p>`,
      'Lead',
      leadId,
    );
  }

  async notifyAgreementStageDelay(
    agreementId: string,
    userId: string,
    stage: string,
    daysInStage: number,
  ): Promise<void> {
    await this.createNotification(
      userId,
      NotificationType.AGREEMENT_STAGE_DELAY,
      `Agreement ${stage} Delayed`,
      `<p>An agreement has been in <strong>${stage}</strong> for <strong>${daysInStage} days</strong>.</p>
       <p>Please review and take action.</p>
       <p><a href="${process.env.FRONTEND_URL}/agreements/${agreementId}">View Agreement</a></p>`,
      'Agreement',
      agreementId,
    );
  }

  async notifyCEOApprovalPending(
    agreementId: string,
    ceoId: string,
  ): Promise<void> {
    await this.createNotification(
      ceoId,
      NotificationType.CEO_APPROVAL_PENDING,
      'CEO Approval Required',
      `<p>An agreement is pending your approval.</p>
       <p>Please review at your earliest convenience.</p>
       <p><a href="${process.env.FRONTEND_URL}/agreements/${agreementId}">View Agreement</a></p>`,
      'Agreement',
      agreementId,
    );
  }

  async notifyClientReviewReminder(
    agreementId: string,
    accountManagerId: string,
    daysInReview: number,
  ): Promise<void> {
    await this.createNotification(
      accountManagerId,
      NotificationType.CLIENT_REVIEW_REMINDER,
      'Client Review Pending',
      `<p>An agreement has been with the client for <strong>${daysInReview} days</strong>.</p>
       <p>Consider following up with the client.</p>
       <p><a href="${process.env.FRONTEND_URL}/agreements/${agreementId}">View Agreement</a></p>`,
      'Agreement',
      agreementId,
    );
  }

  async notifySLAWarning(
    entityType: string,
    entityId: string,
    userId: string,
    stage: string,
  ): Promise<void> {
    await this.createNotification(
      userId,
      NotificationType.SLA_WARNING,
      `SLA Warning: ${stage}`,
      `<p>A ${entityType} is approaching its SLA threshold for <strong>${stage}</strong>.</p>
       <p>Please take action to avoid SLA breach.</p>
       <p><a href="${process.env.FRONTEND_URL}/${entityType.toLowerCase()}s/${entityId}">View ${entityType}</a></p>`,
      entityType,
      entityId,
    );
  }

  async notifySLACritical(
    entityType: string,
    entityId: string,
    userId: string,
    stage: string,
  ): Promise<void> {
    await this.createNotification(
      userId,
      NotificationType.SLA_CRITICAL,
      `CRITICAL: SLA Breach - ${stage}`,
      `<p><strong>CRITICAL:</strong> A ${entityType} has exceeded its SLA for <strong>${stage}</strong>.</p>
       <p>Immediate action required!</p>
       <p><a href="${process.env.FRONTEND_URL}/${entityType.toLowerCase()}s/${entityId}">View ${entityType}</a></p>`,
      entityType,
      entityId,
    );
  }

  async findAll(filters?: {
    recipientId?: string;
    status?: NotificationStatus;
  }): Promise<Notification[]> {
    const query = this.notificationsRepository
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.recipient', 'recipient')
      .orderBy('notification.createdDate', 'DESC');

    if (filters?.recipientId) {
      query.andWhere('notification.recipientId = :recipientId', {
        recipientId: filters.recipientId,
      });
    }

    if (filters?.status) {
      query.andWhere('notification.status = :status', {
        status: filters.status,
      });
    }

    return query.getMany();
  }

  async markAsRead(id: string): Promise<void> {
    await this.notificationsRepository.update(id, {
      status: NotificationStatus.SENT,
    });
  }
}
