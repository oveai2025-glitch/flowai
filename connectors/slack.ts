/**
 * Slack Connector
 * 
 * Full integration with Slack including:
 * - OAuth2 authentication
 * - Message sending with rich formatting
 * - Channel management
 * - File uploads
 * - Webhook triggers
 * 
 * @module connectors/slack
 */

import { z } from 'zod';
import { createConnector, field } from '../packages/connector-sdk/src/builder';
import type { ExecutionContext, TestConnectionResult } from '../packages/connector-sdk/src/types';
import * as crypto from 'crypto';

// ============================================
// Slack Connector Definition
// ============================================

export const slackConnector = createConnector({
  id: 'slack',
  name: 'Slack',
  version: '1.0.0',
  category: 'communication',
  description: 'Send messages, manage channels, and automate workflows in Slack',
  color: '#4A154B',
  icon: 'https://cdn.wfaib.io/connectors/slack.svg',
  tags: ['messaging', 'team', 'chat', 'notifications'],
  docsUrl: 'https://api.slack.com/',
  baseUrl: 'https://slack.com/api',
  defaultHeaders: {
    'Content-Type': 'application/json; charset=utf-8',
  },
})
  // ============================================
  // Authentication
  // ============================================
  .withOAuth2({
    grantType: 'authorization_code',
    authorizationUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    scopes: [
      'chat:write',
      'chat:write.public',
      'channels:read',
      'channels:history',
      'users:read',
      'files:write',
      'reactions:write',
    ],
    pkce: false,
  })

  // ============================================
  // Actions
  // ============================================
  
  // Send Message
  .withAction('sendMessage', {
    name: 'Send Message',
    description: 'Send a message to a Slack channel or user',
    input: z.object({
      channel: z.string().describe('Channel ID or name (e.g., #general or C1234567890)'),
      text: z.string().describe('Message text (supports Slack markdown)'),
      blocks: z.array(z.unknown()).optional().describe('Rich message blocks (Block Kit)'),
      threadTs: z.string().optional().describe('Thread timestamp to reply to'),
      unfurlLinks: z.boolean().default(true).describe('Unfurl links in the message'),
      unfurlMedia: z.boolean().default(true).describe('Unfurl media in the message'),
    }),
    output: z.object({
      ok: z.boolean(),
      channel: z.string(),
      ts: z.string().describe('Message timestamp (use for replies)'),
      message: z.object({
        text: z.string(),
        user: z.string().optional(),
        ts: z.string(),
      }).optional(),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.post<SlackResponse>('/chat.postMessage', {
        channel: input.channel,
        text: input.text,
        blocks: input.blocks,
        thread_ts: input.threadTs,
        unfurl_links: input.unfurlLinks,
        unfurl_media: input.unfurlMedia,
      });

      if (!response.data.ok) {
        throw new Error(`Slack API error: ${response.data.error}`);
      }

      return response.data;
    },
  })

  // Update Message
  .withAction('updateMessage', {
    name: 'Update Message',
    description: 'Update an existing message',
    input: z.object({
      channel: z.string().describe('Channel containing the message'),
      ts: z.string().describe('Timestamp of the message to update'),
      text: z.string().describe('New message text'),
      blocks: z.array(z.unknown()).optional(),
    }),
    output: z.object({
      ok: z.boolean(),
      channel: z.string(),
      ts: z.string(),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.post<SlackResponse>('/chat.update', {
        channel: input.channel,
        ts: input.ts,
        text: input.text,
        blocks: input.blocks,
      });

      if (!response.data.ok) {
        throw new Error(`Slack API error: ${response.data.error}`);
      }

      return response.data;
    },
  })

  // Delete Message
  .withAction('deleteMessage', {
    name: 'Delete Message',
    description: 'Delete a message from a channel',
    input: z.object({
      channel: z.string(),
      ts: z.string().describe('Timestamp of message to delete'),
    }),
    output: z.object({
      ok: z.boolean(),
      channel: z.string(),
      ts: z.string(),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.post<SlackResponse>('/chat.delete', {
        channel: input.channel,
        ts: input.ts,
      });

      if (!response.data.ok) {
        throw new Error(`Slack API error: ${response.data.error}`);
      }

      return response.data;
    },
  })

  // List Channels
  .withAction('listChannels', {
    name: 'List Channels',
    description: 'Get a list of channels in the workspace',
    input: z.object({
      types: z.string().default('public_channel,private_channel').describe('Channel types to include'),
      excludeArchived: z.boolean().default(true),
      limit: z.number().min(1).max(1000).default(100),
    }),
    output: z.object({
      ok: z.boolean(),
      channels: z.array(z.object({
        id: z.string(),
        name: z.string(),
        is_private: z.boolean(),
        is_archived: z.boolean(),
        num_members: z.number().optional(),
        topic: z.object({ value: z.string() }).optional(),
        purpose: z.object({ value: z.string() }).optional(),
      })),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.get<SlackChannelsResponse>('/conversations.list', {
        params: {
          types: input.types,
          exclude_archived: String(input.excludeArchived),
          limit: String(input.limit),
        },
      });

      if (!response.data.ok) {
        throw new Error(`Slack API error: ${response.data.error}`);
      }

      return response.data;
    },
  })

  // Get Channel Info
  .withAction('getChannel', {
    name: 'Get Channel Info',
    description: 'Get detailed information about a channel',
    input: z.object({
      channel: z.string().describe('Channel ID'),
      includeNumMembers: z.boolean().default(true),
    }),
    output: z.object({
      ok: z.boolean(),
      channel: z.object({
        id: z.string(),
        name: z.string(),
        is_private: z.boolean(),
        is_archived: z.boolean(),
        created: z.number(),
        creator: z.string(),
        num_members: z.number().optional(),
        topic: z.object({ value: z.string(), creator: z.string() }),
        purpose: z.object({ value: z.string(), creator: z.string() }),
      }),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.get<SlackChannelResponse>('/conversations.info', {
        params: {
          channel: input.channel,
          include_num_members: String(input.includeNumMembers),
        },
      });

      if (!response.data.ok) {
        throw new Error(`Slack API error: ${response.data.error}`);
      }

      return response.data;
    },
  })

  // Get User Info
  .withAction('getUser', {
    name: 'Get User Info',
    description: 'Get information about a Slack user',
    input: z.object({
      user: z.string().describe('User ID'),
    }),
    output: z.object({
      ok: z.boolean(),
      user: z.object({
        id: z.string(),
        name: z.string(),
        real_name: z.string().optional(),
        profile: z.object({
          email: z.string().optional(),
          display_name: z.string(),
          image_48: z.string().optional(),
        }),
        is_admin: z.boolean().optional(),
        is_bot: z.boolean().optional(),
      }),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.get<SlackUserResponse>('/users.info', {
        params: { user: input.user },
      });

      if (!response.data.ok) {
        throw new Error(`Slack API error: ${response.data.error}`);
      }

      return response.data;
    },
  })

  // Add Reaction
  .withAction('addReaction', {
    name: 'Add Reaction',
    description: 'Add an emoji reaction to a message',
    input: z.object({
      channel: z.string(),
      timestamp: z.string().describe('Message timestamp'),
      name: z.string().describe('Emoji name without colons (e.g., "thumbsup")'),
    }),
    output: z.object({
      ok: z.boolean(),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.post<SlackResponse>('/reactions.add', {
        channel: input.channel,
        timestamp: input.timestamp,
        name: input.name,
      });

      if (!response.data.ok && response.data.error !== 'already_reacted') {
        throw new Error(`Slack API error: ${response.data.error}`);
      }

      return { ok: true };
    },
  })

  // Upload File
  .withAction('uploadFile', {
    name: 'Upload File',
    description: 'Upload a file to Slack',
    input: z.object({
      channels: z.string().describe('Comma-separated channel IDs'),
      content: z.string().describe('File content (text or base64)'),
      filename: z.string(),
      title: z.string().optional(),
      initialComment: z.string().optional(),
      filetype: z.string().optional().describe('File type (e.g., "text", "pdf")'),
    }),
    output: z.object({
      ok: z.boolean(),
      file: z.object({
        id: z.string(),
        name: z.string(),
        permalink: z.string().optional(),
      }),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.post<SlackFileResponse>('/files.upload', {
        channels: input.channels,
        content: input.content,
        filename: input.filename,
        title: input.title,
        initial_comment: input.initialComment,
        filetype: input.filetype,
      });

      if (!response.data.ok) {
        throw new Error(`Slack API error: ${response.data.error}`);
      }

      return response.data;
    },
  })

  // ============================================
  // Triggers
  // ============================================

  // Webhook trigger for Slack Events API
  .withWebhookTrigger('event', {
    name: 'Slack Event',
    description: 'Triggered by Slack Events API',
    output: z.object({
      type: z.string(),
      event: z.object({
        type: z.string(),
        user: z.string().optional(),
        channel: z.string().optional(),
        text: z.string().optional(),
        ts: z.string().optional(),
      }),
      event_time: z.number(),
    }),
    signatureHeader: 'x-slack-signature',
    verifySignature: (payload: string, signature: string, secret: string): boolean => {
      // Slack uses HMAC SHA256 with timestamp
      // Format: v0=<hmac_sha256>
      // The timestamp should be extracted from x-slack-request-timestamp header
      // For simplicity, we verify the format here
      if (!signature.startsWith('v0=')) {
        return false;
      }

      // In production, you'd also verify the timestamp isn't too old
      const [version, hash] = signature.split('=');
      
      // Compute expected signature
      // Note: In real implementation, timestamp comes from headers
      const baseString = `v0:${Math.floor(Date.now() / 1000)}:${payload}`;
      const expectedHash = crypto
        .createHmac('sha256', secret)
        .update(baseString)
        .digest('hex');

      // Timing-safe comparison
      try {
        return crypto.timingSafeEqual(
          Buffer.from(hash),
          Buffer.from(expectedHash)
        );
      } catch {
        return false;
      }
    },
  })

  // ============================================
  // Rate Limiting
  // ============================================
  .withRateLimit({
    requests: 50,
    window: 60000, // 1 minute
    strategy: 'queue',
  })

  // ============================================
  // Test Connection
  // ============================================
  .withTestConnection(async (credentials, ctx): Promise<TestConnectionResult> => {
    try {
      const response = await ctx.http.get<SlackAuthTestResponse>('/auth.test');
      
      if (!response.data.ok) {
        return {
          success: false,
          message: `Authentication failed: ${response.data.error}`,
        };
      }

      return {
        success: true,
        message: 'Successfully connected to Slack',
        accountInfo: {
          id: response.data.user_id,
          name: response.data.user,
          team: response.data.team,
          teamId: response.data.team_id,
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

// ============================================
// Type Definitions (Internal)
// ============================================

interface SlackResponse {
  ok: boolean;
  error?: string;
  channel?: string;
  ts?: string;
  message?: {
    text: string;
    user?: string;
    ts: string;
  };
}

interface SlackChannelsResponse extends SlackResponse {
  channels: Array<{
    id: string;
    name: string;
    is_private: boolean;
    is_archived: boolean;
    num_members?: number;
    topic?: { value: string };
    purpose?: { value: string };
  }>;
}

interface SlackChannelResponse extends SlackResponse {
  channel: {
    id: string;
    name: string;
    is_private: boolean;
    is_archived: boolean;
    created: number;
    creator: string;
    num_members?: number;
    topic: { value: string; creator: string };
    purpose: { value: string; creator: string };
  };
}

interface SlackUserResponse extends SlackResponse {
  user: {
    id: string;
    name: string;
    real_name?: string;
    profile: {
      email?: string;
      display_name: string;
      image_48?: string;
    };
    is_admin?: boolean;
    is_bot?: boolean;
  };
}

interface SlackFileResponse extends SlackResponse {
  file: {
    id: string;
    name: string;
    permalink?: string;
  };
}

interface SlackAuthTestResponse extends SlackResponse {
  user_id: string;
  user: string;
  team: string;
  team_id: string;
}

export default slackConnector;
