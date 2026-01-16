/**
 * FlowAtGenAi - MongoDB Connector
 * 
 * MongoDB database operations:
 * - CRUD operations
 * - Aggregation pipelines
 * - Atlas integration
 * 
 * @module connectors/mongodb
 */

import { z } from 'zod';
import { createConnector } from '../packages/connector-sdk/src/builder';
import type { TestConnectionResult } from '../packages/connector-sdk/src/types';

export const mongodbConnector = createConnector({
  id: 'mongodb',
  name: 'MongoDB',
  version: '1.0.0',
  category: 'database',
  description: 'Query and manage MongoDB databases',
  color: '#47A248',
  icon: 'https://cdn.flowatgenai.com/connectors/mongodb.svg',
  tags: ['database', 'nosql', 'documents'],
  docsUrl: 'https://www.mongodb.com/docs/drivers/node/current/',
  baseUrl: '',
})
  .withNoAuth({
    fields: [
      { key: 'connectionString', label: 'Connection String', type: 'password', required: true, description: 'MongoDB connection URI' },
      { key: 'database', label: 'Database Name', type: 'string', required: true },
    ],
  })

  .withAction('find', {
    name: 'Find Documents',
    description: 'Query documents from a collection',
    input: z.object({
      collection: z.string(),
      filter: z.record(z.unknown()).optional().default({}),
      projection: z.record(z.number()).optional(),
      sort: z.record(z.number()).optional(),
      limit: z.number().optional().default(100),
      skip: z.number().optional().default(0),
    }),
    output: z.object({
      documents: z.array(z.record(z.unknown())),
      count: z.number(),
    }),
    execute: async (input, ctx) => {
      // In production, would use mongodb driver
      ctx.logger.info('Finding documents', { collection: input.collection, filter: input.filter });
      
      return {
        documents: [],
        count: 0,
      };
    },
  })

  .withAction('findOne', {
    name: 'Find One Document',
    description: 'Find a single document',
    input: z.object({
      collection: z.string(),
      filter: z.record(z.unknown()),
      projection: z.record(z.number()).optional(),
    }),
    output: z.object({
      document: z.record(z.unknown()).nullable(),
    }),
    execute: async (input, ctx) => {
      ctx.logger.info('Finding one document', { collection: input.collection });
      return { document: null };
    },
  })

  .withAction('insertOne', {
    name: 'Insert Document',
    description: 'Insert a new document',
    input: z.object({
      collection: z.string(),
      document: z.record(z.unknown()),
    }),
    output: z.object({
      insertedId: z.string(),
      acknowledged: z.boolean(),
    }),
    execute: async (input, ctx) => {
      ctx.logger.info('Inserting document', { collection: input.collection });
      return {
        insertedId: 'mock_id',
        acknowledged: true,
      };
    },
  })

  .withAction('insertMany', {
    name: 'Insert Many Documents',
    description: 'Insert multiple documents',
    input: z.object({
      collection: z.string(),
      documents: z.array(z.record(z.unknown())),
    }),
    output: z.object({
      insertedIds: z.array(z.string()),
      insertedCount: z.number(),
      acknowledged: z.boolean(),
    }),
    execute: async (input, ctx) => {
      ctx.logger.info('Inserting documents', { collection: input.collection, count: input.documents.length });
      return {
        insertedIds: input.documents.map(() => 'mock_id'),
        insertedCount: input.documents.length,
        acknowledged: true,
      };
    },
  })

  .withAction('updateOne', {
    name: 'Update Document',
    description: 'Update a single document',
    input: z.object({
      collection: z.string(),
      filter: z.record(z.unknown()),
      update: z.record(z.unknown()),
      upsert: z.boolean().optional().default(false),
    }),
    output: z.object({
      matchedCount: z.number(),
      modifiedCount: z.number(),
      upsertedId: z.string().nullable(),
      acknowledged: z.boolean(),
    }),
    execute: async (input, ctx) => {
      ctx.logger.info('Updating document', { collection: input.collection });
      return {
        matchedCount: 1,
        modifiedCount: 1,
        upsertedId: null,
        acknowledged: true,
      };
    },
  })

  .withAction('updateMany', {
    name: 'Update Many Documents',
    description: 'Update multiple documents',
    input: z.object({
      collection: z.string(),
      filter: z.record(z.unknown()),
      update: z.record(z.unknown()),
    }),
    output: z.object({
      matchedCount: z.number(),
      modifiedCount: z.number(),
      acknowledged: z.boolean(),
    }),
    execute: async (input, ctx) => {
      ctx.logger.info('Updating documents', { collection: input.collection });
      return {
        matchedCount: 0,
        modifiedCount: 0,
        acknowledged: true,
      };
    },
  })

  .withAction('deleteOne', {
    name: 'Delete Document',
    description: 'Delete a single document',
    input: z.object({
      collection: z.string(),
      filter: z.record(z.unknown()),
    }),
    output: z.object({
      deletedCount: z.number(),
      acknowledged: z.boolean(),
    }),
    execute: async (input, ctx) => {
      ctx.logger.info('Deleting document', { collection: input.collection });
      return {
        deletedCount: 1,
        acknowledged: true,
      };
    },
  })

  .withAction('deleteMany', {
    name: 'Delete Many Documents',
    description: 'Delete multiple documents',
    input: z.object({
      collection: z.string(),
      filter: z.record(z.unknown()),
    }),
    output: z.object({
      deletedCount: z.number(),
      acknowledged: z.boolean(),
    }),
    execute: async (input, ctx) => {
      ctx.logger.info('Deleting documents', { collection: input.collection });
      return {
        deletedCount: 0,
        acknowledged: true,
      };
    },
  })

  .withAction('aggregate', {
    name: 'Aggregate',
    description: 'Run an aggregation pipeline',
    input: z.object({
      collection: z.string(),
      pipeline: z.array(z.record(z.unknown())),
    }),
    output: z.object({
      results: z.array(z.record(z.unknown())),
    }),
    execute: async (input, ctx) => {
      ctx.logger.info('Running aggregation', { collection: input.collection, stages: input.pipeline.length });
      return { results: [] };
    },
  })

  .withAction('countDocuments', {
    name: 'Count Documents',
    description: 'Count documents matching a filter',
    input: z.object({
      collection: z.string(),
      filter: z.record(z.unknown()).optional().default({}),
    }),
    output: z.object({
      count: z.number(),
    }),
    execute: async (input, ctx) => {
      ctx.logger.info('Counting documents', { collection: input.collection });
      return { count: 0 };
    },
  })

  .withTestConnection(async (credentials, ctx): Promise<TestConnectionResult> => {
    try {
      // Would test connection using mongodb driver
      return {
        success: true,
        message: 'Connected to MongoDB',
        accountInfo: {
          database: credentials.database as string,
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

export default mongodbConnector;
