/**
 * Loop/Iterator Node
 * 
 * Process arrays item-by-item with:
 * - For Each loops
 * - While loops
 * - Batch processing
 * - Parallel execution
 * - Accumulator support
 * 
 * Inspired by Make.com's Iterator and n8n's Loop node
 * 
 * @module lib/nodes/logic/loop
 */

import { z } from 'zod';

// ============================================
// Node Type Definitions
// ============================================

export const loopNodeTypes = {
  'loop-foreach': {
    name: 'For Each',
    description: 'Iterate over each item in an array',
    category: 'logic',
    icon: 'repeat',
    
    inputs: ['main'],
    outputs: ['item', 'done'],
    
    properties: z.object({
      /** The array to iterate over */
      items: z.string().describe('Expression returning array (e.g., {{$input.data.items}})'),
      /** How to handle each item */
      mode: z.enum(['sequential', 'parallel', 'batch']).default('sequential'),
      /** Batch size for batch mode */
      batchSize: z.number().min(1).max(100).default(10),
      /** Max concurrent items for parallel mode */
      maxConcurrency: z.number().min(1).max(50).default(10),
      /** Continue on item error */
      continueOnError: z.boolean().default(false),
      /** Stop after N items (0 = no limit) */
      limit: z.number().min(0).default(0),
    }),
    
    outputSchema: z.object({
      // Output on 'item' for each iteration
      item: z.unknown(),
      index: z.number(),
      isFirst: z.boolean(),
      isLast: z.boolean(),
      total: z.number(),
      // Output on 'done' after all iterations
      results: z.array(z.unknown()),
      errors: z.array(z.object({
        index: z.number(),
        error: z.string(),
      })),
      processed: z.number(),
      successful: z.number(),
      failed: z.number(),
    }),
  },

  'loop-while': {
    name: 'While Loop',
    description: 'Repeat while a condition is true',
    category: 'logic',
    icon: 'refresh-cw',
    
    inputs: ['main'],
    outputs: ['iteration', 'done'],
    
    properties: z.object({
      /** Condition expression that must be true to continue */
      condition: z.string().describe('Expression returning boolean'),
      /** Maximum iterations (safety limit) */
      maxIterations: z.number().min(1).max(10000).default(100),
      /** Initial accumulator value */
      initialValue: z.unknown().optional(),
      /** Delay between iterations (ms) */
      delay: z.number().min(0).default(0),
    }),
    
    outputSchema: z.object({
      // Output on 'iteration' for each loop
      iteration: z.number(),
      accumulator: z.unknown(),
      // Output on 'done' after loop ends
      totalIterations: z.number(),
      finalValue: z.unknown(),
      exitReason: z.enum(['condition_false', 'max_iterations', 'break']),
    }),
  },

  'loop-times': {
    name: 'Repeat N Times',
    description: 'Execute a fixed number of times',
    category: 'logic',
    icon: 'hash',
    
    inputs: ['main'],
    outputs: ['iteration', 'done'],
    
    properties: z.object({
      /** Number of times to repeat */
      count: z.number().min(1).max(10000).default(10),
      /** Delay between iterations (ms) */
      delay: z.number().min(0).default(0),
    }),
    
    outputSchema: z.object({
      iteration: z.number(),
      isFirst: z.boolean(),
      isLast: z.boolean(),
      remaining: z.number(),
    }),
  },
};

// ============================================
// Loop Executor
// ============================================

export interface LoopContext {
  /** Current iteration index (0-based) */
  index: number;
  /** Current item being processed */
  item: unknown;
  /** Total items to process */
  total: number;
  /** Is first iteration */
  isFirst: boolean;
  /** Is last iteration */
  isLast: boolean;
  /** Accumulated results */
  results: unknown[];
  /** Accumulated errors */
  errors: Array<{ index: number; error: string }>;
  /** Accumulator value (for while loops) */
  accumulator: unknown;
}

export interface LoopConfig {
  mode: 'sequential' | 'parallel' | 'batch';
  batchSize: number;
  maxConcurrency: number;
  continueOnError: boolean;
  limit: number;
  delay: number;
  maxIterations: number;
}

/**
 * Execute a for-each loop over items
 */
