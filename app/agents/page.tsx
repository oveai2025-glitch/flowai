/**
 * FlowAtGenAi - AI Agents Page
 * 
 * Create and manage autonomous AI agents.
 * 
 * @module app/agents/page
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Plus,
  Bot,
  Play,
  Pause,
  MoreHorizontal,
  Edit,
  Trash2,
  MessageSquare,
  Zap,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Brain,
  Settings,
  ExternalLink,
  Copy,
  BarChart3,
} from 'lucide-react';
import { cn, formatRelativeTime } from '../../lib/utils';

// ============================================
// Types
// ============================================

interface Agent {
  id: string;
  name: string;
  description: string;
  model: string;
  provider: 'openai' | 'anthropic' | 'google';
  status: 'active' | 'paused' | 'error';
  tools: string[];
  totalConversations: number;
  totalTokens: number;
  avgResponseTime: number;
  successRate: number;
  lastActive?: string;
  createdAt: string;
}

// ============================================
// Mock Data
// ============================================

const mockAgents: Agent[] = [
  {
    id: 'agent_1',
    name: 'Customer Support Agent',
    description: 'Handles customer inquiries, processes refunds, and escalates complex issues',
    model: 'gpt-4o',
    provider: 'openai',
    status: 'active',
    tools: ['slack', 'zendesk', 'stripe'],
    totalConversations: 1247,
    totalTokens: 2450000,
    avgResponseTime: 2.3,
    successRate: 94,
    lastActive: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'agent_2',
    name: 'Lead Qualification Agent',
    description: 'Scores and qualifies inbound leads based on conversation and behavior',
    model: 'claude-3-5-sonnet',
    provider: 'anthropic',
    status: 'active',
    tools: ['hubspot', 'slack', 'email'],
    totalConversations: 892,
    totalTokens: 1890000,
    avgResponseTime: 1.8,
    successRate: 97,
    lastActive: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'agent_3',
    name: 'Data Analysis Agent',
    description: 'Analyzes business data and generates insights and reports',
    model: 'gpt-4o',
    provider: 'openai',
    status: 'active',
    tools: ['postgres', 'google-sheets', 'slack'],
    totalConversations: 456,
    totalTokens: 980000,
    avgResponseTime: 4.5,
    successRate: 91,
    lastActive: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'agent_4',
    name: 'Content Writer Agent',
    description: 'Creates blog posts, social media content, and marketing copy',
    model: 'claude-3-5-sonnet',
    provider: 'anthropic',
    status: 'paused',
    tools: ['notion', 'wordpress', 'buffer'],
    totalConversations: 234,
    totalTokens: 1560000,
    avgResponseTime: 8.2,
    successRate: 88,
    lastActive: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'agent_5',
    name: 'Code Review Agent',
    description: 'Reviews pull requests and provides code suggestions',
    model: 'gpt-4o',
    provider: 'openai',
    status: 'error',
    tools: ['github', 'slack'],
    totalConversations: 678,
    totalTokens: 2100000,
    avgResponseTime: 3.1,
    successRate: 85,
    lastActive: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const modelLogos: Record<string, { icon: React.ElementType; color: string }> = {
  openai: { icon: Sparkles, color: '#10A37F' },
  anthropic: { icon: Brain, color: '#D97757' },
  google: { icon: Sparkles, color: '#4285F4' },
};

// ============================================
// Status Badge
// ============================================

const StatusBadge: React.FC<{ status: Agent['status'] }> = ({ status }) => {
  const config = {
    active: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-400/10', label: 'Active' },
    paused: { icon: Pause, color: 'text-yellow-400', bg: 'bg-yellow-400/10', label: 'Paused' },
    error: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-400/10', label: 'Error' },
  };

  const { icon: Icon, color, bg, label } = config[status];

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium', bg, color)}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
};

// ============================================
// Agent Card
// ============================================

interface AgentCardProps {
  agent: Agent;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, onEdit, onDelete, onToggle }) => {
  const [showMenu, setShowMenu] = useState(false);
  const ProviderIcon = modelLogos[agent.provider]?.icon || Sparkles;
  const providerColor = modelLogos[agent.provider]?.color || '#6B7280';

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center">
            <Bot className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{agent.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <ProviderIcon className="w-3 h-3" style={{ color: providerColor }} />
              <span className="text-xs text-gray-500">{agent.model}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={agent.status} />
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
                <div className="absolute right-0 top-full mt-1 w-40 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 py-1">
                  <button
                    onClick={() => { onEdit(agent.id); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700"
                  >
                    <Edit className="w-4 h-4" /> Edit
                  </button>
                  <button
                    onClick={() => { onToggle(agent.id); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700"
                  >
                    {agent.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {agent.status === 'active' ? 'Pause' : 'Resume'}
                  </button>
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700"
                  >
                    <Copy className="w-4 h-4" /> Duplicate
                  </button>
                  <div className="my-1 border-t border-gray-700" />
                  <button
                    onClick={() => { onDelete(agent.id); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-900/30"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-gray-400 mb-4 line-clamp-2">{agent.description}</p>

      {/* Tools */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-gray-500">Tools:</span>
        <div className="flex flex-wrap gap-1">
          {agent.tools.map((tool) => (
            <span key={tool} className="text-xs px-2 py-0.5 bg-gray-800 text-gray-400 rounded capitalize">
              {tool}
            </span>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 bg-gray-800/50 rounded-lg">
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="text-xs">Conversations</span>
          </div>
          <p className="text-lg font-semibold text-white">{agent.totalConversations.toLocaleString()}</p>
        </div>
        <div className="p-3 bg-gray-800/50 rounded-lg">
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="text-xs">Success Rate</span>
          </div>
          <p className="text-lg font-semibold text-white">{agent.successRate}%</p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-800">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          {agent.lastActive ? `Active ${formatRelativeTime(agent.lastActive)}` : 'Never active'}
        </div>
        <Link
          href={`/agents/${agent.id}`}
          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium"
        >
          Configure <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
};

// ============================================
// Main Page
// ============================================

export default function AgentsPage() {
  const [agents, setAgents] = useState(mockAgents);
  const [searchQuery, setSearchQuery] = useState('');

  const handleEdit = (id: string) => {
    console.log('Edit agent:', id);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this agent?')) {
      setAgents((prev) => prev.filter((a) => a.id !== id));
    }
  };

  const handleToggle = (id: string) => {
    setAgents((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, status: a.status === 'active' ? 'paused' : 'active' }
          : a
      ) as Agent[]
    );
  };

  const filteredAgents = agents.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: agents.length,
    active: agents.filter((a) => a.status === 'active').length,
    totalConversations: agents.reduce((sum, a) => sum + a.totalConversations, 0),
    totalTokens: agents.reduce((sum, a) => sum + a.totalTokens, 0),
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bot className="w-7 h-7 text-blue-400" />
            AI Agents
          </h1>
          <p className="text-gray-400 mt-1">Create and manage autonomous AI agents</p>
        </div>
        <Link
          href="/agents/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Agent
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-sm text-gray-400">Total Agents</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-sm text-gray-400">Active</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{stats.active}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-sm text-gray-400">Conversations</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.totalConversations.toLocaleString()}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-sm text-gray-400">Tokens Used</p>
          <p className="text-2xl font-bold text-white mt-1">{(stats.totalTokens / 1000000).toFixed(1)}M</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search agents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAgents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggle={handleToggle}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredAgents.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
            <Bot className="w-8 h-8 text-gray-600" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No agents found</h3>
          <p className="text-gray-500 mb-4">
            {searchQuery ? 'Try adjusting your search' : 'Create your first AI agent'}
          </p>
          {!searchQuery && (
            <Link
              href="/agents/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Agent
            </Link>
          )}
        </div>
      )}

      {/* Info Banner */}
      <div className="mt-8 bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-600/20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">AI Agents are Powerful</h3>
            <p className="text-gray-300 text-sm mb-4">
              AI Agents can autonomously perform tasks, use tools, make decisions, and handle complex workflows.
              They can integrate with any of your connected apps and learn from interactions.
            </p>
            <Link
              href="/docs/agents"
              className="inline-flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 font-medium"
            >
              Learn more about AI Agents <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
