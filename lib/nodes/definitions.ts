/**
 * FlowAtGenAi - Node Definitions
 * 
 * Complete catalog of all available nodes.
 * Each node definition describes how it appears in the UI,
 * what properties it has, and how it connects to other nodes.
 * 
 * @module lib/nodes/definitions
 */

import type { NodeDefinition, NodeCategory } from '../../types/workflow';

// ============================================
// Trigger Nodes
// ============================================

export const triggerManual: NodeDefinition = {
  type: 'trigger-manual',
  name: 'Manual Trigger',
  description: 'Start workflow manually with the click of a button',
  icon: 'Play',
  iconColor: '#10B981',
  category: 'triggers',
  inputs: [],
  outputs: [{ type: 'main', displayName: 'Output' }],
  properties: [
    {
      name: 'buttonLabel',
      displayName: 'Button Label',
      type: 'string',
      default: 'Execute Workflow',
      description: 'Label shown on the execute button',
    },
  ],
  version: 1,
  defaults: { buttonLabel: 'Execute Workflow' },
};

export const triggerWebhook: NodeDefinition = {
  type: 'trigger-webhook',
  name: 'Webhook',
  description: 'Receive data from external services via webhook',
  icon: 'Webhook',
  iconColor: '#6366F1',
  category: 'triggers',
  inputs: [],
  outputs: [{ type: 'main', displayName: 'Output' }],
  properties: [
    {
      name: 'method',
      displayName: 'HTTP Method',
      type: 'options',
      default: 'POST',
      options: [
        { name: 'GET', value: 'GET' },
        { name: 'POST', value: 'POST' },
        { name: 'PUT', value: 'PUT' },
        { name: 'DELETE', value: 'DELETE' },
        { name: 'PATCH', value: 'PATCH' },
      ],
    },
    {
      name: 'path',
      displayName: 'Path',
      type: 'string',
      default: '',
      placeholder: '/my-webhook',
      description: 'Webhook path (e.g., /my-webhook)',
    },
    {
      name: 'authentication',
      displayName: 'Authentication',
      type: 'options',
      default: 'none',
      options: [
        { name: 'None', value: 'none' },
        { name: 'Basic Auth', value: 'basic' },
        { name: 'Bearer Token', value: 'bearer' },
        { name: 'API Key', value: 'apiKey' },
        { name: 'HMAC Signature', value: 'signature' },
      ],
    },
    {
      name: 'responseMode',
      displayName: 'Response Mode',
      type: 'options',
      default: 'onReceived',
      options: [
        { name: 'On Received', value: 'onReceived', description: 'Respond immediately when webhook is received' },
        { name: 'When Last Node Finishes', value: 'lastNode', description: 'Respond after workflow completes' },
        { name: 'Using Response Node', value: 'responseNode', description: 'Respond using a "Respond to Webhook" node' },
      ],
    },
  ],
  version: 1,
  defaults: { method: 'POST', path: '', authentication: 'none', responseMode: 'onReceived' },
};

export const triggerSchedule: NodeDefinition = {
  type: 'trigger-schedule',
  name: 'Schedule Trigger',
  description: 'Run workflow on a recurring schedule',
  icon: 'Clock',
  iconColor: '#F59E0B',
  category: 'triggers',
  inputs: [],
  outputs: [{ type: 'main', displayName: 'Output' }],
  properties: [
    {
      name: 'mode',
      displayName: 'Mode',
      type: 'options',
      default: 'interval',
      options: [
        { name: 'Interval', value: 'interval' },
        { name: 'Cron Expression', value: 'cron' },
      ],
    },
    {
      name: 'intervalValue',
      displayName: 'Interval',
      type: 'number',
      default: 1,
      displayOptions: { show: { mode: ['interval'] } },
    },
    {
      name: 'intervalUnit',
      displayName: 'Unit',
      type: 'options',
      default: 'hours',
      options: [
        { name: 'Seconds', value: 'seconds' },
        { name: 'Minutes', value: 'minutes' },
        { name: 'Hours', value: 'hours' },
        { name: 'Days', value: 'days' },
      ],
      displayOptions: { show: { mode: ['interval'] } },
    },
    {
      name: 'cronExpression',
      displayName: 'Cron Expression',
      type: 'string',
      default: '0 * * * *',
      placeholder: '0 * * * *',
      displayOptions: { show: { mode: ['cron'] } },
      description: 'Standard cron expression (minute hour day month weekday)',
    },
    {
      name: 'timezone',
      displayName: 'Timezone',
      type: 'options',
      default: 'UTC',
      options: [
        { name: 'UTC', value: 'UTC' },
        { name: 'America/New_York', value: 'America/New_York' },
        { name: 'America/Los_Angeles', value: 'America/Los_Angeles' },
        { name: 'Europe/London', value: 'Europe/London' },
        { name: 'Europe/Paris', value: 'Europe/Paris' },
        { name: 'Asia/Tokyo', value: 'Asia/Tokyo' },
        { name: 'Asia/Shanghai', value: 'Asia/Shanghai' },
      ],
    },
  ],
  version: 1,
  defaults: { mode: 'interval', intervalValue: 1, intervalUnit: 'hours', cronExpression: '0 * * * *', timezone: 'UTC' },
};

