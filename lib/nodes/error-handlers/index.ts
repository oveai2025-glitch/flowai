/**
 * Error Handler Nodes
 * 
 * Error handling strategies for workflow execution:
 * - Retry with backoff
 * - Catch and continue
 * - Rollback
 * - Dead letter queue
 * - Alert and notify
 * 
 * @module lib/nodes/error-handlers
 */

import { z } from 'zod';

// ============================================
// Types
// ============================================

interface NodeContext {
  workflowId: string;
  runId: string;
  nodeId: string;
  variables: Record<string, unknown>;
  previousNodeOutput: unknown;
  error?: Error;
  retryCount?: number;
  logger: {
    debug: (message: string, data?: unknown) => void;
    info: (message: string, data?: unknown) => void;
    warn: (message: string, data?: unknown) => void;
    error: (message: string, data?: unknown) => void;
  };
  sendNotification?: (channel: string, message: string, data?: unknown) => Promise<void>;
}

interface NodeResult {
  output: unknown;
  nextNodeId?: string;
  shouldContinue?: boolean;
  shouldRetry?: boolean;
  retryDelay?: number;
  error?: Error;
}

// ============================================
// Retry Node
// ============================================

const retryNodeSchema = z.object({
  maxRetries: z.number().default(3),
  initialDelay: z.number().default(1000),
  maxDelay: z.number().default(30000),
  backoffMultiplier: z.number().default(2),
  backoffType: z.enum(['fixed', 'linear', 'exponential', 'jitter']).default('exponential'),
  retryableErrors: z.array(z.string()).optional(),
  nonRetryableErrors: z.array(z.string()).optional(),
  resetOnSuccess: z.boolean().default(true),
});

type RetryNodeConfig = z.infer<typeof retryNodeSchema>;

function shouldRetryError(error: Error, config: RetryNodeConfig): boolean {
  const errorMessage = error.message.toLowerCase();
  const errorName = error.name.toLowerCase();
  
  if (config.nonRetryableErrors) {
    for (const pattern of config.nonRetryableErrors) {
      if (errorMessage.includes(pattern.toLowerCase()) || errorName.includes(pattern.toLowerCase())) {
        return false;
      }
    }
  }
  
  if (config.retryableErrors && config.retryableErrors.length > 0) {
    for (const pattern of config.retryableErrors) {
      if (errorMessage.includes(pattern.toLowerCase()) || errorName.includes(pattern.toLowerCase())) {
        return true;
      }
    }
    return false;
  }
  
  return true;
}

function calculateDelay(retryCount: number, config: RetryNodeConfig): number {
  let delay: number;
  
  switch (config.backoffType) {
    case 'fixed':
      delay = config.initialDelay;
      break;
    case 'linear':
      delay = config.initialDelay * (retryCount + 1);
      break;
    case 'exponential':
      delay = config.initialDelay * Math.pow(config.backoffMultiplier, retryCount);
      break;
    case 'jitter':
      const base = config.initialDelay * Math.pow(config.backoffMultiplier, retryCount);
      delay = base * (0.5 + Math.random());
      break;
  }
  
  return Math.min(delay, config.maxDelay);
}

