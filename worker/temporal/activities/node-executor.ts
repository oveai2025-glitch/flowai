/**
 * Node Executor Activities
 * 
 * Temporal activities for executing workflow nodes.
 * Activities are the units of work that have side effects:
 * - Calling external APIs (connectors)
 * - Executing user code (sandbox)
 * - Database operations
 * 
 * @module worker/temporal/activities/node-executor
 */

import { Context } from '@temporalio/activity';
import { logger } from '../../../lib/logger';
import {
  recordNodeExecution,
  recordConnectorAction,
  recordLLMUsage,
} from '../../../lib/metrics';

// ============================================
// Activity Input Types
// ============================================

export interface ExecuteNodeInput {
  nodeId: string;
  nodeType: string;
  config: Record<string, unknown>;
  input: unknown;
  organizationId: string;
  variables?: Record<string, unknown>;
}

export interface ExecuteConnectorInput {
  nodeId: string;
  nodeType: string;
  config: Record<string, unknown>;
  input: unknown;
  organizationId: string;
}

export interface ExecuteSandboxInput {
  code: string;
  input: unknown;
  variables: Record<string, unknown>;
  timeout?: number;
  memoryLimit?: number;
}

// ============================================
// Generic Node Executor
// ============================================

/**
 * Execute any node type
 * Routes to appropriate handler based on node type
 */
export async function executeNode(input: ExecuteNodeInput): Promise<unknown> {
  const { nodeId, nodeType, config, input: nodeInput, organizationId } = input;
  const activityInfo = Context.current().info;
  
  logger.info('Executing node', {
    nodeId,
    nodeType,
    organizationId,
    attempt: activityInfo.attempt,
  });

  const startTime = Date.now();

  try {
    // Heartbeat for long-running activities
    Context.current().heartbeat(`Executing ${nodeType}`);

    let result: unknown;

    // Route to appropriate handler
    if (nodeType.startsWith('action-http')) {
      result = await executeHTTPNode(config, nodeInput);
    } else if (nodeType.startsWith('action-slack')) {
      result = await executeSlackNode(config, nodeInput, organizationId);
    } else if (nodeType.startsWith('action-email')) {
      result = await executeEmailNode(config, nodeInput, organizationId);
    } else if (nodeType.startsWith('ai-')) {
      result = await executeAINode(nodeType, config, nodeInput, organizationId);
    } else if (nodeType.startsWith('transform-')) {
      result = await executeTransformNode(nodeType, config, nodeInput);
    } else if (nodeType.startsWith('action-database') || nodeType.startsWith('action-postgres')) {
      result = await executeDatabaseNode(config, nodeInput, organizationId);
    } else {
      // Generic connector execution
      result = await executeGenericConnector(nodeType, config, nodeInput, organizationId);
    }

    // Record metrics
    const durationMs = Date.now() - startTime;
    recordNodeExecution(nodeType, 'succeeded');

    logger.info('Node execution completed', {
      nodeId,
      nodeType,
      durationMs,
    });

    return result;
  } catch (error) {
    const durationMs = Date.now() - startTime;
    recordNodeExecution(nodeType, 'failed');

    logger.error('Node execution failed', error, {
      nodeId,
      nodeType,
      durationMs,
    });

    throw error;
  }
}

// ============================================
// Connector Executor
// ============================================

/**
 * Execute a connector action
 */
export async function executeConnector(input: ExecuteConnectorInput): Promise<unknown> {
  const { nodeId, nodeType, config, input: connectorInput, organizationId } = input;
  const startTime = Date.now();

  logger.info('Executing connector', {
    nodeId,
    nodeType,
    organizationId,
  });

  try {
    // Parse connector type from node type
    // e.g., "action-slack-send" -> connector: "slack", action: "send"
    const [, connectorName, actionName] = nodeType.split('-');

    if (!connectorName || !actionName) {
      throw new ConfigurationError(`Invalid connector node type: ${nodeType}`);
    }

    // Get connector from registry
    const connector = await getConnector(connectorName);
    if (!connector) {
      throw new ConfigurationError(`Connector not found: ${connectorName}`);
    }

    // Get credentials for this organization
    const credentials = await getConnectorCredentials(
      organizationId,
      connectorName,
      config.credentialId as string | undefined
    );

    // Execute the action
    const result = await connector.execute(actionName, connectorInput, {
      config,
      credentials,
      organizationId,
      logger: logger.child({ connector: connectorName, action: actionName }),
    });

    // Record metrics
    const durationMs = Date.now() - startTime;
    recordConnectorAction(connectorName, actionName, 'success', durationMs);

    return result.data;
  } catch (error) {
    const durationMs = Date.now() - startTime;
    
    // Parse connector name for metrics
    const connectorName = nodeType.split('-')[1] || 'unknown';
    const actionName = nodeType.split('-')[2] || 'unknown';
    recordConnectorAction(connectorName, actionName, 'error', durationMs);

    throw error;
  }
}

// ============================================
// Sandbox Executor
// ============================================

/**
 * Execute user code in isolated sandbox
 */