// ============================================
// Action Nodes
// ============================================

export const actionHttp: NodeDefinition = {
  type: 'action-http',
  name: 'HTTP Request',
  description: 'Make HTTP requests to any API or website',
  icon: 'Globe',
  iconColor: '#3B82F6',
  category: 'actions',
  inputs: [{ type: 'main', displayName: 'Input' }],
  outputs: [{ type: 'main', displayName: 'Output' }],
  properties: [
    {
      name: 'method',
      displayName: 'Method',
      type: 'options',
      default: 'GET',
      options: [
        { name: 'GET', value: 'GET' },
        { name: 'POST', value: 'POST' },
        { name: 'PUT', value: 'PUT' },
        { name: 'DELETE', value: 'DELETE' },
        { name: 'PATCH', value: 'PATCH' },
        { name: 'HEAD', value: 'HEAD' },
        { name: 'OPTIONS', value: 'OPTIONS' },
      ],
    },
    {
      name: 'url',
      displayName: 'URL',
      type: 'string',
      required: true,
      placeholder: 'https://api.example.com/endpoint',
    },
    {
      name: 'authentication',
      displayName: 'Authentication',
      type: 'options',
      default: 'none',
      options: [
        { name: 'None', value: 'none' },
        { name: 'Basic Auth', value: 'basic' },
        { name: 'Bearer Token', value: 'bearer' },
        { name: 'API Key', value: 'apiKey' },
        { name: 'OAuth2', value: 'oauth2' },
      ],
    },
    {
      name: 'headers',
      displayName: 'Headers',
      type: 'fixedCollection',
      typeOptions: { multipleValues: true },
      default: {},
    },
    {
      name: 'queryParams',
      displayName: 'Query Parameters',
      type: 'fixedCollection',
      typeOptions: { multipleValues: true },
      default: {},
    },
    {
      name: 'bodyType',
      displayName: 'Body Type',
      type: 'options',
      default: 'json',
      options: [
        { name: 'JSON', value: 'json' },
        { name: 'Form Data', value: 'form' },
        { name: 'Multipart', value: 'multipart' },
        { name: 'Raw', value: 'raw' },
        { name: 'Binary', value: 'binary' },
      ],
      displayOptions: { show: { method: ['POST', 'PUT', 'PATCH'] } },
    },
    {
      name: 'body',
      displayName: 'Body',
      type: 'json',
      default: '{}',
      displayOptions: { show: { method: ['POST', 'PUT', 'PATCH'] } },
    },
    {
      name: 'timeout',
      displayName: 'Timeout (ms)',
      type: 'number',
      default: 30000,
      description: 'Request timeout in milliseconds',
    },
  ],
  version: 1,
  defaults: { method: 'GET', url: '', authentication: 'none', timeout: 30000 },
};

