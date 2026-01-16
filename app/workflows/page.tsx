/**
 * FlowAtGenAi - Workflows List Page
 * 
 * List all workflows with search, filter, and actions.
 * 
 * @module app/workflows/page
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Plus,
  Filter,
  LayoutGrid,
  List,
  MoreHorizontal,
  Play,
  Pause,
  Copy,
  Trash2,
  Edit,
  Clock,
  CheckCircle2,
  XCircle,
  Workflow,
  Folder,
  Tag,
  ChevronDown,
  Star,
  StarOff,
} from 'lucide-react';
import { cn } from '../../lib/utils';

// ============================================
// Types
// ============================================

interface WorkflowItem {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'error';
  lastRun?: string;
  lastRunStatus?: 'success' | 'failed';
  executions: number;
  successRate: number;
  trigger: string;
  updatedAt: string;
  tags?: string[];
  starred?: boolean;
}

// ============================================
// Mock Data
// ============================================

const mockWorkflows: WorkflowItem[] = [
  {
    id: '1',
    name: 'Email Marketing Campaign',
    description: 'Send personalized emails to leads based on their behavior',
    status: 'active',
    lastRun: '2 min ago',
    lastRunStatus: 'success',
    executions: 1247,
    successRate: 99,
    trigger: 'Schedule',
    updatedAt: '2024-01-15',
    tags: ['marketing', 'email'],
    starred: true,
  },
  {
    id: '2',
    name: 'Lead Scoring Pipeline',
    description: 'Score and qualify leads using AI',
    status: 'active',
    lastRun: 'Just now',
    lastRunStatus: 'success',
    executions: 892,
    successRate: 97,
    trigger: 'Webhook',
    updatedAt: '2024-01-14',
    tags: ['sales', 'ai'],
    starred: true,
  },
  {
    id: '3',
    name: 'Data Sync - Salesforce',
    description: 'Sync customer data between systems',
    status: 'error',
    lastRun: '15 min ago',
    lastRunStatus: 'failed',
    executions: 456,
    successRate: 94,
    trigger: 'Schedule',
    updatedAt: '2024-01-13',
    tags: ['sync', 'salesforce'],
  },
  {
    id: '4',
    name: 'Slack Notifications',
    description: 'Send notifications to Slack channels',
    status: 'active',
    lastRun: '1 hour ago',
    lastRunStatus: 'success',
    executions: 2341,
    successRate: 100,
    trigger: 'App Event',
    updatedAt: '2024-01-12',
    tags: ['notifications', 'slack'],
  },
  {
    id: '5',
    name: 'Customer Onboarding',
    description: 'Automated onboarding sequence for new customers',
    status: 'inactive',
    executions: 156,
    successRate: 100,
    trigger: 'Webhook',
    updatedAt: '2024-01-10',
    tags: ['onboarding'],
  },
  {
    id: '6',
    name: 'Invoice Processing',
    description: 'Extract data from invoices using AI',
    status: 'active',
    lastRun: '3 hours ago',
    lastRunStatus: 'success',
    executions: 789,
    successRate: 98,
    trigger: 'Email',
    updatedAt: '2024-01-09',
    tags: ['finance', 'ai'],
  },
];

// ============================================
// Workflow Card (Grid View)
// ============================================

interface WorkflowCardProps {
  workflow: WorkflowItem;
  onToggleStar: (id: string) => void;
}

const WorkflowCard: React.FC<WorkflowCardProps> = ({ workflow, onToggleStar }) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-all group">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              workflow.status === 'active' && 'bg-green-600/20',
              workflow.status === 'inactive' && 'bg-gray-600/20',
              workflow.status === 'error' && 'bg-red-600/20'
            )}
          >
            <Workflow
              className={cn(
                'w-5 h-5',
                workflow.status === 'active' && 'text-green-400',
                workflow.status === 'inactive' && 'text-gray-400',
                workflow.status === 'error' && 'text-red-400'
              )}
            />
          </div>
          <div>
            <Link
              href={`/workflows/${workflow.id}/edit`}
              className="text-sm font-medium text-white hover:text-blue-400 transition-colors"
            >
              {workflow.name}
            </Link>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={cn(
                  'text-xs px-2 py-0.5 rounded-full',
                  workflow.status === 'active' && 'bg-green-600/20 text-green-400',
                  workflow.status === 'inactive' && 'bg-gray-600/20 text-gray-400',
                  workflow.status === 'error' && 'bg-red-600/20 text-red-400'
                )}
              >
                {workflow.status}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onToggleStar(workflow.id)}
            className="p-1.5 text-gray-500 hover:text-yellow-400 transition-colors"
          >
            {workflow.starred ? (
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            ) : (
              <StarOff className="w-4 h-4" />
            )}
          </button>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 py-1">
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700">
                    <Play className="w-4 h-4" /> Run Now
                  </button>
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700">
                    <Edit className="w-4 h-4" /> Edit
                  </button>
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700">
                    <Copy className="w-4 h-4" /> Duplicate
                  </button>
                  <div className="my-1 border-t border-gray-700" />
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-900/30">
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {workflow.description && (
        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{workflow.description}</p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center p-2 bg-gray-800/50 rounded-lg">
          <p className="text-lg font-semibold text-white">{workflow.executions}</p>
          <p className="text-xs text-gray-500">Runs</p>
        </div>
        <div className="text-center p-2 bg-gray-800/50 rounded-lg">
          <p className="text-lg font-semibold text-white">{workflow.successRate}%</p>
          <p className="text-xs text-gray-500">Success</p>
        </div>
        <div className="text-center p-2 bg-gray-800/50 rounded-lg">
          <p className="text-sm font-medium text-white">{workflow.trigger}</p>
          <p className="text-xs text-gray-500">Trigger</p>
        </div>
      </div>

      {/* Tags */}
      {workflow.tags && workflow.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {workflow.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 bg-gray-800 text-gray-400 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-800">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          {workflow.lastRun ? (
            <span className="flex items-center gap-1">
              {workflow.lastRun}
              {workflow.lastRunStatus === 'success' && (
                <CheckCircle2 className="w-3 h-3 text-green-500" />
              )}
              {workflow.lastRunStatus === 'failed' && (
                <XCircle className="w-3 h-3 text-red-500" />
              )}
            </span>
          ) : (
            'Never run'
          )}
        </div>
        <Link
          href={`/workflows/${workflow.id}/edit`}
          className="text-xs text-blue-400 hover:text-blue-300"
        >
          Open →
        </Link>
      </div>
    </div>
  );
};

