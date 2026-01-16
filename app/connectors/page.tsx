/**
 * FlowAtGenAi - Connectors Page
 * 
 * Browse and install available connectors/integrations.
 * 
 * @module app/connectors/page
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  CheckCircle2,
  Plus,
  ExternalLink,
  Star,
  Download,
  MessageCircle,
  Database,
  Mail,
  CreditCard,
  Globe,
  Bot,
  FileText,
  Github,
  Calendar,
  BarChart3,
  ShoppingCart,
  Briefcase,
  Phone,
  Cloud,
  Lock,
  Zap,
  FileSpreadsheet,
} from 'lucide-react';
import { cn } from '../../lib/utils';

// ============================================
// Types
// ============================================

interface Connector {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ElementType;
  color: string;
  installed: boolean;
  official: boolean;
  actionsCount: number;
  triggersCount: number;
  rating: number;
  installs: number;
  authType: string;
  tags: string[];
}

// ============================================
// Mock Data
// ============================================

const categories = [
  { id: 'all', name: 'All', icon: Zap },
  { id: 'communication', name: 'Communication', icon: MessageCircle },
  { id: 'crm', name: 'CRM & Sales', icon: Briefcase },
  { id: 'database', name: 'Database', icon: Database },
  { id: 'ai', name: 'AI & ML', icon: Bot },
  { id: 'productivity', name: 'Productivity', icon: Calendar },
  { id: 'ecommerce', name: 'E-commerce', icon: ShoppingCart },
  { id: 'payment', name: 'Payment', icon: CreditCard },
  { id: 'developer', name: 'Developer', icon: Github },
  { id: 'marketing', name: 'Marketing', icon: Mail },
];

const connectors: Connector[] = [
  {
    id: 'slack',
    name: 'Slack',
    description: 'Send messages, manage channels, and automate Slack workflows',
    category: 'communication',
    icon: MessageCircle,
    color: '#4A154B',
    installed: true,
    official: true,
    actionsCount: 15,
    triggersCount: 5,
    rating: 4.9,
    installs: 15420,
    authType: 'OAuth 2.0',
    tags: ['messaging', 'notifications', 'team'],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'Access GPT models, DALL-E, Whisper, and embeddings',
    category: 'ai',
    icon: Bot,
    color: '#10A37F',
    installed: true,
    official: true,
    actionsCount: 12,
    triggersCount: 0,
    rating: 4.8,
    installs: 28930,
    authType: 'API Key',
    tags: ['ai', 'gpt', 'llm', 'chat'],
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Manage contacts, companies, deals, and marketing campaigns',
    category: 'crm',
    icon: Globe,
    color: '#FF7A59',
    installed: true,
    official: true,
    actionsCount: 25,
    triggersCount: 8,
    rating: 4.7,
    installs: 12340,
    authType: 'OAuth 2.0',
    tags: ['crm', 'marketing', 'sales'],
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Process payments, manage subscriptions, and handle invoices',
    category: 'payment',
    icon: CreditCard,
    color: '#635BFF',
    installed: true,
    official: true,
    actionsCount: 18,
    triggersCount: 6,
    rating: 4.9,
    installs: 18760,
    authType: 'API Key',
    tags: ['payment', 'subscription', 'billing'],
  },
  {
    id: 'postgres',
    name: 'PostgreSQL',
    description: 'Query databases, insert data, and manage schemas',
    category: 'database',
    icon: Database,
    color: '#336791',
    installed: true,
    official: true,
    actionsCount: 8,
    triggersCount: 1,
    rating: 4.8,
    installs: 9870,
    authType: 'Basic Auth',
    tags: ['database', 'sql', 'data'],
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Manage repositories, issues, pull requests, and workflows',
    category: 'developer',
    icon: Github,
    color: '#24292F',
    installed: false,
    official: true,
    actionsCount: 20,
    triggersCount: 10,
    rating: 4.9,
    installs: 21340,
    authType: 'OAuth 2.0',
    tags: ['git', 'code', 'devops'],
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Create pages, manage databases, and sync content',
    category: 'productivity',
    icon: FileText,
    color: '#000000',
    installed: true,
    official: true,
    actionsCount: 14,
    triggersCount: 3,
    rating: 4.7,
    installs: 14560,
    authType: 'API Key',
    tags: ['notes', 'database', 'wiki'],
  },
  {
    id: 'shopify',
    name: 'Shopify',
    description: 'Manage products, orders, customers, and inventory',
    category: 'ecommerce',
    icon: ShoppingCart,
    color: '#96BF48',
    installed: false,
    official: true,
    actionsCount: 22,
    triggersCount: 8,
    rating: 4.8,
    installs: 11230,
    authType: 'OAuth 2.0',
    tags: ['ecommerce', 'orders', 'products'],
  },
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    description: 'Read, write, and manipulate spreadsheet data',
    category: 'productivity',
    icon: FileSpreadsheet,
    color: '#34A853',
    installed: false,
    official: true,
    actionsCount: 12,
    triggersCount: 2,
    rating: 4.8,
    installs: 25670,
    authType: 'OAuth 2.0',
    tags: ['spreadsheet', 'data', 'google'],
  },
  {
    id: 'twilio',
    name: 'Twilio',
    description: 'Send SMS, make calls, and manage WhatsApp messages',
    category: 'communication',
    icon: Phone,
    color: '#F22F46',
    installed: false,
    official: true,
    actionsCount: 10,
    triggersCount: 4,
    rating: 4.7,
    installs: 8920,
    authType: 'Basic Auth',
    tags: ['sms', 'voice', 'whatsapp'],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Access Claude models for AI conversations and analysis',
    category: 'ai',
    icon: Bot,
    color: '#D4A574',
    installed: false,
    official: true,
    actionsCount: 5,
    triggersCount: 0,
    rating: 4.9,
    installs: 12450,
    authType: 'API Key',
    tags: ['ai', 'claude', 'llm'],
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'Manage leads, contacts, opportunities, and custom objects',
    category: 'crm',
    icon: Cloud,
    color: '#00A1E0',
    installed: false,
    official: true,
    actionsCount: 30,
    triggersCount: 12,
    rating: 4.6,
    installs: 9870,
    authType: 'OAuth 2.0',
    tags: ['crm', 'sales', 'enterprise'],
  },
  {
    id: 'jira',
    name: 'Jira',
    description: 'Create issues, manage projects, and track sprints',
    category: 'productivity',
    icon: Briefcase,
    color: '#0052CC',
    installed: false,
    official: true,
    actionsCount: 18,
    triggersCount: 6,
    rating: 4.7,
    installs: 15670,
    authType: 'OAuth 2.0',
    tags: ['project', 'agile', 'tickets'],
  },
  {
    id: 'airtable',
    name: 'Airtable',
    description: 'Manage bases, tables, and records with full API access',
    category: 'database',
    icon: Database,
    color: '#18BFFF',
    installed: false,
    official: true,
    actionsCount: 10,
    triggersCount: 2,
    rating: 4.8,
    installs: 13450,
    authType: 'API Key',
    tags: ['database', 'spreadsheet', 'no-code'],
  },
  {
    id: 'sendgrid',
    name: 'SendGrid',
    description: 'Send transactional and marketing emails at scale',
    category: 'marketing',
    icon: Mail,
    color: '#1A82E2',
    installed: false,
    official: true,
    actionsCount: 8,
    triggersCount: 3,
    rating: 4.7,
    installs: 11230,
    authType: 'API Key',
    tags: ['email', 'marketing', 'transactional'],
  },
  {
    id: 'discord',
    name: 'Discord',
    description: 'Send messages, manage servers, and interact with webhooks',
    category: 'communication',
    icon: MessageCircle,
    color: '#5865F2',
    installed: false,
    official: true,
    actionsCount: 12,
    triggersCount: 5,
    rating: 4.8,
    installs: 19870,
    authType: 'OAuth 2.0',
    tags: ['chat', 'gaming', 'community'],
  },
];

// ============================================
// Connector Card
// ============================================

interface ConnectorCardProps {
  connector: Connector;
  onInstall: (id: string) => void;
}

const ConnectorCard: React.FC<ConnectorCardProps> = ({ connector, onInstall }) => {
  const Icon = connector.icon;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 hover:shadow-lg transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${connector.color}20` }}
          >
            <Icon className="w-6 h-6" style={{ color: connector.color }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-white">{connector.name}</h3>
              {connector.official && (
                <CheckCircle2 className="w-4 h-4 text-blue-400" title="Official" />
              )}
            </div>
            <p className="text-xs text-gray-500">{connector.authType}</p>
          </div>
        </div>
        {connector.installed && (
          <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
            Installed
          </span>
        )}
      </div>

      <p className="text-sm text-gray-400 mb-4 line-clamp-2">{connector.description}</p>

      <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
        <span>{connector.actionsCount} actions</span>
        <span>{connector.triggersCount} triggers</span>
        <span className="flex items-center gap-1">
          <Star className="w-3 h-3 text-yellow-400 fill-current" />
          {connector.rating}
        </span>
      </div>

      <div className="flex flex-wrap gap-1 mb-4">
        {connector.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="text-xs px-2 py-0.5 bg-gray-800 text-gray-400 rounded">
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-800">
        <span className="text-xs text-gray-500 flex items-center gap-1">
          <Download className="w-3 h-3" />
          {connector.installs.toLocaleString()} installs
        </span>
        {connector.installed ? (
          <Link
            href={`/connectors/${connector.id}`}
            className="text-sm text-blue-400 hover:text-blue-300 font-medium"
          >
            Configure →
          </Link>
        ) : (
          <button
            onClick={() => onInstall(connector.id)}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Install
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================
// Main Page
// ============================================

export default function ConnectorsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showInstalled, setShowInstalled] = useState(false);
  const [connectorsList, setConnectorsList] = useState(connectors);

  const handleInstall = (id: string) => {
    setConnectorsList((prev) =>
      prev.map((c) => (c.id === id ? { ...c, installed: true } : c))
    );
  };

  const filteredConnectors = connectorsList.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || c.category === selectedCategory;
    const matchesInstalled = !showInstalled || c.installed;
    return matchesSearch && matchesCategory && matchesInstalled;
  });

  const installedCount = connectorsList.filter((c) => c.installed).length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Connectors</h1>
        <p className="text-gray-400 mt-1">
          Connect your favorite apps and services ({installedCount} installed)
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search connectors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <label className="flex items-center gap-2 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg cursor-pointer">
          <input
            type="checkbox"
            checked={showInstalled}
            onChange={(e) => setShowInstalled(e.target.checked)}
            className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-300">Show installed only</span>
        </label>
      </div>

      {/* Categories */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6">
        {categories.map((category) => {
          const Icon = category.icon;
          const count = category.id === 'all'
            ? filteredConnectors.length
            : filteredConnectors.filter((c) => c.category === category.id).length;
          
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                selectedCategory === category.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              )}
            >
              <Icon className="w-4 h-4" />
              {category.name}
              <span className={cn(
                'px-1.5 py-0.5 text-xs rounded',
                selectedCategory === category.id ? 'bg-blue-500' : 'bg-gray-700'
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Connectors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredConnectors.map((connector) => (
          <ConnectorCard
            key={connector.id}
            connector={connector}
            onInstall={handleInstall}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredConnectors.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
            <Zap className="w-8 h-8 text-gray-600" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No connectors found</h3>
          <p className="text-gray-500">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Request Connector CTA */}
      <div className="mt-12 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-xl p-6 text-center">
        <h3 className="text-lg font-semibold text-white mb-2">
          Can't find the connector you need?
        </h3>
        <p className="text-gray-400 mb-4">
          Request a new connector and our team will build it
        </p>
        <button className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
          Request Connector
        </button>
      </div>
    </div>
  );
}
