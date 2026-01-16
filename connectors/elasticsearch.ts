/**
 * Elasticsearch Connector
 * 
 * Search and analytics with Elasticsearch.
 * 
 * @module connectors/elasticsearch
 */

import { z } from 'zod';

interface ElasticsearchCredentials {
  host: string;
  port: number;
  username?: string;
  password?: string;
  apiKey?: string;
  ssl?: boolean;
}

class ElasticsearchClient {
  private credentials: ElasticsearchCredentials;
  private baseUrl: string;

  constructor(credentials: ElasticsearchCredentials) {
    this.credentials = credentials;
    const protocol = credentials.ssl ? 'https' : 'http';
    this.baseUrl = `${protocol}://${credentials.host}:${credentials.port}`;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.credentials.apiKey) {
      headers['Authorization'] = `ApiKey ${this.credentials.apiKey}`;
    } else if (this.credentials.username && this.credentials.password) {
      const auth = Buffer.from(`${this.credentials.username}:${this.credentials.password}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }
    return headers;
  }

  async search(index: string, query: unknown, options?: { from?: number; size?: number; sort?: unknown }): Promise<{
    hits: Array<{ _id: string; _source: Record<string, unknown>; _score: number }>;
    total: number;
    took: number;
  }> {
    const body: Record<string, unknown> = { query };
    if (options?.from !== undefined) body.from = options.from;
    if (options?.size !== undefined) body.size = options.size;
    if (options?.sort) body.sort = options.sort;

    const response = await fetch(`${this.baseUrl}/${index}/_search`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return {
      hits: data.hits?.hits?.map((h: { _id: string; _source: Record<string, unknown>; _score: number }) => ({
        _id: h._id,
        _source: h._source,
        _score: h._score,
      })) || [],
      total: typeof data.hits?.total === 'number' ? data.hits.total : data.hits?.total?.value || 0,
      took: data.took || 0,
    };
  }

  async index(indexName: string, id: string | null, document: Record<string, unknown>): Promise<{ _id: string; result: string }> {
    const url = id ? `${this.baseUrl}/${indexName}/_doc/${id}` : `${this.baseUrl}/${indexName}/_doc`;
    const response = await fetch(url, {
      method: id ? 'PUT' : 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(document),
    });

    const data = await response.json();
    return { _id: data._id, result: data.result };
  }

  async get(index: string, id: string): Promise<Record<string, unknown> | null> {
    const response = await fetch(`${this.baseUrl}/${index}/_doc/${id}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data._source;
  }

  async delete(index: string, id: string): Promise<{ result: string }> {
    const response = await fetch(`${this.baseUrl}/${index}/_doc/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    const data = await response.json();
    return { result: data.result };
  }

  async update(index: string, id: string, doc: Record<string, unknown>): Promise<{ result: string }> {
    const response = await fetch(`${this.baseUrl}/${index}/_update/${id}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ doc }),
    });

    const data = await response.json();
    return { result: data.result };
  }

  async bulk(operations: Array<{ action: 'index' | 'delete' | 'update'; index: string; id?: string; document?: Record<string, unknown> }>): Promise<{
    took: number;
    errors: boolean;
    items: Array<{ status: number; result: string }>;
  }> {
    const lines: string[] = [];
    for (const op of operations) {
      const actionObj: Record<string, { _index: string; _id?: string }> = {
        [op.action]: { _index: op.index, _id: op.id },
      };
      lines.push(JSON.stringify(actionObj));
      if (op.action !== 'delete' && op.document) {
        lines.push(JSON.stringify(op.action === 'update' ? { doc: op.document } : op.document));
      }
    }

    const response = await fetch(`${this.baseUrl}/_bulk`, {
      method: 'POST',
      headers: { ...this.getHeaders(), 'Content-Type': 'application/x-ndjson' },
      body: lines.join('\n') + '\n',
    });

    const data = await response.json();
    return {
      took: data.took,
      errors: data.errors,
      items: data.items?.map((item: Record<string, { status: number; result: string }>) => {
        const [action] = Object.keys(item);
        return { status: item[action].status, result: item[action].result };
      }) || [],
    };
  }

  async createIndex(index: string, settings?: unknown, mappings?: unknown): Promise<{ acknowledged: boolean }> {
    const body: Record<string, unknown> = {};
    if (settings) body.settings = settings;
    if (mappings) body.mappings = mappings;

    const response = await fetch(`${this.baseUrl}/${index}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return { acknowledged: data.acknowledged };
  }

  async deleteIndex(index: string): Promise<{ acknowledged: boolean }> {
    const response = await fetch(`${this.baseUrl}/${index}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    const data = await response.json();
    return { acknowledged: data.acknowledged };
  }

  async listIndices(): Promise<Array<{ index: string; health: string; status: string; docsCount: number }>> {
    const response = await fetch(`${this.baseUrl}/_cat/indices?format=json`, {
      headers: this.getHeaders(),
    });

    const data = await response.json();
    return data.map((i: { index: string; health: string; status: string; 'docs.count': string }) => ({
      index: i.index,
      health: i.health,
      status: i.status,
      docsCount: parseInt(i['docs.count'] || '0', 10),
    }));
  }

  async count(index: string, query?: unknown): Promise<number> {
    const response = await fetch(`${this.baseUrl}/${index}/_count`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: query ? JSON.stringify({ query }) : '{}',
    });

    const data = await response.json();
    return data.count || 0;
  }

  async aggregate(index: string, aggs: unknown, query?: unknown): Promise<Record<string, unknown>> {
    const body: Record<string, unknown> = { aggs, size: 0 };
    if (query) body.query = query;

    const response = await fetch(`${this.baseUrl}/${index}/_search`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return data.aggregations || {};
  }
}

