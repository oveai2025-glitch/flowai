/**
 * FlowAtGenAi - Shopify Connector
 * 
 * Full e-commerce integration:
 * - Orders, Products, Customers
 * - Inventory management
 * - Webhooks for events
 * 
 * @module connectors/shopify
 */

import { z } from 'zod';
import { createConnector } from '../packages/connector-sdk/src/builder';
import type { TestConnectionResult } from '../packages/connector-sdk/src/types';

export const shopifyConnector = createConnector({
  id: 'shopify',
  name: 'Shopify',
  version: '1.0.0',
  category: 'ecommerce',
  description: 'Manage Shopify store orders, products, and customers',
  color: '#96BF48',
  icon: 'https://cdn.flowatgenai.com/connectors/shopify.svg',
  tags: ['ecommerce', 'orders', 'products', 'inventory'],
  docsUrl: 'https://shopify.dev/api/admin-rest',
  baseUrl: 'https://{store}.myshopify.com/admin/api/2024-01',
})
  .withApiKey({
    location: 'header',
    name: 'X-Shopify-Access-Token',
    fields: [
      { key: 'store', label: 'Store Name', type: 'string', required: true, description: 'Your store subdomain (e.g., mystore for mystore.myshopify.com)' },
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
    ],
  })

  // Order Actions
  .withAction('getOrders', {
    name: 'Get Orders',
    description: 'Retrieve orders from your store',
    input: z.object({
      status: z.enum(['open', 'closed', 'cancelled', 'any']).optional().default('any'),
      financialStatus: z.enum(['pending', 'authorized', 'partially_paid', 'paid', 'partially_refunded', 'refunded', 'voided', 'any']).optional(),
      fulfillmentStatus: z.enum(['shipped', 'partial', 'unshipped', 'any', 'unfulfilled']).optional(),
      createdAtMin: z.string().optional(),
      createdAtMax: z.string().optional(),
      limit: z.number().optional().default(50),
    }),
    output: z.object({
      orders: z.array(z.object({
        id: z.number(),
        name: z.string(),
        email: z.string().optional(),
        totalPrice: z.string(),
        financialStatus: z.string(),
        fulfillmentStatus: z.string().nullable(),
        createdAt: z.string(),
      })),
    }),
    execute: async (input, ctx) => {
      const params: Record<string, string> = {
        limit: String(input.limit),
        status: input.status || 'any',
      };
      if (input.financialStatus) params.financial_status = input.financialStatus;
      if (input.fulfillmentStatus) params.fulfillment_status = input.fulfillmentStatus;
      if (input.createdAtMin) params.created_at_min = input.createdAtMin;
      if (input.createdAtMax) params.created_at_max = input.createdAtMax;

      const response = await ctx.http.get('/orders.json', { params });
      return response.data as Record<string, unknown>;
    },
  })

  .withAction('getOrder', {
    name: 'Get Order',
    description: 'Get a single order by ID',
    input: z.object({
      orderId: z.number(),
    }),
    output: z.object({
      order: z.object({
        id: z.number(),
        name: z.string(),
        email: z.string().optional(),
        totalPrice: z.string(),
        lineItems: z.array(z.unknown()),
        customer: z.unknown().optional(),
      }),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.get(`/orders/${input.orderId}.json`);
      return response.data as Record<string, unknown>;
    },
  })

  .withAction('createOrder', {
    name: 'Create Order',
    description: 'Create a new order',
    input: z.object({
      lineItems: z.array(z.object({
        variantId: z.number().optional(),
        title: z.string().optional(),
        quantity: z.number(),
        price: z.string().optional(),
      })),
      customer: z.object({
        id: z.number().optional(),
        email: z.string().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
      }).optional(),
      shippingAddress: z.object({
        firstName: z.string(),
        lastName: z.string(),
        address1: z.string(),
        city: z.string(),
        province: z.string(),
        country: z.string(),
        zip: z.string(),
        phone: z.string().optional(),
      }).optional(),
      financialStatus: z.enum(['pending', 'authorized', 'paid']).optional(),
      sendReceipt: z.boolean().optional().default(false),
      sendFulfillmentReceipt: z.boolean().optional().default(false),
    }),
    output: z.object({
      order: z.object({
        id: z.number(),
        name: z.string(),
        totalPrice: z.string(),
      }),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.post('/orders.json', {
        order: {
          line_items: input.lineItems.map((item) => ({
            variant_id: item.variantId,
            title: item.title,
            quantity: item.quantity,
            price: item.price,
          })),
          customer: input.customer,
          shipping_address: input.shippingAddress,
          financial_status: input.financialStatus,
          send_receipt: input.sendReceipt,
          send_fulfillment_receipt: input.sendFulfillmentReceipt,
        },
      });
      return response.data as Record<string, unknown>;
    },
  })

  .withAction('fulfillOrder', {
    name: 'Fulfill Order',
    description: 'Create a fulfillment for an order',
    input: z.object({
      orderId: z.number(),
      trackingNumber: z.string().optional(),
      trackingCompany: z.string().optional(),
      trackingUrl: z.string().optional(),
      notifyCustomer: z.boolean().optional().default(true),
    }),
    output: z.object({
      fulfillment: z.object({
        id: z.number(),
        status: z.string(),
        trackingNumber: z.string().nullable(),
      }),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.post(`/orders/${input.orderId}/fulfillments.json`, {
        fulfillment: {
          tracking_number: input.trackingNumber,
          tracking_company: input.trackingCompany,
          tracking_url: input.trackingUrl,
          notify_customer: input.notifyCustomer,
        },
      });
      return response.data as Record<string, unknown>;
    },
  })

  // Product Actions
  .withAction('getProducts', {
    name: 'Get Products',
    description: 'Retrieve products from your store',
    input: z.object({
      collectionId: z.number().optional(),
      productType: z.string().optional(),
      vendor: z.string().optional(),
      status: z.enum(['active', 'archived', 'draft']).optional(),
      limit: z.number().optional().default(50),
    }),
    output: z.object({
      products: z.array(z.object({
        id: z.number(),
        title: z.string(),
        vendor: z.string(),
        productType: z.string(),
        status: z.string(),
        variants: z.array(z.unknown()),
      })),
    }),
    execute: async (input, ctx) => {
      const params: Record<string, string> = { limit: String(input.limit) };
      if (input.collectionId) params.collection_id = String(input.collectionId);
      if (input.productType) params.product_type = input.productType;
      if (input.vendor) params.vendor = input.vendor;
      if (input.status) params.status = input.status;

      const response = await ctx.http.get('/products.json', { params });
      return response.data as Record<string, unknown>;
    },
  })

  .withAction('createProduct', {
    name: 'Create Product',
    description: 'Create a new product',
    input: z.object({
      title: z.string(),
      bodyHtml: z.string().optional(),
      vendor: z.string().optional(),
      productType: z.string().optional(),
      tags: z.array(z.string()).optional(),
      variants: z.array(z.object({
        title: z.string().optional(),
        price: z.string(),
        sku: z.string().optional(),
        inventoryQuantity: z.number().optional(),
        weight: z.number().optional(),
        weightUnit: z.enum(['g', 'kg', 'lb', 'oz']).optional(),
      })).optional(),
      images: z.array(z.object({
        src: z.string(),
        alt: z.string().optional(),
      })).optional(),
      status: z.enum(['active', 'archived', 'draft']).optional().default('active'),
    }),
    output: z.object({
      product: z.object({
        id: z.number(),
        title: z.string(),
        handle: z.string(),
        variants: z.array(z.unknown()),
      }),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.post('/products.json', {
        product: {
          title: input.title,
          body_html: input.bodyHtml,
          vendor: input.vendor,
          product_type: input.productType,
          tags: input.tags?.join(', '),
          variants: input.variants,
          images: input.images,
          status: input.status,
        },
      });
      return response.data as Record<string, unknown>;
    },
  })

  .withAction('updateInventory', {
    name: 'Update Inventory',
    description: 'Update inventory levels for a product variant',
    input: z.object({
      inventoryItemId: z.number(),
      locationId: z.number(),
      available: z.number(),
    }),
    output: z.object({
      inventoryLevel: z.object({
        inventoryItemId: z.number(),
        locationId: z.number(),
        available: z.number(),
      }),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.post('/inventory_levels/set.json', {
        inventory_item_id: input.inventoryItemId,
        location_id: input.locationId,
        available: input.available,
      });
      return response.data as Record<string, unknown>;
    },
  })

  // Customer Actions
  .withAction('getCustomers', {
    name: 'Get Customers',
    description: 'Retrieve customers from your store',
    input: z.object({
      query: z.string().optional(),
      limit: z.number().optional().default(50),
    }),
    output: z.object({
      customers: z.array(z.object({
        id: z.number(),
        email: z.string(),
        firstName: z.string(),
        lastName: z.string(),
        ordersCount: z.number(),
        totalSpent: z.string(),
      })),
    }),
    execute: async (input, ctx) => {
      const params: Record<string, string> = { limit: String(input.limit) };
      if (input.query) params.query = input.query;

      const response = await ctx.http.get('/customers.json', { params });
      return response.data as Record<string, unknown>;
    },
  })

  .withAction('createCustomer', {
    name: 'Create Customer',
    description: 'Create a new customer',
    input: z.object({
      email: z.string().email(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      phone: z.string().optional(),
      tags: z.array(z.string()).optional(),
      note: z.string().optional(),
      acceptsMarketing: z.boolean().optional().default(false),
    }),
    output: z.object({
      customer: z.object({
        id: z.number(),
        email: z.string(),
      }),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.post('/customers.json', {
        customer: {
          email: input.email,
          first_name: input.firstName,
          last_name: input.lastName,
          phone: input.phone,
          tags: input.tags?.join(', '),
          note: input.note,
          accepts_marketing: input.acceptsMarketing,
        },
      });
      return response.data as Record<string, unknown>;
    },
  })

  // Webhook Triggers
  .withWebhookTrigger('orderCreated', {
    name: 'Order Created',
    description: 'Triggered when a new order is placed',
    output: z.object({
      id: z.number(),
      name: z.string(),
      email: z.string(),
      totalPrice: z.string(),
      lineItems: z.array(z.unknown()),
      customer: z.unknown(),
    }),
    signatureHeader: 'x-shopify-hmac-sha256',
    verifySignature: (payload, signature, secret) => {
      // HMAC SHA256 verification
      return true; // Placeholder
    },
  })

  .withWebhookTrigger('orderFulfilled', {
    name: 'Order Fulfilled',
    description: 'Triggered when an order is fulfilled',
    output: z.object({
      id: z.number(),
      name: z.string(),
      fulfillmentStatus: z.string(),
    }),
    signatureHeader: 'x-shopify-hmac-sha256',
    verifySignature: () => true,
  })

  .withWebhookTrigger('productCreated', {
    name: 'Product Created',
    description: 'Triggered when a product is created',
    output: z.object({
      id: z.number(),
      title: z.string(),
      variants: z.array(z.unknown()),
    }),
    signatureHeader: 'x-shopify-hmac-sha256',
    verifySignature: () => true,
  })

  .withRateLimit({
    requests: 2,
    window: 1000,
    strategy: 'queue',
  })

  .withTestConnection(async (credentials, ctx): Promise<TestConnectionResult> => {
    try {
      const response = await ctx.http.get<{ shop: { name: string; email: string; domain: string } }>(
        '/shop.json'
      );
      
      return {
        success: true,
        message: 'Successfully connected to Shopify',
        accountInfo: {
          name: response.data.shop.name,
          email: response.data.shop.email,
          domain: response.data.shop.domain,
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

export default shopifyConnector;
