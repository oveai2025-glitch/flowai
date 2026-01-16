/**
 * FlowAtGenAi - Workflow Toolbar
 * 
 * Top toolbar for the workflow editor with actions like
 * save, run, undo/redo, and workflow settings.
 * 
 * @module components/workflow/WorkflowToolbar
 */

'use client';

import React, { useState } from 'react';
import {
  Play,
  Square,
  Save,
  Undo2,
  Redo2,
  Settings,
  Share2,
  MoreHorizontal,
  ChevronLeft,
  Check,
  Loader2,
  AlertCircle,
  CheckCircle2,
  History,
  Bug,
  Maximize2,
  Download,
  Upload,
  Copy,
  Trash2,
  LayoutGrid,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useWorkflowStore } from '../../stores/workflow-store';

// ============================================
// Toolbar Button
// ============================================

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  variant?: 'default' | 'primary' | 'danger';
  size?: 'sm' | 'md';
  loading?: boolean;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  icon,
  label,
  onClick,
  disabled,
  active,
  variant = 'default',
  size = 'md',
  loading,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      title={label}
      className={cn(
        'flex items-center gap-2 rounded-lg transition-colors',
        size === 'sm' ? 'px-2 py-1.5' : 'px-3 py-2',
        variant === 'default' && 'hover:bg-gray-700 text-gray-300',
        variant === 'primary' && 'bg-blue-600 hover:bg-blue-700 text-white',
        variant === 'danger' && 'hover:bg-red-900/50 text-red-400',
        active && 'bg-gray-700',
        (disabled || loading) && 'opacity-50 cursor-not-allowed'
      )}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {size === 'md' && <span className="text-sm font-medium">{label}</span>}
    </button>
  );
};

// ============================================
// Toolbar Divider
// ============================================

const ToolbarDivider: React.FC = () => (
  <div className="h-6 w-px bg-gray-700 mx-1" />
);

// ============================================
// Execution Status
// ============================================

interface ExecutionStatusProps {
  isExecuting: boolean;
  status?: 'success' | 'error' | 'running';
  message?: string;
}

const ExecutionStatus: React.FC<ExecutionStatusProps> = ({
  isExecuting,
  status,
  message,
}) => {
  if (!isExecuting && !status) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm',
        status === 'running' && 'bg-blue-900/50 text-blue-300',
        status === 'success' && 'bg-green-900/50 text-green-300',
        status === 'error' && 'bg-red-900/50 text-red-300'
      )}
    >
      {status === 'running' && <Loader2 className="w-4 h-4 animate-spin" />}
      {status === 'success' && <CheckCircle2 className="w-4 h-4" />}
      {status === 'error' && <AlertCircle className="w-4 h-4" />}
      <span>{message || (status === 'running' ? 'Executing...' : status)}</span>
    </div>
  );
};

// ============================================
// Main Toolbar
// ============================================

