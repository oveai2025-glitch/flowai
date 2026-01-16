/**
 * AWS SES Connector
 * 
 * Send emails using AWS Simple Email Service.
 * 
 * @module connectors/aws-ses
 */

import { z } from 'zod';

interface SESCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

class SESClient {
  private credentials: SESCredentials;
  private endpoint: string;

  constructor(credentials: SESCredentials) {
    this.credentials = credentials;
    this.endpoint = `https://email.${credentials.region}.amazonaws.com`;
  }

  async sendEmail(params: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    from: string;
    subject: string;
    bodyText?: string;
    bodyHtml?: string;
    replyTo?: string[];
  }): Promise<{ messageId: string }> {
    const url = `${this.endpoint}/v2/email/outbound-emails`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        Destination: {
          ToAddresses: params.to,
          CcAddresses: params.cc,
          BccAddresses: params.bcc,
        },
        FromEmailAddress: params.from,
        ReplyToAddresses: params.replyTo,
        Content: {
          Simple: {
            Subject: { Data: params.subject },
            Body: {
              Text: params.bodyText ? { Data: params.bodyText } : undefined,
              Html: params.bodyHtml ? { Data: params.bodyHtml } : undefined,
            },
          },
        },
      }),
    });

    const data = await response.json();
    return { messageId: data.MessageId };
  }

  async sendTemplatedEmail(params: {
    to: string[];
    from: string;
    templateName: string;
    templateData: Record<string, string>;
  }): Promise<{ messageId: string }> {
    const url = `${this.endpoint}/v2/email/outbound-emails`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        Destination: { ToAddresses: params.to },
        FromEmailAddress: params.from,
        Content: {
          Template: {
            TemplateName: params.templateName,
            TemplateData: JSON.stringify(params.templateData),
          },
        },
      }),
    });

    const data = await response.json();
    return { messageId: data.MessageId };
  }

  async listIdentities(): Promise<string[]> {
    const url = `${this.endpoint}/v2/email/identities`;
    const response = await fetch(url);
    const data = await response.json();
    return data.EmailIdentities?.map((i: { IdentityName: string }) => i.IdentityName) || [];
  }

  async verifyEmailIdentity(email: string): Promise<void> {
    const url = `${this.endpoint}/v2/email/identities`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ EmailIdentity: email }),
    });
  }

  async getSendQuota(): Promise<{
    max24HourSend: number;
    maxSendRate: number;
    sentLast24Hours: number;
  }> {
    const url = `${this.endpoint}/v2/email/account`;
    const response = await fetch(url);
    const data = await response.json();
    return {
      max24HourSend: data.SendQuota?.Max24HourSend || 0,
      maxSendRate: data.SendQuota?.MaxSendRate || 0,
      sentLast24Hours: data.SendQuota?.SentLast24Hours || 0,
    };
  }

  async createTemplate(params: {
    templateName: string;
    subject: string;
    bodyText?: string;
    bodyHtml?: string;
  }): Promise<void> {
    const url = `${this.endpoint}/v2/email/templates`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        TemplateName: params.templateName,
        TemplateContent: {
          Subject: params.subject,
          Text: params.bodyText,
          Html: params.bodyHtml,
        },
      }),
    });
  }

  async deleteTemplate(templateName: string): Promise<void> {
    const url = `${this.endpoint}/v2/email/templates/${templateName}`;
    await fetch(url, { method: 'DELETE' });
  }

  async listTemplates(): Promise<Array<{ templateName: string; createdTimestamp: string }>> {
    const url = `${this.endpoint}/v2/email/templates`;
    const response = await fetch(url);
    const data = await response.json();
    return data.TemplatesMetadata || [];
  }
}

