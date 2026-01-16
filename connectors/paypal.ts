/**
 * PayPal Connector
 * 
 * Payment processing with PayPal.
 * 
 * @module connectors/paypal
 */

import { z } from 'zod';

interface PayPalCredentials {
  clientId: string;
  clientSecret: string;
  sandbox: boolean;
}

class PayPalClient {
  private credentials: PayPalCredentials;
  private baseUrl: string;
  private accessToken: string | null = null;

  constructor(credentials: PayPalCredentials) {
    this.credentials = credentials;
    this.baseUrl = credentials.sandbox
      ? 'https://api-m.sandbox.paypal.com'
      : 'https://api-m.paypal.com';
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken) return this.accessToken;

    const auth = Buffer.from(`${this.credentials.clientId}:${this.credentials.clientSecret}`).toString('base64');
    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    const data = await response.json();
    this.accessToken = data.access_token;
    return this.accessToken!;
  }

  private async request(method: string, path: string, body?: unknown): Promise<unknown> {
    const token = await this.getAccessToken();
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || response.statusText);
    }

    if (response.status === 204) return {};
    return await response.json();
  }

  async createOrder(params: {
    intent: 'CAPTURE' | 'AUTHORIZE';
    amount: { currency: string; value: string };
    description?: string;
    returnUrl?: string;
    cancelUrl?: string;
  }): Promise<{ id: string; status: string; links: Array<{ href: string; rel: string }> }> {
    const order = await this.request('POST', '/v2/checkout/orders', {
      intent: params.intent,
      purchase_units: [{
        amount: {
          currency_code: params.amount.currency,
          value: params.amount.value,
        },
        description: params.description,
      }],
      application_context: {
        return_url: params.returnUrl,
        cancel_url: params.cancelUrl,
      },
    }) as { id: string; status: string; links: Array<{ href: string; rel: string }> };

    return order;
  }

  async captureOrder(orderId: string): Promise<{
    id: string;
    status: string;
    payer: { email: string; name: { given_name: string; surname: string } };
  }> {
    return await this.request('POST', `/v2/checkout/orders/${orderId}/capture`) as {
      id: string;
      status: string;
      payer: { email: string; name: { given_name: string; surname: string } };
    };
  }

  async getOrder(orderId: string): Promise<{ id: string; status: string; create_time: string; update_time: string }> {
    return await this.request('GET', `/v2/checkout/orders/${orderId}`) as {
      id: string;
      status: string;
      create_time: string;
      update_time: string;
    };
  }

  async refund(captureId: string, amount?: { currency: string; value: string }): Promise<{
    id: string;
    status: string;
  }> {
    const body = amount ? { amount: { currency_code: amount.currency, value: amount.value } } : {};
    return await this.request('POST', `/v2/payments/captures/${captureId}/refund`, body) as {
      id: string;
      status: string;
    };
  }

  async createPayout(params: {
    senderBatchId: string;
    emailSubject: string;
    items: Array<{
      recipientType: 'EMAIL' | 'PHONE' | 'PAYPAL_ID';
      receiver: string;
      amount: { currency: string; value: string };
      note?: string;
    }>;
  }): Promise<{ batchId: string; batchStatus: string }> {
    const result = await this.request('POST', '/v1/payments/payouts', {
      sender_batch_header: {
        sender_batch_id: params.senderBatchId,
        email_subject: params.emailSubject,
      },
      items: params.items.map(item => ({
        recipient_type: item.recipientType,
        receiver: item.receiver,
        amount: {
          currency: item.amount.currency,
          value: item.amount.value,
        },
        note: item.note,
      })),
    }) as { batch_header: { payout_batch_id: string; batch_status: string } };

    return {
      batchId: result.batch_header.payout_batch_id,
      batchStatus: result.batch_header.batch_status,
    };
  }

  async getPayout(payoutId: string): Promise<{ batchId: string; batchStatus: string; items: unknown[] }> {
    const result = await this.request('GET', `/v1/payments/payouts/${payoutId}`) as {
      batch_header: { payout_batch_id: string; batch_status: string };
      items: unknown[];
    };
    return {
      batchId: result.batch_header.payout_batch_id,
      batchStatus: result.batch_header.batch_status,
      items: result.items,
    };
  }

  async createSubscription(params: {
    planId: string;
    startTime?: string;
    returnUrl: string;
    cancelUrl: string;
  }): Promise<{ id: string; status: string; links: Array<{ href: string; rel: string }> }> {
    return await this.request('POST', '/v1/billing/subscriptions', {
      plan_id: params.planId,
      start_time: params.startTime,
      application_context: {
        return_url: params.returnUrl,
        cancel_url: params.cancelUrl,
      },
    }) as { id: string; status: string; links: Array<{ href: string; rel: string }> };
  }

  async cancelSubscription(subscriptionId: string, reason: string): Promise<void> {
    await this.request('POST', `/v1/billing/subscriptions/${subscriptionId}/cancel`, { reason });
  }

  async getSubscription(subscriptionId: string): Promise<{ id: string; status: string; planId: string }> {
    const result = await this.request('GET', `/v1/billing/subscriptions/${subscriptionId}`) as {
      id: string;
      status: string;
      plan_id: string;
    };
    return { id: result.id, status: result.status, planId: result.plan_id };
  }

  async listTransactions(startDate: string, endDate: string): Promise<Array<{
    transactionId: string;
    transactionStatus: string;
    grossAmount: { currency: string; value: string };
  }>> {
    const result = await this.request('GET', `/v1/reporting/transactions?start_date=${startDate}&end_date=${endDate}`) as {
      transaction_details: Array<{
        transaction_info: {
          transaction_id: string;
          transaction_status: string;
          transaction_amount: { currency_code: string; value: string };
        };
      }>;
    };

    return result.transaction_details?.map(t => ({
      transactionId: t.transaction_info.transaction_id,
      transactionStatus: t.transaction_info.transaction_status,
      grossAmount: {
        currency: t.transaction_info.transaction_amount.currency_code,
        value: t.transaction_info.transaction_amount.value,
      },
    })) || [];
  }
}

