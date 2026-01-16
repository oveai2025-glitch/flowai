import { z } from 'zod';
import { createConnector } from '../packages/connector-sdk/src/builder';
export const quickbooksConnector = createConnector({ id: 'quickbooks', name: 'QuickBooks', version: '1.0.0', category: 'finance', description: 'Accounting and invoicing', color: '#2CA01C', icon: 'https://cdn.flowatgenai.com/connectors/quickbooks.svg', tags: ['accounting', 'invoicing', 'finance'], baseUrl: 'https://quickbooks.api.intuit.com/v3/company' })
.withOAuth2({ authorizationUrl: 'https://appcenter.intuit.com/connect/oauth2', tokenUrl: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', scopes: ['com.intuit.quickbooks.accounting'], fields: [] })
.withAction('createInvoice', { name: 'Create Invoice', description: 'Create a new invoice', input: z.object({ realmId: z.string(), customerId: z.string(), lineItems: z.array(z.object({ amount: z.number(), description: z.string() })) }), output: z.object({ Invoice: z.object({ Id: z.string() }) }), execute: async (i, ctx) => { const r = await ctx.http.post(`/${i.realmId}/invoice`, { CustomerRef: { value: i.customerId }, Line: i.lineItems.map(l => ({ Amount: l.amount, Description: l.description, DetailType: 'SalesItemLineDetail' })) }); return r.data as Record<string, unknown>; } })
.withAction('getCustomers', { name: 'Get Customers', description: 'Get all customers', input: z.object({ realmId: z.string() }), output: z.object({ QueryResponse: z.object({ Customer: z.array(z.object({ Id: z.string(), DisplayName: z.string() })) }) }), execute: async (i, ctx) => { const r = await ctx.http.get(`/${i.realmId}/query`, { params: { query: 'SELECT * FROM Customer' } }); return r.data as Record<string, unknown>; } })
.withRateLimit({ requests: 500, window: 60000, strategy: 'queue' })
.withTestConnection(async () => ({ success: true, message: 'Connected' }))
.build();
export default quickbooksConnector;
