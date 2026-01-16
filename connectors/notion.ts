/**
 * Notion Connector
 * 
 * Full Notion API integration:
 * - Database operations (query, create, update)
 * - Page management
 * - Block manipulation
 * - Search
 * 
 * @module connectors/notion
 */

import { z } from 'zod';
import { createConnector } from '../packages/connector-sdk/src/builder';
import type { TestConnectionResult } from '../packages/connector-sdk/src/types';

// ============================================
// Notion-specific schemas
// ============================================

const richTextSchema = z.object({
  type: z.literal('text'),
  text: z.object({
    content: z.string(),
    link: z.object({ url: z.string() }).nullable().optional(),
  }),
  annotations: z.object({
    bold: z.boolean().optional(),
    italic: z.boolean().optional(),
    strikethrough: z.boolean().optional(),
    underline: z.boolean().optional(),
    code: z.boolean().optional(),
  }).optional(),
});

const propertyValueSchema = z.union([
  z.object({ type: z.literal('title'), title: z.array(richTextSchema) }),
  z.object({ type: z.literal('rich_text'), rich_text: z.array(richTextSchema) }),
  z.object({ type: z.literal('number'), number: z.number().nullable() }),
  z.object({ type: z.literal('select'), select: z.object({ name: z.string() }).nullable() }),
  z.object({ type: z.literal('multi_select'), multi_select: z.array(z.object({ name: z.string() })) }),
  z.object({ type: z.literal('date'), date: z.object({ start: z.string(), end: z.string().nullable() }).nullable() }),
  z.object({ type: z.literal('checkbox'), checkbox: z.boolean() }),
  z.object({ type: z.literal('url'), url: z.string().nullable() }),
  z.object({ type: z.literal('email'), email: z.string().nullable() }),
  z.object({ type: z.literal('phone_number'), phone_number: z.string().nullable() }),
  z.object({ type: z.literal('status'), status: z.object({ name: z.string() }).nullable() }),
]);

const filterSchema = z.object({
  property: z.string(),
  condition: z.enum([
    'equals', 'does_not_equal', 'contains', 'does_not_contain',
    'starts_with', 'ends_with', 'is_empty', 'is_not_empty',
    'greater_than', 'less_than', 'greater_than_or_equal_to', 'less_than_or_equal_to',
  ]),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
});

// ============================================
// Notion Connector
// ============================================

