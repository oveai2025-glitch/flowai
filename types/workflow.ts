/**
 * FlowAtGenAi - Core Workflow Types
 * 
 * Complete type definitions for the workflow automation engine.
 * Inspired by n8n/Zapier architecture but built from scratch.
 * 
 * @module types/workflow
 */

// ============================================
// Workflow Definition
// ============================================

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  
  // The actual workflow structure
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  
  // Trigger configuration
  trigger?: TriggerConfig;
  
  // Settings
  settings: WorkflowSettings;
  
  // State
  isActive: boolean;
  version: number;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  organizationId: string;
  
  // Tags for organization
  tags?: string[];
  folderId?: string;
}

export interface WorkflowSettings {
  errorHandling: 'stop' | 'continue' | 'retry';
  maxRetries: number;
  retryDelayMs: number;
  timeoutMinutes: number;
  timezone: string;
  notifyOnError: boolean;
  notifyOnSuccess: boolean;
  notificationEmails?: string[];
  saveExecutionData: boolean;
  executionDataRetentionDays: number;
}

// ============================================
// Nodes
// ============================================

export interface WorkflowNode {
  id: string;
  type: NodeType;
  name: string;
  position: { x: number; y: number };
  data: NodeData;
  credentialId?: string;
  disabled?: boolean;
  notes?: string;
  // Visual state
  selected?: boolean;
  dragging?: boolean;
}

export type NodeType = 
  // Triggers
  | 'trigger-manual'
  | 'trigger-webhook'
  | 'trigger-schedule'
  | 'trigger-email'
  | 'trigger-app'
  
  // Core Actions
  | 'action-http'
  | 'action-code'
  | 'action-function'
  | 'action-set'
  | 'action-email'
  | 'action-wait'
  | 'action-delay'
  
  // Logic & Flow
  | 'logic-if'
  | 'logic-switch'
  | 'logic-loop'
  | 'logic-foreach'
  | 'logic-split'
  | 'logic-merge'
  | 'logic-filter'
  | 'logic-sort'
  | 'logic-limit'
  | 'logic-aggregate'
  | 'logic-dedupe'
  | 'logic-compare'
  
  // Data Transform
  | 'transform-set'
  | 'transform-rename'
  | 'transform-split'
  | 'transform-merge'
  | 'transform-json'
  | 'transform-xml'
  | 'transform-csv'
  | 'transform-html'
  | 'transform-text'
  | 'transform-date'
  | 'transform-number'
  | 'transform-crypto'
  | 'transform-compress'
  
  // AI & Machine Learning
  | 'ai-prompt'
  | 'ai-chat'
  | 'ai-agent'
  | 'ai-classify'
  | 'ai-extract'
  | 'ai-summarize'
  | 'ai-translate'
  | 'ai-sentiment'
  | 'ai-image-generate'
  | 'ai-image-analyze'
  | 'ai-speech-to-text'
  | 'ai-text-to-speech'
  | 'ai-embedding'
  | 'ai-vector-search'
  | 'ai-rag'
  
  // Flow Control
  | 'flow-stop'
  | 'flow-error'
  | 'flow-subworkflow'
  | 'flow-approval'
  | 'flow-respond'
  | 'flow-webhook-response'
  
  // Connectors (dynamic based on installed connectors)
  | `connector-${string}`;

// ============================================
// Node Data
// ============================================

export type NodeData = 
  | TriggerManualData
  | TriggerWebhookData
  | TriggerScheduleData
  | ActionHttpData
  | ActionCodeData
  | LogicIfData
  | LogicSwitchData
  | LogicLoopData
  | AIPromptData
  | AIAgentData
  | ConnectorData
  | Record<string, unknown>;

export interface TriggerManualData {
  buttonLabel?: string;
}

export interface TriggerWebhookData {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  authentication?: 'none' | 'basic' | 'bearer' | 'apiKey' | 'signature';
  responseMode: 'onReceived' | 'lastNode' | 'responseNode';
}

export interface TriggerScheduleData {
  mode: 'cron' | 'interval';
  cronExpression?: string;
  interval?: {
    value: number;
    unit: 'seconds' | 'minutes' | 'hours' | 'days';
  };
  timezone: string;
}

