/**
 * FlowAtGenAi - Workflow Execution Engine
 * 
 * Core execution engine that processes workflows:
 * - Topological sorting for execution order
 * - Node execution with retry logic
 * - Data passing between nodes
 * - Error handling and recovery
 * - Parallel execution support
 * 
 * @module lib/workflow/execution-engine
 */

import { logger } from '../logger';
import type {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  WorkflowExecution,
  ExecutionStatus,
  NodeOutputData,
  NodeExecutionResult,
} from '../../types/workflow';

// ============================================
// Types
// ============================================

export interface ExecutionContext {
  workflowId: string;
  executionId: string;
  organizationId: string;
  userId?: string;
  input: Record<string, unknown>;
  variables: Map<string, unknown>;
  nodeResults: Map<string, NodeExecutionResult>;
  startTime: number;
  status: ExecutionStatus;
  currentNodeId?: string;
  error?: Error;
}

export interface NodeHandler {
  type: string;
  execute: (
    node: WorkflowNode,
    input: NodeOutputData,
    context: ExecutionContext
  ) => Promise<NodeOutputData>;
}

export interface ExecutionResult {
  success: boolean;
  status: ExecutionStatus;
  output?: unknown;
  error?: string;
  nodeResults: Record<string, NodeExecutionResult>;
  executionTime: number;
  nodesExecuted: number;
}

// ============================================
// Topological Sort
// ============================================

function topologicalSort(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[] {
  const inDegree = new Map<string, number>();
  const adjacencyList = new Map<string, string[]>();

  // Initialize
  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adjacencyList.set(node.id, []);
  }

  // Build graph
  for (const edge of edges) {
    const current = inDegree.get(edge.target) || 0;
    inDegree.set(edge.target, current + 1);
    adjacencyList.get(edge.source)?.push(edge.target);
  }

  // Find nodes with no incoming edges (triggers)
  const queue: string[] = [];
  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) {
      queue.push(nodeId);
    }
  }

  const sorted: string[] = [];

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    sorted.push(nodeId);

    for (const neighbor of adjacencyList.get(nodeId) || []) {
      const newDegree = (inDegree.get(neighbor) || 1) - 1;
      inDegree.set(neighbor, newDegree);

      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  // Check for cycles
  if (sorted.length !== nodes.length) {
    throw new Error('Workflow contains a cycle');
  }

  return sorted;
}

// ============================================
// Expression Resolver
// ============================================

function resolveExpression(
  template: string,
  context: ExecutionContext
): unknown {
  // Replace {{ expression }} with actual values
  const expressionRegex = /\{\{\s*(.+?)\s*\}\}/g;
  
  // If entire string is a single expression, return the actual value
  const singleMatch = template.match(/^\{\{\s*(.+?)\s*\}\}$/);
  if (singleMatch) {
    return evaluateExpression(singleMatch[1], context);
  }

  // Otherwise, do string replacement
  return template.replace(expressionRegex, (_, expression) => {
    const value = evaluateExpression(expression, context);
    return String(value ?? '');
  });
}

function evaluateExpression(
  expression: string,
  context: ExecutionContext
): unknown {
  const trimmed = expression.trim();

  // Handle $input
  if (trimmed === '$input') {
    return context.input;
  }

  // Handle $input.field
  if (trimmed.startsWith('$input.')) {
    const path = trimmed.substring(7);
    return getNestedValue(context.input, path);
  }

  // Handle $node.nodeId.data
  const nodeMatch = trimmed.match(/^\$node\['(.+?)'\]\.data(?:\.(.+))?$/);
  if (nodeMatch) {
    const nodeId = nodeMatch[1];
    const path = nodeMatch[2];
    const nodeResult = context.nodeResults.get(nodeId);
    if (!nodeResult) return undefined;
    
    const data = nodeResult.data?.main?.[0]?.[0]?.json;
    return path ? getNestedValue(data, path) : data;
  }

  // Handle $vars.name
  if (trimmed.startsWith('$vars.')) {
    const varName = trimmed.substring(6);
    return context.variables.get(varName);
  }

  // Handle $json (current node input)
  if (trimmed === '$json') {
    const lastNode = Array.from(context.nodeResults.keys()).pop();
    if (lastNode) {
      return context.nodeResults.get(lastNode)?.data?.main?.[0]?.[0]?.json;
    }
    return context.input;
  }

  // Handle $json.field
  if (trimmed.startsWith('$json.')) {
    const path = trimmed.substring(6);
    const lastNode = Array.from(context.nodeResults.keys()).pop();
    let data: unknown;
    if (lastNode) {
      data = context.nodeResults.get(lastNode)?.data?.main?.[0]?.[0]?.json;
    } else {
      data = context.input;
    }
    return getNestedValue(data, path);
  }

  // Direct property access
  return getNestedValue(context.input, trimmed);
}