export async function executeSandbox(input: ExecuteSandboxInput): Promise<unknown> {
  const { code, input: codeInput, variables, timeout, memoryLimit } = input;

  logger.info('Executing sandbox code', {
    codeLength: code.length,
    timeout,
    memoryLimit,
  });

  // Import sandbox runner dynamically (heavy dependency)
  const { SandboxRunner } = await import('../../../sandbox/isolate-runner');

  const runner = new SandboxRunner({
    timeout: timeout || 5000,
    memoryLimit: memoryLimit || 128,
  });

  try {
    // Build execution context
    const context = {
      input: codeInput,
      ...variables,
      // Safe built-ins
      console: {
        log: (...args: unknown[]) => logger.info('Sandbox log:', { args }),
        warn: (...args: unknown[]) => logger.warn('Sandbox warn:', { args }),
        error: (...args: unknown[]) => logger.error('Sandbox error:', { args }),
      },
    };

    const result = await runner.execute(code, context);

    return result;
  } finally {
    await runner.dispose();
  }
}

// ============================================
// Specific Node Type Handlers
// ============================================

/**
 * Execute HTTP request node
 */
async function executeHTTPNode(
  config: Record<string, unknown>,
  input: unknown
): Promise<unknown> {
  const method = (config.method as string) || 'GET';
  const url = resolveTemplate(config.url as string, input);
  const headers = (config.headers as Record<string, string>) || {};
  const body = config.body ? resolveTemplate(JSON.stringify(config.body), input) : undefined;

  logger.info('HTTP request', { method, url });

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: method !== 'GET' ? body : undefined,
  });

  const contentType = response.headers.get('content-type') || '';
  let data: unknown;

  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    throw new ConnectorError(
      `HTTP request failed: ${response.status} ${response.statusText}`,
      { status: response.status, data }
    );
  }

  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    data,
  };
}

/**
 * Execute Slack node
 */
async function executeSlackNode(
  config: Record<string, unknown>,
  input: unknown,
  organizationId: string
): Promise<unknown> {
  const credentials = await getConnectorCredentials(organizationId, 'slack');
  
  const action = (config.action as string) || 'sendMessage';
  const channel = resolveTemplate(config.channel as string, input);
  const text = resolveTemplate(config.text as string, input);

  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${credentials.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ channel, text }),
  });

  const data = await response.json();

  if (!data.ok) {
    throw new ConnectorError(`Slack API error: ${data.error}`);
  }

  return data;
}

/**
 * Execute Email node
 */
async function executeEmailNode(
  config: Record<string, unknown>,
  input: unknown,
  organizationId: string
): Promise<unknown> {
  const to = resolveTemplate(config.to as string, input);
  const subject = resolveTemplate(config.subject as string, input);
  const body = resolveTemplate(config.body as string, input);
  const provider = (config.provider as string) || 'smtp';

  // Get email credentials
  const credentials = await getConnectorCredentials(organizationId, 'email', provider);

  // For now, use SendGrid as example
  if (provider === 'sendgrid') {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credentials.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: config.from || credentials.defaultFrom },
        subject,
        content: [{ type: 'text/plain', value: body }],
      }),
    });

    if (!response.ok) {
      throw new ConnectorError(`SendGrid error: ${response.statusText}`);
    }

    return { sent: true, to, subject };
  }

  throw new ConfigurationError(`Unsupported email provider: ${provider}`);
}

/**
 * Execute AI/LLM node
 */
async function executeAINode(
  nodeType: string,
  config: Record<string, unknown>,
  input: unknown,
  organizationId: string
): Promise<unknown> {
  const provider = (config.provider as string) || 'openai';
  const model = (config.model as string) || 'gpt-4o-mini';
  const prompt = resolveTemplate(config.prompt as string, input);
  const systemPrompt = config.systemPrompt as string | undefined;

  const credentials = await getConnectorCredentials(organizationId, provider);

  let response;
  let usage;

  if (provider === 'openai') {
    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credentials.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: config.temperature || 0.7,
        max_tokens: config.maxTokens || 1024,
      }),
    });

    const data = await res.json();
    
    if (data.error) {
      throw new ConnectorError(`OpenAI error: ${data.error.message}`);
    }

    response = data.choices[0]?.message?.content;
    usage = data.usage;
  } else if (provider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': credentials.apiKey as string,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: config.maxTokens || 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await res.json();

    if (data.error) {
      throw new ConnectorError(`Anthropic error: ${data.error.message}`);
    }

    response = data.content[0]?.text;
    usage = { prompt_tokens: data.usage?.input_tokens, completion_tokens: data.usage?.output_tokens };
  } else {
    throw new ConfigurationError(`Unsupported AI provider: ${provider}`);
  }

  // Record LLM usage
  if (usage) {
    recordLLMUsage(
      provider,
      model,
      'success',
      usage.prompt_tokens || 0,
      usage.completion_tokens || 0,
      0, // Duration calculated externally
      0, // Cost calculated externally
      organizationId
    );
  }

  return {
    response,
    usage,
    model,
    provider,
  };
}