export interface ActionHttpData {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  url: string;
  authentication?: {
    type: 'none' | 'basic' | 'bearer' | 'apiKey' | 'oauth2';
    credentials?: Record<string, string>;
  };
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  body?: {
    contentType: 'json' | 'form' | 'multipart' | 'raw' | 'binary';
    data: unknown;
  };
  options?: {
    timeout?: number;
    followRedirects?: boolean;
    ignoreSSL?: boolean;
    proxy?: string;
  };
}

export interface ActionCodeData {
  language: 'javascript' | 'python';
  code: string;
  mode: 'runOnce' | 'runForEach';
}

export interface LogicIfData {
  conditions: ConditionGroup;
}

export interface ConditionGroup {
  combinator: 'and' | 'or';
  conditions: (Condition | ConditionGroup)[];
}

export interface Condition {
  leftValue: string | Expression;
  operator: ConditionOperator;
  rightValue: string | Expression;
}

export type ConditionOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'regex'
  | 'greaterThan'
  | 'lessThan'
  | 'greaterThanOrEqual'
  | 'lessThanOrEqual'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'isTrue'
  | 'isFalse'
  | 'in'
  | 'notIn';

export interface LogicSwitchData {
  mode: 'rules' | 'expression';
  dataToMatch?: string;
  rules?: SwitchRule[];
  fallbackOutput?: number;
}

export interface SwitchRule {
  name: string;
  conditions: ConditionGroup;
  outputIndex: number;
}

export interface LogicLoopData {
  mode: 'forEach' | 'times' | 'while';
  items?: string; // Expression to array
  times?: number;
  condition?: ConditionGroup;
  batchSize?: number;
  continueOnError?: boolean;
}

export interface AIPromptData {
  provider: 'openai' | 'anthropic' | 'google';
  model: string;
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
  jsonSchema?: Record<string, unknown>;
}

export interface AIAgentData {
  provider: 'openai' | 'anthropic';
  model: string;
  systemPrompt: string;
  tools: AgentTool[];
  maxIterations?: number;
  requireApproval?: boolean;
  memory?: {
    type: 'none' | 'buffer' | 'summary';
    maxMessages?: number;
  };
}

export interface AgentTool {
  name: string;
  description: string;
  type: 'connector' | 'code' | 'workflow';
  connectorId?: string;
  actionId?: string;
  parameters?: Record<string, unknown>;
}

export interface ConnectorData {
  connectorId: string;
  actionId: string;
  parameters: Record<string, unknown>;
  credentialId?: string;
}

// ============================================
// Edges (Connections)
// ============================================

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  type?: 'default' | 'success' | 'error' | 'condition';
  animated?: boolean;
  data?: EdgeData;
}

export interface EdgeData {
  conditionLabel?: string;
  branchIndex?: number;
}

// ============================================
// Triggers
// ============================================

export interface TriggerConfig {
  type: 'manual' | 'webhook' | 'schedule' | 'email' | 'app';
  nodeId: string;
  config: Record<string, unknown>;
}

// ============================================
// Expressions
// ============================================

export interface Expression {
  type: 'expression';
  value: string;
}

// ============================================
// Execution
// ============================================

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  mode: 'production' | 'test';
  startedAt: string;
  finishedAt?: string;
  error?: ExecutionError;
  data: ExecutionData;
  retryOf?: string;
  retryCount: number;
}

export type ExecutionStatus = 
  | 'pending'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'waiting'
  | 'timedOut';

export interface ExecutionError {
  message: string;
  nodeId?: string;
  nodeName?: string;
  stack?: string;
}

export interface ExecutionData {
  resultData: {
    runData: Record<string, NodeExecutionResult[]>;
    lastNodeExecuted?: string;
  };
  startData: {
    destinationNode?: string;
    startNodes?: string[];
  };
  executionData?: {
    contextData: Record<string, unknown>;
    nodeExecutionStack: NodeExecutionStackItem[];
    waitingExecution: Record<string, unknown>;
  };
}

export interface NodeExecutionResult {
  startTime: number;
  executionTime: number;
  data: NodeOutputData;
  error?: ExecutionError;
  source?: string[];
}