export const awsSesConnector = {
  id: 'aws-ses',
  name: 'AWS SES',
  version: '1.0.0',
  category: 'communication',
  description: 'Send emails with AWS Simple Email Service',
  color: '#DD344C',
  icon: 'https://cdn.flowatgenai.com/connectors/aws-ses.svg',
  tags: ['aws', 'email', 'ses', 'communication'],

  authentication: {
    type: 'custom' as const,
    fields: [
      { name: 'accessKeyId', label: 'Access Key ID', type: 'string' as const, required: true },
      { name: 'secretAccessKey', label: 'Secret Access Key', type: 'password' as const, required: true },
      { name: 'region', label: 'Region', type: 'string' as const, required: true, default: 'us-east-1' },
    ],
  },

  actions: {
    sendEmail: {
      name: 'Send Email',
      description: 'Send an email',
      input: z.object({
        to: z.array(z.string().email()),
        cc: z.array(z.string().email()).optional(),
        bcc: z.array(z.string().email()).optional(),
        from: z.string().email(),
        subject: z.string(),
        bodyText: z.string().optional(),
        bodyHtml: z.string().optional(),
        replyTo: z.array(z.string().email()).optional(),
      }),
      output: z.object({ messageId: z.string() }),
      execute: async (input: { to: string[]; cc?: string[]; bcc?: string[]; from: string; subject: string; bodyText?: string; bodyHtml?: string; replyTo?: string[] }, ctx: { credentials: SESCredentials }) => {
        const client = new SESClient(ctx.credentials);
        return await client.sendEmail(input);
      },
    },

    sendTemplatedEmail: {
      name: 'Send Templated Email',
      description: 'Send an email using a template',
      input: z.object({
        to: z.array(z.string().email()),
        from: z.string().email(),
        templateName: z.string(),
        templateData: z.record(z.string()),
      }),
      output: z.object({ messageId: z.string() }),
      execute: async (input: { to: string[]; from: string; templateName: string; templateData: Record<string, string> }, ctx: { credentials: SESCredentials }) => {
        const client = new SESClient(ctx.credentials);
        return await client.sendTemplatedEmail(input);
      },
    },

    listIdentities: {
      name: 'List Identities',
      description: 'List verified email identities',
      input: z.object({}),
      output: z.object({ identities: z.array(z.string()) }),
      execute: async (_input: unknown, ctx: { credentials: SESCredentials }) => {
        const client = new SESClient(ctx.credentials);
        const identities = await client.listIdentities();
        return { identities };
      },
    },

    verifyEmailIdentity: {
      name: 'Verify Email Identity',
      description: 'Send verification email to an address',
      input: z.object({ email: z.string().email() }),
      output: z.object({ success: z.boolean() }),
      execute: async (input: { email: string }, ctx: { credentials: SESCredentials }) => {
        const client = new SESClient(ctx.credentials);
        await client.verifyEmailIdentity(input.email);
        return { success: true };
      },
    },

    getSendQuota: {
      name: 'Get Send Quota',
      description: 'Get sending limits and usage',
      input: z.object({}),
      output: z.object({
        max24HourSend: z.number(),
        maxSendRate: z.number(),
        sentLast24Hours: z.number(),
      }),
      execute: async (_input: unknown, ctx: { credentials: SESCredentials }) => {
        const client = new SESClient(ctx.credentials);
        return await client.getSendQuota();
      },
    },

    createTemplate: {
      name: 'Create Template',
      description: 'Create an email template',
      input: z.object({
        templateName: z.string(),
        subject: z.string(),
        bodyText: z.string().optional(),
        bodyHtml: z.string().optional(),
      }),
      output: z.object({ success: z.boolean() }),
      execute: async (input: { templateName: string; subject: string; bodyText?: string; bodyHtml?: string }, ctx: { credentials: SESCredentials }) => {
        const client = new SESClient(ctx.credentials);
        await client.createTemplate(input);
        return { success: true };
      },
    },

    deleteTemplate: {
      name: 'Delete Template',
      description: 'Delete an email template',
      input: z.object({ templateName: z.string() }),
      output: z.object({ success: z.boolean() }),
      execute: async (input: { templateName: string }, ctx: { credentials: SESCredentials }) => {
        const client = new SESClient(ctx.credentials);
        await client.deleteTemplate(input.templateName);
        return { success: true };
      },
    },

    listTemplates: {
      name: 'List Templates',
      description: 'List email templates',
      input: z.object({}),
      output: z.object({
        templates: z.array(z.object({
          templateName: z.string(),
          createdTimestamp: z.string(),
        })),
      }),
      execute: async (_input: unknown, ctx: { credentials: SESCredentials }) => {
        const client = new SESClient(ctx.credentials);
        const templates = await client.listTemplates();
        return { templates };
      },
    },
  },
};

export default awsSesConnector;
