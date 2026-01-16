/**
 * PostgreSQL Connector
 * 
 * Database operations including:
 * - Execute queries
 * - Insert/Update/Delete records
 * - Transactions
 * - Schema inspection
 * 
 * @module connectors/postgres
 */

import { z } from 'zod';
import { createConnector } from '../packages/connector-sdk/src/builder';
import type { TestConnectionResult, ExecutionContext } from '../packages/connector-sdk/src/types';

// ============================================
// PostgreSQL Connector
// ============================================

export const postgresConnector = createConnector({
  id: 'postgres',
  name: 'PostgreSQL',
  version: '1.0.0',
  category: 'database',
  description: 'Query and manage PostgreSQL databases',
  color: '#336791',
  icon: 'https://cdn.wfaib.io/connectors/postgres.svg',
  tags: ['database', 'sql', 'postgresql', 'data'],
  docsUrl: 'https://www.postgresql.org/docs/',
})
  // ============================================
  // Authentication
  // ============================================
  .withApiKey({
    location: 'body', // Not really used, credentials passed to pg client
    name: 'connectionString',
    fields: [
      {
        key: 'connectionString',
        label: 'Connection String',
        type: 'password',
        required: false,
        description: 'PostgreSQL connection string (alternative to individual fields)',
        placeholder: 'postgresql://user:password@host:5432/database',
      },
      {
        key: 'host',
        label: 'Host',
        type: 'string',
        required: false,
        description: 'Database host',
        placeholder: 'localhost',
      },
      {
        key: 'port',
        label: 'Port',
        type: 'number',
        required: false,
        description: 'Database port',
        placeholder: '5432',
      },
      {
        key: 'database',
        label: 'Database',
        type: 'string',
        required: false,
        description: 'Database name',
      },
      {
        key: 'user',
        label: 'User',
        type: 'string',
        required: false,
        description: 'Database user',
      },
      {
        key: 'password',
        label: 'Password',
        type: 'password',
        required: false,
        description: 'Database password',
      },
      {
        key: 'ssl',
        label: 'SSL Mode',
        type: 'string',
        required: false,
        description: 'SSL mode (disable, require, verify-ca, verify-full)',
        default: 'require',
      },
    ],
  })

  // ============================================
  // Execute Query
  // ============================================

  .withAction('executeQuery', {
    name: 'Execute Query',
    description: 'Execute a SQL query and return results',
    input: z.object({
      query: z.string().describe('SQL query to execute'),
      parameters: z.array(z.unknown()).optional().describe('Query parameters for $1, $2, etc.'),
      timeout: z.number().default(30000).describe('Query timeout in milliseconds'),
    }),
    output: z.object({
      rows: z.array(z.record(z.unknown())),
      rowCount: z.number(),
      fields: z.array(z.object({
        name: z.string(),
        dataTypeID: z.number(),
      })),
      duration: z.number(),
    }),
    execute: async (input, ctx) => {
      const pool = await getPool(ctx);
      const startTime = Date.now();
      
      try {
        const result = await pool.query({
          text: input.query,
          values: input.parameters,
          // Note: pg doesn't support query-level timeout directly
          // Would need to use statement_timeout in query
        });
        
        return {
          rows: result.rows,
          rowCount: result.rowCount || 0,
          fields: result.fields.map(f => ({
            name: f.name,
            dataTypeID: f.dataTypeID,
          })),
          duration: Date.now() - startTime,
        };
      } finally {
        await pool.end();
      }
    },
  })

  // ============================================
  // Insert Record
  // ============================================

  .withAction('insert', {
    name: 'Insert Record',
    description: 'Insert a new record into a table',
    input: z.object({
      table: z.string().describe('Table name'),
      data: z.record(z.unknown()).describe('Column-value pairs to insert'),
      returning: z.array(z.string()).optional().describe('Columns to return'),
      onConflict: z.object({
        columns: z.array(z.string()),
        action: z.enum(['nothing', 'update']),
        updateColumns: z.array(z.string()).optional(),
      }).optional().describe('Upsert configuration'),
    }),
    output: z.object({
      inserted: z.boolean(),
      row: z.record(z.unknown()).nullable(),
      rowCount: z.number(),
    }),
    execute: async (input, ctx) => {
      const pool = await getPool(ctx);
      
      try {
        const columns = Object.keys(input.data);
        const values = Object.values(input.data);
        const placeholders = columns.map((_, i) => `$${i + 1}`);
        
        let query = `INSERT INTO "${input.table}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders.join(', ')})`;
        
        // Handle ON CONFLICT
        if (input.onConflict) {
          query += ` ON CONFLICT (${input.onConflict.columns.map(c => `"${c}"`).join(', ')})`;
          
          if (input.onConflict.action === 'nothing') {
            query += ' DO NOTHING';
          } else if (input.onConflict.action === 'update') {
            const updateCols = input.onConflict.updateColumns || columns;
            const updates = updateCols.map(c => `"${c}" = EXCLUDED."${c}"`);
            query += ` DO UPDATE SET ${updates.join(', ')}`;
          }
        }
        
        // Handle RETURNING
        if (input.returning?.length) {
          query += ` RETURNING ${input.returning.map(c => `"${c}"`).join(', ')}`;
        }
        
        const result = await pool.query(query, values);
        
        return {
          inserted: (result.rowCount || 0) > 0,
          row: result.rows[0] || null,
          rowCount: result.rowCount || 0,
        };
      } finally {
        await pool.end();
      }
    },
  })

  // ============================================
  // Update Records
  // ============================================

  .withAction('update', {
    name: 'Update Records',
    description: 'Update records in a table',
    input: z.object({
      table: z.string(),
      data: z.record(z.unknown()).describe('Column-value pairs to update'),
      where: z.string().describe('WHERE clause (without WHERE keyword)'),
      whereParams: z.array(z.unknown()).optional().describe('Parameters for WHERE clause'),
      returning: z.array(z.string()).optional(),
    }),
    output: z.object({
      updated: z.boolean(),
      rowCount: z.number(),
      rows: z.array(z.record(z.unknown())),
    }),
    execute: async (input, ctx) => {
      const pool = await getPool(ctx);
      
      try {
        const columns = Object.keys(input.data);
        const values = Object.values(input.data);
        
        // Build SET clause with parameterized values
        const setClause = columns.map((col, i) => `"${col}" = $${i + 1}`).join(', ');
        
        // Adjust WHERE params to come after SET params
        const whereParamOffset = columns.length;
        let whereClause = input.where;
        
        // Replace $1, $2, etc. in WHERE with offset values
        if (input.whereParams?.length) {
          whereClause = input.where.replace(/\$(\d+)/g, (_, num) => {
            return `$${parseInt(num) + whereParamOffset}`;
          });
        }
        
        let query = `UPDATE "${input.table}" SET ${setClause} WHERE ${whereClause}`;
        
        if (input.returning?.length) {
          query += ` RETURNING ${input.returning.map(c => `"${c}"`).join(', ')}`;
        }
        
        const allParams = [...values, ...(input.whereParams || [])];
        const result = await pool.query(query, allParams);
        
        return {
          updated: (result.rowCount || 0) > 0,
          rowCount: result.rowCount || 0,
          rows: result.rows,
        };
      } finally {
        await pool.end();
      }
    },
  })

  // ============================================
  // Delete Records
  // ============================================

  .withAction('delete', {
    name: 'Delete Records',
    description: 'Delete records from a table',
    input: z.object({
      table: z.string(),
      where: z.string().describe('WHERE clause (without WHERE keyword)'),
      whereParams: z.array(z.unknown()).optional(),
      returning: z.array(z.string()).optional(),
    }),
    output: z.object({
      deleted: z.boolean(),
      rowCount: z.number(),
      rows: z.array(z.record(z.unknown())),
    }),
    execute: async (input, ctx) => {
      const pool = await getPool(ctx);
      
      try {
        let query = `DELETE FROM "${input.table}" WHERE ${input.where}`;
        
        if (input.returning?.length) {
          query += ` RETURNING ${input.returning.map(c => `"${c}"`).join(', ')}`;
        }
        
        const result = await pool.query(query, input.whereParams);
        
        return {
          deleted: (result.rowCount || 0) > 0,
          rowCount: result.rowCount || 0,
          rows: result.rows,
        };
      } finally {
        await pool.end();
      }
    },
  })

  // ============================================
  // Select Records
  // ============================================

  .withAction('select', {
    name: 'Select Records',
    description: 'Query records from a table with filters',
    input: z.object({
      table: z.string(),
      columns: z.array(z.string()).default(['*']),
      where: z.string().optional(),
      whereParams: z.array(z.unknown()).optional(),
      orderBy: z.array(z.object({
        column: z.string(),
        direction: z.enum(['ASC', 'DESC']).default('ASC'),
      })).optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    }),
    output: z.object({
      rows: z.array(z.record(z.unknown())),
      rowCount: z.number(),
    }),
    execute: async (input, ctx) => {
      const pool = await getPool(ctx);
      
      try {
        const columnList = input.columns.map(c => c === '*' ? '*' : `"${c}"`).join(', ');
        let query = `SELECT ${columnList} FROM "${input.table}"`;
        
        if (input.where) {
          query += ` WHERE ${input.where}`;
        }
        
        if (input.orderBy?.length) {
          const orderClauses = input.orderBy.map(o => `"${o.column}" ${o.direction}`);
          query += ` ORDER BY ${orderClauses.join(', ')}`;
        }
        
        if (input.limit !== undefined) {
          query += ` LIMIT ${input.limit}`;
        }
        
        if (input.offset !== undefined) {
          query += ` OFFSET ${input.offset}`;
        }
        
        const result = await pool.query(query, input.whereParams);
        
        return {
          rows: result.rows,
          rowCount: result.rowCount || 0,
        };
      } finally {
        await pool.end();
      }
    },
  })

  // ============================================
  // List Tables
  // ============================================

  .withAction('listTables', {
    name: 'List Tables',
    description: 'List all tables in the database',
    input: z.object({
      schema: z.string().default('public'),
      includeViews: z.boolean().default(false),
    }),
    output: z.object({
      tables: z.array(z.object({
        name: z.string(),
        type: z.enum(['table', 'view']),
        rowCount: z.number().optional(),
      })),
    }),
    execute: async (input, ctx) => {
      const pool = await getPool(ctx);
      
      try {
        const typeFilter = input.includeViews
          ? "('r', 'v')"
          : "('r')";
        
        const query = `
          SELECT 
            c.relname as name,
            CASE c.relkind 
              WHEN 'r' THEN 'table'
              WHEN 'v' THEN 'view'
            END as type,
            c.reltuples::bigint as row_count
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = $1
            AND c.relkind IN ${typeFilter}
          ORDER BY c.relname
        `;
        
        const result = await pool.query(query, [input.schema]);
        
        return {
          tables: result.rows.map(row => ({
            name: row.name,
            type: row.type as 'table' | 'view',
            rowCount: row.row_count >= 0 ? row.row_count : undefined,
          })),
        };
      } finally {
        await pool.end();
      }
    },
  })

  // ============================================
  // Get Table Schema
  // ============================================

  .withAction('getTableSchema', {
    name: 'Get Table Schema',
    description: 'Get column information for a table',
    input: z.object({
      table: z.string(),
      schema: z.string().default('public'),
    }),
    output: z.object({
      columns: z.array(z.object({
        name: z.string(),
        type: z.string(),
        nullable: z.boolean(),
        defaultValue: z.string().nullable(),
        isPrimaryKey: z.boolean(),
      })),
    }),
    execute: async (input, ctx) => {
      const pool = await getPool(ctx);
      
      try {
        const query = `
          SELECT 
            c.column_name as name,
            c.data_type as type,
            c.is_nullable = 'YES' as nullable,
            c.column_default as default_value,
            COALESCE(
              (SELECT true FROM information_schema.table_constraints tc
               JOIN information_schema.key_column_usage kcu 
                 ON tc.constraint_name = kcu.constraint_name
               WHERE tc.table_schema = $1 
                 AND tc.table_name = $2
                 AND tc.constraint_type = 'PRIMARY KEY'
                 AND kcu.column_name = c.column_name
               LIMIT 1),
              false
            ) as is_primary_key
          FROM information_schema.columns c
          WHERE c.table_schema = $1
            AND c.table_name = $2
          ORDER BY c.ordinal_position
        `;
        
        const result = await pool.query(query, [input.schema, input.table]);
        
        return {
          columns: result.rows.map(row => ({
            name: row.name,
            type: row.type,
            nullable: row.nullable,
            defaultValue: row.default_value,
            isPrimaryKey: row.is_primary_key,
          })),
        };
      } finally {
        await pool.end();
      }
    },
  })

  // ============================================
  // Test Connection
  // ============================================
  .withTestConnection(async (credentials, ctx): Promise<TestConnectionResult> => {
    try {
      const pool = await getPool(ctx);
      
      try {
        const result = await pool.query('SELECT version(), current_database(), current_user');
        const row = result.rows[0];
        
        return {
          success: true,
          message: 'Successfully connected to PostgreSQL',
          accountInfo: {
            version: row.version,
            database: row.current_database,
            user: row.current_user,
          },
        };
      } finally {
        await pool.end();
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  })

  .build();

// ============================================
// Helper Functions
// ============================================

async function getPool(ctx: ExecutionContext) {
  // Dynamically import pg to avoid bundling issues
  const { Pool } = await import('pg');
  
  const creds = ctx.credentials as Record<string, string>;
  
  // Support both connection string and individual fields
  if (creds.connectionString) {
    return new Pool({
      connectionString: creds.connectionString,
      ssl: creds.ssl !== 'disable' ? { rejectUnauthorized: false } : false,
    });
  }
  
  return new Pool({
    host: creds.host || 'localhost',
    port: parseInt(creds.port || '5432', 10),
    database: creds.database,
    user: creds.user,
    password: creds.password,
    ssl: creds.ssl !== 'disable' ? { rejectUnauthorized: false } : false,
  });
}

export default postgresConnector;
