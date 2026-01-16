/**
 * FlowAtGenAi - Airtable Connector
 * 
 * Full Airtable integration:
 * - List, create, update, delete records
 * - Search and filter
 * - Webhook triggers
 * 
 * @module connectors/airtable
 */

import { z } from 'zod';
import { createConnector } from '../packages/connector-sdk/src/builder';
import type { TestConnectionResult } from '../packages/connector-sdk/src/types';

export const airtableConnector = createConnector({
  id: 'airtable',
  name: 'Airtable',
  version: '1.0.0',
  category: 'productivity',
  description: 'Manage Airtable bases, tables, and records',
  color: '#18BFFF',
  icon: 'https://cdn.flowatgenai.com/connectors/airtable.svg',
  tags: ['database', 'spreadsheet', 'no-code'],
  docsUrl: 'https://airtable.com/developers/web/api',
  baseUrl: 'https://api.airtable.com/v0',
})
  .withApiKey({
    location: 'header',
    name: 'Authorization',
    prefix: 'Bearer ',
    fields: [
      {
        key: 'accessToken',
        label: 'Personal Access Token',
        type: 'password',
        required: true,
        description: 'Your Airtable personal access token',
      },
    ],
  })

  .withAction('listRecords', {
    name: 'List Records',
    description: 'Get records from a table',
    input: z.object({
      baseId: z.string().describe('The Airtable base ID'),
      tableIdOrName: z.string().describe('Table ID or name'),
      view: z.string().optional().describe('View name or ID'),
      maxRecords: z.number().optional().default(100),
      filterByFormula: z.string().optional().describe('Airtable formula to filter records'),
      sort: z.array(z.object({
        field: z.string(),
        direction: z.enum(['asc', 'desc']).optional(),
      })).optional(),
      fields: z.array(z.string()).optional().describe('Only return specific fields'),
    }),
    output: z.object({
      records: z.array(z.object({
        id: z.string(),
        fields: z.record(z.unknown()),
        createdTime: z.string(),
      })),
      offset: z.string().optional(),
    }),
    execute: async (input, ctx) => {
      const params: Record<string, string> = {};
      if (input.view) params.view = input.view;
      if (input.maxRecords) params.maxRecords = String(input.maxRecords);
      if (input.filterByFormula) params.filterByFormula = input.filterByFormula;
      
      const response = await ctx.http.get(
        `/${input.baseId}/${encodeURIComponent(input.tableIdOrName)}`,
        { params }
      );
      return response.data as Record<string, unknown>;
    },
  })

  .withAction('getRecord', {
    name: 'Get Record',
    description: 'Get a single record by ID',
    input: z.object({
      baseId: z.string(),
      tableIdOrName: z.string(),
      recordId: z.string(),
    }),
    output: z.object({
      id: z.string(),
      fields: z.record(z.unknown()),
      createdTime: z.string(),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.get(
        `/${input.baseId}/${encodeURIComponent(input.tableIdOrName)}/${input.recordId}`
      );
      return response.data as Record<string, unknown>;
    },
  })

  .withAction('createRecord', {
    name: 'Create Record',
    description: 'Create a new record',
    input: z.object({
      baseId: z.string(),
      tableIdOrName: z.string(),
      fields: z.record(z.unknown()).describe('Field values'),
      typecast: z.boolean().optional().describe('Auto-convert values to correct types'),
    }),
    output: z.object({
      id: z.string(),
      fields: z.record(z.unknown()),
      createdTime: z.string(),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.post(
        `/${input.baseId}/${encodeURIComponent(input.tableIdOrName)}`,
        {
          fields: input.fields,
          typecast: input.typecast,
        }
      );
      return response.data as Record<string, unknown>;
    },
  })

  .withAction('updateRecord', {
    name: 'Update Record',
    description: 'Update an existing record',
    input: z.object({
      baseId: z.string(),
      tableIdOrName: z.string(),
      recordId: z.string(),
      fields: z.record(z.unknown()),
      typecast: z.boolean().optional(),
    }),
    output: z.object({
      id: z.string(),
      fields: z.record(z.unknown()),
      createdTime: z.string(),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.patch(
        `/${input.baseId}/${encodeURIComponent(input.tableIdOrName)}/${input.recordId}`,
        {
          fields: input.fields,
          typecast: input.typecast,
        }
      );
      return response.data as Record<string, unknown>;
    },
  })

  .withAction('deleteRecord', {
    name: 'Delete Record',
    description: 'Delete a record',
    input: z.object({
      baseId: z.string(),
      tableIdOrName: z.string(),
      recordId: z.string(),
    }),
    output: z.object({
      id: z.string(),
      deleted: z.boolean(),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.delete(
        `/${input.baseId}/${encodeURIComponent(input.tableIdOrName)}/${input.recordId}`
      );
      return response.data as Record<string, unknown>;
    },
  })

  .withAction('createRecords', {
    name: 'Create Multiple Records',
    description: 'Create multiple records at once (max 10)',
    input: z.object({
      baseId: z.string(),
      tableIdOrName: z.string(),
      records: z.array(z.object({
        fields: z.record(z.unknown()),
      })).max(10),
      typecast: z.boolean().optional(),
    }),
    output: z.object({
      records: z.array(z.object({
        id: z.string(),
        fields: z.record(z.unknown()),
        createdTime: z.string(),
      })),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.post(
        `/${input.baseId}/${encodeURIComponent(input.tableIdOrName)}`,
        {
          records: input.records,
          typecast: input.typecast,
        }
      );
      return response.data as Record<string, unknown>;
    },
  })

  .withAction('searchRecords', {
    name: 'Search Records',
    description: 'Search for records using a formula',
    input: z.object({
      baseId: z.string(),
      tableIdOrName: z.string(),
      filterByFormula: z.string().describe('Airtable formula (e.g., {Name} = "John")'),
      maxRecords: z.number().optional().default(100),
    }),
    output: z.object({
      records: z.array(z.object({
        id: z.string(),
        fields: z.record(z.unknown()),
        createdTime: z.string(),
      })),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.get(
        `/${input.baseId}/${encodeURIComponent(input.tableIdOrName)}`,
        {
          params: {
            filterByFormula: input.filterByFormula,
            maxRecords: String(input.maxRecords),
          },
        }
      );
      return response.data as Record<string, unknown>;
    },
  })

  .withRateLimit({
    requests: 5,
    window: 1000,
    strategy: 'queue',
  })

  .withTestConnection(async (credentials, ctx): Promise<TestConnectionResult> => {
    try {
      const response = await ctx.http.get<{ bases: Array<{ id: string; name: string }> }>(
        'https://api.airtable.com/v0/meta/bases'
      );
      
      return {
        success: true,
        message: 'Successfully connected to Airtable',
        accountInfo: {
          bases: response.data.bases?.length || 0,
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

export default airtableConnector;
