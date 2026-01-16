/**
 * Google BigQuery Connector
 * 
 * Query and manage data in Google BigQuery.
 * 
 * @module connectors/google-bigquery
 */

import { z } from 'zod';

interface BigQueryCredentials {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

interface QueryResult {
  rows: Record<string, unknown>[];
  totalRows: number;
  schema: Array<{ name: string; type: string; mode: string }>;
  jobId: string;
}

class BigQueryClient {
  private credentials: BigQueryCredentials;
  private baseUrl: string;
  private accessToken: string | null = null;

  constructor(credentials: BigQueryCredentials) {
    this.credentials = credentials;
    this.baseUrl = 'https://bigquery.googleapis.com/bigquery/v2';
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken) return this.accessToken;

    const now = Math.floor(Date.now() / 1000);
    const claim = {
      iss: this.credentials.clientEmail,
      scope: 'https://www.googleapis.com/auth/bigquery',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    };

    const header = { alg: 'RS256', typ: 'JWT' };
    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const claimB64 = Buffer.from(JSON.stringify(claim)).toString('base64url');
    
    const crypto = require('crypto');
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(`${headerB64}.${claimB64}`);
    const signature = sign.sign(this.credentials.privateKey, 'base64url');
    
    const jwt = `${headerB64}.${claimB64}.${signature}`;

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    const data = await response.json();
    this.accessToken = data.access_token;
    return this.accessToken!;
  }

  private async request(method: string, path: string, body?: unknown): Promise<unknown> {
    const token = await this.getAccessToken();
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return await response.json();
  }

  async query(sql: string, params?: Record<string, unknown>): Promise<QueryResult> {
    const job = await this.request('POST', `/projects/${this.credentials.projectId}/queries`, {
      query: sql,
      useLegacySql: false,
      parameterMode: params ? 'NAMED' : undefined,
      queryParameters: params ? Object.entries(params).map(([name, value]) => ({
        name,
        parameterType: { type: typeof value === 'number' ? 'FLOAT64' : 'STRING' },
        parameterValue: { value: String(value) },
      })) : undefined,
    }) as {
      jobComplete: boolean;
      jobReference: { jobId: string };
      rows?: Array<{ f: Array<{ v: unknown }> }>;
      totalRows?: string;
      schema?: { fields: Array<{ name: string; type: string; mode: string }> };
    };

    const schema = job.schema?.fields || [];
    const rows = (job.rows || []).map(row => {
      const obj: Record<string, unknown> = {};
      row.f.forEach((field, i) => {
        obj[schema[i]?.name || `col${i}`] = field.v;
      });
      return obj;
    });

    return {
      rows,
      totalRows: parseInt(job.totalRows || '0', 10),
      schema: schema.map(f => ({ name: f.name, type: f.type, mode: f.mode })),
      jobId: job.jobReference.jobId,
    };
  }

  async listDatasets(): Promise<Array<{ datasetId: string; location: string }>> {
    const result = await this.request('GET', `/projects/${this.credentials.projectId}/datasets`) as {
      datasets?: Array<{ datasetReference: { datasetId: string }; location: string }>;
    };
    return result.datasets?.map(d => ({
      datasetId: d.datasetReference.datasetId,
      location: d.location,
    })) || [];
  }

  async listTables(datasetId: string): Promise<Array<{ tableId: string; type: string }>> {
    const result = await this.request('GET', `/projects/${this.credentials.projectId}/datasets/${datasetId}/tables`) as {
      tables?: Array<{ tableReference: { tableId: string }; type: string }>;
    };
    return result.tables?.map(t => ({
      tableId: t.tableReference.tableId,
      type: t.type,
    })) || [];
  }

