export interface DashboardSummary {
  role: string;
  userName: string;
  widgets: DashboardWidget[];
  metrics: DashboardMetric[];
  alerts: DashboardAlert[];
}

export interface DashboardWidget {
  id: string;
  title: string;
  value: number | string;
  description?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  icon?: string;
  color?: string;
  link?: string;
}

export interface DashboardMetric {
  label: string;
  value: number;
  total?: number;
  percentage?: number;
  color?: string;
}

export interface DashboardAlert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  link?: string;
  actionRequired?: boolean;
}

export interface PendingAction {
  id: string;
  type: 'lead' | 'approval' | 'agreement' | 'notification';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate?: Date;
  daysOverdue?: number;
  entityId: string;
  entityType: string;
  link: string;
  createdDate: Date;
}

export interface TeamPerformance {
  teamMembers: TeamMemberStats[];
  overview: {
    totalLeads: number;
    activeLeads: number;
    wonLeads: number;
    conversionRate: number;
    avgResponseTime: number;
    avgDealValue: number;
  };
}

export interface TeamMemberStats {
  userId: string;
  userName: string;
  email: string;
  role: string;
  stats: {
    totalLeads: number;
    activeLeads: number;
    wonLeads: number;
    lostLeads: number;
    conversionRate: number;
    avgDaysToClose: number;
    totalValue: number;
    overdueLeads: number;
  };
}

export interface EscalationItem {
  id: string;
  type: 'lead' | 'agreement';
  title: string;
  description: string;
  assignedTo: string;
  assignedToName: string;
  daysOverdue: number;
  lastActionDate: Date;
  stage: string;
  priority: 'high' | 'critical';
  estimatedValue?: number;
}

export interface ApprovalPending {
  id: string;
  type: 'proposal' | 'agreement' | 'negotiation';
  title: string;
  description: string;
  requestedBy: string;
  requestedByName: string;
  requestedDate: Date;
  daysWaiting: number;
  value?: number;
  status: string;
  entityId: string;
  comments?: string;
}

export interface SystemMetrics {
  leads: {
    total: number;
    new: number;
    qualified: number;
    proposal: number;
    negotiation: number;
    won: number;
    lost: number;
    dormant: number;
    conversionRate: number;
  };
  agreements: {
    total: number;
    draft: number;
    inReview: number;
    pendingCEO: number;
    signed: number;
    totalValue: number;
    avgCycleTime: number;
  };
  sla: {
    leadsWithinSLA: number;
    leadsBreachedSLA: number;
    agreementsWithinSLA: number;
    agreementsBreachedSLA: number;
    overallCompliance: number;
  };
  notifications: {
    totalSent: number;
    pendingCount: number;
    failedCount: number;
  };
  performance: {
    avgLeadAge: number;
    avgResponseTime: number;
    escalationRate: number;
    approvalTime: number;
  };
}
