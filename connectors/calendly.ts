import { z } from 'zod';
import { createConnector } from '../packages/connector-sdk/src/builder';
export const calendlyConnector = createConnector({ id: 'calendly', name: 'Calendly', version: '1.0.0', category: 'productivity', description: 'Manage scheduling and appointments', color: '#006BFF', icon: 'https://cdn.flowatgenai.com/connectors/calendly.svg', tags: ['scheduling', 'calendar', 'appointments'], baseUrl: 'https://api.calendly.com' })
.withApiKey({ location: 'header', name: 'Authorization', prefix: 'Bearer ', fields: [{ key: 'apiKey', label: 'API Key', type: 'password', required: true }] })
.withAction('getScheduledEvents', { name: 'Get Scheduled Events', description: 'Get scheduled events', input: z.object({ userUri: z.string(), maxResults: z.number().optional().default(100) }), output: z.object({ collection: z.array(z.object({ uri: z.string(), name: z.string() })) }), execute: async (i, ctx) => { const r = await ctx.http.get('/scheduled_events', { params: { user: i.userUri, count: String(i.maxResults) } }); return r.data as Record<string, unknown>; } })
.withAction('getEventTypes', { name: 'Get Event Types', description: 'Get available event types', input: z.object({ userUri: z.string() }), output: z.object({ collection: z.array(z.object({ uri: z.string(), name: z.string() })) }), execute: async (i, ctx) => { const r = await ctx.http.get('/event_types', { params: { user: i.userUri } }); return r.data as Record<string, unknown>; } })
.withWebhookTrigger('eventScheduled', { name: 'Event Scheduled', description: 'Triggered when an event is scheduled', output: z.object({ event: z.string(), payload: z.object({ uri: z.string() }) }), signatureHeader: 'Calendly-Webhook-Signature', verifySignature: () => true })
.withRateLimit({ requests: 100, window: 60000, strategy: 'queue' })
.withTestConnection(async (_, ctx) => { try { await ctx.http.get('/users/me'); return { success: true, message: 'Connected' }; } catch { return { success: false, message: 'Failed' }; } })
.build();
export default calendlyConnector;
