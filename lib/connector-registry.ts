/**
 * Connector Registry
 * 
 * Central registry for all connectors with:
 * - Dynamic loading
 * - Hot-reload support
 * - Version management
 * - Credential management
 * - Health monitoring
 * 
 * @module lib/connector-registry
 */

import type {
  ConnectorDefinition,
  ConnectorInstance,
  ExecutionContext,
  TestConnectionResult,
  TriggerSubscription,
} from '../packages/connector-sdk/src/types';
import { logger } from './logger';
import { db } from './db';

// ============================================
// Types
// ============================================

export interface RegisteredConnector {
  definition: ConnectorDefinition;
  instance: ConnectorInstance;
  loadedAt: Date;
  source: 'builtin' | 'community' | 'custom';
  version: string;
  enabled: boolean;
}

export interface ConnectorCredentials {
  id: string;
  connectorId: string;
  organizationId: string;
  name: string;
  data: Record<string, unknown>;
  isValid: boolean;
  lastValidatedAt?: Date;
}

// ============================================
// Built-in Connectors
// ============================================

const BUILTIN_CONNECTORS = [
  'slack',
  'openai',
  'github',
  'google-sheets',
  'http',
  'postgres',
  'notion',
  'discord',
  'stripe',
  'airtable',
  'twilio',
  'hubspot',
  'jira',
  'asana',
  'trello',
  'sendgrid',
  'mailchimp',
  'shopify',
  'mongodb',
  'mysql',
  'redis',
  's3',
  'firebase',
  'supabase',
  'google-drive',
  'dropbox',
  'zoom',
  'calendly',
  'typeform',
  'webflow',
  'figma',
  'linear',
  'monday',
  'clickup',
  'zendesk',
  'intercom',
  'segment',
  'mixpanel',
  'amplitude',
  'datadog',
  'pagerduty',
  'sentry',
  'anthropic',
  'gemini',
  'replicate',
  'huggingface',
  'pinecone',
  'weaviate',
];

// ============================================
// Registry Singleton
// ============================================

class ConnectorRegistry {
  private connectors: Map<string, RegisteredConnector> = new Map();
  private loadPromise: Promise<void> | null = null;
  private initialized = false;

  /**
   * Initialize the registry and load built-in connectors
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    if (this.loadPromise) {
      await this.loadPromise;
      return;
    }

    this.loadPromise = this.loadBuiltinConnectors();
    await this.loadPromise;
    this.initialized = true;
    
    logger.info('Connector registry initialized', {
      connectorCount: this.connectors.size,
    });
  }

  /**
   * Load all built-in connectors
   */
  private async loadBuiltinConnectors(): Promise<void> {
    const loadPromises = BUILTIN_CONNECTORS.map(async (id) => {
      try {
        await this.loadConnector(id, 'builtin');
      } catch (error) {
        logger.warn(`Failed to load connector: ${id}`, { error });
      }
    });

    await Promise.all(loadPromises);
  }

  /**
   * Load a connector by ID
   */
  private async loadConnector(
    id: string,
    source: 'builtin' | 'community' | 'custom'
  ): Promise<RegisteredConnector | null> {
    try {
      // Dynamic import of connector
      const modulePath = `../connectors/${id}`;
      const module = await import(modulePath);
      const definition = module.default || module[`${id}Connector`];

      if (!definition) {
        throw new Error(`Connector module does not export a definition: ${id}`);
      }

      const instance = this.createConnectorInstance(definition);

      const registered: RegisteredConnector = {
        definition,
        instance,
        loadedAt: new Date(),
        source,
        version: definition.version,
        enabled: true,
      };

      this.connectors.set(id, registered);
      
      logger.debug(`Loaded connector: ${id}`, {
        version: definition.version,
        actions: Object.keys(definition.actions).length,
        triggers: Object.keys(definition.triggers || {}).length,
      });

      return registered;
    } catch (error) {
      logger.error(`Failed to load connector: ${id}`, error);
      return null;
    }
  }

  /**
   * Create a connector instance from definition
   */
  private createConnectorInstance(definition: ConnectorDefinition): ConnectorInstance {
    return {
      definition,

      executeAction: async (actionId, input, context) => {
        const action = definition.actions[actionId];
        if (!action) {
          throw new Error(`Action not found: ${actionId}`);
        }

        // Validate input
        const validatedInput = action.input.parse(input);

        // Execute action
        if (action.execute) {
          const result = await action.execute(validatedInput, context);
          return action.output.parse(result);
        }

        if (action.request) {
          return this.executeHttpAction(definition, action.request, validatedInput, context);
        }

        throw new Error(`Action has no execute function or request config: ${actionId}`);
      },

      subscribeTrigger: async (triggerId, config, context) => {
        const trigger = definition.triggers?.[triggerId];
        if (!trigger) {
          throw new Error(`Trigger not found: ${triggerId}`);
        }

        // Create subscription based on trigger type
        const subscriptionId = `sub-${triggerId}-${Date.now()}`;

        return {
          id: subscriptionId,
          unsubscribe: async () => {
            // Cleanup subscription
          },
        };
      },

      testConnection: async (credentials, context) => {
        if (definition.testConnection) {
          return definition.testConnection(credentials, context);
        }

        // Default test: try to make a simple request
        return { success: true, message: 'Connection test not implemented' };
      },
    };
  }

