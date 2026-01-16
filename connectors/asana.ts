/**
 * FlowAtGenAi - Asana Connector
 * @module connectors/asana
 */
import { z } from 'zod';
import { createConnector } from '../packages/connector-sdk/src/builder';

export const asanaConnector = createConnector({
  id: 'asana', name: 'Asana', version: '1.0.0', category: 'productivity',
  description: 'Manage tasks, projects, and teams in Asana',
  color: '#F06A6A', icon: 'https://cdn.flowatgenai.com/connectors/asana.svg',
  tags: ['tasks', 'project-management', 'teams'], baseUrl: 'https://app.asana.com/api/1.0',
})
.withOAuth2({ authorizationUrl: 'https://app.asana.com/-/oauth_authorize', tokenUrl: 'https://app.asana.com/-/oauth_token', scopes: ['default'], fields: [] })
.withAction('createTask', { name: 'Create Task', description: 'Create a new task',
  input: z.object({ name: z.string(), projectId: z.string(), notes: z.string().optional(), dueDate: z.string().optional(), assignee: z.string().optional() }),
  output: z.object({ data: z.object({ gid: z.string(), name: z.string() }) }),
  execute: async (input, ctx) => { const r = await ctx.http.post('/tasks', { data: { name: input.name, projects: [input.projectId], notes: input.notes, due_on: input.dueDate, assignee: input.assignee } }); return r.data as Record<string, unknown>; }
})
.withAction('getTasks', { name: 'Get Tasks', description: 'Get tasks from a project',
  input: z.object({ projectId: z.string() }),
  output: z.object({ data: z.array(z.object({ gid: z.string(), name: z.string() })) }),
  execute: async (input, ctx) => { const r = await ctx.http.get(`/projects/${input.projectId}/tasks`); return r.data as Record<string, unknown>; }
})
.withAction('updateTask', { name: 'Update Task', description: 'Update a task',
  input: z.object({ taskId: z.string(), name: z.string().optional(), completed: z.boolean().optional(), notes: z.string().optional() }),
  output: z.object({ data: z.object({ gid: z.string(), name: z.string() }) }),
  execute: async (input, ctx) => { const { taskId, ...data } = input; const r = await ctx.http.put(`/tasks/${taskId}`, { data }); return r.data as Record<string, unknown>; }
})
.withWebhookTrigger('taskCompleted', { name: 'Task Completed', description: 'Triggered when a task is completed', output: z.object({ resource: z.object({ gid: z.string() }) }), signatureHeader: 'x-hook-signature', verifySignature: () => true })
.withRateLimit({ requests: 150, window: 60000, strategy: 'queue' })
.withTestConnection(async (_, ctx) => { try { await ctx.http.get('/users/me'); return { success: true, message: 'Connected' }; } catch { return { success: false, message: 'Failed' }; } })
.build();

export default asanaConnector;
