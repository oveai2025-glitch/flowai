/**
 * SendGrid Connector
 * 
 * Send transactional emails with SendGrid.
 * 
 * @module connectors/sendgrid
 */

import { z } from 'zod';

interface SendGridCredentials {
  apiKey: string;
}

class SendGridClient {
  private credentials: SendGridCredentials;
  private baseUrl = 'https://api.sendgrid.com/v3';

  constructor(credentials: SendGridCredentials) {
    this.credentials = credentials;
  }

  private getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.credentials.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async sendEmail(params: {
    to: Array<{ email: string; name?: string }>;
    from: { email: string; name?: string };
    subject: string;
    text?: string;
    html?: string;
    cc?: Array<{ email: string; name?: string }>;
    bcc?: Array<{ email: string; name?: string }>;
    replyTo?: { email: string; name?: string };
    attachments?: Array<{ content: string; filename: string; type: string }>;
    categories?: string[];
    sendAt?: number;
  }): Promise<{ messageId: string }> {
    const response = await fetch(`${this.baseUrl}/mail/send`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        personalizations: [{
          to: params.to,
          cc: params.cc,
          bcc: params.bcc,
        }],
        from: params.from,
        reply_to: params.replyTo,
        subject: params.subject,
        content: [
          ...(params.text ? [{ type: 'text/plain', value: params.text }] : []),
          ...(params.html ? [{ type: 'text/html', value: params.html }] : []),
        ],
        attachments: params.attachments?.map(a => ({
          content: a.content,
          filename: a.filename,
          type: a.type,
          disposition: 'attachment',
        })),
        categories: params.categories,
        send_at: params.sendAt,
      }),
    });

    const messageId = response.headers.get('x-message-id') || '';
    return { messageId };
  }

  async sendTemplateEmail(params: {
    to: Array<{ email: string; name?: string }>;
    from: { email: string; name?: string };
    templateId: string;
    dynamicTemplateData: Record<string, unknown>;
  }): Promise<{ messageId: string }> {
    const response = await fetch(`${this.baseUrl}/mail/send`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        personalizations: [{
          to: params.to,
          dynamic_template_data: params.dynamicTemplateData,
        }],
        from: params.from,
        template_id: params.templateId,
      }),
    });

    const messageId = response.headers.get('x-message-id') || '';
    return { messageId };
  }

  async getContacts(pageSize: number = 50): Promise<Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    createdAt: string;
  }>> {
    const response = await fetch(`${this.baseUrl}/marketing/contacts?page_size=${pageSize}`, {
      headers: this.getHeaders(),
    });

    const data = await response.json();
    return data.result?.map((c: { id: string; email: string; first_name: string; last_name: string; created_at: string }) => ({
      id: c.id,
      email: c.email,
      firstName: c.first_name || '',
      lastName: c.last_name || '',
      createdAt: c.created_at,
    })) || [];
  }

  async addContact(params: {
    email: string;
    firstName?: string;
    lastName?: string;
    customFields?: Record<string, string>;
    listIds?: string[];
  }): Promise<{ jobId: string }> {
    const response = await fetch(`${this.baseUrl}/marketing/contacts`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({
        list_ids: params.listIds,
        contacts: [{
          email: params.email,
          first_name: params.firstName,
          last_name: params.lastName,
          custom_fields: params.customFields,
        }],
      }),
    });

    const data = await response.json();
    return { jobId: data.job_id };
  }

  async deleteContact(id: string): Promise<{ jobId: string }> {
    const response = await fetch(`${this.baseUrl}/marketing/contacts?ids=${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    const data = await response.json();
    return { jobId: data.job_id };
  }

  async getLists(): Promise<Array<{ id: string; name: string; contactCount: number }>> {
    const response = await fetch(`${this.baseUrl}/marketing/lists`, {
      headers: this.getHeaders(),
    });

    const data = await response.json();
    return data.result?.map((l: { id: string; name: string; contact_count: number }) => ({
      id: l.id,
      name: l.name,
      contactCount: l.contact_count,
    })) || [];
  }

  async createList(name: string): Promise<{ id: string; name: string }> {
    const response = await fetch(`${this.baseUrl}/marketing/lists`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ name }),
    });

    const data = await response.json();
    return { id: data.id, name: data.name };
  }

  async deleteList(id: string): Promise<void> {
    await fetch(`${this.baseUrl}/marketing/lists/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
  }

  async getStats(startDate: string, endDate: string): Promise<{
    requests: number;
    delivered: number;
    opens: number;
    clicks: number;
    bounces: number;
    spamReports: number;
    unsubscribes: number;
  }> {
    const response = await fetch(`${this.baseUrl}/stats?start_date=${startDate}&end_date=${endDate}`, {
      headers: this.getHeaders(),
    });

    const data = await response.json();
    const totals = { requests: 0, delivered: 0, opens: 0, clicks: 0, bounces: 0, spamReports: 0, unsubscribes: 0 };
    
    for (const day of data) {
      for (const stat of day.stats) {
        totals.requests += stat.metrics.requests || 0;
        totals.delivered += stat.metrics.delivered || 0;
        totals.opens += stat.metrics.opens || 0;
        totals.clicks += stat.metrics.clicks || 0;
        totals.bounces += stat.metrics.bounces || 0;
        totals.spamReports += stat.metrics.spam_reports || 0;
        totals.unsubscribes += stat.metrics.unsubscribes || 0;
      }
    }

    return totals;
  }

  async getTemplates(): Promise<Array<{ id: string; name: string; generation: string }>> {
    const response = await fetch(`${this.baseUrl}/templates?generations=dynamic`, {
      headers: this.getHeaders(),
    });

    const data = await response.json();
    return data.result?.map((t: { id: string; name: string; generation: string }) => ({
      id: t.id,
      name: t.name,
      generation: t.generation,
    })) || [];
  }

  async validateEmail(email: string): Promise<{
    valid: boolean;
    score: number;
    result: string;
    suggestion?: string;
  }> {
    const response = await fetch(`${this.baseUrl}/validations/email`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    return {
      valid: data.result?.verdict === 'Valid',
      score: data.result?.score || 0,
      result: data.result?.verdict || 'Unknown',
      suggestion: data.result?.suggestion,
    };
  }

  async addEmailToBounceList(email: string, reason: string = 'Manual block'): Promise<void> {
    await fetch(`${this.baseUrl}/suppression/bounces`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        emails: [{ email, reason }],
      }),
    });
  }

  async removeFromBounceList(email: string): Promise<void> {
    await fetch(`${this.baseUrl}/suppression/bounces/${email}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
  }

  async getSenderIdentities(): Promise<Array<{ id: number; nickname: string; fromEmail: string; verified: boolean }>> {
    const response = await fetch(`${this.baseUrl}/senders`, {
      headers: this.getHeaders(),
    });

    const data = await response.json();
    return data.map((s: { id: number; nickname: string; from: { email: string }; verified: { status: boolean } }) => ({
      id: s.id,
      nickname: s.nickname,
      fromEmail: s.from?.email || '',
      verified: s.verified?.status || false,
    }));
  }
}

export const sendgridConnector = {
  id: 'sendgrid',
  name: 'SendGrid',
  version: '1.0.0',
  category: 'communication',
  description: 'Send transactional emails with SendGrid',
  color: '#1A82E2',
  icon: 'https://cdn.flowatgenai.com/connectors/sendgrid.svg',
  tags: ['sendgrid', 'email', 'transactional', 'marketing'],

  authentication: {
    type: 'apiKey' as const,
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'password' as const, required: true },
    ],
  },

  actions: {
    sendEmail: {
      name: 'Send Email',
      description: 'Send an email',
      input: z.object({
        toEmail: z.string().email(),
        toName: z.string().optional(),
        fromEmail: z.string().email(),
        fromName: z.string().optional(),
        subject: z.string(),
        text: z.string().optional(),
        html: z.string().optional(),
        categories: z.array(z.string()).optional(),
      }),
      output: z.object({ messageId: z.string() }),
      execute: async (input: { toEmail: string; toName?: string; fromEmail: string; fromName?: string; subject: string; text?: string; html?: string; categories?: string[] }, ctx: { credentials: SendGridCredentials }) => {
        const client = new SendGridClient(ctx.credentials);
        return await client.sendEmail({
          to: [{ email: input.toEmail, name: input.toName }],
          from: { email: input.fromEmail, name: input.fromName },
          subject: input.subject,
          text: input.text,
          html: input.html,
          categories: input.categories,
        });
      },
    },

    sendTemplateEmail: {
      name: 'Send Template Email',
      description: 'Send an email using a template',
      input: z.object({
        toEmail: z.string().email(),
        toName: z.string().optional(),
        fromEmail: z.string().email(),
        fromName: z.string().optional(),
        templateId: z.string(),
        templateData: z.record(z.unknown()),
      }),
      output: z.object({ messageId: z.string() }),
      execute: async (input: { toEmail: string; toName?: string; fromEmail: string; fromName?: string; templateId: string; templateData: Record<string, unknown> }, ctx: { credentials: SendGridCredentials }) => {
        const client = new SendGridClient(ctx.credentials);
        return await client.sendTemplateEmail({
          to: [{ email: input.toEmail, name: input.toName }],
          from: { email: input.fromEmail, name: input.fromName },
          templateId: input.templateId,
          dynamicTemplateData: input.templateData,
        });
      },
    },

    getContacts: {
      name: 'Get Contacts',
      description: 'Get marketing contacts',
      input: z.object({ pageSize: z.number().default(50) }),
      output: z.object({ contacts: z.array(z.object({ id: z.string(), email: z.string(), firstName: z.string(), lastName: z.string() })) }),
      execute: async (input: { pageSize?: number }, ctx: { credentials: SendGridCredentials }) => {
        const client = new SendGridClient(ctx.credentials);
        const contacts = await client.getContacts(input.pageSize);
        return { contacts };
      },
    },

    addContact: {
      name: 'Add Contact',
      description: 'Add a contact to marketing lists',
      input: z.object({
        email: z.string().email(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        listIds: z.array(z.string()).optional(),
      }),
      output: z.object({ jobId: z.string() }),
      execute: async (input: { email: string; firstName?: string; lastName?: string; listIds?: string[] }, ctx: { credentials: SendGridCredentials }) => {
        const client = new SendGridClient(ctx.credentials);
        return await client.addContact(input);
      },
    },

    getLists: {
      name: 'Get Lists',
      description: 'Get marketing lists',
      input: z.object({}),
      output: z.object({ lists: z.array(z.object({ id: z.string(), name: z.string(), contactCount: z.number() })) }),
      execute: async (_input: unknown, ctx: { credentials: SendGridCredentials }) => {
        const client = new SendGridClient(ctx.credentials);
        const lists = await client.getLists();
        return { lists };
      },
    },

    createList: {
      name: 'Create List',
      description: 'Create a marketing list',
      input: z.object({ name: z.string() }),
      output: z.object({ id: z.string(), name: z.string() }),
      execute: async (input: { name: string }, ctx: { credentials: SendGridCredentials }) => {
        const client = new SendGridClient(ctx.credentials);
        return await client.createList(input.name);
      },
    },

    getStats: {
      name: 'Get Stats',
      description: 'Get email statistics',
      input: z.object({ startDate: z.string(), endDate: z.string() }),
      output: z.object({
        requests: z.number(),
        delivered: z.number(),
        opens: z.number(),
        clicks: z.number(),
        bounces: z.number(),
      }),
      execute: async (input: { startDate: string; endDate: string }, ctx: { credentials: SendGridCredentials }) => {
        const client = new SendGridClient(ctx.credentials);
        return await client.getStats(input.startDate, input.endDate);
      },
    },

    getTemplates: {
      name: 'Get Templates',
      description: 'Get email templates',
      input: z.object({}),
      output: z.object({ templates: z.array(z.object({ id: z.string(), name: z.string() })) }),
      execute: async (_input: unknown, ctx: { credentials: SendGridCredentials }) => {
        const client = new SendGridClient(ctx.credentials);
        const templates = await client.getTemplates();
        return { templates };
      },
    },

    validateEmail: {
      name: 'Validate Email',
      description: 'Validate an email address',
      input: z.object({ email: z.string().email() }),
      output: z.object({ valid: z.boolean(), score: z.number(), result: z.string() }),
      execute: async (input: { email: string }, ctx: { credentials: SendGridCredentials }) => {
        const client = new SendGridClient(ctx.credentials);
        return await client.validateEmail(input.email);
      },
    },
  },
};

export default sendgridConnector;