export interface NodeOutputData {
  main: NodeOutputItem[][];
}

export interface NodeOutputItem {
  json: Record<string, unknown>;
  binary?: Record<string, BinaryData>;
  pairedItem?: { item: number };
}

export interface BinaryData {
  data: string;
  mimeType: string;
  fileName?: string;
  fileSize?: number;
}

export interface NodeExecutionStackItem {
  node: WorkflowNode;
  data: NodeOutputData;
  source?: string;
}

// ============================================
// Node Definitions (for UI)
// ============================================

export interface NodeDefinition {
  type: NodeType;
  name: string;
  description: string;
  icon: string;
  iconColor?: string;
  category: NodeCategory;
  subcategory?: string;
  inputs: PortDefinition[];
  outputs: PortDefinition[];
  properties: PropertyDefinition[];
  credentials?: CredentialRequirement[];
  version: number;
  defaults: Partial<NodeData>;
  documentation?: string;
  codex?: {
    categories?: string[];
    subcategories?: Record<string, string[]>;
    alias?: string[];
  };
}

export type NodeCategory = 
  | 'triggers'
  | 'actions'
  | 'logic'
  | 'transform'
  | 'ai'
  | 'flow'
  | 'connectors';

export interface PortDefinition {
  type: 'main' | 'ai_tool' | 'ai_memory';
  displayName?: string;
  required?: boolean;
  maxConnections?: number;
}

export interface PropertyDefinition {
  name: string;
  displayName: string;
  type: PropertyType;
  default?: unknown;
  description?: string;
  placeholder?: string;
  required?: boolean;
  options?: PropertyOption[];
  typeOptions?: PropertyTypeOptions;
  displayOptions?: DisplayOptions;
}

export type PropertyType = 
  | 'string'
  | 'number'
  | 'boolean'
  | 'options'
  | 'multiOptions'
  | 'collection'
  | 'fixedCollection'
  | 'json'
  | 'color'
  | 'dateTime'
  | 'filter'
  | 'assignmentCollection'
  | 'resourceLocator'
  | 'resourceMapper'
  | 'notice';

export interface PropertyOption {
  name: string;
  value: string | number | boolean;
  description?: string;
}

export interface PropertyTypeOptions {
  minValue?: number;
  maxValue?: number;
  rows?: number;
  password?: boolean;
  alwaysOpenEditWindow?: boolean;
  loadOptionsMethod?: string;
  loadOptionsDependsOn?: string[];
  multipleValues?: boolean;
  multipleValueButtonText?: string;
  sortable?: boolean;
}

export interface DisplayOptions {
  show?: Record<string, unknown[]>;
  hide?: Record<string, unknown[]>;
}

export interface CredentialRequirement {
  name: string;
  required: boolean;
}

// ============================================
// Connector Types
// ============================================

export interface ConnectorDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  iconColor: string;
  category: ConnectorCategory;
  authType: AuthType;
  actions: ConnectorAction[];
  triggers?: ConnectorTrigger[];
  credentials: CredentialField[];
  documentation?: string;
  version: string;
}

export type ConnectorCategory = 
  | 'communication'
  | 'crm'
  | 'database'
  | 'storage'
  | 'productivity'
  | 'payment'
  | 'developer'
  | 'ai'
  | 'marketing'
  | 'ecommerce'
  | 'analytics'
  | 'social';

export type AuthType = 
  | 'none'
  | 'apiKey'
  | 'basic'
  | 'bearer'
  | 'oauth2'
  | 'custom';

export interface ConnectorAction {
  id: string;
  name: string;
  description: string;
  properties: PropertyDefinition[];
  output: OutputDefinition;
}

export interface ConnectorTrigger {
  id: string;
  name: string;
  description: string;
  type: 'webhook' | 'polling';
  properties: PropertyDefinition[];
  output: OutputDefinition;
}

export interface CredentialField {
  name: string;
  displayName: string;
  type: 'string' | 'password' | 'hidden';
  required: boolean;
  description?: string;
  placeholder?: string;
}

export interface OutputDefinition {
  schema: Record<string, unknown>;
  example?: unknown;
}
