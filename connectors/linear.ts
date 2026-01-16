/**
 * FlowAtGenAi - Linear Connector
 * 
 * Issue tracking integration:
 * - Issues, Projects, Teams
 * - Labels and milestones
 * - Webhooks for events
 * 
 * @module connectors/linear
 */

import { z } from 'zod';
import { createConnector } from '../packages/connector-sdk/src/builder';
import type { TestConnectionResult } from '../packages/connector-sdk/src/types';

export const linearConnector = createConnector({
  id: 'linear',
  name: 'Linear',
  version: '1.0.0',
  category: 'productivity',
  description: 'Manage issues, projects, and team workflows in Linear',
  color: '#5E6AD2',
  icon: 'https://cdn.flowatgenai.com/connectors/linear.svg',
  tags: ['issues', 'project-management', 'agile', 'tracking'],
  docsUrl: 'https://developers.linear.app/docs',
  baseUrl: 'https://api.linear.app/graphql',
})
  .withApiKey({
    location: 'header',
    name: 'Authorization',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  })

  .withAction('createIssue', {
    name: 'Create Issue',
    description: 'Create a new issue',
    input: z.object({
      teamId: z.string(),
      title: z.string(),
      description: z.string().optional(),
      priority: z.number().min(0).max(4).optional(),
      stateId: z.string().optional(),
      assigneeId: z.string().optional(),
      labelIds: z.array(z.string()).optional(),
      projectId: z.string().optional(),
      cycleId: z.string().optional(),
      estimate: z.number().optional(),
      dueDate: z.string().optional(),
    }),
    output: z.object({
      issue: z.object({
        id: z.string(),
        identifier: z.string(),
        title: z.string(),
        url: z.string(),
      }),
    }),
    execute: async (input, ctx) => {
      const mutation = `
        mutation CreateIssue($input: IssueCreateInput!) {
          issueCreate(input: $input) {
            success
            issue {
              id
              identifier
              title
              url
            }
          }
        }
      `;

      const response = await ctx.http.post('', {
        query: mutation,
        variables: { input },
      });

      const data = response.data as { data: { issueCreate: { issue: unknown } } };
      return { issue: data.data.issueCreate.issue as Record<string, unknown> };
    },
  })

  .withAction('updateIssue', {
    name: 'Update Issue',
    description: 'Update an existing issue',
    input: z.object({
      issueId: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      priority: z.number().min(0).max(4).optional(),
      stateId: z.string().optional(),
      assigneeId: z.string().optional(),
      labelIds: z.array(z.string()).optional(),
    }),
    output: z.object({
      issue: z.object({
        id: z.string(),
        identifier: z.string(),
        title: z.string(),
        state: z.object({ name: z.string() }),
      }),
    }),
    execute: async (input, ctx) => {
      const mutation = `
        mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
          issueUpdate(id: $id, input: $input) {
            success
            issue {
              id
              identifier
              title
              state { name }
            }
          }
        }
      `;

      const { issueId, ...updateInput } = input;
      const response = await ctx.http.post('', {
        query: mutation,
        variables: { id: issueId, input: updateInput },
      });

      const data = response.data as { data: { issueUpdate: { issue: unknown } } };
      return { issue: data.data.issueUpdate.issue as Record<string, unknown> };
    },
  })

  .withAction('getIssue', {
    name: 'Get Issue',
    description: 'Get issue details',
    input: z.object({
      issueId: z.string(),
    }),
    output: z.object({
      issue: z.object({
        id: z.string(),
        identifier: z.string(),
        title: z.string(),
        description: z.string().nullable(),
        priority: z.number(),
        state: z.object({ name: z.string() }),
        assignee: z.object({ name: z.string() }).nullable(),
        url: z.string(),
      }),
    }),
    execute: async (input, ctx) => {
      const query = `
        query GetIssue($id: String!) {
          issue(id: $id) {
            id
            identifier
            title
            description
            priority
            state { name }
            assignee { name }
            url
          }
        }
      `;

      const response = await ctx.http.post('', {
        query,
        variables: { id: input.issueId },
      });

      const data = response.data as { data: { issue: unknown } };
      return { issue: data.data.issue as Record<string, unknown> };
    },
  })

  .withAction('searchIssues', {
    name: 'Search Issues',
    description: 'Search for issues',
    input: z.object({
      query: z.string().optional(),
      teamId: z.string().optional(),
      stateId: z.string().optional(),
      assigneeId: z.string().optional(),
      first: z.number().optional().default(50),
    }),
    output: z.object({
      issues: z.array(z.object({
        id: z.string(),
        identifier: z.string(),
        title: z.string(),
        state: z.object({ name: z.string() }),
      })),
    }),
    execute: async (input, ctx) => {
      const filters: string[] = [];
      if (input.teamId) filters.push(`team: { id: { eq: "${input.teamId}" } }`);
      if (input.stateId) filters.push(`state: { id: { eq: "${input.stateId}" } }`);
      if (input.assigneeId) filters.push(`assignee: { id: { eq: "${input.assigneeId}" } }`);

      const query = `
        query SearchIssues($first: Int!) {
          issues(first: $first${filters.length ? `, filter: { ${filters.join(', ')} }` : ''}) {
            nodes {
              id
              identifier
              title
              state { name }
            }
          }
        }
      `;

      const response = await ctx.http.post('', {
        query,
        variables: { first: input.first },
      });

      const data = response.data as { data: { issues: { nodes: unknown[] } } };
      return { issues: data.data.issues.nodes as Record<string, unknown>[] };
    },
  })

  .withAction('addComment', {
    name: 'Add Comment',
    description: 'Add a comment to an issue',
    input: z.object({
      issueId: z.string(),
      body: z.string(),
    }),
    output: z.object({
      comment: z.object({
        id: z.string(),
        body: z.string(),
      }),
    }),
    execute: async (input, ctx) => {
      const mutation = `
        mutation CreateComment($input: CommentCreateInput!) {
          commentCreate(input: $input) {
            success
            comment {
              id
              body
            }
          }
        }
      `;

      const response = await ctx.http.post('', {
        query: mutation,
        variables: { input: { issueId: input.issueId, body: input.body } },
      });

      const data = response.data as { data: { commentCreate: { comment: unknown } } };
      return { comment: data.data.commentCreate.comment as Record<string, unknown> };
    },
  })

  .withAction('getTeams', {
    name: 'Get Teams',
    description: 'Get all teams',
    input: z.object({}),
    output: z.object({
      teams: z.array(z.object({
        id: z.string(),
        name: z.string(),
        key: z.string(),
      })),
    }),
    execute: async (input, ctx) => {
      const query = `
        query GetTeams {
          teams {
            nodes {
              id
              name
              key
            }
          }
        }
      `;

      const response = await ctx.http.post('', { query });
      const data = response.data as { data: { teams: { nodes: unknown[] } } };
      return { teams: data.data.teams.nodes as Record<string, unknown>[] };
    },
  })

  .withWebhookTrigger('issueCreated', {
    name: 'Issue Created',
    description: 'Triggered when an issue is created',
    output: z.object({
      action: z.string(),
      type: z.string(),
      data: z.object({
        id: z.string(),
        title: z.string(),
        identifier: z.string(),
      }),
    }),
    signatureHeader: 'linear-signature',
    verifySignature: () => true,
  })

  .withWebhookTrigger('issueUpdated', {
    name: 'Issue Updated',
    description: 'Triggered when an issue is updated',
    output: z.object({
      action: z.string(),
      type: z.string(),
      data: z.object({
        id: z.string(),
        title: z.string(),
      }),
      updatedFrom: z.record(z.unknown()).optional(),
    }),
    signatureHeader: 'linear-signature',
    verifySignature: () => true,
  })

  .withRateLimit({
    requests: 100,
    window: 60000,
    strategy: 'queue',
  })

  .withTestConnection(async (credentials, ctx): Promise<TestConnectionResult> => {
    try {
      const query = `query { viewer { id name email } }`;
      const response = await ctx.http.post<{
        data: { viewer: { name: string; email: string } };
      }>('', { query });

      return {
        success: true,
        message: 'Successfully connected to Linear',
        accountInfo: {
          name: response.data.data.viewer.name,
          email: response.data.data.viewer.email,
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

export default linearConnector;
