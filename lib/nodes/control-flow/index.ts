/**
 * Workflow Control Nodes
 * 
 * Core control flow nodes for workflow execution:
 * - Loop (forEach, while, for)
 * - Switch/Router
 * - Merge
 * - Split
 * - Filter
 * - Aggregate
 * - Delay/Wait
 * - Set Variable
 * 
 * @module lib/nodes/control-flow
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
  getVariable: (name: string) => unknown;
  setVariable: (name: string, value: unknown) => void;
  logger: {
    debug: (message: string, data?: unknown) => void;
    info: (message: string, data?: unknown) => void;
    warn: (message: string, data?: unknown) => void;
    error: (message: string, data?: unknown) => void;
  };
}

interface NodeResult {
  output: unknown;
  nextNodeId?: string;
  nextNodeIds?: string[];
  shouldContinue?: boolean;
  error?: Error;
}

type NodeExecutor = (input: unknown, context: NodeContext) => Promise<NodeResult>;

// ============================================
// Loop Node
// ============================================

const loopNodeSchema = z.object({
  loopType: z.enum(['forEach', 'while', 'for', 'times']),
  items: z.array(z.unknown()).optional(),
  itemsExpression: z.string().optional(),
  condition: z.string().optional(),
  start: z.number().optional(),
  end: z.number().optional(),
  step: z.number().optional(),
  times: z.number().optional(),
  maxIterations: z.number().default(1000),
  continueOnError: z.boolean().default(false),
  batchSize: z.number().optional(),
  parallel: z.boolean().default(false),
});

type LoopNodeConfig = z.infer<typeof loopNodeSchema>;

interface LoopState {
  currentIndex: number;
  currentItem: unknown;
  results: unknown[];
  isComplete: boolean;
  iterations: number;
}

function evaluateCondition(condition: string, context: NodeContext, loopState: LoopState): boolean {
  const vars = {
    ...context.variables,
    $index: loopState.currentIndex,
    $item: loopState.currentItem,
    $results: loopState.results,
    $iterations: loopState.iterations,
  };
  
  try {
    const fn = new Function(...Object.keys(vars), `return ${condition}`);
    return !!fn(...Object.values(vars));
  } catch {
    return false;
  }
}

function getItems(config: LoopNodeConfig, context: NodeContext): unknown[] {
  if (config.items) return config.items;
  
  if (config.itemsExpression) {
    const fn = new Function(...Object.keys(context.variables), `return ${config.itemsExpression}`);
    const result = fn(...Object.values(context.variables));
    return Array.isArray(result) ? result : [];
  }
  
  return [];
}

export const loopNode = {
  id: 'loop',
  name: 'Loop',
  description: 'Iterate over items or until a condition is met',
  category: 'control-flow',
  color: '#9333EA',
  icon: 'repeat',
  
  configSchema: loopNodeSchema,
  
  execute: async (input: LoopNodeConfig, context: NodeContext): Promise<NodeResult> => {
    const config = loopNodeSchema.parse(input);
    const state: LoopState = {
      currentIndex: config.start || 0,
      currentItem: null,
      results: [],
      isComplete: false,
      iterations: 0,
    };

    context.logger.info('Starting loop', { type: config.loopType, maxIterations: config.maxIterations });

    const executeIteration = async (item: unknown, index: number): Promise<unknown> => {
      state.currentIndex = index;
      state.currentItem = item;
      state.iterations++;
      
      context.setVariable('$loopIndex', index);
      context.setVariable('$loopItem', item);
      
      return { index, item, previousResults: [...state.results] };
    };

    try {
      switch (config.loopType) {
        case 'forEach': {
          const items = getItems(config, context);
          
          if (config.parallel && config.batchSize) {
            for (let i = 0; i < items.length; i += config.batchSize) {
              const batch = items.slice(i, i + config.batchSize);
              const batchResults = await Promise.all(
                batch.map((item, idx) => executeIteration(item, i + idx))
              );
              state.results.push(...batchResults);
            }
          } else {
            for (let i = 0; i < items.length && state.iterations < config.maxIterations; i++) {
              const result = await executeIteration(items[i], i);
              state.results.push(result);
            }
          }
          break;
        }

        case 'while': {
          while (
            state.iterations < config.maxIterations &&
            evaluateCondition(config.condition || 'false', context, state)
          ) {
            const result = await executeIteration(null, state.iterations);
            state.results.push(result);
          }
          break;
        }

        case 'for': {
          const start = config.start || 0;
          const end = config.end || 10;
          const step = config.step || 1;
          
          for (let i = start; i < end && state.iterations < config.maxIterations; i += step) {
            const result = await executeIteration(i, state.iterations);
            state.results.push(result);
          }
          break;
        }

        case 'times': {
          const times = config.times || 1;
          
          for (let i = 0; i < times && state.iterations < config.maxIterations; i++) {
            const result = await executeIteration(i, i);
            state.results.push(result);
          }
          break;
        }
      }

      state.isComplete = true;
      context.logger.info('Loop completed', { iterations: state.iterations, resultsCount: state.results.length });

      return {
        output: {
          results: state.results,
          totalIterations: state.iterations,
          completed: true,
        },
        shouldContinue: true,
      };
    } catch (error) {
      if (config.continueOnError) {
        context.logger.warn('Loop error (continuing)', { error });
        return {
          output: {
            results: state.results,
            totalIterations: state.iterations,
            completed: false,
            error: String(error),
          },
          shouldContinue: true,
        };
      }
      throw error;
    }
  },
};

// ============================================
// Switch/Router Node
// ============================================

const switchNodeSchema = z.object({
  expression: z.string(),
  cases: z.array(z.object({
    value: z.unknown(),
    operator: z.enum(['equals', 'notEquals', 'contains', 'startsWith', 'endsWith', 'regex', 'gt', 'gte', 'lt', 'lte']).default('equals'),
    targetNodeId: z.string(),
    label: z.string().optional(),
  })),
  defaultNodeId: z.string().optional(),
  multipleRoutes: z.boolean().default(false),
});

type SwitchNodeConfig = z.infer<typeof switchNodeSchema>;

function evaluateCase(expressionValue: unknown, caseConfig: SwitchNodeConfig['cases'][0]): boolean {
  const v = expressionValue;
  const c = caseConfig.value;

  switch (caseConfig.operator) {
    case 'equals':
      return v === c;
    case 'notEquals':
      return v !== c;
    case 'contains':
      return String(v).includes(String(c));
    case 'startsWith':
      return String(v).startsWith(String(c));
    case 'endsWith':
      return String(v).endsWith(String(c));
    case 'regex':
      return new RegExp(String(c)).test(String(v));
    case 'gt':
      return Number(v) > Number(c);
    case 'gte':
      return Number(v) >= Number(c);
    case 'lt':
      return Number(v) < Number(c);
    case 'lte':
      return Number(v) <= Number(c);
    default:
      return false;
  }
}

export const switchNode = {
  id: 'switch',
  name: 'Switch',
  description: 'Route workflow based on conditions',
  category: 'control-flow',
  color: '#F97316',
  icon: 'git-branch',
  
  configSchema: switchNodeSchema,
  
  execute: async (input: SwitchNodeConfig, context: NodeContext): Promise<NodeResult> => {
    const config = switchNodeSchema.parse(input);
    
    let expressionValue: unknown;
    try {
      const fn = new Function(...Object.keys(context.variables), `return ${config.expression}`);
      expressionValue = fn(...Object.values(context.variables));
    } catch {
      expressionValue = context.previousNodeOutput;
    }

    context.logger.info('Switch evaluating', { expression: config.expression, value: expressionValue });

    const matchedCases: Array<{ value: unknown; targetNodeId: string; label?: string }> = [];
    
    for (const caseConfig of config.cases) {
      if (evaluateCase(expressionValue, caseConfig)) {
        matchedCases.push({
          value: caseConfig.value,
          targetNodeId: caseConfig.targetNodeId,
          label: caseConfig.label,
        });
        
        if (!config.multipleRoutes) break;
      }
    }

    if (matchedCases.length === 0 && config.defaultNodeId) {
      return {
        output: {
          expressionValue,
          matchedCase: 'default',
          routedTo: config.defaultNodeId,
        },
        nextNodeId: config.defaultNodeId,
        shouldContinue: true,
      };
    }

    if (matchedCases.length === 0) {
      return {
        output: {
          expressionValue,
          matchedCase: null,
          routedTo: null,
        },
        shouldContinue: false,
      };
    }

    if (config.multipleRoutes) {
      return {
        output: {
          expressionValue,
          matchedCases: matchedCases.map(c => c.label || c.value),
          routedTo: matchedCases.map(c => c.targetNodeId),
        },
        nextNodeIds: matchedCases.map(c => c.targetNodeId),
        shouldContinue: true,
      };
    }

    return {
      output: {
        expressionValue,
        matchedCase: matchedCases[0].label || matchedCases[0].value,
        routedTo: matchedCases[0].targetNodeId,
      },
      nextNodeId: matchedCases[0].targetNodeId,
      shouldContinue: true,
    };
  },
};

// ============================================
// Merge Node
// ============================================

const mergeNodeSchema = z.object({
  mode: z.enum(['waitAll', 'waitAny', 'passthrough', 'combine']),
  expectedInputs: z.number().optional(),
  timeout: z.number().optional(),
  combineStrategy: z.enum(['array', 'object', 'first', 'last', 'concat']).default('array'),
});

type MergeNodeConfig = z.infer<typeof mergeNodeSchema>;

const mergeInputsStore = new Map<string, unknown[]>();

export const mergeNode = {
  id: 'merge',
  name: 'Merge',
  description: 'Combine multiple workflow branches',
  category: 'control-flow',
  color: '#10B981',
  icon: 'git-merge',
  
  configSchema: mergeNodeSchema,
  
  execute: async (input: MergeNodeConfig & { incomingData?: unknown; branchId?: string }, context: NodeContext): Promise<NodeResult> => {
    const config = mergeNodeSchema.parse(input);
    const storeKey = `${context.runId}:${context.nodeId}`;
    
    if (!mergeInputsStore.has(storeKey)) {
      mergeInputsStore.set(storeKey, []);
    }
    
    const inputs = mergeInputsStore.get(storeKey)!;
    
    if (input.incomingData !== undefined) {
      inputs.push(input.incomingData);
    }

    context.logger.info('Merge received input', { inputCount: inputs.length, expected: config.expectedInputs });

    switch (config.mode) {
      case 'waitAll': {
        const expected = config.expectedInputs || 2;
        if (inputs.length < expected) {
          return { output: null, shouldContinue: false };
        }
        mergeInputsStore.delete(storeKey);
        return { output: combineInputs(inputs, config.combineStrategy), shouldContinue: true };
      }

      case 'waitAny': {
        if (inputs.length > 0) {
          mergeInputsStore.delete(storeKey);
          return { output: inputs[0], shouldContinue: true };
        }
        return { output: null, shouldContinue: false };
      }

      case 'passthrough': {
        return { output: input.incomingData, shouldContinue: true };
      }

      case 'combine': {
        return { output: combineInputs(inputs, config.combineStrategy), shouldContinue: true };
      }
    }

    return { output: null, shouldContinue: false };
  },
};

function combineInputs(inputs: unknown[], strategy: MergeNodeConfig['combineStrategy']): unknown {
  switch (strategy) {
    case 'array':
      return inputs;
    case 'object':
      return inputs.reduce((acc: Record<string, unknown>, item, idx) => {
        acc[`input${idx}`] = item;
        return acc;
      }, {});
    case 'first':
      return inputs[0];
    case 'last':
      return inputs[inputs.length - 1];
    case 'concat':
      return inputs.flat();
  }
}

// ============================================
// Filter Node
// ============================================

const filterNodeSchema = z.object({
  items: z.array(z.unknown()).optional(),
  itemsExpression: z.string().optional(),
  condition: z.string(),
  keepMatching: z.boolean().default(true),
  outputField: z.string().optional(),
});

type FilterNodeConfig = z.infer<typeof filterNodeSchema>;

export const filterNode = {
  id: 'filter',
  name: 'Filter',
  description: 'Filter items based on a condition',
  category: 'control-flow',
  color: '#EAB308',
  icon: 'filter',
  
  configSchema: filterNodeSchema,
  
  execute: async (input: FilterNodeConfig, context: NodeContext): Promise<NodeResult> => {
    const config = filterNodeSchema.parse(input);
    
    let items: unknown[];
    if (config.items) {
      items = config.items;
    } else if (config.itemsExpression) {
      const fn = new Function(...Object.keys(context.variables), `return ${config.itemsExpression}`);
      items = fn(...Object.values(context.variables));
    } else {
      items = Array.isArray(context.previousNodeOutput) ? context.previousNodeOutput : [];
    }

    context.logger.info('Filtering items', { count: items.length, condition: config.condition });

    const filtered = items.filter((item, index) => {
      try {
        const vars = { ...context.variables, $item: item, $index: index };
        const fn = new Function(...Object.keys(vars), `return ${config.condition}`);
        const matches = !!fn(...Object.values(vars));
        return config.keepMatching ? matches : !matches;
      } catch {
        return false;
      }
    });

    context.logger.info('Filter complete', { originalCount: items.length, filteredCount: filtered.length });

    const output = config.outputField 
      ? { [config.outputField]: filtered }
      : { items: filtered, originalCount: items.length, filteredCount: filtered.length };

    return { output, shouldContinue: true };
  },
};

// ============================================
// Aggregate Node
// ============================================

const aggregateNodeSchema = z.object({
  items: z.array(z.unknown()).optional(),
  itemsExpression: z.string().optional(),
  operation: z.enum(['sum', 'avg', 'min', 'max', 'count', 'first', 'last', 'concat', 'unique', 'groupBy', 'custom']),
  field: z.string().optional(),
  groupByField: z.string().optional(),
  customExpression: z.string().optional(),
  initialValue: z.unknown().optional(),
});

type AggregateNodeConfig = z.infer<typeof aggregateNodeSchema>;

export const aggregateNode = {
  id: 'aggregate',
  name: 'Aggregate',
  description: 'Aggregate items into a single value',
  category: 'control-flow',
  color: '#8B5CF6',
  icon: 'layers',
  
  configSchema: aggregateNodeSchema,
  
  execute: async (input: AggregateNodeConfig, context: NodeContext): Promise<NodeResult> => {
    const config = aggregateNodeSchema.parse(input);
    
    let items: unknown[];
    if (config.items) {
      items = config.items;
    } else if (config.itemsExpression) {
      const fn = new Function(...Object.keys(context.variables), `return ${config.itemsExpression}`);
      items = fn(...Object.values(context.variables));
    } else {
      items = Array.isArray(context.previousNodeOutput) ? context.previousNodeOutput : [];
    }

    const getFieldValue = (item: unknown): unknown => {
      if (!config.field) return item;
      return (item as Record<string, unknown>)[config.field];
    };

    const getNumericValues = (): number[] => items.map(i => Number(getFieldValue(i))).filter(n => !isNaN(n));

    context.logger.info('Aggregating items', { count: items.length, operation: config.operation });

    let result: unknown;

    switch (config.operation) {
      case 'sum':
        result = getNumericValues().reduce((a, b) => a + b, 0);
        break;
      case 'avg':
        const vals = getNumericValues();
        result = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        break;
      case 'min':
        result = Math.min(...getNumericValues());
        break;
      case 'max':
        result = Math.max(...getNumericValues());
        break;
      case 'count':
        result = items.length;
        break;
      case 'first':
        result = items[0];
        break;
      case 'last':
        result = items[items.length - 1];
        break;
      case 'concat':
        result = items.map(i => String(getFieldValue(i))).join('');
        break;
      case 'unique':
        result = [...new Set(items.map(i => JSON.stringify(getFieldValue(i))))].map(s => JSON.parse(s));
        break;
      case 'groupBy':
        const groups: Record<string, unknown[]> = {};
        for (const item of items) {
          const key = String((item as Record<string, unknown>)[config.groupByField || 'group']);
          if (!groups[key]) groups[key] = [];
          groups[key].push(item);
        }
        result = groups;
        break;
      case 'custom':
        if (config.customExpression) {
          const fn = new Function('items', 'acc', config.customExpression);
          result = fn(items, config.initialValue);
        } else {
          result = null;
        }
        break;
    }

    return {
      output: { result, itemCount: items.length, operation: config.operation },
      shouldContinue: true,
    };
  },
};

// ============================================
// Delay/Wait Node
// ============================================

const delayNodeSchema = z.object({
  duration: z.number(),
  unit: z.enum(['ms', 's', 'm', 'h', 'd']).default('s'),
  until: z.string().optional(),
  jitter: z.number().optional(),
});

type DelayNodeConfig = z.infer<typeof delayNodeSchema>;

export const delayNode = {
  id: 'delay',
  name: 'Delay',
  description: 'Wait for a specified duration',
  category: 'control-flow',
  color: '#6366F1',
  icon: 'clock',
  
  configSchema: delayNodeSchema,
  
  execute: async (input: DelayNodeConfig, context: NodeContext): Promise<NodeResult> => {
    const config = delayNodeSchema.parse(input);
    
    let durationMs: number;
    
    if (config.until) {
      const targetDate = new Date(config.until);
      durationMs = Math.max(0, targetDate.getTime() - Date.now());
    } else {
      const multipliers: Record<string, number> = { ms: 1, s: 1000, m: 60000, h: 3600000, d: 86400000 };
      durationMs = config.duration * (multipliers[config.unit] || 1000);
    }
    
    if (config.jitter) {
      const jitterMs = (Math.random() * 2 - 1) * config.jitter * 1000;
      durationMs = Math.max(0, durationMs + jitterMs);
    }

    context.logger.info('Delaying', { durationMs });

    await new Promise(resolve => setTimeout(resolve, durationMs));

    return {
      output: { waitedMs: durationMs, resumedAt: new Date().toISOString() },
      shouldContinue: true,
    };
  },
};

// ============================================
// Set Variable Node
// ============================================

const setVariableNodeSchema = z.object({
  variables: z.array(z.object({
    name: z.string(),
    value: z.unknown().optional(),
    expression: z.string().optional(),
  })),
  mode: z.enum(['set', 'append', 'increment', 'decrement', 'toggle']).default('set'),
});

type SetVariableNodeConfig = z.infer<typeof setVariableNodeSchema>;

export const setVariableNode = {
  id: 'setVariable',
  name: 'Set Variable',
  description: 'Set workflow variables',
  category: 'control-flow',
  color: '#14B8A6',
  icon: 'variable',
  
  configSchema: setVariableNodeSchema,
  
  execute: async (input: SetVariableNodeConfig, context: NodeContext): Promise<NodeResult> => {
    const config = setVariableNodeSchema.parse(input);
    const updatedVariables: Record<string, unknown> = {};

    for (const varConfig of config.variables) {
      let value: unknown;
      
      if (varConfig.expression) {
        const fn = new Function(...Object.keys(context.variables), `return ${varConfig.expression}`);
        value = fn(...Object.values(context.variables));
      } else {
        value = varConfig.value;
      }

      const currentValue = context.getVariable(varConfig.name);

      switch (config.mode) {
        case 'set':
          break;
        case 'append':
          if (Array.isArray(currentValue)) {
            value = [...currentValue, value];
          } else {
            value = String(currentValue || '') + String(value);
          }
          break;
        case 'increment':
          value = Number(currentValue || 0) + Number(value || 1);
          break;
        case 'decrement':
          value = Number(currentValue || 0) - Number(value || 1);
          break;
        case 'toggle':
          value = !currentValue;
          break;
      }

      context.setVariable(varConfig.name, value);
      updatedVariables[varConfig.name] = value;
    }

    context.logger.info('Variables updated', updatedVariables);

    return {
      output: { variables: updatedVariables },
      shouldContinue: true,
    };
  },
};

// ============================================
// Export All Nodes
// ============================================

export const controlFlowNodes = {
  loop: loopNode,
  switch: switchNode,
  merge: mergeNode,
  filter: filterNode,
  aggregate: aggregateNode,
  delay: delayNode,
  setVariable: setVariableNode,
};

export default controlFlowNodes;
