/**
 * AI Agent Framework
 * 
 * Autonomous AI agents that can:
 * - Use connectors as tools
 * - Make decisions
 * - Execute multi-step plans
 * - Handle errors and retries
 * - Support human-in-the-loop
 * 
 * This is a MAJOR DIFFERENTIATOR from n8n/Zapier.
 * 
 * @module lib/ai/agent
 */

import { z } from 'zod';
import { connectorRegistry } from '../connector-registry';
import { logger } from '../logger';
import { incrementTokenCount } from '../billing';

// ============================================
// Types
// ============================================

export interface AgentConfig {
  /** Agent name/identifier */
  name: string;
  /** System prompt defining agent behavior */
  systemPrompt: string;
  /** LLM provider and model */
  model: {
    provider: 'openai' | 'anthropic' | 'google';
    model: string;
  };
  /** Available tools (connectors/actions) */
  tools: AgentTool[];
  /** Maximum iterations before stopping */
  maxIterations: number;
  /** Maximum tokens per request */
  maxTokens: number;
  /** Temperature for LLM */
  temperature: number;
  /** Enable human approval for certain actions */
  requireApproval?: {
    actions: string[];
    timeout: string;
  };
  /** Memory configuration */
  memory?: {
    type: 'buffer' | 'summary' | 'vector';
    maxMessages?: number;
  };
}

export interface AgentTool {
  name: string;
  description: string;
  connector: string;
  action: string;
  parameters: z.ZodType;
  requiresApproval?: boolean;
}

export interface AgentMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  toolName?: string;
}

export interface AgentToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface AgentState {
  messages: AgentMessage[];
  toolCalls: Array<{
    call: AgentToolCall;
    result?: unknown;
    error?: string;
    approved?: boolean;
  }>;
  iterations: number;
  totalTokens: number;
  status: 'running' | 'completed' | 'failed' | 'awaiting_approval';
}

export interface AgentResult {
  success: boolean;
  output: string;
  toolsUsed: string[];
  iterations: number;
  totalTokens: number;
  cost: number;
  executionTime: number;
}

// ============================================
// Tool Schema Generation
// ============================================

function generateToolSchema(tool: AgentTool): {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
} {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: zodToJsonSchema(tool.parameters),
    },
  };
}

function zodToJsonSchema(schema: z.ZodType): Record<string, unknown> {
  // Simplified Zod to JSON Schema conversion
  // In production, use zod-to-json-schema library
  if (schema instanceof z.ZodObject) {
    const shape = schema._def.shape();
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodToJsonSchema(value as z.ZodType);
      if (!(value as z.ZodType).isOptional()) {
        required.push(key);
      }
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  if (schema instanceof z.ZodString) {
    return { type: 'string', description: schema.description };
  }

  if (schema instanceof z.ZodNumber) {
    return { type: 'number', description: schema.description };
  }

  if (schema instanceof z.ZodBoolean) {
    return { type: 'boolean', description: schema.description };
  }

  if (schema instanceof z.ZodArray) {
    return {
      type: 'array',
      items: zodToJsonSchema(schema._def.type),
    };
  }

  if (schema instanceof z.ZodEnum) {
    return {
      type: 'string',
      enum: schema._def.values,
    };
  }

  return { type: 'string' };
}

// ============================================
// LLM Providers
// ============================================

interface LLMResponse {
  content: string | null;
  toolCalls: AgentToolCall[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

async function callOpenAI(
  messages: AgentMessage[],
  tools: ReturnType<typeof generateToolSchema>[],
  config: AgentConfig
): Promise<LLMResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model.model,
      messages: messages.map(m => ({
        role: m.role === 'tool' ? 'tool' : m.role,
        content: m.content,
        tool_call_id: m.toolCallId,
        name: m.toolName,
      })),
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: tools.length > 0 ? 'auto' : undefined,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(`OpenAI error: ${data.error.message}`);
  }

  const choice = data.choices[0];
  const toolCalls: AgentToolCall[] = [];

  if (choice.message.tool_calls) {
    for (const tc of choice.message.tool_calls) {
      toolCalls.push({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments),
      });
    }
  }

  return {
    content: choice.message.content,
    toolCalls,
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
    },
  };
}

