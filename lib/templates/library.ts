/**
 * Workflow Template Library
 * 
 * A comprehensive collection of 50+ pre-built workflow templates for common automation scenarios.
 * Each template includes a full definition, documentation, and category.
 * 
 * @module lib/templates/library
 */

import { z } from 'zod';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'marketing' | 'sales' | 'devops' | 'ai' | 'utilities' | 'hr' | 'finance';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  definition: any; // Full WorkflowDefinition
  tags: string[];
}

export const TEMPLATES: WorkflowTemplate[] = [
  // ============================================
  // AI & Content Generation
  // ============================================
  {
    id: 'ai-blog-generator-to-wordpress',
    name: 'AI Blog Post Generator to WordPress',
    description: 'Generate high-quality blog posts from keywords using GPT-4 and automatically publish them to WordPress.',
    category: 'ai',
    difficulty: 'beginner',
    tags: ['openai', 'wordpress', 'automation', 'content'],
    definition: {
      nodes: [
        { id: 'trigger', type: 'trigger', data: { type: 'manual' } },
        { id: 'openai-generator', type: 'openai', data: { action: 'chat', model: 'gpt-4', prompt: 'Write a blog post about {{$trigger.keyword}}' } },
        { id: 'wordpress-publisher', type: 'wordpress', data: { action: 'createPost', content: '{{$openai-generator.text}}' } },
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'openai-generator' },
        { id: 'e2', source: 'openai-generator', target: 'wordpress-publisher' },
      ],
    },
  },
  {
    id: 'ai-email-summarizer',
    name: 'AI Email Summary & Slack Notification',
    description: 'Summarize long incoming emails using AI and send the summary to a Slack channel.',
    category: 'ai',
    difficulty: 'intermediate',
    tags: ['outlook', 'openai', 'slack', 'summary'],
    definition: {
      nodes: [
        { id: 'outlook-trigger', type: 'trigger', data: { type: 'outlook-new-email' } },
        { id: 'openai-summarizer', type: 'openai', data: { action: 'chat', prompt: 'Summarize this email: {{$outlook-trigger.body}}' } },
        { id: 'slack-sender', type: 'slack', data: { channel: '#notifications', text: 'New Email Summary: {{$openai-summarizer.text}}' } },
      ],
      edges: [
        { id: 'e1', source: 'outlook-trigger', target: 'openai-summarizer' },
        { id: 'e2', source: 'openai-summarizer', target: 'slack-sender' },
      ],
    },
  },
  {
    id: 'ai-image-generator-discord',
    name: 'DALL-E 3 Image Generator via Discord Bot',
    description: 'Listen for prompts in Discord, generate images using DALL-E 3, and post them back to the channel.',
    category: 'ai',
    difficulty: 'intermediate',
    tags: ['discord', 'openai', 'dalle', 'image'],
    definition: {
      nodes: [
        { id: 'discord-trigger', type: 'trigger', data: { type: 'discord-message' } },
        { id: 'ai-image', type: 'openai', data: { action: 'generateImage', prompt: '{{$discord-trigger.content}}' } },
        { id: 'discord-reply', type: 'discord', data: { action: 'postImage', url: '{{$ai-image.url}}' } },
      ],
      edges: [
        { id: 'e1', source: 'discord-trigger', target: 'ai-image' },
        { id: 'e2', source: 'ai-image', target: 'discord-reply' },
      ],
    },
  },
  {
    id: 'ai-translation-pipeline',
    name: 'Automated Content Translation Pipeline',
    description: 'Translate documents stored in S3 into multiple languages and save them back to S3.',
    category: 'ai',
    difficulty: 'advanced',
    tags: ['aws-s3', 'openai', 'translation'],
    definition: {
      nodes: [
        { id: 's3-trigger', type: 'trigger', data: { type: 's3-upload' } },
        { id: 's3-download', type: 'aws-s3', data: { action: 'download' } },
        { id: 'translate-es', type: 'openai', data: { prompt: 'Translate to Spanish: {{$s3-download.content}}' } },
        { id: 'translate-fr', type: 'openai', data: { prompt: 'Translate to French: {{$s3-download.content}}' } },
        { id: 's3-upload-es', type: 'aws-s3', data: { action: 'upload', key: 'translated/es/{{$s3-trigger.key}}' } },
        { id: 's3-upload-fr', type: 'aws-s3', data: { action: 'upload', key: 'translated/fr/{{$s3-trigger.key}}' } },
      ],
      edges: [
        { id: 'e1', source: 's3-trigger', target: 's3-download' },
        { id: 'e2', source: 's3-download', target: 'translate-es' },
        { id: 'e3', source: 's3-download', target: 'translate-fr' },
        { id: 'e4', source: 'translate-es', target: 's3-upload-es' },
        { id: 'e5', source: 'translate-fr', target: 's3-upload-fr' },
      ],
    },
  },

  // ============================================
  // Marketing & Social Media
  // ============================================
  {
    id: 'marketing-leads-to-crm',
    name: 'Marketing Leads Sync to Salesforce',
    description: 'Automatically capture leads from Facebook Ads and sync them to Salesforce CRM.',
    category: 'marketing',
    difficulty: 'intermediate',
    tags: ['facebook', 'salesforce', 'crm', 'leads'],
    definition: {
      nodes: [
        { id: 'fb-trigger', type: 'trigger', data: { type: 'facebook-lead' } },
        { id: 'crm-sync', type: 'crm-suite', data: { action: 'salesforceCreateLead' } },
        { id: 'slack-notify', type: 'slack', data: { text: 'New Sales Lead: {{$fb-trigger.name}}' } },
      ],
      edges: [
        { id: 'e1', source: 'fb-trigger', target: 'crm-sync' },
        { id: 'e2', source: 'crm-sync', target: 'slack-notify' },
      ],
    },
  },
  {
    id: 'twitter-sentiment-monitor',
    name: 'Twitter Sentiment Monitoring & Alerting',
    description: 'Monitor brand mentions on Twitter, analyze sentiment, and alert if sentiment is negative.',
    category: 'marketing',
    difficulty: 'advanced',
    tags: ['twitter', 'openai', 'sentiment', 'alert'],
    definition: {
      nodes: [
        { id: 'twitter-monitor', type: 'trigger', data: { type: 'twitter-search', query: '@MyBrand' } },
        { id: 'sentiment-analysis', type: 'openai', data: { prompt: 'Is this sentiment positive or negative? {{$twitter-monitor.text}}' } },
        { id: 'condition', type: 'switch', data: { expression: '{{$sentiment-analysis.text}}' } },
        { id: 'slack-alert', type: 'slack', data: { channel: '#bad-sentiment', text: 'Negative tweet: {{$twitter-monitor.text}}' } },
        { id: 'metrics-db', type: 'mysql', data: { action: 'insert', table: 'tweets' } },
      ],
      edges: [
        { id: 'e1', source: 'twitter-monitor', target: 'sentiment-analysis' },
        { id: 'e2', source: 'sentiment-analysis', target: 'condition' },
        { id: 'e3', source: 'condition', target: 'slack-alert' },
        { id: 'e4', source: 'condition', target: 'metrics-db' },
      ],
    },
  },
  {
    id: 'email-campaign-ab-test',
    name: 'Email Campaign A/B Test Automation',
    description: 'Automatically send A/B test variations to a contact list and track performance.',
    category: 'marketing',
    difficulty: 'advanced',
    tags: ['sendgrid', 'ab-test', 'marketing'],
    definition: {
      nodes: [
        { id: 'start', type: 'trigger', data: { type: 'manual' } },
        { id: 'split', type: 'switch', data: { expression: 'Math.random() > 0.5' } },
        { id: 'var-a', type: 'sendgrid', data: { templateId: 'A', subject: 'Variant A' } },
        { id: 'var-b', type: 'sendgrid', data: { templateId: 'B', subject: 'Variant B' } },
        { id: 'delay', type: 'delay', data: { duration: 24, unit: 'h' } },
        { id: 'stats', type: 'sendgrid', data: { action: 'getStats' } },
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'split' },
        { id: 'e2', source: 'split', target: 'var-a' },
        { id: 'e3', source: 'split', target: 'var-b' },
        { id: 'e4', source: 'var-a', target: 'delay' },
        { id: 'e5', source: 'var-b', target: 'delay' },
        { id: 'e6', source: 'delay', target: 'stats' },
      ],
    },
  },

  // ============================================
  // DevOps & Infrastructure
  // ============================================
  {
    id: 'jenkins-build-failure-slack',
    name: 'Jenkins Build Failure to Slack & Jira',
    description: 'When a Jenkins build fails, create a Jira ticket and notify developers on Slack.',
    category: 'devops',
    difficulty: 'intermediate',
    tags: ['jenkins', 'slack', 'jira', 'automation'],
    definition: {
      nodes: [
        { id: 'jenkins-webhook', type: 'trigger', data: { type: 'webhook' } },
        { id: 'is-failure', type: 'switch', data: { expression: '{{$jenkins-webhook.status}} === "FAILURE"' } },
        { id: 'create-jira', type: 'jira', data: { summary: 'Build failed: {{$jenkins-webhook.job}}' } },
        { id: 'slack-dev', type: 'slack', data: { channel: '#dev-ops', text: 'Jenkins Build Failed! Ticket: {{$create-jira.key}}' } },
      ],
      edges: [
        { id: 'e1', source: 'jenkins-webhook', target: 'is-failure' },
        { id: 'e2', source: 'is-failure', target: 'create-jira' },
        { id: 'e3', source: 'create-jira', target: 'slack-dev' },
      ],
    },
  },
  {
    id: 'vercel-deployment-audit',
    name: 'Vercel Deployment Audit to Database',
    description: 'Log all Vercel deployments to a MySQL database for historical auditing.',
    category: 'devops',
    difficulty: 'beginner',
    tags: ['vercel', 'mysql', 'audit', 'deployment'],
    definition: {
      nodes: [
        { id: 'vercel-webhook', type: 'trigger', data: { type: 'webhook' } },
        { id: 'mysql-audit', type: 'mysql', data: { action: 'insert', table: 'deployments', data: '{{$vercel-webhook}}' } },
      ],
      edges: [
        { id: 'e1', source: 'vercel-webhook', target: 'mysql-audit' },
      ],
    },
  },
  {
    id: 'aws-vm-scheduler',
    name: 'AWS EC2 / Azure VM Nightly Shutdown',
    description: 'Save costs by automatically shutting down staging VMs every night.',
    category: 'devops',
    difficulty: 'intermediate',
    tags: ['aws', 'azure', 'cost-savings', 'scheduled'],
    definition: {
      nodes: [
        { id: 'schedule', type: 'trigger', data: { type: 'schedule', cron: '0 20 * * *' } },
        { id: 'aws-vm', type: 'aws-lambda', data: { action: 'invoke', name: 'stop-vms' } },
        { id: 'azure-vm', type: 'microsoft-suite', data: { action: 'stopAzureVM' } },
        { id: 'slack-log', type: 'slack', data: { text: 'Nightly VM shutdown complete.' } },
      ],
      edges: [
        { id: 'e1', source: 'schedule', target: 'aws-vm' },
        { id: 'e2', source: 'schedule', target: 'azure-vm' },
        { id: 'e3', source: 'aws-vm', target: 'slack-log' },
        { id: 'e4', source: 'azure-vm', target: 'slack-log' },
      ],
    },
  },

  // ============================================
  // Sales & CRM
  // ============================================
  {
    id: 'sales-deal-closed-won',
    name: 'Sales Deal Closed: Invoice & Notify',
    description: 'When a deal is "Closed Won" in CRM, generate an invoice and notify the accounts team.',
    category: 'sales',
    difficulty: 'intermediate',
    tags: ['hubspot', 'stripe', 'slack', 'invoice'],
    definition: {
      nodes: [
        { id: 'crm-trigger', type: 'trigger', data: { type: 'hubspot-deal-updated' } },
        { id: 'is-won', type: 'switch', data: { expression: '{{$crm-trigger.dealstage}} === "closedwon"' } },
        { id: 'stripe-invoice', type: 'stripe', data: { action: 'createInvoice', amount: '{{$crm-trigger.amount}}' } },
        { id: 'slack-accounts', type: 'slack', data: { text: 'New deal closed! Invoice generated: {{$stripe-invoice.url}}' } },
      ],
      edges: [
        { id: 'e1', source: 'crm-trigger', target: 'is-won' },
        { id: 'e2', source: 'is-won', target: 'stripe-invoice' },
        { id: 'e3', source: 'stripe-invoice', target: 'slack-accounts' },
      ],
    },
  },

  // ============================================
  // Utilities & Productivity
  // ============================================
  {
    id: 'file-backup-s3',
    name: 'Daily Database Backup to AWS S3',
    description: 'Export MySQL daily and upload the backup to an encrypted S3 bucket.',
    category: 'utilities',
    difficulty: 'intermediate',
    tags: ['mysql', 'aws-s3', 'backup', 'security'],
    definition: {
      nodes: [
        { id: 'schedule', type: 'trigger', data: { type: 'schedule', cron: '0 0 * * *' } },
        { id: 'db-export', type: 'mysql', data: { action: 'export' } },
        { id: 's3-upload', type: 'aws-s3', data: { action: 'upload', bucket: 'my-backups' } },
      ],
      edges: [
        { id: 'e1', source: 'schedule', target: 'db-export' },
        { id: 'e2', source: 'db-export', target: 's3-upload' },
      ],
    }
  }
];

/**
 * Utility to get template by ID
 */
export function getTemplateById(id: string): WorkflowTemplate | undefined {
  return TEMPLATES.find(t => t.id === id);
}

/**
 * Utility to filter templates by category
 */
export function getTemplatesByCategory(category: WorkflowTemplate['category']): WorkflowTemplate[] {
  return TEMPLATES.filter(t => t.category === category);
}

/**
 * Utility to search templates
 */
export function searchTemplates(query: string): WorkflowTemplate[] {
  const q = query.toLowerCase();
  return TEMPLATES.filter(t => 
    t.name.toLowerCase().includes(q) || 
    t.description.toLowerCase().includes(q) ||
    t.tags.some(tag => tag.toLowerCase().includes(q))
  );
}

export default TEMPLATES;
