/**
 * FlowAtGenAi - Workflow Node Component
 * 
 * Custom node component for ReactFlow that displays nodes
 * with proper styling, icons, handles, and execution state.
 * 
 * @module components/workflow/WorkflowNode
 */

'use client';

import React, { memo, useMemo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { 
  Play, 
  Webhook, 
  Clock, 
  Globe, 
  Code, 
  PenLine, 
  Timer,
  GitFork,
  Route,
  Repeat,
  Merge,
  Filter,
  Split,
  BarChart3,
  Sparkles,
  MessageSquare,
  Bot,
  FileSearch,
  FileText,
  UserCheck,
  Workflow,
  StopCircle,
  Reply,
  Braces,
  Scissors,
  Mail,
  Database,
  CreditCard,
  Github,
  MessageCircle,
  MoreHorizontal,
  AlertCircle,
  CheckCircle2,
  Loader2,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useWorkflowStore } from '../../stores/workflow-store';
import type { NodeType, NodeExecutionState } from '../../types/workflow';

// ============================================
// Node Icon Mapping
// ============================================

const nodeIcons: Record<string, LucideIcon> = {
  'trigger-manual': Play,
  'trigger-webhook': Webhook,
  'trigger-schedule': Clock,
  'trigger-email': Mail,
  
  'action-http': Globe,
  'action-code': Code,
  'action-set': PenLine,
  'action-wait': Timer,
  'action-email': Mail,
  
  'logic-if': GitFork,
  'logic-switch': Route,
  'logic-loop': Repeat,
  'logic-foreach': Repeat,
  'logic-merge': Merge,
  'logic-filter': Filter,
  'logic-split': Split,
  'logic-aggregate': BarChart3,
  
  'ai-prompt': Sparkles,
  'ai-chat': MessageSquare,
  'ai-agent': Bot,
  'ai-extract': FileSearch,
  'ai-summarize': FileText,
  
  'flow-approval': UserCheck,
  'flow-subworkflow': Workflow,
  'flow-stop': StopCircle,
  'flow-webhook-response': Reply,
  
  'transform-json': Braces,
  'transform-split': Scissors,
  
  // Connectors
  'connector-slack': MessageCircle,
  'connector-github': Github,
  'connector-stripe': CreditCard,
  'connector-postgres': Database,
  'connector-discord': MessageCircle,
  'connector-notion': FileText,
  'connector-openai': Sparkles,
};

const nodeColors: Record<string, string> = {
  'trigger-manual': '#10B981',
  'trigger-webhook': '#6366F1',
  'trigger-schedule': '#F59E0B',
  'trigger-email': '#EF4444',
  
  'action-http': '#3B82F6',
  'action-code': '#8B5CF6',
  'action-set': '#10B981',
  'action-wait': '#F59E0B',
  'action-email': '#EF4444',
  
  'logic-if': '#F59E0B',
  'logic-switch': '#EC4899',
  'logic-loop': '#8B5CF6',
  'logic-foreach': '#8B5CF6',
  'logic-merge': '#06B6D4',
  'logic-filter': '#10B981',
  'logic-split': '#F97316',
  'logic-aggregate': '#6366F1',
  
  'ai-prompt': '#8B5CF6',
  'ai-chat': '#06B6D4',
  'ai-agent': '#EC4899',
  'ai-extract': '#10B981',
  'ai-summarize': '#F59E0B',
  
  'flow-approval': '#10B981',
  'flow-subworkflow': '#6366F1',
  'flow-stop': '#EF4444',
  'flow-webhook-response': '#3B82F6',
  
  'transform-json': '#F59E0B',
  'transform-split': '#EC4899',
  
  'connector-slack': '#4A154B',
  'connector-github': '#24292F',
  'connector-stripe': '#635BFF',
  'connector-postgres': '#336791',
  'connector-discord': '#5865F2',
  'connector-notion': '#000000',
  'connector-openai': '#10A37F',
};

// ============================================
// Execution State Indicator
// ============================================

interface ExecutionIndicatorProps {
  state: NodeExecutionState;
}

const ExecutionIndicator: React.FC<ExecutionIndicatorProps> = ({ state }) => {
  switch (state.status) {
    case 'running':
      return (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
          <Loader2 className="w-3 h-3 text-white animate-spin" />
        </div>
      );
    case 'success':
      return (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-3 h-3 text-white" />
        </div>
      );
    case 'error':
      return (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
          <XCircle className="w-3 h-3 text-white" />
        </div>
      );
    case 'skipped':
      return (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-gray-500 rounded-full flex items-center justify-center">
          <AlertCircle className="w-3 h-3 text-white" />
        </div>
      );
    default:
      return null;
  }
};

// ============================================
// Main Node Component
// ============================================

interface WorkflowNodeData {
  label?: string;
  type: NodeType;
  name: string;
  disabled?: boolean;
  notes?: string;
  [key: string]: unknown;
}

const WorkflowNode: React.FC<NodeProps<WorkflowNodeData>> = ({
  id,
  data,
  selected,
  dragging,
}) => {
  const nodeStates = useWorkflowStore((state) => state.nodeStates);
  const openPanel = useWorkflowStore((state) => state.openPanel);
  
  const executionState = nodeStates[id] || { status: 'idle' };
  
  const Icon = nodeIcons[data.type] || MoreHorizontal;
  const color = nodeColors[data.type] || '#6B7280';
  
  const isTrigger = data.type.startsWith('trigger-');
  const isLogicNode = data.type.startsWith('logic-');
  
  // Determine number of outputs based on node type
  const outputCount = useMemo(() => {
    if (data.type === 'logic-if') return 2;
    if (data.type === 'logic-switch') return 4;
    if (data.type === 'logic-loop') return 2;
    if (data.type === 'flow-approval') return 2;
    if (data.type === 'logic-filter') return 2;
    return 1;
  }, [data.type]);

  const handleDoubleClick = () => {
    openPanel(id);
  };

  return (
    <div
      className={cn(
        'relative min-w-[180px] max-w-[280px] rounded-lg border-2 bg-gray-900 shadow-lg transition-all duration-200',
        selected && 'ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-950',
        dragging && 'opacity-80 scale-105',
        data.disabled && 'opacity-50',
        executionState.status === 'running' && 'border-blue-500',
        executionState.status === 'success' && 'border-green-500',
        executionState.status === 'error' && 'border-red-500'
      )}
      style={{ borderColor: selected ? undefined : color }}
      onDoubleClick={handleDoubleClick}
    >
      {/* Execution State Indicator */}
      <ExecutionIndicator state={executionState} />

      {/* Input Handle (not for triggers) */}
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !bg-gray-600 !border-2 !border-gray-400 hover:!bg-gray-500 hover:!border-gray-300 transition-colors"
        />
      )}

      {/* Node Content */}
      <div className="flex items-start gap-3 p-3">
        {/* Icon */}
        <div
          className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>

        {/* Text Content */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white truncate">
            {data.name || data.label || 'Unnamed Node'}
          </div>
          <div className="text-xs text-gray-400 truncate">
            {formatNodeType(data.type)}
          </div>
        </div>
      </div>

      {/* Notes indicator */}
      {data.notes && (
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
          <span className="text-[8px] text-black font-bold">!</span>
        </div>
      )}

      {/* Output Handles */}
      {outputCount === 1 && (
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-gray-600 !border-2 !border-gray-400 hover:!bg-gray-500 hover:!border-gray-300 transition-colors"
        />
      )}

      {outputCount === 2 && (
        <>
          <Handle
            type="source"
            position={Position.Right}
            id="true"
            className="!w-3 !h-3 !bg-green-600 !border-2 !border-green-400 hover:!bg-green-500 transition-colors"
            style={{ top: '30%' }}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="false"
            className="!w-3 !h-3 !bg-red-600 !border-2 !border-red-400 hover:!bg-red-500 transition-colors"
            style={{ top: '70%' }}
          />
          <div className="absolute right-[-30px] top-[25%] text-[10px] text-green-400">
            True
          </div>
          <div className="absolute right-[-30px] top-[65%] text-[10px] text-red-400">
            False
          </div>
        </>
      )}

      {outputCount === 4 && (
        <>
          {[0, 1, 2, 3].map((i) => (
            <Handle
              key={i}
              type="source"
              position={Position.Right}
              id={`output-${i}`}
              className="!w-3 !h-3 !bg-gray-600 !border-2 !border-gray-400 hover:!bg-gray-500 transition-colors"
              style={{ top: `${20 + i * 20}%` }}
            />
          ))}
        </>
      )}
    </div>
  );
};

// ============================================
// Utility Functions
// ============================================

function formatNodeType(type: string): string {
  return type
    .replace(/^(trigger|action|logic|ai|flow|transform|connector)-/, '')
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// ============================================
// Export
// ============================================

export default memo(WorkflowNode);

// Node types for ReactFlow
export const nodeTypes = {
  workflowNode: WorkflowNode,
};