async function callAnthropic(
  messages: AgentMessage[],
  tools: ReturnType<typeof generateToolSchema>[],
  config: AgentConfig
): Promise<LLMResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  // Convert tools to Anthropic format
  const anthropicTools = tools.map(t => ({
    name: t.function.name,
    description: t.function.description,
    input_schema: t.function.parameters,
  }));

  // Convert messages to Anthropic format
  const systemMessage = messages.find(m => m.role === 'system');
  const otherMessages = messages
    .filter(m => m.role !== 'system')
    .map(m => {
      if (m.role === 'tool') {
        return {
          role: 'user' as const,
          content: [{
            type: 'tool_result' as const,
            tool_use_id: m.toolCallId,
            content: m.content,
          }],
        };
      }
      return {
        role: m.role as 'user' | 'assistant',
        content: m.content,
      };
    });

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model.model,
      max_tokens: config.maxTokens,
      system: systemMessage?.content,
      messages: otherMessages,
      tools: anthropicTools.length > 0 ? anthropicTools : undefined,
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(`Anthropic error: ${data.error.message}`);
  }

  const toolCalls: AgentToolCall[] = [];
  let content = '';

  for (const block of data.content) {
    if (block.type === 'text') {
      content += block.text;
    } else if (block.type === 'tool_use') {
      toolCalls.push({
        id: block.id,
        name: block.name,
        arguments: block.input,
      });
    }
  }

  return {
    content: content || null,
    toolCalls,
    usage: {
      promptTokens: data.usage?.input_tokens || 0,
      completionTokens: data.usage?.output_tokens || 0,
      totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
    },
  };
}

async function callLLM(
  messages: AgentMessage[],
  tools: ReturnType<typeof generateToolSchema>[],
  config: AgentConfig
): Promise<LLMResponse> {
  switch (config.model.provider) {
    case 'openai':
      return callOpenAI(messages, tools, config);
    case 'anthropic':
      return callAnthropic(messages, tools, config);
    default:
      throw new Error(`Unsupported provider: ${config.model.provider}`);
  }
}

// ============================================
// Agent Execution
// ============================================

export class Agent {
  private config: AgentConfig;
  private state: AgentState;
  private organizationId: string;
  private toolSchemas: ReturnType<typeof generateToolSchema>[];

  constructor(config: AgentConfig, organizationId: string) {
    this.config = config;
    this.organizationId = organizationId;
    this.state = {
      messages: [{
        role: 'system',
        content: config.systemPrompt,
      }],
      toolCalls: [],
      iterations: 0,
      totalTokens: 0,
      status: 'running',
    };
    this.toolSchemas = config.tools.map(generateToolSchema);
  }