  async getTable(datasetId: string, tableId: string): Promise<{
    tableId: string;
    description: string;
    numRows: number;
    numBytes: number;
    schema: Array<{ name: string; type: string; description: string }>;
  }> {
    const result = await this.request('GET', `/projects/${this.credentials.projectId}/datasets/${datasetId}/tables/${tableId}`) as {
      tableReference: { tableId: string };
      description?: string;
      numRows?: string;
      numBytes?: string;
      schema?: { fields: Array<{ name: string; type: string; description?: string }> };
    };
    return {
      tableId: result.tableReference.tableId,
      description: result.description || '',
      numRows: parseInt(result.numRows || '0', 10),
      numBytes: parseInt(result.numBytes || '0', 10),
      schema: result.schema?.fields.map(f => ({
        name: f.name,
        type: f.type,
        description: f.description || '',
      })) || [],
    };
  }

  async insertRows(datasetId: string, tableId: string, rows: Record<string, unknown>[]): Promise<{ insertedRows: number }> {
    const result = await this.request('POST', `/projects/${this.credentials.projectId}/datasets/${datasetId}/tables/${tableId}/insertAll`, {
      rows: rows.map(row => ({ json: row })),
    }) as { insertErrors?: unknown[] };
    
    const errors = result.insertErrors?.length || 0;
    return { insertedRows: rows.length - errors };
  }

  async createDataset(datasetId: string, location: string = 'US'): Promise<void> {
    await this.request('POST', `/projects/${this.credentials.projectId}/datasets`, {
      datasetReference: {
        projectId: this.credentials.projectId,
        datasetId,
      },
      location,
    });
  }

  async deleteDataset(datasetId: string, deleteContents: boolean = false): Promise<void> {
    await this.request('DELETE', `/projects/${this.credentials.projectId}/datasets/${datasetId}?deleteContents=${deleteContents}`);
  }

  async createTable(datasetId: string, tableId: string, schema: Array<{ name: string; type: string; mode?: string }>): Promise<void> {
    await this.request('POST', `/projects/${this.credentials.projectId}/datasets/${datasetId}/tables`, {
      tableReference: {
        projectId: this.credentials.projectId,
        datasetId,
        tableId,
      },
      schema: { fields: schema },
    });
  }

  async deleteTable(datasetId: string, tableId: string): Promise<void> {
    await this.request('DELETE', `/projects/${this.credentials.projectId}/datasets/${datasetId}/tables/${tableId}`);
  }
}

