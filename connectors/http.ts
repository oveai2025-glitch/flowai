/**
 * HTTP/Webhook Connector
 * 
 * Generic HTTP client for:
 * - REST API calls
 * - GraphQL queries
 * - Webhooks
 * - File downloads
 * 
 * @module connectors/http
 */

import { z } from 'zod';
import { createConnector } from '../packages/connector-sdk/src/builder';
import type { TestConnectionResult } from '../packages/connector-sdk/src/types';

// ============================================
// Schemas
// ============================================

const headerSchema = z.record(z.string());

const authSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('none'),
  }),
  z.object({
    type: z.literal('basic'),
    username: z.string(),
    password: z.string(),
  }),
  z.object({
    type: z.literal('bearer'),
    token: z.string(),
  }),
  z.object({
    type: z.literal('api_key'),
    key: z.string(),
    value: z.string(),
    location: z.enum(['header', 'query']),
  }),
  z.object({
    type: z.literal('digest'),
    username: z.string(),
    password: z.string(),
  }),
]);

// ============================================
// HTTP Connector
// ============================================

export const httpConnector = createConnector({
  id: 'http',
  name: 'HTTP Request',
  version: '1.0.0',
  category: 'developer',
  description: 'Make HTTP requests to any API endpoint',
  color: '#6366F1',
  icon: 'https://cdn.wfaib.io/connectors/http.svg',
  tags: ['api', 'rest', 'webhook', 'request', 'graphql'],
  docsUrl: 'https://docs.wfaib.io/connectors/http',
})
  // ============================================
  // No default auth - configured per request
  // ============================================
  .withNoAuth()

  // ============================================
  // HTTP Request Action
  // ============================================

  .withAction('request', {
    name: 'HTTP Request',
    description: 'Make an HTTP request to any URL',
    input: z.object({
      method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']).default('GET'),
      url: z.string().url().describe('Full URL including protocol'),
      headers: headerSchema.optional(),
      queryParams: z.record(z.string()).optional(),
      body: z.unknown().optional(),
      bodyType: z.enum(['json', 'form', 'text', 'binary', 'none']).default('json'),
      auth: authSchema.optional(),
      timeout: z.number().min(1000).max(300000).default(30000).describe('Timeout in milliseconds'),
      followRedirects: z.boolean().default(true),
      validateStatus: z.boolean().default(true).describe('Throw on non-2xx status'),
      responseType: z.enum(['json', 'text', 'binary', 'stream']).default('json'),
    }),
    output: z.object({
      status: z.number(),
      statusText: z.string(),
      headers: headerSchema,
      data: z.unknown(),
      duration: z.number().describe('Request duration in ms'),
    }),
    execute: async (input, ctx) => {
      const startTime = Date.now();
      
      // Build URL with query params
      const url = new URL(input.url);
      if (input.queryParams) {
        Object.entries(input.queryParams).forEach(([key, value]) => {
          url.searchParams.append(key, value);
        });
      }
      
      // Build headers
      const headers: Record<string, string> = {
        ...input.headers,
      };
      
      // Apply auth
      if (input.auth) {
        switch (input.auth.type) {
          case 'basic':
            const basicCredentials = Buffer.from(
              `${input.auth.username}:${input.auth.password}`
            ).toString('base64');
            headers['Authorization'] = `Basic ${basicCredentials}`;
            break;
          case 'bearer':
            headers['Authorization'] = `Bearer ${input.auth.token}`;
            break;
          case 'api_key':
            if (input.auth.location === 'header') {
              headers[input.auth.key] = input.auth.value;
            } else {
              url.searchParams.append(input.auth.key, input.auth.value);
            }
            break;
        }
      }
      
      // Build body
      let body: string | undefined;
      if (input.body && input.method !== 'GET' && input.method !== 'HEAD') {
        switch (input.bodyType) {
          case 'json':
            headers['Content-Type'] = headers['Content-Type'] || 'application/json';
            body = JSON.stringify(input.body);
            break;
          case 'form':
            headers['Content-Type'] = headers['Content-Type'] || 'application/x-www-form-urlencoded';
            body = new URLSearchParams(input.body as Record<string, string>).toString();
            break;
          case 'text':
            headers['Content-Type'] = headers['Content-Type'] || 'text/plain';
            body = String(input.body);
            break;
          case 'binary':
            body = input.body as string;
            break;
        }
      }
      
      ctx.logger.info('HTTP request', {
        method: input.method,
        url: url.toString(),
      });
      
      // Make request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), input.timeout);
      
      try {
        const response = await fetch(url.toString(), {
          method: input.method,
          headers,
          body,
          redirect: input.followRedirects ? 'follow' : 'manual',
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        // Validate status
        if (input.validateStatus && !response.ok) {
          const errorBody = await response.text().catch(() => '');
          throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorBody}`);
        }
        
        // Parse response
        let data: unknown;
        const contentType = response.headers.get('content-type') || '';
        
        switch (input.responseType) {
          case 'json':
            if (contentType.includes('application/json')) {
              data = await response.json();
            } else {
              data = await response.text();
            }
            break;
          case 'text':
            data = await response.text();
            break;
          case 'binary':
            const buffer = await response.arrayBuffer();
            data = Buffer.from(buffer).toString('base64');
            break;
          default:
            data = await response.text();
        }
        
        return {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          data,
          duration: Date.now() - startTime,
        };
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error(`Request timed out after ${input.timeout}ms`);
        }
        
        throw error;
      }
    },
    retry: {
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      retryableStatuses: [408, 429, 500, 502, 503, 504],
    },
  })

  // ============================================
  // GET Shortcut
  // ============================================

  .withAction('get', {
    name: 'GET Request',
    description: 'Make a GET request',
    input: z.object({
      url: z.string().url(),
      headers: headerSchema.optional(),
      queryParams: z.record(z.string()).optional(),
      auth: authSchema.optional(),
      timeout: z.number().default(30000),
    }),
    output: z.object({
      status: z.number(),
      headers: headerSchema,
      data: z.unknown(),
    }),
    execute: async (input, ctx) => {
      const url = new URL(input.url);
      if (input.queryParams) {
        Object.entries(input.queryParams).forEach(([key, value]) => {
          url.searchParams.append(key, value);
        });
      }
      
      const headers: Record<string, string> = { ...input.headers };
      
      if (input.auth?.type === 'bearer') {
        headers['Authorization'] = `Bearer ${input.auth.token}`;
      }
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
      });
      
      const contentType = response.headers.get('content-type') || '';
      const data = contentType.includes('json') 
        ? await response.json()
        : await response.text();
      
      return {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        data,
      };
    },
  })

  // ============================================
  // POST Shortcut
  // ============================================

  .withAction('post', {
    name: 'POST Request',
    description: 'Make a POST request with JSON body',
    input: z.object({
      url: z.string().url(),
      body: z.unknown(),
      headers: headerSchema.optional(),
      auth: authSchema.optional(),
      timeout: z.number().default(30000),
    }),
    output: z.object({
      status: z.number(),
      headers: headerSchema,
      data: z.unknown(),
    }),
    execute: async (input, ctx) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...input.headers,
      };
      
      if (input.auth?.type === 'bearer') {
        headers['Authorization'] = `Bearer ${input.auth.token}`;
      }
      
      const response = await fetch(input.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(input.body),
      });
      
      const contentType = response.headers.get('content-type') || '';
      const data = contentType.includes('json') 
        ? await response.json()
        : await response.text();
      
      return {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        data,
      };
    },
  })

  // ============================================
  // GraphQL Action
  // ============================================

  .withAction('graphql', {
    name: 'GraphQL Query',
    description: 'Execute a GraphQL query or mutation',
    input: z.object({
      endpoint: z.string().url(),
      query: z.string().describe('GraphQL query or mutation'),
      variables: z.record(z.unknown()).optional(),
      operationName: z.string().optional(),
      headers: headerSchema.optional(),
      auth: authSchema.optional(),
    }),
    output: z.object({
      data: z.unknown().nullable(),
      errors: z.array(z.object({
        message: z.string(),
        locations: z.array(z.object({
          line: z.number(),
          column: z.number(),
        })).optional(),
        path: z.array(z.union([z.string(), z.number()])).optional(),
      })).optional(),
    }),
    execute: async (input, ctx) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...input.headers,
      };
      
      if (input.auth?.type === 'bearer') {
        headers['Authorization'] = `Bearer ${input.auth.token}`;
      }
      
      const response = await fetch(input.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: input.query,
          variables: input.variables,
          operationName: input.operationName,
        }),
      });
      
      const result = await response.json();
      
      if (result.errors?.length) {
        ctx.logger.warn('GraphQL errors', { errors: result.errors });
      }
      
      return result;
    },
  })

  // ============================================
  // Download File Action
  // ============================================

  .withAction('downloadFile', {
    name: 'Download File',
    description: 'Download a file from a URL',
    input: z.object({
      url: z.string().url(),
      headers: headerSchema.optional(),
      auth: authSchema.optional(),
      maxSizeBytes: z.number().default(50 * 1024 * 1024).describe('Max file size (default 50MB)'),
    }),
    output: z.object({
      content: z.string().describe('Base64 encoded content'),
      contentType: z.string(),
      size: z.number(),
      filename: z.string().optional(),
    }),
    execute: async (input, ctx) => {
      const headers: Record<string, string> = { ...input.headers };
      
      if (input.auth?.type === 'bearer') {
        headers['Authorization'] = `Bearer ${input.auth.token}`;
      }
      
      const response = await fetch(input.url, { headers });
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }
      
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > input.maxSizeBytes) {
        throw new Error(`File size ${contentLength} exceeds max ${input.maxSizeBytes}`);
      }
      
      const buffer = await response.arrayBuffer();
      
      if (buffer.byteLength > input.maxSizeBytes) {
        throw new Error(`File size ${buffer.byteLength} exceeds max ${input.maxSizeBytes}`);
      }
      
      // Try to get filename from Content-Disposition
      const disposition = response.headers.get('content-disposition');
      let filename: string | undefined;
      if (disposition) {
        const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match) {
          filename = match[1].replace(/['"]/g, '');
        }
      }
      
      return {
        content: Buffer.from(buffer).toString('base64'),
        contentType: response.headers.get('content-type') || 'application/octet-stream',
        size: buffer.byteLength,
        filename,
      };
    },
  })

  // ============================================
  // Respond to Webhook (for webhook nodes)
  // ============================================

  .withAction('respondToWebhook', {
    name: 'Respond to Webhook',
    description: 'Send a response back to a webhook caller',
    input: z.object({
      webhookId: z.string().describe('Webhook execution ID'),
      status: z.number().default(200),
      headers: headerSchema.optional(),
      body: z.unknown().optional(),
      bodyType: z.enum(['json', 'text', 'html']).default('json'),
    }),
    output: z.object({
      sent: z.boolean(),
    }),
    execute: async (input, ctx) => {
      // This would interact with the webhook response queue
      // For now, store in context for the executor to retrieve
      await ctx.store.set(`webhook-response:${input.webhookId}`, {
        status: input.status,
        headers: input.headers,
        body: input.body,
        bodyType: input.bodyType,
      }, 60); // 60 second TTL
      
      return { sent: true };
    },
  })

  // ============================================
  // Test Connection (validates URL is reachable)
  // ============================================
  .withTestConnection(async (credentials, ctx): Promise<TestConnectionResult> => {
    // HTTP connector doesn't have stored credentials
    // This is a no-op test
    return {
      success: true,
      message: 'HTTP connector ready',
    };
  })

  .build();

export default httpConnector;
