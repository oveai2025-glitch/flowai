/**
 * FlowAtGenAi - Node Palette
 * 
 * Sidebar component showing all available nodes organized by category.
 * Nodes can be dragged onto the canvas.
 * 
 * @module components/workflow/NodePalette
 */

'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  ChevronDown,
  ChevronRight,
  Play,
  Webhook,
  Clock,
  Mail,
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
  Zap,
  Database,
  CreditCard,
  MessageCircle,
  Github,
  Table,
  FileSpreadsheet,
  type LucideIcon,
  GripVertical,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useWorkflowStore } from '../../stores/workflow-store';

// ============================================
// Types
// ============================================

interface NodePaletteItem {
  type: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
}

interface NodeCategory {
  id: string;
  name: string;
  icon: LucideIcon;
  nodes: NodePaletteItem[];
}

// ============================================
// Node Categories
// ============================================

const nodeCategories: NodeCategory[] = [
  {
    id: 'triggers',
    name: 'Triggers',
    icon: Zap,
    nodes: [
      {
        type: 'trigger-manual',
        name: 'Manual Trigger',
        description: 'Start workflow manually',
        icon: Play,
        color: '#10B981',
      },
      {
        type: 'trigger-webhook',
        name: 'Webhook',
        description: 'Receive HTTP requests',
        icon: Webhook,
        color: '#6366F1',
      },
      {
        type: 'trigger-schedule',
        name: 'Schedule',
        description: 'Run on a schedule',
        icon: Clock,
        color: '#F59E0B',
      },
      {
        type: 'trigger-email',
        name: 'Email Trigger',
        description: 'Trigger on new emails',
        icon: Mail,
        color: '#EF4444',
      },
    ],
  },
  {
    id: 'actions',
    name: 'Actions',
    icon: Globe,
    nodes: [
      {
        type: 'action-http',
        name: 'HTTP Request',
        description: 'Make API calls',
        icon: Globe,
        color: '#3B82F6',
      },
      {
        type: 'action-code',
        name: 'Code',
        description: 'Run custom code',
        icon: Code,
        color: '#8B5CF6',
      },
      {
        type: 'action-set',
        name: 'Set',
        description: 'Set field values',
        icon: PenLine,
        color: '#10B981',
      },
      {
        type: 'action-wait',
        name: 'Wait',
        description: 'Delay execution',
        icon: Timer,
        color: '#F59E0B',
      },
      {
        type: 'action-email',
        name: 'Send Email',
        description: 'Send email messages',
        icon: Mail,
        color: '#EF4444',
      },
    ],
  },
  {
    id: 'logic',
    name: 'Logic & Flow',
    icon: GitFork,
    nodes: [
      {
        type: 'logic-if',
        name: 'If',
        description: 'Conditional branching',
        icon: GitFork,
        color: '#F59E0B',
      },
      {
        type: 'logic-switch',
        name: 'Switch',
        description: 'Multiple branches',
        icon: Route,
        color: '#EC4899',
      },
      {
        type: 'logic-loop',
        name: 'Loop',
        description: 'Iterate over items',
        icon: Repeat,
        color: '#8B5CF6',
      },
      {
        type: 'logic-merge',
        name: 'Merge',
        description: 'Combine branches',
        icon: Merge,
        color: '#06B6D4',
      },
      {
        type: 'logic-filter',
        name: 'Filter',
        description: 'Filter items',
        icon: Filter,
        color: '#10B981',
      },
      {
        type: 'logic-split',
        name: 'Split',
        description: 'Split into branches',
        icon: Split,
        color: '#F97316',
      },
      {
        type: 'logic-aggregate',
        name: 'Aggregate',
        description: 'Combine & calculate',
        icon: BarChart3,
        color: '#6366F1',
      },
    ],
  },
  {
    id: 'ai',
    name: 'AI & LLM',
    icon: Sparkles,
    nodes: [
      {
        type: 'ai-prompt',
        name: 'AI Prompt',
        description: 'Generate with AI',
        icon: Sparkles,
        color: '#8B5CF6',
      },
      {
        type: 'ai-chat',
        name: 'AI Chat',
        description: 'Chat conversation',
        icon: MessageSquare,
        color: '#06B6D4',
      },
      {
        type: 'ai-agent',
        name: 'AI Agent',
        description: 'Autonomous agent',
        icon: Bot,
        color: '#EC4899',
      },
      {
        type: 'ai-extract',
        name: 'AI Extract',
        description: 'Extract structured data',
        icon: FileSearch,
        color: '#10B981',
      },
      {
        type: 'ai-summarize',
        name: 'AI Summarize',
        description: 'Summarize text',
        icon: FileText,
        color: '#F59E0B',
      },
    ],
  },
  {
    id: 'flow',
    name: 'Flow Control',
    icon: Workflow,
    nodes: [
      {
        type: 'flow-approval',
        name: 'Wait for Approval',
        description: 'Human approval gate',
        icon: UserCheck,
        color: '#10B981',
      },
      {
        type: 'flow-subworkflow',
        name: 'Run Workflow',
        description: 'Execute sub-workflow',
        icon: Workflow,
        color: '#6366F1',
      },
      {
        type: 'flow-stop',
        name: 'Stop',
        description: 'Stop with error',
        icon: StopCircle,
        color: '#EF4444',
      },
      {
        type: 'flow-webhook-response',
        name: 'Respond',
        description: 'Webhook response',
        icon: Reply,
        color: '#3B82F6',
      },
    ],
  },
  {
    id: 'transform',
    name: 'Transform',
    icon: Braces,
    nodes: [
      {
        type: 'transform-json',
        name: 'JSON',
        description: 'Parse/stringify JSON',
        icon: Braces,
        color: '#F59E0B',
      },
      {
        type: 'transform-split',
        name: 'Split Text',
        description: 'Split into items',
        icon: Scissors,
        color: '#EC4899',
      },
    ],
  },
  {
    id: 'connectors',
    name: 'Apps & Integrations',
    icon: Zap,
    nodes: [
      {
        type: 'connector-slack',
        name: 'Slack',
        description: 'Send messages',
        icon: MessageCircle,
        color: '#4A154B',
      },
      {
        type: 'connector-discord',
        name: 'Discord',
        description: 'Discord integration',
        icon: MessageCircle,
        color: '#5865F2',
      },
      {
        type: 'connector-github',
        name: 'GitHub',
        description: 'GitHub actions',
        icon: Github,
        color: '#24292F',
      },
      {
        type: 'connector-notion',
        name: 'Notion',
        description: 'Notion databases',
        icon: FileText,
        color: '#000000',
      },
      {
        type: 'connector-google-sheets',
        name: 'Google Sheets',
        description: 'Spreadsheets',
        icon: FileSpreadsheet,
        color: '#34A853',
      },
      {
        type: 'connector-postgres',
        name: 'PostgreSQL',
        description: 'Database queries',
        icon: Database,
        color: '#336791',
      },
      {
        type: 'connector-stripe',
        name: 'Stripe',
        description: 'Payments',
        icon: CreditCard,
        color: '#635BFF',
      },
      {
        type: 'connector-openai',
        name: 'OpenAI',
        description: 'OpenAI API',
        icon: Sparkles,
        color: '#10A37F',
      },
    ],
  },
];

