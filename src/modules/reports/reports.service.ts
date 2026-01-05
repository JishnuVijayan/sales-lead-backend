import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan, LessThan, In } from 'typeorm';
import { Lead, LeadStatus, LeadSource, User, UserRole } from '../../entities';
import { Agreement, AgreementStage } from '../../entities/agreement.entity';
import { AgreementStageHistory } from '../../entities/agreement-stage-history.entity';
import { SLAConfig, SLAStageType } from '../../entities/sla-config.entity';
import {
  Notification,
  NotificationStatus,
} from '../../entities/notification.entity';
import {
  Approval,
  ApprovalStatus,
  ApprovalStage,
  ApprovalContext,
} from '../../entities/approval.entity';
import {
  AgreementDelay,
  DelayReason,
} from '../../entities/agreement-delay.entity';

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

export interface LeadAgingBucket {
  bucket: string;
  ageRange: string;
  totalLeads: number;
  activeLeads: number;
  wonLeads: number;
  lostLeads: number;
  averageValue: number;
  conversionRate: number;
}

export interface StageTimeAnalysis {
  stage: LeadStatus;
  averageTimeInDays: number;
  medianTimeInDays: number;
  minTimeInDays: number;
  maxTimeInDays: number;
  totalLeads: number;
  leadsWithData: number;
}

export interface AgreementCycleTime {
  averageCycleTimeDays: number;
  medianCycleTimeDays: number;
  minCycleTimeDays: number;
  maxCycleTimeDays: number;
  totalSignedAgreements: number;
  stageBreakdown: {
    stage: string;
    averageTimeDays: number;
    percentage: number;
  }[];
}

export interface SLAPerformanceByDepartment {
  department: string;
  totalTasks: number;
  completedOnTime: number;
  completedLate: number;
  pending: number;
  complianceRate: number;
  averageCompletionTimeDays: number;
  breachedTasks: number;
}

export interface ValueComparison {
  signedValue: number;
  signedCount: number;
  pipelineValue: number;
  pipelineCount: number;
  ratio: number;
  conversionRate: number;
  byStage: {
    stage: string;
    count: number;
    value: number;
    percentage: number;
  }[];
}

export interface AgreementPendingItems {
  stage: string;
  pendingApprovals: number;
  pendingReviews: {
    delivery: number;
    procurement: number;
    finance: number;
    ceo: number;
    ulccs: number;
    legal: number;
    sales: number;
  };
  averageWaitTime: number;
  totalItems: number;
}

