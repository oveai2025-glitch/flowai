/**
 * Workflow Runs API
 * 
 * Start and manage workflow executions via Temporal.
 * 
 * POST /api/runs - Start a new workflow run
 * GET /api/runs - List runs for organization
 * 
 * @module app/api/runs/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  startWorkflow, 
  listWorkflows,
  WorkflowDefinition,
} from '@/lib/temporal/client';
import { db } from '@/lib/db';
import { checkRunQuota, incrementRunCount } from '@/lib/billing';
import { logger } from '@/lib/logger';
import { workflowRunsTotal } from '@/lib/metrics';

// ============================================
// Request Schemas
// ============================================

const startRunSchema = z.object({
  workflowId: z.string().uuid(),
  input: z.record(z.unknown()).optional().default({}),
  triggerType: z.enum(['manual', 'api']).default('api'),
});

const listRunsSchema = z.object({
  status: z.enum(['running', 'completed', 'failed']).optional(),
  workflowId: z.string().uuid().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// ============================================
// POST /api/runs - Start workflow execution
// ============================================

export async function POST(req: NextRequest) {
  try {
    // Get organization from auth context
    const organizationId = req.headers.get('x-organization-id');
    const userId = req.headers.get('x-user-id');

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'Organization ID required' },
        { status: 401 }
      );
    }

    // Parse and validate request
    const body = await req.json();
    const { workflowId, input, triggerType } = startRunSchema.parse(body);

    // Check quota before starting
    const quotaCheck = await checkRunQuota(organizationId);
    if (!quotaCheck.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          error: quotaCheck.reason,
          usage: quotaCheck.usage,
          limit: quotaCheck.limit,
        },
        { status: 429 }
      );
    }

    // Fetch workflow definition
    const workflow = await db.workflow.findFirst({
      where: {
        id: workflowId,
        organizationId,
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { success: false, error: 'Workflow not found' },
        { status: 404 }
      );
    }

    if (!workflow.isActive) {
      return NextResponse.json(
        { success: false, error: 'Workflow is not active' },
        { status: 400 }
      );
    }

    // Parse workflow definition
    const definition = workflow.definition as unknown as WorkflowDefinition;

    logger.info('Starting workflow run', {
      workflowId,
      organizationId,
      triggerType,
    });

    // Start workflow via Temporal
    const { workflowId: temporalWorkflowId, runId } = await startWorkflow({
      definition: {
        ...definition,
        id: workflowId,
        name: workflow.name,
      },
      input,
      organizationId,
      triggeredBy: userId || undefined,
      triggerType,
    });

    // Create run record in database
    const run = await db.run.create({
      data: {
        id: temporalWorkflowId,
        workflowId,
        organizationId,
        status: 'PENDING',
        triggerType: triggerType.toUpperCase() as 'MANUAL' | 'WEBHOOK' | 'SCHEDULE' | 'API',
        input: input as object,
        startedAt: new Date(),
        triggeredById: userId,
        metadata: {
          temporalRunId: runId,
        },
      },
    });

    // Increment usage counter
    await incrementRunCount(organizationId);

    // Record metric
    workflowRunsTotal.inc({
      status: 'started',
      trigger_type: triggerType,
      organization_id: organizationId,
    });

    logger.info('Workflow run started', {
      runId: run.id,
      workflowId,
      temporalRunId: runId,
    });

    return NextResponse.json({
      success: true,
      data: {
        runId: run.id,
        workflowId,
        status: 'pending',
        startedAt: run.startedAt,
      },
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Failed to start workflow run', error);

    return NextResponse.json(
      { success: false, error: 'Failed to start workflow run' },
      { status: 500 }
    );
  }
}

// ============================================
// GET /api/runs - List runs
// ============================================

export async function GET(req: NextRequest) {
  try {
    const organizationId = req.headers.get('x-organization-id');

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'Organization ID required' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const params = listRunsSchema.parse({
      status: searchParams.get('status') || undefined,
      workflowId: searchParams.get('workflowId') || undefined,
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 20,
    });

    // Build query
    const where: Record<string, unknown> = {
      organizationId,
    };

    if (params.status) {
      where.status = params.status.toUpperCase();
    }

    if (params.workflowId) {
      where.workflowId = params.workflowId;
    }

    // Fetch runs from database
    const [runs, total] = await Promise.all([
      db.run.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
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
        },
      }),
      db.run.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        runs: runs.map(run => ({
          id: run.id,
          workflowId: run.workflowId,
          workflowName: run.workflow.name,
          status: run.status.toLowerCase(),
          triggerType: run.triggerType.toLowerCase(),
          startedAt: run.startedAt,
          completedAt: run.completedAt,
          duration: run.completedAt 
            ? run.completedAt.getTime() - run.startedAt.getTime()
            : null,
          triggeredBy: run.triggeredBy ? {
            id: run.triggeredBy.id,
            name: run.triggeredBy.name,
          } : null,
        })),
        pagination: {
          page: params.page,
          limit: params.limit,
          total,
          totalPages: Math.ceil(total / params.limit),
        },
      },
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Failed to list runs', error);

    return NextResponse.json(
      { success: false, error: 'Failed to list runs' },
      { status: 500 }
    );
  }
}
