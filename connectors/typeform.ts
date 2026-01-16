import { z } from 'zod';
import { createConnector } from '../packages/connector-sdk/src/builder';
export const typeformConnector = createConnector({ id: 'typeform', name: 'Typeform', version: '1.0.0', category: 'productivity', description: 'Create forms and collect responses', color: '#262627', icon: 'https://cdn.flowatgenai.com/connectors/typeform.svg', tags: ['forms', 'surveys', 'data'], baseUrl: 'https://api.typeform.com' })
.withApiKey({ location: 'header', name: 'Authorization', prefix: 'Bearer ', fields: [{ key: 'accessToken', label: 'Access Token', type: 'password', required: true }] })
.withAction('getResponses', { name: 'Get Responses', description: 'Get form responses', input: z.object({ formId: z.string(), pageSize: z.number().optional().default(25) }), output: z.object({ items: z.array(z.object({ response_id: z.string() })), total_items: z.number() }), execute: async (i, ctx) => { const r = await ctx.http.get(`/forms/${i.formId}/responses`, { params: { page_size: String(i.pageSize) } }); return r.data as Record<string, unknown>; } })
.withAction('getForms', { name: 'Get Forms', description: 'List all forms', input: z.object({}), output: z.object({ items: z.array(z.object({ id: z.string(), title: z.string() })) }), execute: async (_, ctx) => { const r = await ctx.http.get('/forms'); return r.data as Record<string, unknown>; } })
.withWebhookTrigger('responseSubmitted', { name: 'Response Submitted', description: 'Triggered when a form response is submitted', output: z.object({ form_response: z.object({ form_id: z.string() }) }), signatureHeader: 'Typeform-Signature', verifySignature: () => true })
.withRateLimit({ requests: 200, window: 60000, strategy: 'queue' })
.withTestConnection(async (_, ctx) => { try { await ctx.http.get('/me'); return { success: true, message: 'Connected' }; } catch { return { success: false, message: 'Failed' }; } })
.build();
export default typeformConnector;