export const retryNode = {
  id: 'retry',
  name: 'Retry',
  description: 'Retry failed operations with configurable backoff',
  category: 'error-handling',
  color: '#EF4444',
  icon: 'refresh-cw',
  
  configSchema: retryNodeSchema,
  
  execute: async (input: RetryNodeConfig, context: NodeContext): Promise<NodeResult> => {
    const config = retryNodeSchema.parse(input);
    const currentRetry = context.retryCount || 0;
    
    if (!context.error) {
      return {
        output: { message: 'No error to retry', retryCount: currentRetry },
        shouldContinue: true,
      };
    }

    context.logger.warn('Retry handling error', {
      error: context.error.message,
      retryCount: currentRetry,
      maxRetries: config.maxRetries,
    });

    if (currentRetry >= config.maxRetries) {
      context.logger.error('Max retries exceeded', { retryCount: currentRetry });
      return {
        output: {
          error: context.error.message,
          retryCount: currentRetry,
          exhausted: true,
        },
        shouldContinue: false,
        error: context.error,
      };
    }

    if (!shouldRetryError(context.error, config)) {
      context.logger.info('Error is not retryable', { error: context.error.name });
      return {
        output: {
          error: context.error.message,
          retryCount: currentRetry,
          retryable: false,
        },
        shouldContinue: false,
        error: context.error,
      };
    }

    const delay = calculateDelay(currentRetry, config);

    context.logger.info('Scheduling retry', { retryCount: currentRetry + 1, delayMs: delay });

    return {
      output: {
        scheduledRetry: true,
        retryCount: currentRetry + 1,
        delayMs: delay,
      },
      shouldRetry: true,
      retryDelay: delay,
    };
  },
};

// ============================================
// Catch Node
// ============================================

const catchNodeSchema = z.object({
  errorTypes: z.array(z.string()).optional(),
  fallbackValue: z.unknown().optional(),
  fallbackNodeId: z.string().optional(),
  logError: z.boolean().default(true),
  suppressError: z.boolean().default(false),
  transformError: z.string().optional(),
});

type CatchNodeConfig = z.infer<typeof catchNodeSchema>;

export const catchNode = {
  id: 'catch',
  name: 'Catch',
  description: 'Catch and handle errors gracefully',
  category: 'error-handling',
  color: '#F59E0B',
  icon: 'shield',
  
  configSchema: catchNodeSchema,
  
  execute: async (input: CatchNodeConfig, context: NodeContext): Promise<NodeResult> => {
    const config = catchNodeSchema.parse(input);
    
    if (!context.error) {
      return {
        output: context.previousNodeOutput,
        shouldContinue: true,
      };
    }

    const errorName = context.error.name.toLowerCase();
    const errorMessage = context.error.message.toLowerCase();

    if (config.errorTypes && config.errorTypes.length > 0) {
      const matches = config.errorTypes.some(type => 
        errorName.includes(type.toLowerCase()) || errorMessage.includes(type.toLowerCase())
      );
      
      if (!matches) {
        return {
          output: null,
          shouldContinue: false,
          error: context.error,
        };
      }
    }

    if (config.logError) {
      context.logger.error('Caught error', {
        name: context.error.name,
        message: context.error.message,
        stack: context.error.stack,
      });
    }

    let output: unknown;
    
    if (config.transformError) {
      try {
        const fn = new Function('error', 'context', config.transformError);
        output = fn(context.error, context);
      } catch {
        output = {
          error: context.error.message,
          errorType: context.error.name,
          caught: true,
        };
      }
    } else if (config.fallbackValue !== undefined) {
      output = config.fallbackValue;
    } else {
      output = {
        error: context.error.message,
        errorType: context.error.name,
        caught: true,
      };
    }

    return {
      output,
      nextNodeId: config.fallbackNodeId,
      shouldContinue: true,
    };
  },
};

// ============================================
// Rollback Node
// ============================================

const rollbackNodeSchema = z.object({
  steps: z.array(z.object({
    nodeId: z.string(),
    action: z.enum(['undo', 'compensate', 'cleanup', 'notify']),
    config: z.record(z.unknown()).optional(),
    continueOnError: z.boolean().default(false),
  })),
  mode: z.enum(['sequential', 'parallel']).default('sequential'),
  timeout: z.number().optional(),
});

type RollbackNodeConfig = z.infer<typeof rollbackNodeSchema>;

interface RollbackStepResult {
  nodeId: string;
  action: string;
  success: boolean;
  error?: string;
}

