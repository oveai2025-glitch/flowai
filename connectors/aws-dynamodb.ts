/**
 * AWS DynamoDB Connector
 * 
 * CRUD operations for AWS DynamoDB NoSQL database.
 * 
 * @module connectors/aws-dynamodb
 */

import { z } from 'zod';

interface DynamoDBCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

interface AttributeValue {
  S?: string;
  N?: string;
  B?: string;
  SS?: string[];
  NS?: string[];
  BS?: string[];
  M?: Record<string, AttributeValue>;
  L?: AttributeValue[];
  NULL?: boolean;
  BOOL?: boolean;
}

function toAttributeValue(value: unknown): AttributeValue {
  if (value === null || value === undefined) return { NULL: true };
  if (typeof value === 'string') return { S: value };
  if (typeof value === 'number') return { N: value.toString() };
  if (typeof value === 'boolean') return { BOOL: value };
  if (Array.isArray(value)) return { L: value.map(toAttributeValue) };
  if (typeof value === 'object') {
    const m: Record<string, AttributeValue> = {};
    for (const [k, v] of Object.entries(value)) {
      m[k] = toAttributeValue(v);
    }
    return { M: m };
  }
  return { S: String(value) };
}

function fromAttributeValue(attr: AttributeValue): unknown {
  if (attr.S !== undefined) return attr.S;
  if (attr.N !== undefined) return parseFloat(attr.N);
  if (attr.BOOL !== undefined) return attr.BOOL;
  if (attr.NULL !== undefined) return null;
  if (attr.L !== undefined) return attr.L.map(fromAttributeValue);
  if (attr.M !== undefined) {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(attr.M)) {
      obj[k] = fromAttributeValue(v);
    }
    return obj;
  }
  if (attr.SS !== undefined) return attr.SS;
  if (attr.NS !== undefined) return attr.NS.map(parseFloat);
  return null;
}

function toItem(obj: Record<string, unknown>): Record<string, AttributeValue> {
  const item: Record<string, AttributeValue> = {};
  for (const [k, v] of Object.entries(obj)) {
    item[k] = toAttributeValue(v);
  }
  return item;
}

function fromItem(item: Record<string, AttributeValue>): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(item)) {
    obj[k] = fromAttributeValue(v);
  }
  return obj;
}

class DynamoDBClient {
  private credentials: DynamoDBCredentials;
  private endpoint: string;

  constructor(credentials: DynamoDBCredentials) {
    this.credentials = credentials;
    this.endpoint = `https://dynamodb.${credentials.region}.amazonaws.com`;
  }

