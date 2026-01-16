/**
 * Billing Service
 * 
 * Manages organization billing, quotas, and usage:
 * - Plan management
 * - Usage tracking
 * - Quota enforcement
 * - Stripe integration
 * 
 * @module lib/billing
 */

import { db } from './db';
import { logger } from './logger';

// ============================================
// Plan Definitions
// ============================================

export interface PlanLimits {
  maxWorkflows: number;
  maxRunsPerMonth: number;
  maxTokensPerMonth: number;
  maxConnectors: number;
  maxTeamMembers: number;
  maxExecutionTimeMinutes: number;
  maxWebhooks: number;
  historyRetentionDays: number;
  features: {
    customConnectors: boolean;
    apiAccess: boolean;
    webhooks: boolean;
    priorityExecution: boolean;
    sso: boolean;
    auditLogs: boolean;
    dedicatedSupport: boolean;
    sla: boolean;
    customDomain: boolean;
    whiteLabel: boolean;
  };
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  FREE: {
    maxWorkflows: 5,
    maxRunsPerMonth: 500,
    maxTokensPerMonth: 10000,
    maxConnectors: 10,
    maxTeamMembers: 1,
    maxExecutionTimeMinutes: 5,
    maxWebhooks: 2,
    historyRetentionDays: 7,
    features: {
      customConnectors: false,
      apiAccess: false,
      webhooks: true,
      priorityExecution: false,
      sso: false,
      auditLogs: false,
      dedicatedSupport: false,
      sla: false,
      customDomain: false,
      whiteLabel: false,
    },
  },
  STARTER: {
    maxWorkflows: 20,
    maxRunsPerMonth: 5000,
    maxTokensPerMonth: 50000,
    maxConnectors: 25,
    maxTeamMembers: 3,
    maxExecutionTimeMinutes: 15,
    maxWebhooks: 10,
    historyRetentionDays: 30,
    features: {
      customConnectors: false,
      apiAccess: true,
      webhooks: true,
      priorityExecution: false,
      sso: false,
      auditLogs: false,
      dedicatedSupport: false,
      sla: false,
      customDomain: false,
      whiteLabel: false,
    },
  },
  PRO: {
    maxWorkflows: 100,
    maxRunsPerMonth: 25000,
    maxTokensPerMonth: 250000,
    maxConnectors: -1, // Unlimited
    maxTeamMembers: 10,
    maxExecutionTimeMinutes: 30,
    maxWebhooks: 50,
    historyRetentionDays: 90,
    features: {
      customConnectors: true,
      apiAccess: true,
      webhooks: true,
      priorityExecution: true,
      sso: true,
      auditLogs: true,
      dedicatedSupport: false,
      sla: false,
      customDomain: false,
      whiteLabel: false,
    },
  },
  BUSINESS: {
    maxWorkflows: 500,
    maxRunsPerMonth: 100000,
    maxTokensPerMonth: 1000000,
    maxConnectors: -1,
    maxTeamMembers: 50,
    maxExecutionTimeMinutes: 60,
    maxWebhooks: 200,
    historyRetentionDays: 365,
    features: {
      customConnectors: true,
      apiAccess: true,
      webhooks: true,
      priorityExecution: true,
      sso: true,
      auditLogs: true,
      dedicatedSupport: true,
      sla: true,
      customDomain: true,
      whiteLabel: false,
    },
  },
  ENTERPRISE: {
    maxWorkflows: -1, // Unlimited
    maxRunsPerMonth: -1,
    maxTokensPerMonth: -1,
    maxConnectors: -1,
    maxTeamMembers: -1,
    maxExecutionTimeMinutes: 120,
    maxWebhooks: -1,
    historyRetentionDays: -1, // Unlimited
    features: {
      customConnectors: true,
      apiAccess: true,
      webhooks: true,
      priorityExecution: true,
      sso: true,
      auditLogs: true,
      dedicatedSupport: true,
      sla: true,
      customDomain: true,
      whiteLabel: true,
    },
  },
};

// ============================================
// Quota Checking
// ============================================

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  usage?: number;
  limit?: number;
  percentUsed?: number;
}

/**
 * Check if organization can execute a run
 */