export const googleBigQueryConnector = {
  id: 'google-bigquery',
  name: 'Google BigQuery',
  version: '1.0.0',
  category: 'database',
  description: 'Query and manage data in Google BigQuery',
  color: '#4285F4',
  icon: 'https://cdn.flowatgenai.com/connectors/google-bigquery.svg',
  tags: ['google', 'bigquery', 'sql', 'analytics', 'data-warehouse'],

  authentication: {
    type: 'custom' as const,
    fields: [
      { name: 'projectId', label: 'Project ID', type: 'string' as const, required: true },
      { name: 'clientEmail', label: 'Service Account Email', type: 'string' as const, required: true },
      { name: 'privateKey', label: 'Private Key', type: 'password' as const, required: true },
    ],
  },

  actions: {
    query: {
      name: 'Run Query',
      description: 'Execute a SQL query',
      input: z.object({
        sql: z.string(),
        params: z.record(z.unknown()).optional(),
      }),
      output: z.object({
        rows: z.array(z.record(z.unknown())),
        totalRows: z.number(),
        jobId: z.string(),
      }),
      execute: async (input: { sql: string; params?: Record<string, unknown> }, ctx: { credentials: BigQueryCredentials }) => {
        const client = new BigQueryClient(ctx.credentials);
        return await client.query(input.sql, input.params);
      },
    },

    listDatasets: {
      name: 'List Datasets',
      description: 'List all datasets in the project',
      input: z.object({}),
      output: z.object({ datasets: z.array(z.object({ datasetId: z.string(), location: z.string() })) }),
      execute: async (_input: unknown, ctx: { credentials: BigQueryCredentials }) => {
        const client = new BigQueryClient(ctx.credentials);
        const datasets = await client.listDatasets();
        return { datasets };
      },
    },

    listTables: {
      name: 'List Tables',
      description: 'List tables in a dataset',
      input: z.object({ datasetId: z.string() }),
      output: z.object({ tables: z.array(z.object({ tableId: z.string(), type: z.string() })) }),
      execute: async (input: { datasetId: string }, ctx: { credentials: BigQueryCredentials }) => {
        const client = new BigQueryClient(ctx.credentials);
        const tables = await client.listTables(input.datasetId);
        return { tables };
      },
    },

    getTable: {
      name: 'Get Table',
      description: 'Get table details and schema',
      input: z.object({ datasetId: z.string(), tableId: z.string() }),
      output: z.object({
        tableId: z.string(),
        description: z.string(),
        numRows: z.number(),
        numBytes: z.number(),
      }),
      execute: async (input: { datasetId: string; tableId: string }, ctx: { credentials: BigQueryCredentials }) => {
        const client = new BigQueryClient(ctx.credentials);
        return await client.getTable(input.datasetId, input.tableId);
      },
    },

    insertRows: {
      name: 'Insert Rows',
      description: 'Insert rows into a table',
      input: z.object({
        datasetId: z.string(),
        tableId: z.string(),
        rows: z.array(z.record(z.unknown())),
      }),
      output: z.object({ insertedRows: z.number() }),
      execute: async (input: { datasetId: string; tableId: string; rows: Record<string, unknown>[] }, ctx: { credentials: BigQueryCredentials }) => {
        const client = new BigQueryClient(ctx.credentials);
        return await client.insertRows(input.datasetId, input.tableId, input.rows);
      },
    },

    createDataset: {
      name: 'Create Dataset',
      description: 'Create a new dataset',
      input: z.object({ datasetId: z.string(), location: z.string().default('US') }),
      output: z.object({ success: z.boolean() }),
      execute: async (input: { datasetId: string; location?: string }, ctx: { credentials: BigQueryCredentials }) => {
        const client = new BigQueryClient(ctx.credentials);
        await client.createDataset(input.datasetId, input.location);
        return { success: true };
      },
    },

    deleteDataset: {
      name: 'Delete Dataset',
      description: 'Delete a dataset',
      input: z.object({ datasetId: z.string(), deleteContents: z.boolean().default(false) }),
      output: z.object({ success: z.boolean() }),
      execute: async (input: { datasetId: string; deleteContents?: boolean }, ctx: { credentials: BigQueryCredentials }) => {
        const client = new BigQueryClient(ctx.credentials);
        await client.deleteDataset(input.datasetId, input.deleteContents);
        return { success: true };
      },
    },

    createTable: {
      name: 'Create Table',
      description: 'Create a new table',
      input: z.object({
        datasetId: z.string(),
        tableId: z.string(),
        schema: z.array(z.object({ name: z.string(), type: z.string(), mode: z.string().optional() })),
      }),
      output: z.object({ success: z.boolean() }),
      execute: async (input: { datasetId: string; tableId: string; schema: Array<{ name: string; type: string; mode?: string }> }, ctx: { credentials: BigQueryCredentials }) => {
        const client = new BigQueryClient(ctx.credentials);
        await client.createTable(input.datasetId, input.tableId, input.schema);
        return { success: true };
      },
    },

    deleteTable: {
      name: 'Delete Table',
      description: 'Delete a table',
      input: z.object({ datasetId: z.string(), tableId: z.string() }),
      output: z.object({ success: z.boolean() }),
      execute: async (input: { datasetId: string; tableId: string }, ctx: { credentials: BigQueryCredentials }) => {
        const client = new BigQueryClient(ctx.credentials);
        await client.deleteTable(input.datasetId, input.tableId);
        return { success: true };
      },
    },
  },
};

export default googleBigQueryConnector;