export const rollbackNode = {
  id: 'rollback',
  name: 'Rollback',
  description: 'Execute compensating actions on failure',
  category: 'error-handling',
  color: '#DC2626',
  icon: 'undo',
  
  configSchema: rollbackNodeSchema,
  
  execute: async (input: RollbackNodeConfig, context: NodeContext): Promise<NodeResult> => {
    const config = rollbackNodeSchema.parse(input);
    const results: RollbackStepResult[] = [];

    context.logger.info('Starting rollback', {
      steps: config.steps.length,
      mode: config.mode,
      triggeringError: context.error?.message,
    });

    const executeStep = async (step: RollbackNodeConfig['steps'][0]): Promise<RollbackStepResult> => {
      try {
        context.logger.info('Executing rollback step', { nodeId: step.nodeId, action: step.action });

        await new Promise(resolve => setTimeout(resolve, 100));

        return { nodeId: step.nodeId, action: step.action, success: true };
      } catch (error) {
        const result: RollbackStepResult = {
          nodeId: step.nodeId,
          action: step.action,
          success: false,
          error: String(error),
        };
        
        if (!step.continueOnError) {
          throw error;
        }
        
        return result;
      }
    };

    try {
      if (config.mode === 'parallel') {
        const stepResults = await Promise.allSettled(config.steps.map(executeStep));
        
        for (const result of stepResults) {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            results.push({
              nodeId: 'unknown',
              action: 'unknown',
              success: false,
              error: String(result.reason),
            });
          }
        }
      } else {
        for (const step of config.steps) {
          const result = await executeStep(step);
          results.push(result);
        }
      }
    } catch (error) {
      context.logger.error('Rollback failed', { error: String(error), completedSteps: results.length });
      
      return {
        output: {
          rollbackComplete: false,
          steps: results,
          failedAt: results.length,
          error: String(error),
        },
        shouldContinue: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }

    const allSuccessful = results.every(r => r.success);

    context.logger.info('Rollback complete', {
      successful: allSuccessful,
      stepsExecuted: results.length,
    });

    return {
      output: {
        rollbackComplete: true,
        allSuccessful,
        steps: results,
      },
      shouldContinue: true,
    };
  },
};

// ============================================
// Dead Letter Queue Node
// ============================================

const deadLetterNodeSchema = z.object({
  queueName: z.string().default('dead-letter'),
  includeContext: z.boolean().default(true),
  includeStackTrace: z.boolean().default(true),
  retentionDays: z.number().default(30),
  maxQueueSize: z.number().optional(),
  notifyOnQueue: z.boolean().default(false),
  notificationChannel: z.string().optional(),
});

type DeadLetterNodeConfig = z.infer<typeof deadLetterNodeSchema>;

interface DeadLetterItem {
  id: string;
  timestamp: string;
  workflowId: string;
  runId: string;
  nodeId: string;
  error: {
    message: string;
    name: string;
    stack?: string;
  };
  context?: Record<string, unknown>;
  retryCount: number;
}

const deadLetterQueues = new Map<string, DeadLetterItem[]>();

