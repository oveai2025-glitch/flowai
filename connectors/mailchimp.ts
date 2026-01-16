/**
 * FlowAtGenAi - Mailchimp Connector
 * 
 * Email marketing integration:
 * - Lists and subscribers
 * - Campaigns
 * - Automations
 * - Tags and segments
 * 
 * @module connectors/mailchimp
 */

import { z } from 'zod';
import { createConnector } from '../packages/connector-sdk/src/builder';
import type { TestConnectionResult } from '../packages/connector-sdk/src/types';

export const mailchimpConnector = createConnector({
  id: 'mailchimp',
  name: 'Mailchimp',
  version: '1.0.0',
  category: 'marketing',
  description: 'Manage email lists, subscribers, and campaigns in Mailchimp',
  color: '#FFE01B',
  icon: 'https://cdn.flowatgenai.com/connectors/mailchimp.svg',
  tags: ['email', 'marketing', 'campaigns', 'newsletters'],
  docsUrl: 'https://mailchimp.com/developer/marketing/api/',
  baseUrl: 'https://{dc}.api.mailchimp.com/3.0',
})
  .withApiKey({
    location: 'header',
    name: 'Authorization',
    prefix: 'Basic ',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, description: 'Your Mailchimp API key (includes datacenter suffix)' },
    ],
  })

  // Subscriber Management
  .withAction('addSubscriber', {
    name: 'Add/Update Subscriber',
    description: 'Add a new subscriber or update existing one',
    input: z.object({
      listId: z.string().describe('Audience/List ID'),
      email: z.string().email(),
      status: z.enum(['subscribed', 'unsubscribed', 'cleaned', 'pending', 'transactional']).default('subscribed'),
      mergeFields: z.object({
        FNAME: z.string().optional(),
        LNAME: z.string().optional(),
      }).passthrough().optional(),
      tags: z.array(z.string()).optional(),
      language: z.string().optional(),
      vip: z.boolean().optional(),
      marketingPermissions: z.array(z.object({
        marketingPermissionId: z.string(),
        enabled: z.boolean(),
      })).optional(),
    }),
    output: z.object({
      id: z.string(),
      email_address: z.string(),
      status: z.string(),
      unique_email_id: z.string(),
    }),
    execute: async (input, ctx) => {
      const emailHash = await hashEmail(input.email);
      const response = await ctx.http.put(`/lists/${input.listId}/members/${emailHash}`, {
        email_address: input.email,
        status_if_new: input.status,
        status: input.status,
        merge_fields: input.mergeFields,
        tags: input.tags,
        language: input.language,
        vip: input.vip,
        marketing_permissions: input.marketingPermissions,
      });
      return response.data as Record<string, unknown>;
    },
  })

  .withAction('getSubscriber', {
    name: 'Get Subscriber',
    description: 'Get subscriber info by email',
    input: z.object({
      listId: z.string(),
      email: z.string().email(),
    }),
    output: z.object({
      id: z.string(),
      email_address: z.string(),
      status: z.string(),
      merge_fields: z.record(z.unknown()),
      stats: z.object({
        avg_open_rate: z.number(),
        avg_click_rate: z.number(),
      }),
    }),
    execute: async (input, ctx) => {
      const emailHash = await hashEmail(input.email);
      const response = await ctx.http.get(`/lists/${input.listId}/members/${emailHash}`);
      return response.data as Record<string, unknown>;
    },
  })

  .withAction('updateSubscriber', {
    name: 'Update Subscriber',
    description: 'Update subscriber details',
    input: z.object({
      listId: z.string(),
      email: z.string().email(),
      mergeFields: z.record(z.string()).optional(),
      status: z.enum(['subscribed', 'unsubscribed', 'cleaned', 'pending']).optional(),
      tags: z.array(z.string()).optional(),
    }),
    output: z.object({
      id: z.string(),
      email_address: z.string(),
      status: z.string(),
    }),
    execute: async (input, ctx) => {
      const emailHash = await hashEmail(input.email);
      const response = await ctx.http.patch(`/lists/${input.listId}/members/${emailHash}`, {
        merge_fields: input.mergeFields,
        status: input.status,
        tags: input.tags,
      });
      return response.data as Record<string, unknown>;
    },
  })

  .withAction('unsubscribe', {
    name: 'Unsubscribe',
    description: 'Unsubscribe a member from a list',
    input: z.object({
      listId: z.string(),
      email: z.string().email(),
    }),
    output: z.object({
      success: z.boolean(),
    }),
    execute: async (input, ctx) => {
      const emailHash = await hashEmail(input.email);
      await ctx.http.patch(`/lists/${input.listId}/members/${emailHash}`, {
        status: 'unsubscribed',
      });
      return { success: true };
    },
  })

  .withAction('addTagsToSubscriber', {
    name: 'Add Tags to Subscriber',
    description: 'Add tags to a subscriber',
    input: z.object({
      listId: z.string(),
      email: z.string().email(),
      tags: z.array(z.string()),
    }),
    output: z.object({
      success: z.boolean(),
    }),
    execute: async (input, ctx) => {
      const emailHash = await hashEmail(input.email);
      await ctx.http.post(`/lists/${input.listId}/members/${emailHash}/tags`, {
        tags: input.tags.map((name) => ({ name, status: 'active' })),
      });
      return { success: true };
    },
  })

  // List Operations
  .withAction('getLists', {
    name: 'Get Lists',
    description: 'Get all audiences/lists',
    input: z.object({
      count: z.number().optional().default(10),
      offset: z.number().optional().default(0),
    }),
    output: z.object({
      lists: z.array(z.object({
        id: z.string(),
        name: z.string(),
        stats: z.object({
          member_count: z.number(),
        }),
      })),
      total_items: z.number(),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.get('/lists', {
        params: { count: String(input.count), offset: String(input.offset) },
      });
      return response.data as Record<string, unknown>;
    },
  })

  .withAction('getListMembers', {
    name: 'Get List Members',
    description: 'Get members of a list',
    input: z.object({
      listId: z.string(),
      status: z.enum(['subscribed', 'unsubscribed', 'cleaned', 'pending', 'transactional']).optional(),
      count: z.number().optional().default(100),
      offset: z.number().optional().default(0),
    }),
    output: z.object({
      members: z.array(z.object({
        id: z.string(),
        email_address: z.string(),
        status: z.string(),
        merge_fields: z.record(z.unknown()),
      })),
      total_items: z.number(),
    }),
    execute: async (input, ctx) => {
      const params: Record<string, string> = {
        count: String(input.count),
        offset: String(input.offset),
      };
      if (input.status) params.status = input.status;

      const response = await ctx.http.get(`/lists/${input.listId}/members`, { params });
      return response.data as Record<string, unknown>;
    },
  })

  // Campaign Operations
  .withAction('createCampaign', {
    name: 'Create Campaign',
    description: 'Create a new email campaign',
    input: z.object({
      type: z.enum(['regular', 'plaintext', 'absplit', 'rss', 'variate']).default('regular'),
      listId: z.string(),
      subjectLine: z.string(),
      fromName: z.string(),
      replyTo: z.string().email(),
      title: z.string().optional(),
    }),
    output: z.object({
      id: z.string(),
      web_id: z.number(),
      status: z.string(),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.post('/campaigns', {
        type: input.type,
        recipients: { list_id: input.listId },
        settings: {
          subject_line: input.subjectLine,
          from_name: input.fromName,
          reply_to: input.replyTo,
          title: input.title || input.subjectLine,
        },
      });
      return response.data as Record<string, unknown>;
    },
  })

  .withAction('setCampaignContent', {
    name: 'Set Campaign Content',
    description: 'Set the HTML content of a campaign',
    input: z.object({
      campaignId: z.string(),
      html: z.string(),
      plainText: z.string().optional(),
    }),
    output: z.object({
      success: z.boolean(),
    }),
    execute: async (input, ctx) => {
      await ctx.http.put(`/campaigns/${input.campaignId}/content`, {
        html: input.html,
        plain_text: input.plainText,
      });
      return { success: true };
    },
  })

  .withAction('sendCampaign', {
    name: 'Send Campaign',
    description: 'Send a campaign immediately',
    input: z.object({
      campaignId: z.string(),
    }),
    output: z.object({
      success: z.boolean(),
    }),
    execute: async (input, ctx) => {
      await ctx.http.post(`/campaigns/${input.campaignId}/actions/send`);
      return { success: true };
    },
  })

  .withAction('scheduleCampaign', {
    name: 'Schedule Campaign',
    description: 'Schedule a campaign for later',
    input: z.object({
      campaignId: z.string(),
      scheduleTime: z.string().describe('ISO 8601 datetime'),
    }),
    output: z.object({
      success: z.boolean(),
    }),
    execute: async (input, ctx) => {
      await ctx.http.post(`/campaigns/${input.campaignId}/actions/schedule`, {
        schedule_time: input.scheduleTime,
      });
      return { success: true };
    },
  })

  // Triggers
  .withWebhookTrigger('subscriberAdded', {
    name: 'Subscriber Added',
    description: 'Triggered when a new subscriber is added',
    output: z.object({
      type: z.string(),
      fired_at: z.string(),
      data: z.object({
        id: z.string(),
        email: z.string(),
        list_id: z.string(),
        merges: z.record(z.unknown()),
      }),
    }),
    signatureHeader: 'x-mailchimp-signature',
    verifySignature: () => true,
  })

  .withWebhookTrigger('subscriberUpdated', {
    name: 'Subscriber Updated',
    description: 'Triggered when a subscriber is updated',
    output: z.object({
      type: z.string(),
      fired_at: z.string(),
      data: z.object({
        id: z.string(),
        email: z.string(),
        old_email: z.string().optional(),
      }),
    }),
    signatureHeader: 'x-mailchimp-signature',
    verifySignature: () => true,
  })

  .withWebhookTrigger('unsubscribe', {
    name: 'Unsubscribe',
    description: 'Triggered when someone unsubscribes',
    output: z.object({
      type: z.string(),
      fired_at: z.string(),
      data: z.object({
        id: z.string(),
        email: z.string(),
        reason: z.string().optional(),
      }),
    }),
    signatureHeader: 'x-mailchimp-signature',
    verifySignature: () => true,
  })

  .withRateLimit({
    requests: 10,
    window: 1000,
    strategy: 'queue',
  })

  .withTestConnection(async (credentials, ctx): Promise<TestConnectionResult> => {
    try {
      const response = await ctx.http.get<{ account_name: string; email: string }>('/');
      return {
        success: true,
        message: 'Successfully connected to Mailchimp',
        accountInfo: {
          name: response.data.account_name,
          email: response.data.email,
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

// Helper function
async function hashEmail(email: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(email.toLowerCase());
  const hashBuffer = await crypto.subtle.digest('MD5', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default mailchimpConnector;