function getNestedValue(obj: unknown, path: string): unknown {
  const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let result = obj;

  for (const key of keys) {
    if (result === null || result === undefined) return undefined;
    result = (result as Record<string, unknown>)[key];
  }

  return result;
}

// ============================================
// Node Handlers Registry
// ============================================

const nodeHandlers = new Map<string, NodeHandler>();

function registerHandler(handler: NodeHandler): void {
  nodeHandlers.set(handler.type, handler);
}

// Register built-in handlers
registerHandler({
  type: 'trigger-manual',
  execute: async (node, input, context) => {
    return {
      main: [[{ json: context.input }]],
    };
  },
});

registerHandler({
  type: 'trigger-webhook',
  execute: async (node, input, context) => {
    return {
      main: [[{ json: context.input }]],
    };
  },
});

registerHandler({
  type: 'trigger-schedule',
  execute: async (node, input, context) => {
    return {
      main: [[{ json: { triggeredAt: new Date().toISOString(), ...context.input } }]],
    };
  },
});

registerHandler({
  type: 'action-set',
  execute: async (node, input, context) => {
    const data = node.data as Record<string, unknown>;
    const mode = data.mode || 'manual';
    
    let result: Record<string, unknown> = {};
    
    if (mode === 'json' && data.jsonData) {
      result = typeof data.jsonData === 'string' 
        ? JSON.parse(data.jsonData as string)
        : data.jsonData as Record<string, unknown>;
    } else if (data.assignments) {
      const assignments = data.assignments as { assignments?: Array<{ name: string; value: unknown }> };
      for (const assignment of assignments.assignments || []) {
        result[assignment.name] = resolveExpression(String(assignment.value), context);
      }
    }

    // Merge with input unless keepOnlySet is true
    const keepOnlySet = data.keepOnlySet as boolean;
    const inputData = input.main?.[0]?.[0]?.json || {};
    const finalData = keepOnlySet ? result : { ...inputData, ...result };

    return {
      main: [[{ json: finalData }]],
    };
  },
});

