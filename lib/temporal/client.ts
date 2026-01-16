/**
 * Temporal Client Wrapper
 * 
 * High-level API for workflow operations:
 * - Starting workflow executions
 * - Querying workflow status
 * - Signaling running workflows
 * - Cancelling workflows
 * 
 * @module lib/temporal/client
 */

import { 
  Client, 
  WorkflowHandle,
  WorkflowExecutionInfo,
  WorkflowNotFoundError,
} from '@temporalio/client';
import { getTemporalClient, getTemporalConfig } from './connection';
import { logger } from '../logger';
import { nanoid } from 'nanoid';

// ============================================
// Types
// ============================================

export interface StartWorkflowOptions {
  /** Unique workflow ID (auto-generated if not provided) */
  workflowId?: string;
  /** Workflow definition from database */
  definition: WorkflowDefinition;
  /** Input data for the workflow */
  input: Record<string, unknown>;
  /** Organization ID for tenant isolation */
  organizationId: string;
  /** User who triggered the workflow */
  triggeredBy?: string;
  /** Trigger type */
  triggerType: 'manual' | 'webhook' | 'schedule' | 'api';
  /** Custom search attributes for filtering */
  searchAttributes?: Record<string, unknown>;
  /** Retry policy override */
  retryPolicy?: RetryPolicy;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  settings?: WorkflowSettings;
}

