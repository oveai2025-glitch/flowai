/**
 * Metrics Module
 * 
 * Prometheus-compatible metrics for:
 * - Workflow executions
 * - Node executions
 * - Queue statistics
 * - LLM token usage
 * - HTTP requests
 * - Connector calls
 * 
 * @module lib/metrics
 */

import {
  Registry,
  Counter,
  Histogram,
  Gauge,
  collectDefaultMetrics,
} from 'prom-client';

// ============================================
// Registry
// ============================================

export const registry = new Registry();

// Collect default Node.js metrics
collectDefaultMetrics({ register: registry });

// ============================================
// Workflow Metrics
// ============================================

export const workflowRunsTotal = new Counter({
  name: 'wfaib_workflow_runs_total',
  help: 'Total number of workflow runs',
  labelNames: ['status', 'trigger_type', 'organization_id'] as const,
  registers: [registry],
});

export const workflowRunDuration = new Histogram({
  name: 'wfaib_workflow_run_duration_seconds',
  help: 'Duration of workflow runs in seconds',
  labelNames: ['workflow_id', 'status'] as const,
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300, 600],
  registers: [registry],
});

export const activeWorkflows = new Gauge({
  name: 'wfaib_active_workflows',
  help: 'Number of currently active workflows',
  labelNames: ['organization_id'] as const,
  registers: [registry],
});

// ============================================
// Node Metrics
// ============================================

export const nodeExecutionsTotal = new Counter({
  name: 'wfaib_node_executions_total',
  help: 'Total number of node executions',
  labelNames: ['node_type', 'status'] as const,
  registers: [registry],
});

export const nodeExecutionDuration = new Histogram({
  name: 'wfaib_node_execution_duration_seconds',
  help: 'Duration of node executions in seconds',
  labelNames: ['node_type'] as const,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
  registers: [registry],
});

// ============================================
// Queue Metrics
// ============================================

export const queueWaitingJobs = new Gauge({
  name: 'wfaib_queue_waiting_jobs',
  help: 'Number of jobs waiting in queue',
  labelNames: ['queue'] as const,
  registers: [registry],
});

export const queueActiveJobs = new Gauge({
  name: 'wfaib_queue_active_jobs',
  help: 'Number of jobs currently being processed',
  labelNames: ['queue'] as const,
  registers: [registry],
});

export const queueFailedJobs = new Gauge({
  name: 'wfaib_queue_failed_jobs',
  help: 'Number of failed jobs in queue',
  labelNames: ['queue'] as const,
  registers: [registry],
});

export const queueJobDuration = new Histogram({
  name: 'wfaib_queue_job_duration_seconds',
  help: 'Duration of queue job processing',
  labelNames: ['queue', 'status'] as const,
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120],
  registers: [registry],
});

// ============================================
// LLM Metrics
// ============================================

export const llmRequestsTotal = new Counter({
  name: 'wfaib_llm_requests_total',
  help: 'Total number of LLM API requests',
  labelNames: ['provider', 'model', 'status'] as const,
  registers: [registry],
});

export const llmTokensTotal = new Counter({
  name: 'wfaib_llm_tokens_total',
  help: 'Total number of LLM tokens used',
  labelNames: ['provider', 'model', 'type'] as const, // type: prompt, completion
  registers: [registry],
});

export const llmRequestDuration = new Histogram({
  name: 'wfaib_llm_request_duration_seconds',
  help: 'Duration of LLM API requests',
  labelNames: ['provider', 'model'] as const,
  buckets: [0.5, 1, 2, 5, 10, 20, 30, 60],
  registers: [registry],
});

export const llmCostTotal = new Counter({
  name: 'wfaib_llm_cost_usd_total',
  help: 'Total cost of LLM usage in USD',
  labelNames: ['provider', 'organization_id'] as const,
  registers: [registry],
});

// ============================================
// Connector Metrics
// ============================================

export const connectorRequestsTotal = new Counter({
  name: 'wfaib_connector_requests_total',
  help: 'Total number of connector requests',
  labelNames: ['connector', 'action', 'status'] as const,
  registers: [registry],
});

export const connectorRequestDuration = new Histogram({
  name: 'wfaib_connector_request_duration_seconds',
  help: 'Duration of connector requests',
  labelNames: ['connector', 'action'] as const,
  buckets: [0.1, 0.25, 0.5, 1, 2, 5, 10, 30],
  registers: [registry],
});