export const paypalConnector = {
  id: 'paypal',
  name: 'PayPal',
  version: '1.0.0',
  category: 'payment',
  description: 'Payment processing with PayPal',
  color: '#003087',
  icon: 'https://cdn.flowatgenai.com/connectors/paypal.svg',
  tags: ['paypal', 'payment', 'checkout', 'subscriptions'],

  authentication: {
    type: 'custom' as const,
    fields: [
      { name: 'clientId', label: 'Client ID', type: 'string' as const, required: true },
      { name: 'clientSecret', label: 'Client Secret', type: 'password' as const, required: true },
      { name: 'sandbox', label: 'Sandbox Mode', type: 'boolean' as const, required: false, default: true },
    ],
  },

  actions: {
    createOrder: {
      name: 'Create Order',
      description: 'Create a payment order',
      input: z.object({
        intent: z.enum(['CAPTURE', 'AUTHORIZE']).default('CAPTURE'),
        currency: z.string().default('USD'),
        amount: z.string(),
        description: z.string().optional(),
        returnUrl: z.string().optional(),
        cancelUrl: z.string().optional(),
      }),
      output: z.object({
        id: z.string(),
        status: z.string(),
        approveUrl: z.string().optional(),
      }),
      execute: async (input: { intent?: 'CAPTURE' | 'AUTHORIZE'; currency?: string; amount: string; description?: string; returnUrl?: string; cancelUrl?: string }, ctx: { credentials: PayPalCredentials }) => {
        const client = new PayPalClient(ctx.credentials);
        const order = await client.createOrder({
          intent: input.intent || 'CAPTURE',
          amount: { currency: input.currency || 'USD', value: input.amount },
          description: input.description,
          returnUrl: input.returnUrl,
          cancelUrl: input.cancelUrl,
        });
        const approveLink = order.links.find(l => l.rel === 'approve');
        return { id: order.id, status: order.status, approveUrl: approveLink?.href };
      },
    },

    captureOrder: {
      name: 'Capture Order',
      description: 'Capture payment for an order',
      input: z.object({ orderId: z.string() }),
      output: z.object({ id: z.string(), status: z.string(), payerEmail: z.string().optional() }),
      execute: async (input: { orderId: string }, ctx: { credentials: PayPalCredentials }) => {
        const client = new PayPalClient(ctx.credentials);
        const result = await client.captureOrder(input.orderId);
        return { id: result.id, status: result.status, payerEmail: result.payer?.email };
      },
    },

    getOrder: {
      name: 'Get Order',
      description: 'Get order details',
      input: z.object({ orderId: z.string() }),
      output: z.object({ id: z.string(), status: z.string(), createdAt: z.string() }),
      execute: async (input: { orderId: string }, ctx: { credentials: PayPalCredentials }) => {
        const client = new PayPalClient(ctx.credentials);
        const order = await client.getOrder(input.orderId);
        return { id: order.id, status: order.status, createdAt: order.create_time };
      },
    },

    refund: {
      name: 'Refund',
      description: 'Refund a captured payment',
      input: z.object({
        captureId: z.string(),
        currency: z.string().optional(),
        amount: z.string().optional(),
      }),
      output: z.object({ id: z.string(), status: z.string() }),
      execute: async (input: { captureId: string; currency?: string; amount?: string }, ctx: { credentials: PayPalCredentials }) => {
        const client = new PayPalClient(ctx.credentials);
        const amount = input.amount && input.currency ? { currency: input.currency, value: input.amount } : undefined;
        return await client.refund(input.captureId, amount);
      },
    },

    createPayout: {
      name: 'Create Payout',
      description: 'Send money to multiple recipients',
      input: z.object({
        senderBatchId: z.string(),
        emailSubject: z.string(),
        items: z.array(z.object({
          recipientType: z.enum(['EMAIL', 'PHONE', 'PAYPAL_ID']),
          receiver: z.string(),
          currency: z.string(),
          amount: z.string(),
          note: z.string().optional(),
        })),
      }),
      output: z.object({ batchId: z.string(), batchStatus: z.string() }),
      execute: async (input: { senderBatchId: string; emailSubject: string; items: Array<{ recipientType: 'EMAIL' | 'PHONE' | 'PAYPAL_ID'; receiver: string; currency: string; amount: string; note?: string }> }, ctx: { credentials: PayPalCredentials }) => {
        const client = new PayPalClient(ctx.credentials);
        return await client.createPayout({
          senderBatchId: input.senderBatchId,
          emailSubject: input.emailSubject,
          items: input.items.map(i => ({
            recipientType: i.recipientType,
            receiver: i.receiver,
            amount: { currency: i.currency, value: i.amount },
            note: i.note,
          })),
        });
      },
    },

    createSubscription: {
      name: 'Create Subscription',
      description: 'Create a subscription',
      input: z.object({
        planId: z.string(),
        startTime: z.string().optional(),
        returnUrl: z.string(),
        cancelUrl: z.string(),
      }),
      output: z.object({ id: z.string(), status: z.string(), approveUrl: z.string().optional() }),
      execute: async (input: { planId: string; startTime?: string; returnUrl: string; cancelUrl: string }, ctx: { credentials: PayPalCredentials }) => {
        const client = new PayPalClient(ctx.credentials);
        const sub = await client.createSubscription(input);
        const approveLink = sub.links.find(l => l.rel === 'approve');
        return { id: sub.id, status: sub.status, approveUrl: approveLink?.href };
      },
    },

    cancelSubscription: {
      name: 'Cancel Subscription',
      description: 'Cancel a subscription',
      input: z.object({ subscriptionId: z.string(), reason: z.string() }),
      output: z.object({ success: z.boolean() }),
      execute: async (input: { subscriptionId: string; reason: string }, ctx: { credentials: PayPalCredentials }) => {
        const client = new PayPalClient(ctx.credentials);
        await client.cancelSubscription(input.subscriptionId, input.reason);
        return { success: true };
      },
    },

    listTransactions: {
      name: 'List Transactions',
      description: 'List transactions in date range',
      input: z.object({
        startDate: z.string(),
        endDate: z.string(),
      }),
      output: z.object({
        transactions: z.array(z.object({
          transactionId: z.string(),
          transactionStatus: z.string(),
          grossAmount: z.object({ currency: z.string(), value: z.string() }),
        })),
      }),
      execute: async (input: { startDate: string; endDate: string }, ctx: { credentials: PayPalCredentials }) => {
        const client = new PayPalClient(ctx.credentials);
        const transactions = await client.listTransactions(input.startDate, input.endDate);
        return { transactions };
      },
    },
  },
};

export default paypalConnector;
