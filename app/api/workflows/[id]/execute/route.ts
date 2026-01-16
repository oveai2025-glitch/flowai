/**
 * Workflow Execution API Route
 * 
 * Specifically handles the triggering and status tracking of workflow runs.
 * 
 * POST /api/workflows/[id]/execute - Triggers a new execution
 * GET /api/executions/[id] - (Implemented in separate route)
 * 
 * Path: app/api/workflows/[id]/execute/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { WorkflowService } from '@/lib/services/workflow-service';
import { AnalyticsService, MetricType } from '@/lib/services/analytics-service';

/**
 * POST Handler: Trigger Execution
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orgId = req.headers.get('x-org-id');
    const userId = req.headers.get('x-user-id');
    
    if (!orgId || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const input = body.input || {};

    console.log(`[API] Triggering execution for workflow ${params.id} by user ${userId}`);

    // Call service to trigger Temporal workflow
    const result = await WorkflowService.triggerExecution(params.id, userId, input);

    // Track credit usage (simulated)
    await AnalyticsService.recordMetric(orgId, MetricType.CREDIT_USAGE, 1, { 
      workflowId: params.id,
      executionId: result.executionId 
    });

    return NextResponse.json({
      message: 'Workflow execution triggered',
      executionId: result.executionId,
      temporalRunId: result.temporalRunId,
    }, { status: 202 }); // Accepted
  } catch (error: any) {
    console.error(`[API] Execution trigger failed for ${params.id}:`, error);
    
    return NextResponse.json(
      { error: 'Failed to trigger execution', detail: error.message },
      { status: 500 }
    );
  }
}

/**
 * Technical Considerations for Execution API:
 * 
 * 1. Idempotency Keys
 * Clients should provide an 'X-Idempotency-Key' header to prevent accidental 
 * duplicate executions of the same requested operation.
 * 
 * 2. Async Lifecycle
 * This endpoint returns 202 Accepted. The actual execution runs asynchronously 
 * in our Temporal cluster. Clients should poll the execution status endpoint 
 * or listen to webhooks for completion.
 * 
 * 3. Payload Limits
 * Maximum trigger input size is capped at 5MB. Large data should be stored 
 * in S3 and passed as a reference URL.
 */