export async function executeForEach<T, R>(
  items: T[],
  handler: (item: T, context: LoopContext) => Promise<R>,
  config: Partial<LoopConfig> = {}
): Promise<{
  results: R[];
  errors: Array<{ index: number; error: string }>;
  processed: number;
  successful: number;
  failed: number;
}> {
  const cfg: LoopConfig = {
    mode: config.mode || 'sequential',
    batchSize: config.batchSize || 10,
    maxConcurrency: config.maxConcurrency || 10,
    continueOnError: config.continueOnError ?? false,
    limit: config.limit || 0,
    delay: config.delay || 0,
    maxIterations: config.maxIterations || 10000,
  };

  // Apply limit
  const processItems = cfg.limit > 0 ? items.slice(0, cfg.limit) : items;
  const total = processItems.length;
  
  const results: R[] = [];
  const errors: Array<{ index: number; error: string }> = [];
  let processed = 0;
  let successful = 0;
  let failed = 0;

  // Sequential execution
  if (cfg.mode === 'sequential') {
    for (let i = 0; i < total; i++) {
      const context: LoopContext = {
        index: i,
        item: processItems[i],
        total,
        isFirst: i === 0,
        isLast: i === total - 1,
        results,
        errors,
        accumulator: undefined,
      };

      try {
        const result = await handler(processItems[i], context);
        results.push(result);
        successful++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push({ index: i, error: errorMsg });
        failed++;
        
        if (!cfg.continueOnError) {
          throw new LoopError(`Loop failed at index ${i}: ${errorMsg}`, i, errors);
        }
      }
      
      processed++;

      // Delay between iterations
      if (cfg.delay > 0 && i < total - 1) {
        await sleep(cfg.delay);
      }
    }
  }
  
  // Parallel execution
  else if (cfg.mode === 'parallel') {
    const chunks = chunkArray(processItems, cfg.maxConcurrency);
    
    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (item, chunkIndex) => {
        const globalIndex = processed + chunkIndex;
        const context: LoopContext = {
          index: globalIndex,
          item,
          total,
          isFirst: globalIndex === 0,
          isLast: globalIndex === total - 1,
          results,
          errors,
          accumulator: undefined,
        };

        try {
          const result = await handler(item, context);
          return { success: true, result, index: globalIndex };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          return { success: false, error: errorMsg, index: globalIndex };
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      
      for (const res of chunkResults) {
        if (res.success) {
          results[res.index] = res.result as R;
          successful++;
        } else {
          errors.push({ index: res.index, error: res.error! });
          failed++;
          
          if (!cfg.continueOnError) {
            throw new LoopError(`Loop failed at index ${res.index}: ${res.error}`, res.index, errors);
          }
        }
        processed++;
      }
    }
  }
  
  // Batch execution
  else if (cfg.mode === 'batch') {
    const batches = chunkArray(processItems, cfg.batchSize);
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const batchContext: LoopContext = {
        index: batchIndex,
        item: batch,
        total: batches.length,
        isFirst: batchIndex === 0,
        isLast: batchIndex === batches.length - 1,
        results,
        errors,
        accumulator: undefined,
      };

      try {
        const result = await handler(batch as T, batchContext);
        results.push(result);
        successful += batch.length;
        processed += batch.length;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push({ index: batchIndex, error: errorMsg });
        failed += batch.length;
        processed += batch.length;
        
        if (!cfg.continueOnError) {
          throw new LoopError(`Batch ${batchIndex} failed: ${errorMsg}`, batchIndex, errors);
        }
      }

      // Delay between batches
      if (cfg.delay > 0 && batchIndex < batches.length - 1) {
        await sleep(cfg.delay);
      }
    }
  }

  return { results, errors, processed, successful, failed };
}

/**
 * Execute a while loop
 */
