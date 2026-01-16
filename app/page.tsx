/**
 * FlowAtGenAi - Dashboard Page
 * 
 * Main dashboard with workflow stats, recent executions,
 * and quick actions.
 * 
 * @module app/page
 */

'use client';

import React from 'react';
import Link from 'next/link';
import {
  Workflow,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowRight,
  Bot,
  Zap,
  FileText,
  Settings,
  Activity,
  BarChart3,
  Users,
  Globe,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '../lib/utils';

// ============================================
// Stats Card
// ============================================

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ElementType;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  color,
}) => {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {isPositive && <TrendingUp className="w-4 h-4 text-green-500" />}
              {isNegative && <TrendingDown className="w-4 h-4 text-red-500" />}
              <span
                className={cn(
                  'text-sm',
                  isPositive && 'text-green-500',
                  isNegative && 'text-red-500',
                  !isPositive && !isNegative && 'text-gray-400'
                )}
              >
                {isPositive && '+'}
                {change}%
              </span>
              {changeLabel && (
                <span className="text-xs text-gray-500">{changeLabel}</span>
              )}
            </div>
          )}
        </div>
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
      </div>
    </div>
  );
};

// ============================================
// Quick Action Card
// ============================================

interface QuickActionProps {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  href: string;
}

const QuickAction: React.FC<QuickActionProps> = ({
  title,
  description,
  icon: Icon,
  color,
  href,
}) => {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 p-4 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 hover:bg-gray-800/50 transition-all"
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon className="w-6 h-6" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">
          {title}
        </p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
    </Link>
  );
};

// ============================================
// Recent Execution Item
// ============================================

interface ExecutionItemProps {
  name: string;
  status: 'success' | 'failed' | 'running';
  time: string;
  duration: string;
  trigger: string;
}

const ExecutionItem: React.FC<ExecutionItemProps> = ({
  name,
  status,
  time,
  duration,
  trigger,
}) => {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-gray-800 last:border-0">
      <div
        className={cn(
          'w-2 h-2 rounded-full',
          status === 'success' && 'bg-green-500',
          status === 'failed' && 'bg-red-500',
          status === 'running' && 'bg-blue-500 animate-pulse'
        )}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{name}</p>
        <p className="text-xs text-gray-500">
          {trigger} • {time}
        </p>
      </div>
      <div className="text-right">
        <p
          className={cn(
            'text-xs font-medium',
            status === 'success' && 'text-green-500',
            status === 'failed' && 'text-red-500',
            status === 'running' && 'text-blue-500'
          )}
        >
          {status === 'running' ? 'Running' : status === 'success' ? 'Success' : 'Failed'}
        </p>
        <p className="text-xs text-gray-500">{duration}</p>
      </div>
    </div>
  );
};

// ============================================
// Active Workflow Item
// ============================================

interface WorkflowItemProps {
  name: string;
  lastRun: string;
  executions: number;
  successRate: number;
}

const WorkflowItem: React.FC<WorkflowItemProps> = ({
  name,
  lastRun,
  executions,
  successRate,
}) => {
  return (
    <Link
      href="#"
      className="flex items-center gap-4 py-3 border-b border-gray-800 last:border-0 hover:bg-gray-800/30 -mx-4 px-4 transition-colors"
    >
      <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
        <Workflow className="w-5 h-5 text-blue-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{name}</p>
        <p className="text-xs text-gray-500">Last run: {lastRun}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium text-white">{executions}</p>
        <p className="text-xs text-gray-500">{successRate}% success</p>
      </div>
    </Link>
  );
};

// ============================================
// Main Dashboard
// ============================================

export default function DashboardPage() {
  // Mock data
  const stats = [
    { title: 'Total Workflows', value: 24, change: 12, changeLabel: 'vs last month', icon: Workflow, color: '#3B82F6' },
    { title: 'Executions Today', value: 1247, change: 8, changeLabel: 'vs yesterday', icon: Play, color: '#10B981' },
    { title: 'Success Rate', value: '98.5%', change: 2.3, changeLabel: 'vs last week', icon: CheckCircle2, color: '#8B5CF6' },
    { title: 'Active AI Agents', value: 8, change: -5, changeLabel: 'vs last week', icon: Bot, color: '#EC4899' },
  ];

  const quickActions = [
    { title: 'Create Workflow', description: 'Build a new automation', icon: Plus, color: '#3B82F6', href: '/workflows/new' },
    { title: 'Browse Templates', description: 'Start from a template', icon: FileText, color: '#10B981', href: '/templates' },
    { title: 'New AI Agent', description: 'Create an AI assistant', icon: Bot, color: '#8B5CF6', href: '/agents/new' },
    { title: 'View Analytics', description: 'Check your metrics', icon: BarChart3, color: '#F59E0B', href: '/analytics' },
  ];

  const recentExecutions = [
    { name: 'Email Marketing Campaign', status: 'success' as const, time: '2 min ago', duration: '45s', trigger: 'Schedule' },
    { name: 'Lead Scoring Pipeline', status: 'running' as const, time: 'Just now', duration: '12s', trigger: 'Webhook' },
    { name: 'Data Sync - Salesforce', status: 'failed' as const, time: '15 min ago', duration: '1m 23s', trigger: 'Manual' },
    { name: 'Slack Notifications', status: 'success' as const, time: '1 hour ago', duration: '2s', trigger: 'App Event' },
    { name: 'Customer Onboarding', status: 'success' as const, time: '2 hours ago', duration: '3m 12s', trigger: 'Webhook' },
  ];

  const activeWorkflows = [
    { name: 'Email Marketing Campaign', lastRun: '2 min ago', executions: 1247, successRate: 99 },
    { name: 'Lead Scoring Pipeline', lastRun: 'Just now', executions: 892, successRate: 97 },
    { name: 'Customer Onboarding', lastRun: '2 hours ago', executions: 456, successRate: 100 },
    { name: 'Data Backup - Daily', lastRun: '6 hours ago', executions: 365, successRate: 100 },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Welcome back, John! 👋</h1>
          <p className="text-gray-400 mt-1">Here's what's happening with your workflows today.</p>
        </div>
        <Link
          href="/workflows/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Workflow
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Executions */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl">
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold text-white">Recent Executions</h2>
            <Link
              href="/executions"
              className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="p-4">
            {recentExecutions.map((execution, idx) => (
              <ExecutionItem key={idx} {...execution} />
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Quick Actions</h2>
          {quickActions.map((action) => (
            <QuickAction key={action.title} {...action} />
          ))}
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Workflows */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl">
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold text-white">Active Workflows</h2>
            <Link
              href="/workflows"
              className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="p-4">
            {activeWorkflows.map((workflow, idx) => (
              <WorkflowItem key={idx} {...workflow} />
            ))}
          </div>
        </div>

        {/* System Status */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl">
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold text-white">System Status</h2>
            <span className="flex items-center gap-2 text-sm text-green-500">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              All systems operational
            </span>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-300">API</span>
              </div>
              <span className="text-sm text-green-500">Operational</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-300">Workflow Engine</span>
              </div>
              <span className="text-sm text-green-500">Operational</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Bot className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-300">AI Services</span>
              </div>
              <span className="text-sm text-green-500">Operational</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-300">Connectors</span>
              </div>
              <span className="text-sm text-green-500">Operational</span>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Alert */}
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-xl p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-6 h-6 text-blue-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-white">You've used 80% of your monthly executions</p>
          <p className="text-xs text-gray-400 mt-1">Upgrade to Pro for unlimited executions and more features.</p>
        </div>
        <Link
          href="/pricing"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Upgrade Now
        </Link>
      </div>
    </div>
  );
}
