import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * Get role-based dashboard summary with widgets, metrics, and alerts
   * Endpoint: GET /dashboard/summary
   */
  @Get('summary')
  async getDashboardSummary(@Request() req) {
    return this.dashboardService.getDashboardSummary(
      req.user.userId,
      req.user.role,
    );
  }

  /**
   * Get user's pending actions based on role
   * Endpoint: GET /dashboard/pending-actions
   */
  @Get('pending-actions')
  async getPendingActions(@Request() req) {
    return this.dashboardService.getPendingActions(
      req.user.userId,
      req.user.role,
    );
  }

  /**
   * Get team performance overview (for managers)
   * Endpoint: GET /dashboard/team-performance
   */
  @Get('team-performance')
  @Roles(UserRole.SALES_MANAGER, UserRole.ADMIN)
  async getTeamPerformance(
    @Request() req,
    @Query('managerId') managerId?: string,
  ) {
    return this.dashboardService.getTeamPerformance(
      managerId || req.user.userId,
    );
  }

  /**
   * Get escalation queue (overdue leads and agreements)
   * Endpoint: GET /dashboard/escalations
   */
  @Get('escalations')
  @Roles(UserRole.SALES_MANAGER, UserRole.ADMIN)
  async getEscalations() {
    return this.dashboardService.getEscalations();
  }

  /**
   * Get pending approvals for current user
   * Endpoint: GET /dashboard/my-approvals
   */
  @Get('my-approvals')
  @Roles(
    UserRole.FINANCE,
    UserRole.LEGAL,
    UserRole.PROCUREMENT,
    UserRole.DELIVERY_MANAGER,
    UserRole.CEO,
    UserRole.ULCCS_APPROVER,
    UserRole.SALES_MANAGER,
    UserRole.ADMIN,
  )
  async getMyApprovals(@Request() req) {
    return this.dashboardService.getMyApprovals(req.user.userId, req.user.role);
  }

  /**
   * Get system-wide metrics (for executives and admins)
   * Endpoint: GET /dashboard/metrics
   */
  @Get('metrics')
  @Roles(UserRole.CEO, UserRole.SALES_MANAGER, UserRole.ADMIN)
  async getSystemMetrics() {
    return this.dashboardService.getSystemMetrics();
  }
}