export const actionCode: NodeDefinition = {
  type: 'action-code',
  name: 'Code',
  description: 'Write custom JavaScript or Python code',
  icon: 'Code',
  iconColor: '#8B5CF6',
  category: 'actions',
  inputs: [{ type: 'main', displayName: 'Input' }],
  outputs: [{ type: 'main', displayName: 'Output' }],
  properties: [
    {
      name: 'language',
      displayName: 'Language',
      type: 'options',
      default: 'javascript',
      options: [
        { name: 'JavaScript', value: 'javascript' },
        { name: 'Python', value: 'python' },
      ],
    },
    {
      name: 'mode',
      displayName: 'Mode',
      type: 'options',
      default: 'runOnce',
      options: [
        { name: 'Run Once for All Items', value: 'runOnce' },
        { name: 'Run Once for Each Item', value: 'runForEach' },
      ],
    },
    {
      name: 'code',
      displayName: 'Code',
      type: 'string',
      typeOptions: { rows: 15 },
      default: `// Access input data
const items = $input.all();

// Process and return
return items.map(item => ({
  json: {
    ...item.json,
    processed: true
  }
}));`,
    },
  ],
  version: 1,
  defaults: { language: 'javascript', mode: 'runOnce', code: '' },
};

export const actionSet: NodeDefinition = {
  type: 'action-set',
  name: 'Set',
  description: 'Set, modify, or add fields to your data',
  icon: 'PenLine',
  iconColor: '#10B981',
  category: 'actions',
  inputs: [{ type: 'main', displayName: 'Input' }],
  outputs: [{ type: 'main', displayName: 'Output' }],
  properties: [
    {
      name: 'mode',
      displayName: 'Mode',
      type: 'options',
      default: 'manual',
      options: [
        { name: 'Manual Mapping', value: 'manual' },
        { name: 'Using JSON', value: 'json' },
      ],
    },
    {
      name: 'assignments',
      displayName: 'Assignments',
      type: 'assignmentCollection',
      default: { assignments: [] },
      displayOptions: { show: { mode: ['manual'] } },
    },
    {
      name: 'jsonData',
      displayName: 'JSON',
      type: 'json',
      default: '{}',
      displayOptions: { show: { mode: ['json'] } },
    },
    {
      name: 'keepOnlySet',
      displayName: 'Keep Only Set',
      type: 'boolean',
      default: false,
      description: 'Remove all fields except the ones being set',
    },
  ],
  version: 1,
  defaults: { mode: 'manual', keepOnlySet: false },
};

export const actionWait: NodeDefinition = {
  type: 'action-wait',
  name: 'Wait',
  description: 'Wait for a specified amount of time or external event',
  icon: 'Timer',
  iconColor: '#F59E0B',
  category: 'actions',
  inputs: [{ type: 'main', displayName: 'Input' }],
  outputs: [{ type: 'main', displayName: 'Output' }],
  properties: [
    {
      name: 'resume',
      displayName: 'Resume',
      type: 'options',
      default: 'timeInterval',
      options: [
        { name: 'After Time Interval', value: 'timeInterval' },
        { name: 'At Specific Time', value: 'specificTime' },
        { name: 'On Webhook Call', value: 'webhook' },
      ],
    },
    {
      name: 'amount',
      displayName: 'Wait Amount',
      type: 'number',
      default: 1,
      displayOptions: { show: { resume: ['timeInterval'] } },
    },
    {
      name: 'unit',
      displayName: 'Unit',
      type: 'options',
      default: 'minutes',
      options: [
        { name: 'Seconds', value: 'seconds' },
        { name: 'Minutes', value: 'minutes' },
        { name: 'Hours', value: 'hours' },
        { name: 'Days', value: 'days' },
      ],
      displayOptions: { show: { resume: ['timeInterval'] } },
    },
    {
      name: 'dateTime',
      displayName: 'Date & Time',
      type: 'dateTime',
      default: '',
      displayOptions: { show: { resume: ['specificTime'] } },
    },
  ],
  version: 1,
  defaults: { resume: 'timeInterval', amount: 1, unit: 'minutes' },
};

// ============================================
// Logic Nodes
// ============================================

export const logicIf: NodeDefinition = {
  type: 'logic-if',
  name: 'If',
  description: 'Route items based on conditions',
  icon: 'GitFork',
  iconColor: '#F59E0B',
  category: 'logic',
  inputs: [{ type: 'main', displayName: 'Input' }],
  outputs: [
    { type: 'main', displayName: 'True' },
    { type: 'main', displayName: 'False' },
  ],
  properties: [
    {
      name: 'conditions',
      displayName: 'Conditions',
      type: 'filter',
      default: { conditions: [], combinator: 'and' },
    },
  ],
  version: 1,
  defaults: { conditions: { conditions: [], combinator: 'and' } },
};

