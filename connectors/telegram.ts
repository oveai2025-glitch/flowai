import { z } from 'zod';
import { createConnector } from '../packages/connector-sdk/src/builder';
export const telegramConnector = createConnector({ id: 'telegram', name: 'Telegram', version: '1.0.0', category: 'communication', description: 'Send messages via Telegram bot', color: '#0088CC', icon: 'https://cdn.flowatgenai.com/connectors/telegram.svg', tags: ['messaging', 'bot', 'chat'], baseUrl: 'https://api.telegram.org/bot{token}' })
.withApiKey({ location: 'url', name: 'token', fields: [{ key: 'botToken', label: 'Bot Token', type: 'password', required: true }] })
.withAction('sendMessage', { name: 'Send Message', description: 'Send a text message', input: z.object({ chatId: z.string(), text: z.string(), parseMode: z.enum(['HTML', 'Markdown', 'MarkdownV2']).optional() }), output: z.object({ ok: z.boolean(), result: z.object({ message_id: z.number() }) }), execute: async (i, ctx) => { const r = await ctx.http.post('/sendMessage', { chat_id: i.chatId, text: i.text, parse_mode: i.parseMode }); return r.data as Record<string, unknown>; } })
.withAction('sendPhoto', { name: 'Send Photo', description: 'Send a photo', input: z.object({ chatId: z.string(), photo: z.string(), caption: z.string().optional() }), output: z.object({ ok: z.boolean() }), execute: async (i, ctx) => { const r = await ctx.http.post('/sendPhoto', { chat_id: i.chatId, photo: i.photo, caption: i.caption }); return r.data as Record<string, unknown>; } })
.withWebhookTrigger('messageReceived', { name: 'Message Received', description: 'Triggered when a message is received', output: z.object({ message: z.object({ message_id: z.number(), text: z.string().optional() }) }), signatureHeader: 'x-telegram-bot-api-secret-token', verifySignature: () => true })
.withRateLimit({ requests: 30, window: 1000, strategy: 'queue' })
.withTestConnection(async (_, ctx) => { try { const r = await ctx.http.get('/getMe'); return { success: true, message: 'Connected' }; } catch { return { success: false, message: 'Failed' }; } })
.build();
export default telegramConnector;