export interface WorkflowNode {
  id: string;
  type: string;
  data: {
    label: string;
    config?: Record<string, unknown>;
  };
  position: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface WorkflowSettings {
  timeout?: number;
  retryCount?: number;
  errorHandling?: 'stop' | 'continue' | 'retry';
}

export interface RetryPolicy {
  maximumAttempts?: number;
  initialInterval?: string;
  maximumInterval?: string;
  backoffCoefficient?: number;
}

export interface WorkflowStatus {
  workflowId: string;
  runId: string;
  status: 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled' | 'terminated';
  startTime: Date;
  closeTime?: Date;
  result?: unknown;
  error?: {
    message: string;
    type: string;
  };
  historyLength: number;
}

export interface WorkflowListOptions {
  organizationId: string;
  status?: 'running' | 'completed' | 'failed';
  workflowType?: string;
  pageSize?: number;
  nextPageToken?: string;
}

// ============================================
// Task Queue Configuration
// ============================================

const DEFAULT_TASK_QUEUE = 'wfaib-main';

export function getTaskQueue(organizationId: string, tier?: 'standard' | 'premium'): string {
  // Premium tenants get dedicated queues
  if (tier === 'premium') {
    return `wfaib-premium-${organizationId}`;
  }
  return DEFAULT_TASK_QUEUE;
}

// ============================================
// Workflow Operations
// ============================================

/**
 * Start a new workflow execution
 */
export async function startWorkflow(options: StartWorkflowOptions): Promise<{
  workflowId: string;
  runId: string;
}> {
  const client = await getTemporalClient();
  const config = getTemporalConfig();

  // Generate unique workflow ID if not provided
  const workflowId = options.workflowId || `run-${nanoid(12)}`;
  
  // Determine task queue based on tenant tier (would query org settings)
  const taskQueue = getTaskQueue(options.organizationId);

  logger.info('Starting workflow', {
    workflowId,
    workflowName: options.definition.name,
    organizationId: options.organizationId,
    triggerType: options.triggerType,
    taskQueue,
  });

  try {
    // Start the workflow using Temporal client
    const handle = await client.workflow.start('automationWorkflow', {
      workflowId,
      taskQueue,
      args: [{
        definition: options.definition,
        input: options.input,
        organizationId: options.organizationId,
        triggeredBy: options.triggeredBy,
        triggerType: options.triggerType,
      }],
      // Workflow-level timeout (e.g., 24 hours max)
      workflowExecutionTimeout: options.definition.settings?.timeout 
        ? `${options.definition.settings.timeout}ms`
        : '24h',
      // Retry policy for the entire workflow
      retry: options.retryPolicy ? {
        maximumAttempts: options.retryPolicy.maximumAttempts || 3,
        initialInterval: options.retryPolicy.initialInterval || '1s',
        maximumInterval: options.retryPolicy.maximumInterval || '1m',
        backoffCoefficient: options.retryPolicy.backoffCoefficient || 2,
      } : undefined,
      // Search attributes for filtering in Temporal UI
      searchAttributes: {
        OrganizationId: [options.organizationId],
        WorkflowName: [options.definition.name],
        TriggerType: [options.triggerType],
        ...(options.searchAttributes || {}),
      },
    });

    const runId = handle.firstExecutionRunId;

    logger.info('Workflow started successfully', {
      workflowId,
      runId,
    });

    return { workflowId, runId };
  } catch (error) {
    logger.error('Failed to start workflow', error, {
      workflowId,
      organizationId: options.organizationId,
    });
    throw new WorkflowStartError('Failed to start workflow execution', error);
  }
}

/**
 * Get workflow execution status
 */
export async function getWorkflowStatus(workflowId: string): Promise<WorkflowStatus> {
  const client = await getTemporalClient();

  try {
    const handle = client.workflow.getHandle(workflowId);
    const description = await handle.describe();

    return mapWorkflowDescription(description);
  } catch (error) {
    if (error instanceof WorkflowNotFoundError) {
      throw new WorkflowNotFoundError(`Workflow ${workflowId} not found`);
    }
    throw error;
  }
}

/**
 * Get workflow result (waits for completion if still running)
 */
export async function getWorkflowResult(workflowId: string): Promise<unknown> {
  const client = await getTemporalClient();
  const handle = client.workflow.getHandle(workflowId);
  
  return handle.result();
}

/**
 * Cancel a running workflow
 */
export async function cancelWorkflow(workflowId: string, reason?: string): Promise<void> {
  const client = await getTemporalClient();
  const handle = client.workflow.getHandle(workflowId);

  logger.info('Cancelling workflow', { workflowId, reason });

  await handle.cancel();
}

/**
 * Terminate a workflow immediately (no cleanup)
 */
export async function terminateWorkflow(workflowId: string, reason?: string): Promise<void> {
  const client = await getTemporalClient();
  const handle = client.workflow.getHandle(workflowId);

  logger.warn('Terminating workflow', { workflowId, reason });

  await handle.terminate(reason);
}

/**
 * Send a signal to a running workflow
 */
export async function signalWorkflow(
  workflowId: string, 
  signalName: string, 
  args: unknown[]
): Promise<void> {
  const client = await getTemporalClient();
  const handle = client.workflow.getHandle(workflowId);

  logger.info('Signaling workflow', { workflowId, signalName });

  await handle.signal(signalName, ...args);
}

/**
 * Query workflow state without affecting execution
 */
export async function queryWorkflow(
  workflowId: string,
  queryName: string,
  args?: unknown[]
): Promise<unknown> {
  const client = await getTemporalClient();
  const handle = client.workflow.getHandle(workflowId);

  return handle.query(queryName, ...(args || []));
}

/**
 * List workflows for an organization
 */
export async function listWorkflows(options: WorkflowListOptions): Promise<{
  workflows: WorkflowStatus[];
  nextPageToken?: string;
}> {
  const client = await getTemporalClient();

  // Build query filter
  const queryParts: string[] = [`OrganizationId = "${options.organizationId}"`];
  
  if (options.status === 'running') {
    queryParts.push('ExecutionStatus = "Running"');
  } else if (options.status === 'completed') {
    queryParts.push('ExecutionStatus = "Completed"');
  } else if (options.status === 'failed') {
    queryParts.push('ExecutionStatus = "Failed"');
  }

  if (options.workflowType) {
    queryParts.push(`WorkflowType = "${options.workflowType}"`);
  }

  const query = queryParts.join(' AND ');

  const result = await client.workflow.list({
    query,
    pageSize: options.pageSize || 50,
    nextPageToken: options.nextPageToken ? Buffer.from(options.nextPageToken, 'base64') : undefined,
  });

  const workflows: WorkflowStatus[] = [];
  
  for await (const workflow of result) {
    workflows.push(mapWorkflowDescription(workflow));
    if (workflows.length >= (options.pageSize || 50)) break;
  }

  return {
    workflows,
    nextPageToken: result.nextPageToken 
      ? Buffer.from(result.nextPageToken).toString('base64')
      : undefined,
  };
}

// ============================================
// Helpers
// ============================================

function mapWorkflowDescription(info: WorkflowExecutionInfo): WorkflowStatus {
  const statusMap: Record<string, WorkflowStatus['status']> = {
    RUNNING: 'running',
    COMPLETED: 'succeeded',
    FAILED: 'failed',
    CANCELED: 'cancelled',
    TERMINATED: 'terminated',
    CONTINUED_AS_NEW: 'running',
    TIMED_OUT: 'failed',
  };

  return {
    workflowId: info.workflowId,
    runId: info.runId,
    status: statusMap[info.status.name] || 'pending',
    startTime: info.startTime,
    closeTime: info.closeTime || undefined,
    historyLength: info.historyLength,
  };
}

// ============================================
// Error Types
// ============================================

export class WorkflowStartError extends Error {
  public readonly cause: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'WorkflowStartError';
    this.cause = cause;
  }
}

export { WorkflowNotFoundError };
