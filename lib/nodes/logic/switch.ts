/**
 * Switch Node
 * 
 * Routes data to different outputs based on conditions.
 * Similar to n8n's Switch and Make.com's Router.
 * 
 * Features:
 * - Multiple output routes
 * - Condition-based routing
 * - Value matching
 * - Default/fallback route
 * - Multiple matches support
 * 
 * @module lib/nodes/logic/switch
 */

import { z } from 'zod';

// ============================================
// Node Definition
// ============================================

export const switchNodeDefinition = {
  type: 'logic-switch',
  name: 'Switch',
  description: 'Route data to different outputs based on conditions',
  category: 'logic',
  icon: 'git-branch',
  color: '#F59E0B',
  
  inputs: ['main'],
  outputs: ['route0', 'route1', 'route2', 'route3', 'fallback'], // Dynamic based on config
  
  properties: [
    {
      name: 'mode',
      displayName: 'Mode',
      type: 'select',
      options: [
        { value: 'rules', label: 'Rules (conditions)' },
        { value: 'expression', label: 'Expression (value matching)' },
      ],
      default: 'rules',
    },
    {
      name: 'dataToMatch',
      displayName: 'Value to Match',
      type: 'expression',
      description: 'Value to compare against routes (for expression mode)',
      displayOptions: {
        show: { mode: ['expression'] },
      },
    },
    {
      name: 'rules',
      displayName: 'Rules',
      type: 'collection',
      displayOptions: {
        show: { mode: ['rules'] },
      },
      items: [
        {
          name: 'conditions',
          displayName: 'Conditions',
          type: 'conditions',
        },
        {
          name: 'outputIndex',
          displayName: 'Output',
          type: 'number',
        },
      ],
    },
    {
      name: 'routes',
      displayName: 'Routes',
      type: 'collection',
      displayOptions: {
        show: { mode: ['expression'] },
      },
      items: [
        {
          name: 'value',
          displayName: 'Value',
          type: 'string',
        },
        {
          name: 'outputIndex',
          displayName: 'Output',
          type: 'number',
        },
      ],
    },
    {
      name: 'fallbackOutput',
      displayName: 'Fallback Output',
      type: 'number',
      default: -1,
      description: 'Output index for non-matching data (-1 to drop)',
    },
    {
      name: 'allowMultipleMatches',
      displayName: 'Allow Multiple Matches',
      type: 'boolean',
      default: false,
      description: 'Send to all matching routes instead of first match',
    },
  ],
};

// ============================================
// Schemas
// ============================================

export const conditionSchema = z.object({
  field: z.string().describe('Field to check'),
  operator: z.enum([
    'equals',
    'notEquals',
    'contains',
    'notContains',
    'startsWith',
    'endsWith',
    'greaterThan',
    'lessThan',
    'greaterThanOrEqual',
    'lessThanOrEqual',
    'isEmpty',
    'isNotEmpty',
    'isTrue',
    'isFalse',
    'regex',
    'in',
    'notIn',
  ]),
  value: z.unknown().optional(),
});

export const ruleSchema = z.object({
  conditions: z.array(conditionSchema),
  combineWith: z.enum(['and', 'or']).default('and'),
  outputIndex: z.number(),
  name: z.string().optional(),
});

export const routeSchema = z.object({
  value: z.union([z.string(), z.number(), z.boolean()]),
  outputIndex: z.number(),
  name: z.string().optional(),
});

export const switchInputSchema = z.object({
  mode: z.enum(['rules', 'expression']).default('rules'),
  dataToMatch: z.unknown().optional(),
  rules: z.array(ruleSchema).optional(),
  routes: z.array(routeSchema).optional(),
  fallbackOutput: z.number().default(-1),
  allowMultipleMatches: z.boolean().default(false),
});

export const switchOutputSchema = z.object({
  matchedRoutes: z.array(z.number()),
  data: z.unknown(),
});

// ============================================
// Condition Evaluation
// ============================================

