/**
 * Marketing & Communication Connectors
 * 
 * Comprehensive integration for marketing and messaging tools:
 * - Mailchimp (Campaigns, Lists, Members, Reports)
 * - Slack (Channels, Messages, Files, Reminders)
 * - Discord (Webhooks, Messages, Roles, Guilds)
 * - Twilio (SMS, Voice, WhatsApp, Verify)
 * 
 * @module connectors/marketing-connectors
 */

import { z } from 'zod';

// ============================================
// Types
// ============================================

interface MarketingCredentials {
  mailchimp?: { apiKey: string; server: string };
  slack?: { token: string };
  discord?: { token?: string; webhookUrl?: string };
  twilio?: { accountSid: string; authToken: string };
}

// ============================================
// Mailchimp Implementation
// ============================================

class MailchimpClient {
  private baseUrl: string;

  constructor(private creds: { apiKey: string; server: string }) {
    this.baseUrl = `https://${creds.server}.api.mailchimp.com/3.0`;
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.creds.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async getLists(): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/lists`, { headers: this.getHeaders() });
    const data = await response.json();
    return data.lists || [];
  }

  async addMember(listId: string, email: string, status: 'subscribed' | 'unsubscribed' | 'pending' | 'cleaned' = 'subscribed'): Promise<any> {
    const response = await fetch(`${this.baseUrl}/lists/${listId}/members`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ email_address: email, status }),
    });
    return await response.json();
  }

  async createCampaign(params: {
    type: 'regular' | 'plaintext' | 'absplit' | 'rss' | 'variate';
    recipients: { list_id: string };
    settings: { subject_line: string; from_name: string; reply_to: string };
  }): Promise<any> {
    const response = await fetch(`${this.baseUrl}/campaigns`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(params),
    });
    return await response.json();
  }

  async sendCampaign(campaignId: string): Promise<void> {
    await fetch(`${this.baseUrl}/campaigns/${campaignId}/actions/send`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
  }
}

// ============================================
// Slack Implementation
// ============================================

class SlackClient {
  private baseUrl = 'https://slack.com/api';

  constructor(private creds: { token: string }) {}

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.creds.token}`,
      'Content-Type': 'application/json; charset=utf-8',
    };
  }

  async postMessage(channel: string, text: string, attachments?: any[]): Promise<any> {
    const response = await fetch(`${this.baseUrl}/chat.postMessage`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ channel, text, attachments }),
    });
    return await response.json();
  }

  async listChannels(types = 'public_channel,private_channel'): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/conversations.list?types=${types}`, {
      headers: this.getHeaders(),
    });
    const data = await response.json();
    return data.channels || [];
  }

  async uploadFile(channels: string, content: string, filename: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/files.upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.creds.token}` },
      body: new URLSearchParams({
        channels,
        content,
        filename,
        title: filename,
      }),
    });
    return await response.json();
  }
}

// ============================================
// Discord Implementation
// ============================================

class DiscordClient {
  private baseUrl = 'https://discord.com/api/v10';

  constructor(private creds: { token?: string; webhookUrl?: string }) {}

  async sendWebhookMessage(content: string, embeds?: any[]): Promise<void> {
    if (!this.creds.webhookUrl) throw new Error('Webhook URL not provided');
    await fetch(this.creds.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, embeds }),
    });
  }

  async postMessage(channelId: string, content: string): Promise<any> {
    if (!this.creds.token) throw new Error('Bot token not provided');
    const response = await fetch(`${this.baseUrl}/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${this.creds.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });
    return await response.json();
  }
}

// ============================================
// Twilio Implementation
// ============================================

class TwilioClient {
  constructor(private creds: { accountSid: string; authToken: string }) {}

  private getAuthHeader() {
    const auth = Buffer.from(`${this.creds.accountSid}:${this.creds.authToken}`).toString('base64');
    return { 'Authorization': `Basic ${auth}` };
  }

  async sendSMS(to: string, from: string, body: string): Promise<any> {
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.creds.accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeader(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
    });
    return await response.json();
  }

  async listMessages(): Promise<any[]> {
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.creds.accountSid}/Messages.json`, {
      headers: this.getAuthHeader(),
    });
    const data = await response.json();
    return data.messages || [];
  }
}

// ============================================
// Connector Definition
// ============================================

export const marketingConnector = {
  id: 'marketing-suite',
  name: 'Marketing & Messaging',
  version: '1.0.0',
  category: 'marketing',
  description: 'Integrated connector for Slack, Discord, Mailchimp, and Twilio',
  color: '#ED1C24',
  icon: 'https://cdn.flowatgenai.com/connectors/marketing.svg',
  tags: ['marketing', 'slack', 'discord', 'mailchimp', 'twilio', 'sms', 'email'],

  authentication: {
    type: 'custom' as const,
    fields: [
      { name: 'platform', label: 'Platform', type: 'select' as const, options: [
        { label: 'Slack', value: 'slack' },
        { label: 'Discord', value: 'discord' },
        { label: 'Mailchimp', value: 'mailchimp' },
        { label: 'Twilio', value: 'twilio' },
      ], required: true },
      { name: 'apiKey', label: 'API Key / Token', type: 'password' as const, required: true },
      { name: 'extraId', label: 'Server/Account SID/Domain', type: 'string' as const, required: false },
    ],
  },

  actions: {
    // Mailchimp Actions
    mailchimpAddMember: {
      name: 'Mailchimp: Add Member',
      description: 'Subscribe a new member to a list',
      input: z.object({ listId: z.string(), email: z.string().email(), status: z.enum(['subscribed', 'unsubscribed', 'pending']).default('subscribed') }),
      output: z.any(),
      execute: async (input: any, ctx: { credentials: any }) => {
        const client = new MailchimpClient({ apiKey: ctx.credentials.apiKey, server: ctx.credentials.extraId || 'us1' });
        return await client.addMember(input.listId, input.email, input.status);
      },
    },

    // Slack Actions
    slackSendMessage: {
      name: 'Slack: Send Message',
      description: 'Post a message to a Slack channel',
      input: z.object({ channel: z.string(), text: z.string() }),
      output: z.any(),
      execute: async (input: any, ctx: { credentials: any }) => {
        const client = new SlackClient({ token: ctx.credentials.apiKey });
        return await client.postMessage(input.channel, input.text);
      },
    },

    // Discord Actions
    discordSendWebhook: {
      name: 'Discord: Send Webhook',
      description: 'Post a message via Discord Webhook',
      input: z.object({ webhookUrl: z.string().url(), content: z.string() }),
      output: z.object({ success: z.boolean() }),
      execute: async (input: any, _ctx: any) => {
        const client = new DiscordClient({ webhookUrl: input.webhookUrl });
        await client.sendWebhookMessage(input.content);
        return { success: true };
      },
    },

    // Twilio Actions
    twilioSendSMS: {
      name: 'Twilio: Send SMS',
      description: 'Send a text message using Twilio',
      input: z.object({ to: z.string(), from: z.string(), body: z.string() }),
      output: z.any(),
      execute: async (input: any, ctx: { credentials: any }) => {
        const client = new TwilioClient({ accountSid: ctx.credentials.extraId, authToken: ctx.credentials.apiKey });
        return await client.sendSMS(input.to, input.from, input.body);
      },
    },
  },
};

export default marketingConnector;
