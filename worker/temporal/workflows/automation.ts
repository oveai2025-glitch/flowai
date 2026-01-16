/**
 * Automation Workflow
 * 
 * Core Temporal workflow that executes user-defined workflow definitions.
 * Provides durable execution with:
 * - Automatic state persistence
 * - Crash recovery and replay
 * - Timeout handling
 * - Error recovery
 * - Progress tracking via queries
 * 
 * @module worker/temporal/workflows/automation
 */

import {
  proxyActivities,
  defineSignal,
  defineQuery,
  setHandler,
  condition,
  sleep,
  ApplicationFailure,
  CancellationScope,
  isCancellation,
} from '@temporalio/workflow';

// Import activity types (not implementations - these run in separate context)
import type * as activities from '../activities/node-executor';

// ============================================
// Workflow Input/Output Types
// ============================================

export interface AutomationWorkflowInput {
  definition: WorkflowDefinition;
  input: Record<string, unknown>;
  organizationId: string;
  triggeredBy?: string;
  triggerType: 'manual' | 'webhook' | 'schedule' | 'api';
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

export interface NodeExecutionResult {
  nodeId: string;
  nodeType: string;
  status: 'success' | 'failed' | 'skipped';
  output?: unknown;
  error?: string;
  durationMs: number;
  timestamp: Date;
}

export interface WorkflowExecutionState {
  status: 'running' | 'paused' | 'completed' | 'failed';
  currentNode?: string;
  completedNodes: string[];
  nodeResults: Record<string, NodeExecutionResult>;
  variables: Record<string, unknown>;
  startedAt: Date;
  completedAt?: Date;
}

// ============================================
// Signals & Queries
// ============================================

// Signal to pause workflow execution
export const pauseSignal = defineSignal('pause');

// Signal to resume workflow execution
export const resumeSignal = defineSignal('resume');

// Signal to receive webhook callback data
export const webhookCallbackSignal = defineSignal<[string, unknown]>('webhookCallback');

// Signal for human task approval
export const humanApprovalSignal = defineSignal<[string, boolean, unknown?]>('humanApproval');

// Query for current execution state
export const getStateQuery = defineQuery<WorkflowExecutionState>('getState');

// Query for specific node result
export const getNodeResultQuery = defineQuery<NodeExecutionResult | null, [string]>('getNodeResult');

// ============================================
// Activity Configuration
// ============================================

// Configure activities with retry policies
const { executeNode, executeConnector, executeSandbox } = proxyActivities<typeof activities>({
  startToCloseTimeout: '5m',
  retry: {
    maximumAttempts: 3,
    initialInterval: '1s',
    maximumInterval: '30s',
    backoffCoefficient: 2,
    nonRetryableErrorTypes: [
      'SandboxSecurityError',
      'ConfigurationError',
      'AuthenticationError',
    ],
  },
});

// Long-running activities (e.g., HTTP with slow responses)
const { executeConnector: executeLongConnector } = proxyActivities<typeof activities>({
  startToCloseTimeout: '30m',
  heartbeatTimeout: '1m',
  retry: {
    maximumAttempts: 2,
    initialInterval: '5s',
    maximumInterval: '1m',
    backoffCoefficient: 2,
  },
});

// ============================================
// Main Workflow Implementation
// ============================================

export async function automationWorkflow(
  input: AutomationWorkflowInput
): Promise<{
  status: 'success' | 'failed';
  results: Record<string, NodeExecutionResult>;
  output?: unknown;
  error?: string;
}> {
  const { definition, input: triggerData, organizationId } = input;

  // Initialize execution state
  const state: WorkflowExecutionState = {
    status: 'running',
    completedNodes: [],
    nodeResults: {},
    variables: {
      $input: triggerData,
      $trigger: {
        type: input.triggerType,
        triggeredBy: input.triggeredBy,
        timestamp: new Date(),
      },
    },
    startedAt: new Date(),
  };

  // State for pause/resume
  let isPaused = false;

  // Pending webhook callbacks
  const webhookCallbacks = new Map<string, unknown>();

  // Pending human approvals
  const humanApprovals = new Map<string, { approved: boolean; data?: unknown }>();

  // ============================================
  // Signal Handlers
  // ============================================

  setHandler(pauseSignal, () => {
    isPaused = true;
    state.status = 'paused';
  });

  setHandler(resumeSignal, () => {
    isPaused = false;
    state.status = 'running';
  });

  setHandler(webhookCallbackSignal, (nodeId: string, data: unknown) => {
    webhookCallbacks.set(nodeId, data);
  });

  setHandler(humanApprovalSignal, (nodeId: string, approved: boolean, data?: unknown) => {
    humanApprovals.set(nodeId, { approved, data });
  });

  // ============================================
  // Query Handlers
  // ============================================

  setHandler(getStateQuery, () => state);

  setHandler(getNodeResultQuery, (nodeId: string) => {
    return state.nodeResults[nodeId] || null;
  });

  // ============================================
  // Build Execution Graph
  // ============================================

  const graph = buildExecutionGraph(definition);
  const startNodes = graph.getStartNodes();

  if (startNodes.length === 0) {
    throw ApplicationFailure.nonRetryable('Workflow has no trigger nodes');
  }

  // ============================================
  // Execute Workflow
  // ============================================

  try {
    // Execute starting from trigger nodes
    for (const startNode of startNodes) {
      await executeNodeChain(
        startNode,
        graph,
        state,
        organizationId,
        { isPaused: () => isPaused },
        { webhookCallbacks, humanApprovals }
      );
    }

    // Workflow completed successfully
    state.status = 'completed';
    state.completedAt = new Date();

    // Get final output (last node's output)
    const lastNodeId = state.completedNodes[state.completedNodes.length - 1];
    const lastResult = lastNodeId ? state.nodeResults[lastNodeId] : undefined;

    return {
      status: 'success',
      results: state.nodeResults,
      output: lastResult?.output,
    };
  } catch (error) {
    state.status = 'failed';
    state.completedAt = new Date();

    // Handle cancellation gracefully
    if (isCancellation(error)) {
      return {
        status: 'failed',
        results: state.nodeResults,
        error: 'Workflow was cancelled',
      };
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      status: 'failed',
      results: state.nodeResults,
      error: errorMessage,
    };
  }
}

// ============================================
// Node Execution Chain
// ============================================

async function executeNodeChain(
  nodeId: string,
  graph: ExecutionGraph,
  state: WorkflowExecutionState,
  organizationId: string,
  control: { isPaused: () => boolean },
  signals: {
    webhookCallbacks: Map<string, unknown>;
    humanApprovals: Map<string, { approved: boolean; data?: unknown }>;
  }
): Promise<void> {
  // Check for pause
  await condition(() => !control.isPaused(), '24h');

  // Skip if already executed (handles joins)
  if (state.completedNodes.includes(nodeId)) {
    return;
  }

  const node = graph.getNode(nodeId);
  if (!node) {
    throw ApplicationFailure.nonRetryable(`Node ${nodeId} not found in definition`);
  }

  state.currentNode = nodeId;

  // Execute the node
  const result = await executeNodeByType(
    node,
    state,
    organizationId,
    signals
  );

  // Store result
  state.nodeResults[nodeId] = result;
  state.completedNodes.push(nodeId);

  // Store output in variables for downstream nodes
  state.variables[`$node.${nodeId}`] = result.output;

  // Handle failure based on settings
  if (result.status === 'failed') {
    const errorHandling = graph.definition.settings?.errorHandling || 'stop';
    
    if (errorHandling === 'stop') {
      throw ApplicationFailure.nonRetryable(
        `Node ${node.data.label} failed: ${result.error}`
      );
    }
    // 'continue' - proceed to next nodes anyway
  }

  // Get next nodes
  const nextNodes = graph.getNextNodes(nodeId, result);

  // Execute next nodes (could be parallel branches)
  if (nextNodes.length === 1) {
    // Sequential execution
    await executeNodeChain(
      nextNodes[0],
      graph,
      state,
      organizationId,
      control,
      signals
    );
  } else if (nextNodes.length > 1) {
    // Parallel execution with cancellation scope
    await CancellationScope.cancellable(async () => {
      await Promise.all(
        nextNodes.map(nextNodeId =>
          executeNodeChain(
            nextNodeId,
            graph,
            state,
            organizationId,
            control,
            signals
          )
        )
      );
    });
  }
}

// ============================================
// Node Type Handlers
// ============================================

async function executeNodeByType(
  node: WorkflowNode,
  state: WorkflowExecutionState,
  organizationId: string,
  signals: {
    webhookCallbacks: Map<string, unknown>;
    humanApprovals: Map<string, { approved: boolean; data?: unknown }>;
  }
): Promise<NodeExecutionResult> {
  const startTime = Date.now();

  try {
    let output: unknown;

    switch (node.type) {
      // ============================================
      // Trigger Nodes
      // ============================================
      case 'trigger-manual':
      case 'trigger-webhook':
      case 'trigger-schedule':
      case 'trigger-api':
        // Triggers just pass through their input
        output = state.variables.$input;
        break;

      // ============================================
      // Wait/Delay Nodes
      // ============================================
      case 'wait-delay':
        const delayMs = (node.data.config?.duration as number) || 1000;
        await sleep(delayMs);
        output = state.variables[`$node.${getPreviousNodeId(node, state)}`];
        break;

      case 'wait-webhook':
        // Wait for webhook callback signal
        await condition(
          () => signals.webhookCallbacks.has(node.id),
          (node.data.config?.timeout as string) || '24h'
        );
        output = signals.webhookCallbacks.get(node.id);
        signals.webhookCallbacks.delete(node.id);
        break;

      // ============================================
      // Human Task Nodes
      // ============================================
      case 'human-approval':
        // Wait for human approval signal
        await condition(
          () => signals.humanApprovals.has(node.id),
          (node.data.config?.timeout as string) || '7d'
        );
        const approval = signals.humanApprovals.get(node.id);
        signals.humanApprovals.delete(node.id);
        
        if (!approval?.approved) {
          return {
            nodeId: node.id,
            nodeType: node.type,
            status: 'failed',
            error: 'Approval denied',
            durationMs: Date.now() - startTime,
            timestamp: new Date(),
          };
        }
        output = approval.data || { approved: true };
        break;

      // ============================================
      // Code/Transform Nodes
      // ============================================
      case 'transform-code':
      case 'transform-function':
        const codeInput = resolveNodeInput(node, state);
        output = await executeSandbox({
          code: node.data.config?.code as string || 'return input;',
          input: codeInput,
          variables: state.variables,
          timeout: (node.data.config?.timeout as number) || 5000,
          memoryLimit: (node.data.config?.memoryLimit as number) || 128,
        });
        break;

      // ============================================
      // Logic Nodes
      // ============================================
      case 'logic-if':
      case 'logic-switch':
        // These are handled by graph routing, just pass through
        output = resolveNodeInput(node, state);
        break;

      // ============================================
      // Connector Nodes
      // ============================================
      default:
        // Most nodes are connector actions
        if (node.type.startsWith('action-') || node.type.includes('-')) {
          const connectorInput = resolveNodeInput(node, state);
          output = await executeConnector({
            nodeId: node.id,
            nodeType: node.type,
            config: node.data.config || {},
            input: connectorInput,
            organizationId,
          });
        } else {
          throw ApplicationFailure.nonRetryable(`Unknown node type: ${node.type}`);
        }
    }

    return {
      nodeId: node.id,
      nodeType: node.type,
      status: 'success',
      output,
      durationMs: Date.now() - startTime,
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      nodeId: node.id,
      nodeType: node.type,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      durationMs: Date.now() - startTime,
      timestamp: new Date(),
    };
  }
}

// ============================================
// Execution Graph Builder
// ============================================

interface ExecutionGraph {
  definition: WorkflowDefinition;
  getNode: (id: string) => WorkflowNode | undefined;
  getStartNodes: () => string[];
  getNextNodes: (nodeId: string, result: NodeExecutionResult) => string[];
}

function buildExecutionGraph(definition: WorkflowDefinition): ExecutionGraph {
  const nodeMap = new Map(definition.nodes.map(n => [n.id, n]));
  
  // Build adjacency list
  const outgoing = new Map<string, WorkflowEdge[]>();
  const incoming = new Map<string, string[]>();

  for (const edge of definition.edges) {
    if (!outgoing.has(edge.source)) {
      outgoing.set(edge.source, []);
    }
    outgoing.get(edge.source)!.push(edge);

    if (!incoming.has(edge.target)) {
      incoming.set(edge.target, []);
    }
    incoming.get(edge.target)!.push(edge.source);
  }

  return {
    definition,
    
    getNode: (id) => nodeMap.get(id),
    
    getStartNodes: () => {
      // Nodes with no incoming edges (triggers)
      return definition.nodes
        .filter(n => !incoming.has(n.id) || incoming.get(n.id)!.length === 0)
        .filter(n => n.type.startsWith('trigger-'))
        .map(n => n.id);
    },
    
    getNextNodes: (nodeId, result) => {
      const edges = outgoing.get(nodeId) || [];
      const node = nodeMap.get(nodeId);

      // Handle conditional branching
      if (node?.type === 'logic-if') {
        const conditionResult = result.output as boolean;
        // Find edge with matching handle (output-0 for true, output-1 for false)
        const handleId = conditionResult ? 'output-0' : 'output-1';
        return edges
          .filter(e => e.sourceHandle === handleId || (!e.sourceHandle && conditionResult))
          .map(e => e.target);
      }

      if (node?.type === 'logic-switch') {
        const switchValue = result.output as string;
        // Find edge with matching handle
        return edges
          .filter(e => e.sourceHandle === switchValue || e.sourceHandle === 'default')
          .map(e => e.target);
      }

      // Default: all outgoing edges
      return edges.map(e => e.target);
    },
  };
}

// ============================================
// Utilities
// ============================================

function resolveNodeInput(node: WorkflowNode, state: WorkflowExecutionState): unknown {
  // Get the most recent input (from previous node or trigger)
  const completedNodes = state.completedNodes;
  
  if (completedNodes.length === 0) {
    return state.variables.$input;
  }

  const lastNodeId = completedNodes[completedNodes.length - 1];
  return state.variables[`$node.${lastNodeId}`] || state.variables.$input;
}

function getPreviousNodeId(node: WorkflowNode, state: WorkflowExecutionState): string | undefined {
  const completedNodes = state.completedNodes;
  return completedNodes[completedNodes.length - 1];
}

// Export for registration
export default automationWorkflow;