export async function executeWhile<T>(
  condition: (accumulator: T, iteration: number) => boolean | Promise<boolean>,
  body: (accumulator: T, iteration: number) => T | Promise<T>,
  initialValue: T,
  config: Partial<LoopConfig> = {}
): Promise<{
  finalValue: T;
  totalIterations: number;
  exitReason: 'condition_false' | 'max_iterations' | 'break';
}> {
  const cfg: LoopConfig = {
    mode: 'sequential',
    batchSize: 10,
    maxConcurrency: 10,
    continueOnError: false,
    limit: 0,
    delay: config.delay || 0,
    maxIterations: config.maxIterations || 100,
  };

  let accumulator = initialValue;
  let iteration = 0;
  let exitReason: 'condition_false' | 'max_iterations' | 'break' = 'condition_false';

  while (iteration < cfg.maxIterations) {
    // Check condition
    const shouldContinue = await condition(accumulator, iteration);
    
    if (!shouldContinue) {
      exitReason = 'condition_false';
      break;
    }

    // Execute body
    try {
      accumulator = await body(accumulator, iteration);
    } catch (error) {
      if (error instanceof BreakError) {
        exitReason = 'break';
        break;
      }
      throw error;
    }

    iteration++;

    // Check max iterations
    if (iteration >= cfg.maxIterations) {
      exitReason = 'max_iterations';
      break;
    }

    // Delay
    if (cfg.delay > 0) {
      await sleep(cfg.delay);
    }
  }

  return {
    finalValue: accumulator,
    totalIterations: iteration,
    exitReason,
  };
}

// ============================================
// Aggregator Node
// ============================================

export const aggregatorNode = {
  name: 'Aggregate',
  description: 'Combine multiple items into a single output (opposite of loop)',
  category: 'logic',
  icon: 'layers',
  
  inputs: ['main'],
  outputs: ['main'],
  
  properties: z.object({
    /** Aggregation mode */
    mode: z.enum(['array', 'object', 'sum', 'concat', 'custom']).default('array'),
    /** For object mode: key field */
    keyField: z.string().optional(),
    /** For object mode: value field */
    valueField: z.string().optional(),
    /** For sum mode: field to sum */
    sumField: z.string().optional(),
    /** For concat mode: separator */
    separator: z.string().default(''),
    /** For custom mode: aggregation expression */
    expression: z.string().optional(),
    /** Group by field (creates multiple aggregations) */
    groupBy: z.string().optional(),
  }),
};

/**
 * Aggregate items into single output
 */
export function aggregate<T>(
  items: T[],
  config: {
    mode: 'array' | 'object' | 'sum' | 'concat' | 'custom';
    keyField?: string;
    valueField?: string;
    sumField?: string;
    separator?: string;
    expression?: string;
    groupBy?: string;
  }
): unknown {
  // Handle groupBy
  if (config.groupBy) {
    const groups = new Map<string, T[]>();
    
    for (const item of items) {
      const key = String(getNestedValue(item, config.groupBy));
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(item);
    }
    
    const result: Record<string, unknown> = {};
    for (const [key, groupItems] of groups) {
      result[key] = aggregate(groupItems, { ...config, groupBy: undefined });
    }
    return result;
  }

  switch (config.mode) {
    case 'array':
      return items;
    
    case 'object':
      const obj: Record<string, unknown> = {};
      for (const item of items) {
        const key = String(getNestedValue(item, config.keyField || 'key'));
        const value = config.valueField 
          ? getNestedValue(item, config.valueField)
          : item;
        obj[key] = value;
      }
      return obj;
    
    case 'sum':
      return items.reduce((sum, item) => {
        const value = config.sumField 
          ? Number(getNestedValue(item, config.sumField))
          : Number(item);
        return sum + (isNaN(value) ? 0 : value);
      }, 0);
    
    case 'concat':
      return items
        .map(item => config.sumField ? getNestedValue(item, config.sumField) : item)
        .join(config.separator || '');
    
    case 'custom':
      // Would use sandbox to evaluate expression
      return items;
    
    default:
      return items;
  }
}

// ============================================
// Utilities
// ============================================

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getNestedValue(obj: unknown, path: string): unknown {
  if (!path) return obj;
  
  const parts = path.split('.');
  let current: unknown = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  
  return current;
}

// ============================================
// Error Types
// ============================================

export class LoopError extends Error {
  public readonly index: number;
  public readonly errors: Array<{ index: number; error: string }>;

  constructor(message: string, index: number, errors: Array<{ index: number; error: string }>) {
    super(message);
    this.name = 'LoopError';
    this.index = index;
    this.errors = errors;
  }
}

export class BreakError extends Error {
  constructor() {
    super('Loop break');
    this.name = 'BreakError';
  }
}

/**
 * Break out of a while loop
 */
export function breakLoop(): never {
  throw new BreakError();
}
