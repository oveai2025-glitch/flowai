/**
 * OpenAI Connector
 * 
 * Full integration with OpenAI API including:
 * - Chat completions (GPT-4, GPT-3.5)
 * - Embeddings
 * - Image generation (DALL-E)
 * - Audio transcription (Whisper)
 * - Text-to-speech
 * 
 * @module connectors/openai
 */

import { z } from 'zod';
import { createConnector } from '../packages/connector-sdk/src/builder';
import type { ExecutionContext, TestConnectionResult } from '../packages/connector-sdk/src/types';

// ============================================
// Schema Definitions
// ============================================

const messageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'function', 'tool']),
  content: z.string().nullable(),
  name: z.string().optional(),
  function_call: z.object({
    name: z.string(),
    arguments: z.string(),
  }).optional(),
  tool_calls: z.array(z.object({
    id: z.string(),
    type: z.literal('function'),
    function: z.object({
      name: z.string(),
      arguments: z.string(),
    }),
  })).optional(),
});

const toolSchema = z.object({
  type: z.literal('function'),
  function: z.object({
    name: z.string(),
    description: z.string().optional(),
    parameters: z.record(z.unknown()).optional(),
  }),
});

// ============================================
// OpenAI Connector
// ============================================

export const openaiConnector = createConnector({
  id: 'openai',
  name: 'OpenAI',
  version: '1.0.0',
  category: 'ai',
  description: 'Access GPT-4, DALL-E, Whisper, and other OpenAI models',
  color: '#10A37F',
  icon: 'https://cdn.wfaib.io/connectors/openai.svg',
  tags: ['ai', 'llm', 'gpt', 'chatgpt', 'image', 'embeddings'],
  docsUrl: 'https://platform.openai.com/docs',
  baseUrl: 'https://api.openai.com/v1',
})
  // ============================================
  // Authentication
  // ============================================
  .withApiKey({
    location: 'header',
    name: 'Authorization',
    prefix: 'Bearer ',
    fields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        description: 'Your OpenAI API key from platform.openai.com',
        placeholder: 'sk-...',
      },
      {
        key: 'organizationId',
        label: 'Organization ID',
        type: 'string',
        required: false,
        description: 'Optional organization ID for API requests',
        placeholder: 'org-...',
      },
    ],
  })

  // ============================================
  // Chat Completion Action
  // ============================================
  .withAction('chatCompletion', {
    name: 'Chat Completion',
    description: 'Generate a response using GPT models',
    input: z.object({
      model: z.enum([
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-4-turbo',
        'gpt-4',
        'gpt-3.5-turbo',
        'gpt-3.5-turbo-16k',
      ]).default('gpt-4o-mini'),
      messages: z.array(messageSchema).min(1),
      temperature: z.number().min(0).max(2).default(0.7),
      maxTokens: z.number().min(1).max(128000).optional(),
      topP: z.number().min(0).max(1).optional(),
      frequencyPenalty: z.number().min(-2).max(2).optional(),
      presencePenalty: z.number().min(-2).max(2).optional(),
      stop: z.array(z.string()).max(4).optional(),
      tools: z.array(toolSchema).optional(),
      toolChoice: z.union([
        z.literal('none'),
        z.literal('auto'),
        z.literal('required'),
        z.object({
          type: z.literal('function'),
          function: z.object({ name: z.string() }),
        }),
      ]).optional(),
      responseFormat: z.object({
        type: z.enum(['text', 'json_object']),
      }).optional(),
      seed: z.number().int().optional(),
      user: z.string().optional(),
    }),
    output: z.object({
      id: z.string(),
      object: z.string(),
      created: z.number(),
      model: z.string(),
      choices: z.array(z.object({
        index: z.number(),
        message: messageSchema,
        finish_reason: z.string().nullable(),
      })),
      usage: z.object({
        prompt_tokens: z.number(),
        completion_tokens: z.number(),
        total_tokens: z.number(),
      }),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.post<OpenAIChatResponse>('/chat/completions', {
        model: input.model,
        messages: input.messages,
        temperature: input.temperature,
        max_tokens: input.maxTokens,
        top_p: input.topP,
        frequency_penalty: input.frequencyPenalty,
        presence_penalty: input.presencePenalty,
        stop: input.stop,
        tools: input.tools,
        tool_choice: input.toolChoice,
        response_format: input.responseFormat,
        seed: input.seed,
        user: input.user,
      });

      ctx.logger.info('OpenAI chat completion', {
        model: input.model,
        promptTokens: response.data.usage?.prompt_tokens,
        completionTokens: response.data.usage?.completion_tokens,
      });

      return response.data;
    },
    retry: {
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      retryableStatuses: [429, 500, 502, 503],
    },
  })

  // ============================================
  // Simple Prompt Action (Convenience)
  // ============================================
  .withAction('prompt', {
    name: 'Simple Prompt',
    description: 'Send a simple prompt and get a text response',
    input: z.object({
      prompt: z.string().describe('Your prompt/question'),
      systemPrompt: z.string().optional().describe('System instructions'),
      model: z.enum(['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo']).default('gpt-4o-mini'),
      temperature: z.number().min(0).max(2).default(0.7),
      maxTokens: z.number().optional(),
    }),
    output: z.object({
      response: z.string(),
      model: z.string(),
      usage: z.object({
        promptTokens: z.number(),
        completionTokens: z.number(),
        totalTokens: z.number(),
      }),
    }),
    execute: async (input, ctx) => {
      const messages = [];
      
      if (input.systemPrompt) {
        messages.push({ role: 'system' as const, content: input.systemPrompt });
      }
      messages.push({ role: 'user' as const, content: input.prompt });

      const response = await ctx.http.post<OpenAIChatResponse>('/chat/completions', {
        model: input.model,
        messages,
        temperature: input.temperature,
        max_tokens: input.maxTokens,
      });

      return {
        response: response.data.choices[0]?.message?.content || '',
        model: response.data.model,
        usage: {
          promptTokens: response.data.usage?.prompt_tokens || 0,
          completionTokens: response.data.usage?.completion_tokens || 0,
          totalTokens: response.data.usage?.total_tokens || 0,
        },
      };
    },
  })

  // ============================================
  // Embeddings Action
  // ============================================
  .withAction('createEmbedding', {
    name: 'Create Embedding',
    description: 'Generate embeddings for text (useful for search, clustering)',
    input: z.object({
      input: z.union([
        z.string(),
        z.array(z.string()),
      ]).describe('Text to embed'),
      model: z.enum([
        'text-embedding-3-small',
        'text-embedding-3-large',
        'text-embedding-ada-002',
      ]).default('text-embedding-3-small'),
      dimensions: z.number().optional().describe('Output dimensions (for embedding-3 models)'),
    }),
    output: z.object({
      object: z.string(),
      data: z.array(z.object({
        object: z.string(),
        index: z.number(),
        embedding: z.array(z.number()),
      })),
      model: z.string(),
      usage: z.object({
        prompt_tokens: z.number(),
        total_tokens: z.number(),
      }),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.post<OpenAIEmbeddingResponse>('/embeddings', {
        input: input.input,
        model: input.model,
        dimensions: input.dimensions,
      });

      return response.data;
    },
  })

  // ============================================
  // Image Generation Action
  // ============================================
  .withAction('generateImage', {
    name: 'Generate Image',
    description: 'Generate images with DALL-E',
    input: z.object({
      prompt: z.string().max(4000).describe('Image description'),
      model: z.enum(['dall-e-3', 'dall-e-2']).default('dall-e-3'),
      n: z.number().min(1).max(10).default(1).describe('Number of images'),
      size: z.enum([
        '256x256',   // DALL-E 2 only
        '512x512',   // DALL-E 2 only
        '1024x1024',
        '1792x1024', // DALL-E 3 only
        '1024x1792', // DALL-E 3 only
      ]).default('1024x1024'),
      quality: z.enum(['standard', 'hd']).default('standard'),
      style: z.enum(['vivid', 'natural']).default('vivid'),
      responseFormat: z.enum(['url', 'b64_json']).default('url'),
    }),
    output: z.object({
      created: z.number(),
      data: z.array(z.object({
        url: z.string().optional(),
        b64_json: z.string().optional(),
        revised_prompt: z.string().optional(),
      })),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.post<OpenAIImageResponse>('/images/generations', {
        prompt: input.prompt,
        model: input.model,
        n: input.n,
        size: input.size,
        quality: input.quality,
        style: input.style,
        response_format: input.responseFormat,
      });

      return response.data;
    },
  })

  // ============================================
  // Audio Transcription Action
  // ============================================
  .withAction('transcribeAudio', {
    name: 'Transcribe Audio',
    description: 'Transcribe audio to text with Whisper',
    input: z.object({
      audioUrl: z.string().url().describe('URL to audio file'),
      model: z.enum(['whisper-1']).default('whisper-1'),
      language: z.string().optional().describe('ISO 639-1 language code'),
      prompt: z.string().optional().describe('Optional prompt to guide transcription'),
      responseFormat: z.enum(['json', 'text', 'srt', 'verbose_json', 'vtt']).default('json'),
      temperature: z.number().min(0).max(1).optional(),
    }),
    output: z.object({
      text: z.string(),
      language: z.string().optional(),
      duration: z.number().optional(),
      segments: z.array(z.object({
        id: z.number(),
        start: z.number(),
        end: z.number(),
        text: z.string(),
      })).optional(),
    }),
    execute: async (input, ctx) => {
      // Fetch the audio file
      const audioResponse = await fetch(input.audioUrl);
      const audioBlob = await audioResponse.blob();

      // Create form data
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.mp3');
      formData.append('model', input.model);
      
      if (input.language) formData.append('language', input.language);
      if (input.prompt) formData.append('prompt', input.prompt);
      formData.append('response_format', input.responseFormat);
      if (input.temperature) formData.append('temperature', String(input.temperature));

      const response = await ctx.http.post<OpenAITranscriptionResponse>(
        '/audio/transcriptions',
        formData
      );

      return response.data;
    },
  })

  // ============================================
  // Text-to-Speech Action
  // ============================================
  .withAction('textToSpeech', {
    name: 'Text to Speech',
    description: 'Convert text to speech audio',
    input: z.object({
      input: z.string().max(4096).describe('Text to convert to speech'),
      model: z.enum(['tts-1', 'tts-1-hd']).default('tts-1'),
      voice: z.enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']).default('alloy'),
      responseFormat: z.enum(['mp3', 'opus', 'aac', 'flac', 'wav', 'pcm']).default('mp3'),
      speed: z.number().min(0.25).max(4).default(1),
    }),
    output: z.object({
      audioBase64: z.string(),
      format: z.string(),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.post('/audio/speech', {
        input: input.input,
        model: input.model,
        voice: input.voice,
        response_format: input.responseFormat,
        speed: input.speed,
      });

      // Convert binary response to base64
      const buffer = Buffer.from(response.data as ArrayBuffer);
      
      return {
        audioBase64: buffer.toString('base64'),
        format: input.responseFormat,
      };
    },
  })

  // ============================================
  // List Models Action
  // ============================================
  .withAction('listModels', {
    name: 'List Models',
    description: 'Get a list of available models',
    input: z.object({}),
    output: z.object({
      object: z.string(),
      data: z.array(z.object({
        id: z.string(),
        object: z.string(),
        created: z.number(),
        owned_by: z.string(),
      })),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.get<OpenAIModelsResponse>('/models');
      return response.data;
    },
  })

  // ============================================
  // Rate Limiting
  // ============================================
  .withRateLimit({
    requests: 60,
    window: 60000,
    strategy: 'queue',
  })

  // ============================================
  // Test Connection
  // ============================================
  .withTestConnection(async (credentials, ctx): Promise<TestConnectionResult> => {
    try {
      const response = await ctx.http.get<OpenAIModelsResponse>('/models');
      
      // Find available models
      const models = response.data.data
        .filter(m => m.id.includes('gpt'))
        .map(m => m.id)
        .slice(0, 5);

      return {
        success: true,
        message: 'Successfully connected to OpenAI',
        accountInfo: {
          availableModels: models,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection failed';
      
      // Check for specific error types
      if (message.includes('401')) {
        return {
          success: false,
          message: 'Invalid API key',
        };
      }

      return {
        success: false,
        message,
      };
    }
  })

  .build();

// ============================================
// Type Definitions (Internal)
// ============================================

interface OpenAIChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string | null;
      function_call?: {
        name: string;
        arguments: string;
      };
      tool_calls?: Array<{
        id: string;
        type: string;
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenAIEmbeddingResponse {
  object: string;
  data: Array<{
    object: string;
    index: number;
    embedding: number[];
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

interface OpenAIImageResponse {
  created: number;
  data: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }>;
}

interface OpenAITranscriptionResponse {
  text: string;
  language?: string;
  duration?: number;
  segments?: Array<{
    id: number;
    start: number;
    end: number;
    text: string;
  }>;
}

interface OpenAIModelsResponse {
  object: string;
  data: Array<{
    id: string;
    object: string;
    created: number;
    owned_by: string;
  }>;
}

export default openaiConnector;