  private async request(target: string, body: unknown): Promise<unknown> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.0',
        'X-Amz-Target': `DynamoDB_20120810.${target}`,
      },
      body: JSON.stringify(body),
    });
    return await response.json();
  }

  async putItem(tableName: string, item: Record<string, unknown>): Promise<void> {
    await this.request('PutItem', {
      TableName: tableName,
      Item: toItem(item),
    });
  }

  async getItem(tableName: string, key: Record<string, unknown>): Promise<Record<string, unknown> | null> {
    const result = await this.request('GetItem', {
      TableName: tableName,
      Key: toItem(key),
    }) as { Item?: Record<string, AttributeValue> };
    return result.Item ? fromItem(result.Item) : null;
  }

  async deleteItem(tableName: string, key: Record<string, unknown>): Promise<void> {
    await this.request('DeleteItem', {
      TableName: tableName,
      Key: toItem(key),
    });
  }

  async updateItem(
    tableName: string,
    key: Record<string, unknown>,
    updates: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, AttributeValue> = {};

    let i = 0;
    for (const [k, v] of Object.entries(updates)) {
      updateExpressions.push(`#attr${i} = :val${i}`);
      expressionAttributeNames[`#attr${i}`] = k;
      expressionAttributeValues[`:val${i}`] = toAttributeValue(v);
      i++;
    }

    const result = await this.request('UpdateItem', {
      TableName: tableName,
      Key: toItem(key),
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }) as { Attributes?: Record<string, AttributeValue> };

    return result.Attributes ? fromItem(result.Attributes) : {};
  }

  async query(params: {
    tableName: string;
    keyConditionExpression: string;
    expressionAttributeValues: Record<string, unknown>;
    filterExpression?: string;
    limit?: number;
    scanIndexForward?: boolean;
    indexName?: string;
  }): Promise<{ items: Record<string, unknown>[]; lastEvaluatedKey?: Record<string, unknown> }> {
    const attrValues: Record<string, AttributeValue> = {};
    for (const [k, v] of Object.entries(params.expressionAttributeValues)) {
      attrValues[k] = toAttributeValue(v);
    }

    const result = await this.request('Query', {
      TableName: params.tableName,
      KeyConditionExpression: params.keyConditionExpression,
      ExpressionAttributeValues: attrValues,
      FilterExpression: params.filterExpression,
      Limit: params.limit,
      ScanIndexForward: params.scanIndexForward,
      IndexName: params.indexName,
    }) as { Items?: Record<string, AttributeValue>[]; LastEvaluatedKey?: Record<string, AttributeValue> };

    return {
      items: result.Items?.map(fromItem) || [],
      lastEvaluatedKey: result.LastEvaluatedKey ? fromItem(result.LastEvaluatedKey) : undefined,
    };
  }

  async scan(params: {
    tableName: string;
    filterExpression?: string;
    expressionAttributeValues?: Record<string, unknown>;
    limit?: number;
    indexName?: string;
  }): Promise<{ items: Record<string, unknown>[]; lastEvaluatedKey?: Record<string, unknown>; count: number }> {
    const attrValues: Record<string, AttributeValue> = {};
    if (params.expressionAttributeValues) {
      for (const [k, v] of Object.entries(params.expressionAttributeValues)) {
        attrValues[k] = toAttributeValue(v);
      }
    }

    const result = await this.request('Scan', {
      TableName: params.tableName,
      FilterExpression: params.filterExpression,
      ExpressionAttributeValues: Object.keys(attrValues).length > 0 ? attrValues : undefined,
      Limit: params.limit,
      IndexName: params.indexName,
    }) as { Items?: Record<string, AttributeValue>[]; LastEvaluatedKey?: Record<string, AttributeValue>; Count?: number };

    return {
      items: result.Items?.map(fromItem) || [],
      lastEvaluatedKey: result.LastEvaluatedKey ? fromItem(result.LastEvaluatedKey) : undefined,
      count: result.Count || 0,
    };
  }

  async batchGetItem(params: {
    requestItems: Record<string, { keys: Record<string, unknown>[] }>;
  }): Promise<Record<string, Record<string, unknown>[]>> {
    const requestItems: Record<string, { Keys: Record<string, AttributeValue>[] }> = {};
    for (const [tableName, config] of Object.entries(params.requestItems)) {
      requestItems[tableName] = { Keys: config.keys.map(toItem) };
    }

    const result = await this.request('BatchGetItem', { RequestItems: requestItems }) as {
      Responses?: Record<string, Record<string, AttributeValue>[]>;
    };

    const responses: Record<string, Record<string, unknown>[]> = {};
    if (result.Responses) {
      for (const [tableName, items] of Object.entries(result.Responses)) {
        responses[tableName] = items.map(fromItem);
      }
    }
    return responses;
  }

  async batchWriteItem(params: {
    requestItems: Record<string, Array<{ putRequest?: { item: Record<string, unknown> }; deleteRequest?: { key: Record<string, unknown> } }>>;
  }): Promise<{ unprocessedItems: number }> {
    const requestItems: Record<string, Array<{ PutRequest?: { Item: Record<string, AttributeValue> }; DeleteRequest?: { Key: Record<string, AttributeValue> } }>> = {};
    
    for (const [tableName, requests] of Object.entries(params.requestItems)) {
      requestItems[tableName] = requests.map(req => {
        if (req.putRequest) return { PutRequest: { Item: toItem(req.putRequest.item) } };
        if (req.deleteRequest) return { DeleteRequest: { Key: toItem(req.deleteRequest.key) } };
        return {};
      });
    }

    const result = await this.request('BatchWriteItem', { RequestItems: requestItems }) as {
      UnprocessedItems?: Record<string, unknown[]>;
    };

    let unprocessed = 0;
    if (result.UnprocessedItems) {
      for (const items of Object.values(result.UnprocessedItems)) {
        unprocessed += items.length;
      }
    }
    return { unprocessedItems: unprocessed };
  }

  async listTables(): Promise<string[]> {
    const result = await this.request('ListTables', {}) as { TableNames?: string[] };
    return result.TableNames || [];
  }

  async describeTable(tableName: string): Promise<{
    tableName: string;
    tableStatus: string;
    itemCount: number;
    tableSizeBytes: number;
    keySchema: Array<{ attributeName: string; keyType: string }>;
  }> {
    const result = await this.request('DescribeTable', { TableName: tableName }) as {
      Table?: {
        TableName: string;
        TableStatus: string;
        ItemCount: number;
        TableSizeBytes: number;
        KeySchema: Array<{ AttributeName: string; KeyType: string }>;
      };
    };

    const table = result.Table;
    return {
      tableName: table?.TableName || '',
      tableStatus: table?.TableStatus || '',
      itemCount: table?.ItemCount || 0,
      tableSizeBytes: table?.TableSizeBytes || 0,
      keySchema: table?.KeySchema?.map(k => ({ attributeName: k.AttributeName, keyType: k.KeyType })) || [],
    };
  }
}

