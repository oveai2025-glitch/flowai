/**
 * FlowAtGenAi - Workflow Editor Page
 * 
 * Full-screen workflow editor with ReactFlow canvas.
 * 
 * @module app/workflows/[id]/edit/page
 */

'use client';

import React, { useEffect } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useWorkflowStore } from '../../../../stores/workflow-store';

// Dynamically import editor to avoid SSR issues with ReactFlow
const WorkflowEditor = dynamic(
  () => import('../../../../components/workflow/WorkflowEditor'),
  { 
    ssr: false,
    loading: () => (
      <div className="h-screen w-full bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading editor...</p>
        </div>
      </div>
    ),
  }
);

export default function WorkflowEditorPage() {
  const params = useParams();
  const workflowId = params?.id as string;
  
  const loadWorkflow = useWorkflowStore((s) => s.loadWorkflow);
  const newWorkflow = useWorkflowStore((s) => s.newWorkflow);

  useEffect(() => {
    if (workflowId === 'new') {
      newWorkflow();
    } else {
      // In real app, would fetch workflow from API
      // For now, create a new one or load from storage
      const savedWorkflows = localStorage.getItem('flowatgenai_workflows');
      if (savedWorkflows) {
        const workflows = JSON.parse(savedWorkflows);
        const workflow = workflows.find((w: { id: string }) => w.id === workflowId);
        if (workflow) {
          loadWorkflow(workflow);
          return;
        }
      }
      newWorkflow();
    }
  }, [workflowId, loadWorkflow, newWorkflow]);

  return <WorkflowEditor />;
}
