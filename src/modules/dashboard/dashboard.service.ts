import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not, IsNull, LessThan, MoreThan } from 'typeorm';
import { Lead, LeadStatus, LeadAgingStatus, User, UserRole } from '../../entities';
import { Agreement, AgreementStage } from '../../entities/agreement.entity';
import { Approval, ApprovalStatus } from '../../entities/approval.entity';
import { Notification, NotificationStatus } from '../../entities/notification.entity';
import {
  DashboardSummary,
  PendingAction,
  TeamPerformance,
  TeamMemberStats,
  EscalationItem,
  ApprovalPending,
  SystemMetrics,
  DashboardWidget,
  DashboardAlert,
} from './dto/dashboard.dto';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Lead)
    private leadsRepository: Repository<Lead>,
    @InjectRepository(Agreement)
    private agreementsRepository: Repository<Agreement>,
    @InjectRepository(Approval)
    private approvalsRepository: Repository<Approval>,
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async getDashboardSummary(userId: string, userRole: UserRole): Promise<DashboardSummary> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    const widgets = await this.getWidgetsForRole(userId, userRole);
    const alerts = await this.getAlertsForUser(userId, userRole);
    const metrics = await this.getMetricsForRole(userId, userRole);

    return {
      role: userRole,
      userName: user?.name || 'User',
      widgets,
      metrics,
      alerts,
    };
  }

  private async getWidgetsForRole(userId: string, role: UserRole): Promise<DashboardWidget[]> {
    const widgets: DashboardWidget[] = [];

    switch (role) {
      case UserRole.ACCOUNT_MANAGER:
        // My Active Leads
        const myActiveLeads = await this.leadsRepository.count({
          where: { assignedToId: userId, isActive: true, isConverted: false },
        });
        widgets.push({
          id: 'my-active-leads',
          title: 'My Active Leads',
          value: myActiveLeads,
          icon: 'users',
          color: 'blue',
          link: '/leads?filter=my-active',
        });

        // Overdue Leads
        const threeDaysAgoAM = new Date();
        threeDaysAgoAM.setDate(threeDaysAgoAM.getDate() - 3);
        
        const myOverdueLeads = await this.leadsRepository.count({
          where: { 
            assignedToId: userId, 
            lastActionDate: LessThan(threeDaysAgoAM),
            isActive: true,
            isConverted: false,
          },
        });
        widgets.push({
          id: 'overdue-leads',
          title: 'Overdue Leads',
          value: myOverdueLeads,
          icon: 'alert-circle',
          color: 'red',
          link: '/leads?filter=overdue',
        });

        // Pending Proposals
        const pendingProposals = await this.leadsRepository.count({
          where: { assignedToId: userId, status: LeadStatus.PROPOSAL },
        });
        widgets.push({
          id: 'pending-proposals',
          title: 'Pending Proposals',
          value: pendingProposals,
          icon: 'file-text',
          color: 'yellow',
          link: '/leads?status=proposal',
        });

        // Agreements in Progress
        const myAgreements = await this.agreementsRepository.count({
          where: {
            lead: { assignedToId: userId },
            stage: Not(In([AgreementStage.SIGNED, AgreementStage.CANCELLED])),
          },
          relations: ['lead'],
        });
        widgets.push({
          id: 'my-agreements',
          title: 'Agreements in Progress',
          value: myAgreements,
          icon: 'file',
          color: 'green',
          link: '/agreements?filter=my-active',
        });
        break;

      case UserRole.SALES_MANAGER:
        // Team Active Leads
        const teamActiveLeads = await this.leadsRepository.count({
          where: { isActive: true, isConverted: false },
        });
        widgets.push({
          id: 'team-active-leads',
          title: 'Team Active Leads',
          value: teamActiveLeads,
          icon: 'users',
          color: 'blue',
        });

        // Escalations - calculate dynamically based on lastActionDate
        const threeDaysAgoSM = new Date();
        threeDaysAgoSM.setDate(threeDaysAgoSM.getDate() - 3);
        
        const escalations = await this.leadsRepository.count({
          where: { 
            lastActionDate: LessThan(threeDaysAgoSM),
            isActive: true,
            isConverted: false,
          },
        });
        widgets.push({
          id: 'escalations',
          title: 'Escalations',
          value: escalations,
          icon: 'alert-triangle',
          color: 'red',
          link: '/escalations',
        });

        // Qualification Requests
        const qualificationRequests = await this.leadsRepository.count({
          where: { status: LeadStatus.NEW, isActive: true },
        });
        widgets.push({
          id: 'qualification-requests',
          title: 'Qualification Requests',
          value: qualificationRequests,
          icon: 'check-circle',
          color: 'purple',
        });

        // Team Conversion Rate
        const totalLeads = await this.leadsRepository.count();
        const wonLeads = await this.leadsRepository.count({ where: { status: LeadStatus.WON } });
        const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;
        widgets.push({
          id: 'conversion-rate',
          title: 'Team Conversion Rate',
          value: `${conversionRate}%`,
          icon: 'trending-up',
          color: 'green',
        });
        break;

      case UserRole.CEO:
      case UserRole.FINANCE:
      case UserRole.LEGAL:
      case UserRole.PROCUREMENT:
      case UserRole.DELIVERY_MANAGER:
      case UserRole.ULCCS_APPROVER:
        // Pending Approvals
        const pendingApprovals = await this.approvalsRepository.count({
          where: { approverId: userId, status: ApprovalStatus.PENDING },
        });
        widgets.push({
          id: 'pending-approvals',
          title: 'Pending Approvals',
          value: pendingApprovals,
          icon: 'clipboard',
          color: 'orange',
          link: '/approvals',
        });

        // Overdue Approvals
        const overdueApprovals = await this.approvalsRepository
          .createQueryBuilder('approval')
          .where('approval.approverId = :userId', { userId })
          .andWhere('approval.status = :status', { status: ApprovalStatus.PENDING })
          .andWhere('approval.requestedDate < :cutoffDate', {
            cutoffDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
          })
          .getCount();
        widgets.push({
          id: 'overdue-approvals',
          title: 'Overdue Approvals',
          value: overdueApprovals,
          icon: 'alert-circle',
          color: 'red',
        });

        // Agreements Awaiting Review (role-specific)
        const stageForRole = this.getAgreementStageForRole(role);
        if (stageForRole) {
          const awaitingReview = await this.agreementsRepository.count({
            where: { stage: stageForRole },
          });
          widgets.push({
            id: 'awaiting-review',
            title: `Awaiting ${this.getRoleLabel(role)} Review`,
            value: awaitingReview,
            icon: 'eye',
            color: 'blue',
          });
        }
        break;

      case UserRole.ADMIN:
        // Total Active Leads
        const totalActiveLeads = await this.leadsRepository.count({
          where: { isActive: true },
        });
        widgets.push({
          id: 'total-active-leads',
          title: 'Total Active Leads',
          value: totalActiveLeads,
          icon: 'database',
          color: 'blue',
        });

        // Total Agreements (all including signed)
        const totalAgreements = await this.agreementsRepository.count();
        widgets.push({
          id: 'total-agreements',
          title: 'Total Agreements',
          value: totalAgreements,
          icon: 'file-text',
          color: 'green',
          link: '/agreements',
        });

        // SLA Compliance
        const threeDaysAgoSLA = new Date();
        threeDaysAgoSLA.setDate(threeDaysAgoSLA.getDate() - 3);
        
        const totalWithSLA = await this.leadsRepository.count({ where: { isActive: true, isConverted: false } });
        const breached = await this.leadsRepository.count({
          where: { 
            lastActionDate: LessThan(threeDaysAgoSLA),
            isActive: true,
            isConverted: false,
          },
        });
        const compliance = totalWithSLA > 0 ? Math.round(((totalWithSLA - breached) / totalWithSLA) * 100) : 100;
        widgets.push({
          id: 'sla-compliance',
          title: 'SLA Compliance',
          value: `${compliance}%`,
          icon: 'check-square',
          color: compliance >= 80 ? 'green' : compliance >= 60 ? 'yellow' : 'red',
        });

        // Pending Notifications
        const pendingNotifications = await this.notificationsRepository.count({
          where: { status: NotificationStatus.PENDING },
        });
        widgets.push({
          id: 'pending-notifications',
          title: 'Pending Notifications',
          value: pendingNotifications,
          icon: 'bell',
          color: 'purple',
        });
        break;
    }

    return widgets;
  }

  private async getAlertsForUser(userId: string, role: UserRole): Promise<DashboardAlert[]> {
    const alerts: DashboardAlert[] = [];

    // Unread notifications as alerts (check for pending/sent status)
    const unreadNotifications = await this.notificationsRepository.find({
      where: { 
        recipientId: userId, 
        status: In([NotificationStatus.PENDING, NotificationStatus.SENT]),
      },
      order: { createdDate: 'DESC' },
      take: 5,
    });

    for (const notification of unreadNotifications) {
      alerts.push({
        id: notification.id,
        type: notification.type.includes('CRITICAL') || notification.type.includes('ESCALATION') ? 'error' : 'warning',
        title: notification.subject,
        message: notification.message.substring(0, 100) + '...',
        timestamp: notification.createdDate,
        link: `/notifications/${notification.id}`,
        actionRequired: true,
      });
    }

    // Role-specific alerts
    if (role === UserRole.SALES_MANAGER) {
      const threeDaysAgoAlert = new Date();
      threeDaysAgoAlert.setDate(threeDaysAgoAlert.getDate() - 3);
      
      const escalatedCount = await this.leadsRepository.count({
        where: { 
          lastActionDate: LessThan(threeDaysAgoAlert),
          isActive: true,
          isConverted: false,
        },
      });
      if (escalatedCount > 0) {
        alerts.push({
          id: 'escalations-alert',
          type: 'error',
          title: 'Leads Requiring Escalation',
          message: `${escalatedCount} leads have exceeded SLA thresholds and require immediate attention`,
          timestamp: new Date(),
          link: '/escalations',
          actionRequired: true,
        });
      }
    }

    if (role === UserRole.CEO) {
      const ceoApprovals = await this.agreementsRepository.count({
        where: { stage: AgreementStage.CEO_APPROVAL },
      });
      if (ceoApprovals > 0) {
        alerts.push({
          id: 'ceo-approvals-alert',
          type: 'warning',
          title: 'Agreements Awaiting CEO Approval',
          message: `${ceoApprovals} agreements are waiting for your approval`,
          timestamp: new Date(),
          link: '/agreements?stage=ceo-approval',
          actionRequired: true,
        });
      }
    }

    return alerts;
  }

  private async getMetricsForRole(userId: string, role: UserRole): Promise<any[]> {
    const metrics: any[] = [];

    if (role === UserRole.ACCOUNT_MANAGER) {
      const myLeads = await this.leadsRepository.find({
        where: { assignedToId: userId },
      });

      const statusCounts = {
        new: myLeads.filter(l => l.status === LeadStatus.NEW).length,
        qualified: myLeads.filter(l => l.status === LeadStatus.QUALIFIED).length,
        proposal: myLeads.filter(l => l.status === LeadStatus.PROPOSAL).length,
        negotiation: myLeads.filter(l => l.status === LeadStatus.NEGOTIATION).length,
        won: myLeads.filter(l => l.status === LeadStatus.WON).length,
        lost: myLeads.filter(l => l.status === LeadStatus.LOST).length,
      };

      metrics.push(
        { label: 'New', value: statusCounts.new, color: '#3B82F6' },
        { label: 'Qualified', value: statusCounts.qualified, color: '#8B5CF6' },
        { label: 'Proposal', value: statusCounts.proposal, color: '#F59E0B' },
        { label: 'Negotiation', value: statusCounts.negotiation, color: '#10B981' },
        { label: 'Won', value: statusCounts.won, color: '#059669' },
        { label: 'Lost', value: statusCounts.lost, color: '#EF4444' },
      );
    }

    return metrics;
  }

  async getPendingActions(userId: string, userRole: UserRole): Promise<PendingAction[]> {
    const actions: PendingAction[] = [];

    // Pending approvals
    const approvals = await this.approvalsRepository.find({
      where: { approverId: userId, status: ApprovalStatus.PENDING },
      relations: ['lead', 'lead.assignedTo', 'lead.createdBy'],
      order: { requestedDate: 'ASC' },
    });

    for (const approval of approvals) {
      const daysWaiting = Math.floor(
        (new Date().getTime() - new Date(approval.requestedDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      actions.push({
        id: approval.id,
        type: 'approval',
        title: `Approval Required: ${approval.context}`,
        description: approval.lead ? `Lead: ${approval.lead.name}` : 'Approval required',
        priority: daysWaiting > 3 ? 'critical' : daysWaiting > 1 ? 'high' : 'medium',
        daysOverdue: daysWaiting > 2 ? daysWaiting - 2 : undefined,
        entityId: approval.id,
        entityType: 'approval',
        link: `/approvals/${approval.id}`,
        createdDate: approval.requestedDate,
      });
    }

    // For Account Managers - overdue leads
    if (userRole === UserRole.ACCOUNT_MANAGER) {
      const threeDaysAgoPA = new Date();
      threeDaysAgoPA.setDate(threeDaysAgoPA.getDate() - 3);
      
      const overdueLeads = await this.leadsRepository.find({
        where: { 
          assignedToId: userId, 
          lastActionDate: LessThan(threeDaysAgoPA),
          isActive: true,
          isConverted: false,
        },
        order: { lastActionDate: 'ASC' },
        take: 10,
      });

      for (const lead of overdueLeads) {
        actions.push({
          id: lead.id,
          type: 'lead',
          title: `Follow up required: ${lead.name}`,
          description: `${lead.daysSinceLastAction ?? 0} days since last action`,
          priority: (lead.daysSinceLastAction ?? 0) > 14 ? 'critical' : 'high',
          daysOverdue: lead.daysSinceLastAction ?? 0,
          entityId: lead.id,
          entityType: 'lead',
          link: `/leads/${lead.id}`,
          createdDate: lead.createdDate,
        });
      }

      // Agreements in client review
      const clientReviewAgreements = await this.agreementsRepository.find({
        where: {
          stage: AgreementStage.CLIENT_REVIEW,
          lead: { assignedToId: userId },
        },
        relations: ['lead'],
        take: 5,
      });

      for (const agreement of clientReviewAgreements) {
        actions.push({
          id: agreement.id,
          type: 'agreement',
          title: `Client Review: ${agreement.title}`,
          description: 'Awaiting client feedback',
          priority: 'medium',
          entityId: agreement.id,
          entityType: 'agreement',
          link: `/agreements/${agreement.id}`,
          createdDate: agreement.createdDate,
        });
      }
    }

    // For CEO - agreements awaiting approval
    if (userRole === UserRole.CEO) {
      const ceoAgreements = await this.agreementsRepository.find({
        where: { stage: AgreementStage.CEO_APPROVAL },
        relations: ['lead'],
        order: { createdDate: 'ASC' },
      });

      for (const agreement of ceoAgreements) {
        actions.push({
          id: agreement.id,
          type: 'agreement',
          title: `CEO Approval Required: ${agreement.title}`,
          description: `Contract Value: ${agreement.contractValue}`,
          priority: 'high',
          entityId: agreement.id,
          entityType: 'agreement',
          link: `/agreements/${agreement.id}`,
          createdDate: agreement.createdDate,
        });
      }
    }

    // For ULCCS Approver - agreements awaiting compliance approval
    if (userRole === UserRole.ULCCS_APPROVER) {
      const ulccsAgreements = await this.agreementsRepository.find({
        where: { stage: AgreementStage.ULCCS_APPROVAL },
        relations: ['lead'],
        order: { createdDate: 'ASC' },
      });

      for (const agreement of ulccsAgreements) {
        actions.push({
          id: agreement.id,
          type: 'agreement',
          title: `ULCCS Compliance Review Required: ${agreement.title}`,
          description: `Contract Value: ${agreement.contractValue}`,
          priority: 'high',
          entityId: agreement.id,
          entityType: 'agreement',
          link: `/app/agreements/${agreement.id}`,
          createdDate: agreement.createdDate,
        });
      }
    }

    // Sort by priority and date
    return actions.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime();
    });
  }

  async getTeamPerformance(managerId?: string): Promise<TeamPerformance> {
    // Get all account managers
    const teamMembers = await this.usersRepository.find({
      where: { role: UserRole.ACCOUNT_MANAGER, isActive: true },
    });

    const teamStats: TeamMemberStats[] = [];
    let totalLeadsAll = 0;
    let activeLeadsAll = 0;
    let wonLeadsAll = 0;
    let totalValueAll = 0;

    for (const member of teamMembers) {
      const allLeads = await this.leadsRepository.find({
        where: { assignedToId: member.id },
      });

      const activeLeads = allLeads.filter(l => l.isActive && !l.isConverted);
      const wonLeads = allLeads.filter(l => l.status === LeadStatus.WON);
      const lostLeads = allLeads.filter(l => l.status === LeadStatus.LOST);
      
      // Calculate overdue leads dynamically
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const overdueLeads = allLeads.filter(l => {
        const lastAction = l.lastActionDate ? new Date(l.lastActionDate) : new Date(l.createdDate);
        return lastAction < threeDaysAgo && l.isActive && !l.isConverted;
      });

      const conversionRate = allLeads.length > 0 ? Math.round((wonLeads.length / allLeads.length) * 100) : 0;

      // Calculate average days to close for won leads
      const daysToClose = wonLeads
        .filter(l => l.closedDate)
        .map(l => Math.floor((new Date(l.closedDate).getTime() - new Date(l.createdDate).getTime()) / (1000 * 60 * 60 * 24)));
      const avgDaysToClose = daysToClose.length > 0 ? Math.round(daysToClose.reduce((a, b) => a + b, 0) / daysToClose.length) : 0;

      const totalValue = wonLeads.reduce((sum, lead) => sum + (lead.estimatedBudget || 0), 0);

      totalLeadsAll += allLeads.length;
      activeLeadsAll += activeLeads.length;
      wonLeadsAll += wonLeads.length;
      totalValueAll += totalValue;

      teamStats.push({
        userId: member.id,
        userName: member.name,
        email: member.email,
        role: member.role,
        stats: {
          totalLeads: allLeads.length,
          activeLeads: activeLeads.length,
          wonLeads: wonLeads.length,
          lostLeads: lostLeads.length,
          conversionRate,
          avgDaysToClose,
          totalValue,
          overdueLeads: overdueLeads.length,
        },
      });
    }

    const overallConversionRate = totalLeadsAll > 0 ? Math.round((wonLeadsAll / totalLeadsAll) * 100) : 0;

    return {
      teamMembers: teamStats,
      overview: {
        totalLeads: totalLeadsAll,
        activeLeads: activeLeadsAll,
        wonLeads: wonLeadsAll,
        conversionRate: overallConversionRate,
        avgResponseTime: 0, // Can be calculated if activity timestamps are tracked
        avgDealValue: wonLeadsAll > 0 ? Math.round(totalValueAll / wonLeadsAll) : 0,
      },
    };
  }

  async getEscalations(): Promise<EscalationItem[]> {
    const escalations: EscalationItem[] = [];

    // Overdue leads - calculate dynamically
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    const overdueLeads = await this.leadsRepository.find({
      where: { 
        lastActionDate: LessThan(threeDaysAgo),
        isActive: true,
        isConverted: false,
      },
      relations: ['assignedTo'],
      order: { lastActionDate: 'ASC' },
    });

    for (const lead of overdueLeads) {
      const lastAction = lead.lastActionDate ? new Date(lead.lastActionDate) : new Date(lead.createdDate);
      const daysOverdue = Math.floor((new Date().getTime() - lastAction.getTime()) / (1000 * 60 * 60 * 24));
      
      escalations.push({
        id: lead.id,
        type: 'lead',
        title: lead.name,
        description: `${lead.organization || 'Unknown Organization'} - ${lead.status}`,
        assignedTo: lead.assignedToId,
        assignedToName: lead.assignedTo?.name || 'Unassigned',
        daysOverdue: daysOverdue,
        lastActionDate: lead.lastActionDate,
        stage: lead.status,
        priority: (lead.daysSinceLastAction ?? 0) > 14 ? 'critical' : 'high',
        estimatedValue: lead.estimatedBudget,
      });
    }

    // Overdue agreements
    const overdueAgreements = await this.agreementsRepository
      .createQueryBuilder('agreement')
      .leftJoinAndSelect('agreement.lead', 'lead')
      .leftJoinAndSelect('lead.assignedTo', 'assignedTo')
      .leftJoinAndSelect('agreement.stageHistory', 'history')
      .where('agreement.stage NOT IN (:...finalStages)', {
        finalStages: [AgreementStage.SIGNED, AgreementStage.CANCELLED, AgreementStage.TERMINATED],
      })
      .getMany();

    for (const agreement of overdueAgreements) {
      if (agreement.stageHistory && agreement.stageHistory.length > 0) {
        const latestHistory = agreement.stageHistory.sort(
          (a, b) => new Date(b.changedDate).getTime() - new Date(a.changedDate).getTime()
        )[0];

        const daysInStage = Math.floor(
          (new Date().getTime() - new Date(latestHistory.changedDate).getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysInStage > 5) {
          escalations.push({
            id: agreement.id,
            type: 'agreement',
            title: agreement.title,
            description: `Stage: ${agreement.stage} - ${daysInStage} days`,
            assignedTo: agreement.lead?.assignedToId || '',
            assignedToName: agreement.lead?.assignedTo?.name || 'Unassigned',
            daysOverdue: daysInStage,
            lastActionDate: latestHistory.changedDate,
            stage: agreement.stage,
            priority: daysInStage > 10 ? 'critical' : 'high',
            estimatedValue: agreement.contractValue,
          });
        }
      }
    }

    return escalations.sort((a, b) => b.daysOverdue - a.daysOverdue);
  }

  async getMyApprovals(userId: string, role: UserRole): Promise<ApprovalPending[]> {
    const approvals: ApprovalPending[] = [];

    // Get pending approvals
    const pendingApprovals = await this.approvalsRepository.find({
      where: { approverId: userId, status: ApprovalStatus.PENDING },
      relations: ['lead', 'requestedBy'],
      order: { requestedDate: 'ASC' },
    });

    for (const approval of pendingApprovals) {
      const daysWaiting = Math.floor(
        (new Date().getTime() - new Date(approval.requestedDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      approvals.push({
        id: approval.id,
        type: 'proposal', // Could be enhanced to distinguish types
        title: approval.lead ? approval.lead.name : 'Approval Request',
        description: approval.context || 'Requires your approval',
        requestedBy: approval.leadId || 'N/A',
        requestedByName: approval.lead?.name || 'Unknown',
        requestedDate: approval.requestedDate,
        daysWaiting,
        value: approval.lead?.estimatedBudget,
        status: approval.status,
        entityId: approval.leadId,
        comments: approval.comments,
      });
    }

    // For specific roles, get agreements awaiting review
    const agreementStage = this.getAgreementStageForRole(role);
    if (agreementStage) {
      const agreements = await this.agreementsRepository.find({
        where: { stage: agreementStage },
        relations: ['lead', 'lead.assignedTo'],
        order: { createdDate: 'ASC' },
      });

      for (const agreement of agreements) {
        const daysWaiting = Math.floor(
          (new Date().getTime() - new Date(agreement.createdDate).getTime()) / (1000 * 60 * 60 * 24)
        );

        approvals.push({
          id: agreement.id,
          type: 'agreement',
          title: agreement.title,
          description: `${this.getRoleLabel(role)} Review Required`,
          requestedBy: agreement.lead?.assignedToId || '',
          requestedByName: agreement.lead?.assignedTo?.name || 'Unknown',
          requestedDate: agreement.createdDate,
          daysWaiting,
          value: agreement.contractValue,
          status: agreement.stage,
          entityId: agreement.id,
        });
      }
    }

    return approvals;
  }

  async getSystemMetrics(): Promise<SystemMetrics> {
    // Lead metrics
    const allLeads = await this.leadsRepository.find();
    const wonLeads = allLeads.filter(l => l.status === LeadStatus.WON);
    const conversionRate = allLeads.length > 0 ? Math.round((wonLeads.length / allLeads.length) * 100) : 0;

    // Agreement metrics
    const allAgreements = await this.agreementsRepository.find();
    const signedAgreements = allAgreements.filter(a => a.stage === AgreementStage.SIGNED);
    const totalValue = signedAgreements.reduce((sum, a) => sum + a.contractValue, 0);

    // Calculate average cycle time for signed agreements
    const cycleTimesPromises = signedAgreements
      .filter(a => a.clientSignedDate || a.companySignedDate)
      .map(async (agreement) => {
        // Find the earliest stage history entry
        const signedDate = agreement.clientSignedDate || agreement.companySignedDate;
        return Math.floor(
          (new Date(signedDate).getTime() - new Date(agreement.createdDate).getTime()) / (1000 * 60 * 60 * 24)
        );
      });
    const cycleTimes = await Promise.all(cycleTimesPromises);
    const avgCycleTime = cycleTimes.length > 0 ? Math.round(cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length) : 0;

    // SLA metrics
    const activeLeads = allLeads.filter(l => l.isActive);
    
    // Calculate breached leads dynamically
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const leadsBreached = activeLeads.filter(l => {
      const lastAction = l.lastActionDate ? new Date(l.lastActionDate) : new Date(l.createdDate);
      return lastAction < threeDaysAgo;
    });
    const leadsWithinSLA = activeLeads.length - leadsBreached.length;

    // Notification metrics
    const notifications = await this.notificationsRepository.find();
    const pendingNotifications = notifications.filter(n => n.status === NotificationStatus.PENDING);
    const failedNotifications = notifications.filter(n => n.status === NotificationStatus.FAILED);

    // Performance metrics
    const avgLeadAge = activeLeads.length > 0 
      ? Math.round(activeLeads.reduce((sum, l) => {
          const created = new Date(l.createdDate);
          const daysSinceCreated = Math.floor((new Date().getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
          return sum + daysSinceCreated;
        }, 0) / activeLeads.length) 
      : 0;

    const escalationRate = activeLeads.length > 0 
      ? Math.round((leadsBreached.length / activeLeads.length) * 100) 
      : 0;

    return {
      leads: {
        total: allLeads.length,
        new: allLeads.filter(l => l.status === LeadStatus.NEW).length,
        qualified: allLeads.filter(l => l.status === LeadStatus.QUALIFIED).length,
        proposal: allLeads.filter(l => l.status === LeadStatus.PROPOSAL).length,
        negotiation: allLeads.filter(l => l.status === LeadStatus.NEGOTIATION).length,
        won: wonLeads.length,
        lost: allLeads.filter(l => l.status === LeadStatus.LOST).length,
        dormant: allLeads.filter(l => l.status === LeadStatus.DORMANT).length,
        conversionRate,
      },
      agreements: {
        total: allAgreements.length,
        draft: allAgreements.filter(a => a.stage === AgreementStage.DRAFT).length,
        inReview: allAgreements.filter(a => 
          [
            AgreementStage.LEGAL_REVIEW,
            AgreementStage.DELIVERY_REVIEW,
            AgreementStage.PROCUREMENT_REVIEW,
            AgreementStage.FINANCE_REVIEW,
            AgreementStage.CLIENT_REVIEW,
          ].includes(a.stage)
        ).length,
        pendingCEO: allAgreements.filter(a => a.stage === AgreementStage.CEO_APPROVAL).length,
        signed: signedAgreements.length,
        totalValue,
        avgCycleTime,
      },
      sla: {
        leadsWithinSLA,
        leadsBreachedSLA: leadsBreached.length,
        agreementsWithinSLA: 0, // Can be calculated with SLA thresholds
        agreementsBreachedSLA: 0,
        overallCompliance: activeLeads.length > 0 ? Math.round((leadsWithinSLA / activeLeads.length) * 100) : 100,
      },
      notifications: {
        totalSent: notifications.filter(n => n.status === NotificationStatus.SENT).length,
        pendingCount: pendingNotifications.length,
        failedCount: failedNotifications.length,
      },
      performance: {
        avgLeadAge,
        avgResponseTime: 0, // Requires activity analysis
        escalationRate,
        approvalTime: 0, // Requires approval timestamp analysis
      },
    };
  }

  private getAgreementStageForRole(role: UserRole): AgreementStage | null {
    const roleStageMap = {
      [UserRole.LEGAL]: AgreementStage.LEGAL_REVIEW,
      [UserRole.DELIVERY_MANAGER]: AgreementStage.DELIVERY_REVIEW,
      [UserRole.PROCUREMENT]: AgreementStage.PROCUREMENT_REVIEW,
      [UserRole.FINANCE]: AgreementStage.FINANCE_REVIEW,
      [UserRole.CEO]: AgreementStage.CEO_APPROVAL,
      [UserRole.ULCCS_APPROVER]: AgreementStage.ULCCS_APPROVAL,
    };
    return roleStageMap[role] || null;
  }

  private getRoleLabel(role: UserRole): string {
    const labels = {
      [UserRole.LEGAL]: 'Legal',
      [UserRole.DELIVERY_MANAGER]: 'Delivery',
      [UserRole.PROCUREMENT]: 'Procurement',
      [UserRole.FINANCE]: 'Finance',
      [UserRole.CEO]: 'CEO',
      [UserRole.ULCCS_APPROVER]: 'ULCCS',
    };
    return labels[role] || role;
  }
}
