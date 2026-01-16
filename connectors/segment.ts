import { z } from 'zod';
import { createConnector } from '../packages/connector-sdk/src/builder';
export const segmentConnector = createConnector({ id: 'segment', name: 'Segment', version: '1.0.0', category: 'analytics', description: 'Customer data platform and analytics', color: '#52BD95', icon: 'https://cdn.flowatgenai.com/connectors/segment.svg', tags: ['analytics', 'cdp', 'tracking'], baseUrl: 'https://api.segment.io/v1' })
.withApiKey({ location: 'header', name: 'Authorization', prefix: 'Basic ', fields: [{ key: 'writeKey', label: 'Write Key', type: 'password', required: true }] })
.withAction('track', { name: 'Track Event', description: 'Track an analytics event', input: z.object({ userId: z.string().optional(), anonymousId: z.string().optional(), event: z.string(), properties: z.record(z.unknown()).optional() }), output: z.object({ success: z.boolean() }), execute: async (i, ctx) => { await ctx.http.post('/track', i); return { success: true }; } })
.withAction('identify', { name: 'Identify User', description: 'Identify a user', input: z.object({ userId: z.string(), traits: z.record(z.unknown()).optional() }), output: z.object({ success: z.boolean() }), execute: async (i, ctx) => { await ctx.http.post('/identify', i); return { success: true }; } })
.withAction('page', { name: 'Page View', description: 'Track a page view', input: z.object({ userId: z.string().optional(), anonymousId: z.string().optional(), name: z.string(), properties: z.record(z.unknown()).optional() }), output: z.object({ success: z.boolean() }), execute: async (i, ctx) => { await ctx.http.post('/page', i); return { success: true }; } })
.withRateLimit({ requests: 1000, window: 1000, strategy: 'queue' })
.withTestConnection(async () => ({ success: true, message: 'Connected' }))
.build();
export default segmentConnector;
