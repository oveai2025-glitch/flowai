/**
 * FlowAtGenAi - Anthropic Connector
 * 
 * AI integration:
 * - Claude conversations
 * - Text analysis
 * - Content generation
 * 
 * @module connectors/anthropic
 */

import { z } from 'zod';
import { createConnector } from '../packages/connector-sdk/src/builder';
import type { TestConnectionResult } from '../packages/connector-sdk/src/types';

export const anthropicConnector = createConnector({
  id: 'anthropic',
  name: 'Anthropic Claude',
  version: '1.0.0',
  category: 'ai',
  description: 'Generate content and analyze text with Claude AI',
  color: '#D4A574',
  icon: 'https://cdn.flowatgenai.com/connectors/anthropic.svg',
  tags: ['ai', 'llm', 'claude', 'text-generation'],
  docsUrl: 'https://docs.anthropic.com/claude/reference',
  baseUrl: 'https://api.anthropic.com/v1',
})
  .withApiKey({
    location: 'header',
    name: 'x-api-key',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  })

  .withAction('createMessage', {
    name: 'Create Message',
    description: 'Generate a response from Claude',
    input: z.object({
      model: z.enum([
        'claude-3-5-sonnet-20241022',
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307',
      ]).default('claude-3-5-sonnet-20241022'),
      messages: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })),
      system: z.string().optional(),
      maxTokens: z.number().optional().default(1024),
      temperature: z.number().min(0).max(1).optional().default(0.7),
      topP: z.number().min(0).max(1).optional(),
      topK: z.number().optional(),
      stopSequences: z.array(z.string()).optional(),
    }),
    output: z.object({
      id: z.string(),
      type: z.string(),
      role: z.string(),
      content: z.array(z.object({
        type: z.string(),
        text: z.string(),
      })),
      model: z.string(),
      stopReason: z.string().nullable(),
      usage: z.object({
        inputTokens: z.number(),
        outputTokens: z.number(),
      }),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.post('/messages', {
        model: input.model,
        messages: input.messages,
        system: input.system,
        max_tokens: input.maxTokens,
        temperature: input.temperature,
        top_p: input.topP,
        top_k: input.topK,
        stop_sequences: input.stopSequences,
      }, {
        headers: {
          'anthropic-version': '2023-06-01',
        },
      });

      const data = response.data as Record<string, unknown>;
      return {
        id: data.id as string,
        type: data.type as string,
        role: data.role as string,
        content: data.content as Array<{ type: string; text: string }>,
        model: data.model as string,
        stopReason: data.stop_reason as string | null,
        usage: {
          inputTokens: (data.usage as Record<string, number>).input_tokens,
          outputTokens: (data.usage as Record<string, number>).output_tokens,
        },
      };
    },
  })

  .withAction('generateText', {
    name: 'Generate Text',
    description: 'Generate text with a simple prompt',
    input: z.object({
      prompt: z.string(),
      model: z.enum([
        'claude-3-5-sonnet-20241022',
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307',
      ]).default('claude-3-5-sonnet-20241022'),
      systemPrompt: z.string().optional(),
      maxTokens: z.number().optional().default(1024),
      temperature: z.number().min(0).max(1).optional().default(0.7),
    }),
    output: z.object({
      text: z.string(),
      usage: z.object({
        inputTokens: z.number(),
        outputTokens: z.number(),
      }),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.post('/messages', {
        model: input.model,
        messages: [{ role: 'user', content: input.prompt }],
        system: input.systemPrompt,
        max_tokens: input.maxTokens,
        temperature: input.temperature,
      }, {
        headers: {
          'anthropic-version': '2023-06-01',
        },
      });

      const data = response.data as Record<string, unknown>;
      const content = data.content as Array<{ type: string; text: string }>;
      
      return {
        text: content[0]?.text || '',
        usage: {
          inputTokens: (data.usage as Record<string, number>).input_tokens,
          outputTokens: (data.usage as Record<string, number>).output_tokens,
        },
      };
    },
  })

  .withAction('summarize', {
    name: 'Summarize Text',
    description: 'Summarize a long piece of text',
    input: z.object({
      text: z.string(),
      style: z.enum(['brief', 'detailed', 'bullets']).optional().default('brief'),
      maxLength: z.number().optional(),
      model: z.enum([
        'claude-3-5-sonnet-20241022',
        'claude-3-haiku-20240307',
      ]).default('claude-3-haiku-20240307'),
    }),
    output: z.object({
      summary: z.string(),
      usage: z.object({
        inputTokens: z.number(),
        outputTokens: z.number(),
      }),
    }),
    execute: async (input, ctx) => {
      const stylePrompts = {
        brief: 'Provide a brief 2-3 sentence summary.',
        detailed: 'Provide a detailed summary covering all key points.',
        bullets: 'Provide a summary as bullet points.',
      };

      const prompt = `${stylePrompts[input.style]}${input.maxLength ? ` Keep it under ${input.maxLength} words.` : ''}\n\nText to summarize:\n${input.text}`;

      const response = await ctx.http.post('/messages', {
        model: input.model,
        messages: [{ role: 'user', content: prompt }],
        system: 'You are a professional summarizer. Provide clear, accurate summaries.',
        max_tokens: 1024,
        temperature: 0.3,
      }, {
        headers: {
          'anthropic-version': '2023-06-01',
        },
      });

      const data = response.data as Record<string, unknown>;
      const content = data.content as Array<{ type: string; text: string }>;
      
      return {
        summary: content[0]?.text || '',
        usage: {
          inputTokens: (data.usage as Record<string, number>).input_tokens,
          outputTokens: (data.usage as Record<string, number>).output_tokens,
        },
      };
    },
  })

  .withAction('extractData', {
    name: 'Extract Structured Data',
    description: 'Extract structured data from text',
    input: z.object({
      text: z.string(),
      schema: z.record(z.string()).describe('JSON schema describing the data to extract'),
      model: z.enum([
        'claude-3-5-sonnet-20241022',
        'claude-3-opus-20240229',
      ]).default('claude-3-5-sonnet-20241022'),
    }),
    output: z.object({
      data: z.record(z.unknown()),
      usage: z.object({
        inputTokens: z.number(),
        outputTokens: z.number(),
      }),
    }),
    execute: async (input, ctx) => {
      const prompt = `Extract the following data from the text and return as JSON:\n\nSchema: ${JSON.stringify(input.schema)}\n\nText:\n${input.text}\n\nRespond only with valid JSON.`;

      const response = await ctx.http.post('/messages', {
        model: input.model,
        messages: [{ role: 'user', content: prompt }],
        system: 'You are a data extraction assistant. Extract data and return only valid JSON.',
        max_tokens: 2048,
        temperature: 0.1,
      }, {
        headers: {
          'anthropic-version': '2023-06-01',
        },
      });

      const data = response.data as Record<string, unknown>;
      const content = data.content as Array<{ type: string; text: string }>;
      
      let extractedData: Record<string, unknown> = {};
      try {
        extractedData = JSON.parse(content[0]?.text || '{}');
      } catch {
        extractedData = { raw: content[0]?.text };
      }

      return {
        data: extractedData,
        usage: {
          inputTokens: (data.usage as Record<string, number>).input_tokens,
          outputTokens: (data.usage as Record<string, number>).output_tokens,
        },
      };
    },
  })

  .withAction('analyzeSentiment', {
    name: 'Analyze Sentiment',
    description: 'Analyze the sentiment of text',
    input: z.object({
      text: z.string(),
    }),
    output: z.object({
      sentiment: z.enum(['positive', 'negative', 'neutral', 'mixed']),
      confidence: z.number(),
      explanation: z.string(),
    }),
    execute: async (input, ctx) => {
      const prompt = `Analyze the sentiment of this text and respond with JSON containing: sentiment (positive/negative/neutral/mixed), confidence (0-1), explanation (brief).\n\nText: ${input.text}`;

      const response = await ctx.http.post('/messages', {
        model: 'claude-3-haiku-20240307',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 256,
        temperature: 0.1,
      }, {
        headers: {
          'anthropic-version': '2023-06-01',
        },
      });

      const data = response.data as Record<string, unknown>;
      const content = data.content as Array<{ type: string; text: string }>;
      
      try {
        return JSON.parse(content[0]?.text || '{}');
      } catch {
        return {
          sentiment: 'neutral' as const,
          confidence: 0.5,
          explanation: content[0]?.text || '',
        };
      }
    },
  })

  .withRateLimit({
    requests: 50,
    window: 60000,
    strategy: 'queue',
  })

  .withTestConnection(async (credentials, ctx): Promise<TestConnectionResult> => {
    try {
      const response = await ctx.http.post('/messages', {
        model: 'claude-3-haiku-20240307',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 10,
      }, {
        headers: {
          'anthropic-version': '2023-06-01',
        },
      });

      return {
        success: true,
        message: 'Successfully connected to Anthropic',
        accountInfo: {},
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  })

  .build();

export default anthropicConnector;
