/**
 * Individual Run API
 * 
 * GET /api/runs/[id] - Get run details and status from Temporal
 * DELETE /api/runs/[id] - Cancel a running workflow
 * POST /api/runs/[id]/replay - Replay a failed run
 * 
 * @module app/api/runs/[id]/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getWorkflowStatus, 
  getWorkflowResult,
  cancelWorkflow,
  terminateWorkflow,
  queryWorkflow,
  WorkflowNotFoundError,
} from '@/lib/temporal/client';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { workflowRunsTotal } from '@/lib/metrics';

// ============================================
// GET /api/runs/[id] - Get run details
// ============================================

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const organizationId = req.headers.get('x-organization-id');
    const runId = params.id;

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'Organization ID required' },
        { status: 401 }
      );
    }

    // Fetch run from database
    const run = await db.run.findFirst({
      where: {
        id: runId,
        organizationId,
      },
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
          },
        },
        triggeredBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        logs: {
          orderBy: { timestamp: 'asc' },
          take: 100,
        },
      },
    });

    if (!run) {
      return NextResponse.json(
        { success: false, error: 'Run not found' },
        { status: 404 }
      );
    }

    // Get real-time status from Temporal
    let temporalStatus;
    let executionState;

    try {
      temporalStatus = await getWorkflowStatus(runId);
      
      // If running, get current execution state via query
      if (temporalStatus.status === 'running') {
        try {
          executionState = await queryWorkflow(runId, 'getState');
        } catch (e) {
          // Query might fail if workflow just started
          logger.debug('Could not query workflow state', { runId, error: e });
        }
      }
    } catch (error) {
      if (error instanceof WorkflowNotFoundError) {
        // Workflow completed and history was purged
        temporalStatus = {
          workflowId: runId,
          status: run.status.toLowerCase() as 'succeeded' | 'failed',
        };
      } else {
        throw error;
      }
    }

    // Sync status with database if changed
    const newStatus = mapTemporalStatus(temporalStatus.status);
    if (run.status !== newStatus) {
      await db.run.update({
        where: { id: runId },
        data: {
          status: newStatus,
          completedAt: temporalStatus.closeTime || undefined,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: run.id,
        workflowId: run.workflowId,
        workflowName: run.workflow.name,
        status: temporalStatus.status,
        triggerType: run.triggerType.toLowerCase(),
        input: run.input,
        output: run.output,
        startedAt: run.startedAt,
        completedAt: run.completedAt || temporalStatus.closeTime,
        duration: run.completedAt
          ? run.completedAt.getTime() - run.startedAt.getTime()
          : temporalStatus.closeTime
            ? new Date(temporalStatus.closeTime).getTime() - run.startedAt.getTime()
            : null,
        triggeredBy: run.triggeredBy ? {
          id: run.triggeredBy.id,
          name: run.triggeredBy.name,
        } : null,
        // Execution progress from Temporal
        progress: executionState ? {
          currentNode: (executionState as { currentNode?: string }).currentNode,
          completedNodes: (executionState as { completedNodes?: string[] }).completedNodes || [],
          nodeCount: run.workflow ? 
            ((run.workflow as { definition?: { nodes?: unknown[] } }).definition?.nodes?.length || 0) : 0,
        } : null,
        // Node execution logs
        logs: run.logs.map(log => ({
          nodeId: log.nodeId,
          nodeName: log.nodeName,
          status: log.status.toLowerCase(),
          startedAt: log.startedAt,
          completedAt: log.completedAt,
          duration: log.durationMs,
          output: log.output,
          error: log.error,
        })),
        // Temporal metadata
        temporal: {
          runId: temporalStatus.runId,
          historyLength: temporalStatus.historyLength,
        },
      },
    });

  } catch (error) {
    logger.error('Failed to get run details', error, { runId: params.id });

    return NextResponse.json(
      { success: false, error: 'Failed to get run details' },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE /api/runs/[id] - Cancel run
// ============================================

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const organizationId = req.headers.get('x-organization-id');
    const userId = req.headers.get('x-user-id');
    const runId = params.id;

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'Organization ID required' },
        { status: 401 }
      );
    }

    // Verify run belongs to organization
    const run = await db.run.findFirst({
      where: {
        id: runId,
        organizationId,
      },
    });

    if (!run) {
      return NextResponse.json(
        { success: false, error: 'Run not found' },
        { status: 404 }
      );
    }

    // Check if already completed
    if (['SUCCEEDED', 'FAILED', 'CANCELLED'].includes(run.status)) {
      return NextResponse.json(
        { success: false, error: 'Run has already completed' },
        { status: 400 }
      );
    }

    // Get force flag from query params
    const { searchParams } = new URL(req.url);
    const force = searchParams.get('force') === 'true';

    logger.info('Cancelling run', { runId, force, userId });

    // Cancel via Temporal
    if (force) {
      // Terminate immediately (no cleanup)
      await terminateWorkflow(runId, `Terminated by user ${userId}`);
    } else {
      // Graceful cancellation (allows cleanup)
      await cancelWorkflow(runId, `Cancelled by user ${userId}`);
    }

    // Update database
    await db.run.update({
      where: { id: runId },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
        metadata: {
          ...(run.metadata as object || {}),
          cancelledBy: userId,
          cancelledAt: new Date().toISOString(),
          forced: force,
        },
      },
    });

    // Record metric
    workflowRunsTotal.inc({
      status: 'cancelled',
      trigger_type: run.triggerType.toLowerCase(),
      organization_id: organizationId,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: runId,
        status: 'cancelled',
        message: force ? 'Run terminated immediately' : 'Run cancellation requested',
      },
    });

  } catch (error) {
    if (error instanceof WorkflowNotFoundError) {
      return NextResponse.json(
        { success: false, error: 'Run not found in execution engine' },
        { status: 404 }
      );
    }

    logger.error('Failed to cancel run', error, { runId: params.id });

    return NextResponse.json(
      { success: false, error: 'Failed to cancel run' },
      { status: 500 }
    );
  }
}

// ============================================
// Helpers
// ============================================

function mapTemporalStatus(status: string): 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED' {
  switch (status) {
    case 'pending':
      return 'PENDING';
    case 'running':
      return 'RUNNING';
    case 'succeeded':
      return 'SUCCEEDED';
    case 'failed':
    case 'terminated':
      return 'FAILED';
    case 'cancelled':
      return 'CANCELLED';
    default:
      return 'RUNNING';
  }
}