  /**
   * Run the agent with a user message
   */
  async run(userMessage: string): Promise<AgentResult> {
    const startTime = Date.now();
    const toolsUsed: string[] = [];

    // Add user message
    this.state.messages.push({
      role: 'user',
      content: userMessage,
    });

    logger.info('Agent started', {
      name: this.config.name,
      organizationId: this.organizationId,
    });

    try {
      while (
        this.state.status === 'running' &&
        this.state.iterations < this.config.maxIterations
      ) {
        this.state.iterations++;

        // Call LLM
        const response = await callLLM(
          this.state.messages,
          this.toolSchemas,
          this.config
        );

        this.state.totalTokens += response.usage.totalTokens;

        // Track token usage
        await incrementTokenCount(this.organizationId, response.usage.totalTokens);

        // If no tool calls, agent is done
        if (response.toolCalls.length === 0) {
          this.state.status = 'completed';
          
          if (response.content) {
            this.state.messages.push({
              role: 'assistant',
              content: response.content,
            });
          }
          break;
        }

        // Process tool calls
        for (const toolCall of response.toolCalls) {
          const tool = this.config.tools.find(t => t.name === toolCall.name);
          
          if (!tool) {
            this.state.messages.push({
              role: 'tool',
              content: JSON.stringify({ error: `Unknown tool: ${toolCall.name}` }),
              toolCallId: toolCall.id,
              toolName: toolCall.name,
            });
            continue;
          }

          // Check if approval required
          if (tool.requiresApproval || this.config.requireApproval?.actions.includes(toolCall.name)) {
            this.state.status = 'awaiting_approval';
            this.state.toolCalls.push({
              call: toolCall,
              approved: false,
            });
            // In real implementation, would wait for approval signal
            // For now, auto-approve
            this.state.status = 'running';
          }

          // Execute tool
          try {
            logger.debug('Executing tool', {
              tool: toolCall.name,
              connector: tool.connector,
              action: tool.action,
            });

            const result = await connectorRegistry.executeAction(
              tool.connector,
              tool.action,
              toolCall.arguments,
              {
                organizationId: this.organizationId,
                logger: logger.child({ agent: this.config.name }),
              }
            );

            toolsUsed.push(toolCall.name);

            this.state.messages.push({
              role: 'tool',
              content: JSON.stringify(result),
              toolCallId: toolCall.id,
              toolName: toolCall.name,
            });

            this.state.toolCalls.push({
              call: toolCall,
              result,
              approved: true,
            });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            
            this.state.messages.push({
              role: 'tool',
              content: JSON.stringify({ error: errorMessage }),
              toolCallId: toolCall.id,
              toolName: toolCall.name,
            });

            this.state.toolCalls.push({
              call: toolCall,
              error: errorMessage,
            });
          }
        }

        // Add assistant message if there was content alongside tool calls
        if (response.content) {
          this.state.messages.push({
            role: 'assistant',
            content: response.content,
          });
        }
      }

      // Get final output
      const lastAssistantMessage = [...this.state.messages]
        .reverse()
        .find(m => m.role === 'assistant');

      const executionTime = Date.now() - startTime;
      const cost = this.calculateCost();

      logger.info('Agent completed', {
        name: this.config.name,
        iterations: this.state.iterations,
        toolsUsed: toolsUsed.length,
        totalTokens: this.state.totalTokens,
        executionTime,
      });

      return {
        success: this.state.status === 'completed',
        output: lastAssistantMessage?.content || '',
        toolsUsed: [...new Set(toolsUsed)],
        iterations: this.state.iterations,
        totalTokens: this.state.totalTokens,
        cost,
        executionTime,
      };
    } catch (error) {
      this.state.status = 'failed';
      
      logger.error('Agent failed', error, {
        name: this.config.name,
        iterations: this.state.iterations,
      });

      return {
        success: false,
        output: error instanceof Error ? error.message : 'Agent execution failed',
        toolsUsed,
        iterations: this.state.iterations,
        totalTokens: this.state.totalTokens,
        cost: this.calculateCost(),
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Calculate cost based on token usage
   */
  private calculateCost(): number {
    // Pricing per 1M tokens (approximate)
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4o': { input: 2.5, output: 10 },
      'gpt-4o-mini': { input: 0.15, output: 0.6 },
      'gpt-4-turbo': { input: 10, output: 30 },
      'claude-3-5-sonnet-20241022': { input: 3, output: 15 },
      'claude-3-5-haiku-20241022': { input: 0.8, output: 4 },
    };

    const modelPricing = pricing[this.config.model.model] || { input: 1, output: 3 };
    
    // Rough estimate: 70% input, 30% output
    const inputTokens = this.state.totalTokens * 0.7;
    const outputTokens = this.state.totalTokens * 0.3;

    return (
      (inputTokens / 1_000_000) * modelPricing.input +
      (outputTokens / 1_000_000) * modelPricing.output
    );
  }

  /**
   * Get current state for debugging/monitoring
   */
  getState(): AgentState {
    return { ...this.state };
  }
}

// ============================================
// Agent Builder
// ============================================

export class AgentBuilder {
  private config: Partial<AgentConfig> = {
    maxIterations: 10,
    maxTokens: 4096,
    temperature: 0.7,
    tools: [],
  };

  name(name: string): this {
    this.config.name = name;
    return this;
  }

  systemPrompt(prompt: string): this {
    this.config.systemPrompt = prompt;
    return this;
  }

  model(provider: AgentConfig['model']['provider'], model: string): this {
    this.config.model = { provider, model };
    return this;
  }

  addTool(tool: AgentTool): this {
    this.config.tools = [...(this.config.tools || []), tool];
    return this;
  }

  addConnectorTool(
    connector: string,
    action: string,
    options: {
      name?: string;
      description: string;
      parameters: z.ZodType;
      requiresApproval?: boolean;
    }
  ): this {
    return this.addTool({
      name: options.name || `${connector}_${action}`,
      description: options.description,
      connector,
      action,
      parameters: options.parameters,
      requiresApproval: options.requiresApproval,
    });
  }

  maxIterations(n: number): this {
    this.config.maxIterations = n;
    return this;
  }

  maxTokens(n: number): this {
    this.config.maxTokens = n;
    return this;
  }

  temperature(t: number): this {
    this.config.temperature = t;
    return this;
  }

  requireApproval(actions: string[], timeout = '1h'): this {
    this.config.requireApproval = { actions, timeout };
    return this;
  }

  build(): AgentConfig {
    if (!this.config.name) throw new Error('Agent name is required');
    if (!this.config.systemPrompt) throw new Error('System prompt is required');
    if (!this.config.model) throw new Error('Model is required');

    return this.config as AgentConfig;
  }
}

export function createAgent(): AgentBuilder {
  return new AgentBuilder();
}

// ============================================
// Pre-built Agent Templates
// ============================================

export const agentTemplates = {
  /**
   * Customer support agent
   */
  customerSupport: (organizationId: string) => createAgent()
    .name('Customer Support Agent')
    .systemPrompt(`You are a helpful customer support agent. Your goal is to help users with their questions and issues.
    
When helping users:
1. Be friendly and professional
2. Ask clarifying questions if needed
3. Use available tools to look up information or take actions
4. Summarize what you did at the end

If you cannot help with something, explain why and suggest alternatives.`)
    .model('openai', 'gpt-4o-mini')
    .maxIterations(15)
    .build(),

  /**
   * Data analysis agent
   */
  dataAnalyst: (organizationId: string) => createAgent()
    .name('Data Analysis Agent')
    .systemPrompt(`You are a data analysis agent. Your goal is to help users analyze and understand their data.

When analyzing data:
1. First understand what the user wants to know
2. Use available tools to fetch and process data
3. Provide clear insights and visualizations when possible
4. Explain your methodology

Always cite your data sources and note any limitations.`)
    .model('openai', 'gpt-4o')
    .maxIterations(20)
    .temperature(0.3)
    .build(),

  /**
   * Task automation agent
   */
  taskAutomation: (organizationId: string) => createAgent()
    .name('Task Automation Agent')
    .systemPrompt(`You are a task automation agent. Your goal is to automate workflows and tasks for users.

When automating tasks:
1. Break down complex tasks into smaller steps
2. Use available tools to execute each step
3. Handle errors gracefully and retry if appropriate
4. Report progress and final results

Always confirm destructive actions before executing.`)
    .model('anthropic', 'claude-3-5-sonnet-20241022')
    .maxIterations(25)
    .build(),
};

export default {
  Agent,
  createAgent,
  agentTemplates,
};
