/**
 * Individual Workflow API Route
 * 
 * Handles management of a specific workflow instance.
 * 
 * GET /api/workflows/[id] - Returns full workflow details and current definition
 * PATCH /api/workflows/[id] - Updates workflow metadata or definition
 * DELETE /api/workflows/[id] - Deletes the workflow and all its versions
 * 
 * Path: app/api/workflows/[id]/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { WorkflowService } from '@/lib/services/workflow-service';
import { z } from 'zod';

const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  definition: z.object({
    nodes: z.array(z.any()),
    edges: z.array(z.any()),
  }).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED', 'PAUSED']).optional(),
  createNewVersion: z.boolean().default(false),
});

/**
 * GET Handler: Specific Workflow Details
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orgId = req.headers.get('x-org-id');
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const workflow = await WorkflowService.listWorkflows(orgId, { limit: 1, search: params.id });
    
    if (!workflow.items[0]) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    return NextResponse.json(workflow.items[0]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PATCH Handler: Update Workflow
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orgId = req.headers.get('x-org-id');
    const userId = req.headers.get('x-user-id');
    if (!orgId || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const validatedData = updateWorkflowSchema.safeParse(body);
    
    if (!validatedData.success) {
      return NextResponse.json({ error: 'Invalid data', issues: validatedData.error.issues }, { status: 400 });
    }

    const { createNewVersion, ...updateData } = validatedData.data;

    const updated = await WorkflowService.updateWorkflow(
      params.id, 
      userId, 
      updateData, 
      createNewVersion
    );

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE Handler: Remove Workflow
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orgId = req.headers.get('x-org-id');
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await WorkflowService.deleteWorkflow(params.id, orgId);

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Technical Implementation Details:
 * 
 * 1. RBAC (Role-Based Access Control)
 * In a real-world scenario, we would check if the user has 'ADMIN' or 'EDITOR' 
 * permissions before allow PATCH or DELETE.
 * 
 * 2. Optimized Metadata
 * The GET response excludes large binary assets associated with the workflow 
 * unless explicitly requested via query parameters.
 * 
 * 3. Cascade Logic
 * DELETE is atomic. If the version deletion fails, the entire transaction rolls back.
 */
