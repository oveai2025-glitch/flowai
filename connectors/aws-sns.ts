/**
 * AWS SNS Connector
 * 
 * Send notifications via AWS Simple Notification Service.
 * 
 * @module connectors/aws-sns
 */

import { z } from 'zod';

interface SNSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

class SNSClient {
  private credentials: SNSCredentials;
  private endpoint: string;

  constructor(credentials: SNSCredentials) {
    this.credentials = credentials;
    this.endpoint = `https://sns.${credentials.region}.amazonaws.com`;
  }

  async publish(params: {
    topicArn?: string;
    targetArn?: string;
    phoneNumber?: string;
    message: string;
    subject?: string;
    messageAttributes?: Record<string, { DataType: string; StringValue: string }>;
  }): Promise<{ messageId: string }> {
    const formData = new URLSearchParams();
    formData.append('Action', 'Publish');
    formData.append('Message', params.message);
    
    if (params.topicArn) formData.append('TopicArn', params.topicArn);
    if (params.targetArn) formData.append('TargetArn', params.targetArn);
    if (params.phoneNumber) formData.append('PhoneNumber', params.phoneNumber);
    if (params.subject) formData.append('Subject', params.subject);

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    const text = await response.text();
    const messageIdMatch = text.match(/<MessageId>(.*?)<\/MessageId>/);
    return { messageId: messageIdMatch ? messageIdMatch[1] : '' };
  }

  async createTopic(name: string): Promise<{ topicArn: string }> {
    const formData = new URLSearchParams();
    formData.append('Action', 'CreateTopic');
    formData.append('Name', name);

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    const text = await response.text();
    const arnMatch = text.match(/<TopicArn>(.*?)<\/TopicArn>/);
    return { topicArn: arnMatch ? arnMatch[1] : '' };
  }

  async deleteTopic(topicArn: string): Promise<void> {
    const formData = new URLSearchParams();
    formData.append('Action', 'DeleteTopic');
    formData.append('TopicArn', topicArn);

    await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });
  }

  async listTopics(): Promise<Array<{ topicArn: string }>> {
    const formData = new URLSearchParams();
    formData.append('Action', 'ListTopics');

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    const text = await response.text();
    const topics: Array<{ topicArn: string }> = [];
    const matches = text.matchAll(/<TopicArn>(.*?)<\/TopicArn>/g);
    for (const match of matches) {
      topics.push({ topicArn: match[1] });
    }
    return topics;
  }

  async subscribe(params: {
    topicArn: string;
    protocol: 'email' | 'sms' | 'http' | 'https' | 'lambda' | 'sqs';
    endpoint: string;
  }): Promise<{ subscriptionArn: string }> {
    const formData = new URLSearchParams();
    formData.append('Action', 'Subscribe');
    formData.append('TopicArn', params.topicArn);
    formData.append('Protocol', params.protocol);
    formData.append('Endpoint', params.endpoint);

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    const text = await response.text();
    const arnMatch = text.match(/<SubscriptionArn>(.*?)<\/SubscriptionArn>/);
    return { subscriptionArn: arnMatch ? arnMatch[1] : 'pending confirmation' };
  }

  async unsubscribe(subscriptionArn: string): Promise<void> {
    const formData = new URLSearchParams();
    formData.append('Action', 'Unsubscribe');
    formData.append('SubscriptionArn', subscriptionArn);

    await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });
  }

  async listSubscriptions(topicArn?: string): Promise<Array<{
    subscriptionArn: string;
    owner: string;
    protocol: string;
    endpoint: string;
    topicArn: string;
  }>> {
    const formData = new URLSearchParams();
    formData.append('Action', topicArn ? 'ListSubscriptionsByTopic' : 'ListSubscriptions');
    if (topicArn) formData.append('TopicArn', topicArn);

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    const text = await response.text();
    const subscriptions: Array<{
      subscriptionArn: string;
      owner: string;
      protocol: string;
      endpoint: string;
      topicArn: string;
    }> = [];

    const memberMatches = text.matchAll(/<member>([\s\S]*?)<\/member>/g);
    for (const memberMatch of memberMatches) {
      const member = memberMatch[1];
      const arnMatch = member.match(/<SubscriptionArn>(.*?)<\/SubscriptionArn>/);
      const ownerMatch = member.match(/<Owner>(.*?)<\/Owner>/);
      const protocolMatch = member.match(/<Protocol>(.*?)<\/Protocol>/);
      const endpointMatch = member.match(/<Endpoint>(.*?)<\/Endpoint>/);
      const topicMatch = member.match(/<TopicArn>(.*?)<\/TopicArn>/);

      subscriptions.push({
        subscriptionArn: arnMatch ? arnMatch[1] : '',
        owner: ownerMatch ? ownerMatch[1] : '',
        protocol: protocolMatch ? protocolMatch[1] : '',
        endpoint: endpointMatch ? endpointMatch[1] : '',
        topicArn: topicMatch ? topicMatch[1] : '',
      });
    }

    return subscriptions;
  }

  async sendSMS(phoneNumber: string, message: string): Promise<{ messageId: string }> {
    return this.publish({ phoneNumber, message });
  }
}