registerHandler({
  type: 'action-http',
  execute: async (node, input, context) => {
    const data = node.data as Record<string, unknown>;
    const method = (data.method as string) || 'GET';
    let url = resolveExpression(String(data.url || ''), context) as string;
    
    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Build request options
    const options: RequestInit = {
      method,
      headers,
    };

    // Add body for POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(method) && data.body) {
      const body = resolveExpression(
        typeof data.body === 'string' ? data.body : JSON.stringify(data.body),
        context
      );
      options.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      const responseData = await response.json().catch(() => response.text());

      return {
        main: [[{
          json: {
            statusCode: response.status,
            headers: Object.fromEntries(response.headers.entries()),
            data: responseData,
          },
        }]],
      };
    } catch (error) {
      throw new Error(`HTTP request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

registerHandler({
  type: 'action-code',
  execute: async (node, input, context) => {
    const data = node.data as Record<string, unknown>;
    const code = data.code as string;
    const language = data.language as string || 'javascript';

    if (language !== 'javascript') {
      throw new Error(`Unsupported language: ${language}. Only JavaScript is supported.`);
    }

    // Create a sandboxed execution context
    const $input = {
      all: () => input.main?.[0] || [],
      first: () => input.main?.[0]?.[0],
      last: () => {
        const items = input.main?.[0] || [];
        return items[items.length - 1];
      },
      item: input.main?.[0]?.[0],
    };

    const $json = input.main?.[0]?.[0]?.json || {};

    try {
      // Execute code in a function scope
      const fn = new Function('$input', '$json', '$', `
        ${code}
      `);
      
      const result = await fn($input, $json, { input: $input, json: $json });
      
      // Normalize result
      if (Array.isArray(result)) {
        return {
          main: [result.map((item: unknown) => ({
            json: typeof item === 'object' && item !== null && 'json' in item
              ? (item as { json: unknown }).json
              : item,
          }))],
        };
      }

      return {
        main: [[{ json: result }]],
      };
    } catch (error) {
      throw new Error(`Code execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

registerHandler({
  type: 'logic-if',
  execute: async (node, input, context) => {
    const data = node.data as Record<string, unknown>;
    const conditions = data.conditions as { conditions: Array<{ leftValue: string; operator: string; rightValue: string }>; combinator: string };
    
    const inputData = input.main?.[0]?.[0]?.json || {};
    
    const evaluateCondition = (condition: { leftValue: string; operator: string; rightValue: string }): boolean => {
      const left = resolveExpression(condition.leftValue, context);
      const right = resolveExpression(condition.rightValue, context);
      
      switch (condition.operator) {
        case 'equals': return left === right;
        case 'notEquals': return left !== right;
        case 'contains': return String(left).includes(String(right));
        case 'notContains': return !String(left).includes(String(right));
        case 'greaterThan': return Number(left) > Number(right);
        case 'lessThan': return Number(left) < Number(right);
        case 'isEmpty': return left === null || left === undefined || left === '' || (Array.isArray(left) && left.length === 0);
        case 'isNotEmpty': return !(left === null || left === undefined || left === '' || (Array.isArray(left) && left.length === 0));
        case 'isTrue': return left === true || left === 'true' || left === 1;
        case 'isFalse': return left === false || left === 'false' || left === 0;
        default: return false;
      }
    };

    let result = conditions.combinator === 'and';
    for (const condition of conditions.conditions || []) {
      const conditionResult = evaluateCondition(condition as { leftValue: string; operator: string; rightValue: string });
      if (conditions.combinator === 'and') {
        result = result && conditionResult;
      } else {
        result = result || conditionResult;
      }
    }

    // Return data to appropriate output (true = output 0, false = output 1)
    return {
      main: result
        ? [[{ json: inputData }], []]
        : [[], [{ json: inputData }]],
    };
  },
});

registerHandler({
  type: 'action-wait',
  execute: async (node, input, context) => {
    const data = node.data as Record<string, unknown>;
    const amount = (data.amount as number) || 1;
    const unit = (data.unit as string) || 'seconds';
    
    let ms: number;
    switch (unit) {
      case 'seconds': ms = amount * 1000; break;
      case 'minutes': ms = amount * 60 * 1000; break;
      case 'hours': ms = amount * 60 * 60 * 1000; break;
      case 'days': ms = amount * 24 * 60 * 60 * 1000; break;
      default: ms = amount * 1000;
    }

    await new Promise((resolve) => setTimeout(resolve, Math.min(ms, 300000))); // Max 5 minutes

    return input;
  },
});

// ============================================
// Main Execution Engine
// ============================================

export class WorkflowExecutionEngine {
  private workflow: Workflow;
  private context: ExecutionContext;
  private executionOrder: string[];
  private nodeMap: Map<string, WorkflowNode>;
  private incomingEdges: Map<string, WorkflowEdge[]>;

  constructor(
    workflow: Workflow,
    executionId: string,
    organizationId: string,
    input: Record<string, unknown> = {}
  ) {
    this.workflow = workflow;
    this.nodeMap = new Map(workflow.nodes.map((n) => [n.id, n]));
    
    // Build incoming edges map
    this.incomingEdges = new Map();
    for (const edge of workflow.edges) {
      const edges = this.incomingEdges.get(edge.target) || [];
      edges.push(edge);
      this.incomingEdges.set(edge.target, edges);
    }

    // Get execution order
    this.executionOrder = topologicalSort(workflow.nodes, workflow.edges);

    // Initialize context
    this.context = {
      workflowId: workflow.id,
      executionId,
      organizationId,
      input,
      variables: new Map(),
      nodeResults: new Map(),
      startTime: Date.now(),
      status: 'running',
    };
  }

  async execute(): Promise<ExecutionResult> {
    logger.info('Starting workflow execution', {
      workflowId: this.workflow.id,
      executionId: this.context.executionId,
      nodeCount: this.workflow.nodes.length,
    });

    try {
      // Execute nodes in order
      for (const nodeId of this.executionOrder) {
        const node = this.nodeMap.get(nodeId);
        if (!node) continue;

        // Skip disabled nodes
        if (node.disabled) {
          logger.debug('Skipping disabled node', { nodeId, name: node.name });
          continue;
        }

        this.context.currentNodeId = nodeId;

        // Get input from incoming edges
        const input = this.getNodeInput(nodeId);

        // Execute node with retry
        const result = await this.executeNodeWithRetry(node, input);

        // Store result
        this.context.nodeResults.set(nodeId, result);

        logger.debug('Node executed', {
          nodeId,
          name: node.name,
          type: node.type,
          executionTime: result.executionTime,
        });
      }

      this.context.status = 'succeeded';

      // Get final output (from last node)
      const lastNodeId = this.executionOrder[this.executionOrder.length - 1];
      const lastResult = this.context.nodeResults.get(lastNodeId);

      logger.info('Workflow execution completed', {
        workflowId: this.workflow.id,
        executionId: this.context.executionId,
        executionTime: Date.now() - this.context.startTime,
        nodesExecuted: this.context.nodeResults.size,
      });

      return {
        success: true,
        status: 'succeeded',
        output: lastResult?.data?.main?.[0]?.[0]?.json,
        nodeResults: Object.fromEntries(this.context.nodeResults),
        executionTime: Date.now() - this.context.startTime,
        nodesExecuted: this.context.nodeResults.size,
      };
    } catch (error) {
      this.context.status = 'failed';
      this.context.error = error instanceof Error ? error : new Error(String(error));

      logger.error('Workflow execution failed', this.context.error, {
        workflowId: this.workflow.id,
        executionId: this.context.executionId,
        failedNodeId: this.context.currentNodeId,
      });

      return {
        success: false,
        status: 'failed',
        error: this.context.error.message,
        nodeResults: Object.fromEntries(this.context.nodeResults),
        executionTime: Date.now() - this.context.startTime,
        nodesExecuted: this.context.nodeResults.size,
      };
    }
  }

  private getNodeInput(nodeId: string): NodeOutputData {
    const incomingEdges = this.incomingEdges.get(nodeId) || [];

    if (incomingEdges.length === 0) {
      // This is a trigger node, use workflow input
      return { main: [[{ json: this.context.input }]] };
    }

    // Merge input from all incoming edges
    const items: Array<{ json: Record<string, unknown> }> = [];

    for (const edge of incomingEdges) {
      const sourceResult = this.context.nodeResults.get(edge.source);
      if (sourceResult?.data?.main) {
        // Get the appropriate output based on sourceHandle
        const outputIndex = edge.sourceHandle 
          ? parseInt(edge.sourceHandle.replace('output-', ''), 10) || 0
          : 0;
        const output = sourceResult.data.main[outputIndex] || sourceResult.data.main[0];
        if (output) {
          items.push(...output);
        }
      }
    }

    return { main: [items.length > 0 ? items : [{ json: {} }]] };
  }

  private async executeNodeWithRetry(
    node: WorkflowNode,
    input: NodeOutputData
  ): Promise<NodeExecutionResult> {
    const maxRetries = this.workflow.settings.maxRetries || 3;
    const retryDelay = this.workflow.settings.retryDelayMs || 1000;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const startTime = Date.now();

      try {
        const handler = nodeHandlers.get(node.type);
        
        if (!handler) {
          throw new Error(`No handler registered for node type: ${node.type}`);
        }

        const data = await handler.execute(node, input, this.context);

        return {
          startTime,
          executionTime: Date.now() - startTime,
          data,
          source: [],
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries) {
          logger.warn('Node execution failed, retrying', {
            nodeId: node.id,
            attempt: attempt + 1,
            maxRetries,
            error: lastError.message,
          });

          await new Promise((resolve) => 
            setTimeout(resolve, retryDelay * Math.pow(2, attempt))
          );
        }
      }
    }

    // All retries failed
    if (this.workflow.settings.errorHandling === 'continue') {
      return {
        startTime: Date.now(),
        executionTime: 0,
        data: { main: [[{ json: {} }]] },
        error: {
          message: lastError?.message || 'Unknown error',
          nodeId: node.id,
          nodeName: node.name,
        },
      };
    }

    throw lastError;
  }
}

// ============================================
// Export
// ============================================

export { registerHandler, nodeHandlers };

export default WorkflowExecutionEngine;
