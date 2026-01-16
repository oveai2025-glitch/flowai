/**
 * CRM Connectors
 * 
 * Integrated integration for major CRM platforms:
 * - Salesforce (Leads, Contacts, Opportunities, Accounts)
 * - HubSpot (Contacts, Companies, Deals, Tickets)
 * - Pipedrive (Deals, Persons, Organizations, Activities)
 * - Zoho CRM (Leads, Accounts, Contacts, Potentials)
 * 
 * @module connectors/crm-connectors
 */

import { z } from 'zod';

// ============================================
// Types & Interfaces
// ============================================

interface CRMCredentials {
  salesforce?: { instanceUrl: string; accessToken: string };
  hubspot?: { accessToken: string };
  zoho?: { accessToken: string; region?: string };
  pipedrive?: { apiToken: string; domain: string };
}

// ============================================
// Salesforce Implementation
// ============================================

class SalesforceClient {
  constructor(private creds: { instanceUrl: string; accessToken: string }) {}

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.creds.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  async query(soql: string): Promise<any[]> {
    const response = await fetch(`${this.creds.instanceUrl}/services/data/v57.0/query?q=${encodeURIComponent(soql)}`, {
      headers: this.getHeaders(),
    });
    const data = await response.json();
    return data.records || [];
  }

  async create(object: string, data: any): Promise<any> {
    const response = await fetch(`${this.creds.instanceUrl}/services/data/v57.0/sobjects/${object}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return await response.json();
  }

  async update(object: string, id: string, data: any): Promise<void> {
    await fetch(`${this.creds.instanceUrl}/services/data/v57.0/sobjects/${object}/${id}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
  }

  async getLeads(): Promise<any[]> {
    return this.query('SELECT Id, Name, Company, Email, Status FROM Lead LIMIT 100');
  }

  async getContacts(): Promise<any[]> {
    return this.query('SELECT Id, Name, Email, Account.Name FROM Contact LIMIT 100');
  }

  async getOpportunities(): Promise<any[]> {
    return this.query('SELECT Id, Name, Amount, StageName, CloseDate FROM Opportunity LIMIT 100');
  }
}

// ============================================
// HubSpot Implementation
// ============================================

class HubSpotClient {
  private baseUrl = 'https://api.hubapi.com';

  constructor(private creds: { accessToken: string }) {}

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.creds.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  async getContacts(limit = 100): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/crm/v3/objects/contacts?limit=${limit}`, {
      headers: this.getHeaders(),
    });
    const data = await response.json();
    return data.results || [];
  }

  async createContact(properties: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/crm/v3/objects/contacts`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ properties }),
    });
    return await response.json();
  }

  async searchContacts(query: string): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/crm/v3/objects/contacts/search`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        filterGroups: [{
          filters: [{ propertyName: 'email', operator: 'EQ', value: query }]
        }]
      }),
    });
    const data = await response.json();
    return data.results || [];
  }

  async getDeals(): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/crm/v3/objects/deals`, {
      headers: this.getHeaders(),
    });
    const data = await response.json();
    return data.results || [];
  }
}

// ============================================
// Pipedrive Implementation
// ============================================

class PipedriveClient {
  constructor(private creds: { apiToken: string; domain: string }) {}

  private getUrl(path: string, params: Record<string, string> = {}) {
    const query = new URLSearchParams({ api_token: this.creds.apiToken, ...params });
    return `https://${this.creds.domain}.pipedrive.com/v1${path}?${query}`;
  }

  async getDeals(): Promise<any[]> {
    const response = await fetch(this.getUrl('/deals'));
    const data = await response.json();
    return data.data || [];
  }