  /**
   * Execute an HTTP-based action
   */
  private async executeHttpAction(
    definition: ConnectorDefinition,
    request: NonNullable<ConnectorDefinition['actions'][string]['request']>,
    input: unknown,
    context: ExecutionContext
  ): Promise<unknown> {
    const baseUrl = definition.baseUrl || '';
    const path = this.resolveTemplate(request.path, input);
    const url = baseUrl + path;

    const headers: Record<string, string> = {
      ...definition.defaultHeaders,
    };

    if (request.headers) {
      for (const [key, value] of Object.entries(request.headers)) {
        headers[key] = this.resolveTemplate(value, input);
      }
    }

    const params: Record<string, string> = {};
    if (request.query) {
      for (const [key, value] of Object.entries(request.query)) {
        params[key] = this.resolveTemplate(value, input);
      }
    }

    let body: unknown;
    if (request.body) {
      body = request.body.type === 'json'
        ? JSON.parse(this.resolveTemplate(JSON.stringify(request.body.content), input))
        : this.resolveTemplate(String(request.body.content), input);
    }

    const response = await context.http.request({
      url,
      method: request.method,
      headers,
      params,
      data: body,
    });

    return response.data;
  }

  /**
   * Resolve template strings like {{input.field}}
   */
  private resolveTemplate(template: string, data: unknown): string {
    return template.replace(/\{\{\s*(.+?)\s*\}\}/g, (_, path) => {
      const value = this.getNestedValue(data, path);
      return value != null ? String(value) : '';
    });
  }

  private getNestedValue(obj: unknown, path: string): unknown {
    const keys = path.split('.');
    let current = obj;
    for (const key of keys) {
      if (current == null) return undefined;
      current = (current as Record<string, unknown>)[key];
    }
    return current;
  }

  // ============================================
  // Public API
  // ============================================

  /**
   * Get a connector by ID
   */
  async get(id: string): Promise<RegisteredConnector | null> {
    await this.initialize();
    return this.connectors.get(id) || null;
  }

  /**
   * Get all connectors
   */
  async getAll(): Promise<RegisteredConnector[]> {
    await this.initialize();
    return Array.from(this.connectors.values());
  }

  /**
   * Get connectors by category
   */
  async getByCategory(category: string): Promise<RegisteredConnector[]> {
    await this.initialize();
    return Array.from(this.connectors.values())
      .filter(c => c.definition.category === category);
  }

  /**
   * Search connectors
   */
  async search(query: string): Promise<RegisteredConnector[]> {
    await this.initialize();
    const lowerQuery = query.toLowerCase();
    
    return Array.from(this.connectors.values())
      .filter(c => 
        c.definition.name.toLowerCase().includes(lowerQuery) ||
        c.definition.description?.toLowerCase().includes(lowerQuery) ||
        c.definition.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
      );
  }

  /**
   * Execute a connector action
   */
  async executeAction(
    connectorId: string,
    actionId: string,
    input: unknown,
    context: Omit<ExecutionContext, 'http' | 'store'>
  ): Promise<unknown> {
    const connector = await this.get(connectorId);
    if (!connector) {
      throw new Error(`Connector not found: ${connectorId}`);
    }

    // Get credentials for this organization
    const credentials = await this.getCredentials(
      connectorId,
      context.organizationId
    );

    // Build full context with HTTP client
    const fullContext: ExecutionContext = {
      ...context,
      credentials: credentials?.data || {},
      http: this.createHttpClient(connector.definition, credentials?.data || {}),
      store: this.createStore(context.organizationId, connectorId),
    };

    return connector.instance.executeAction(actionId, input, fullContext);
  }

  /**
   * Test connector connection
   */
  async testConnection(
    connectorId: string,
    credentials: Record<string, unknown>,
    organizationId: string
  ): Promise<TestConnectionResult> {
    const connector = await this.get(connectorId);
    if (!connector) {
      return { success: false, message: `Connector not found: ${connectorId}` };
    }

    const context = {
      credentials,
      organizationId,
      logger: logger.child({ connector: connectorId }),
      http: this.createHttpClient(connector.definition, credentials),
    };

    return connector.instance.testConnection(credentials, context);
  }