// ============================================
// HTTP Metrics
// ============================================

export const httpRequestsTotal = new Counter({
  name: 'wfaib_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'] as const,
  registers: [registry],
});

export const httpRequestDuration = new Histogram({
  name: 'wfaib_http_request_duration_seconds',
  help: 'Duration of HTTP requests',
  labelNames: ['method', 'path'] as const,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [registry],
});

// ============================================
// Business Metrics
// ============================================

export const organizationsTotal = new Gauge({
  name: 'wfaib_organizations_total',
  help: 'Total number of organizations',
  registers: [registry],
});

export const usersTotal = new Gauge({
  name: 'wfaib_users_total',
  help: 'Total number of users',
  registers: [registry],
});

export const subscriptionsByPlan = new Gauge({
  name: 'wfaib_subscriptions_by_plan',
  help: 'Number of subscriptions by plan',
  labelNames: ['plan'] as const,
  registers: [registry],
});

// ============================================
// Error Metrics
// ============================================

export const errorsTotal = new Counter({
  name: 'wfaib_errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'code'] as const,
  registers: [registry],
});

// ============================================
// Helper Functions
// ============================================

/**
 * Record a workflow run completion
 */
export function recordWorkflowRun(
  status: 'succeeded' | 'failed' | 'cancelled',
  triggerType: string,
  organizationId: string,
  durationSeconds: number,
  workflowId: string
): void {
  workflowRunsTotal.inc({ status, trigger_type: triggerType, organization_id: organizationId });
  workflowRunDuration.observe({ workflow_id: workflowId, status }, durationSeconds);
}

/**
 * Record a node execution
 */
export function recordNodeExecution(
  nodeType: string,
  status: 'succeeded' | 'failed' | 'skipped',
  durationSeconds?: number
): void {
  nodeExecutionsTotal.inc({ node_type: nodeType, status });
  
  if (durationSeconds !== undefined) {
    nodeExecutionDuration.observe({ node_type: nodeType }, durationSeconds);
  }
}

/**
 * Record LLM usage
 */
export function recordLLMUsage(
  provider: string,
  model: string,
  status: 'success' | 'error',
  promptTokens: number,
  completionTokens: number,
  durationSeconds: number,
  costUsd: number,
  organizationId: string
): void {
  llmRequestsTotal.inc({ provider, model, status });
  llmTokensTotal.inc({ provider, model, type: 'prompt' }, promptTokens);
  llmTokensTotal.inc({ provider, model, type: 'completion' }, completionTokens);
  llmRequestDuration.observe({ provider, model }, durationSeconds);
  
  if (costUsd > 0) {
    llmCostTotal.inc({ provider, organization_id: organizationId }, costUsd);
  }
}

/**
 * Record connector action
 */
export function recordConnectorAction(
  connector: string,
  action: string,
  status: 'success' | 'error',
  durationMs: number
): void {
  connectorRequestsTotal.inc({ connector, action, status });
  connectorRequestDuration.observe({ connector, action }, durationMs / 1000);
}

/**
 * Record HTTP request
 */
export function recordHttpRequest(
  method: string,
  path: string,
  status: number,
  durationMs: number
): void {
  // Normalize path to avoid cardinality explosion
  const normalizedPath = normalizePath(path);
  
  httpRequestsTotal.inc({ method, path: normalizedPath, status: String(status) });
  httpRequestDuration.observe({ method, path: normalizedPath }, durationMs / 1000);
}

/**
 * Record an error
 */
export function recordError(type: string, code: string): void {
  errorsTotal.inc({ type, code });
}

/**
 * Get metrics for Prometheus scraping
 */
export async function getMetrics(): Promise<string> {
  return registry.metrics();
}

/**
 * Get metrics content type
 */
export function getMetricsContentType(): string {
  return registry.contentType;
}

// ============================================
// Utilities
// ============================================

function normalizePath(path: string): string {
  // Replace UUIDs with :id placeholder
  let normalized = path.replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    ':id'
  );
  
  // Replace numeric IDs
  normalized = normalized.replace(/\/\d+/g, '/:id');
  
  // Remove query strings
  normalized = normalized.split('?')[0];
  
  // Limit path depth to prevent cardinality explosion
  const parts = normalized.split('/').slice(0, 5);
  
  return parts.join('/');
}

// ============================================
// Exports
// ============================================

export default registry;
