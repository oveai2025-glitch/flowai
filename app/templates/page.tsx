/**
 * FlowAtGenAi - Templates Page
 * 
 * Browse and use pre-built workflow templates.
 * 
 * @module app/templates/page
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  Star,
  Clock,
  Users,
  ArrowRight,
  Mail,
  MessageSquare,
  Database,
  Zap,
  Bot,
  BarChart3,
  ShoppingCart,
  FileText,
  Globe,
  Calendar,
  CreditCard,
  Briefcase,
  Heart,
  TrendingUp,
} from 'lucide-react';
import { cn } from '../../lib/utils';

// ============================================
// Types
// ============================================

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ElementType;
  color: string;
  popularity: number;
  useCount: number;
  estimatedTime: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  connectors: string[];
  featured?: boolean;
}

// ============================================
// Mock Data
// ============================================

const categories = [
  { id: 'all', name: 'All Templates', icon: Zap },
  { id: 'marketing', name: 'Marketing', icon: TrendingUp },
  { id: 'sales', name: 'Sales & CRM', icon: Briefcase },
  { id: 'productivity', name: 'Productivity', icon: Clock },
  { id: 'ai', name: 'AI & Automation', icon: Bot },
  { id: 'ecommerce', name: 'E-commerce', icon: ShoppingCart },
  { id: 'communication', name: 'Communication', icon: MessageSquare },
  { id: 'data', name: 'Data & Analytics', icon: Database },
];

const templates: Template[] = [
  {
    id: '1',
    name: 'Email Marketing Automation',
    description: 'Automatically send personalized emails based on user behavior and engagement',
    category: 'marketing',
    icon: Mail,
    color: '#EF4444',
    popularity: 98,
    useCount: 15420,
    estimatedTime: '15 min',
    difficulty: 'beginner',
    tags: ['email', 'marketing', 'automation'],
    connectors: ['Mailchimp', 'HubSpot', 'Slack'],
    featured: true,
  },
  {
    id: '2',
    name: 'Lead Scoring with AI',
    description: 'Use AI to automatically score and qualify leads based on their profile and behavior',
    category: 'sales',
    icon: Bot,
    color: '#8B5CF6',
    popularity: 95,
    useCount: 8920,
    estimatedTime: '20 min',
    difficulty: 'intermediate',
    tags: ['ai', 'sales', 'lead-scoring'],
    connectors: ['Salesforce', 'OpenAI', 'Slack'],
    featured: true,
  },
  {
    id: '3',
    name: 'Slack Notifications Hub',
    description: 'Centralize all your app notifications in Slack channels',
    category: 'communication',
    icon: MessageSquare,
    color: '#4A154B',
    popularity: 92,
    useCount: 12300,
    estimatedTime: '10 min',
    difficulty: 'beginner',
    tags: ['slack', 'notifications', 'integration'],
    connectors: ['Slack', 'GitHub', 'Jira'],
    featured: true,
  },
  {
    id: '4',
    name: 'Customer Onboarding Sequence',
    description: 'Automated onboarding flow for new customers with emails and tasks',
    category: 'sales',
    icon: Users,
    color: '#10B981',
    popularity: 89,
    useCount: 6540,
    estimatedTime: '25 min',
    difficulty: 'intermediate',
    tags: ['onboarding', 'email', 'customer-success'],
    connectors: ['HubSpot', 'SendGrid', 'Slack'],
  },
  {
    id: '5',
    name: 'E-commerce Order Processing',
    description: 'Automate order processing, inventory updates, and customer notifications',
    category: 'ecommerce',
    icon: ShoppingCart,
    color: '#F59E0B',
    popularity: 87,
    useCount: 4230,
    estimatedTime: '30 min',
    difficulty: 'advanced',
    tags: ['ecommerce', 'orders', 'inventory'],
    connectors: ['Shopify', 'Stripe', 'SendGrid'],
  },
  {
    id: '6',
    name: 'AI Content Generator',
    description: 'Generate blog posts, social media content, and marketing copy with AI',
    category: 'ai',
    icon: FileText,
    color: '#EC4899',
    popularity: 94,
    useCount: 9870,
    estimatedTime: '15 min',
    difficulty: 'beginner',
    tags: ['ai', 'content', 'marketing'],
    connectors: ['OpenAI', 'Notion', 'WordPress'],
    featured: true,
  },
  {
    id: '7',
    name: 'Data Sync Pipeline',
    description: 'Keep your databases and apps in sync with automated data synchronization',
    category: 'data',
    icon: Database,
    color: '#3B82F6',
    popularity: 85,
    useCount: 5670,
    estimatedTime: '20 min',
    difficulty: 'intermediate',
    tags: ['data', 'sync', 'database'],
    connectors: ['PostgreSQL', 'Airtable', 'Google Sheets'],
  },
  {
    id: '8',
    name: 'Meeting Scheduler',
    description: 'Automatically schedule meetings and send reminders to participants',
    category: 'productivity',
    icon: Calendar,
    color: '#06B6D4',
    popularity: 82,
    useCount: 3890,
    estimatedTime: '15 min',
    difficulty: 'beginner',
    tags: ['calendar', 'meetings', 'scheduling'],
    connectors: ['Google Calendar', 'Zoom', 'Slack'],
  },
  {
    id: '9',
    name: 'Invoice Processing with AI',
    description: 'Extract data from invoices automatically using AI and update your accounting',
    category: 'ai',
    icon: CreditCard,
    color: '#6366F1',
    popularity: 88,
    useCount: 4560,
    estimatedTime: '25 min',
    difficulty: 'intermediate',
    tags: ['ai', 'finance', 'invoices'],
    connectors: ['OpenAI', 'QuickBooks', 'Google Drive'],
  },
  {
    id: '10',
    name: 'Social Media Scheduler',
    description: 'Schedule and publish posts across multiple social media platforms',
    category: 'marketing',
    icon: Globe,
    color: '#F97316',
    popularity: 86,
    useCount: 7230,
    estimatedTime: '20 min',
    difficulty: 'beginner',
    tags: ['social-media', 'marketing', 'scheduling'],
    connectors: ['Twitter', 'LinkedIn', 'Buffer'],
  },
  {
    id: '11',
    name: 'Customer Feedback Analysis',
    description: 'Analyze customer feedback with AI sentiment analysis and categorization',
    category: 'ai',
    icon: Heart,
    color: '#EF4444',
    popularity: 84,
    useCount: 3210,
    estimatedTime: '20 min',
    difficulty: 'intermediate',
    tags: ['ai', 'feedback', 'sentiment'],
    connectors: ['OpenAI', 'Typeform', 'Slack'],
  },
  {
    id: '12',
    name: 'Sales Pipeline Automation',
    description: 'Automate your sales pipeline with deal tracking and follow-up reminders',
    category: 'sales',
    icon: BarChart3,
    color: '#10B981',
    popularity: 91,
    useCount: 6890,
    estimatedTime: '30 min',
    difficulty: 'advanced',
    tags: ['sales', 'crm', 'automation'],
    connectors: ['Salesforce', 'HubSpot', 'Slack'],
  },
];

// ============================================
// Template Card
// ============================================

interface TemplateCardProps {
  template: Template;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template }) => {
  const Icon = template.icon;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 hover:shadow-lg transition-all group">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${template.color}20` }}
        >
          <Icon className="w-6 h-6" style={{ color: template.color }} />
        </div>
        {template.featured && (
          <span className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-full">
            <Star className="w-3 h-3 fill-current" />
            Featured
          </span>
        )}
      </div>

      {/* Content */}
      <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
        {template.name}
      </h3>
      <p className="text-sm text-gray-400 mb-4 line-clamp-2">{template.description}</p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mb-4">
        {template.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="text-xs px-2 py-0.5 bg-gray-800 text-gray-400 rounded"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Connectors */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-gray-500">Uses:</span>
        <div className="flex items-center gap-1">
          {template.connectors.slice(0, 3).map((connector) => (
            <span
              key={connector}
              className="text-xs px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded"
            >
              {connector}
            </span>
          ))}
          {template.connectors.length > 3 && (
            <span className="text-xs text-gray-500">
              +{template.connectors.length - 3}
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-800">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {template.useCount.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {template.estimatedTime}
          </span>
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-xs',
              template.difficulty === 'beginner' && 'bg-green-600/20 text-green-400',
              template.difficulty === 'intermediate' && 'bg-yellow-600/20 text-yellow-400',
              template.difficulty === 'advanced' && 'bg-red-600/20 text-red-400'
            )}
          >
            {template.difficulty}
          </span>
        </div>
        <Link
          href={`/templates/${template.id}/use`}
          className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 font-medium"
        >
          Use <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};