// ============================================
// Workflow Row (List View)
// ============================================

const WorkflowRow: React.FC<WorkflowCardProps> = ({ workflow, onToggleStar }) => {
  return (
    <div className="flex items-center gap-4 p-4 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 transition-all">
      <button
        onClick={() => onToggleStar(workflow.id)}
        className="text-gray-500 hover:text-yellow-400 transition-colors"
      >
        {workflow.starred ? (
          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
        ) : (
          <StarOff className="w-4 h-4" />
        )}
      </button>

      <div
        className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
          workflow.status === 'active' && 'bg-green-600/20',
          workflow.status === 'inactive' && 'bg-gray-600/20',
          workflow.status === 'error' && 'bg-red-600/20'
        )}
      >
        <Workflow
          className={cn(
            'w-5 h-5',
            workflow.status === 'active' && 'text-green-400',
            workflow.status === 'inactive' && 'text-gray-400',
            workflow.status === 'error' && 'text-red-400'
          )}
        />
      </div>

      <div className="flex-1 min-w-0">
        <Link
          href={`/workflows/${workflow.id}/edit`}
          className="text-sm font-medium text-white hover:text-blue-400 transition-colors"
        >
          {workflow.name}
        </Link>
        {workflow.description && (
          <p className="text-xs text-gray-500 truncate">{workflow.description}</p>
        )}
      </div>

      <span
        className={cn(
          'text-xs px-2 py-1 rounded-full',
          workflow.status === 'active' && 'bg-green-600/20 text-green-400',
          workflow.status === 'inactive' && 'bg-gray-600/20 text-gray-400',
          workflow.status === 'error' && 'bg-red-600/20 text-red-400'
        )}
      >
        {workflow.status}
      </span>

      <div className="text-right w-20">
        <p className="text-sm font-medium text-white">{workflow.executions}</p>
        <p className="text-xs text-gray-500">runs</p>
      </div>

      <div className="text-right w-20">
        <p className="text-sm font-medium text-white">{workflow.successRate}%</p>
        <p className="text-xs text-gray-500">success</p>
      </div>

      <div className="text-right w-24">
        <p className="text-sm text-gray-300">{workflow.trigger}</p>
      </div>

      <div className="flex items-center gap-1">
        <Link
          href={`/workflows/${workflow.id}/edit`}
          className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
        >
          <Edit className="w-4 h-4" />
        </Link>
        <button className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
          <Play className="w-4 h-4" />
        </button>
        <button className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// ============================================
// Main Page
// ============================================

export default function WorkflowsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'error'>('all');
  const [workflows, setWorkflows] = useState(mockWorkflows);

  const handleToggleStar = (id: string) => {
    setWorkflows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, starred: !w.starred } : w))
    );
  };

  const filteredWorkflows = workflows.filter((w) => {
    const matchesSearch = w.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || w.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const starredWorkflows = filteredWorkflows.filter((w) => w.starred);
  const regularWorkflows = filteredWorkflows.filter((w) => !w.starred);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Workflows</h1>
          <p className="text-gray-400 mt-1">Manage and monitor your automation workflows</p>
        </div>
        <Link
          href="/workflows/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Workflow
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search workflows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="error">Error</option>
          </select>

          <div className="flex items-center bg-gray-900 border border-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 rounded-md transition-colors',
                viewMode === 'grid' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-white'
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 rounded-md transition-colors',
                viewMode === 'list' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-white'
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Starred Section */}
      {starredWorkflows.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-400" />
            Starred Workflows
          </h2>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {starredWorkflows.map((workflow) => (
                <WorkflowCard
                  key={workflow.id}
                  workflow={workflow}
                  onToggleStar={handleToggleStar}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {starredWorkflows.map((workflow) => (
                <WorkflowRow
                  key={workflow.id}
                  workflow={workflow}
                  onToggleStar={handleToggleStar}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* All Workflows */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          All Workflows ({regularWorkflows.length})
        </h2>
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {regularWorkflows.map((workflow) => (
              <WorkflowCard
                key={workflow.id}
                workflow={workflow}
                onToggleStar={handleToggleStar}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {regularWorkflows.map((workflow) => (
              <WorkflowRow
                key={workflow.id}
                workflow={workflow}
                onToggleStar={handleToggleStar}
              />
            ))}
          </div>
        )}
      </div>

      {/* Empty State */}
      {filteredWorkflows.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
            <Workflow className="w-8 h-8 text-gray-600" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No workflows found</h3>
          <p className="text-gray-500 mb-4">
            {searchQuery
              ? 'Try adjusting your search or filters'
              : 'Get started by creating your first workflow'}
          </p>
          {!searchQuery && (
            <Link
              href="/workflows/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Workflow
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
