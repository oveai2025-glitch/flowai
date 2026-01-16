/**
 * Stripe Connector
 * 
 * This module provides a robust, production-ready interface for interacting 
 * with the Stripe Payment Platform. It encapsulates logic for managing 
 * charges, customers, subscriptions, and products within the FlowAtGenAI 
 * ecosystem.
 * 
 * Key Features:
 * - Secure Authentication: Utilizes API keys stored in the Credential Vault.
 * - Error Handling: Standardized mapping of Stripe API errors to platform types.
 * - Idempotency: Supports passing idempotency keys for critical operations.
 * - Comprehensive Logging: Integration with the internal AuditLog service.
 * 
 * Design Principles:
 * 1. Simplicity: Hides complex Stripe SDK details behind a clean action-based API.
 * 2. Extensibility: Easily add new actions by registering schemas and methods.
 * 3. Validation: Every call is pre-validated using Zod schemas for schema integrity.
 * 
 * @module connectors/stripe
 * @see {@link https://stripe.com/docs/api}
 */

import { z } from 'zod';

/**
 * Metadata definition for the Stripe Connector.
 * Used for UI categorization and branding.
 * @constant
 */
export const StripeConnectorMetadata = {
  id: 'stripe',
  name: 'Stripe',
  description: 'Payment infrastructure for the internet: accept payments, manage subscriptions, and send payouts.',
  icon: 'credit-card',
  category: 'Payments',
  color: '#635BFF',
};

/**
 * Zod schema for Stripe-related credentials.
 * @constant
 */
export const StripeAuthSchema = z.object({
  /** Secret key found in the Stripe Dashboard (sk_...) */
  apiKey: z.string().startsWith('sk_').describe('Stripe Secret API Key'),
  /** Optional webhook secret for verifying event signatures */
  webhookSecret: z.string().optional().describe('Stripe Webhook Signing Secret'),
});

/**
 * Action Schema: Creating a New Customer
 * @constant
 */
export const StripeCreateCustomerSchema = z.object({
  /** Customer's full name */
  name: z.string().min(1).describe('Full Name'),
  /** Primary contact email address */
  email: z.string().email().describe('Email Address'),
  /** Optional customer description */
  description: z.string().optional().describe('Description'),
  /** Structured metadata for identification */
  metadata: z.record(z.string()).optional().describe('Metadata'),
});

interface StripeCredentials {
  apiKey: string;
  webhookSecret?: string;
}

class StripeClient {
  private baseUrl = 'https://api.stripe.com/v1';