export const logicSwitch: NodeDefinition = {
  type: 'logic-switch',
  name: 'Switch',
  description: 'Route items to different outputs based on multiple conditions',
  icon: 'Route',
  iconColor: '#EC4899',
  category: 'logic',
  inputs: [{ type: 'main', displayName: 'Input' }],
  outputs: [
    { type: 'main', displayName: 'Output 0' },
    { type: 'main', displayName: 'Output 1' },
    { type: 'main', displayName: 'Output 2' },
    { type: 'main', displayName: 'Output 3' },
  ],
  properties: [
    {
      name: 'mode',
      displayName: 'Mode',
      type: 'options',
      default: 'rules',
      options: [
        { name: 'Rules (Conditions)', value: 'rules' },
        { name: 'Expression (Value Matching)', value: 'expression' },
      ],
    },
    {
      name: 'dataToMatch',
      displayName: 'Value to Match',
      type: 'string',
      default: '',
      displayOptions: { show: { mode: ['expression'] } },
      description: 'Use expression like {{ $json.status }}',
    },
    {
      name: 'rules',
      displayName: 'Rules',
      type: 'fixedCollection',
      typeOptions: { multipleValues: true },
      default: { rules: [] },
      displayOptions: { show: { mode: ['rules'] } },
    },
    {
      name: 'fallbackOutput',
      displayName: 'Fallback Output',
      type: 'number',
      default: -1,
      description: '-1 to drop non-matching items',
    },
  ],
  version: 1,
  defaults: { mode: 'rules', fallbackOutput: -1 },
};

export const logicLoop: NodeDefinition = {
  type: 'logic-loop',
  name: 'Loop Over Items',
  description: 'Loop through each item and process separately',
  icon: 'Repeat',
  iconColor: '#8B5CF6',
  category: 'logic',
  inputs: [{ type: 'main', displayName: 'Input' }],
  outputs: [
    { type: 'main', displayName: 'Loop' },
    { type: 'main', displayName: 'Done' },
  ],
  properties: [
    {
      name: 'batchSize',
      displayName: 'Batch Size',
      type: 'number',
      default: 1,
      description: 'Number of items to process in parallel',
    },
    {
      name: 'options',
      displayName: 'Options',
      type: 'collection',
      default: {},
    },
  ],
  version: 1,
  defaults: { batchSize: 1 },
};

export const logicMerge: NodeDefinition = {
  type: 'logic-merge',
  name: 'Merge',
  description: 'Merge data from multiple inputs',
  icon: 'Merge',
  iconColor: '#06B6D4',
  category: 'logic',
  inputs: [
    { type: 'main', displayName: 'Input 1' },
    { type: 'main', displayName: 'Input 2' },
  ],
  outputs: [{ type: 'main', displayName: 'Output' }],
  properties: [
    {
      name: 'mode',
      displayName: 'Mode',
      type: 'options',
      default: 'append',
      options: [
        { name: 'Append', value: 'append', description: 'Combine items from all inputs' },
        { name: 'Combine', value: 'combine', description: 'Match items by position or field' },
        { name: 'Choose Branch', value: 'chooseBranch', description: 'Only output from one input' },
      ],
    },
    {
      name: 'combineMode',
      displayName: 'Combine By',
      type: 'options',
      default: 'position',
      options: [
        { name: 'Matching Position', value: 'position' },
        { name: 'Matching Fields', value: 'fields' },
        { name: 'All Combinations', value: 'multiplex' },
      ],
      displayOptions: { show: { mode: ['combine'] } },
    },
    {
      name: 'mergeByField',
      displayName: 'Field to Match',
      type: 'string',
      default: 'id',
      displayOptions: { show: { mode: ['combine'], combineMode: ['fields'] } },
    },
  ],
  version: 1,
  defaults: { mode: 'append' },
};

export const logicFilter: NodeDefinition = {
  type: 'logic-filter',
  name: 'Filter',
  description: 'Filter items based on conditions',
  icon: 'Filter',
  iconColor: '#10B981',
  category: 'logic',
  inputs: [{ type: 'main', displayName: 'Input' }],
  outputs: [
    { type: 'main', displayName: 'Kept' },
    { type: 'main', displayName: 'Discarded' },
  ],
  properties: [
    {
      name: 'conditions',
      displayName: 'Conditions',
      type: 'filter',
      default: { conditions: [], combinator: 'and' },
    },
  ],
  version: 1,
  defaults: { conditions: { conditions: [], combinator: 'and' } },
};

