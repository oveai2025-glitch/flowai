/**
 * FlowAtGenAi - Salesforce Connector
 * 
 * Enterprise CRM integration:
 * - Leads, Contacts, Accounts, Opportunities
 * - Custom objects and fields
 * - SOQL queries
 * - Bulk operations
 * 
 * @module connectors/salesforce
 */

import { z } from 'zod';
import { createConnector } from '../packages/connector-sdk/src/builder';
import type { TestConnectionResult } from '../packages/connector-sdk/src/types';

export const salesforceConnector = createConnector({
  id: 'salesforce',
  name: 'Salesforce',
  version: '1.0.0',
  category: 'crm',
  description: 'Connect to Salesforce CRM for leads, contacts, opportunities, and custom objects',
  color: '#00A1E0',
  icon: 'https://cdn.flowatgenai.com/connectors/salesforce.svg',
  tags: ['crm', 'sales', 'enterprise', 'leads'],
  docsUrl: 'https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/',
  baseUrl: 'https://{instance}.salesforce.com/services/data/v59.0',
})
  .withOAuth2({
    authorizationUrl: 'https://login.salesforce.com/services/oauth2/authorize',
    tokenUrl: 'https://login.salesforce.com/services/oauth2/token',
    scopes: ['api', 'refresh_token', 'offline_access'],
    fields: [
      { key: 'clientId', label: 'Consumer Key', type: 'string', required: true },
      { key: 'clientSecret', label: 'Consumer Secret', type: 'password', required: true },
      { key: 'sandbox', label: 'Use Sandbox', type: 'boolean', required: false },
    ],
  })

  // Lead Operations
  .withAction('createLead', {
    name: 'Create Lead',
    description: 'Create a new lead in Salesforce',
    input: z.object({
      FirstName: z.string().optional(),
      LastName: z.string(),
      Company: z.string(),
      Email: z.string().email().optional(),
      Phone: z.string().optional(),
      Title: z.string().optional(),
      Website: z.string().optional(),
      LeadSource: z.string().optional(),
      Status: z.string().optional().default('Open - Not Contacted'),
      Industry: z.string().optional(),
      Description: z.string().optional(),
      customFields: z.record(z.unknown()).optional(),
    }),
    output: z.object({
      id: z.string(),
      success: z.boolean(),
    }),
    execute: async (input, ctx) => {
      const { customFields, ...standardFields } = input;
      const response = await ctx.http.post('/sobjects/Lead', {
        ...standardFields,
        ...customFields,
      });
      return response.data as { id: string; success: boolean };
    },
  })

  .withAction('getLead', {
    name: 'Get Lead',
    description: 'Get a lead by ID',
    input: z.object({
      id: z.string(),
      fields: z.array(z.string()).optional(),
    }),
    output: z.object({
      Id: z.string(),
      FirstName: z.string().nullable(),
      LastName: z.string(),
      Company: z.string(),
      Email: z.string().nullable(),
      Status: z.string(),
    }).passthrough(),
    execute: async (input, ctx) => {
      let url = `/sobjects/Lead/${input.id}`;
      if (input.fields && input.fields.length > 0) {
        url += `?fields=${input.fields.join(',')}`;
      }
      const response = await ctx.http.get(url);
      return response.data as Record<string, unknown>;
    },
  })

  .withAction('updateLead', {
    name: 'Update Lead',
    description: 'Update an existing lead',
    input: z.object({
      id: z.string(),
      fields: z.record(z.unknown()),
    }),
    output: z.object({
      success: z.boolean(),
    }),
    execute: async (input, ctx) => {
      await ctx.http.patch(`/sobjects/Lead/${input.id}`, input.fields);
      return { success: true };
    },
  })

  .withAction('convertLead', {
    name: 'Convert Lead',
    description: 'Convert a lead to contact, account, and optionally opportunity',
    input: z.object({
      leadId: z.string(),
      accountId: z.string().optional(),
      contactId: z.string().optional(),
      createOpportunity: z.boolean().optional().default(true),
      opportunityName: z.string().optional(),
      convertedStatus: z.string().default('Closed - Converted'),
    }),
    output: z.object({
      accountId: z.string(),
      contactId: z.string(),
      opportunityId: z.string().nullable(),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.post('/sobjects/Lead/convert', {
        leadId: input.leadId,
        accountId: input.accountId,
        contactId: input.contactId,
        doNotCreateOpportunity: !input.createOpportunity,
        opportunityName: input.opportunityName,
        convertedStatus: input.convertedStatus,
      });
      return response.data as Record<string, unknown>;
    },
  })

  // Contact Operations
  .withAction('createContact', {
    name: 'Create Contact',
    description: 'Create a new contact',
    input: z.object({
      FirstName: z.string().optional(),
      LastName: z.string(),
      AccountId: z.string().optional(),
      Email: z.string().email().optional(),
      Phone: z.string().optional(),
      MobilePhone: z.string().optional(),
      Title: z.string().optional(),
      Department: z.string().optional(),
      MailingStreet: z.string().optional(),
      MailingCity: z.string().optional(),
      MailingState: z.string().optional(),
      MailingPostalCode: z.string().optional(),
      MailingCountry: z.string().optional(),
      customFields: z.record(z.unknown()).optional(),
    }),
    output: z.object({
      id: z.string(),
      success: z.boolean(),
    }),
    execute: async (input, ctx) => {
      const { customFields, ...standardFields } = input;
      const response = await ctx.http.post('/sobjects/Contact', {
        ...standardFields,
        ...customFields,
      });
      return response.data as { id: string; success: boolean };
    },
  })

  // Account Operations
  .withAction('createAccount', {
    name: 'Create Account',
    description: 'Create a new account',
    input: z.object({
      Name: z.string(),
      Type: z.string().optional(),
      Industry: z.string().optional(),
      Website: z.string().optional(),
      Phone: z.string().optional(),
      BillingStreet: z.string().optional(),
      BillingCity: z.string().optional(),
      BillingState: z.string().optional(),
      BillingPostalCode: z.string().optional(),
      BillingCountry: z.string().optional(),
      Description: z.string().optional(),
      customFields: z.record(z.unknown()).optional(),
    }),
    output: z.object({
      id: z.string(),
      success: z.boolean(),
    }),
    execute: async (input, ctx) => {
      const { customFields, ...standardFields } = input;
      const response = await ctx.http.post('/sobjects/Account', {
        ...standardFields,
        ...customFields,
      });
      return response.data as { id: string; success: boolean };
    },
  })

  // Opportunity Operations
  .withAction('createOpportunity', {
    name: 'Create Opportunity',
    description: 'Create a new opportunity',
    input: z.object({
      Name: z.string(),
      AccountId: z.string().optional(),
      StageName: z.string(),
      CloseDate: z.string(),
      Amount: z.number().optional(),
      Probability: z.number().optional(),
      Type: z.string().optional(),
      LeadSource: z.string().optional(),
      Description: z.string().optional(),
      customFields: z.record(z.unknown()).optional(),
    }),
    output: z.object({
      id: z.string(),
      success: z.boolean(),
    }),
    execute: async (input, ctx) => {
      const { customFields, ...standardFields } = input;
      const response = await ctx.http.post('/sobjects/Opportunity', {
        ...standardFields,
        ...customFields,
      });
      return response.data as { id: string; success: boolean };
    },
  })

  .withAction('updateOpportunityStage', {
    name: 'Update Opportunity Stage',
    description: 'Move an opportunity to a different stage',
    input: z.object({
      id: z.string(),
      StageName: z.string(),
      Probability: z.number().optional(),
    }),
    output: z.object({
      success: z.boolean(),
    }),
    execute: async (input, ctx) => {
      const { id, ...fields } = input;
      await ctx.http.patch(`/sobjects/Opportunity/${id}`, fields);
      return { success: true };
    },
  })

  // SOQL Query
  .withAction('query', {
    name: 'SOQL Query',
    description: 'Execute a SOQL query',
    input: z.object({
      query: z.string().describe('SOQL query string'),
    }),
    output: z.object({
      totalSize: z.number(),
      done: z.boolean(),
      records: z.array(z.record(z.unknown())),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.get('/query', {
        params: { q: input.query },
      });
      return response.data as { totalSize: number; done: boolean; records: unknown[] };
    },
  })

  // Generic Object Operations
  .withAction('createRecord', {
    name: 'Create Record',
    description: 'Create a record in any object',
    input: z.object({
      objectType: z.string().describe('API name of the object (e.g., Account, Lead, CustomObject__c)'),
      fields: z.record(z.unknown()),
    }),
    output: z.object({
      id: z.string(),
      success: z.boolean(),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.post(`/sobjects/${input.objectType}`, input.fields);
      return response.data as { id: string; success: boolean };
    },
  })

  .withAction('updateRecord', {
    name: 'Update Record',
    description: 'Update a record in any object',
    input: z.object({
      objectType: z.string(),
      id: z.string(),
      fields: z.record(z.unknown()),
    }),
    output: z.object({
      success: z.boolean(),
    }),
    execute: async (input, ctx) => {
      await ctx.http.patch(`/sobjects/${input.objectType}/${input.id}`, input.fields);
      return { success: true };
    },
  })

  .withAction('deleteRecord', {
    name: 'Delete Record',
    description: 'Delete a record from any object',
    input: z.object({
      objectType: z.string(),
      id: z.string(),
    }),
    output: z.object({
      success: z.boolean(),
    }),
    execute: async (input, ctx) => {
      await ctx.http.delete(`/sobjects/${input.objectType}/${input.id}`);
      return { success: true };
    },
  })

  // Bulk Operations
  .withAction('bulkInsert', {
    name: 'Bulk Insert',
    description: 'Insert multiple records at once (up to 200)',
    input: z.object({
      objectType: z.string(),
      records: z.array(z.record(z.unknown())).max(200),
      allOrNone: z.boolean().optional().default(false),
    }),
    output: z.object({
      results: z.array(z.object({
        id: z.string().optional(),
        success: z.boolean(),
        errors: z.array(z.unknown()).optional(),
      })),
    }),
    execute: async (input, ctx) => {
      const response = await ctx.http.post('/composite/sobjects', {
        allOrNone: input.allOrNone,
        records: input.records.map((r) => ({
          attributes: { type: input.objectType },
          ...r,
        })),
      });
      return { results: response.data as unknown[] };
    },
  })

  // Triggers
  .withWebhookTrigger('recordCreated', {
    name: 'Record Created',
    description: 'Triggered when a record is created (via Platform Events)',
    output: z.object({
      sobjectType: z.string(),
      recordId: z.string(),
      createdById: z.string(),
      createdDate: z.string(),
    }),
    signatureHeader: 'x-salesforce-signature',
    verifySignature: () => true,
  })

  .withWebhookTrigger('recordUpdated', {
    name: 'Record Updated',
    description: 'Triggered when a record is updated',
    output: z.object({
      sobjectType: z.string(),
      recordId: z.string(),
      changedFields: z.array(z.string()),
    }),
    signatureHeader: 'x-salesforce-signature',
    verifySignature: () => true,
  })

  .withRateLimit({
    requests: 100,
    window: 60000,
    strategy: 'queue',
  })

  .withTestConnection(async (credentials, ctx): Promise<TestConnectionResult> => {
    try {
      const response = await ctx.http.get<{ identity: string; username: string }>('/');
      return {
        success: true,
        message: 'Successfully connected to Salesforce',
        accountInfo: {
          identity: response.data.identity,
          username: response.data.username,
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

export default salesforceConnector;
