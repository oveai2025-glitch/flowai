/**
 * FlowAtGenAi - Webhook Handler
 * 
 * Handles incoming webhooks and triggers workflows.
 * Supports signature verification, rate limiting, and queuing.
 * 
 * @module lib/webhook/handler
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { logger } from '../logger';

// ============================================
// Types
// ============================================

export interface WebhookConfig {
  id: string;
  workflowId: string;
  organizationId: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  secret?: string;
  authType: 'none' | 'basic' | 'bearer' | 'apiKey' | 'signature';
  authConfig?: {
    username?: string;
    password?: string;
    token?: string;
    apiKey?: string;
    apiKeyHeader?: string;
    signatureHeader?: string;
    signatureAlgorithm?: 'sha256' | 'sha1' | 'sha512';
  };
  responseMode: 'immediate' | 'lastNode' | 'respondNode';
  isActive: boolean;
  rateLimitRequests?: number;
  rateLimitWindow?: number;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookRequest {
  id: string;
  webhookId: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
  ip: string;
  timestamp: string;
}

export interface WebhookResponse {
  status: number;
  headers?: Record<string, string>;
  body?: unknown;
}

// ============================================
// Signature Verification
// ============================================

export function verifyHmacSignature(
  payload: string,
  signature: string,
  secret: string,
  algorithm: 'sha256' | 'sha1' | 'sha512' = 'sha256'
): boolean {
  const expectedSignature = crypto
    .createHmac(algorithm, secret)
    .update(payload)
    .digest('hex');

  // Handle different signature formats
  const normalizedSignature = signature
    .replace(/^sha256=/, '')
    .replace(/^sha1=/, '')
    .replace(/^v0=/, '');

  return crypto.timingSafeEqual(
    Buffer.from(normalizedSignature),
    Buffer.from(expectedSignature)
  );
}

export function verifySlackSignature(
  timestamp: string,
  body: string,
  signature: string,
  secret: string
): boolean {
  const sigBasestring = `v0:${timestamp}:${body}`;
  const mySignature = `v0=${crypto
    .createHmac('sha256', secret)
    .update(sigBasestring)
    .digest('hex')}`;

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(mySignature)
  );
}

export function verifyStripeSignature(
  payload: string,
  header: string,
  secret: string
): boolean {
  const parts = header.split(',');
  const timestamp = parts.find((p) => p.startsWith('t='))?.split('=')[1];
  const signature = parts.find((p) => p.startsWith('v1='))?.split('=')[1];

  if (!timestamp || !signature) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export function verifyGitHubSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = `sha256=${crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')}`;

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// ============================================
// Rate Limiting
// ============================================

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

// ============================================
// Webhook Handler
// ============================================

export class WebhookHandler {
  private config: WebhookConfig;

  constructor(config: WebhookConfig) {
    this.config = config;
  }

  async handle(request: NextRequest): Promise<NextResponse> {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();

    try {
      // Check if webhook is active
      if (!this.config.isActive) {
        return NextResponse.json(
          { error: 'Webhook is disabled' },
          { status: 404 }
        );
      }

      // Verify HTTP method
      if (request.method !== this.config.method) {
        return NextResponse.json(
          { error: `Method ${request.method} not allowed` },
          { status: 405 }
        );
      }

      // Rate limiting
      if (this.config.rateLimitRequests) {
        const rateLimit = checkRateLimit(
          `webhook:${this.config.id}`,
          this.config.rateLimitRequests,
          this.config.rateLimitWindow || 60000
        );

        if (!rateLimit.allowed) {
          return NextResponse.json(
            { error: 'Rate limit exceeded' },
            {
              status: 429,
              headers: {
                'X-RateLimit-Limit': String(this.config.rateLimitRequests),
                'X-RateLimit-Remaining': String(rateLimit.remaining),
                'X-RateLimit-Reset': String(rateLimit.resetAt),
              },
            }
          );
        }
      }

      // Authentication
      const authResult = await this.authenticate(request);
      if (!authResult.success) {
        return NextResponse.json(
          { error: authResult.error },
          { status: 401 }
        );
      }

      // Parse request
      const webhookRequest = await this.parseRequest(request, requestId);

      logger.info('Webhook received', {
        requestId,
        webhookId: this.config.id,
        workflowId: this.config.workflowId,
        method: webhookRequest.method,
        path: webhookRequest.path,
      });

      // Queue workflow execution
      const executionId = await this.triggerWorkflow(webhookRequest);

      // Respond based on response mode
      const response = await this.generateResponse(
        webhookRequest,
        executionId
      );

      logger.info('Webhook processed', {
        requestId,
        executionId,
        duration: Date.now() - startTime,
      });

      return NextResponse.json(response.body || { success: true, executionId }, {
        status: response.status,
        headers: response.headers,
      });
    } catch (error) {
      logger.error('Webhook error', error instanceof Error ? error : new Error(String(error)), {
        requestId,
        webhookId: this.config.id,
      });

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }

  private async authenticate(
    request: NextRequest
  ): Promise<{ success: boolean; error?: string }> {
    const { authType, authConfig, secret } = this.config;

    switch (authType) {
      case 'none':
        return { success: true };

      case 'basic': {
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Basic ')) {
          return { success: false, error: 'Missing basic auth' };
        }

        const credentials = Buffer.from(
          authHeader.substring(6),
          'base64'
        ).toString();
        const [username, password] = credentials.split(':');

        if (
          username !== authConfig?.username ||
          password !== authConfig?.password
        ) {
          return { success: false, error: 'Invalid credentials' };
        }
        return { success: true };
      }

      case 'bearer': {
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
          return { success: false, error: 'Missing bearer token' };
        }

        const token = authHeader.substring(7);
        if (token !== authConfig?.token) {
          return { success: false, error: 'Invalid token' };
        }
        return { success: true };
      }

      case 'apiKey': {
        const headerName = authConfig?.apiKeyHeader || 'x-api-key';
        const apiKey = request.headers.get(headerName);

        if (apiKey !== authConfig?.apiKey) {
          return { success: false, error: 'Invalid API key' };
        }
        return { success: true };
      }

      case 'signature': {
        if (!secret) {
          return { success: false, error: 'Webhook secret not configured' };
        }

        const signatureHeader =
          authConfig?.signatureHeader || 'x-webhook-signature';
        const signature = request.headers.get(signatureHeader);

        if (!signature) {
          return { success: false, error: 'Missing signature' };
        }

        const body = await request.text();
        const algorithm = authConfig?.signatureAlgorithm || 'sha256';

        if (!verifyHmacSignature(body, signature, secret, algorithm)) {
          return { success: false, error: 'Invalid signature' };
        }
        return { success: true };
      }

      default:
        return { success: false, error: 'Unknown auth type' };
    }
  }

  private async parseRequest(
    request: NextRequest,
    requestId: string
  ): Promise<WebhookRequest> {
    const url = new URL(request.url);
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const query: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      query[key] = value;
    });

    let body: unknown;
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      body = await request.json().catch(() => ({}));
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      body = Object.fromEntries(formData.entries());
    } else if (contentType.includes('text/')) {
      body = await request.text();
    } else {
      body = await request.text();
    }

    return {
      id: requestId,
      webhookId: this.config.id,
      method: request.method,
      path: url.pathname,
      headers,
      query,
      body,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      timestamp: new Date().toISOString(),
    };
  }

  private async triggerWorkflow(
    webhookRequest: WebhookRequest
  ): Promise<string> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // In production, would queue via Temporal or BullMQ
    // await temporalClient.startWorkflow(...)

    logger.info('Workflow triggered', {
      executionId,
      workflowId: this.config.workflowId,
      webhookId: this.config.id,
    });

    return executionId;
  }

  private async generateResponse(
    _webhookRequest: WebhookRequest,
    executionId: string
  ): Promise<WebhookResponse> {
    switch (this.config.responseMode) {
      case 'immediate':
        return {
          status: 200,
          body: {
            success: true,
            executionId,
            message: 'Workflow triggered',
          },
        };

      case 'lastNode':
        // Wait for workflow completion and return last node output
        // In production, would use Temporal query
        return {
          status: 200,
          body: {
            success: true,
            executionId,
            result: { /* workflow output */ },
          },
        };

      case 'respondNode':
        // Wait for specific respond node in workflow
        return {
          status: 200,
          body: {
            success: true,
            executionId,
          },
        };

      default:
        return { status: 200, body: { success: true, executionId } };
    }
  }
}

// ============================================
// Webhook Registry
// ============================================

class WebhookRegistry {
  private webhooks = new Map<string, WebhookConfig>();

  register(config: WebhookConfig): void {
    const key = `${config.method}:${config.path}`;
    this.webhooks.set(key, config);
  }

  unregister(path: string, method: string): void {
    const key = `${method}:${path}`;
    this.webhooks.delete(key);
  }

  find(path: string, method: string): WebhookConfig | undefined {
    // Exact match
    const exactKey = `${method}:${path}`;
    if (this.webhooks.has(exactKey)) {
      return this.webhooks.get(exactKey);
    }

    // Pattern match (for dynamic paths like /webhooks/:id)
    for (const [key, config] of this.webhooks) {
      const [configMethod, configPath] = key.split(':');
      if (configMethod !== method) continue;

      const pattern = configPath.replace(/:[^/]+/g, '[^/]+');
      const regex = new RegExp(`^${pattern}$`);
      if (regex.test(path)) {
        return config;
      }
    }

    return undefined;
  }

  list(): WebhookConfig[] {
    return Array.from(this.webhooks.values());
  }
}

export const webhookRegistry = new WebhookRegistry();

export default WebhookHandler;