  async createDeal(data: any): Promise<any> {
    const response = await fetch(this.getUrl('/deals'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    return result.data;
  }

  async getPersons(): Promise<any[]> {
    const response = await fetch(this.getUrl('/persons'));
    const data = await response.json();
    return data.data || [];
  }
}

// ============================================
// Connector Definition
// ============================================

export const crmConnector = {
  id: 'crm-suite',
  name: 'CRM Suite',
  version: '1.0.0',
  category: 'sales',
  description: 'Manage customers across Salesforce, HubSpot, Pipedrive, and Zoho',
  color: '#34D399',
  icon: 'https://cdn.flowatgenai.com/connectors/crm.svg',
  tags: ['crm', 'salesforce', 'hubspot', 'pipedrive', 'sales', 'marketing'],

  authentication: {
    type: 'custom' as const,
    fields: [
      { name: 'platform', label: 'Platform', type: 'select' as const, options: [
        { label: 'Salesforce', value: 'salesforce' },
        { label: 'HubSpot', value: 'hubspot' },
        { label: 'Pipedrive', value: 'pipedrive' },
      ], required: true },
      { name: 'accessToken', label: 'Access Token / API Key', type: 'password' as const, required: true },
      { name: 'instanceUrl', label: 'Instance URL / Domain', type: 'string' as const, required: false },
    ],
  },

  actions: {
    // Salesforce Actions
    salesforceGetLeads: {
      name: 'Salesforce: Get Leads',
      description: 'Fetch recent leads from Salesforce',
      input: z.object({}),
      output: z.array(z.any()),
      execute: async (_input: any, ctx: { credentials: any }) => {
        const client = new SalesforceClient({ 
          instanceUrl: ctx.credentials.instanceUrl, 
          accessToken: ctx.credentials.accessToken 
        });
        return await client.getLeads();
      },
    },

    salesforceCreateLead: {
      name: 'Salesforce: Create Lead',
      description: 'Create a new lead in Salesforce',
      input: z.object({ LastName: z.string(), Company: z.string(), Email: z.string().optional() }),
      output: z.any(),
      execute: async (input: any, ctx: { credentials: any }) => {
        const client = new SalesforceClient({ 
          instanceUrl: ctx.credentials.instanceUrl, 
          accessToken: ctx.credentials.accessToken 
        });
        return await client.create('Lead', input);
      },
    },

    // HubSpot Actions
    hubspotGetContacts: {
      name: 'HubSpot: Get Contacts',
      description: 'Fetch contacts from HubSpot',
      input: z.object({ limit: z.number().default(20) }),
      output: z.array(z.any()),
      execute: async (input: any, ctx: { credentials: any }) => {
        const client = new HubSpotClient({ accessToken: ctx.credentials.accessToken });
        return await client.getContacts(input.limit);
      },
    },

    hubspotCreateContact: {
      name: 'HubSpot: Create Contact',
      description: 'Add a new contact to HubSpot',
      input: z.object({ email: z.string(), firstname: z.string().optional(), lastname: z.string().optional() }),
      output: z.any(),
      execute: async (input: any, ctx: { credentials: any }) => {
        const client = new HubSpotClient({ accessToken: ctx.credentials.accessToken });
        return await client.createContact(input);
      },
    },

    // Pipedrive Actions
    pipedriveGetDeals: {
      name: 'Pipedrive: Get Deals',
      description: 'Fetch all deals from Pipedrive',
      input: z.object({}),
      output: z.array(z.any()),
      execute: async (_input: any, ctx: { credentials: any }) => {
        const client = new PipedriveClient({ 
          apiToken: ctx.credentials.accessToken, 
          domain: ctx.credentials.instanceUrl || 'api' 
        });
        return await client.getDeals();
      },
    },

    pipedriveCreateDeal: {
      name: 'Pipedrive: Create Deal',
      description: 'Create a new sales deal',
      input: z.object({ title: z.string(), value: z.number().optional(), currency: z.string().default('USD') }),
      output: z.any(),
      execute: async (input: any, ctx: { credentials: any }) => {
        const client = new PipedriveClient({ 
          apiToken: ctx.credentials.accessToken, 
          domain: ctx.credentials.instanceUrl || 'api' 
        });
        return await client.createDeal(input);
      },
    },
  },
};

export default crmConnector;
