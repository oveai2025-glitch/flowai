/**
 * FlowAtGenAi - New Workflow Page
 * 
 * Redirects to workflow editor with a new workflow.
 * 
 * @module app/workflows/new/page
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkflowStore } from '../../../stores/workflow-store';

export default function NewWorkflowPage() {
  const router = useRouter();
  const newWorkflow = useWorkflowStore((s) => s.newWorkflow);
  const workflow = useWorkflowStore((s) => s.workflow);

  useEffect(() => {
    newWorkflow();
  }, [newWorkflow]);

  useEffect(() => {
    if (workflow?.id) {
      router.replace(`/workflows/${workflow.id}/edit`);
    }
  }, [workflow?.id, router]);

  return (
    <div className="h-screen w-full bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Creating new workflow...</p>
      </div>
    </div>
  );
}
