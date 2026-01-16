/**
 * FlowAtGenAi - Jira Connector
 * 
 * Project management integration:
 * - Issues, Projects, Sprints
 * - Comments and attachments
 * - Webhooks for events
 * 
 * @module connectors/jira
 */

import { z } from 'zod';
import { createConnector } from '../packages/connector-sdk/src/builder';
import type { TestConnectionResult } from '../packages/connector-sdk/src/types';

export const jiraConnector = createConnector({
  id: 'jira',
  name: 'Jira',
  version: '1.0.0',
  category: 'productivity',
  description: 'Manage Jira issues, projects, and sprints',
  color: '#0052CC',
  icon: 'https://cdn.flowatgenai.com/connectors/jira.svg',
  tags: ['project-management', 'issues', 'agile', 'atlassian'],
  docsUrl: 'https://developer.atlassian.com/cloud/jira/platform/rest/v3/',
  baseUrl: 'https://api.atlassian.com/ex/jira',
})
  .withOAuth2({
    authorizationUrl: 'https://auth.atlassian.com/authorize',
    tokenUrl: 'https://auth.atlassian.com/oauth/token',
    scopes: ['read:jira-work', 'write:jira-work', 'read:jira-user'],
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'string', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'cloudId', label: 'Cloud ID', type: 'string', required: true, description: 'Your Jira Cloud ID' },
    ],
  })

  // Issue Actions
  .withAction('createIssue', {
    name: 'Create Issue',
    description: 'Create a new Jira issue',
    input: z.object({
      projectKey: z.string().describe('Project key (e.g., PROJ)'),
      issueType: z.string().describe('Issue type (Bug, Task, Story, etc.)'),
      summary: z.string().describe('Issue summary/title'),
      description: z.string().optional(),
      priority: z.enum(['Highest', 'High', 'Medium', 'Low', 'Lowest']).optional(),
      assignee: z.string().optional().describe('Account ID of assignee'),
      labels: z.array(z.string()).optional(),
      components: z.array(z.string()).optional(),
      customFields: z.record(z.unknown()).optional(),
    }),
    output: z.object({
      id: z.string(),
      key: z.string(),
      self: z.string(),
    }),
    execute: async (input, ctx) => {
      const cloudId = ctx.credentials.cloudId as string;
      
      const fields: Record<string, unknown> = {
        project: { key: input.projectKey },
        issuetype: { name: input.issueType },
        summary: input.summary,
      };
      
      if (input.description) {
        fields.description = {
          type: 'doc',
          version: 1,
          content: [{ type: 'paragraph', content: [{ type: 'text', text: input.description }] }],
        };
      }
      if (input.priority) fields.priority = { name: input.priority };
      if (input.assignee) fields.assignee = { accountId: input.assignee };
      if (input.labels) fields.labels = input.labels;
      if (input.components) fields.components = input.components.map((c) => ({ name: c }));
      if (input.customFields) Object.assign(fields, input.customFields);

      const response = await ctx.http.post(`/${cloudId}/rest/api/3/issue`, { fields });
      return response.data as Record<string, unknown>;
    },
  })

  .withAction('getIssue', {
    name: 'Get Issue',
    description: 'Get issue details by key or ID',
    input: z.object({
      issueIdOrKey: z.string(),
      fields: z.array(z.string()).optional(),
      expand: z.array(z.string()).optional(),
    }),
    output: z.object({
      id: z.string(),
      key: z.string(),
      fields: z.record(z.unknown()),
    }),
    execute: async (input, ctx) => {
      const cloudId = ctx.credentials.cloudId as string;
      const params: Record<string, string> = {};
      if (input.fields) params.fields = input.fields.join(',');
      if (input.expand) params.expand = input.expand.join(',');

      const response = await ctx.http.get(
        `/${cloudId}/rest/api/3/issue/${input.issueIdOrKey}`,
        { params }
      );
      return response.data as Record<string, unknown>;
    },
  })

  .withAction('updateIssue', {
    name: 'Update Issue',
    description: 'Update an existing issue',
    input: z.object({
      issueIdOrKey: z.string(),
      summary: z.string().optional(),
      description: z.string().optional(),
      priority: z.string().optional(),
      assignee: z.string().optional(),
      labels: z.array(z.string()).optional(),
      customFields: z.record(z.unknown()).optional(),
    }),
    output: z.object({
      success: z.boolean(),
    }),
    execute: async (input, ctx) => {
      const cloudId = ctx.credentials.cloudId as string;
      const fields: Record<string, unknown> = {};
      
      if (input.summary) fields.summary = input.summary;
      if (input.description) {
        fields.description = {
          type: 'doc',
          version: 1,
          content: [{ type: 'paragraph', content: [{ type: 'text', text: input.description }] }],
        };
      }
      if (input.priority) fields.priority = { name: input.priority };
      if (input.assignee) fields.assignee = { accountId: input.assignee };
      if (input.labels) fields.labels = input.labels;
      if (input.customFields) Object.assign(fields, input.customFields);

      await ctx.http.put(`/${cloudId}/rest/api/3/issue/${input.issueIdOrKey}`, { fields });
      return { success: true };
    },
  })

  .withAction('transitionIssue', {
    name: 'Transition Issue',
    description: 'Move issue to a different status',
    input: z.object({
      issueIdOrKey: z.string(),
      transitionId: z.string().describe('Transition ID (get from available transitions)'),
      comment: z.string().optional(),
      resolution: z.string().optional(),
    }),
    output: z.object({
      success: z.boolean(),
    }),
    execute: async (input, ctx) => {
      const cloudId = ctx.credentials.cloudId as string;
      
      const body: Record<string, unknown> = {
        transition: { id: input.transitionId },
      };
      
      if (input.comment) {
        body.update = {
          comment: [{
            add: {
              body: {
                type: 'doc',
                version: 1,
                content: [{ type: 'paragraph', content: [{ type: 'text', text: input.comment }] }],
              },
            },
          }],
        };
      }
      
      if (input.resolution) {
        body.fields = { resolution: { name: input.resolution } };
      }

      await ctx.http.post(
        `/${cloudId}/rest/api/3/issue/${input.issueIdOrKey}/transitions`,
        body
      );
      return { success: true };
    },
  })

  .withAction('addComment', {
    name: 'Add Comment',
    description: 'Add a comment to an issue',
    input: z.object({
      issueIdOrKey: z.string(),
      body: z.string(),
    }),
    output: z.object({
      id: z.string(),
      author: z.object({
        accountId: z.string(),
        displayName: z.string(),
      }),
      created: z.string(),
    }),
    execute: async (input, ctx) => {
      const cloudId = ctx.credentials.cloudId as string;
      
      const response = await ctx.http.post(
        `/${cloudId}/rest/api/3/issue/${input.issueIdOrKey}/comment`,
        {
          body: {
            type: 'doc',
            version: 1,
            content: [{ type: 'paragraph', content: [{ type: 'text', text: input.body }] }],
          },
        }
      );
      return response.data as Record<string, unknown>;
    },
  })

  .withAction('searchIssues', {
    name: 'Search Issues (JQL)',
    description: 'Search for issues using JQL',
    input: z.object({
      jql: z.string().describe('JQL query string'),
      fields: z.array(z.string()).optional(),
      maxResults: z.number().optional().default(50),
      startAt: z.number().optional().default(0),
    }),
    output: z.object({
      total: z.number(),
      issues: z.array(z.object({
        id: z.string(),
        key: z.string(),
        fields: z.record(z.unknown()),
      })),
    }),
    execute: async (input, ctx) => {
      const cloudId = ctx.credentials.cloudId as string;
      
      const response = await ctx.http.post(`/${cloudId}/rest/api/3/search`, {
        jql: input.jql,
        fields: input.fields || ['summary', 'status', 'assignee', 'priority'],
        maxResults: input.maxResults,
        startAt: input.startAt,
      });
      return response.data as Record<string, unknown>;
    },
  })

  .withAction('getProjects', {
    name: 'List Projects',
    description: 'Get all accessible projects',
    input: z.object({
      maxResults: z.number().optional().default(50),
    }),
    output: z.object({
      values: z.array(z.object({
        id: z.string(),
        key: z.string(),
        name: z.string(),
        projectTypeKey: z.string(),
      })),
    }),
    execute: async (input, ctx) => {
      const cloudId = ctx.credentials.cloudId as string;
      const response = await ctx.http.get(
        `/${cloudId}/rest/api/3/project/search`,
        { params: { maxResults: String(input.maxResults) } }
      );
      return response.data as Record<string, unknown>;
    },
  })

  // Webhook Triggers
  .withWebhookTrigger('issueCreated', {
    name: 'Issue Created',
    description: 'Triggered when a new issue is created',
    output: z.object({
      webhookEvent: z.string(),
      issue: z.object({
        id: z.string(),
        key: z.string(),
        fields: z.record(z.unknown()),
      }),
      user: z.object({
        accountId: z.string(),
        displayName: z.string(),
      }),
    }),
    signatureHeader: 'x-atlassian-webhook-identifier',
    verifySignature: () => true,
  })

  .withWebhookTrigger('issueUpdated', {
    name: 'Issue Updated',
    description: 'Triggered when an issue is updated',
    output: z.object({
      webhookEvent: z.string(),
      issue: z.object({
        id: z.string(),
        key: z.string(),
        fields: z.record(z.unknown()),
      }),
      changelog: z.object({
        items: z.array(z.object({
          field: z.string(),
          fromString: z.string().nullable(),
          toString: z.string().nullable(),
        })),
      }).optional(),
    }),
    signatureHeader: 'x-atlassian-webhook-identifier',
    verifySignature: () => true,
  })

  .withRateLimit({
    requests: 100,
    window: 60000,
    strategy: 'queue',
  })

  .withTestConnection(async (credentials, ctx): Promise<TestConnectionResult> => {
    try {
      const cloudId = credentials.cloudId as string;
      const response = await ctx.http.get<{ displayName: string; emailAddress: string }>(
        `/${cloudId}/rest/api/3/myself`
      );
      
      return {
        success: true,
        message: 'Successfully connected to Jira',
        accountInfo: {
          name: response.data.displayName,
          email: response.data.emailAddress,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  })

  .build();

export default jiraConnector;
