import { z } from 'zod';
import { createConnector } from '../packages/connector-sdk/src/builder';
export const teamsConnector = createConnector({ id: 'microsoft-teams', name: 'Microsoft Teams', version: '1.0.0', category: 'communication', description: 'Send messages and manage Teams channels', color: '#6264A7', icon: 'https://cdn.flowatgenai.com/connectors/teams.svg', tags: ['messaging', 'teams', 'microsoft'], baseUrl: 'https://graph.microsoft.com/v1.0' })
.withOAuth2({ authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize', tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token', scopes: ['ChannelMessage.Send', 'Chat.ReadWrite'], fields: [] })
.withAction('sendChannelMessage', { name: 'Send Channel Message', description: 'Send a message to a channel', input: z.object({ teamId: z.string(), channelId: z.string(), message: z.string() }), output: z.object({ id: z.string() }), execute: async (i, ctx) => { const r = await ctx.http.post(`/teams/${i.teamId}/channels/${i.channelId}/messages`, { body: { content: i.message } }); return r.data as Record<string, unknown>; } })
.withAction('sendChatMessage', { name: 'Send Chat Message', description: 'Send a direct message', input: z.object({ chatId: z.string(), message: z.string() }), output: z.object({ id: z.string() }), execute: async (i, ctx) => { const r = await ctx.http.post(`/chats/${i.chatId}/messages`, { body: { content: i.message } }); return r.data as Record<string, unknown>; } })
.withAction('getChannels', { name: 'Get Channels', description: 'Get team channels', input: z.object({ teamId: z.string() }), output: z.object({ value: z.array(z.object({ id: z.string(), displayName: z.string() })) }), execute: async (i, ctx) => { const r = await ctx.http.get(`/teams/${i.teamId}/channels`); return r.data as Record<string, unknown>; } })
.withRateLimit({ requests: 100, window: 1000, strategy: 'queue' })
.withTestConnection(async (_, ctx) => { try { await ctx.http.get('/me'); return { success: true, message: 'Connected' }; } catch { return { success: false, message: 'Failed' }; } })
.build();
export default teamsConnector;