const WorkflowToolbar: React.FC = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Store state
  const workflow = useWorkflowStore((s) => s.workflow);
  const isDirty = useWorkflowStore((s) => s.isDirty);
  const isExecuting = useWorkflowStore((s) => s.isExecuting);
  const nodeStates = useWorkflowStore((s) => s.nodeStates);

  // Store actions
  const saveWorkflow = useWorkflowStore((s) => s.saveWorkflow);
  const canUndo = useWorkflowStore((s) => s.canUndo);
  const canRedo = useWorkflowStore((s) => s.canRedo);
  const undo = useWorkflowStore((s) => s.undo);
  const redo = useWorkflowStore((s) => s.redo);
  const startExecution = useWorkflowStore((s) => s.startExecution);
  const stopExecution = useWorkflowStore((s) => s.stopExecution);
  const zoomIn = useWorkflowStore((s) => s.zoomIn);
  const zoomOut = useWorkflowStore((s) => s.zoomOut);
  const validateWorkflow = useWorkflowStore((s) => s.validateWorkflow);

  // Determine execution status
  const executionStatus = (() => {
    if (!isExecuting) {
      const hasError = Object.values(nodeStates).some((s) => s.status === 'error');
      const hasSuccess = Object.values(nodeStates).some((s) => s.status === 'success');
      if (hasError) return 'error';
      if (hasSuccess) return 'success';
      return undefined;
    }
    return 'running';
  })();

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const saved = saveWorkflow();
      if (saved) {
        // Would call API to persist
        console.log('Workflow saved:', saved);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleRun = () => {
    const { valid, errors } = validateWorkflow();
    if (!valid) {
      alert(`Cannot run workflow:\n${errors.join('\n')}`);
      return;
    }

    // Generate execution ID and start
    const executionId = `exec-${Date.now()}`;
    startExecution(executionId);

    // Simulate execution (would call API)
    // In real implementation, this would be handled by the backend
  };

  const handleStop = () => {
    stopExecution();
  };

  return (
    <div className="flex items-center gap-1 px-3 py-2 bg-gray-900/95 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl">
      {/* Back button */}
      <ToolbarButton
        icon={<ChevronLeft className="w-4 h-4" />}
        label="Back"
        size="sm"
        onClick={() => window.history.back()}
      />

      <ToolbarDivider />

      {/* Workflow name */}
      <div className="flex items-center gap-2 px-2">
        <input
          type="text"
          value={workflow?.name || 'Untitled Workflow'}
          onChange={(e) => {
            // Would update workflow name
          }}
          className="bg-transparent text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1 min-w-[150px]"
        />
        {isDirty && (
          <span className="text-xs text-gray-500">(unsaved)</span>
        )}
      </div>

      <ToolbarDivider />

      {/* Undo/Redo */}
      <ToolbarButton
        icon={<Undo2 className="w-4 h-4" />}
        label="Undo"
        size="sm"
        onClick={undo}
        disabled={!canUndo()}
      />
      <ToolbarButton
        icon={<Redo2 className="w-4 h-4" />}
        label="Redo"
        size="sm"
        onClick={redo}
        disabled={!canRedo()}
      />

      <ToolbarDivider />

      {/* Zoom */}
      <ToolbarButton
        icon={<ZoomOut className="w-4 h-4" />}
        label="Zoom Out"
        size="sm"
        onClick={zoomOut}
      />
      <ToolbarButton
        icon={<ZoomIn className="w-4 h-4" />}
        label="Zoom In"
        size="sm"
        onClick={zoomIn}
      />
      <ToolbarButton
        icon={<Maximize2 className="w-4 h-4" />}
        label="Fit View"
        size="sm"
      />

      <ToolbarDivider />

      {/* Execution status */}
      <ExecutionStatus
        isExecuting={isExecuting}
        status={executionStatus}
      />

      <div className="flex-1" />

      {/* Save */}
      <ToolbarButton
        icon={<Save className="w-4 h-4" />}
        label="Save"
        onClick={handleSave}
        loading={isSaving}
        disabled={!isDirty}
      />

      {/* Run/Stop */}
      {isExecuting ? (
        <ToolbarButton
          icon={<Square className="w-4 h-4" />}
          label="Stop"
          variant="danger"
          onClick={handleStop}
        />
      ) : (
        <ToolbarButton
          icon={<Play className="w-4 h-4" />}
          label="Run"
          variant="primary"
          onClick={handleRun}
        />
      )}

      <ToolbarDivider />

      {/* More options */}
      <div className="relative">
        <ToolbarButton
          icon={<MoreHorizontal className="w-4 h-4" />}
          label="More"
          size="sm"
          onClick={() => setShowMenu(!showMenu)}
        />

        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute right-0 top-full mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 py-1">
              <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700">
                <History className="w-4 h-4" />
                Execution History
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700">
                <Settings className="w-4 h-4" />
                Workflow Settings
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700">
                <Bug className="w-4 h-4" />
                Debug Mode
              </button>
              <div className="my-1 border-t border-gray-700" />
              <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700">
                <Download className="w-4 h-4" />
                Export
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700">
                <Upload className="w-4 h-4" />
                Import
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700">
                <Copy className="w-4 h-4" />
                Duplicate
              </button>
              <div className="my-1 border-t border-gray-700" />
              <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-900/30">
                <Trash2 className="w-4 h-4" />
                Delete Workflow
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default WorkflowToolbar;