// ============================================
// Draggable Node Item
// ============================================

interface DraggableNodeProps {
  node: NodePaletteItem;
}

const DraggableNode: React.FC<DraggableNodeProps> = ({ node }) => {
  const onDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({
      type: node.type,
      name: node.name,
    }));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 cursor-grab active:cursor-grabbing border border-transparent hover:border-gray-600 transition-all group"
      draggable
      onDragStart={onDragStart}
    >
      <div
        className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: `${node.color}20` }}
      >
        <node.icon className="w-4 h-4" style={{ color: node.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white truncate">
          {node.name}
        </div>
        <div className="text-xs text-gray-500 truncate">
          {node.description}
        </div>
      </div>
      <GripVertical className="w-4 h-4 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
};

// ============================================
// Category Section
// ============================================

interface CategorySectionProps {
  category: NodeCategory;
  isExpanded: boolean;
  onToggle: () => void;
  searchQuery: string;
}

const CategorySection: React.FC<CategorySectionProps> = ({
  category,
  isExpanded,
  onToggle,
  searchQuery,
}) => {
  const filteredNodes = useMemo(() => {
    if (!searchQuery) return category.nodes;
    const query = searchQuery.toLowerCase();
    return category.nodes.filter(
      (node) =>
        node.name.toLowerCase().includes(query) ||
        node.description.toLowerCase().includes(query)
    );
  }, [category.nodes, searchQuery]);

  if (filteredNodes.length === 0) return null;

  return (
    <div className="border-b border-gray-800 last:border-b-0">
      <button
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-800/50 transition-colors text-left"
        onClick={onToggle}
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
        <category.icon className="w-4 h-4 text-gray-400" />
        <span className="flex-1 text-sm font-medium text-gray-300">
          {category.name}
        </span>
        <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
          {filteredNodes.length}
        </span>
      </button>
      
      {isExpanded && (
        <div className="px-3 pb-3 space-y-1">
          {filteredNodes.map((node) => (
            <DraggableNode key={node.type} node={node} />
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================
// Main Component
// ============================================

const NodePalette: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['triggers', 'actions', 'ai'])
  );

  const isNodePaletteOpen = useWorkflowStore((state) => state.isNodePaletteOpen);
  const toggleNodePalette = useWorkflowStore((state) => state.toggleNodePalette);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // Auto-expand all categories when searching
  const effectiveExpandedCategories = searchQuery
    ? new Set(nodeCategories.map((c) => c.id))
    : expandedCategories;

  if (!isNodePaletteOpen) {
    return (
      <button
        onClick={toggleNodePalette}
        className="absolute left-4 top-4 z-10 p-2 bg-gray-800 rounded-lg border border-gray-700 hover:bg-gray-700 transition-colors"
        title="Open node palette"
      >
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </button>
    );
  }

  return (
    <div className="w-72 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">Nodes</h2>
          <button
            onClick={toggleNodePalette}
            className="p-1 hover:bg-gray-800 rounded transition-colors"
            title="Close palette"
          >
            <ChevronDown className="w-4 h-4 text-gray-400 rotate-90" />
          </button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-y-auto">
        {nodeCategories.map((category) => (
          <CategorySection
            key={category.id}
            category={category}
            isExpanded={effectiveExpandedCategories.has(category.id)}
            onToggle={() => toggleCategory(category.id)}
            searchQuery={searchQuery}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-800">
        <p className="text-xs text-gray-500 text-center">
          Drag nodes to the canvas to add them
        </p>
      </div>
    </div>
  );
};

export default NodePalette;
