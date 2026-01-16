/**
 * FlowAtGenAi - Zendesk Connector
 * 
 * Customer support integration:
 * - Tickets, Users, Organizations
 * - Triggers and automations
 * - Webhooks for events
 * 
 * @module connectors/zendesk
 */

import { z } from 'zod';
import { createConnector } from '../packages/connector-sdk/src/builder';
import type { TestConnectionResult } from '../packages/connector-sdk/src/types';

export const zendeskConnector = createConnector({
  id: 'zendesk',
  name: 'Zendesk',
  version: '1.0.0',
  category: 'support',
  description: 'Manage Zendesk tickets, users, and customer support workflows',
  color: '#03363D',
  icon: 'https://cdn.flowatgenai.com/connectors/zendesk.svg',
  tags: ['support', 'tickets', 'helpdesk', 'crm'],
  docsUrl: 'https://developer.zendesk.com/api-reference/',
  baseUrl: 'https://{subdomain}.zendesk.com/api/v2',
})
  .withBasicAuth({
    fields: [
      { key: 'subdomain', label: 'Subdomain', type: 'string', required: true, description: 'Your Zendesk subdomain' },
      { key: 'email', label: 'Email', type: 'string', required: true },
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
  })

  // Ticket Actions
  .withAction('createTicket', {
    name: 'Create Ticket',
    description: 'Create a new support ticket',
    input: z.object({
      subject: z.string(),
      description: z.string(),
      priority: z.enum(['urgent', 'high', 'normal', 'low']).optional(),
      type: z.enum(['problem', 'incident', 'question', 'task']).optional(),
      status: z.enum(['new', 'open', 'pending', 'hold', 'solved', 'closed']).optional(),
      requesterId: z.number().optional(),
      requesterEmail: z.string().email().optional(),
      assigneeId: z.number().optional(),
      groupId: z.number().optional(),
      tags: z.array(z.string()).optional(),
      customFields: z.array(z.object({
        id: z.number(),
        value: z.unknown(),
      })).optional(),
    }),
    output: z.object({
      ticket: z.object({
        id: z.number(),
        url: z.string(),
        subject: z.string(),
        status: z.string(),
        priority: z.string().nullable(),
        createdAt: z.string(),
      }),
    }),
    execute: async (input, ctx) => {
      const ticket: Record<string, unknown> = {
        subject: input.subject,
        comment: { body: input.description },
      };

      if (input.priority) ticket.priority = input.priority;
      if (input.type) ticket.type = input.type;
      if (input.status) ticket.status = input.status;
      if (input.requesterId) ticket.requester_id = input.requesterId;
      if (input.requesterEmail) ticket.requester = { email: input.requesterEmail };
      if (input.assigneeId) ticket.assignee_id = input.assigneeId;
      if (input.groupId) ticket.group_id = input.groupId;
      if (input.tags) ticket.tags = input.tags;
      if (input.customFields) ticket.custom_fields = input.customFields;

      const response = await ctx.http.post('/tickets.json', { ticket });
      return response.data as Record<string, unknown>;
    },
  })

  .withAction('getTicket', {
    name: 'Get Ticket',
    description: 'Get ticket details by ID',
    input: z.object({
      ticketId: z.number(),
    }),
    output: z.object({
      ticket: z.object({
        id: z.number(),
        subject: z.string(),
        description: z.string(),
        status: z.string(),
        priority: z.string().nullable(),
        requester_id: z.number(),
        assignee_id: z.number().nullable(),
        tags: z.array(z.string()),
        created_at: z.string(),
        updated_at: z.string(),
      }),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.get(`/tickets/${input.ticketId}.json`);
      return response.data as Record<string, unknown>;
    },
  })

  .withAction('updateTicket', {
    name: 'Update Ticket',
    description: 'Update an existing ticket',
    input: z.object({
      ticketId: z.number(),
      subject: z.string().optional(),
      status: z.enum(['new', 'open', 'pending', 'hold', 'solved', 'closed']).optional(),
      priority: z.enum(['urgent', 'high', 'normal', 'low']).optional(),
      assigneeId: z.number().optional(),
      tags: z.array(z.string()).optional(),
      comment: z.object({
        body: z.string(),
        public: z.boolean().optional(),
      }).optional(),
    }),
    output: z.object({
      ticket: z.object({
        id: z.number(),
        status: z.string(),
        updated_at: z.string(),
      }),
    }),
    execute: async (input, ctx) => {
      const ticket: Record<string, unknown> = {};
      
      if (input.subject) ticket.subject = input.subject;
      if (input.status) ticket.status = input.status;
      if (input.priority) ticket.priority = input.priority;
      if (input.assigneeId) ticket.assignee_id = input.assigneeId;
      if (input.tags) ticket.tags = input.tags;
      if (input.comment) ticket.comment = input.comment;

      const response = await ctx.http.put(
        `/tickets/${input.ticketId}.json`,
        { ticket }
      );
      return response.data as Record<string, unknown>;
    },
  })

  .withAction('searchTickets', {
    name: 'Search Tickets',
    description: 'Search for tickets using query',
    input: z.object({
      query: z.string().describe('Zendesk search query'),
      sortBy: z.enum(['created_at', 'updated_at', 'priority', 'status']).optional(),
      sortOrder: z.enum(['asc', 'desc']).optional(),
      perPage: z.number().optional().default(25),
    }),
    output: z.object({
      results: z.array(z.object({
        id: z.number(),
        subject: z.string(),
        status: z.string(),
      })),
      count: z.number(),
    }),
    execute: async (input, ctx) => {
      const params: Record<string, string> = {
        query: input.query,
        per_page: String(input.perPage),
      };
      if (input.sortBy) params.sort_by = input.sortBy;
      if (input.sortOrder) params.sort_order = input.sortOrder;

      const response = await ctx.http.get('/search.json', { params });
      return response.data as Record<string, unknown>;
    },
  })

  .withAction('addComment', {
    name: 'Add Comment',
    description: 'Add a comment to a ticket',
    input: z.object({
      ticketId: z.number(),
      body: z.string(),
      isPublic: z.boolean().optional().default(true),
      authorId: z.number().optional(),
    }),
    output: z.object({
      ticket: z.object({
        id: z.number(),
        updated_at: z.string(),
      }),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.put(
        `/tickets/${input.ticketId}.json`,
        {
          ticket: {
            comment: {
              body: input.body,
              public: input.isPublic,
              author_id: input.authorId,
            },
          },
        }
      );
      return response.data as Record<string, unknown>;
    },
  })

  // User Actions
  .withAction('createUser', {
    name: 'Create User',
    description: 'Create a new user',
    input: z.object({
      name: z.string(),
      email: z.string().email(),
      phone: z.string().optional(),
      role: z.enum(['end-user', 'agent', 'admin']).optional().default('end-user'),
      organizationId: z.number().optional(),
      tags: z.array(z.string()).optional(),
    }),
    output: z.object({
      user: z.object({
        id: z.number(),
        name: z.string(),
        email: z.string(),
        role: z.string(),
      }),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.post('/users.json', {
        user: {
          name: input.name,
          email: input.email,
          phone: input.phone,
          role: input.role,
          organization_id: input.organizationId,
          tags: input.tags,
        },
      });
      return response.data as Record<string, unknown>;
    },
  })

  .withAction('getUser', {
    name: 'Get User',
    description: 'Get user by ID or email',
    input: z.object({
      userId: z.number().optional(),
      email: z.string().email().optional(),
    }),
    output: z.object({
      user: z.object({
        id: z.number(),
        name: z.string(),
        email: z.string(),
        role: z.string(),
        organization_id: z.number().nullable(),
      }),
    }),
    execute: async (input, ctx) => {
      if (input.userId) {
        const response = await ctx.http.get(`/users/${input.userId}.json`);
        return response.data as Record<string, unknown>;
      } else if (input.email) {
        const response = await ctx.http.get('/search.json', {
          params: { query: `email:${input.email} type:user` },
        });
        return { user: (response.data as { results: unknown[] }).results[0] };
      }
      throw new Error('Either userId or email is required');
    },
  })

  // Organization Actions
  .withAction('createOrganization', {
    name: 'Create Organization',
    description: 'Create a new organization',
    input: z.object({
      name: z.string(),
      details: z.string().optional(),
      notes: z.string().optional(),
      domainNames: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
    }),
    output: z.object({
      organization: z.object({
        id: z.number(),
        name: z.string(),
        url: z.string(),
      }),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.post('/organizations.json', {
        organization: {
          name: input.name,
          details: input.details,
          notes: input.notes,
          domain_names: input.domainNames,
          tags: input.tags,
        },
      });
      return response.data as Record<string, unknown>;
    },
  })

  // Webhook Triggers
  .withWebhookTrigger('ticketCreated', {
    name: 'Ticket Created',
    description: 'Triggered when a new ticket is created',
    output: z.object({
      ticket: z.object({
        id: z.number(),
        subject: z.string(),
        status: z.string(),
        priority: z.string().nullable(),
        requester_id: z.number(),
      }),
    }),
    signatureHeader: 'x-zendesk-webhook-signature',
    verifySignature: () => true,
  })

  .withWebhookTrigger('ticketUpdated', {
    name: 'Ticket Updated',
    description: 'Triggered when a ticket is updated',
    output: z.object({
      ticket: z.object({
        id: z.number(),
        subject: z.string(),
        status: z.string(),
        updated_at: z.string(),
      }),
    }),
    signatureHeader: 'x-zendesk-webhook-signature',
    verifySignature: () => true,
  })

  .withRateLimit({
    requests: 200,
    window: 60000,
    strategy: 'queue',
  })

  .withTestConnection(async (credentials, ctx): Promise<TestConnectionResult> => {
    try {
      const response = await ctx.http.get<{ user: { name: string; email: string } }>(
        '/users/me.json'
      );
      
      return {
        success: true,
        message: 'Successfully connected to Zendesk',
        accountInfo: {
          name: response.data.user.name,
          email: response.data.user.email,
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

export default zendeskConnector;