export async function checkRunQuota(organizationId: string): Promise<QuotaCheckResult> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    include: {
      usageRecords: {
        where: {
          period: getCurrentPeriod(),
        },
      },
    },
  });

  if (!org) {
    return { allowed: false, reason: 'Organization not found' };
  }

  const limits = PLAN_LIMITS[org.plan] || PLAN_LIMITS.FREE;
  const usage = org.usageRecords[0]?.runCount || 0;

  // -1 means unlimited
  if (limits.maxRunsPerMonth === -1) {
    return { allowed: true, usage, limit: -1 };
  }

  const limit = org.maxRunsPerMonth || limits.maxRunsPerMonth;
  const percentUsed = (usage / limit) * 100;

  if (usage >= limit) {
    return {
      allowed: false,
      reason: `Run quota exceeded (${usage}/${limit})`,
      usage,
      limit,
      percentUsed: 100,
    };
  }

  return { allowed: true, usage, limit, percentUsed };
}

/**
 * Check if organization can use more LLM tokens
 */
export async function checkTokenQuota(
  organizationId: string,
  requestedTokens: number
): Promise<QuotaCheckResult> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    include: {
      usageRecords: {
        where: {
          period: getCurrentPeriod(),
        },
      },
    },
  });

  if (!org) {
    return { allowed: false, reason: 'Organization not found' };
  }

  const limits = PLAN_LIMITS[org.plan] || PLAN_LIMITS.FREE;
  const usage = org.usageRecords[0]?.tokenCount || 0;

  if (limits.maxTokensPerMonth === -1) {
    return { allowed: true, usage, limit: -1 };
  }

  const limit = org.maxTokensPerMonth || limits.maxTokensPerMonth;
  const projectedUsage = usage + requestedTokens;

  if (projectedUsage > limit) {
    return {
      allowed: false,
      reason: `Token quota would be exceeded (${usage + requestedTokens}/${limit})`,
      usage,
      limit,
      percentUsed: (usage / limit) * 100,
    };
  }

  return { 
    allowed: true, 
    usage, 
    limit, 
    percentUsed: (usage / limit) * 100 
  };
}

/**
 * Check workflow limit
 */
export async function checkWorkflowLimit(organizationId: string): Promise<QuotaCheckResult> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    include: {
      workflows: {
        where: { isActive: true },
      },
    },
  });

  if (!org) {
    return { allowed: false, reason: 'Organization not found' };
  }

  const limits = PLAN_LIMITS[org.plan] || PLAN_LIMITS.FREE;
  const usage = org.workflows.length;

  if (limits.maxWorkflows === -1) {
    return { allowed: true, usage, limit: -1 };
  }

  const limit = org.maxWorkflows || limits.maxWorkflows;

  if (usage >= limit) {
    return {
      allowed: false,
      reason: `Workflow limit reached (${usage}/${limit})`,
      usage,
      limit,
      percentUsed: 100,
    };
  }

  return { allowed: true, usage, limit, percentUsed: (usage / limit) * 100 };
}

/**
 * Check if feature is available for plan
 */
export async function checkFeature(
  organizationId: string,
  feature: keyof PlanLimits['features']
): Promise<boolean> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
  });

  if (!org) return false;

  const limits = PLAN_LIMITS[org.plan] || PLAN_LIMITS.FREE;
  return limits.features[feature];
}

// ============================================
// Usage Tracking
// ============================================

/**
 * Increment run count for organization
 */
export async function incrementRunCount(organizationId: string): Promise<void> {
  const period = getCurrentPeriod();

  await db.usageRecord.upsert({
    where: {
      organizationId_period: {
        organizationId,
        period,
      },
    },
    update: {
      runCount: { increment: 1 },
    },
    create: {
      organizationId,
      period,
      runCount: 1,
    },
  });
}

/**
 * Increment token count for organization
 */
export async function incrementTokenCount(
  organizationId: string,
  tokens: number
): Promise<void> {
  const period = getCurrentPeriod();

  await db.usageRecord.upsert({
    where: {
      organizationId_period: {
        organizationId,
        period,
      },
    },
    update: {
      tokenCount: { increment: tokens },
    },
    create: {
      organizationId,
      period,
      tokenCount: tokens,
    },
  });
}

/**
 * Increment node execution count
 */
export async function incrementNodeCount(
  organizationId: string,
  count: number = 1
): Promise<void> {
  const period = getCurrentPeriod();

  await db.usageRecord.upsert({
    where: {
      organizationId_period: {
        organizationId,
        period,
      },
    },
    update: {
      nodeCount: { increment: count },
    },
    create: {
      organizationId,
      period,
      nodeCount: count,
    },
  });
}

