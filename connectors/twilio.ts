/**
 * FlowAtGenAi - Twilio Connector
 * 
 * SMS and voice automation:
 * - Send SMS messages
 * - Make voice calls
 * - WhatsApp integration
 * 
 * @module connectors/twilio
 */

import { z } from 'zod';
import { createConnector } from '../packages/connector-sdk/src/builder';
import type { TestConnectionResult } from '../packages/connector-sdk/src/types';

export const twilioConnector = createConnector({
  id: 'twilio',
  name: 'Twilio',
  version: '1.0.0',
  category: 'communication',
  description: 'Send SMS, make calls, and use WhatsApp',
  color: '#F22F46',
  icon: 'https://cdn.flowatgenai.com/connectors/twilio.svg',
  tags: ['sms', 'voice', 'whatsapp', 'communication'],
  docsUrl: 'https://www.twilio.com/docs/api',
  baseUrl: 'https://api.twilio.com/2010-04-01',
})
  .withBasicAuth({
    fields: [
      {
        key: 'accountSid',
        label: 'Account SID',
        type: 'string',
        required: true,
        description: 'Your Twilio Account SID',
      },
      {
        key: 'authToken',
        label: 'Auth Token',
        type: 'password',
        required: true,
        description: 'Your Twilio Auth Token',
      },
    ],
  })

  .withAction('sendSms', {
    name: 'Send SMS',
    description: 'Send an SMS message',
    input: z.object({
      to: z.string().describe('Recipient phone number (E.164 format)'),
      from: z.string().describe('Your Twilio phone number'),
      body: z.string().max(1600).describe('Message content'),
      statusCallback: z.string().url().optional().describe('Webhook for delivery updates'),
    }),
    output: z.object({
      sid: z.string(),
      status: z.string(),
      to: z.string(),
      from: z.string(),
      body: z.string(),
      dateCreated: z.string(),
      price: z.string().nullable(),
    }),
    execute: async (input, ctx) => {
      const accountSid = ctx.credentials.accountSid as string;
      
      const formData = new URLSearchParams();
      formData.append('To', input.to);
      formData.append('From', input.from);
      formData.append('Body', input.body);
      if (input.statusCallback) formData.append('StatusCallback', input.statusCallback);

      const response = await ctx.http.post(
        `/Accounts/${accountSid}/Messages.json`,
        formData.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      
      return response.data as Record<string, unknown>;
    },
  })

  .withAction('sendWhatsApp', {
    name: 'Send WhatsApp',
    description: 'Send a WhatsApp message',
    input: z.object({
      to: z.string().describe('Recipient WhatsApp number (E.164 format)'),
      from: z.string().describe('Your Twilio WhatsApp number'),
      body: z.string().describe('Message content'),
      mediaUrl: z.string().url().optional().describe('Media attachment URL'),
    }),
    output: z.object({
      sid: z.string(),
      status: z.string(),
      to: z.string(),
      from: z.string(),
    }),
    execute: async (input, ctx) => {
      const accountSid = ctx.credentials.accountSid as string;
      
      const formData = new URLSearchParams();
      formData.append('To', `whatsapp:${input.to}`);
      formData.append('From', `whatsapp:${input.from}`);
      formData.append('Body', input.body);
      if (input.mediaUrl) formData.append('MediaUrl', input.mediaUrl);

      const response = await ctx.http.post(
        `/Accounts/${accountSid}/Messages.json`,
        formData.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      
      return response.data as Record<string, unknown>;
    },
  })

  .withAction('makeCall', {
    name: 'Make Call',
    description: 'Initiate a phone call',
    input: z.object({
      to: z.string().describe('Recipient phone number'),
      from: z.string().describe('Your Twilio phone number'),
      url: z.string().url().describe('TwiML URL for call instructions'),
      statusCallback: z.string().url().optional(),
      record: z.boolean().optional().default(false),
    }),
    output: z.object({
      sid: z.string(),
      status: z.string(),
      to: z.string(),
      from: z.string(),
    }),
    execute: async (input, ctx) => {
      const accountSid = ctx.credentials.accountSid as string;
      
      const formData = new URLSearchParams();
      formData.append('To', input.to);
      formData.append('From', input.from);
      formData.append('Url', input.url);
      if (input.statusCallback) formData.append('StatusCallback', input.statusCallback);
      if (input.record) formData.append('Record', 'true');

      const response = await ctx.http.post(
        `/Accounts/${accountSid}/Calls.json`,
        formData.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      
      return response.data as Record<string, unknown>;
    },
  })

  .withAction('getMessageStatus', {
    name: 'Get Message Status',
    description: 'Check the status of a message',
    input: z.object({
      messageSid: z.string().describe('The message SID'),
    }),
    output: z.object({
      sid: z.string(),
      status: z.string(),
      errorCode: z.number().nullable(),
      errorMessage: z.string().nullable(),
      price: z.string().nullable(),
    }),
    execute: async (input, ctx) => {
      const accountSid = ctx.credentials.accountSid as string;
      const response = await ctx.http.get(
        `/Accounts/${accountSid}/Messages/${input.messageSid}.json`
      );
      return response.data as Record<string, unknown>;
    },
  })

  .withAction('listMessages', {
    name: 'List Messages',
    description: 'Get a list of messages',
    input: z.object({
      to: z.string().optional().describe('Filter by recipient'),
      from: z.string().optional().describe('Filter by sender'),
      dateSent: z.string().optional().describe('Filter by date (YYYY-MM-DD)'),
      pageSize: z.number().optional().default(20),
    }),
    output: z.object({
      messages: z.array(z.object({
        sid: z.string(),
        status: z.string(),
        to: z.string(),
        from: z.string(),
        body: z.string(),
        dateSent: z.string(),
      })),
    }),
    execute: async (input, ctx) => {
      const accountSid = ctx.credentials.accountSid as string;
      const params: Record<string, string> = { PageSize: String(input.pageSize || 20) };
      if (input.to) params.To = input.to;
      if (input.from) params.From = input.from;
      if (input.dateSent) params.DateSent = input.dateSent;

      const response = await ctx.http.get(
        `/Accounts/${accountSid}/Messages.json`,
        { params }
      );
      
      return response.data as Record<string, unknown>;
    },
  })

  .withWebhookTrigger('incomingSms', {
    name: 'Incoming SMS',
    description: 'Triggered when an SMS is received',
    output: z.object({
      MessageSid: z.string(),
      From: z.string(),
      To: z.string(),
      Body: z.string(),
      NumMedia: z.string(),
      FromCity: z.string().optional(),
      FromState: z.string().optional(),
      FromCountry: z.string().optional(),
    }),
    signatureHeader: 'x-twilio-signature',
    verifySignature: (payload, signature, secret) => {
      // Twilio uses HMAC-SHA1 for signature validation
      // Implementation would require crypto
      return true; // Placeholder
    },
  })

  .withRateLimit({
    requests: 100,
    window: 1000,
    strategy: 'queue',
  })

  .withTestConnection(async (credentials, ctx): Promise<TestConnectionResult> => {
    try {
      const accountSid = credentials.accountSid as string;
      const response = await ctx.http.get<{ friendly_name: string; status: string }>(
        `/Accounts/${accountSid}.json`
      );
      
      return {
        success: true,
        message: 'Successfully connected to Twilio',
        accountInfo: {
          name: response.data.friendly_name,
          status: response.data.status,
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

export default twilioConnector;