export const awsDynamoDBConnector = {
  id: 'aws-dynamodb',
  name: 'AWS DynamoDB',
  version: '1.0.0',
  category: 'database',
  description: 'NoSQL database operations with AWS DynamoDB',
  color: '#4053D6',
  icon: 'https://cdn.flowatgenai.com/connectors/aws-dynamodb.svg',
  tags: ['aws', 'dynamodb', 'nosql', 'database'],

  authentication: {
    type: 'custom' as const,
    fields: [
      { name: 'accessKeyId', label: 'Access Key ID', type: 'string' as const, required: true },
      { name: 'secretAccessKey', label: 'Secret Access Key', type: 'password' as const, required: true },
      { name: 'region', label: 'Region', type: 'string' as const, required: true, default: 'us-east-1' },
    ],
  },

  actions: {
    putItem: {
      name: 'Put Item',
      description: 'Insert or replace an item',
      input: z.object({ tableName: z.string(), item: z.record(z.unknown()) }),
      output: z.object({ success: z.boolean() }),
      execute: async (input: { tableName: string; item: Record<string, unknown> }, ctx: { credentials: DynamoDBCredentials }) => {
        const client = new DynamoDBClient(ctx.credentials);
        await client.putItem(input.tableName, input.item);
        return { success: true };
      },
    },

    getItem: {
      name: 'Get Item',
      description: 'Get an item by key',
      input: z.object({ tableName: z.string(), key: z.record(z.unknown()) }),
      output: z.object({ item: z.record(z.unknown()).nullable() }),
      execute: async (input: { tableName: string; key: Record<string, unknown> }, ctx: { credentials: DynamoDBCredentials }) => {
        const client = new DynamoDBClient(ctx.credentials);
        const item = await client.getItem(input.tableName, input.key);
        return { item };
      },
    },

    deleteItem: {
      name: 'Delete Item',
      description: 'Delete an item by key',
      input: z.object({ tableName: z.string(), key: z.record(z.unknown()) }),
      output: z.object({ success: z.boolean() }),
      execute: async (input: { tableName: string; key: Record<string, unknown> }, ctx: { credentials: DynamoDBCredentials }) => {
        const client = new DynamoDBClient(ctx.credentials);
        await client.deleteItem(input.tableName, input.key);
        return { success: true };
      },
    },

    updateItem: {
      name: 'Update Item',
      description: 'Update an existing item',
      input: z.object({
        tableName: z.string(),
        key: z.record(z.unknown()),
        updates: z.record(z.unknown()),
      }),
      output: z.object({ item: z.record(z.unknown()) }),
      execute: async (input: { tableName: string; key: Record<string, unknown>; updates: Record<string, unknown> }, ctx: { credentials: DynamoDBCredentials }) => {
        const client = new DynamoDBClient(ctx.credentials);
        const item = await client.updateItem(input.tableName, input.key, input.updates);
        return { item };
      },
    },

    query: {
      name: 'Query',
      description: 'Query items using a key condition',
      input: z.object({
        tableName: z.string(),
        keyConditionExpression: z.string(),
        expressionAttributeValues: z.record(z.unknown()),
        filterExpression: z.string().optional(),
        limit: z.number().optional(),
        scanIndexForward: z.boolean().optional(),
        indexName: z.string().optional(),
      }),
      output: z.object({ items: z.array(z.record(z.unknown())), lastEvaluatedKey: z.record(z.unknown()).optional() }),
      execute: async (input: { tableName: string; keyConditionExpression: string; expressionAttributeValues: Record<string, unknown>; filterExpression?: string; limit?: number; scanIndexForward?: boolean; indexName?: string }, ctx: { credentials: DynamoDBCredentials }) => {
        const client = new DynamoDBClient(ctx.credentials);
        return await client.query(input);
      },
    },

    scan: {
      name: 'Scan',
      description: 'Scan all items in a table',
      input: z.object({
        tableName: z.string(),
        filterExpression: z.string().optional(),
        expressionAttributeValues: z.record(z.unknown()).optional(),
        limit: z.number().optional(),
        indexName: z.string().optional(),
      }),
      output: z.object({ items: z.array(z.record(z.unknown())), count: z.number() }),
      execute: async (input: { tableName: string; filterExpression?: string; expressionAttributeValues?: Record<string, unknown>; limit?: number; indexName?: string }, ctx: { credentials: DynamoDBCredentials }) => {
        const client = new DynamoDBClient(ctx.credentials);
        return await client.scan(input);
      },
    },

    listTables: {
      name: 'List Tables',
      description: 'List all DynamoDB tables',
      input: z.object({}),
      output: z.object({ tables: z.array(z.string()) }),
      execute: async (_input: unknown, ctx: { credentials: DynamoDBCredentials }) => {
        const client = new DynamoDBClient(ctx.credentials);
        const tables = await client.listTables();
        return { tables };
      },
    },

    describeTable: {
      name: 'Describe Table',
      description: 'Get table details',
      input: z.object({ tableName: z.string() }),
      output: z.object({
        tableName: z.string(),
        tableStatus: z.string(),
        itemCount: z.number(),
        tableSizeBytes: z.number(),
      }),
      execute: async (input: { tableName: string }, ctx: { credentials: DynamoDBCredentials }) => {
        const client = new DynamoDBClient(ctx.credentials);
        return await client.describeTable(input.tableName);
      },
    },
  },
};

export default awsDynamoDBConnector;
