/**
 * Analytics Service
 * 
 * The Analytics Service provides high-performance tracking and aggregation 
 * of platform performance, user activity, and resource utilization. It is 
 * built to provide real-time insights for dashboards and historical 
 * reporting for organization-wide auditing.
 * 
 * Design Objectives:
 * - Low Latency: Recording metrics must be non-blocking for workflow execution.
 * - Scalable Aggregation: Provides multi-window time-series data for visualization.
 * - Granular Tracking: Supports node-level latency and error rate analysis.
 * - Resource Accountability: Tracks credit consumption and API usage quotas.
 * 
 * Infrastructure Strategy:
 * In high-load scenarios, this service can be extended to buffer metrics 
 * in a message queue (e.g., Kafka or RabbitMQ) before persisting to or 
 * indexing into a specialized Time Series Database (TSDB).
 * 
 * @module lib/services/analytics-service
 * @see {@link https://docs.flowatgenai.com/architecture/analytics}
 */

import { PrismaClient } from '@prisma/client';

/**
 * Singleton database client for analytics persistence.
 * @internal
 */
const prisma = new PrismaClient();

/**
 * Enumeration of supported metric categories for the platform.
 * These are used as keys in the 'Metric' table.
 */
export enum MetricType {
  /** Total number of started/completed workflow runs */
  EXECUTION_COUNT = 'execution_count',
  /** Execution time in milliseconds for specific nodes */
  NODE_LATENCY = 'node_latency',
  /** Platform credit burn associated with resource usage */
  CREDIT_USAGE = 'credit_usage',
  /** Volume of external API requests triggered by connectors */
  API_CALLS = 'api_calls',
  /** Occurrences of caught or uncaught workflow errors */
  ERROR_RATE = 'error_rate',
}

/**
 * Time Windows for Aggregation
 */
export type TimeWindow = '1h' | '24h' | '7d' | '30d' | 'all';

export class AnalyticsService {
  /**
   * Records a raw metric point in the database
   * 
   * @param orgId The organization ID
   * @param metric The type of metric being recorded
   * @param value The numerical value of the metric
   * @param tags Optional metadata tags for filtering (e.g., workflowId, nodeId)
   */
  static async recordMetric(orgId: string, metric: MetricType, value: number, tags: Record<string, string> = {}) {
    console.debug(`[AnalyticsService] Recording ${metric}: ${value}`, tags);

    // In a high-scale production environment, we would batch these or send to a TSDB like InfluxDB.
    // For now, we store them in Prisma for simplicity and integrated reporting.
    return await prisma.metric.create({
      data: {
        organizationId: orgId,
        type: metric,
        value,
        metadata: tags as any,
        timestamp: new Date(),
      },
    });
  }

  /**
   * Tracks the execution of a specific workflow node
   * Useful for identifying bottlenecks in user flows.
   */
  static async trackNodeExecution(orgId: string, workflowId: string, nodeId: string, durationMs: number, success: boolean) {
    await this.recordMetric(orgId, MetricType.NODE_LATENCY, durationMs, { workflowId, nodeId });
    if (!success) {
      await this.recordMetric(orgId, MetricType.ERROR_RATE, 1, { workflowId, nodeId });
    }
  }

  /**
   * Retrieves aggregated dashboard data for an organization
   */
  static async getDashboardStats(orgId: string, window: TimeWindow = '24h') {
    const startTime = this.getStartTimeForWindow(window);

    // Execute multiple aggregations in parallel for performance
    const [totalExecutions, failedExecutions, creditsUsed, topWorkflows] = await Promise.all([
      // 1. Total Executions in window
      prisma.workflowExecution.count({
        where: {
          workflow: { organizationId: orgId },
          createdAt: { gte: startTime },
        },
      }),

      // 2. Failed Executions
      prisma.workflowExecution.count({
        where: {
          workflow: { organizationId: orgId },
          status: 'FAILED',
          createdAt: { gte: startTime },
        },
      }),

      // 3. Total Credits Spent
      prisma.metric.aggregate({
        where: {
          organizationId: orgId,
          type: MetricType.CREDIT_USAGE,
          timestamp: { gte: startTime },
        },
        _sum: { value: true },
      }),

      // 4. Top 5 active workflows by execution count
      prisma.workflowExecution.groupBy({
        by: ['workflowId'],
        where: {
          workflow: { organizationId: orgId },
          createdAt: { gte: startTime },
        },
        _count: { workflowId: true },
        orderBy: { _count: { workflowId: 'desc' } },
        take: 5,
      }),
    ]);

    // Format top workflows with names
    const workflowIds = topWorkflows.map((w) => w.workflowId);
    const workflows = await prisma.workflow.findMany({
      where: { id: { in: workflowIds } },
      select: { id: true, name: true },
    });

    const enrichedTopWorkflows = topWorkflows.map((tw) => ({
      id: tw.workflowId,
      name: workflows.find((w) => w.id === tw.workflowId)?.name || 'Unknown',
      count: tw._count.workflowId,
    }));

    return {
      totalExecutions,
      successRate: totalExecutions > 0 ? ((totalExecutions - failedExecutions) / totalExecutions) * 100 : 100,
      creditsUsed: creditsUsed._sum.value || 0,
      topWorkflows: enrichedTopWorkflows,
    };
  }

  /**
   * Generates a time-series dataset for charts
   */
  static async getTimeSeriesData(orgId: string, metric: MetricType, window: TimeWindow = '24h') {
    const startTime = this.getStartTimeForWindow(window);
    const rawMetrics = await prisma.metric.findMany({
      where: {
        organizationId: orgId,
        type: metric,
        timestamp: { gte: startTime },
      },
      orderBy: { timestamp: 'asc' },
    });

    // Bucket markers (every hour for 24h, every day for 30d)
    const interval = this.getBucketIntervalMs(window);
    const buckets: Record<string, number> = {};

    rawMetrics.forEach((m) => {
      const bucketKey = new Date(Math.floor(m.timestamp.getTime() / interval) * interval).toISOString();
      buckets[bucketKey] = (buckets[bucketKey] || 0) + m.value;
    });

    return Object.entries(buckets).map(([time, value]) => ({ time, value }));
  }

  /**
   * Internal helper to calculate start time based on window string
   */
  private static getStartTimeForWindow(window: TimeWindow): Date {
    const now = new Date();
    switch (window) {
      case '1h': return new Date(now.getTime() - 60 * 60 * 1000);
      case '24h': return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default: return new Date(0); // Epoch
    }
  }

  /**
   * Internal helper to determine chart granularity
   */
  private static getBucketIntervalMs(window: TimeWindow): number {
    switch (window) {
      case '1h': return 5 * 60 * 1000; // 5 min
      case '24h': return 60 * 60 * 1000; // 1 hour
      case '7d': return 12 * 60 * 60 * 1000; // 12 hours
      case '30d': return 24 * 60 * 60 * 1000; // 1 day
      default: return 7 * 24 * 60 * 60 * 1000; // 1 week
    }
  }
}

/**
 * Implementation Note:
 * 
 * Future scalability can be achieved by:
 * 1. Introduction of Redis for real-time counters (HyperLogLog, Sorted Sets).
 * 2. Moving old metrics to a cold storage solution (S3/BigQuery) after 90 days.
 * 3. Pre-calculating aggregates via periodic cron jobs (Materialized Views).
 */