export function evaluateCondition(
  condition: z.infer<typeof conditionSchema>,
  data: unknown
): boolean {
  const { field, operator, value } = condition;
  
  // Get field value from data
  const fieldValue = getNestedValue(data, field);

  switch (operator) {
    case 'equals':
      return fieldValue === value;
    
    case 'notEquals':
      return fieldValue !== value;
    
    case 'contains':
      if (typeof fieldValue === 'string' && typeof value === 'string') {
        return fieldValue.includes(value);
      }
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(value);
      }
      return false;
    
    case 'notContains':
      if (typeof fieldValue === 'string' && typeof value === 'string') {
        return !fieldValue.includes(value);
      }
      if (Array.isArray(fieldValue)) {
        return !fieldValue.includes(value);
      }
      return true;
    
    case 'startsWith':
      return typeof fieldValue === 'string' && typeof value === 'string' 
        && fieldValue.startsWith(value);
    
    case 'endsWith':
      return typeof fieldValue === 'string' && typeof value === 'string' 
        && fieldValue.endsWith(value);
    
    case 'greaterThan':
      return Number(fieldValue) > Number(value);
    
    case 'lessThan':
      return Number(fieldValue) < Number(value);
    
    case 'greaterThanOrEqual':
      return Number(fieldValue) >= Number(value);
    
    case 'lessThanOrEqual':
      return Number(fieldValue) <= Number(value);
    
    case 'isEmpty':
      return fieldValue === null || fieldValue === undefined || fieldValue === '' 
        || (Array.isArray(fieldValue) && fieldValue.length === 0)
        || (typeof fieldValue === 'object' && Object.keys(fieldValue as object).length === 0);
    
    case 'isNotEmpty':
      return !evaluateCondition({ ...condition, operator: 'isEmpty' }, data);
    
    case 'isTrue':
      return fieldValue === true || fieldValue === 'true' || fieldValue === 1;
    
    case 'isFalse':
      return fieldValue === false || fieldValue === 'false' || fieldValue === 0;
    
    case 'regex':
      if (typeof fieldValue === 'string' && typeof value === 'string') {
        try {
          return new RegExp(value).test(fieldValue);
        } catch {
          return false;
        }
      }
      return false;
    
    case 'in':
      if (Array.isArray(value)) {
        return value.includes(fieldValue);
      }
      return false;
    
    case 'notIn':
      if (Array.isArray(value)) {
        return !value.includes(fieldValue);
      }
      return true;
    
    default:
      return false;
  }
}

/**
 * Evaluate a rule (multiple conditions)
 */
export function evaluateRule(
  rule: z.infer<typeof ruleSchema>,
  data: unknown
): boolean {
  const { conditions, combineWith } = rule;

  if (conditions.length === 0) {
    return true;
  }

  if (combineWith === 'and') {
    return conditions.every(condition => evaluateCondition(condition, data));
  } else {
    return conditions.some(condition => evaluateCondition(condition, data));
  }
}

// ============================================
// Switch Execution
// ============================================

export interface SwitchResult {
  matchedRoutes: number[];
  data: unknown;
}

/**
 * Execute switch node logic
 */
export function executeSwitchNode(
  config: z.infer<typeof switchInputSchema>,
  inputData: unknown
): SwitchResult {
  const matchedRoutes: number[] = [];

  if (config.mode === 'rules' && config.rules) {
    // Rules-based routing
    for (const rule of config.rules) {
      if (evaluateRule(rule, inputData)) {
        matchedRoutes.push(rule.outputIndex);
        if (!config.allowMultipleMatches) {
          break;
        }
      }
    }
  } else if (config.mode === 'expression' && config.routes) {
    // Expression/value matching
    const valueToMatch = config.dataToMatch;
    
    for (const route of config.routes) {
      if (valueToMatch === route.value) {
        matchedRoutes.push(route.outputIndex);
        if (!config.allowMultipleMatches) {
          break;
        }
      }
    }
  }

  // Use fallback if no matches
  if (matchedRoutes.length === 0 && config.fallbackOutput >= 0) {
    matchedRoutes.push(config.fallbackOutput);
  }

  return {
    matchedRoutes,
    data: inputData,
  };
}

// ============================================
// Utilities
// ============================================

function getNestedValue(obj: unknown, path: string): unknown {
  if (!path) return obj;
  
  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current == null) return undefined;
    
    // Handle array access like items[0]
    const arrayMatch = key.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      current = (current as Record<string, unknown>)[arrayMatch[1]];
      if (Array.isArray(current)) {
        current = current[parseInt(arrayMatch[2], 10)];
      }
    } else {
      current = (current as Record<string, unknown>)[key];
    }
  }

  return current;
}

// ============================================
// Visual Editor Helpers
// ============================================

export function generateSwitchOutputs(
  rules: z.infer<typeof ruleSchema>[] | undefined,
  routes: z.infer<typeof routeSchema>[] | undefined,
  hasFallback: boolean
): Array<{ id: string; label: string }> {
  const outputs: Array<{ id: string; label: string }> = [];

  if (rules) {
    rules.forEach((rule, i) => {
      outputs.push({
        id: `route${i}`,
        label: rule.name || `Route ${i + 1}`,
      });
    });
  } else if (routes) {
    routes.forEach((route, i) => {
      outputs.push({
        id: `route${i}`,
        label: route.name || String(route.value),
      });
    });
  }

  if (hasFallback) {
    outputs.push({
      id: 'fallback',
      label: 'Fallback',
    });
  }

  return outputs;
}

export default {
  definition: switchNodeDefinition,
  inputSchema: switchInputSchema,
  outputSchema: switchOutputSchema,
  execute: executeSwitchNode,
};