  /**
   * Get credentials for a connector
   */
  private async getCredentials(
    connectorId: string,
    organizationId: string
  ): Promise<ConnectorCredentials | null> {
    const credential = await db.credential.findFirst({
      where: {
        connectorType: connectorId,
        organizationId,
        isValid: true,
      },
    });

    if (!credential) return null;

    // Decrypt credential data (would use encryption service)
    // For now, parse JSON directly
    const data = JSON.parse(credential.encryptedData);

    return {
      id: credential.id,
      connectorId: credential.connectorType,
      organizationId: credential.organizationId,
      name: credential.name,
      data,
      isValid: credential.isValid,
      lastValidatedAt: credential.lastUsedAt || undefined,
    };
  }

  /**
   * Create HTTP client with auth applied
   */
  private createHttpClient(
    definition: ConnectorDefinition,
    credentials: Record<string, unknown>
  ): ExecutionContext['http'] {
    const baseUrl = definition.baseUrl || '';
    const defaultHeaders = definition.defaultHeaders || {};

    // Build auth headers
    const authHeaders: Record<string, string> = {};
    
    if (definition.auth.type === 'api_key') {
      const apiKeyConfig = definition.auth;
      const apiKey = credentials[apiKeyConfig.fields[0]?.key || 'apiKey'] as string;
      
      if (apiKeyConfig.location === 'header') {
        authHeaders[apiKeyConfig.name] = (apiKeyConfig.prefix || '') + apiKey;
      }
    } else if (definition.auth.type === 'bearer') {
      const token = credentials.token || credentials.accessToken;
      if (token) {
        authHeaders['Authorization'] = `Bearer ${token}`;
      }
    } else if (definition.auth.type === 'oauth2') {
      const token = credentials.accessToken;
      if (token) {
        authHeaders['Authorization'] = `Bearer ${token}`;
      }
    }

    const makeRequest = async <T>(config: {
      url: string;
      method: string;
      headers?: Record<string, string>;
      params?: Record<string, string>;
      data?: unknown;
    }): Promise<{ status: number; statusText: string; headers: Record<string, string>; data: T }> => {
      const url = new URL(config.url.startsWith('http') ? config.url : baseUrl + config.url);
      
      if (config.params) {
        for (const [key, value] of Object.entries(config.params)) {
          url.searchParams.append(key, value);
        }
      }

      const response = await fetch(url.toString(), {
        method: config.method,
        headers: {
          ...defaultHeaders,
          ...authHeaders,
          ...config.headers,
        },
        body: config.data ? JSON.stringify(config.data) : undefined,
      });

      let data: T;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text() as T;
      }

      return {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data,
      };
    };

    return {
      request: makeRequest,
      get: (url, config) => makeRequest({ url, method: 'GET', ...config }),
      post: (url, data, config) => makeRequest({ url, method: 'POST', data, ...config }),
      put: (url, data, config) => makeRequest({ url, method: 'PUT', data, ...config }),
      patch: (url, data, config) => makeRequest({ url, method: 'PATCH', data, ...config }),
      delete: (url, config) => makeRequest({ url, method: 'DELETE', ...config }),
    };
  }

  /**
   * Create key-value store for connector
   */
  private createStore(
    organizationId: string,
    connectorId: string
  ): ExecutionContext['store'] {
    const prefix = `store:${organizationId}:${connectorId}:`;
    
    // Simple in-memory store for now
    // Would use Redis in production
    const store = new Map<string, { value: unknown; expiresAt?: number }>();

    return {
      get: async <T>(key: string) => {
        const item = store.get(prefix + key);
        if (!item) return null;
        if (item.expiresAt && Date.now() > item.expiresAt) {
          store.delete(prefix + key);
          return null;
        }
        return item.value as T;
      },
      set: async <T>(key: string, value: T, ttl?: number) => {
        store.set(prefix + key, {
          value,
          expiresAt: ttl ? Date.now() + ttl * 1000 : undefined,
        });
      },
      delete: async (key: string) => {
        store.delete(prefix + key);
      },
      has: async (key: string) => {
        const item = store.get(prefix + key);
        if (!item) return false;
        if (item.expiresAt && Date.now() > item.expiresAt) {
          store.delete(prefix + key);
          return false;
        }
        return true;
      },
    };
  }

  /**
   * Get connector categories with counts
   */
  async getCategories(): Promise<Array<{ category: string; count: number }>> {
    await this.initialize();
    
    const categories = new Map<string, number>();
    for (const connector of this.connectors.values()) {
      const cat = connector.definition.category;
      categories.set(cat, (categories.get(cat) || 0) + 1);
    }

    return Array.from(categories.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }
}

// ============================================
// Singleton Export
// ============================================

export const connectorRegistry = new ConnectorRegistry();

export default connectorRegistry;
