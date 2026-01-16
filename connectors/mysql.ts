/**
 * MySQL Connector
 * 
 * Execute queries on MySQL databases.
 * 
 * @module connectors/mysql
 */

import { z } from 'zod';

interface MySQLCredentials {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
}

interface QueryResult {
  rows: Record<string, unknown>[];
  affectedRows: number;
  insertId: number;
  fields: Array<{ name: string; type: string }>;
}

class MySQLClient {
  private credentials: MySQLCredentials;
  private connection: unknown = null;

  constructor(credentials: MySQLCredentials) {
    this.credentials = credentials;
  }

  async connect(): Promise<void> {
    // Connection would be handled by mysql2 library
  }

  async query(sql: string, params?: unknown[]): Promise<QueryResult> {
    // Simulated response structure
    return {
      rows: [],
      affectedRows: 0,
      insertId: 0,
      fields: [],
    };
  }

  async execute(sql: string, params?: unknown[]): Promise<{ affectedRows: number; insertId: number }> {
    return { affectedRows: 0, insertId: 0 };
  }

  async close(): Promise<void> {}
}

export const mysqlConnector = {
  id: 'mysql',
  name: 'MySQL',
  version: '1.0.0',
  category: 'database',
  description: 'Execute queries on MySQL databases',
  color: '#4479A1',
  icon: 'https://cdn.flowatgenai.com/connectors/mysql.svg',
  tags: ['mysql', 'sql', 'database', 'relational'],

  authentication: {
    type: 'custom' as const,
    fields: [
      { name: 'host', label: 'Host', type: 'string' as const, required: true, default: 'localhost' },
      { name: 'port', label: 'Port', type: 'number' as const, required: true, default: 3306 },
      { name: 'database', label: 'Database', type: 'string' as const, required: true },
      { name: 'user', label: 'Username', type: 'string' as const, required: true },
      { name: 'password', label: 'Password', type: 'password' as const, required: true },
      { name: 'ssl', label: 'Use SSL', type: 'boolean' as const, required: false, default: false },
    ],
  },

  actions: {
    query: {
      name: 'Execute Query',
      description: 'Execute a SELECT query',
      input: z.object({
        sql: z.string(),
        params: z.array(z.unknown()).optional(),
      }),
      output: z.object({
        rows: z.array(z.record(z.unknown())),
        rowCount: z.number(),
      }),
      execute: async (input: { sql: string; params?: unknown[] }, ctx: { credentials: MySQLCredentials }) => {
        const client = new MySQLClient(ctx.credentials);
        await client.connect();
        const result = await client.query(input.sql, input.params);
        await client.close();
        return { rows: result.rows, rowCount: result.rows.length };
      },
    },

    execute: {
      name: 'Execute Statement',
      description: 'Execute INSERT, UPDATE, or DELETE',
      input: z.object({
        sql: z.string(),
        params: z.array(z.unknown()).optional(),
      }),
      output: z.object({
        affectedRows: z.number(),
        insertId: z.number(),
      }),
      execute: async (input: { sql: string; params?: unknown[] }, ctx: { credentials: MySQLCredentials }) => {
        const client = new MySQLClient(ctx.credentials);
        await client.connect();
        const result = await client.execute(input.sql, input.params);
        await client.close();
        return result;
      },
    },

    insert: {
      name: 'Insert Row',
      description: 'Insert a row into a table',
      input: z.object({
        table: z.string(),
        data: z.record(z.unknown()),
      }),
      output: z.object({ insertId: z.number() }),
      execute: async (input: { table: string; data: Record<string, unknown> }, ctx: { credentials: MySQLCredentials }) => {
        const columns = Object.keys(input.data);
        const values = Object.values(input.data);
        const placeholders = columns.map(() => '?').join(', ');
        const sql = `INSERT INTO ${input.table} (${columns.join(', ')}) VALUES (${placeholders})`;
        
        const client = new MySQLClient(ctx.credentials);
        await client.connect();
        const result = await client.execute(sql, values);
        await client.close();
        return { insertId: result.insertId };
      },
    },

    update: {
      name: 'Update Rows',
      description: 'Update rows in a table',
      input: z.object({
        table: z.string(),
        data: z.record(z.unknown()),
        where: z.string(),
        whereParams: z.array(z.unknown()).optional(),
      }),
      output: z.object({ affectedRows: z.number() }),
      execute: async (input: { table: string; data: Record<string, unknown>; where: string; whereParams?: unknown[] }, ctx: { credentials: MySQLCredentials }) => {
        const sets = Object.keys(input.data).map(k => `${k} = ?`).join(', ');
        const values = [...Object.values(input.data), ...(input.whereParams || [])];
        const sql = `UPDATE ${input.table} SET ${sets} WHERE ${input.where}`;
        
        const client = new MySQLClient(ctx.credentials);
        await client.connect();
        const result = await client.execute(sql, values);
        await client.close();
        return { affectedRows: result.affectedRows };
      },
    },

    delete: {
      name: 'Delete Rows',
      description: 'Delete rows from a table',
      input: z.object({
        table: z.string(),
        where: z.string(),
        whereParams: z.array(z.unknown()).optional(),
      }),
      output: z.object({ affectedRows: z.number() }),
      execute: async (input: { table: string; where: string; whereParams?: unknown[] }, ctx: { credentials: MySQLCredentials }) => {
        const sql = `DELETE FROM ${input.table} WHERE ${input.where}`;
        
        const client = new MySQLClient(ctx.credentials);
        await client.connect();
        const result = await client.execute(sql, input.whereParams);
        await client.close();
        return { affectedRows: result.affectedRows };
      },
    },

    listTables: {
      name: 'List Tables',
      description: 'List all tables in the database',
      input: z.object({}),
      output: z.object({ tables: z.array(z.string()) }),
      execute: async (_input: unknown, ctx: { credentials: MySQLCredentials }) => {
        const client = new MySQLClient(ctx.credentials);
        await client.connect();
        const result = await client.query('SHOW TABLES');
        await client.close();
        const key = `Tables_in_${ctx.credentials.database}`;
        return { tables: result.rows.map(r => String(r[key] || Object.values(r)[0])) };
      },
    },

    describeTable: {
      name: 'Describe Table',
      description: 'Get table schema',
      input: z.object({ table: z.string() }),
      output: z.object({
        columns: z.array(z.object({
          name: z.string(),
          type: z.string(),
          nullable: z.boolean(),
          key: z.string(),
          default: z.unknown(),
        })),
      }),
      execute: async (input: { table: string }, ctx: { credentials: MySQLCredentials }) => {
        const client = new MySQLClient(ctx.credentials);
        await client.connect();
        const result = await client.query(`DESCRIBE ${input.table}`);
        await client.close();
        return {
          columns: result.rows.map(r => ({
            name: String(r.Field || ''),
            type: String(r.Type || ''),
            nullable: r.Null === 'YES',
            key: String(r.Key || ''),
            default: r.Default,
          })),
        };
      },
    },
  },
};

export default mysqlConnector;