export const awsSnsConnector = {
  id: 'aws-sns',
  name: 'AWS SNS',
  version: '1.0.0',
  category: 'communication',
  description: 'Send notifications via AWS Simple Notification Service',
  color: '#D93F6D',
  icon: 'https://cdn.flowatgenai.com/connectors/aws-sns.svg',
  tags: ['aws', 'sns', 'notifications', 'push', 'sms'],

  authentication: {
    type: 'custom' as const,
    fields: [
      { name: 'accessKeyId', label: 'Access Key ID', type: 'string' as const, required: true },
      { name: 'secretAccessKey', label: 'Secret Access Key', type: 'password' as const, required: true },
      { name: 'region', label: 'Region', type: 'string' as const, required: true, default: 'us-east-1' },
    ],
  },

  actions: {
    publish: {
      name: 'Publish Message',
      description: 'Publish a message to a topic or endpoint',
      input: z.object({
        topicArn: z.string().optional(),
        targetArn: z.string().optional(),
        phoneNumber: z.string().optional(),
        message: z.string(),
        subject: z.string().optional(),
      }),
      output: z.object({ messageId: z.string() }),
      execute: async (input: { topicArn?: string; targetArn?: string; phoneNumber?: string; message: string; subject?: string }, ctx: { credentials: SNSCredentials }) => {
        const client = new SNSClient(ctx.credentials);
        return await client.publish(input);
      },
    },

    sendSMS: {
      name: 'Send SMS',
      description: 'Send an SMS message',
      input: z.object({
        phoneNumber: z.string(),
        message: z.string().max(160),
      }),
      output: z.object({ messageId: z.string() }),
      execute: async (input: { phoneNumber: string; message: string }, ctx: { credentials: SNSCredentials }) => {
        const client = new SNSClient(ctx.credentials);
        return await client.sendSMS(input.phoneNumber, input.message);
      },
    },

    createTopic: {
      name: 'Create Topic',
      description: 'Create a new SNS topic',
      input: z.object({ name: z.string() }),
      output: z.object({ topicArn: z.string() }),
      execute: async (input: { name: string }, ctx: { credentials: SNSCredentials }) => {
        const client = new SNSClient(ctx.credentials);
        return await client.createTopic(input.name);
      },
    },

    deleteTopic: {
      name: 'Delete Topic',
      description: 'Delete an SNS topic',
      input: z.object({ topicArn: z.string() }),
      output: z.object({ success: z.boolean() }),
      execute: async (input: { topicArn: string }, ctx: { credentials: SNSCredentials }) => {
        const client = new SNSClient(ctx.credentials);
        await client.deleteTopic(input.topicArn);
        return { success: true };
      },
    },

    listTopics: {
      name: 'List Topics',
      description: 'List all SNS topics',
      input: z.object({}),
      output: z.object({ topics: z.array(z.object({ topicArn: z.string() })) }),
      execute: async (_input: unknown, ctx: { credentials: SNSCredentials }) => {
        const client = new SNSClient(ctx.credentials);
        const topics = await client.listTopics();
        return { topics };
      },
    },

    subscribe: {
      name: 'Subscribe',
      description: 'Subscribe an endpoint to a topic',
      input: z.object({
        topicArn: z.string(),
        protocol: z.enum(['email', 'sms', 'http', 'https', 'lambda', 'sqs']),
        endpoint: z.string(),
      }),
      output: z.object({ subscriptionArn: z.string() }),
      execute: async (input: { topicArn: string; protocol: 'email' | 'sms' | 'http' | 'https' | 'lambda' | 'sqs'; endpoint: string }, ctx: { credentials: SNSCredentials }) => {
        const client = new SNSClient(ctx.credentials);
        return await client.subscribe(input);
      },
    },

    unsubscribe: {
      name: 'Unsubscribe',
      description: 'Unsubscribe from a topic',
      input: z.object({ subscriptionArn: z.string() }),
      output: z.object({ success: z.boolean() }),
      execute: async (input: { subscriptionArn: string }, ctx: { credentials: SNSCredentials }) => {
        const client = new SNSClient(ctx.credentials);
        await client.unsubscribe(input.subscriptionArn);
        return { success: true };
      },
    },

    listSubscriptions: {
      name: 'List Subscriptions',
      description: 'List subscriptions',
      input: z.object({ topicArn: z.string().optional() }),
      output: z.object({
        subscriptions: z.array(z.object({
          subscriptionArn: z.string(),
          owner: z.string(),
          protocol: z.string(),
          endpoint: z.string(),
          topicArn: z.string(),
        })),
      }),
      execute: async (input: { topicArn?: string }, ctx: { credentials: SNSCredentials }) => {
        const client = new SNSClient(ctx.credentials);
        const subscriptions = await client.listSubscriptions(input.topicArn);
        return { subscriptions };
      },
    },
  },
};

export default awsSnsConnector;