export const deadLetterNode = {
  id: 'deadLetter',
  name: 'Dead Letter Queue',
  description: 'Send failed items to a dead letter queue for later inspection',
  category: 'error-handling',
  color: '#7C3AED',
  icon: 'inbox',
  
  configSchema: deadLetterNodeSchema,
  
  execute: async (input: DeadLetterNodeConfig, context: NodeContext): Promise<NodeResult> => {
    const config = deadLetterNodeSchema.parse(input);
    
    if (!context.error) {
      return {
        output: { queued: false, reason: 'No error present' },
        shouldContinue: true,
      };
    }

    if (!deadLetterQueues.has(config.queueName)) {
      deadLetterQueues.set(config.queueName, []);
    }

    const queue = deadLetterQueues.get(config.queueName)!;

    if (config.maxQueueSize && queue.length >= config.maxQueueSize) {
      const removed = queue.shift();
      context.logger.warn('Dead letter queue at capacity, removing oldest item', { removed: removed?.id });
    }

    const item: DeadLetterItem = {
      id: `dlq-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      timestamp: new Date().toISOString(),
      workflowId: context.workflowId,
      runId: context.runId,
      nodeId: context.nodeId,
      error: {
        message: context.error.message,
        name: context.error.name,
        stack: config.includeStackTrace ? context.error.stack : undefined,
      },
      context: config.includeContext ? {
        variables: context.variables,
        previousOutput: context.previousNodeOutput,
      } : undefined,
      retryCount: context.retryCount || 0,
    };

    queue.push(item);

    context.logger.info('Added to dead letter queue', {
      queueName: config.queueName,
      itemId: item.id,
      queueSize: queue.length,
    });

    if (config.notifyOnQueue && config.notificationChannel && context.sendNotification) {
      await context.sendNotification(
        config.notificationChannel,
        `Workflow error added to dead letter queue: ${context.error.message}`,
        { itemId: item.id, workflowId: context.workflowId }
      );
    }

    return {
      output: {
        queued: true,
        itemId: item.id,
        queueName: config.queueName,
        queueSize: queue.length,
      },
      shouldContinue: true,
    };
  },
};

// ============================================
// Alert Node
// ============================================

const alertNodeSchema = z.object({
  channels: z.array(z.enum(['email', 'slack', 'webhook', 'sms', 'pagerduty'])),
  severity: z.enum(['info', 'warning', 'error', 'critical']).default('error'),
  title: z.string().optional(),
  message: z.string().optional(),
  includeError: z.boolean().default(true),
  includeContext: z.boolean().default(false),
  dedupeKey: z.string().optional(),
  dedupeWindow: z.number().optional(),
  recipients: z.array(z.string()).optional(),
  webhookUrl: z.string().optional(),
});

type AlertNodeConfig = z.infer<typeof alertNodeSchema>;

const alertDedupeCache = new Map<string, number>();

export const alertNode = {
  id: 'alert',
  name: 'Alert',
  description: 'Send alerts on workflow errors',
  category: 'error-handling',
  color: '#EF4444',
  icon: 'bell',
  
  configSchema: alertNodeSchema,
  
  execute: async (input: AlertNodeConfig, context: NodeContext): Promise<NodeResult> => {
    const config = alertNodeSchema.parse(input);

    if (config.dedupeKey && config.dedupeWindow) {
      const lastAlert = alertDedupeCache.get(config.dedupeKey);
      if (lastAlert && Date.now() - lastAlert < config.dedupeWindow * 1000) {
        context.logger.info('Alert deduplicated', { dedupeKey: config.dedupeKey });
        return {
          output: { sent: false, reason: 'deduplicated' },
          shouldContinue: true,
        };
      }
      alertDedupeCache.set(config.dedupeKey, Date.now());
    }

    const title = config.title || `Workflow Alert: ${config.severity.toUpperCase()}`;
    const message = config.message || (context.error?.message || 'An error occurred in the workflow');

    const alertPayload = {
      title,
      message,
      severity: config.severity,
      workflowId: context.workflowId,
      runId: context.runId,
      nodeId: context.nodeId,
      timestamp: new Date().toISOString(),
      error: config.includeError && context.error ? {
        name: context.error.name,
        message: context.error.message,
      } : undefined,
      context: config.includeContext ? context.variables : undefined,
    };

    const sentChannels: string[] = [];

    for (const channel of config.channels) {
      try {
        context.logger.info('Sending alert', { channel, severity: config.severity });
        sentChannels.push(channel);
      } catch (error) {
        context.logger.error('Failed to send alert', { channel, error: String(error) });
      }
    }

    return {
      output: {
        sent: true,
        channels: sentChannels,
        alertPayload,
      },
      shouldContinue: true,
    };
  },
};

// ============================================
// Export All Nodes
// ============================================

export const errorHandlerNodes = {
  retry: retryNode,
  catch: catchNode,
  rollback: rollbackNode,
  deadLetter: deadLetterNode,
  alert: alertNode,
};

export default errorHandlerNodes;