export interface AgreementDelayReport {
  date: string;
  ownerId: string;
  ownerName: string;
  totalDelays: number;
  delaysByReason: Record<string, number>;
  averageDelayDuration: number;
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Lead)
    private leadsRepository: Repository<Lead>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Agreement)
    private agreementsRepository: Repository<Agreement>,
    @InjectRepository(AgreementStageHistory)
    private agreementStageHistoryRepository: Repository<AgreementStageHistory>,
    @InjectRepository(SLAConfig)
    private slaConfigRepository: Repository<SLAConfig>,
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
    @InjectRepository(Approval)
    private approvalsRepository: Repository<Approval>,
    @InjectRepository(AgreementDelay)
    private agreementDelaysRepository: Repository<AgreementDelay>,
  ) {}

  // Helper method to get actual revenue from agreements
  private async getActualRevenue(leadIds: string[]): Promise<number> {
    if (leadIds.length === 0) return 0;

    const agreements = await this.agreementsRepository.find({
      where: {
        leadId: In(leadIds),
        stage: In([AgreementStage.SIGNED, AgreementStage.ACTIVE]),
      },
    });

    return agreements.reduce(
      (sum, agreement) => sum + (agreement.contractValue || 0),
      0,
    );
  }

  async getOverallStats(
    startDate?: Date,
    endDate?: Date,
  ): Promise<OverallStats> {
    const query = this.leadsRepository.createQueryBuilder('lead');

    if (startDate && endDate) {
      query.andWhere('lead.createdDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const leads = await query.getMany();

    const wonLeads = leads.filter((lead) => lead.status === LeadStatus.WON);
    const lostLeads = leads.filter((lead) => lead.status === LeadStatus.LOST);
    const activeLeads = leads.filter((lead) =>
      [
        LeadStatus.NEW,
        LeadStatus.QUALIFIED,
        LeadStatus.PROPOSAL,
        LeadStatus.NEGOTIATION,
      ].includes(lead.status),
    );

    // Calculate revenue from actual agreements (contract values)
    const wonLeadIds = wonLeads.map((lead) => lead.id);
    const totalRevenue = await this.getActualRevenue(wonLeadIds);
    const averageLeadValue =
      wonLeads.length > 0 ? totalRevenue / wonLeads.length : 0;

    // Calculate average time to close (in days) for won leads
    const closedLeads = wonLeads.filter((lead) => lead.closedDate);
    const averageTimeToClose =
      closedLeads.length > 0
        ? closedLeads.reduce((sum, lead) => {
            const created = new Date(lead.createdDate).getTime();
            const closed = new Date(lead.closedDate).getTime();
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
      overallConversionRate:
        leads.length > 0 ? (wonLeads.length / leads.length) * 100 : 0,
      averageTimeToClose,
    };
  }

  async getUserLeadStats(
    startDate?: Date,
    endDate?: Date,
  ): Promise<UserLeadStats[]> {
    // Get all users who have assigned leads
    const usersWithLeads = await this.leadsRepository
      .createQueryBuilder('lead')
      .select('DISTINCT lead.assignedToId', 'userId')
      .where('lead.assignedToId IS NOT NULL')
      .getRawMany();

    const userIds = usersWithLeads.map((row) => row.userId);

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
        const leadsQuery = this.leadsRepository
          .createQueryBuilder('lead')
          .where('lead.assignedToId = :userId', { userId: user.id });

        if (startDate && endDate) {
          leadsQuery.andWhere(
            'lead.createdDate BETWEEN :startDate AND :endDate',
            {
              startDate,
              endDate,
            },
          );
        }

        const leads = await leadsQuery.getMany();

        const wonLeads = leads.filter((lead) => lead.status === LeadStatus.WON);
        const lostLeads = leads.filter(
          (lead) => lead.status === LeadStatus.LOST,
        );
        const activeLeads = leads.filter((lead) =>
          [
            LeadStatus.NEW,
            LeadStatus.QUALIFIED,
            LeadStatus.PROPOSAL,
            LeadStatus.NEGOTIATION,
          ].includes(lead.status),
        );

        const wonLeadIds = wonLeads.map((lead) => lead.id);
        const totalRevenue = await this.getActualRevenue(wonLeadIds);
        const averageLeadValue =
          wonLeads.length > 0 ? totalRevenue / wonLeads.length : 0;
        const conversionRate =
          leads.length > 0 ? (wonLeads.length / leads.length) * 100 : 0;

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
      }),
    );

    return userStats.sort((a, b) => b.totalLeads - a.totalLeads);
  }

  async getSourceStats(
    startDate?: Date,
    endDate?: Date,
  ): Promise<SourceStats[]> {
    const sources = Object.values(LeadSource);

    const sourceStats: SourceStats[] = await Promise.all(
      sources.map(async (source) => {
        const query = this.leadsRepository
          .createQueryBuilder('lead')
          .where('lead.source = :source', { source });

        if (startDate && endDate) {
          query.andWhere('lead.createdDate BETWEEN :startDate AND :endDate', {
            startDate,
            endDate,
          });
        }

        const leads = await query.getMany();
        const wonLeads = leads.filter((lead) => lead.status === LeadStatus.WON);
        const lostLeads = leads.filter(
          (lead) => lead.status === LeadStatus.LOST,
        );
        const activeLeads = leads.filter((lead) =>
          [
            LeadStatus.NEW,
            LeadStatus.QUALIFIED,
            LeadStatus.PROPOSAL,
            LeadStatus.NEGOTIATION,
          ].includes(lead.status),
        );

        const wonLeadIds = wonLeads.map((lead) => lead.id);
        const totalRevenue = await this.getActualRevenue(wonLeadIds);
        const averageLeadValue =
          wonLeads.length > 0 ? totalRevenue / wonLeads.length : 0;
        const conversionRate =
          leads.length > 0 ? (wonLeads.length / leads.length) * 100 : 0;

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
      }),
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

      const wonLeads = leads.filter((lead) => lead.status === LeadStatus.WON);
      const lostLeads = leads.filter((lead) => lead.status === LeadStatus.LOST);

      const wonLeadIds = wonLeads.map((lead) => lead.id);
      const revenue = await this.getActualRevenue(wonLeadIds);
      const conversionRate =
        leads.length > 0 ? (wonLeads.length / leads.length) * 100 : 0;

      monthlyStats.push({
        month: new Date(targetYear, month).toLocaleString('default', {
          month: 'long',
        }),
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

  async getPerformanceMetrics(
    startDate?: Date,
    endDate?: Date,
  ): Promise<PerformanceMetrics> {
    const userStats = await this.getUserLeadStats(startDate, endDate);
    const sourceStats = await this.getSourceStats(startDate, endDate);
    const monthlyTrends = await this.getMonthlyStats();

    // Find top performers
    const salesExecutives = userStats.filter(
      (user) => user.role === UserRole.ACCOUNT_MANAGER,
    );
    const salesManagers = userStats.filter(
      (user) => user.role === UserRole.SALES_MANAGER,
    );

    const topSalesExecutive =
      salesExecutives.length > 0
        ? {
            user: salesExecutives[0],
            rank: 1,
          }
        : undefined;

    const topSalesManager =
      salesManagers.length > 0
        ? {
            user: salesManagers[0],
            rank: 1,
          }
        : undefined;

    const bestLeadSource =
      sourceStats.length > 0
        ? {
            source: sourceStats[0],
            rank: 1,
          }
        : undefined;

    return {
      topSalesExecutive,
      topSalesManager,
      bestLeadSource,
      monthlyTrends,
    };
  }

  async getDetailedReport(
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    overallStats: OverallStats;
    userStats: UserLeadStats[];
    sourceStats: SourceStats[];
    performanceMetrics: PerformanceMetrics;
  }> {
    const [overallStats, userStats, sourceStats, performanceMetrics] =
      await Promise.all([
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

  // NEW REPORT 1: Lead Aging Summary by Age Buckets
  async getLeadAgingSummary(
    startDate?: Date,
    endDate?: Date,
  ): Promise<LeadAgingBucket[]> {
    const query = this.leadsRepository.createQueryBuilder('lead');

    if (startDate && endDate) {
      query.andWhere('lead.createdDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const leads = await query.getMany();

    // Define age buckets (in days)
    const buckets = [
      { name: '0-7 days', min: 0, max: 7 },
      { name: '8-14 days', min: 8, max: 14 },
      { name: '15-30 days', min: 15, max: 30 },
      { name: '31-60 days', min: 31, max: 60 },
      { name: '61-90 days', min: 61, max: 90 },
      { name: '90+ days', min: 91, max: Infinity },
    ];

    const agingBuckets: LeadAgingBucket[] = buckets.map((bucket) => {
      const leadsInBucket = leads.filter((lead) => {
        const age = lead.leadAge ?? 0;
        return age >= bucket.min && age <= bucket.max;
      });

      const wonLeads = leadsInBucket.filter(
        (lead) => lead.status === LeadStatus.WON,
      );
      const lostLeads = leadsInBucket.filter(
        (lead) => lead.status === LeadStatus.LOST,
      );
      const activeLeads = leadsInBucket.filter((lead) =>
        [
          LeadStatus.NEW,
          LeadStatus.QUALIFIED,
          LeadStatus.PROPOSAL,
          LeadStatus.NEGOTIATION,
        ].includes(lead.status),
      );

      const totalValue = leadsInBucket.reduce(
        (sum, lead) => sum + (lead.estimatedBudget || 0),
        0,
      );
      const averageValue =
        leadsInBucket.length > 0 ? totalValue / leadsInBucket.length : 0;
      const conversionRate =
        leadsInBucket.length > 0
          ? (wonLeads.length / leadsInBucket.length) * 100
          : 0;

      return {
        bucket: bucket.name,
        ageRange:
          bucket.max === Infinity
            ? `${bucket.min}+ days`
            : `${bucket.min}-${bucket.max} days`,
        totalLeads: leadsInBucket.length,
        activeLeads: activeLeads.length,
        wonLeads: wonLeads.length,
        lostLeads: lostLeads.length,
        averageValue,
        conversionRate,
      };
    });

    return agingBuckets;
  }

  // NEW REPORT 2: Stage-wise Time Spent Analysis
  async getStageTimeAnalysis(
    startDate?: Date,
    endDate?: Date,
  ): Promise<StageTimeAnalysis[]> {
    const query = this.leadsRepository.createQueryBuilder('lead');

    if (startDate && endDate) {
      query.andWhere('lead.createdDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const leads = await query.getMany();

    const stages = Object.values(LeadStatus);

    const stageAnalysis: StageTimeAnalysis[] = [];

    for (const stage of stages) {
      const leadsInStage = leads.filter((lead) => lead.status === stage);
      const timeData: number[] = [];

      // Calculate time spent in each stage based on stage transition dates
      for (const lead of leadsInStage) {
        let timeInStage = 0;

        switch (stage) {
          case LeadStatus.NEW:
            if (lead.qualifiedDate) {
              timeInStage = Math.floor(
                (new Date(lead.qualifiedDate).getTime() -
                  new Date(lead.createdDate).getTime()) /
                  (1000 * 60 * 60 * 24),
              );
            } else if (lead.status === LeadStatus.NEW) {
              // Still in NEW stage
              timeInStage = Math.floor(
                (new Date().getTime() - new Date(lead.createdDate).getTime()) /
                  (1000 * 60 * 60 * 24),
              );
            }
            break;

          case LeadStatus.QUALIFIED:
            if (lead.qualifiedDate && lead.proposalDate) {
              timeInStage = Math.floor(
                (new Date(lead.proposalDate).getTime() -
                  new Date(lead.qualifiedDate).getTime()) /
                  (1000 * 60 * 60 * 24),
              );
            } else if (
              lead.status === LeadStatus.QUALIFIED &&
              lead.qualifiedDate
            ) {
              timeInStage = Math.floor(
                (new Date().getTime() -
                  new Date(lead.qualifiedDate).getTime()) /
                  (1000 * 60 * 60 * 24),
              );
            }
            break;

          case LeadStatus.PROPOSAL:
            if (lead.proposalDate && lead.negotiationDate) {
              timeInStage = Math.floor(
                (new Date(lead.negotiationDate).getTime() -
                  new Date(lead.proposalDate).getTime()) /
                  (1000 * 60 * 60 * 24),
              );
            } else if (
              lead.status === LeadStatus.PROPOSAL &&
              lead.proposalDate
            ) {
              timeInStage = Math.floor(
                (new Date().getTime() - new Date(lead.proposalDate).getTime()) /
                  (1000 * 60 * 60 * 24),
              );
            }
            break;

          case LeadStatus.NEGOTIATION:
            if (lead.negotiationDate && (lead.wonDate || lead.lostDate)) {
              const endDate = lead.wonDate || lead.lostDate;
              timeInStage = Math.floor(
                (new Date(endDate).getTime() -
                  new Date(lead.negotiationDate).getTime()) /
                  (1000 * 60 * 60 * 24),
              );
            } else if (
              lead.status === LeadStatus.NEGOTIATION &&
              lead.negotiationDate
            ) {
              timeInStage = Math.floor(
                (new Date().getTime() -
                  new Date(lead.negotiationDate).getTime()) /
                  (1000 * 60 * 60 * 24),
              );
            }
            break;

          case LeadStatus.WON:
            if (lead.wonDate && lead.negotiationDate) {
              timeInStage = Math.floor(
                (new Date(lead.wonDate).getTime() -
                  new Date(lead.negotiationDate).getTime()) /
                  (1000 * 60 * 60 * 24),
              );
            }
            break;

          case LeadStatus.LOST:
            if (lead.lostDate && lead.negotiationDate) {
              timeInStage = Math.floor(
                (new Date(lead.lostDate).getTime() -
                  new Date(lead.negotiationDate).getTime()) /
                  (1000 * 60 * 60 * 24),
              );
            }
            break;

          case LeadStatus.DORMANT:
            if (lead.dormantDate) {
              timeInStage = Math.floor(
                (new Date().getTime() - new Date(lead.dormantDate).getTime()) /
                  (1000 * 60 * 60 * 24),
              );
            }
            break;
        }

        if (timeInStage > 0) {
          timeData.push(timeInStage);
        }
      }

      // Calculate statistics
      const sortedTimes = timeData.sort((a, b) => a - b);
      const averageTime =
        timeData.length > 0
          ? timeData.reduce((a, b) => a + b, 0) / timeData.length
          : 0;
      const medianTime =
        sortedTimes.length > 0
          ? sortedTimes.length % 2 === 0
            ? (sortedTimes[sortedTimes.length / 2 - 1] +
                sortedTimes[sortedTimes.length / 2]) /
              2
            : sortedTimes[Math.floor(sortedTimes.length / 2)]
          : 0;
      const minTime = sortedTimes.length > 0 ? sortedTimes[0] : 0;
      const maxTime =
        sortedTimes.length > 0 ? sortedTimes[sortedTimes.length - 1] : 0;

      stageAnalysis.push({
        stage,
        averageTimeInDays: Math.round(averageTime),
        medianTimeInDays: Math.round(medianTime),
        minTimeInDays: minTime,
        maxTimeInDays: maxTime,
        totalLeads: leadsInStage.length,
        leadsWithData: timeData.length,
      });
    }

    return stageAnalysis;
  }

  // NEW REPORT 3: Agreement Cycle Time (Draft → Signed)
  async getAgreementCycleTime(
    startDate?: Date,
    endDate?: Date,
  ): Promise<AgreementCycleTime> {
    const query = this.agreementsRepository.createQueryBuilder('agreement');

    if (startDate && endDate) {
      query.andWhere('agreement.createdDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    // Get signed agreements
    query.andWhere('agreement.stage = :stage', {
      stage: AgreementStage.SIGNED,
    });

    const agreements = await query.getMany();

    // Calculate cycle times
    const cycleTimes: number[] = [];
    for (const agreement of agreements) {
      const signedDate =
        agreement.clientSignedDate || agreement.companySignedDate;
      if (signedDate) {
        const cycleTime = Math.floor(
          (new Date(signedDate).getTime() -
            new Date(agreement.createdDate).getTime()) /
            (1000 * 60 * 60 * 24),
        );
        cycleTimes.push(cycleTime);
      }
    }

    const sortedCycleTimes = cycleTimes.sort((a, b) => a - b);
    const averageCycleTime =
      cycleTimes.length > 0
        ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length
        : 0;
    const medianCycleTime =
      sortedCycleTimes.length > 0
        ? sortedCycleTimes.length % 2 === 0
          ? (sortedCycleTimes[sortedCycleTimes.length / 2 - 1] +
              sortedCycleTimes[sortedCycleTimes.length / 2]) /
            2
          : sortedCycleTimes[Math.floor(sortedCycleTimes.length / 2)]
        : 0;
    const minCycleTime = sortedCycleTimes.length > 0 ? sortedCycleTimes[0] : 0;
    const maxCycleTime =
      sortedCycleTimes.length > 0
        ? sortedCycleTimes[sortedCycleTimes.length - 1]
        : 0;

    // Get stage breakdown from agreement stage history
    const stageBreakdown: {
      stage: string;
      averageTimeDays: number;
      percentage: number;
    }[] = [];

    // Get all stage history for these agreements
    const agreementIds = agreements.map((a) => a.id);
    if (agreementIds.length > 0) {
      const stageHistories = await this.agreementStageHistoryRepository
        .createQueryBuilder('history')
        .where('history.agreementId IN (:...agreementIds)', { agreementIds })
        .orderBy('history.changedDate', 'ASC')
        .getMany();

      // Group by agreement and calculate stage durations
      const stageTimesByStage: Map<string, number[]> = new Map();

      for (const agreement of agreements) {
        const histories = stageHistories.filter(
          (h) => h.agreementId === agreement.id,
        );

        // Calculate duration for each stage transition
        for (let i = 0; i < histories.length - 1; i++) {
          const currentHistory = histories[i];
          const nextHistory = histories[i + 1];

          const duration =
            Math.round(
              ((new Date(nextHistory.changedDate).getTime() -
                new Date(currentHistory.changedDate).getTime()) /
                (1000 * 60 * 60 * 24)) *
                10,
            ) / 10;

          const stage = currentHistory.toStage;
          if (!stageTimesByStage.has(stage)) {
            stageTimesByStage.set(stage, []);
          }
          stageTimesByStage.get(stage)!.push(duration);
        }

        // Include the final stage (Signed) with duration from last transition to signing
        if (histories.length > 0) {
          const lastHistory = histories[histories.length - 1];
          const signedDate =
            agreement.clientSignedDate || agreement.companySignedDate;

          if (signedDate && lastHistory.toStage) {
            const duration =
              Math.round(
                ((new Date(signedDate).getTime() -
                  new Date(lastHistory.changedDate).getTime()) /
                  (1000 * 60 * 60 * 24)) *
                  10,
              ) / 10;

            const stage = lastHistory.toStage;
            if (!stageTimesByStage.has(stage)) {
              stageTimesByStage.set(stage, []);
            }
            stageTimesByStage.get(stage)!.push(duration);
          }
        }
      }

      // Calculate averages per stage
      const totalCycleTime = averageCycleTime * cycleTimes.length;
      for (const [stage, times] of stageTimesByStage.entries()) {
        const avgTime =
          times.length > 0
            ? times.reduce((a, b) => a + b, 0) / times.length
            : 0;
        const percentage =
          totalCycleTime > 0 ? (avgTime / averageCycleTime) * 100 : 0;

        stageBreakdown.push({
          stage,
          averageTimeDays: Math.round(avgTime * 10) / 10,
          percentage: Math.round(percentage * 10) / 10,
        });
      }
    }

    return {
      averageCycleTimeDays: Math.round(averageCycleTime * 10) / 10,
      medianCycleTimeDays: Math.round(medianCycleTime * 10) / 10,
      minCycleTimeDays: Math.round(minCycleTime * 10) / 10,
      maxCycleTimeDays: Math.round(maxCycleTime * 10) / 10,
      totalSignedAgreements: agreements.length,
      stageBreakdown,
    };
  }

  // NEW REPORT 4: SLA Performance by Department
  async getSLAPerformanceByDepartment(
    startDate?: Date,
    endDate?: Date,
  ): Promise<SLAPerformanceByDepartment[]> {
    const departments = [
      {
        name: 'Sales',
        roles: [UserRole.ACCOUNT_MANAGER, UserRole.SALES_MANAGER],
      },
      { name: 'Finance', roles: [UserRole.FINANCE] },
      { name: 'Legal', roles: [UserRole.LEGAL] },
      { name: 'Procurement', roles: [UserRole.PROCUREMENT] },
      { name: 'Delivery', roles: [UserRole.DELIVERY_MANAGER] },
      { name: 'Executive', roles: [UserRole.CEO] },
    ];

    const departmentPerformance: SLAPerformanceByDepartment[] = [];

    for (const dept of departments) {
      // Get SLA configs for this department
      const slaConfigs = await this.slaConfigRepository.find({
        where: { isActive: true },
      });

      // Get notifications related to this department's roles
      const notificationsQuery = this.notificationsRepository
        .createQueryBuilder('notification')
        .leftJoinAndSelect('notification.recipient', 'user')
        .where('user.role IN (:...roles)', { roles: dept.roles });

      if (startDate && endDate) {
        notificationsQuery.andWhere(
          'notification.createdDate BETWEEN :startDate AND :endDate',
          {
            startDate,
            endDate,
          },
        );
      }

      const notifications = await notificationsQuery.getMany();

      // Get leads assigned to department members
      const deptUsers = await this.usersRepository.find({
        where: { role: dept.roles.length === 1 ? dept.roles[0] : undefined },
      });

      const userIds = deptUsers.map((u) => u.id);

      const leadsQuery = this.leadsRepository
        .createQueryBuilder('lead')
        .where('lead.assignedToId IN (:...userIds)', { userIds });

      if (startDate && endDate) {
        leadsQuery.andWhere(
          'lead.createdDate BETWEEN :startDate AND :endDate',
          {
            startDate,
            endDate,
          },
        );
      }

      const leads = await leadsQuery.getMany();

      // Calculate SLA compliance
      const totalTasks = leads.length;
      let completedOnTime = 0;
      let completedLate = 0;
      let pending = 0;
      let breached = 0;

      const completionTimes: number[] = [];

      for (const lead of leads) {
        const daysSinceLastAction = lead.daysSinceLastAction ?? 0;

        // Find appropriate SLA config based on lead status
        let slaThreshold = 7; // Default threshold
        const slaConfig = slaConfigs.find((config) => {
          if (lead.status === LeadStatus.NEW)
            return config.stage === SLAStageType.LEAD_NEW;
          if (lead.status === LeadStatus.QUALIFIED)
            return config.stage === SLAStageType.LEAD_QUALIFIED;
          if (lead.status === LeadStatus.PROPOSAL)
            return config.stage === SLAStageType.LEAD_PROPOSAL;
          if (lead.status === LeadStatus.NEGOTIATION)
            return config.stage === SLAStageType.LEAD_NEGOTIATION;
          return false;
        });

        if (slaConfig) {
          slaThreshold = slaConfig.criticalThresholdDays;
        }

        if (lead.status === LeadStatus.WON || lead.status === LeadStatus.LOST) {
          // Completed lead
          const completionTime = lead.closedDate
            ? Math.floor(
                (new Date(lead.closedDate).getTime() -
                  new Date(lead.createdDate).getTime()) /
                  (1000 * 60 * 60 * 24),
              )
            : 0;

          completionTimes.push(completionTime);

          if (completionTime <= slaThreshold) {
            completedOnTime++;
          } else {
            completedLate++;
          }
        } else {
          // Pending lead
          pending++;
          if (daysSinceLastAction > slaThreshold) {
            breached++;
          }
        }
      }

      const averageCompletionTime =
        completionTimes.length > 0
          ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
          : 0;

      const complianceRate =
        totalTasks > 0 ? (completedOnTime / totalTasks) * 100 : 0;

      departmentPerformance.push({
        department: dept.name,
        totalTasks,
        completedOnTime,
        completedLate,
        pending,
        complianceRate: Math.round(complianceRate * 10) / 10,
        averageCompletionTimeDays: Math.round(averageCompletionTime),
        breachedTasks: breached,
      });
    }

    return departmentPerformance;
  }

  // NEW REPORT 5: Signed vs Pipeline Value Comparison
  async getValueComparison(
    startDate?: Date,
    endDate?: Date,
  ): Promise<ValueComparison> {
    const leadsQuery = this.leadsRepository.createQueryBuilder('lead');

    if (startDate && endDate) {
      leadsQuery.andWhere('lead.createdDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const leads = await leadsQuery.getMany();

    // Signed value (Won leads) - use actual agreement contract values
    const signedLeads = leads.filter((lead) => lead.status === LeadStatus.WON);

    // Get actual revenue from signed agreements for Won leads
    let signedValue = 0;
    for (const lead of signedLeads) {
      const agreement = await this.agreementsRepository.findOne({
        where: {
          leadId: lead.id,
          stage: 'Signed' as any,
        },
      });
      if (agreement) {
        signedValue += agreement.contractValue || 0;
      }
    }

    const signedCount = signedLeads.length;

    // Pipeline value (Active leads)
    const pipelineLeads = leads.filter((lead) =>
      [
        LeadStatus.NEW,
        LeadStatus.QUALIFIED,
        LeadStatus.PROPOSAL,
        LeadStatus.NEGOTIATION,
      ].includes(lead.status),
    );
    const pipelineValue = pipelineLeads.reduce(
      (sum, lead) => sum + (lead.estimatedBudget || 0),
      0,
    );
    const pipelineCount = pipelineLeads.length;

    // Calculate ratio
    const ratio = pipelineValue > 0 ? signedValue / pipelineValue : 0;
    const conversionRate =
      leads.length > 0 ? (signedCount / leads.length) * 100 : 0;

    // Breakdown by stage
    const byStage: {
      stage: string;
      count: number;
      value: number;
      percentage: number;
    }[] = [];

    const stages = [
      LeadStatus.NEW,
      LeadStatus.QUALIFIED,
      LeadStatus.PROPOSAL,
      LeadStatus.NEGOTIATION,
    ];

    for (const stage of stages) {
      const stageLeads = leads.filter((lead) => lead.status === stage);
      const stageValue = stageLeads.reduce(
        (sum, lead) => sum + (lead.estimatedBudget || 0),
        0,
      );
      const percentage =
        pipelineValue > 0 ? (stageValue / pipelineValue) * 100 : 0;

      byStage.push({
        stage,
        count: stageLeads.length,
        value: stageValue,
        percentage: Math.round(percentage * 10) / 10,
      });
    }

    return {
      signedValue,
      signedCount,
      pipelineValue,
      pipelineCount,
      ratio: Math.round(ratio * 100) / 100,
      conversionRate: Math.round(conversionRate * 10) / 10,
      byStage,
    };
  }

  async getAgreementPendingItems(
    startDate?: Date,
    endDate?: Date,
  ): Promise<AgreementPendingItems[]> {
    // Get all agreements that are not in final states
    const agreements = await this.agreementsRepository.find({
      where: {
        stage: In([
          AgreementStage.DRAFT,
          AgreementStage.LEGAL_REVIEW,
          AgreementStage.DELIVERY_REVIEW,
          AgreementStage.PROCUREMENT_REVIEW,
          AgreementStage.FINANCE_REVIEW,
          AgreementStage.CLIENT_REVIEW,
          AgreementStage.CEO_APPROVAL,
          AgreementStage.ULCCS_APPROVAL,
          AgreementStage.PENDING_SIGNATURE,
        ]),
      },
      relations: ['lead'],
    });

    // Get all pending approvals for these agreements
    const agreementIds = agreements.map((a) => a.id);
    const pendingApprovals = await this.approvalsRepository.find({
      where: {
        context: ApprovalContext.AGREEMENT,
        entityId: In(agreementIds),
        status: ApprovalStatus.PENDING,
      },
    });

    // Group by agreement stage
    const stageGroups: Record<string, AgreementPendingItems> = {};

    // Initialize all stages
    const allStages = [
      AgreementStage.DRAFT,
      AgreementStage.LEGAL_REVIEW,
      AgreementStage.DELIVERY_REVIEW,
      AgreementStage.PROCUREMENT_REVIEW,
      AgreementStage.FINANCE_REVIEW,
      AgreementStage.CLIENT_REVIEW,
      AgreementStage.CEO_APPROVAL,
      AgreementStage.ULCCS_APPROVAL,
      AgreementStage.PENDING_SIGNATURE,
    ];

    for (const stage of allStages) {
      stageGroups[stage] = {
        stage,
        pendingApprovals: 0,
        pendingReviews: {
          delivery: 0,
          procurement: 0,
          finance: 0,
          ceo: 0,
          ulccs: 0,
          legal: 0,
          sales: 0,
        },
        averageWaitTime: 0,
        totalItems: 0,
      };
    }

    // Count pending approvals by stage and type
    for (const approval of pendingApprovals) {
      const agreement = agreements.find((a) => a.id === approval.entityId);
      if (!agreement) continue;

      const stageGroup = stageGroups[agreement.stage];
      if (stageGroup) {
        stageGroup.pendingApprovals++;

        // Map approval stage to our categories
        switch (approval.stage) {
          case ApprovalStage.DELIVERY_MANAGER:
            stageGroup.pendingReviews.delivery++;
            break;
          case ApprovalStage.PROCUREMENT:
            stageGroup.pendingReviews.procurement++;
            break;
          case ApprovalStage.FINANCE:
            stageGroup.pendingReviews.finance++;
            break;
          case ApprovalStage.CEO:
            stageGroup.pendingReviews.ceo++;
            break;
          case ApprovalStage.ULCCS:
            stageGroup.pendingReviews.ulccs++;
            break;
          case ApprovalStage.LEGAL:
            stageGroup.pendingReviews.legal++;
            break;
          case ApprovalStage.ACCOUNT_MANAGER:
          case ApprovalStage.SALES_MANAGER:
            stageGroup.pendingReviews.sales++;
            break;
        }

        // Calculate wait time
        const waitTime = Date.now() - approval.requestedDate.getTime();
        const waitTimeDays = waitTime / (1000 * 60 * 60 * 24);
        stageGroup.averageWaitTime =
          (stageGroup.averageWaitTime * stageGroup.totalItems + waitTimeDays) /
          (stageGroup.totalItems + 1);
        stageGroup.totalItems++;
      }
    }

    // Convert to array and filter out stages with no pending items
    return Object.values(stageGroups).filter(
      (stage) => stage.pendingApprovals > 0,
    );
  }

  async getAgreementDelayReport(
    startDate?: Date,
    endDate?: Date,
  ): Promise<AgreementDelayReport[]> {
    const query = this.agreementDelaysRepository
      .createQueryBuilder('delay')
      .leftJoinAndSelect('delay.responsibleOwner', 'owner')
      .leftJoinAndSelect('delay.agreement', 'agreement');

    if (startDate && endDate) {
      query.andWhere('delay.startDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const delays = await query.getMany();

    // Group by date and owner
    const groupedDelays: Record<string, AgreementDelayReport> = {};

    for (const delay of delays) {
      const dateKey = delay.startDate.toISOString().split('T')[0]; // YYYY-MM-DD
      const ownerId = delay.responsibleOwnerId || 'unassigned';
      const ownerName = delay.responsibleOwner?.name || 'Unassigned';
      const key = `${dateKey}-${ownerId}`;

      if (!groupedDelays[key]) {
        groupedDelays[key] = {
          date: dateKey,
          ownerId,
          ownerName,
          totalDelays: 0,
          delaysByReason: {},
          averageDelayDuration: 0,
        };
      }

      const group = groupedDelays[key];
      group.totalDelays++;

      // Count by reason
      const reason = delay.delayReason;
      group.delaysByReason[reason] = (group.delaysByReason[reason] || 0) + 1;

      // Calculate average delay duration
      const duration = delay.delayDurationDays || 0;
      group.averageDelayDuration =
        (group.averageDelayDuration * (group.totalDelays - 1) + duration) /
        group.totalDelays;
    }

    return Object.values(groupedDelays).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }
}
