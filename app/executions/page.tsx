/**
 * FlowAtGenAi - Executions Page
 * 
 * Monitor and manage workflow executions in real-time.
 * 
 * @module app/executions/page
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  Play,
  Square,
  MoreHorizontal,
  ChevronRight,
  Calendar,
  Workflow,
  Timer,
  Zap,
  ArrowUpRight,
  Download,
  Trash2,
  Eye,
  RotateCcw,
} from 'lucide-react';
import { cn, formatDuration, formatRelativeTime } from '../../lib/utils';

// ============================================
// Types
// ============================================

interface Execution {
  id: string;
  workflowId: string;
  workflowName: string;
  status: 'running' | 'succeeded' | 'failed' | 'cancelled' | 'waiting' | 'queued';
  trigger: 'manual' | 'webhook' | 'schedule' | 'api';
  startedAt: string;
  finishedAt?: string;
  duration?: number;
  nodesExecuted: number;
  nodeCount: number;
  error?: string;
  retryOf?: string;
}

// ============================================
// Mock Data
// ============================================

const mockExecutions: Execution[] = [
  {
    id: 'exec_1',
    workflowId: 'wf_1',
    workflowName: 'Email Marketing Campaign',
    status: 'succeeded',
    trigger: 'schedule',
    startedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    finishedAt: new Date(Date.now() - 1.5 * 60 * 1000).toISOString(),
    duration: 45000,
    nodesExecuted: 8,
    nodeCount: 8,
  },
  {
    id: 'exec_2',
    workflowId: 'wf_2',
    workflowName: 'Lead Scoring Pipeline',
    status: 'running',
    trigger: 'webhook',
    startedAt: new Date(Date.now() - 30 * 1000).toISOString(),
    nodesExecuted: 3,
    nodeCount: 6,
  },
  {
    id: 'exec_3',
    workflowId: 'wf_3',
    workflowName: 'Data Sync - Salesforce',
    status: 'failed',
    trigger: 'manual',
    startedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    finishedAt: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    duration: 83000,
    nodesExecuted: 4,
    nodeCount: 7,
    error: 'API rate limit exceeded. Please try again later.',
  },
  {
    id: 'exec_4',
    workflowId: 'wf_4',
    workflowName: 'Slack Notifications',
    status: 'succeeded',
    trigger: 'api',
    startedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    finishedAt: new Date(Date.now() - 59 * 60 * 1000).toISOString(),
    duration: 2100,
    nodesExecuted: 3,
    nodeCount: 3,
  },
  {
    id: 'exec_5',
    workflowId: 'wf_5',
    workflowName: 'Customer Onboarding',
    status: 'waiting',
    trigger: 'webhook',
    startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    nodesExecuted: 5,
    nodeCount: 12,
  },
  {
    id: 'exec_6',
    workflowId: 'wf_1',
    workflowName: 'Email Marketing Campaign',
    status: 'succeeded',
    trigger: 'schedule',
    startedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    finishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000 + 42000).toISOString(),
    duration: 42000,
    nodesExecuted: 8,
    nodeCount: 8,
  },
  {
    id: 'exec_7',
    workflowId: 'wf_6',
    workflowName: 'Invoice Processing',
    status: 'cancelled',
    trigger: 'manual',
    startedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    finishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000 + 15000).toISOString(),
    duration: 15000,
    nodesExecuted: 2,
    nodeCount: 9,
  },
  {
    id: 'exec_8',
    workflowId: 'wf_2',
    workflowName: 'Lead Scoring Pipeline',
    status: 'queued',
    trigger: 'webhook',
    startedAt: new Date().toISOString(),
    nodesExecuted: 0,
    nodeCount: 6,
  },
];

// ============================================
// Status Badge
// ============================================

interface StatusBadgeProps {
  status: Execution['status'];
  size?: 'sm' | 'md';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const config = {
    running: { icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Running', animate: true },
    succeeded: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-400/10', label: 'Succeeded', animate: false },
    failed: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10', label: 'Failed', animate: false },
    cancelled: { icon: Square, color: 'text-gray-400', bg: 'bg-gray-400/10', label: 'Cancelled', animate: false },
    waiting: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-400/10', label: 'Waiting', animate: true },
    queued: { icon: Clock, color: 'text-purple-400', bg: 'bg-purple-400/10', label: 'Queued', animate: false },
  };

  const { icon: Icon, color, bg, label, animate } = config[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        bg,
        color,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
      )}
    >
      <Icon className={cn('w-3.5 h-3.5', animate && 'animate-spin')} />
      {label}
    </span>
  );
};

// ============================================
// Trigger Badge
// ============================================

const TriggerBadge: React.FC<{ trigger: Execution['trigger'] }> = ({ trigger }) => {
  const config = {
    manual: { icon: Play, label: 'Manual' },
    webhook: { icon: Zap, label: 'Webhook' },
    schedule: { icon: Calendar, label: 'Schedule' },
    api: { icon: ArrowUpRight, label: 'API' },
  };

  const { icon: Icon, label } = config[trigger];

  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
};

// ============================================
// Execution Row
// ============================================

interface ExecutionRowProps {
  execution: Execution;
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
  onView: (id: string) => void;
}

const ExecutionRow: React.FC<ExecutionRowProps> = ({
  execution,
  onRetry,
  onCancel,
  onView,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const progress = (execution.nodesExecuted / execution.nodeCount) * 100;

  return (
    <div className="flex items-center gap-4 p-4 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 transition-all">
      {/* Status */}
      <StatusBadge status={execution.status} />

      {/* Workflow Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            href={`/workflows/${execution.workflowId}/edit`}
            className="text-sm font-medium text-white hover:text-blue-400 transition-colors truncate"
          >
            {execution.workflowName}
          </Link>
          <TriggerBadge trigger={execution.trigger} />
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
          <span className="font-mono">{execution.id}</span>
          <span>•</span>
          <span>{formatRelativeTime(execution.startedAt)}</span>
        </div>
      </div>

      {/* Progress */}
      <div className="w-32">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
          <span>Progress</span>
          <span>{execution.nodesExecuted}/{execution.nodeCount}</span>
        </div>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              execution.status === 'succeeded' && 'bg-green-500',
              execution.status === 'failed' && 'bg-red-500',
              execution.status === 'running' && 'bg-blue-500',
              execution.status === 'waiting' && 'bg-yellow-500',
              execution.status === 'queued' && 'bg-purple-500',
              execution.status === 'cancelled' && 'bg-gray-500'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Duration */}
      <div className="w-24 text-right">
        {execution.duration ? (
          <span className="text-sm text-gray-300">
            {formatDuration(execution.duration)}
          </span>
        ) : execution.status === 'running' ? (
          <span className="text-sm text-blue-400 flex items-center justify-end gap-1">
            <Timer className="w-3 h-3" />
            Running...
          </span>
        ) : (
          <span className="text-sm text-gray-500">-</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onView(execution.id)}
          className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          title="View Details"
        >
          <Eye className="w-4 h-4" />
        </button>

        {execution.status === 'running' && (
          <button
            onClick={() => onCancel(execution.id)}
            className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
            title="Cancel"
          >
            <Square className="w-4 h-4" />
          </button>
        )}

        {execution.status === 'failed' && (
          <button
            onClick={() => onRetry(execution.id)}
            className="p-2 text-gray-500 hover:text-blue-400 hover:bg-blue-900/30 rounded-lg transition-colors"
            title="Retry"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 py-1">
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700">
                  <Eye className="w-4 h-4" /> View Details
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700">
                  <Download className="w-4 h-4" /> Export Logs
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700">
                  <RotateCcw className="w-4 h-4" /> Retry
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
  );
};

// ============================================
// Execution Detail Modal
// ============================================

interface ExecutionDetailProps {
  execution: Execution | null;
  onClose: () => void;
}

const ExecutionDetail: React.FC<ExecutionDetailProps> = ({ execution, onClose }) => {
  if (!execution) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-white">{execution.workflowName}</h2>
            <p className="text-sm text-gray-500 font-mono">{execution.id}</p>
          </div>
          <StatusBadge status={execution.status} />
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Error Message */}
          {execution.error && (
            <div className="p-4 bg-red-900/30 border border-red-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-400">Execution Failed</p>
                  <p className="text-sm text-red-300 mt-1">{execution.error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-gray-800/50 rounded-lg">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Started</p>
              <p className="text-sm text-white mt-1">
                {new Date(execution.startedAt).toLocaleString()}
              </p>
            </div>
            <div className="p-4 bg-gray-800/50 rounded-lg">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Duration</p>
              <p className="text-sm text-white mt-1">
                {execution.duration ? formatDuration(execution.duration) : 'In progress...'}
              </p>
            </div>
            <div className="p-4 bg-gray-800/50 rounded-lg">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Nodes</p>
              <p className="text-sm text-white mt-1">
                {execution.nodesExecuted} / {execution.nodeCount}
              </p>
            </div>
          </div>

          {/* Node Execution Timeline */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-3">Execution Timeline</h3>
            <div className="space-y-2">
              {Array.from({ length: execution.nodeCount }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg',
                    i < execution.nodesExecuted
                      ? execution.status === 'failed' && i === execution.nodesExecuted - 1
                        ? 'bg-red-900/20 border border-red-800'
                        : 'bg-gray-800/50'
                      : 'bg-gray-800/20'
                  )}
                >
                  <div
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center',
                      i < execution.nodesExecuted
                        ? execution.status === 'failed' && i === execution.nodesExecuted - 1
                          ? 'bg-red-500'
                          : 'bg-green-500'
                        : 'bg-gray-700'
                    )}
                  >
                    {i < execution.nodesExecuted ? (
                      execution.status === 'failed' && i === execution.nodesExecuted - 1 ? (
                        <XCircle className="w-4 h-4 text-white" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      )
                    ) : (
                      <span className="text-xs text-gray-400">{i + 1}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white">Node {i + 1}</p>
                    <p className="text-xs text-gray-500">
                      {i < execution.nodesExecuted ? 'Completed' : 'Pending'}
                    </p>
                  </div>
                  {i < execution.nodesExecuted && (
                    <span className="text-xs text-gray-400">
                      {Math.floor(Math.random() * 500 + 100)}ms
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Close
          </button>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg transition-colors">
              <Download className="w-4 h-4" />
              Export Logs
            </button>
            {execution.status === 'failed' && (
              <button className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                <RotateCcw className="w-4 h-4" />
                Retry
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// Main Page
// ============================================

export default function ExecutionsPage() {
  const [executions, setExecutions] = useState(mockExecutions);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedExecution, setSelectedExecution] = useState<Execution | null>(null);

  // Auto-refresh for running executions
  useEffect(() => {
    const interval = setInterval(() => {
      // In real app, would fetch updated execution status
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const handleRetry = (id: string) => {
    console.log('Retry execution:', id);
  };

  const handleCancel = (id: string) => {
    console.log('Cancel execution:', id);
  };

  const filteredExecutions = executions.filter((e) => {
    const matchesSearch = e.workflowName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: executions.length,
    running: executions.filter((e) => e.status === 'running').length,
    succeeded: executions.filter((e) => e.status === 'succeeded').length,
    failed: executions.filter((e) => e.status === 'failed').length,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Executions</h1>
          <p className="text-gray-400 mt-1">Monitor and manage workflow executions</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-sm text-gray-400">Total Executions</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-sm text-gray-400">Running</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{stats.running}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-sm text-gray-400">Succeeded</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{stats.succeeded}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-sm text-gray-400">Failed</p>
          <p className="text-2xl font-bold text-red-400 mt-1">{stats.failed}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search executions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="running">Running</option>
          <option value="succeeded">Succeeded</option>
          <option value="failed">Failed</option>
          <option value="waiting">Waiting</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Executions List */}
      <div className="space-y-2">
        {filteredExecutions.map((execution) => (
          <ExecutionRow
            key={execution.id}
            execution={execution}
            onRetry={handleRetry}
            onCancel={handleCancel}
            onView={(id) => setSelectedExecution(executions.find((e) => e.id === id) || null)}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredExecutions.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
            <Clock className="w-8 h-8 text-gray-600" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No executions found</h3>
          <p className="text-gray-500">
            {searchQuery
              ? 'Try adjusting your search or filters'
              : 'Run a workflow to see executions here'}
          </p>
        </div>
      )}

      {/* Execution Detail Modal */}
      <ExecutionDetail
        execution={selectedExecution}
        onClose={() => setSelectedExecution(null)}
      />
    </div>
  );
}
