/**
 * WFAIB Connector SDK - Builder
 * 
 * Fluent API for building connectors with full TypeScript support.
 * 
 * @example
 * ```typescript
 * const slack = createConnector({
 *   id: 'slack',
 *   name: 'Slack',
 *   version: '1.0.0',
 *   category: 'communication',
 * })
 *   .withOAuth2({
 *     authorizationUrl: 'https://slack.com/oauth/v2/authorize',
 *     tokenUrl: 'https://slack.com/api/oauth.v2.access',
 *     scopes: ['chat:write', 'channels:read'],
 *   })
 *   .withAction('sendMessage', {
 *     name: 'Send Message',
 *     input: z.object({ channel: z.string(), text: z.string() }),
 *     output: z.object({ ts: z.string(), channel: z.string() }),
 *     request: {
 *       method: 'POST',
 *       path: '/chat.postMessage',
 *       body: { type: 'json', content: '{{input}}' },
 *     },
 *   })
 *   .build();
 * ```
 * 
 * @module @wfaib/connector-sdk/builder
 */

import { z } from 'zod';
import type {
  ConnectorDefinition,
  ConnectorCategory,
  AuthConfig,
  OAuth2Config,
  ApiKeyAuthConfig,
  BasicAuthConfig,
  ActionDefinition,
  TriggerDefinition,
  RateLimitConfig,
  TestConnectionFn,
  ExecutionContext,
  HttpRequestConfig,
  ResponseTransform,
  RetryConfig,
  AuthField,
} from './types';

// ============================================
// Connector Builder
// ============================================

export interface ConnectorBuilderConfig {
  id: string;
  name: string;
  version: string;
  category: ConnectorCategory;
  description?: string;
  icon?: string;
  color?: string;
  tags?: string[];
  docsUrl?: string;
  baseUrl?: string;
  defaultHeaders?: Record<string, string>;
}

export class ConnectorBuilder<
  TAuth extends AuthConfig = { type: 'none' },
  TActions extends Record<string, ActionDefinition> = {},
  TTriggers extends Record<string, TriggerDefinition> = {}
