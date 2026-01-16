/**
 * Google Sheets Connector
 * 
 * Full integration with Google Sheets API including:
 * - Read/write spreadsheet data
 * - Create/manage spreadsheets
 * - Batch operations
 * - Formatting
 * 
 * @module connectors/google-sheets
 */

import { z } from 'zod';
import { createConnector } from '../packages/connector-sdk/src/builder';
import type { TestConnectionResult } from '../packages/connector-sdk/src/types';

// ============================================
// Google Sheets Connector
// ============================================

export const googleSheetsConnector = createConnector({
  id: 'google-sheets',
  name: 'Google Sheets',
  version: '1.0.0',
  category: 'productivity',
  description: 'Read, write, and manage Google Sheets spreadsheets',
  color: '#0F9D58',
  icon: 'https://cdn.wfaib.io/connectors/google-sheets.svg',
  tags: ['spreadsheet', 'google', 'data', 'excel'],
  docsUrl: 'https://developers.google.com/sheets/api',
  baseUrl: 'https://sheets.googleapis.com/v4',
})
  // ============================================
  // Authentication
  // ============================================
  .withOAuth2({
    grantType: 'authorization_code',
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file',
    ],
    authParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
    refreshable: true,
    pkce: true,
  })

  // ============================================
  // Read Actions
  // ============================================

  .withAction('getSpreadsheet', {
    name: 'Get Spreadsheet',
    description: 'Get spreadsheet metadata and properties',
    input: z.object({
      spreadsheetId: z.string().describe('The ID of the spreadsheet'),
      includeGridData: z.boolean().default(false),
    }),
    output: z.object({
      spreadsheetId: z.string(),
      properties: z.object({
        title: z.string(),
        locale: z.string().optional(),
        timeZone: z.string().optional(),
      }),
      sheets: z.array(z.object({
        properties: z.object({
          sheetId: z.number(),
          title: z.string(),
          index: z.number(),
          gridProperties: z.object({
            rowCount: z.number(),
            columnCount: z.number(),
          }).optional(),
        }),
      })),
      spreadsheetUrl: z.string(),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.get(`/spreadsheets/${input.spreadsheetId}`, {
        params: {
          includeGridData: String(input.includeGridData),
        },
      });
      return response.data;
    },
  })

  .withAction('getValues', {
    name: 'Get Values',
    description: 'Read values from a range in a spreadsheet',
    input: z.object({
      spreadsheetId: z.string(),
      range: z.string().describe('A1 notation range (e.g., "Sheet1!A1:D10")'),
      majorDimension: z.enum(['ROWS', 'COLUMNS']).default('ROWS'),
      valueRenderOption: z.enum(['FORMATTED_VALUE', 'UNFORMATTED_VALUE', 'FORMULA']).default('FORMATTED_VALUE'),
      dateTimeRenderOption: z.enum(['SERIAL_NUMBER', 'FORMATTED_STRING']).default('FORMATTED_STRING'),
    }),
    output: z.object({
      range: z.string(),
      majorDimension: z.string(),
      values: z.array(z.array(z.unknown())),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.get(
        `/spreadsheets/${input.spreadsheetId}/values/${encodeURIComponent(input.range)}`,
        {
          params: {
            majorDimension: input.majorDimension,
            valueRenderOption: input.valueRenderOption,
            dateTimeRenderOption: input.dateTimeRenderOption,
          },
        }
      );
      return response.data;
    },
  })

  .withAction('batchGetValues', {
    name: 'Batch Get Values',
    description: 'Read values from multiple ranges',
    input: z.object({
      spreadsheetId: z.string(),
      ranges: z.array(z.string()).describe('Array of A1 notation ranges'),
      majorDimension: z.enum(['ROWS', 'COLUMNS']).default('ROWS'),
      valueRenderOption: z.enum(['FORMATTED_VALUE', 'UNFORMATTED_VALUE', 'FORMULA']).default('FORMATTED_VALUE'),
    }),
    output: z.object({
      spreadsheetId: z.string(),
      valueRanges: z.array(z.object({
        range: z.string(),
        majorDimension: z.string(),
        values: z.array(z.array(z.unknown())),
      })),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.get(
        `/spreadsheets/${input.spreadsheetId}/values:batchGet`,
        {
          params: {
            ranges: input.ranges,
            majorDimension: input.majorDimension,
            valueRenderOption: input.valueRenderOption,
          },
        }
      );
      return response.data;
    },
  })

  // ============================================
  // Write Actions
  // ============================================

  .withAction('updateValues', {
    name: 'Update Values',
    description: 'Write values to a range in a spreadsheet',
    input: z.object({
      spreadsheetId: z.string(),
      range: z.string().describe('A1 notation range'),
      values: z.array(z.array(z.unknown())).describe('2D array of values'),
      valueInputOption: z.enum(['RAW', 'USER_ENTERED']).default('USER_ENTERED'),
      includeValuesInResponse: z.boolean().default(false),
    }),
    output: z.object({
      spreadsheetId: z.string(),
      updatedRange: z.string(),
      updatedRows: z.number(),
      updatedColumns: z.number(),
      updatedCells: z.number(),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.put(
        `/spreadsheets/${input.spreadsheetId}/values/${encodeURIComponent(input.range)}`,
        {
          range: input.range,
          majorDimension: 'ROWS',
          values: input.values,
        },
        {
          params: {
            valueInputOption: input.valueInputOption,
            includeValuesInResponse: String(input.includeValuesInResponse),
          },
        }
      );
      return response.data;
    },
  })

  .withAction('appendValues', {
    name: 'Append Values',
    description: 'Append rows to the end of a sheet',
    input: z.object({
      spreadsheetId: z.string(),
      range: z.string().describe('Range to search for table (e.g., "Sheet1!A:A")'),
      values: z.array(z.array(z.unknown())).describe('Rows to append'),
      valueInputOption: z.enum(['RAW', 'USER_ENTERED']).default('USER_ENTERED'),
      insertDataOption: z.enum(['OVERWRITE', 'INSERT_ROWS']).default('INSERT_ROWS'),
    }),
    output: z.object({
      spreadsheetId: z.string(),
      tableRange: z.string().optional(),
      updates: z.object({
        spreadsheetId: z.string(),
        updatedRange: z.string(),
        updatedRows: z.number(),
        updatedColumns: z.number(),
        updatedCells: z.number(),
      }),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.post(
        `/spreadsheets/${input.spreadsheetId}/values/${encodeURIComponent(input.range)}:append`,
        {
          range: input.range,
          majorDimension: 'ROWS',
          values: input.values,
        },
        {
          params: {
            valueInputOption: input.valueInputOption,
            insertDataOption: input.insertDataOption,
          },
        }
      );
      return response.data;
    },
  })

  .withAction('clearValues', {
    name: 'Clear Values',
    description: 'Clear values from a range (keeps formatting)',
    input: z.object({
      spreadsheetId: z.string(),
      range: z.string(),
    }),
    output: z.object({
      spreadsheetId: z.string(),
      clearedRange: z.string(),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.post(
        `/spreadsheets/${input.spreadsheetId}/values/${encodeURIComponent(input.range)}:clear`,
        {}
      );
      return response.data;
    },
  })

  // ============================================
  // Spreadsheet Management
  // ============================================

  .withAction('createSpreadsheet', {
    name: 'Create Spreadsheet',
    description: 'Create a new spreadsheet',
    input: z.object({
      title: z.string(),
      sheets: z.array(z.object({
        title: z.string(),
        rowCount: z.number().default(1000),
        columnCount: z.number().default(26),
      })).optional(),
      locale: z.string().optional(),
      timeZone: z.string().optional(),
    }),
    output: z.object({
      spreadsheetId: z.string(),
      spreadsheetUrl: z.string(),
      properties: z.object({
        title: z.string(),
      }),
      sheets: z.array(z.object({
        properties: z.object({
          sheetId: z.number(),
          title: z.string(),
        }),
      })),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.post('/spreadsheets', {
        properties: {
          title: input.title,
          locale: input.locale,
          timeZone: input.timeZone,
        },
        sheets: input.sheets?.map(sheet => ({
          properties: {
            title: sheet.title,
            gridProperties: {
              rowCount: sheet.rowCount,
              columnCount: sheet.columnCount,
            },
          },
        })),
      });
      return response.data;
    },
  })

  .withAction('addSheet', {
    name: 'Add Sheet',
    description: 'Add a new sheet to an existing spreadsheet',
    input: z.object({
      spreadsheetId: z.string(),
      title: z.string(),
      rowCount: z.number().default(1000),
      columnCount: z.number().default(26),
      index: z.number().optional().describe('Position of the sheet'),
    }),
    output: z.object({
      spreadsheetId: z.string(),
      replies: z.array(z.object({
        addSheet: z.object({
          properties: z.object({
            sheetId: z.number(),
            title: z.string(),
            index: z.number(),
          }),
        }),
      })),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.post(
        `/spreadsheets/${input.spreadsheetId}:batchUpdate`,
        {
          requests: [{
            addSheet: {
              properties: {
                title: input.title,
                index: input.index,
                gridProperties: {
                  rowCount: input.rowCount,
                  columnCount: input.columnCount,
                },
              },
            },
          }],
        }
      );
      return response.data;
    },
  })

  .withAction('deleteSheet', {
    name: 'Delete Sheet',
    description: 'Delete a sheet from a spreadsheet',
    input: z.object({
      spreadsheetId: z.string(),
      sheetId: z.number(),
    }),
    output: z.object({
      spreadsheetId: z.string(),
      replies: z.array(z.unknown()),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.post(
        `/spreadsheets/${input.spreadsheetId}:batchUpdate`,
        {
          requests: [{
            deleteSheet: {
              sheetId: input.sheetId,
            },
          }],
        }
      );
      return response.data;
    },
  })

  // ============================================
  // Row Operations
  // ============================================

  .withAction('insertRows', {
    name: 'Insert Rows',
    description: 'Insert empty rows at a specific position',
    input: z.object({
      spreadsheetId: z.string(),
      sheetId: z.number(),
      startIndex: z.number().describe('Row index to insert at (0-based)'),
      numRows: z.number().default(1),
    }),
    output: z.object({
      spreadsheetId: z.string(),
      replies: z.array(z.unknown()),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.post(
        `/spreadsheets/${input.spreadsheetId}:batchUpdate`,
        {
          requests: [{
            insertDimension: {
              range: {
                sheetId: input.sheetId,
                dimension: 'ROWS',
                startIndex: input.startIndex,
                endIndex: input.startIndex + input.numRows,
              },
              inheritFromBefore: false,
            },
          }],
        }
      );
      return response.data;
    },
  })

  .withAction('deleteRows', {
    name: 'Delete Rows',
    description: 'Delete rows from a sheet',
    input: z.object({
      spreadsheetId: z.string(),
      sheetId: z.number(),
      startIndex: z.number().describe('First row to delete (0-based)'),
      endIndex: z.number().describe('Row after last to delete (0-based)'),
    }),
    output: z.object({
      spreadsheetId: z.string(),
      replies: z.array(z.unknown()),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.post(
        `/spreadsheets/${input.spreadsheetId}:batchUpdate`,
        {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: input.sheetId,
                dimension: 'ROWS',
                startIndex: input.startIndex,
                endIndex: input.endIndex,
              },
            },
          }],
        }
      );
      return response.data;
    },
  })

  // ============================================
  // Lookup Action (Common Use Case)
  // ============================================

  .withAction('lookupRow', {
    name: 'Lookup Row',
    description: 'Find a row by matching a column value',
    input: z.object({
      spreadsheetId: z.string(),
      sheetName: z.string(),
      lookupColumn: z.string().describe('Column letter to search (e.g., "A")'),
      lookupValue: z.string().describe('Value to find'),
      returnColumns: z.array(z.string()).optional().describe('Columns to return (e.g., ["A", "B", "C"])'),
    }),
    output: z.object({
      found: z.boolean(),
      rowIndex: z.number().nullable(),
      values: z.record(z.unknown()).nullable(),
    }),
    execute: async (input, ctx) => {
      // Get the lookup column data
      const columnRange = `${input.sheetName}!${input.lookupColumn}:${input.lookupColumn}`;
      const columnResponse = await ctx.http.get(
        `/spreadsheets/${input.spreadsheetId}/values/${encodeURIComponent(columnRange)}`
      );
      
      const columnValues = columnResponse.data.values || [];
      
      // Find the row index
      let rowIndex: number | null = null;
      for (let i = 0; i < columnValues.length; i++) {
        if (columnValues[i][0] === input.lookupValue) {
          rowIndex = i + 1; // 1-based for A1 notation
          break;
        }
      }
      
      if (rowIndex === null) {
        return { found: false, rowIndex: null, values: null };
      }
      
      // Get the full row or specific columns
      const returnCols = input.returnColumns || ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
      const rowRange = `${input.sheetName}!${returnCols[0]}${rowIndex}:${returnCols[returnCols.length - 1]}${rowIndex}`;
      
      const rowResponse = await ctx.http.get(
        `/spreadsheets/${input.spreadsheetId}/values/${encodeURIComponent(rowRange)}`
      );
      
      const rowValues = rowResponse.data.values?.[0] || [];
      const values: Record<string, unknown> = {};
      
      returnCols.forEach((col, idx) => {
        values[col] = rowValues[idx];
      });
      
      return {
        found: true,
        rowIndex,
        values,
      };
    },
  })

  // ============================================
  // Rate Limiting
  // ============================================
  .withRateLimit({
    requests: 300,
    window: 60000, // 1 minute
    strategy: 'queue',
  })

  // ============================================
  // Test Connection
  // ============================================
  .withTestConnection(async (credentials, ctx): Promise<TestConnectionResult> => {
    try {
      // Try to list files to verify access
      const driveResponse = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
        headers: {
          'Authorization': `Bearer ${credentials.accessToken}`,
        },
      });
      
      if (!driveResponse.ok) {
        throw new Error('Failed to verify credentials');
      }
      
      const data = await driveResponse.json();
      
      return {
        success: true,
        message: 'Successfully connected to Google Sheets',
        accountInfo: {
          email: data.user?.emailAddress,
          name: data.user?.displayName,
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

export default googleSheetsConnector;
