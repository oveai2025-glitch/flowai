import { z } from 'zod';
import { createConnector } from '../packages/connector-sdk/src/builder';
export const zoomConnector = createConnector({ id: 'zoom', name: 'Zoom', version: '1.0.0', category: 'communication', description: 'Schedule and manage Zoom meetings', color: '#2D8CFF', icon: 'https://cdn.flowatgenai.com/connectors/zoom.svg', tags: ['video', 'meetings', 'conferencing'], baseUrl: 'https://api.zoom.us/v2' })
.withOAuth2({ authorizationUrl: 'https://zoom.us/oauth/authorize', tokenUrl: 'https://zoom.us/oauth/token', scopes: ['meeting:write', 'meeting:read'], fields: [] })
.withAction('createMeeting', { name: 'Create Meeting', description: 'Create a new Zoom meeting', input: z.object({ topic: z.string(), type: z.number().optional().default(2), startTime: z.string().optional(), duration: z.number().optional(), timezone: z.string().optional() }), output: z.object({ id: z.number(), join_url: z.string() }), execute: async (i, ctx) => { const r = await ctx.http.post('/users/me/meetings', i); return r.data as Record<string, unknown>; } })
.withAction('getMeeting', { name: 'Get Meeting', description: 'Get meeting details', input: z.object({ meetingId: z.string() }), output: z.object({ id: z.number(), topic: z.string() }), execute: async (i, ctx) => { const r = await ctx.http.get(`/meetings/${i.meetingId}`); return r.data as Record<string, unknown>; } })
.withAction('deleteMeeting', { name: 'Delete Meeting', description: 'Delete a meeting', input: z.object({ meetingId: z.string() }), output: z.object({ success: z.boolean() }), execute: async (i, ctx) => { await ctx.http.delete(`/meetings/${i.meetingId}`); return { success: true }; } })
.withWebhookTrigger('meetingStarted', { name: 'Meeting Started', description: 'Triggered when a meeting starts', output: z.object({ event: z.string() }), signatureHeader: 'x-zm-signature', verifySignature: () => true })
.withRateLimit({ requests: 100, window: 1000, strategy: 'queue' })
.withTestConnection(async (_, ctx) => { try { await ctx.http.get('/users/me'); return { success: true, message: 'Connected' }; } catch { return { success: false, message: 'Failed' }; } })
.build();
export default zoomConnector;
