/**
 * FlowAtGenAi - Google Drive Connector
 * 
 * File storage integration:
 * - Files and folders management
 * - Sharing and permissions
 * - Search and export
 * 
 * @module connectors/google-drive
 */

import { z } from 'zod';
import { createConnector } from '../packages/connector-sdk/src/builder';
import type { TestConnectionResult } from '../packages/connector-sdk/src/types';

export const googleDriveConnector = createConnector({
  id: 'google-drive',
  name: 'Google Drive',
  version: '1.0.0',
  category: 'storage',
  description: 'Manage files and folders in Google Drive',
  color: '#4285F4',
  icon: 'https://cdn.flowatgenai.com/connectors/google-drive.svg',
  tags: ['storage', 'files', 'cloud', 'google'],
  docsUrl: 'https://developers.google.com/drive/api/v3/reference',
  baseUrl: 'https://www.googleapis.com/drive/v3',
})
  .withOAuth2({
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/drive'],
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'string', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
  })

  .withAction('listFiles', {
    name: 'List Files',
    description: 'List files and folders',
    input: z.object({
      folderId: z.string().optional().describe('Parent folder ID. Use "root" for root folder'),
      query: z.string().optional().describe('Search query'),
      pageSize: z.number().optional().default(100),
      orderBy: z.string().optional().default('modifiedTime desc'),
    }),
    output: z.object({
      files: z.array(z.object({
        id: z.string(),
        name: z.string(),
        mimeType: z.string(),
        size: z.string().optional(),
        createdTime: z.string(),
        modifiedTime: z.string(),
        webViewLink: z.string().optional(),
      })),
      nextPageToken: z.string().optional(),
    }),
    execute: async (input, ctx) => {
      let q = '';
      if (input.folderId) q = `'${input.folderId}' in parents`;
      if (input.query) q = q ? `${q} and ${input.query}` : input.query;

      const response = await ctx.http.get('/files', {
        params: {
          q: q || undefined,
          pageSize: String(input.pageSize),
          orderBy: input.orderBy,
          fields: 'files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink),nextPageToken',
        },
      });
      return response.data as Record<string, unknown>;
    },
  })

  .withAction('getFile', {
    name: 'Get File',
    description: 'Get file metadata',
    input: z.object({
      fileId: z.string(),
    }),
    output: z.object({
      id: z.string(),
      name: z.string(),
      mimeType: z.string(),
      size: z.string(),
      webViewLink: z.string(),
      webContentLink: z.string().optional(),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.get(`/files/${input.fileId}`, {
        params: {
          fields: 'id,name,mimeType,size,webViewLink,webContentLink,createdTime,modifiedTime,parents',
        },
      });
      return response.data as Record<string, unknown>;
    },
  })

  .withAction('createFolder', {
    name: 'Create Folder',
    description: 'Create a new folder',
    input: z.object({
      name: z.string(),
      parentId: z.string().optional(),
    }),
    output: z.object({
      id: z.string(),
      name: z.string(),
      webViewLink: z.string(),
    }),
    execute: async (input, ctx) => {
      const metadata: Record<string, unknown> = {
        name: input.name,
        mimeType: 'application/vnd.google-apps.folder',
      };
      if (input.parentId) metadata.parents = [input.parentId];

      const response = await ctx.http.post('/files', metadata, {
        params: { fields: 'id,name,webViewLink' },
      });
      return response.data as Record<string, unknown>;
    },
  })

  .withAction('copyFile', {
    name: 'Copy File',
    description: 'Copy a file',
    input: z.object({
      fileId: z.string(),
      name: z.string().optional(),
      parentId: z.string().optional(),
    }),
    output: z.object({
      id: z.string(),
      name: z.string(),
      webViewLink: z.string(),
    }),
    execute: async (input, ctx) => {
      const metadata: Record<string, unknown> = {};
      if (input.name) metadata.name = input.name;
      if (input.parentId) metadata.parents = [input.parentId];

      const response = await ctx.http.post(`/files/${input.fileId}/copy`, metadata);
      return response.data as Record<string, unknown>;
    },
  })

  .withAction('moveFile', {
    name: 'Move File',
    description: 'Move a file to a different folder',
    input: z.object({
      fileId: z.string(),
      newParentId: z.string(),
      removeFromCurrent: z.boolean().optional().default(true),
    }),
    output: z.object({
      id: z.string(),
      name: z.string(),
      parents: z.array(z.string()),
    }),
    execute: async (input, ctx) => {
      const file = await ctx.http.get(`/files/${input.fileId}`, {
        params: { fields: 'parents' },
      });
      const previousParents = (file.data as { parents: string[] }).parents?.join(',') || '';

      const response = await ctx.http.patch(`/files/${input.fileId}`, {}, {
        params: {
          addParents: input.newParentId,
          removeParents: input.removeFromCurrent ? previousParents : undefined,
          fields: 'id,name,parents',
        },
      });
      return response.data as Record<string, unknown>;
    },
  })

  .withAction('deleteFile', {
    name: 'Delete File',
    description: 'Delete a file or folder',
    input: z.object({
      fileId: z.string(),
    }),
    output: z.object({
      success: z.boolean(),
    }),
    execute: async (input, ctx) => {
      await ctx.http.delete(`/files/${input.fileId}`);
      return { success: true };
    },
  })

  .withAction('shareFile', {
    name: 'Share File',
    description: 'Share a file with a user or publicly',
    input: z.object({
      fileId: z.string(),
      type: z.enum(['user', 'group', 'domain', 'anyone']),
      role: z.enum(['reader', 'commenter', 'writer', 'fileOrganizer', 'organizer', 'owner']),
      emailAddress: z.string().email().optional(),
      domain: z.string().optional(),
      sendNotificationEmail: z.boolean().optional().default(true),
    }),
    output: z.object({
      id: z.string(),
      type: z.string(),
      role: z.string(),
    }),
    execute: async (input, ctx) => {
      const permission: Record<string, unknown> = {
        type: input.type,
        role: input.role,
      };
      if (input.emailAddress) permission.emailAddress = input.emailAddress;
      if (input.domain) permission.domain = input.domain;

      const response = await ctx.http.post(
        `/files/${input.fileId}/permissions`,
        permission,
        {
          params: {
            sendNotificationEmail: String(input.sendNotificationEmail),
          },
        }
      );
      return response.data as Record<string, unknown>;
    },
  })

  .withAction('searchFiles', {
    name: 'Search Files',
    description: 'Search for files by name or content',
    input: z.object({
      query: z.string().describe('Search query (file name contains)'),
      mimeType: z.string().optional(),
      inTrash: z.boolean().optional().default(false),
    }),
    output: z.object({
      files: z.array(z.object({
        id: z.string(),
        name: z.string(),
        mimeType: z.string(),
      })),
    }),
    execute: async (input, ctx) => {
      let q = `name contains '${input.query}'`;
      if (input.mimeType) q += ` and mimeType = '${input.mimeType}'`;
      q += ` and trashed = ${input.inTrash}`;

      const response = await ctx.http.get('/files', {
        params: {
          q,
          fields: 'files(id,name,mimeType,webViewLink)',
        },
      });
      return response.data as Record<string, unknown>;
    },
  })

  .withWebhookTrigger('fileChanged', {
    name: 'File Changed',
    description: 'Triggered when a file is modified',
    output: z.object({
      kind: z.string(),
      fileId: z.string(),
      changed: z.boolean(),
    }),
    signatureHeader: 'x-goog-channel-token',
    verifySignature: () => true,
  })

  .withRateLimit({
    requests: 100,
    window: 100000,
    strategy: 'queue',
  })

  .withTestConnection(async (credentials, ctx): Promise<TestConnectionResult> => {
    try {
      const response = await ctx.http.get<{ user: { displayName: string; emailAddress: string } }>(
        '/about',
        { params: { fields: 'user(displayName,emailAddress)' } }
      );
      
      return {
        success: true,
        message: 'Successfully connected to Google Drive',
        accountInfo: {
          name: response.data.user.displayName,
          email: response.data.user.emailAddress,
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

export default googleDriveConnector;