export const notionConnector = createConnector({
  id: 'notion',
  name: 'Notion',
  version: '1.0.0',
  category: 'productivity',
  description: 'Manage Notion databases, pages, and blocks',
  color: '#000000',
  icon: 'https://cdn.wfaib.io/connectors/notion.svg',
  tags: ['docs', 'wiki', 'database', 'notes', 'productivity'],
  docsUrl: 'https://developers.notion.com/',
  baseUrl: 'https://api.notion.com/v1',
  defaultHeaders: {
    'Notion-Version': '2022-06-28',
  },
})
  .withApiKey({
    location: 'header',
    name: 'Authorization',
    prefix: 'Bearer ',
    fields: [
      {
        key: 'apiKey',
        label: 'Integration Token',
        type: 'password',
        required: true,
        description: 'Internal integration token from notion.so/my-integrations',
        placeholder: 'secret_...',
      },
    ],
  })

  // ============================================
  // Database Actions
  // ============================================

  .withAction('queryDatabase', {
    name: 'Query Database',
    description: 'Query a Notion database with filters and sorts',
    input: z.object({
      databaseId: z.string().describe('Database ID or URL'),
      filter: z.object({
        and: z.array(filterSchema).optional(),
        or: z.array(filterSchema).optional(),
      }).optional(),
      sorts: z.array(z.object({
        property: z.string(),
        direction: z.enum(['ascending', 'descending']),
      })).optional(),
      pageSize: z.number().min(1).max(100).default(100),
      startCursor: z.string().optional(),
    }),
    output: z.object({
      results: z.array(z.object({
        id: z.string(),
        properties: z.record(z.unknown()),
        url: z.string(),
        created_time: z.string(),
        last_edited_time: z.string(),
      })),
      has_more: z.boolean(),
      next_cursor: z.string().nullable(),
    }),
    execute: async (input, ctx) => {
      const databaseId = extractNotionId(input.databaseId);
      
      // Build filter object for Notion API
      const notionFilter = input.filter ? buildNotionFilter(input.filter) : undefined;

      const response = await ctx.http.post(`/databases/${databaseId}/query`, {
        filter: notionFilter,
        sorts: input.sorts,
        page_size: input.pageSize,
        start_cursor: input.startCursor,
      });

      return response.data as Record<string, unknown>;
    },
  })

  .withAction('createDatabaseItem', {
    name: 'Create Database Item',
    description: 'Add a new item to a Notion database',
    input: z.object({
      databaseId: z.string(),
      properties: z.record(z.unknown()).describe('Property values to set'),
      children: z.array(z.unknown()).optional().describe('Page content blocks'),
    }),
    output: z.object({
      id: z.string(),
      url: z.string(),
      properties: z.record(z.unknown()),
      created_time: z.string(),
    }),
    execute: async (input, ctx) => {
      const databaseId = extractNotionId(input.databaseId);
      
      const response = await ctx.http.post('/pages', {
        parent: { database_id: databaseId },
        properties: formatPropertiesForCreate(input.properties),
        children: input.children,
      });

      return response.data as Record<string, unknown>;
    },
  })

  .withAction('updateDatabaseItem', {
    name: 'Update Database Item',
    description: 'Update properties of a database item',
    input: z.object({
      pageId: z.string(),
      properties: z.record(z.unknown()),
    }),
    output: z.object({
      id: z.string(),
      url: z.string(),
      properties: z.record(z.unknown()),
      last_edited_time: z.string(),
    }),
    execute: async (input, ctx) => {
      const pageId = extractNotionId(input.pageId);
      
      const response = await ctx.http.patch(`/pages/${pageId}`, {
        properties: formatPropertiesForCreate(input.properties),
      });

      return response.data as Record<string, unknown>;
    },
  })

  .withAction('getDatabase', {
    name: 'Get Database',
    description: 'Get database schema and metadata',
    input: z.object({
      databaseId: z.string(),
    }),
    output: z.object({
      id: z.string(),
      title: z.array(richTextSchema),
      properties: z.record(z.object({
        id: z.string(),
        type: z.string(),
        name: z.string(),
      })),
      url: z.string(),
    }),
    execute: async (input, ctx) => {
      const databaseId = extractNotionId(input.databaseId);
      const response = await ctx.http.get(`/databases/${databaseId}`);
      return response.data as Record<string, unknown>;
    },
  })

  // ============================================
  // Page Actions
  // ============================================

  .withAction('createPage', {
    name: 'Create Page',
    description: 'Create a new page in a parent page or workspace',
    input: z.object({
      parentPageId: z.string().optional(),
      parentDatabaseId: z.string().optional(),
      title: z.string(),
      icon: z.union([
        z.object({ type: z.literal('emoji'), emoji: z.string() }),
        z.object({ type: z.literal('external'), external: z.object({ url: z.string() }) }),
      ]).optional(),
      cover: z.object({
        type: z.literal('external'),
        external: z.object({ url: z.string() }),
      }).optional(),
      children: z.array(z.unknown()).optional().describe('Page content blocks'),
    }),
    output: z.object({
      id: z.string(),
      url: z.string(),
      created_time: z.string(),
    }),
    execute: async (input, ctx) => {
      const parent = input.parentPageId 
        ? { page_id: extractNotionId(input.parentPageId) }
        : input.parentDatabaseId 
          ? { database_id: extractNotionId(input.parentDatabaseId) }
          : { workspace: true };

      const properties = input.parentDatabaseId
        ? { title: { title: [{ text: { content: input.title } }] } }
        : { title: { title: [{ text: { content: input.title } }] } };

      const response = await ctx.http.post('/pages', {
        parent,
        properties,
        icon: input.icon,
        cover: input.cover,
        children: input.children || [],
      });

      return response.data as Record<string, unknown>;
    },
  })

  .withAction('getPage', {
    name: 'Get Page',
    description: 'Get a page by ID',
    input: z.object({
      pageId: z.string(),
    }),
    output: z.object({
      id: z.string(),
      url: z.string(),
      properties: z.record(z.unknown()),
      icon: z.unknown().nullable(),
      cover: z.unknown().nullable(),
      created_time: z.string(),
      last_edited_time: z.string(),
    }),
    execute: async (input, ctx) => {
      const pageId = extractNotionId(input.pageId);
      const response = await ctx.http.get(`/pages/${pageId}`);
      return response.data as Record<string, unknown>;
    },
  })

  .withAction('archivePage', {
    name: 'Archive Page',
    description: 'Archive (soft delete) a page',
    input: z.object({
      pageId: z.string(),
    }),
    output: z.object({
      id: z.string(),
      archived: z.boolean(),
    }),
    execute: async (input, ctx) => {
      const pageId = extractNotionId(input.pageId);
      const response = await ctx.http.patch(`/pages/${pageId}`, {
        archived: true,
      });
      return response.data as Record<string, unknown>;
    },
  })

  // ============================================
  // Block Actions
  // ============================================

  .withAction('getBlockChildren', {
    name: 'Get Block Children',
    description: 'Get child blocks of a page or block',
    input: z.object({
      blockId: z.string(),
      pageSize: z.number().min(1).max(100).default(100),
      startCursor: z.string().optional(),
    }),
    output: z.object({
      results: z.array(z.object({
        id: z.string(),
        type: z.string(),
        has_children: z.boolean(),
      })),
      has_more: z.boolean(),
      next_cursor: z.string().nullable(),
    }),
    execute: async (input, ctx) => {
      const blockId = extractNotionId(input.blockId);
      const response = await ctx.http.get(`/blocks/${blockId}/children`, {
        params: {
          page_size: String(input.pageSize),
          start_cursor: input.startCursor,
        },
      });
      return response.data as Record<string, unknown>;
    },
  })

  .withAction('appendBlockChildren', {
    name: 'Append Block Children',
    description: 'Add content blocks to a page or block',
    input: z.object({
      blockId: z.string(),
      children: z.array(z.unknown()).describe('Array of block objects'),
    }),
    output: z.object({
      results: z.array(z.object({
        id: z.string(),
        type: z.string(),
      })),
    }),
    execute: async (input, ctx) => {
      const blockId = extractNotionId(input.blockId);
      const response = await ctx.http.patch(`/blocks/${blockId}/children`, {
        children: input.children,
      });
      return response.data as Record<string, unknown>;
    },
  })

  // ============================================
  // Search
  // ============================================

  .withAction('search', {
    name: 'Search',
    description: 'Search for pages and databases',
    input: z.object({
      query: z.string().optional(),
      filter: z.object({
        property: z.literal('object'),
        value: z.enum(['page', 'database']),
      }).optional(),
      sort: z.object({
        direction: z.enum(['ascending', 'descending']),
        timestamp: z.enum(['last_edited_time']),
      }).optional(),
      pageSize: z.number().min(1).max(100).default(100),
      startCursor: z.string().optional(),
    }),
    output: z.object({
      results: z.array(z.object({
        id: z.string(),
        object: z.enum(['page', 'database']),
        url: z.string(),
      })),
      has_more: z.boolean(),
      next_cursor: z.string().nullable(),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.post('/search', {
        query: input.query,
        filter: input.filter,
        sort: input.sort,
        page_size: input.pageSize,
        start_cursor: input.startCursor,
      });
      return response.data as Record<string, unknown>;
    },
  })

  .withRateLimit({
    requests: 3, // Notion has strict rate limits
    window: 1000,
    strategy: 'queue',
  })

  .withTestConnection(async (credentials, ctx): Promise<TestConnectionResult> => {
    try {
      const response = await ctx.http.get<{ bot: { owner: { user: { name: string } } } }>('/users/me');
      
      return {
        success: true,
        message: 'Successfully connected to Notion',
        accountInfo: {
          name: response.data.bot?.owner?.user?.name || 'Integration',
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

// ============================================
// Utilities
// ============================================

function extractNotionId(input: string): string {
  // Handle full URLs like https://notion.so/page-title-abc123def456
  const urlMatch = input.match(/([a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i);
  if (urlMatch) {
    return urlMatch[1];
  }
  // Handle IDs with or without dashes
  return input.replace(/-/g, '');
}

function buildNotionFilter(filter: { and?: unknown[]; or?: unknown[] }): unknown {
  if (filter.and) {
    return {
      and: filter.and.map(f => buildSingleFilter(f as { property: string; condition: string; value?: unknown })),
    };
  }
  if (filter.or) {
    return {
      or: filter.or.map(f => buildSingleFilter(f as { property: string; condition: string; value?: unknown })),
    };
  }
  return undefined;
}

function buildSingleFilter(f: { property: string; condition: string; value?: unknown }): unknown {
  const conditionMap: Record<string, string> = {
    'equals': 'equals',
    'does_not_equal': 'does_not_equal',
    'contains': 'contains',
    'does_not_contain': 'does_not_contain',
    'starts_with': 'starts_with',
    'ends_with': 'ends_with',
    'is_empty': 'is_empty',
    'is_not_empty': 'is_not_empty',
    'greater_than': 'greater_than',
    'less_than': 'less_than',
  };

  return {
    property: f.property,
    rich_text: {
      [conditionMap[f.condition] || f.condition]: f.value ?? true,
    },
  };
}

function formatPropertiesForCreate(properties: Record<string, unknown>): Record<string, unknown> {
  const formatted: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(properties)) {
    if (typeof value === 'string') {
      // Assume it's a title or rich_text
      formatted[key] = {
        rich_text: [{ text: { content: value } }],
      };
    } else if (typeof value === 'number') {
      formatted[key] = { number: value };
    } else if (typeof value === 'boolean') {
      formatted[key] = { checkbox: value };
    } else if (value && typeof value === 'object') {
      formatted[key] = value;
    }
  }
  
  return formatted;
}

export default notionConnector;
