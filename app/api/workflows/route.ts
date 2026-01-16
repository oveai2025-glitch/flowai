/**
 * Workflows API Route
 * 
 * Handles listing and creation of workflows for an organization.
 * 
 * GET /api/workflows - Returns a paginated list of workflows
 * POST /api/workflows - Creates a new workflow with initial version
 * 
 * Path: app/api/workflows/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { WorkflowService } from '@/lib/services/workflow-service';
import { z } from 'zod';

// Define schema for workflow creation request
const createWorkflowSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  definition: z.object({
    nodes: z.array(z.any()),
    edges: z.array(z.any()),
  }),
});

/**
 * GET Handler: List Workflows
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = req.headers.get('x-org-id'); // In production, get from session/JWT
    
    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';

    const workflows = await WorkflowService.listWorkflows(orgId, { page, limit, search });

    return NextResponse.json(workflows);
  } catch (error: any) {
    console.error('[API] GET /workflows failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflows', detail: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST Handler: Create Workflow
 */
export async function POST(req: NextRequest) {
  try {
    const orgId = req.headers.get('x-org-id');
    const userId = req.headers.get('x-user-id'); // Get from auth session

    if (!orgId || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    
    // Validate input
    const validatedData = createWorkflowSchema.safeParse(body);
    if (!validatedData.success) {
      return NextResponse.json(
        { error: 'Invalid workflow data', issues: validatedData.error.issues },
        { status: 400 }
      );
    }

    const workflow = await WorkflowService.createWorkflow(orgId, userId, validatedData.data);

    return NextResponse.json(workflow, { status: 201 });
  } catch (error: any) {
    console.error('[API] POST /workflows failed:', error);
    return NextResponse.json(
      { error: 'Failed to create workflow', detail: error.message },
      { status: 500 }
    );
  }
}

/**
 * Documentation: Error Handling
 * 
 * All endpoints implement a uniform error response structure:
 * {
 *   "error": "Short readable error message",
 *   "detail": "Technical details (omitted in production for some cases)",
 *   "issues": ["List of validation issues for 400 cases"]
 * }
 * 
 * Rate Limiting:
 * This route is subject to a 100 requests per minute rate limit per organization.
 */