/**
 * Execute transform node (non-sandbox)
 */
async function executeTransformNode(
  nodeType: string,
  config: Record<string, unknown>,
  input: unknown
): Promise<unknown> {
  switch (nodeType) {
    case 'transform-set':
      // Set a value
      return { [config.key as string]: config.value };

    case 'transform-pick':
      // Pick fields from object
      const fields = config.fields as string[];
      const obj = input as Record<string, unknown>;
      return Object.fromEntries(
        fields.filter(f => f in obj).map(f => [f, obj[f]])
      );

    case 'transform-map':
      // Map array items
      const items = input as unknown[];
      const expression = config.expression as string;
      // Simple expression evaluation (for safety, use sandbox for complex)
      return items.map(item => evaluateSimpleExpression(expression, { item }));

    case 'transform-filter':
      // Filter array items
      const filterItems = input as unknown[];
      const condition = config.condition as string;
      return filterItems.filter(item => evaluateSimpleExpression(condition, { item }));

    default:
      return input;
  }
}

/**
 * Execute database node
 */
async function executeDatabaseNode(
  config: Record<string, unknown>,
  input: unknown,
  organizationId: string
): Promise<unknown> {
  const operation = config.operation as string;
  const query = resolveTemplate(config.query as string, input);
  
  // Get database credentials
  const credentials = await getConnectorCredentials(
    organizationId,
    'postgres',
    config.credentialId as string
  );

  // Use pg library
  const { Pool } = await import('pg');
  
  const pool = new Pool({
    connectionString: credentials.connectionString as string,
    ssl: credentials.ssl ? { rejectUnauthorized: false } : false,
  });

  try {
    const result = await pool.query(query);
    return {
      rows: result.rows,
      rowCount: result.rowCount,
    };
  } finally {
    await pool.end();
  }
}

/**
 * Execute generic connector
 */
async function executeGenericConnector(
  nodeType: string,
  config: Record<string, unknown>,
  input: unknown,
  organizationId: string
): Promise<unknown> {
  // Parse connector and action from node type
  const parts = nodeType.replace('action-', '').split('-');
  const connectorName = parts[0];
  const actionName = parts.slice(1).join('-') || 'execute';

  // Dynamic import of connector
  try {
    const connectorModule = await import(`../../../connectors/${connectorName}`);
    const ConnectorClass = connectorModule.default || connectorModule[`${capitalize(connectorName)}Connector`];
    
    if (!ConnectorClass) {
      throw new ConfigurationError(`Connector class not found: ${connectorName}`);
    }

    const connector = new ConnectorClass();
    const credentials = await getConnectorCredentials(organizationId, connectorName);

    const result = await connector.execute(actionName, input, {
      config,
      credentials,
      organizationId,
      logger: logger.child({ connector: connectorName }),
    });

    return result.data;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'MODULE_NOT_FOUND') {
      throw new ConfigurationError(`Connector not found: ${connectorName}`);
    }
    throw error;
  }
}

// ============================================
// Utilities
// ============================================

/**
 * Resolve template strings with input data
 * Replaces {{ expression }} with values
 */
function resolveTemplate(template: string, data: unknown): string {
  if (!template) return '';
  
  return template.replace(/\{\{\s*(.+?)\s*\}\}/g, (_, expression) => {
    try {
      return evaluateSimpleExpression(expression, { input: data, $input: data });
    } catch {
      return '';
    }
  });
}

/**
 * Simple expression evaluator for templates
 * Only supports safe property access, no arbitrary code
 */
function evaluateSimpleExpression(expression: string, context: Record<string, unknown>): unknown {
  // Only allow property access, no function calls
  const safeExpression = expression.replace(/[^a-zA-Z0-9_.$\[\]]/g, '');
  
  const parts = safeExpression.split('.');
  let value: unknown = context;

  for (const part of parts) {
    if (value == null) return undefined;
    
    // Handle array access like [0]
    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      value = (value as Record<string, unknown>)[arrayMatch[1]];
      if (Array.isArray(value)) {
        value = value[parseInt(arrayMatch[2], 10)];
      }
    } else {
      value = (value as Record<string, unknown>)[part];
    }
  }

  return value;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ============================================
// Credential Management (Placeholder)
// ============================================

async function getConnector(name: string): Promise<unknown> {
  // Would load from connector registry
  return null;
}

async function getConnectorCredentials(
  organizationId: string,
  connectorName: string,
  credentialId?: string
): Promise<Record<string, unknown>> {
  // Would load from encrypted credential store
  // For now, return from environment variables
  const envPrefix = connectorName.toUpperCase();
  
  return {
    apiKey: process.env[`${envPrefix}_API_KEY`],
    accessToken: process.env[`${envPrefix}_ACCESS_TOKEN`],
    connectionString: process.env[`${envPrefix}_CONNECTION_STRING`],
  };
}

// ============================================
// Error Types
// ============================================

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class ConnectorError extends Error {
  public readonly details: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = 'ConnectorError';
    this.details = details;
  }
}

export class SandboxSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SandboxSecurityError';
  }
}