> {
  private config: ConnectorBuilderConfig;
  private auth: TAuth;
  private actions: TActions;
  private triggers: TTriggers;
  private rateLimit?: RateLimitConfig;
  private testConnectionFn?: TestConnectionFn;

  constructor(config: ConnectorBuilderConfig) {
    this.config = config;
    this.auth = { type: 'none' } as TAuth;
    this.actions = {} as TActions;
    this.triggers = {} as TTriggers;
  }

  // ============================================
  // Authentication Methods
  // ============================================

  /**
   * Configure OAuth2 authentication
   */
  withOAuth2(config: Omit<OAuth2Config, 'type'>): ConnectorBuilder<
    OAuth2Config,
    TActions,
    TTriggers
  > {
    this.auth = { type: 'oauth2', ...config } as unknown as TAuth;
    return this as unknown as ConnectorBuilder<OAuth2Config, TActions, TTriggers>;
  }

  /**
   * Configure API Key authentication
   */
  withApiKey(config: Omit<ApiKeyAuthConfig, 'type'>): ConnectorBuilder<
    ApiKeyAuthConfig,
    TActions,
    TTriggers
  > {
    this.auth = { type: 'api_key', ...config } as unknown as TAuth;
    return this as unknown as ConnectorBuilder<ApiKeyAuthConfig, TActions, TTriggers>;
  }

  /**
   * Configure Basic authentication
   */
  withBasicAuth(
    usernameLabel = 'Username',
    passwordLabel = 'Password'
  ): ConnectorBuilder<BasicAuthConfig, TActions, TTriggers> {
    this.auth = {
      type: 'basic',
      fields: [
        { key: 'username', label: usernameLabel, type: 'string', required: true },
        { key: 'password', label: passwordLabel, type: 'password', required: true },
      ],
    } as unknown as TAuth;
    return this as unknown as ConnectorBuilder<BasicAuthConfig, TActions, TTriggers>;
  }

  /**
   * Configure Bearer token authentication
   */
  withBearerToken(
    fields: AuthField[] = [{ key: 'token', label: 'API Token', type: 'password', required: true }]
  ): ConnectorBuilder<{ type: 'bearer'; fields: AuthField[] }, TActions, TTriggers> {
    this.auth = { type: 'bearer', fields } as unknown as TAuth;
    return this as unknown as ConnectorBuilder<{ type: 'bearer'; fields: AuthField[] }, TActions, TTriggers>;
  }

  /**
   * Configure no authentication (public APIs)
   */
  withNoAuth(): ConnectorBuilder<{ type: 'none' }, TActions, TTriggers> {
    this.auth = { type: 'none' } as unknown as TAuth;
    return this as unknown as ConnectorBuilder<{ type: 'none' }, TActions, TTriggers>;
  }

  // ============================================
  // Action Methods
  // ============================================

  /**
   * Add an action to the connector
   */
  withAction<
    TKey extends string,
    TInput extends z.ZodType,
    TOutput extends z.ZodType
  >(
    key: TKey,
    action: ActionDefinition<TInput, TOutput>
  ): ConnectorBuilder<TAuth, TActions & Record<TKey, ActionDefinition<TInput, TOutput>>, TTriggers> {
    (this.actions as Record<string, ActionDefinition>)[key] = action;
    return this as unknown as ConnectorBuilder<
      TAuth,
      TActions & Record<TKey, ActionDefinition<TInput, TOutput>>,
      TTriggers
    >;
  }

  /**
   * Add a simple HTTP action
   */
  withHttpAction<
    TKey extends string,
    TInput extends z.ZodType,
    TOutput extends z.ZodType
  >(
    key: TKey,
    config: {
      name: string;
      description?: string;
      input: TInput;
      output: TOutput;
      request: HttpRequestConfig;
      response?: ResponseTransform;
      retry?: RetryConfig;
    }
  ): ConnectorBuilder<TAuth, TActions & Record<TKey, ActionDefinition<TInput, TOutput>>, TTriggers> {
    return this.withAction(key, {
      name: config.name,
      description: config.description,
      input: config.input,
      output: config.output,
      request: config.request,
      response: config.response,
      retry: config.retry,
    });
  }

  // ============================================
  // Trigger Methods
  // ============================================

  /**
   * Add a trigger to the connector
   */
  withTrigger<
    TKey extends string,
    TConfig extends z.ZodType,
    TOutput extends z.ZodType
  >(
    key: TKey,
    trigger: TriggerDefinition<TConfig, TOutput>
  ): ConnectorBuilder<TAuth, TActions, TTriggers & Record<TKey, TriggerDefinition<TConfig, TOutput>>> {
    (this.triggers as Record<string, TriggerDefinition>)[key] = trigger;
    return this as unknown as ConnectorBuilder<
      TAuth,
      TActions,
      TTriggers & Record<TKey, TriggerDefinition<TConfig, TOutput>>
    >;
  }

  /**
   * Add a webhook trigger
   */
  withWebhookTrigger<TKey extends string, TOutput extends z.ZodType>(
    key: TKey,
    config: {
      name: string;
      description?: string;
      output: TOutput;
      signatureHeader?: string;
      verifySignature?: (payload: string, signature: string, secret: string) => boolean;
    }
  ): ConnectorBuilder<TAuth, TActions, TTriggers & Record<TKey, TriggerDefinition<z.ZodUndefined, TOutput>>> {
    return this.withTrigger(key, {
      name: config.name,
      description: config.description,
      type: 'webhook',
      output: config.output,
      webhook: {
        signatureHeader: config.signatureHeader,
        verifySignature: config.verifySignature,
      },
    });
  }

  /**
   * Add a polling trigger
   */
  withPollingTrigger<
    TKey extends string,
    TConfig extends z.ZodType,
    TOutput extends z.ZodType
  >(
    key: TKey,
    config: {
      name: string;
      description?: string;
      config?: TConfig;
      output: TOutput;
      interval: number;
      minInterval?: number;
      fetch: (context: ExecutionContext, cursor?: string) => Promise<{ items: z.infer<TOutput>[]; cursor?: string }>;
      dedupeKey: (item: z.infer<TOutput>) => string;
    }
  ): ConnectorBuilder<TAuth, TActions, TTriggers & Record<TKey, TriggerDefinition<TConfig, TOutput>>> {
    return this.withTrigger(key, {
      name: config.name,
      description: config.description,
      type: 'polling',
      config: config.config,
      output: config.output,
      poll: {
        defaultInterval: config.interval,
        minInterval: config.minInterval || 60000,
        fetch: config.fetch as (ctx: ExecutionContext, cursor?: string) => Promise<{ items: unknown[]; cursor?: string }>,
        dedupeKey: config.dedupeKey as (item: unknown) => string,
      },
    });
  }

  // ============================================
  // Configuration Methods
  // ============================================

  /**
   * Set rate limiting for the connector
   */
  withRateLimit(config: RateLimitConfig): this {
    this.rateLimit = config;
    return this;
  }

  /**
   * Set test connection function
   */
  withTestConnection(fn: TestConnectionFn): this {
    this.testConnectionFn = fn;
    return this;
  }

  // ============================================
  // Build
  // ============================================

  /**
   * Build the final connector definition
   */
  build(): ConnectorDefinition<TAuth, TActions, TTriggers> {
    return {
      id: this.config.id,
      name: this.config.name,
      version: this.config.version,
      description: this.config.description,
      icon: this.config.icon,
      color: this.config.color,
      category: this.config.category,
      tags: this.config.tags,
      docsUrl: this.config.docsUrl,
      baseUrl: this.config.baseUrl,
      defaultHeaders: this.config.defaultHeaders,
      auth: this.auth,
      actions: this.actions,
      triggers: this.triggers,
      rateLimit: this.rateLimit,
      testConnection: this.testConnectionFn,
    };
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a new connector using the fluent builder API
 */
export function createConnector(config: ConnectorBuilderConfig): ConnectorBuilder {
  return new ConnectorBuilder(config);
}

// ============================================
// Shorthand Helpers
// ============================================

/**
 * Create a simple input schema
 */
export function input<T extends z.ZodRawShape>(shape: T): z.ZodObject<T> {
  return z.object(shape);
}

/**
 * Create a simple output schema
 */
export function output<T extends z.ZodRawShape>(shape: T): z.ZodObject<T> {
  return z.object(shape);
}

/**
 * Create a string field with common options
 */
export const field = {
  string: (description?: string) => z.string().describe(description || ''),
  email: () => z.string().email(),
  url: () => z.string().url(),
  uuid: () => z.string().uuid(),
  number: (description?: string) => z.number().describe(description || ''),
  boolean: (description?: string) => z.boolean().describe(description || ''),
  array: <T extends z.ZodType>(item: T, description?: string) => 
    z.array(item).describe(description || ''),
  object: <T extends z.ZodRawShape>(shape: T, description?: string) => 
    z.object(shape).describe(description || ''),
  optional: <T extends z.ZodType>(schema: T) => schema.optional(),
  enum: <T extends [string, ...string[]]>(values: T) => z.enum(values),
  json: () => z.unknown(),
};