/**
 * Get usage summary for organization
 */
export async function getUsageSummary(organizationId: string): Promise<{
  period: string;
  runs: { used: number; limit: number; percent: number };
  tokens: { used: number; limit: number; percent: number };
  workflows: { used: number; limit: number; percent: number };
  plan: string;
}> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    include: {
      usageRecords: {
        where: {
          period: getCurrentPeriod(),
        },
      },
      workflows: {
        where: { isActive: true },
      },
    },
  });

  if (!org) {
    throw new Error('Organization not found');
  }

  const limits = PLAN_LIMITS[org.plan] || PLAN_LIMITS.FREE;
  const usage = org.usageRecords[0];

  const calcPercent = (used: number, limit: number) => 
    limit === -1 ? 0 : Math.min((used / limit) * 100, 100);

  return {
    period: getCurrentPeriod(),
    runs: {
      used: usage?.runCount || 0,
      limit: limits.maxRunsPerMonth,
      percent: calcPercent(usage?.runCount || 0, limits.maxRunsPerMonth),
    },
    tokens: {
      used: usage?.tokenCount || 0,
      limit: limits.maxTokensPerMonth,
      percent: calcPercent(usage?.tokenCount || 0, limits.maxTokensPerMonth),
    },
    workflows: {
      used: org.workflows.length,
      limit: limits.maxWorkflows,
      percent: calcPercent(org.workflows.length, limits.maxWorkflows),
    },
    plan: org.plan,
  };
}

// ============================================
// Subscription Management
// ============================================

/**
 * Upgrade organization plan
 */
export async function upgradePlan(
  organizationId: string,
  newPlan: string,
  stripeSubscriptionId?: string
): Promise<void> {
  await db.organization.update({
    where: { id: organizationId },
    data: {
      plan: newPlan as 'FREE' | 'STARTER' | 'PRO' | 'BUSINESS' | 'ENTERPRISE',
      stripeSubscriptionId,
    },
  });

  logger.info('Plan upgraded', { organizationId, newPlan });
}

/**
 * Handle Stripe webhook for subscription events
 */
export async function handleSubscriptionEvent(
  event: {
    type: string;
    data: {
      object: {
        id: string;
        customer: string;
        status: string;
        items: {
          data: Array<{
            price: { id: string; product: string };
          }>;
        };
      };
    };
  }
): Promise<void> {
  const subscription = event.data.object;

  // Find organization by Stripe customer ID
  const org = await db.organization.findFirst({
    where: { stripeCustomerId: subscription.customer },
  });

  if (!org) {
    logger.warn('Organization not found for Stripe customer', {
      customerId: subscription.customer,
    });
    return;
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      // Map price ID to plan
      const plan = mapPriceIdToPlan(subscription.items.data[0]?.price.id);
      
      await db.organization.update({
        where: { id: org.id },
        data: {
          plan: plan as 'FREE' | 'STARTER' | 'PRO' | 'BUSINESS' | 'ENTERPRISE',
          stripeSubscriptionId: subscription.id,
        },
      });

      logger.info('Subscription updated', { 
        organizationId: org.id, 
        plan, 
        status: subscription.status 
      });
      break;
    }

    case 'customer.subscription.deleted': {
      await db.organization.update({
        where: { id: org.id },
        data: {
          plan: 'FREE',
          stripeSubscriptionId: null,
        },
      });

      logger.info('Subscription cancelled', { organizationId: org.id });
      break;
    }
  }
}

// ============================================
// Utilities
// ============================================

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function mapPriceIdToPlan(priceId: string): string {
  // Map Stripe price IDs to plan names
  // This would be configured via environment variables or database
  const priceMap: Record<string, string> = {
    [process.env.STRIPE_PRICE_STARTER || 'price_starter']: 'STARTER',
    [process.env.STRIPE_PRICE_PRO || 'price_pro']: 'PRO',
    [process.env.STRIPE_PRICE_BUSINESS || 'price_business']: 'BUSINESS',
    [process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise']: 'ENTERPRISE',
  };

  return priceMap[priceId] || 'FREE';
}

export default {
  checkRunQuota,
  checkTokenQuota,
  checkWorkflowLimit,
  checkFeature,
  incrementRunCount,
  incrementTokenCount,
  incrementNodeCount,
  getUsageSummary,
  upgradePlan,
  handleSubscriptionEvent,
  PLAN_LIMITS,
};
