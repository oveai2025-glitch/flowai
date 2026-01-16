/**
 * FlowAtGenAi - Webhook Handler API
 * 
 * Handles incoming webhooks and triggers workflows.
 * 
 * @module app/api/webhooks/[...path]/route
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { logger } from '../../../../lib/logger';

// ============================================
// Types
// ============================================

interface WebhookEndpoint {
  id: string;
  path: string;
  method: string;
  workflowId: string;
  organizationId: string;
  secret: string;
  authType: 'none' | 'basic' | 'bearer' | 'apiKey' | 'signature';
  isActive: boolean;
}

// Mock database
const webhookEndpoints: Map<string, WebhookEndpoint> = new Map([
  ['lead-capture', {
    id: 'wh_1',
    path: 'lead-capture',
    method: 'POST',
    workflowId: 'wf_1',
    organizationId: 'org_1',
    secret: 'whsec_test123',
    authType: 'signature',
    isActive: true,
  }],
  ['order-webhook', {
    id: 'wh_2',
    path: 'order-webhook',
    method: 'POST',
    workflowId: 'wf_2',
    organizationId: 'org_1',
    secret: 'whsec_test456',
    authType: 'none',
    isActive: true,
  }],
]);

// ============================================
// Helper Functions
// ============================================

function verifySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

function verifyBasicAuth(
  authorization: string | null,
  expectedCredentials: string
): boolean {
  if (!authorization?.startsWith('Basic ')) return false;
  
  const credentials = Buffer.from(authorization.slice(6), 'base64').toString();
  return credentials === expectedCredentials;
}

function verifyBearerToken(
  authorization: string | null,
  expectedToken: string
): boolean {
  if (!authorization?.startsWith('Bearer ')) return false;
  return authorization.slice(7) === expectedToken;
}

function verifyApiKey(
  request: NextRequest,
  expectedKey: string
): boolean {
  const headerKey = request.headers.get('x-api-key');
  const queryKey = request.nextUrl.searchParams.get('api_key');
  return headerKey === expectedKey || queryKey === expectedKey;
}

async function triggerWorkflow(
  workflowId: string,
  organizationId: string,
  payload: unknown,
  headers: Record<string, string>
): Promise<{ executionId: string }> {
  // In production, would queue workflow execution via Temporal/BullMQ
  const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  
  logger.info('Triggering workflow from webhook', {
    workflowId,
    organizationId,
    executionId,
  });

  return { executionId };
}

// ============================================
// Route Handler
// ============================================

async function handleWebhook(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/');
  const method = request.method;
  const startTime = Date.now();

  logger.info('Webhook received', { path, method });

  try {
    // Find webhook endpoint
    const endpoint = webhookEndpoints.get(path);

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Webhook endpoint not found' },
        { status: 404 }
      );
    }

    // Check if active
    if (!endpoint.isActive) {
      return NextResponse.json(
        { error: 'Webhook endpoint is disabled' },
        { status: 403 }
      );
    }

    // Check method
    if (endpoint.method !== 'ANY' && endpoint.method !== method) {
      return NextResponse.json(
        { error: `Method ${method} not allowed` },
        { status: 405 }
      );
    }

    // Get request body
    const contentType = request.headers.get('content-type') || '';
    let body: unknown;

    if (contentType.includes('application/json')) {
      body = await request.json();
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      body = Object.fromEntries(formData);
    } else if (contentType.includes('text/')) {
      body = await request.text();
    } else {
      body = await request.text();
    }

    const bodyString = typeof body === 'string' ? body : JSON.stringify(body);

    // Verify authentication
    const authorization = request.headers.get('authorization');

    switch (endpoint.authType) {
      case 'signature': {
        const signature = request.headers.get('x-webhook-signature') ||
          request.headers.get('x-signature') ||
          request.headers.get('x-hub-signature-256');
        
        if (!signature) {
          return NextResponse.json(
            { error: 'Missing signature' },
            { status: 401 }
          );
        }

        const sigValue = signature.startsWith('sha256=')
          ? signature.slice(7)
          : signature;

        if (!verifySignature(bodyString, sigValue, endpoint.secret)) {
          return NextResponse.json(
            { error: 'Invalid signature' },
            { status: 401 }
          );
        }
        break;
      }

      case 'basic': {
        if (!verifyBasicAuth(authorization, endpoint.secret)) {
          return NextResponse.json(
            { error: 'Invalid credentials' },
            { status: 401 }
          );
        }
        break;
      }

      case 'bearer': {
        if (!verifyBearerToken(authorization, endpoint.secret)) {
          return NextResponse.json(
            { error: 'Invalid token' },
            { status: 401 }
          );
        }
        break;
      }

      case 'apiKey': {
        if (!verifyApiKey(request, endpoint.secret)) {
          return NextResponse.json(
            { error: 'Invalid API key' },
            { status: 401 }
          );
        }
        break;
      }

      case 'none':
      default:
        // No authentication required
        break;
    }

    // Extract headers
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      if (!key.startsWith('x-forwarded') && !key.startsWith('cf-')) {
        headers[key] = value;
      }
    });

    // Trigger workflow
    const { executionId } = await triggerWorkflow(
      endpoint.workflowId,
      endpoint.organizationId,
      body,
      headers
    );

    // Log success
    logger.info('Webhook processed successfully', {
      path,
      executionId,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      executionId,
      message: 'Workflow triggered',
    });

  } catch (error) {
    logger.error('Webhook processing failed', error as Error, { path });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// Export Handlers
// ============================================

export async function GET(
  request: NextRequest,
  context: { params: { path: string[] } }
) {
  return handleWebhook(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: { path: string[] } }
) {
  return handleWebhook(request, context);
}

export async function PUT(
  request: NextRequest,
  context: { params: { path: string[] } }
) {
  return handleWebhook(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: { path: string[] } }
) {
  return handleWebhook(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: { path: string[] } }
) {
  return handleWebhook(request, context);
}
