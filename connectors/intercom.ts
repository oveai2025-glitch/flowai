/**
 * FlowAtGenAi - Intercom Connector
 * @module connectors/intercom
 */
import { z } from 'zod';
import { createConnector } from '../packages/connector-sdk/src/builder';

export const intercomConnector = createConnector({
  id: 'intercom', name: 'Intercom', version: '1.0.0', category: 'support',
  description: 'Manage conversations, contacts, and messaging in Intercom',
  color: '#286EFA', icon: 'https://cdn.flowatgenai.com/connectors/intercom.svg',
  tags: ['messaging', 'support', 'crm'], baseUrl: 'https://api.intercom.io',
})
.withApiKey({ location: 'header', name: 'Authorization', prefix: 'Bearer ', fields: [{ key: 'accessToken', label: 'Access Token', type: 'password', required: true }] })
.withAction('createContact', { name: 'Create Contact', description: 'Create a new contact',
  input: z.object({ email: z.string().email(), name: z.string().optional(), phone: z.string().optional(), role: z.enum(['user', 'lead']).optional() }),
  output: z.object({ id: z.string(), email: z.string() }),
  execute: async (input, ctx) => { const r = await ctx.http.post('/contacts', input); return r.data as Record<string, unknown>; }
})
.withAction('sendMessage', { name: 'Send Message', description: 'Send a message to a contact',
  input: z.object({ contactId: z.string(), body: z.string(), messageType: z.enum(['inapp', 'email']).optional() }),
  output: z.object({ id: z.string(), type: z.string() }),
  execute: async (input, ctx) => { const r = await ctx.http.post('/messages', { from: { type: 'admin', id: 'admin' }, to: { type: 'contact', id: input.contactId }, body: input.body, message_type: input.messageType }); return r.data as Record<string, unknown>; }
})
.withAction('getConversation', { name: 'Get Conversation', description: 'Get conversation details',
  input: z.object({ conversationId: z.string() }),
  output: z.object({ id: z.string(), state: z.string() }),
  execute: async (input, ctx) => { const r = await ctx.http.get(`/conversations/${input.conversationId}`); return r.data as Record<string, unknown>; }
})
.withWebhookTrigger('newConversation', { name: 'New Conversation', description: 'Triggered when a new conversation starts', output: z.object({ data: z.object({ id: z.string() }) }), signatureHeader: 'x-hub-signature', verifySignature: () => true })
.withRateLimit({ requests: 166, window: 10000, strategy: 'queue' })
.withTestConnection(async (_, ctx) => { try { await ctx.http.get('/me'); return { success: true, message: 'Connected' }; } catch { return { success: false, message: 'Failed' }; } })
.build();

export default intercomConnector;