export const elasticsearchConnector = {
  id: 'elasticsearch',
  name: 'Elasticsearch',
  version: '1.0.0',
  category: 'database',
  description: 'Search and analytics with Elasticsearch',
  color: '#00BFB3',
  icon: 'https://cdn.flowatgenai.com/connectors/elasticsearch.svg',
  tags: ['elasticsearch', 'search', 'analytics', 'database'],

  authentication: {
    type: 'custom' as const,
    fields: [
      { name: 'host', label: 'Host', type: 'string' as const, required: true, default: 'localhost' },
      { name: 'port', label: 'Port', type: 'number' as const, required: true, default: 9200 },
      { name: 'username', label: 'Username', type: 'string' as const, required: false },
      { name: 'password', label: 'Password', type: 'password' as const, required: false },
      { name: 'apiKey', label: 'API Key', type: 'password' as const, required: false },
      { name: 'ssl', label: 'Use SSL', type: 'boolean' as const, required: false, default: false },
    ],
  },

  actions: {
    search: {
      name: 'Search',
      description: 'Search documents',
      input: z.object({
        index: z.string(),
        query: z.record(z.unknown()),
        from: z.number().optional(),
        size: z.number().optional(),
        sort: z.unknown().optional(),
      }),
      output: z.object({
        hits: z.array(z.object({ _id: z.string(), _source: z.record(z.unknown()), _score: z.number() })),
        total: z.number(),
        took: z.number(),
      }),
      execute: async (input: { index: string; query: Record<string, unknown>; from?: number; size?: number; sort?: unknown }, ctx: { credentials: ElasticsearchCredentials }) => {
        const client = new ElasticsearchClient(ctx.credentials);
        return await client.search(input.index, input.query, input);
      },
    },

    index: {
      name: 'Index Document',
      description: 'Index a document',
      input: z.object({
        index: z.string(),
        id: z.string().optional(),
        document: z.record(z.unknown()),
      }),
      output: z.object({ _id: z.string(), result: z.string() }),
      execute: async (input: { index: string; id?: string; document: Record<string, unknown> }, ctx: { credentials: ElasticsearchCredentials }) => {
        const client = new ElasticsearchClient(ctx.credentials);
        return await client.index(input.index, input.id || null, input.document);
      },
    },

    get: {
      name: 'Get Document',
      description: 'Get a document by ID',
      input: z.object({ index: z.string(), id: z.string() }),
      output: z.object({ document: z.record(z.unknown()).nullable() }),
      execute: async (input: { index: string; id: string }, ctx: { credentials: ElasticsearchCredentials }) => {
        const client = new ElasticsearchClient(ctx.credentials);
        const document = await client.get(input.index, input.id);
        return { document };
      },
    },

    delete: {
      name: 'Delete Document',
      description: 'Delete a document by ID',
      input: z.object({ index: z.string(), id: z.string() }),
      output: z.object({ result: z.string() }),
      execute: async (input: { index: string; id: string }, ctx: { credentials: ElasticsearchCredentials }) => {
        const client = new ElasticsearchClient(ctx.credentials);
        return await client.delete(input.index, input.id);
      },
    },

    update: {
      name: 'Update Document',
      description: 'Partially update a document',
      input: z.object({ index: z.string(), id: z.string(), document: z.record(z.unknown()) }),
      output: z.object({ result: z.string() }),
      execute: async (input: { index: string; id: string; document: Record<string, unknown> }, ctx: { credentials: ElasticsearchCredentials }) => {
        const client = new ElasticsearchClient(ctx.credentials);
        return await client.update(input.index, input.id, input.document);
      },
    },

    createIndex: {
      name: 'Create Index',
      description: 'Create a new index',
      input: z.object({
        index: z.string(),
        settings: z.record(z.unknown()).optional(),
        mappings: z.record(z.unknown()).optional(),
      }),
      output: z.object({ acknowledged: z.boolean() }),
      execute: async (input: { index: string; settings?: Record<string, unknown>; mappings?: Record<string, unknown> }, ctx: { credentials: ElasticsearchCredentials }) => {
        const client = new ElasticsearchClient(ctx.credentials);
        return await client.createIndex(input.index, input.settings, input.mappings);
      },
    },

    deleteIndex: {
      name: 'Delete Index',
      description: 'Delete an index',
      input: z.object({ index: z.string() }),
      output: z.object({ acknowledged: z.boolean() }),
      execute: async (input: { index: string }, ctx: { credentials: ElasticsearchCredentials }) => {
        const client = new ElasticsearchClient(ctx.credentials);
        return await client.deleteIndex(input.index);
      },
    },

    listIndices: {
      name: 'List Indices',
      description: 'List all indices',
      input: z.object({}),
      output: z.object({ indices: z.array(z.object({ index: z.string(), health: z.string(), status: z.string(), docsCount: z.number() })) }),
      execute: async (_input: unknown, ctx: { credentials: ElasticsearchCredentials }) => {
        const client = new ElasticsearchClient(ctx.credentials);
        const indices = await client.listIndices();
        return { indices };
      },
    },

    count: {
      name: 'Count',
      description: 'Count documents',
      input: z.object({ index: z.string(), query: z.record(z.unknown()).optional() }),
      output: z.object({ count: z.number() }),
      execute: async (input: { index: string; query?: Record<string, unknown> }, ctx: { credentials: ElasticsearchCredentials }) => {
        const client = new ElasticsearchClient(ctx.credentials);
        const count = await client.count(input.index, input.query);
        return { count };
      },
    },

    aggregate: {
      name: 'Aggregate',
      description: 'Run aggregations',
      input: z.object({
        index: z.string(),
        aggs: z.record(z.unknown()),
        query: z.record(z.unknown()).optional(),
      }),
      output: z.object({ aggregations: z.record(z.unknown()) }),
      execute: async (input: { index: string; aggs: Record<string, unknown>; query?: Record<string, unknown> }, ctx: { credentials: ElasticsearchCredentials }) => {
        const client = new ElasticsearchClient(ctx.credentials);
        const aggregations = await client.aggregate(input.index, input.aggs, input.query);
        return { aggregations };
      },
    },
  },
};

export default elasticsearchConnector;