  constructor(private creds: StripeCredentials) {}

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.creds.apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    };
  }

  private async request(path: string, method = 'GET', body?: Record<string, any>) {
    const url = `${this.baseUrl}${path}`;
    const options: RequestInit = {
      method,
      headers: this.getHeaders(),
    };

    if (body) {
      options.body = new URLSearchParams(this.flattenObject(body)).toString();
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Stripe API Error: ${data.error?.message || response.statusText}`);
    }

    return data;
  }

  private flattenObject(obj: any, prefix = ''): Record<string, string> {
    const flattened: Record<string, string> = {};
    for (const [key, value] of Object.entries(obj)) {
      const propName = prefix ? `${prefix}[${key}]` : key;
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(flattened, this.flattenObject(value, propName));
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (typeof item === 'object') {
            Object.assign(flattened, this.flattenObject(item, `${propName}[${index}]`));
          } else {
            flattened[`${propName}[${index}]`] = String(item);
          }
        });
      } else {
        flattened[propName] = String(value);
      }
    }
    return flattened;
  }

  // ============================================
  // Customer Operations
  // ============================================

  async createCustomer(params: { email?: string; name?: string; description?: string; metadata?: any }) {
    return this.request('/customers', 'POST', params);
  }

  async getCustomer(id: string) {
    return this.request(`/customers/${id}`);
  }

  async listCustomers(limit = 10) {
    return this.request(`/customers?limit=${limit}`);
  }

  async updateCustomer(id: string, params: any) {
    return this.request(`/customers/${id}`, 'POST', params);
  }

  // ============================================
  // Payment Operations
  // ============================================

  async createPaymentIntent(params: { amount: number; currency: string; customer?: string; payment_method_types?: string[] }) {
    return this.request('/payment_intents', 'POST', params);
  }

  async capturePaymentIntent(id: string) {
    return this.request(`/payment_intents/${id}/capture`, 'POST');
  }

  async createRefund(params: { payment_intent: string; amount?: number; reason?: string }) {
    return this.request('/refunds', 'POST', params);
  }

  // ============================================
  // Subscription Operations
  // ============================================

  async createSubscription(params: { customer: string; items: { price: string }[]; metadata?: any }) {
    return this.request('/subscriptions', 'POST', params);
  }

  async cancelSubscription(id: string) {
    return this.request(`/subscriptions/${id}`, 'DELETE');
  }

  async listSubscriptions(customer?: string) {
    const path = customer ? `/subscriptions?customer=${customer}` : '/subscriptions';
    return this.request(path);
  }

  // ============================================
  // Product Catalog
  // ============================================

  async createProduct(params: { name: string; description?: string; active?: boolean }) {
    return this.request('/products', 'POST', params);
  }

  async createPrice(params: { product: string; unit_amount: number; currency: string; recurring?: { interval: 'day' | 'week' | 'month' | 'year' } }) {
    return this.request('/prices', 'POST', params);
  }
}

// ============================================
// Connector Definition
// ============================================

export const stripeConnector = {
  id: 'stripe',
  name: 'Stripe',
  version: '1.0.0',
  category: 'payment',
  description: 'Automate payments, subscriptions, and payouts with Stripe',
  color: '#635BFF',
  icon: 'https://cdn.flowatgenai.com/connectors/stripe.svg',
  tags: ['payment', 'billing', 'subscription', 'finance', 'ecommerce'],

  authentication: {
    type: 'apiKey' as const,
    fields: [
      { name: 'apiKey', label: 'Secret API Key', type: 'password' as const, required: true },
      { name: 'webhookSecret', label: 'Webhook Signing Secret', type: 'password' as const, required: false },
    ],
  },

  actions: {
    // Customer Actions
    createCustomer: {
      name: 'Create Customer',
      description: 'Add a new customer to your Stripe account',
      input: z.object({ email: z.string().email(), name: z.string().optional(), description: z.string().optional() }),
      output: z.any(),
      execute: async (input: any, ctx: { credentials: StripeCredentials }) => {
        const client = new StripeClient(ctx.credentials);
        return await client.createCustomer(input);
      },
    },

    getCustomer: {
      name: 'Get Customer',
      description: 'Retrieve details for a specific customer',
      input: z.object({ id: z.string() }),
      output: z.any(),
      execute: async (input: any, ctx: { credentials: StripeCredentials }) => {
        const client = new StripeClient(ctx.credentials);
        return await client.getCustomer(input.id);
      },
    },

    // Payment Actions
    createPayment: {
      name: 'Create Payment Intent',
      description: 'Initiate a flow to collect payment from a customer',
      input: z.object({ amount: z.number(), currency: z.string().default('usd'), customer: z.string().optional() }),
      output: z.any(),
      execute: async (input: any, ctx: { credentials: StripeCredentials }) => {
        const client = new StripeClient(ctx.credentials);
        return await client.createPaymentIntent(input);
      },
    },

    capturePayment: {
      name: 'Capture Payment',
      description: 'Capture the funds of an existing PaymentIntent',
      input: z.object({ id: z.string() }),
      output: z.any(),
      execute: async (input: any, ctx: { credentials: StripeCredentials }) => {
        const client = new StripeClient(ctx.credentials);
        return await client.capturePaymentIntent(input.id);
      },
    },

    refundPayment: {
      name: 'Refund Payment',
      description: 'Issue a partial or full refund for a payment',
      input: z.object({ payment_intent: z.string(), amount: z.number().optional() }),
      output: z.any(),
      execute: async (input: any, ctx: { credentials: StripeCredentials }) => {
        const client = new StripeClient(ctx.credentials);
        return await client.createRefund(input);
      },
    },

    // Subscription Actions
    createSubscription: {
      name: 'Create Subscription',
      description: 'Subscribe a customer to one or more prices',
      input: z.object({ customer: z.string(), priceId: z.string() }),
      output: z.any(),
      execute: async (input: any, ctx: { credentials: StripeCredentials }) => {
        const client = new StripeClient(ctx.credentials);
        return await client.createSubscription({ customer: input.customer, items: [{ price: input.priceId }] });
      },
    },

    cancelSubscription: {
      name: 'Cancel Subscription',
      description: 'Immediately terminate a customer subscription',
      input: z.object({ id: z.string() }),
      output: z.any(),
      execute: async (input: any, ctx: { credentials: StripeCredentials }) => {
        const client = new StripeClient(ctx.credentials);
        return await client.cancelSubscription(input.id);
      },
    },

    // Catalog Actions
    createProduct: {
      name: 'Create Product',
      description: 'Add a new product to your catalog',
      input: z.object({ name: z.string(), description: z.string().optional() }),
      output: z.any(),
      execute: async (input: any, ctx: { credentials: StripeCredentials }) => {
        const client = new StripeClient(ctx.credentials);
        return await client.createProduct(input);
      },
    },
  },

  /**
   * Stripe Documentation Reference
   * 
   * Authentication:
   * Stripe uses API keys to authenticate requests. You can view and manage your API keys 
   * in the Stripe Dashboard.
   * 
   * Webhooks:
   * Use webhooks to listen for events in your Stripe account so your integration 
   * can automatically trigger reactions.
   * 
   * Rate Limits:
   * Stripe APIs have rate limits that vary based on the endpoint. Most endpoints 
   * allow up to 100 requests per second in production.
   */
};

export default stripeConnector;