// ============================================
// Main Page
// ============================================

export default function TemplatesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredTemplates = templates.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredTemplates = filteredTemplates.filter((t) => t.featured);
  const regularTemplates = filteredTemplates.filter((t) => !t.featured);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Workflow Templates</h1>
        <p className="text-gray-400 mt-1">
          Get started quickly with pre-built templates for common use cases
        </p>
      </div>

      {/* Search and Categories */}
      <div className="flex flex-col lg:flex-row gap-6 mb-8">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {categories.map((category) => {
            const Icon = category.icon;
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
              </button>
            );
          })}
        </div>
      </div>

      {/* Featured Section */}
      {featuredTemplates.length > 0 && selectedCategory === 'all' && !searchQuery && (
        <div className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400 fill-current" />
            Featured Templates
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {featuredTemplates.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        </div>
      )}

      {/* All Templates */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">
          {selectedCategory === 'all' ? 'All Templates' : categories.find((c) => c.id === selectedCategory)?.name}
          <span className="text-gray-500 font-normal ml-2">
            ({filteredTemplates.length})
          </span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {(selectedCategory === 'all' && !searchQuery ? regularTemplates : filteredTemplates).map(
            (template) => (
              <TemplateCard key={template.id} template={template} />
            )
          )}
        </div>
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
            <FileText className="w-8 h-8 text-gray-600" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No templates found</h3>
          <p className="text-gray-500">Try adjusting your search or browse all categories</p>
        </div>
      )}

      {/* Request Template CTA */}
      <div className="mt-12 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-xl p-6 text-center">
        <h3 className="text-lg font-semibold text-white mb-2">
          Can't find what you're looking for?
        </h3>
        <p className="text-gray-400 mb-4">
          Request a new template and we'll build it for you
        </p>
        <button className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
          Request Template
        </button>
      </div>
    </div>
  );
}