export const logicSplit: NodeDefinition = {
  type: 'logic-split',
  name: 'Split Out',
  description: 'Split items into separate branches',
  icon: 'Split',
  iconColor: '#F97316',
  category: 'logic',
  inputs: [{ type: 'main', displayName: 'Input' }],
  outputs: [
    { type: 'main', displayName: 'Output 1' },
    { type: 'main', displayName: 'Output 2' },
  ],
  properties: [
    {
      name: 'fieldToSplitBy',
      displayName: 'Field to Split By',
      type: 'string',
      default: '',
      description: 'Split array field into separate items',
    },
  ],
  version: 1,
  defaults: {},
};

export const logicAggregate: NodeDefinition = {
  type: 'logic-aggregate',
  name: 'Aggregate',
  description: 'Aggregate items into groups with calculated values',
  icon: 'BarChart3',
  iconColor: '#6366F1',
  category: 'logic',
  inputs: [{ type: 'main', displayName: 'Input' }],
  outputs: [{ type: 'main', displayName: 'Output' }],
  properties: [
    {
      name: 'aggregate',
      displayName: 'Aggregate',
      type: 'options',
      default: 'aggregateAllItems',
      options: [
        { name: 'All Items into One', value: 'aggregateAllItems' },
        { name: 'Individual Fields', value: 'aggregateIndividualFields' },
      ],
    },
    {
      name: 'fields',
      displayName: 'Fields to Aggregate',
      type: 'fixedCollection',
      typeOptions: { multipleValues: true },
      default: { fields: [] },
      displayOptions: { show: { aggregate: ['aggregateIndividualFields'] } },
    },
  ],
  version: 1,
  defaults: { aggregate: 'aggregateAllItems' },
};

// ============================================
// AI Nodes
// ============================================

