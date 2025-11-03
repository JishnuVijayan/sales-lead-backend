import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan, LessThan } from 'typeorm';
import { Lead, LeadStatus, LeadSource, User, UserRole } from '../../entities';

export interface UserLeadStats {
  userId: string;
  userName: string;
  role: UserRole;
  totalLeads: number;
  activeLeads: number;
  wonLeads: number;
  lostLeads: number;
  conversionRate: number;
  averageLeadValue: number;
  totalRevenue: number;
}

export interface SourceStats {
  source: LeadSource;
  totalLeads: number;
  activeLeads: number;
  wonLeads: number;
  lostLeads: number;
  conversionRate: number;
  averageLeadValue: number;
  totalRevenue: number;
}

export interface MonthlyStats {
  month: string;
  year: number;
  totalLeads: number;
  wonLeads: number;
  lostLeads: number;
  revenue: number;
  conversionRate: number;
}

export interface OverallStats {
  totalLeads: number;
  activeLeads: number;
  wonLeads: number;
  lostLeads: number;
  totalRevenue: number;
  averageLeadValue: number;
  overallConversionRate: number;
  averageTimeToClose: number;
}

export interface PerformanceMetrics {
  topSalesExecutive?: {
    user: UserLeadStats;
    rank: number;
  };
  topSalesManager?: {
    user: UserLeadStats;
    rank: number;
  };
  bestLeadSource?: {
    source: SourceStats;
    rank: number;
  };
  monthlyTrends: MonthlyStats[];
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Lead)
    private leadsRepository: Repository<Lead>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async getOverallStats(startDate?: Date, endDate?: Date): Promise<OverallStats> {
    let query = this.leadsRepository.createQueryBuilder('lead');

    if (startDate && endDate) {
      query.andWhere('lead.createdDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const leads = await query.getMany();

    const wonLeads = leads.filter(lead => lead.status === LeadStatus.WON);
    const lostLeads = leads.filter(lead => lead.status === LeadStatus.LOST);
    const activeLeads = leads.filter(lead =>
      [LeadStatus.NEW, LeadStatus.QUALIFIED, LeadStatus.PROPOSAL, LeadStatus.NEGOTIATION].includes(lead.status)
    );

    // Calculate revenue from won leads (assuming estimatedBudget represents potential revenue)
    const totalRevenue = wonLeads.reduce((sum, lead) => sum + (lead.estimatedBudget || 0), 0);
    const averageLeadValue = leads.length > 0 ? totalRevenue / leads.length : 0;

    // Calculate average time to close (in days) for won leads
    const closedLeads = wonLeads.filter(lead => lead.closedDate);
    const averageTimeToClose = closedLeads.length > 0
      ? closedLeads.reduce((sum, lead) => {
          const created = new Date(lead.createdDate).getTime();
          const closed = new Date(lead.closedDate!).getTime();
          return sum + (closed - created) / (1000 * 60 * 60 * 24);
        }, 0) / closedLeads.length
      : 0;

    return {
      totalLeads: leads.length,
      activeLeads: activeLeads.length,
      wonLeads: wonLeads.length,
      lostLeads: lostLeads.length,
      totalRevenue,
      averageLeadValue,
      overallConversionRate: leads.length > 0 ? (wonLeads.length / leads.length) * 100 : 0,
      averageTimeToClose,
    };
  }

  async getUserLeadStats(startDate?: Date, endDate?: Date): Promise<UserLeadStats[]> {
    // Get all users who have assigned leads
    const usersWithLeads = await this.leadsRepository
      .createQueryBuilder('lead')
      .select('DISTINCT lead.assignedToId', 'userId')
      .where('lead.assignedToId IS NOT NULL')
      .getRawMany();

    const userIds = usersWithLeads.map(row => row.userId);

    if (userIds.length === 0) {
      return [];
    }

    // Get user details
    const users = await this.usersRepository
      .createQueryBuilder('user')
      .where('user.id IN (:...userIds)', { userIds })
      .getMany();

    const userStats: UserLeadStats[] = await Promise.all(
      users.map(async (user) => {
        let leadsQuery = this.leadsRepository.createQueryBuilder('lead')
          .where('lead.assignedToId = :userId', { userId: user.id });

        if (startDate && endDate) {
          leadsQuery.andWhere('lead.createdDate BETWEEN :startDate AND :endDate', {
            startDate,
            endDate,
          });
        }

        const leads = await leadsQuery.getMany();

        const wonLeads = leads.filter(lead => lead.status === LeadStatus.WON);
        const lostLeads = leads.filter(lead => lead.status === LeadStatus.LOST);
        const activeLeads = leads.filter(lead =>
          [LeadStatus.NEW, LeadStatus.QUALIFIED, LeadStatus.PROPOSAL, LeadStatus.NEGOTIATION].includes(lead.status)
        );

        const totalRevenue = wonLeads.reduce((sum, lead) => sum + (lead.estimatedBudget || 0), 0);
        const averageLeadValue = leads.length > 0 ? totalRevenue / leads.length : 0;
        const conversionRate = leads.length > 0 ? (wonLeads.length / leads.length) * 100 : 0;

        return {
          userId: user.id,
          userName: user.name,
          role: user.role,
          totalLeads: leads.length,
          activeLeads: activeLeads.length,
          wonLeads: wonLeads.length,
          lostLeads: lostLeads.length,
          conversionRate,
          averageLeadValue,
          totalRevenue,
        };
      })
    );

    return userStats.sort((a, b) => b.totalLeads - a.totalLeads);
  }

  async getSourceStats(startDate?: Date, endDate?: Date): Promise<SourceStats[]> {
    const sources = Object.values(LeadSource);

    const sourceStats: SourceStats[] = await Promise.all(
      sources.map(async (source) => {
        let query = this.leadsRepository.createQueryBuilder('lead')
          .where('lead.source = :source', { source });

        if (startDate && endDate) {
          query.andWhere('lead.createdDate BETWEEN :startDate AND :endDate', {
            startDate,
            endDate,
          });
        }

        const leads = await query.getMany();
        const wonLeads = leads.filter(lead => lead.status === LeadStatus.WON);
        const lostLeads = leads.filter(lead => lead.status === LeadStatus.LOST);
        const activeLeads = leads.filter(lead =>
          [LeadStatus.NEW, LeadStatus.QUALIFIED, LeadStatus.PROPOSAL, LeadStatus.NEGOTIATION].includes(lead.status)
        );

        const totalRevenue = wonLeads.reduce((sum, lead) => sum + (lead.estimatedBudget || 0), 0);
        const averageLeadValue = leads.length > 0 ? totalRevenue / leads.length : 0;
        const conversionRate = leads.length > 0 ? (wonLeads.length / leads.length) * 100 : 0;

        return {
          source,
          totalLeads: leads.length,
          activeLeads: activeLeads.length,
          wonLeads: wonLeads.length,
          lostLeads: lostLeads.length,
          conversionRate,
          averageLeadValue,
          totalRevenue,
        };
      })
    );

    return sourceStats.sort((a, b) => b.totalLeads - a.totalLeads);
  }

  async getMonthlyStats(year?: number): Promise<MonthlyStats[]> {
    const targetYear = year || new Date().getFullYear();

    const monthlyStats: MonthlyStats[] = [];

    for (let month = 0; month < 12; month++) {
      const startDate = new Date(targetYear, month, 1);
      const endDate = new Date(targetYear, month + 1, 0, 23, 59, 59);

      const leads = await this.leadsRepository.find({
        where: {
          createdDate: Between(startDate, endDate),
        },
      });

      const wonLeads = leads.filter(lead => lead.status === LeadStatus.WON);
      const lostLeads = leads.filter(lead => lead.status === LeadStatus.LOST);

      const revenue = wonLeads.reduce((sum, lead) => sum + (lead.estimatedBudget || 0), 0);
      const conversionRate = leads.length > 0 ? (wonLeads.length / leads.length) * 100 : 0;

      monthlyStats.push({
        month: new Date(targetYear, month).toLocaleString('default', { month: 'long' }),
        year: targetYear,
        totalLeads: leads.length,
        wonLeads: wonLeads.length,
        lostLeads: lostLeads.length,
        revenue,
        conversionRate,
      });
    }

    return monthlyStats;
  }

  async getPerformanceMetrics(startDate?: Date, endDate?: Date): Promise<PerformanceMetrics> {
    const userStats = await this.getUserLeadStats(startDate, endDate);
    const sourceStats = await this.getSourceStats(startDate, endDate);
    const monthlyTrends = await this.getMonthlyStats();

    // Find top performers
    const salesExecutives = userStats.filter(user => user.role === UserRole.SALES_EXECUTIVE);
    const salesManagers = userStats.filter(user => user.role === UserRole.SALES_MANAGER);

    const topSalesExecutive = salesExecutives.length > 0 ? {
      user: salesExecutives[0],
      rank: 1,
    } : undefined;

    const topSalesManager = salesManagers.length > 0 ? {
      user: salesManagers[0],
      rank: 1,
    } : undefined;

    const bestLeadSource = sourceStats.length > 0 ? {
      source: sourceStats[0],
      rank: 1,
    } : undefined;

    return {
      topSalesExecutive,
      topSalesManager,
      bestLeadSource,
      monthlyTrends,
    };
  }

  async getDetailedReport(startDate?: Date, endDate?: Date): Promise<{
    overallStats: OverallStats;
    userStats: UserLeadStats[];
    sourceStats: SourceStats[];
    performanceMetrics: PerformanceMetrics;
  }> {
    const [overallStats, userStats, sourceStats, performanceMetrics] = await Promise.all([
      this.getOverallStats(startDate, endDate),
      this.getUserLeadStats(startDate, endDate),
      this.getSourceStats(startDate, endDate),
      this.getPerformanceMetrics(startDate, endDate),
    ]);

    return {
      overallStats,
      userStats,
      sourceStats,
      performanceMetrics,
    };
  }
}