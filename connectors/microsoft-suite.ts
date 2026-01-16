/**
 * Microsoft Suite Connector
 * 
 * Comprehensive integration for Microsoft 365 services:
 * - Azure (Resources, Virtual Machines, Storage)
 * - Outlook (Mail, Calendar, Contacts)
 * - Teams (Messages, Channels, Meetings)
 * - SharePoint & OneDrive (Files, Sites, Lists)
 * - Active Directory (Users, Groups)
 * 
 * @module connectors/microsoft-suite
 */

import { z } from 'zod';

interface MicrosoftCredentials {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  refreshToken?: string;
  accessToken?: string;
}

class MicrosoftGraphClient {
  private credentials: MicrosoftCredentials;
  private graphUrl = 'https://graph.microsoft.com/v1.0';
  private azureUrl = 'https://management.azure.com';

  constructor(credentials: MicrosoftCredentials) {
    this.credentials = credentials;
  }

  private async getAuthHeader(): Promise<Record<string, string>> {
    // In a real implementation, we would use the refresh token to get a new access token
    // For this implementation, we assume accessToken is provided or handled by the caller
    return {
      'Authorization': `Bearer ${this.credentials.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  // ============================================
  // Outlook Operations
  // ============================================

  async sendMail(params: {
    to: string[];
    subject: string;
    body: string;
    isHtml?: boolean;
    cc?: string[];
    bcc?: string[];
    importance?: 'low' | 'normal' | 'high';
  }): Promise<void> {
    const headers = await this.getAuthHeader();
    const body = {
      message: {
        subject: params.subject,
        body: {
          contentType: params.isHtml ? 'html' : 'text',
          content: params.body,
        },
        toRecipients: params.to.map(email => ({ emailAddress: { address: email } })),
        ccRecipients: params.cc?.map(email => ({ emailAddress: { address: email } })),
        bccRecipients: params.bcc?.map(email => ({ emailAddress: { address: email } })),
        importance: params.importance || 'normal',
      },
      saveToSentItems: 'true',
    };

    const response = await fetch(`${this.graphUrl}/me/sendMail`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) throw new Error(`Failed to send mail: ${response.statusText}`);
  }

  async getMessages(params: {
    top?: number;
    skip?: number;
    filter?: string;
    search?: string;
  }): Promise<any[]> {
    const headers = await this.getAuthHeader();
    const query = new URLSearchParams();
    if (params.top) query.append('$top', String(params.top));
    if (params.skip) query.append('$skip', String(params.skip));
    if (params.filter) query.append('$filter', params.filter);
    if (params.search) query.append('$search', params.search);

    const response = await fetch(`${this.graphUrl}/me/messages?${query}`, { headers });
    const data = await response.json();
    return data.value || [];
  }

  async createCalendarEvent(params: {
    subject: string;
    start: string;
    end: string;
    location?: string;
    description?: string;
    attendees?: string[];
  }): Promise<any> {
    const headers = await this.getAuthHeader();
    const body = {
      subject: params.subject,
      body: { contentType: 'HTML', content: params.description },
      start: { dateTime: params.start, timeZone: 'UTC' },
      end: { dateTime: params.end, timeZone: 'UTC' },
      location: { displayName: params.location },
      attendees: params.attendees?.map(email => ({
        emailAddress: { address: email },
        type: 'required',
      })),
    };

    const response = await fetch(`${this.graphUrl}/me/events`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    return await response.json();
  }

  // ============================================
  // Teams Operations
  // ============================================

  async sendTeamsMessage(chatId: string, message: string): Promise<any> {
    const headers = await this.getAuthHeader();
    const body = { body: { content: message } };

    const response = await fetch(`${this.graphUrl}/chats/${chatId}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    return await response.json();
  }

  async createTeamsMeeting(params: {
    subject: string;
    start: string;
    end: string;
  }): Promise<any> {
    const headers = await this.getAuthHeader();
    const body = {
      subject: params.subject,
      startDateTime: params.start,
      endDateTime: params.end,
    };

    const response = await fetch(`${this.graphUrl}/me/onlineMeetings`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    return await response.json();
  }

  // ============================================
  // SharePoint & OneDrive Operations
  // ============================================

  async uploadFile(driveId: string, path: string, content: string | Buffer): Promise<any> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.graphUrl}/drives/${driveId}/root:/${path}:/content`, {
      method: 'PUT',
      headers,
      body: content,
    });

    return await response.json();
  }

  async downloadFile(driveId: string, fileId: string): Promise<string> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.graphUrl}/drives/${driveId}/items/${fileId}/content`, { headers });
    return await response.text();
  }

  async listFiles(driveId: string, folderId: string = 'root'): Promise<any[]> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.graphUrl}/drives/${driveId}/items/${folderId}/children`, { headers });
    const data = await response.json();
    return data.value || [];
  }

  // ============================================
  // Azure Resource Management
  // ============================================

  async listResourceGroups(subscriptionId: string): Promise<any[]> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.azureUrl}/subscriptions/${subscriptionId}/resourcegroups?api-version=2021-04-01`, { headers });
    const data = await response.json();
    return data.value || [];
  }

  async listVirtualMachines(subscriptionId: string, resourceGroup?: string): Promise<any[]> {
    const headers = await this.getAuthHeader();
    const url = resourceGroup 
      ? `${this.azureUrl}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Compute/virtualMachines?api-version=2021-07-01`
      : `${this.azureUrl}/subscriptions/${subscriptionId}/providers/Microsoft.Compute/virtualMachines?api-version=2021-07-01`;
    
    const response = await fetch(url, { headers });
    const data = await response.json();
    return data.value || [];
  }

  async startVirtualMachine(subscriptionId: string, resourceGroup: string, vmName: string): Promise<void> {
    const headers = await this.getAuthHeader();
    await fetch(`${this.azureUrl}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Compute/virtualMachines/${vmName}/start?api-version=2021-07-01`, {
      method: 'POST',
      headers,
    });
  }

  async stopVirtualMachine(subscriptionId: string, resourceGroup: string, vmName: string): Promise<void> {
    const headers = await this.getAuthHeader();
    await fetch(`${this.azureUrl}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Compute/virtualMachines/${vmName}/powerOff?api-version=2021-07-01`, {
      method: 'POST',
      headers,
    });
  }

  // ============================================
  // Active Directory Operations
  // ============================================

  async listUsers(): Promise<any[]> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.graphUrl}/users`, { headers });
    const data = await response.json();
    return data.value || [];
  }

  async listGroups(): Promise<any[]> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.graphUrl}/groups`, { headers });
    const data = await response.json();
    return data.value || [];
  }

  async createUser(params: {
    displayName: string;
    mailNickname: string;
    userPrincipalName: string;
    password?: string;
  }): Promise<any> {
    const headers = await this.getAuthHeader();
    const body = {
      accountEnabled: true,
      displayName: params.displayName,
      mailNickname: params.mailNickname,
      userPrincipalName: params.userPrincipalName,
      passwordProfile: {
        forceChangePasswordNextSignIn: true,
        password: params.password || Math.random().toString(36).slice(-12),
      },
    };

    const response = await fetch(`${this.graphUrl}/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    return await response.json();
  }
}

// ============================================
// Connector Definition
// ============================================

export const microsoftSuiteConnector = {
  id: 'microsoft-suite',
  name: 'Microsoft 365 & Azure',
  version: '1.0.0',
  category: 'productivity',
  description: 'Integrated connector for Outlook, Teams, SharePoint, Azure and AD',
  color: '#0078D4',
  icon: 'https://cdn.flowatgenai.com/connectors/microsoft.svg',
  tags: ['microsoft', 'outlook', 'teams', 'azure', 'sharepoint', 'ad'],

  authentication: {
    type: 'oauth2' as const,
    fields: [
      { name: 'clientId', label: 'Client ID', type: 'string' as const, required: true },
      { name: 'clientSecret', label: 'Client Secret', type: 'password' as const, required: true },
      { name: 'tenantId', label: 'Tenant ID', type: 'string' as const, required: true },
    ],
  },

  actions: {
    // Outlook Actions
    sendEmail: {
      name: 'Send Email (Outlook)',
      description: 'Send an email via Outlook',
      input: z.object({
        to: z.array(z.string().email()),
        subject: z.string(),
        body: z.string(),
        isHtml: z.boolean().default(false),
      }),
      output: z.object({ success: z.boolean() }),
      execute: async (input: any, ctx: { credentials: MicrosoftCredentials }) => {
        const client = new MicrosoftGraphClient(ctx.credentials);
        await client.sendMail(input);
        return { success: true };
      },
    },

    getMessages: {
      name: 'Get Recent Emails',
      description: 'Retrieve latest emails from inbox',
      input: z.object({ count: z.number().default(10) }),
      output: z.array(z.any()),
      execute: async (input: any, ctx: { credentials: MicrosoftCredentials }) => {
        const client = new MicrosoftGraphClient(ctx.credentials);
        return await client.getMessages({ top: input.count });
      },
    },

    createEvent: {
      name: 'Create Calendar Event',
      description: 'Add an event to Outlook calendar',
      input: z.object({
        subject: z.string(),
        start: z.string(),
        end: z.string(),
        attendees: z.array(z.string()).optional(),
      }),
      output: z.any(),
      execute: async (input: any, ctx: { credentials: MicrosoftCredentials }) => {
        const client = new MicrosoftGraphClient(ctx.credentials);
        return await client.createCalendarEvent(input);
      },
    },

    // Teams Actions
    sendTeamsMessage: {
      name: 'Send Teams Message',
      description: 'Send a message to a Teams chat',
      input: z.object({ chatId: z.string(), message: z.string() }),
      output: z.any(),
      execute: async (input: any, ctx: { credentials: MicrosoftCredentials }) => {
        const client = new MicrosoftGraphClient(ctx.credentials);
        return await client.sendTeamsMessage(input.chatId, input.message);
      },
    },

    // SharePoint Actions
    uploadFile: {
      name: 'Upload File to SharePoint',
      description: 'Upload a file to a SharePoint or OneDrive folder',
      input: z.object({ driveId: z.string(), path: z.string(), content: z.string() }),
      output: z.any(),
      execute: async (input: any, ctx: { credentials: MicrosoftCredentials }) => {
        const client = new MicrosoftGraphClient(ctx.credentials);
        return await client.uploadFile(input.driveId, input.path, input.content);
      },
    },

    // Azure Actions
    listAzureVMs: {
      name: 'List Azure Virtual Machines',
      description: 'Get all VMs in a subscription',
      input: z.object({ subscriptionId: z.string(), resourceGroup: z.string().optional() }),
      output: z.array(z.any()),
      execute: async (input: any, ctx: { credentials: MicrosoftCredentials }) => {
        const client = new MicrosoftGraphClient(ctx.credentials);
        return await client.listVirtualMachines(input.subscriptionId, input.resourceGroup);
      },
    },

    startAzureVM: {
      name: 'Start Azure VM',
      description: 'Power on a virtual machine',
      input: z.object({ subscriptionId: z.string(), resourceGroup: z.string(), vmName: z.string() }),
      output: z.object({ success: z.boolean() }),
      execute: async (input: any, ctx: { credentials: MicrosoftCredentials }) => {
        const client = new MicrosoftGraphClient(ctx.credentials);
        await client.startVirtualMachine(input.subscriptionId, input.resourceGroup, input.vmName);
        return { success: true };
      },
    },

    // AD Actions
    listADUsers: {
      name: 'List AD Users',
      description: 'Get all users in Azure Active Directory',
      input: z.object({}),
      output: z.array(z.any()),
      execute: async (input: any, ctx: { credentials: MicrosoftCredentials }) => {
        const client = new MicrosoftGraphClient(ctx.credentials);
        return await client.listUsers();
      },
    },
  },
};

export default microsoftSuiteConnector;