export const aiPrompt: NodeDefinition = {
  type: 'ai-prompt',
  name: 'AI Prompt',
  description: 'Generate text using AI language models',
  icon: 'Sparkles',
  iconColor: '#8B5CF6',
  category: 'ai',
  inputs: [{ type: 'main', displayName: 'Input' }],
  outputs: [{ type: 'main', displayName: 'Output' }],
  credentials: [{ name: 'openai', required: false }, { name: 'anthropic', required: false }],
  properties: [
    {
      name: 'provider',
      displayName: 'Provider',
      type: 'options',
      default: 'openai',
      options: [
        { name: 'OpenAI', value: 'openai' },
        { name: 'Anthropic', value: 'anthropic' },
        { name: 'Google', value: 'google' },
      ],
    },
    {
      name: 'model',
      displayName: 'Model',
      type: 'options',
      default: 'gpt-4o-mini',
      options: [
        { name: 'GPT-4o', value: 'gpt-4o' },
        { name: 'GPT-4o Mini', value: 'gpt-4o-mini' },
        { name: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
        { name: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-latest' },
        { name: 'Claude 3.5 Haiku', value: 'claude-3-5-haiku-latest' },
        { name: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro' },
      ],
    },
    {
      name: 'systemPrompt',
      displayName: 'System Prompt',
      type: 'string',
      typeOptions: { rows: 3 },
      default: 'You are a helpful assistant.',
    },
    {
      name: 'userPrompt',
      displayName: 'User Prompt',
      type: 'string',
      typeOptions: { rows: 5 },
      default: '',
      required: true,
    },
    {
      name: 'temperature',
      displayName: 'Temperature',
      type: 'number',
      default: 0.7,
      typeOptions: { minValue: 0, maxValue: 2 },
    },
    {
      name: 'maxTokens',
      displayName: 'Max Tokens',
      type: 'number',
      default: 2048,
    },
    {
      name: 'responseFormat',
      displayName: 'Response Format',
      type: 'options',
      default: 'text',
      options: [
        { name: 'Text', value: 'text' },
        { name: 'JSON', value: 'json' },
      ],
    },
  ],
  version: 1,
  defaults: { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.7, maxTokens: 2048, responseFormat: 'text' },
};

export const aiChat: NodeDefinition = {
  type: 'ai-chat',
  name: 'AI Chat',
  description: 'Have a conversation with AI including message history',
  icon: 'MessageSquare',
  iconColor: '#06B6D4',
  category: 'ai',
  inputs: [
    { type: 'main', displayName: 'Input' },
    { type: 'ai_memory', displayName: 'Memory' },
  ],
  outputs: [{ type: 'main', displayName: 'Output' }],
  credentials: [{ name: 'openai', required: false }, { name: 'anthropic', required: false }],
  properties: [
    {
      name: 'provider',
      displayName: 'Provider',
      type: 'options',
      default: 'openai',
      options: [
        { name: 'OpenAI', value: 'openai' },
        { name: 'Anthropic', value: 'anthropic' },
      ],
    },
    {
      name: 'model',
      displayName: 'Model',
      type: 'string',
      default: 'gpt-4o',
    },
    {
      name: 'systemMessage',
      displayName: 'System Message',
      type: 'string',
      typeOptions: { rows: 4 },
      default: 'You are a helpful assistant.',
    },
    {
      name: 'message',
      displayName: 'Message',
      type: 'string',
      typeOptions: { rows: 4 },
      default: '',
      required: true,
    },
  ],
  version: 1,
  defaults: { provider: 'openai', model: 'gpt-4o' },
};

export const aiAgent: NodeDefinition = {
  type: 'ai-agent',
  name: 'AI Agent',
  description: 'Autonomous AI agent that can use tools and make decisions',
  icon: 'Bot',
  iconColor: '#EC4899',
  category: 'ai',
  inputs: [
    { type: 'main', displayName: 'Input' },
    { type: 'ai_tool', displayName: 'Tools' },
    { type: 'ai_memory', displayName: 'Memory' },
  ],
  outputs: [{ type: 'main', displayName: 'Output' }],
  credentials: [{ name: 'openai', required: false }, { name: 'anthropic', required: false }],
  properties: [
    {
      name: 'provider',
      displayName: 'Provider',
      type: 'options',
      default: 'openai',
      options: [
        { name: 'OpenAI', value: 'openai' },
        { name: 'Anthropic', value: 'anthropic' },
      ],
    },
    {
      name: 'model',
      displayName: 'Model',
      type: 'string',
      default: 'gpt-4o',
    },
    {
      name: 'systemPrompt',
      displayName: 'System Prompt',
      type: 'string',
      typeOptions: { rows: 6 },
      default: 'You are a helpful AI assistant with access to various tools. Use them to help the user accomplish their goals.',
    },
    {
      name: 'maxIterations',
      displayName: 'Max Iterations',
      type: 'number',
      default: 10,
      description: 'Maximum number of tool-use iterations',
    },
    {
      name: 'requireApproval',
      displayName: 'Require Approval',
      type: 'boolean',
      default: false,
      description: 'Pause for human approval before executing tools',
    },
  ],
  version: 1,
  defaults: { provider: 'openai', model: 'gpt-4o', maxIterations: 10, requireApproval: false },
};

export const aiExtract: NodeDefinition = {
  type: 'ai-extract',
  name: 'AI Extract',
  description: 'Extract structured data from text using AI',
  icon: 'FileSearch',
  iconColor: '#10B981',
  category: 'ai',
  inputs: [{ type: 'main', displayName: 'Input' }],
  outputs: [{ type: 'main', displayName: 'Output' }],
  credentials: [{ name: 'openai', required: true }],
  properties: [
    {
      name: 'text',
      displayName: 'Text',
      type: 'string',
      typeOptions: { rows: 4 },
      default: '={{ $json.text }}',
      required: true,
    },
    {
      name: 'extractionSchema',
      displayName: 'Extraction Schema',
      type: 'json',
      default: '{\n  "name": "string",\n  "email": "string",\n  "company": "string"\n}',
      description: 'JSON schema defining what to extract',
    },
  ],
  version: 1,
  defaults: {},
};

export const aiSummarize: NodeDefinition = {
  type: 'ai-summarize',
  name: 'AI Summarize',
  description: 'Summarize text using AI',
  icon: 'FileText',
  iconColor: '#F59E0B',
  category: 'ai',
  inputs: [{ type: 'main', displayName: 'Input' }],
  outputs: [{ type: 'main', displayName: 'Output' }],
  credentials: [{ name: 'openai', required: true }],
  properties: [
    {
      name: 'text',
      displayName: 'Text',
      type: 'string',
      typeOptions: { rows: 4 },
      default: '={{ $json.text }}',
      required: true,
    },
    {
      name: 'summaryType',
      displayName: 'Summary Type',
      type: 'options',
      default: 'concise',
      options: [
        { name: 'Concise', value: 'concise' },
        { name: 'Detailed', value: 'detailed' },
        { name: 'Bullet Points', value: 'bullets' },
        { name: 'Key Takeaways', value: 'takeaways' },
      ],
    },
    {
      name: 'maxLength',
      displayName: 'Max Length (words)',
      type: 'number',
      default: 100,
    },
  ],
  version: 1,
  defaults: { summaryType: 'concise', maxLength: 100 },
};

// ============================================
// Flow Control Nodes
// ============================================

export const flowApproval: NodeDefinition = {
  type: 'flow-approval',
  name: 'Wait for Approval',
  description: 'Pause workflow and wait for human approval',
  icon: 'UserCheck',
  iconColor: '#10B981',
  category: 'flow',
  inputs: [{ type: 'main', displayName: 'Input' }],
  outputs: [
    { type: 'main', displayName: 'Approved' },
    { type: 'main', displayName: 'Rejected' },
  ],
  properties: [
    {
      name: 'title',
      displayName: 'Title',
      type: 'string',
      default: 'Approval Required',
      required: true,
    },
    {
      name: 'description',
      displayName: 'Description',
      type: 'string',
      typeOptions: { rows: 3 },
      default: '',
    },
    {
      name: 'approvers',
      displayName: 'Approvers',
      type: 'string',
      default: '',
      description: 'Email addresses of approvers (comma-separated)',
    },
    {
      name: 'timeout',
      displayName: 'Timeout',
      type: 'options',
      default: '7d',
      options: [
        { name: '1 Hour', value: '1h' },
        { name: '1 Day', value: '1d' },
        { name: '7 Days', value: '7d' },
        { name: '30 Days', value: '30d' },
        { name: 'Never', value: 'never' },
      ],
    },
  ],
  version: 1,
  defaults: { title: 'Approval Required', timeout: '7d' },
};

export const flowSubworkflow: NodeDefinition = {
  type: 'flow-subworkflow',
  name: 'Execute Workflow',
  description: 'Execute another workflow as a sub-workflow',
  icon: 'Workflow',
  iconColor: '#6366F1',
  category: 'flow',
  inputs: [{ type: 'main', displayName: 'Input' }],
  outputs: [{ type: 'main', displayName: 'Output' }],
  properties: [
    {
      name: 'workflowId',
      displayName: 'Workflow',
      type: 'resourceLocator',
      default: '',
      required: true,
    },
    {
      name: 'mode',
      displayName: 'Mode',
      type: 'options',
      default: 'once',
      options: [
        { name: 'Run Once', value: 'once' },
        { name: 'Run Once for Each Item', value: 'each' },
      ],
    },
    {
      name: 'waitForCompletion',
      displayName: 'Wait for Completion',
      type: 'boolean',
      default: true,
    },
  ],
  version: 1,
  defaults: { mode: 'once', waitForCompletion: true },
};

export const flowStop: NodeDefinition = {
  type: 'flow-stop',
  name: 'Stop and Error',
  description: 'Stop workflow execution with an error',
  icon: 'StopCircle',
  iconColor: '#EF4444',
  category: 'flow',
  inputs: [{ type: 'main', displayName: 'Input' }],
  outputs: [],
  properties: [
    {
      name: 'errorMessage',
      displayName: 'Error Message',
      type: 'string',
      default: 'Workflow stopped',
      required: true,
    },
  ],
  version: 1,
  defaults: { errorMessage: 'Workflow stopped' },
};

export const flowWebhookResponse: NodeDefinition = {
  type: 'flow-webhook-response',
  name: 'Respond to Webhook',
  description: 'Send a custom response to the webhook that triggered this workflow',
  icon: 'Reply',
  iconColor: '#3B82F6',
  category: 'flow',
  inputs: [{ type: 'main', displayName: 'Input' }],
  outputs: [{ type: 'main', displayName: 'Output' }],
  properties: [
    {
      name: 'respondWith',
      displayName: 'Respond With',
      type: 'options',
      default: 'firstItem',
      options: [
        { name: 'First Incoming Item', value: 'firstItem' },
        { name: 'All Items', value: 'allItems' },
        { name: 'Text', value: 'text' },
        { name: 'JSON', value: 'json' },
        { name: 'No Data', value: 'noData' },
      ],
    },
    {
      name: 'statusCode',
      displayName: 'Status Code',
      type: 'number',
      default: 200,
    },
    {
      name: 'responseBody',
      displayName: 'Response Body',
      type: 'string',
      typeOptions: { rows: 4 },
      default: '',
      displayOptions: { show: { respondWith: ['text', 'json'] } },
    },
    {
      name: 'headers',
      displayName: 'Headers',
      type: 'fixedCollection',
      typeOptions: { multipleValues: true },
      default: {},
    },
  ],
  version: 1,
  defaults: { respondWith: 'firstItem', statusCode: 200 },
};

// ============================================
// Transform Nodes
// ============================================

export const transformJson: NodeDefinition = {
  type: 'transform-json',
  name: 'JSON',
  description: 'Parse or stringify JSON data',
  icon: 'Braces',
  iconColor: '#F59E0B',
  category: 'transform',
  inputs: [{ type: 'main', displayName: 'Input' }],
  outputs: [{ type: 'main', displayName: 'Output' }],
  properties: [
    {
      name: 'action',
      displayName: 'Action',
      type: 'options',
      default: 'parse',
      options: [
        { name: 'Parse JSON String', value: 'parse' },
        { name: 'Stringify to JSON', value: 'stringify' },
      ],
    },
    {
      name: 'source',
      displayName: 'Source',
      type: 'string',
      default: '={{ $json }}',
    },
  ],
  version: 1,
  defaults: { action: 'parse' },
};

export const transformSplit: NodeDefinition = {
  type: 'transform-split',
  name: 'Split Text',
  description: 'Split text into multiple items',
  icon: 'Scissors',
  iconColor: '#EC4899',
  category: 'transform',
  inputs: [{ type: 'main', displayName: 'Input' }],
  outputs: [{ type: 'main', displayName: 'Output' }],
  properties: [
    {
      name: 'fieldToSplit',
      displayName: 'Field to Split',
      type: 'string',
      default: 'text',
    },
    {
      name: 'separator',
      displayName: 'Separator',
      type: 'string',
      default: '\n',
      description: 'Character(s) to split by',
    },
    {
      name: 'destinationFieldName',
      displayName: 'Output Field Name',
      type: 'string',
      default: 'text',
    },
  ],
  version: 1,
  defaults: { separator: '\n' },
};

// ============================================
// Export All Definitions
// ============================================

export const allNodeDefinitions: NodeDefinition[] = [
  // Triggers
  triggerManual,
  triggerWebhook,
  triggerSchedule,
  
  // Actions
  actionHttp,
  actionCode,
  actionSet,
  actionWait,
  
  // Logic
  logicIf,
  logicSwitch,
  logicLoop,
  logicMerge,
  logicFilter,
  logicSplit,
  logicAggregate,
  
  // AI
  aiPrompt,
  aiChat,
  aiAgent,
  aiExtract,
  aiSummarize,
  
  // Flow
  flowApproval,
  flowSubworkflow,
  flowStop,
  flowWebhookResponse,
  
  // Transform
  transformJson,
  transformSplit,
];

export const nodeDefinitionsByType: Record<string, NodeDefinition> = {};
allNodeDefinitions.forEach(def => {
  nodeDefinitionsByType[def.type] = def;
});

export const nodeDefinitionsByCategory: Record<NodeCategory, NodeDefinition[]> = {
  triggers: allNodeDefinitions.filter(d => d.category === 'triggers'),
  actions: allNodeDefinitions.filter(d => d.category === 'actions'),
  logic: allNodeDefinitions.filter(d => d.category === 'logic'),
  transform: allNodeDefinitions.filter(d => d.category === 'transform'),
  ai: allNodeDefinitions.filter(d => d.category === 'ai'),
  flow: allNodeDefinitions.filter(d => d.category === 'flow'),
  connectors: [],
};

export default allNodeDefinitions;
