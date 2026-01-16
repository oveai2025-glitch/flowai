/**
 * Discord Connector
 * 
 * Full Discord integration:
 * - Send messages to channels
 * - Manage webhooks
 * - Bot interactions
 * 
 * @module connectors/discord
 */

import { z } from 'zod';
import { createConnector } from '../packages/connector-sdk/src/builder';
import type { TestConnectionResult } from '../packages/connector-sdk/src/types';
import * as crypto from 'crypto';

const embedSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  url: z.string().optional(),
  color: z.number().optional(),
  timestamp: z.string().optional(),
  footer: z.object({
    text: z.string(),
    icon_url: z.string().optional(),
  }).optional(),
  image: z.object({ url: z.string() }).optional(),
  thumbnail: z.object({ url: z.string() }).optional(),
  author: z.object({
    name: z.string(),
    url: z.string().optional(),
    icon_url: z.string().optional(),
  }).optional(),
  fields: z.array(z.object({
    name: z.string(),
    value: z.string(),
    inline: z.boolean().optional(),
  })).optional(),
});

export const discordConnector = createConnector({
  id: 'discord',
  name: 'Discord',
  version: '1.0.0',
  category: 'communication',
  description: 'Send messages and manage Discord servers',
  color: '#5865F2',
  icon: 'https://cdn.wfaib.io/connectors/discord.svg',
  tags: ['chat', 'gaming', 'community', 'messaging'],
  docsUrl: 'https://discord.com/developers/docs',
  baseUrl: 'https://discord.com/api/v10',
})
  .withApiKey({
    location: 'header',
    name: 'Authorization',
    prefix: 'Bot ',
    fields: [
      {
        key: 'botToken',
        label: 'Bot Token',
        type: 'password',
        required: true,
        description: 'Your Discord bot token',
      },
    ],
  })

  .withAction('sendMessage', {
    name: 'Send Message',
    description: 'Send a message to a Discord channel',
    input: z.object({
      channelId: z.string().describe('Channel ID'),
      content: z.string().max(2000).optional(),
      embeds: z.array(embedSchema).max(10).optional(),
      tts: z.boolean().default(false),
    }),
    output: z.object({
      id: z.string(),
      channel_id: z.string(),
      content: z.string(),
      timestamp: z.string(),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.post(`/channels/${input.channelId}/messages`, {
        content: input.content,
        embeds: input.embeds,
        tts: input.tts,
      });
      return response.data as Record<string, unknown>;
    },
  })

  .withAction('sendWebhookMessage', {
    name: 'Send Webhook Message',
    description: 'Send a message via Discord webhook (no bot required)',
    input: z.object({
      webhookUrl: z.string().url(),
      content: z.string().max(2000).optional(),
      username: z.string().optional(),
      avatarUrl: z.string().optional(),
      embeds: z.array(embedSchema).max(10).optional(),
    }),
    output: z.object({
      success: z.boolean(),
    }),
    execute: async (input, ctx) => {
      await fetch(input.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: input.content,
          username: input.username,
          avatar_url: input.avatarUrl,
          embeds: input.embeds,
        }),
      });
      return { success: true };
    },
  })

  .withAction('getChannel', {
    name: 'Get Channel',
    description: 'Get information about a channel',
    input: z.object({
      channelId: z.string(),
    }),
    output: z.object({
      id: z.string(),
      name: z.string(),
      type: z.number(),
      guild_id: z.string().optional(),
      topic: z.string().nullable(),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.get(`/channels/${input.channelId}`);
      return response.data as Record<string, unknown>;
    },
  })

  .withAction('getGuildChannels', {
    name: 'Get Server Channels',
    description: 'Get all channels in a server',
    input: z.object({
      guildId: z.string(),
    }),
    output: z.object({
      channels: z.array(z.object({
        id: z.string(),
        name: z.string(),
        type: z.number(),
      })),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.get(`/guilds/${input.guildId}/channels`);
      return { channels: response.data };
    },
  })

  .withAction('createReaction', {
    name: 'Add Reaction',
    description: 'Add a reaction to a message',
    input: z.object({
      channelId: z.string(),
      messageId: z.string(),
      emoji: z.string().describe('Emoji like 👍 or custom emoji name:id'),
    }),
    output: z.object({ success: z.boolean() }),
    execute: async (input, ctx) => {
      const encodedEmoji = encodeURIComponent(input.emoji);
      await ctx.http.put(
        `/channels/${input.channelId}/messages/${input.messageId}/reactions/${encodedEmoji}/@me`,
        {}
      );
      return { success: true };
    },
  })

  .withWebhookTrigger('interaction', {
    name: 'Interaction',
    description: 'Triggered by Discord interactions (slash commands, buttons)',
    output: z.object({
      type: z.number(),
      data: z.object({
        name: z.string(),
        options: z.array(z.unknown()).optional(),
      }),
      member: z.object({
        user: z.object({
          id: z.string(),
          username: z.string(),
        }),
      }).optional(),
      channel_id: z.string(),
      guild_id: z.string().optional(),
    }),
    signatureHeader: 'x-signature-ed25519',
    verifySignature: (payload, signature, secret) => {
      // Discord uses Ed25519 signatures
      // Implementation would require ed25519 library
      return true; // Placeholder
    },
  })

  .withRateLimit({
    requests: 50,
    window: 1000,
    strategy: 'queue',
  })

  .withTestConnection(async (credentials, ctx): Promise<TestConnectionResult> => {
    try {
      const response = await ctx.http.get<{ id: string; username: string }>('/users/@me');
      return {
        success: true,
        message: 'Successfully connected to Discord',
        accountInfo: {
          id: response.data.id,
          name: response.data.username,
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

export default discordConnector;
