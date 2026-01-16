/**
 * WFAIB Connector SDK - Type Definitions
 * 
 * Core types for building connectors (integrations) for the WFAIB platform.
 * Supports both declarative (config-based) and programmatic (code-based) connectors.
 * 
 * @module @wfaib/connector-sdk
 */

import { z } from 'zod';

// ============================================
// Connector Definition
// ============================================

/**
 * Complete connector definition
 */
export interface ConnectorDefinition<
  TAuth extends AuthConfig = AuthConfig,
  TActions extends Record<string, ActionDefinition> = Record<string, ActionDefinition>,
  TTriggers extends Record<string, TriggerDefinition> = Record<string, TriggerDefinition>
> {
  /** Unique identifier (e.g., "slack", "google-sheets") */
  id: string;
  
  /** Display name */
  name: string;
  
  /** Version (semver) */
  version: string;
  
  /** Description for marketplace */
  description?: string;
  
  /** Icon URL or base64 */
  icon?: string;
  
  /** Brand color (hex) */
  color?: string;
  
  /** Category for organization */
  category: ConnectorCategory;
  
  /** Search tags */
  tags?: string[];
  
  /** Documentation URL */
  docsUrl?: string;
  
  /** Authentication configuration */
  auth: TAuth;
  
  /** Available actions */
  actions: TActions;
  
  /** Available triggers */
  triggers?: TTriggers;
  
  /** Base URL for API requests (can use {{variables}}) */
  baseUrl?: string;
  
  /** Default headers for all requests */
  defaultHeaders?: Record<string, string>;
  
  /** Rate limiting configuration */
  rateLimit?: RateLimitConfig;
  
  /** Test connection function */
  testConnection?: TestConnectionFn;
}

export type ConnectorCategory =
  | 'communication'    // Slack, Discord, Email
  | 'crm'              // Salesforce, HubSpot
  | 'database'         // PostgreSQL, MongoDB
  | 'storage'          // S3, Google Drive
  | 'project'          // Jira, Asana
  | 'payment'          // Stripe, PayPal
  | 'analytics'        // Google Analytics, Mixpanel
  | 'developer'        // GitHub, GitLab
  | 'ai'               // OpenAI, Anthropic
  | 'marketing'        // Mailchimp, SendGrid
  | 'ecommerce'        // Shopify, WooCommerce
  | 'productivity'     // Notion, Airtable
  | 'social'           // Twitter, LinkedIn
  | 'other';

// ============================================
// Authentication
// ============================================

export type AuthConfig =
  | NoAuthConfig
  | ApiKeyAuthConfig
  | BasicAuthConfig
  | BearerAuthConfig
  | OAuth2Config
  | CustomAuthConfig;

export interface NoAuthConfig {
  type: 'none';
}

export interface ApiKeyAuthConfig {
  type: 'api_key';
  /** Where to send the key */
  location: 'header' | 'query' | 'body';
  /** Header/query param name */
  name: string;
  /** Optional prefix (e.g., "Bearer ", "Api-Key ") */
  prefix?: string;
  /** Fields to collect from user */
  fields: AuthField[];
}

export interface BasicAuthConfig {
  type: 'basic';
  fields: [
    AuthField & { key: 'username' },
    AuthField & { key: 'password' }
  ];
}

export interface BearerAuthConfig {
  type: 'bearer';
  fields: AuthField[];
}

export interface OAuth2Config {
  type: 'oauth2';
  /** OAuth2 grant type */
  grantType: 'authorization_code' | 'client_credentials';
  /** Authorization URL */
  authorizationUrl: string;
  /** Token URL */
  tokenUrl: string;
  /** Scopes to request */
  scopes: string[];
  /** Additional authorization params */
  authParams?: Record<string, string>;
  /** Token refresh configuration */
  refreshable?: boolean;
  /** PKCE support */
  pkce?: boolean;
}

export interface CustomAuthConfig {
  type: 'custom';
  /** Fields to collect */
  fields: AuthField[];
  /** Custom auth handler */
  handler: AuthHandler;
}

export interface AuthField {
  /** Field identifier */
  key: string;
  /** Display label */
  label: string;
  /** Field type */
  type: 'string' | 'password' | 'url' | 'number';
  /** Is required */
  required: boolean;
  /** Help text */
  description?: string;
  /** Placeholder */
  placeholder?: string;
  /** Default value */
  default?: string;
}

export type AuthHandler = (
  credentials: Record<string, string>,
  context: AuthContext
) => Promise<AuthResult>;

export interface AuthContext {
  baseUrl?: string;
  logger: Logger;
}

export interface AuthResult {
  /** Headers to add to requests */
  headers?: Record<string, string>;
  /** Query params to add */
  queryParams?: Record<string, string>;
  /** Modified credentials to store */
  credentials?: Record<string, string>;
}

// ============================================
// Actions
// ============================================

export interface ActionDefinition<
  TInput extends z.ZodType = z.ZodType,
  TOutput extends z.ZodType = z.ZodType
> {
  /** Display name */
  name: string;
  
  /** Description */
  description?: string;
  
  /** Input schema (Zod) */
  input: TInput;
  
  /** Output schema (Zod) */
  output: TOutput;
  
  /** Execute function OR declarative HTTP config */
  execute?: ActionExecuteFn<z.infer<TInput>, z.infer<TOutput>>;
  
  /** Declarative HTTP request (alternative to execute) */
  request?: HttpRequestConfig;
  
  /** Response transformation */
  response?: ResponseTransform;
  
  /** Action-specific rate limit */
  rateLimit?: RateLimitConfig;
  
  /** Retry configuration */
  retry?: RetryConfig;
  
  /** Pagination support */
  pagination?: PaginationConfig;
}

export type ActionExecuteFn<TInput, TOutput> = (
  input: TInput,
  context: ExecutionContext
) => Promise<TOutput>;

// ============================================
// Triggers
// ============================================

export interface TriggerDefinition<
  TConfig extends z.ZodType = z.ZodType,
  TOutput extends z.ZodType = z.ZodType
> {
  /** Display name */
  name: string;
  
  /** Description */
  description?: string;
  
  /** Trigger type */
  type: 'webhook' | 'polling' | 'event';
  
  /** Configuration schema */
  config?: TConfig;
  
  /** Output schema */
  output: TOutput;
  
  /** For webhook triggers: signature verification */
  webhook?: WebhookTriggerConfig;
  
  /** For polling triggers: fetch function */
  poll?: PollTriggerConfig;
}

export interface WebhookTriggerConfig {
  /** Signature header name */
  signatureHeader?: string;
  /** Signature verification function */
  verifySignature?: (payload: string, signature: string, secret: string) => boolean;
  /** Parse incoming webhook */
  parsePayload?: (body: unknown, headers: Record<string, string>) => unknown;
}

export interface PollTriggerConfig {
  /** Default polling interval (ms) */
  defaultInterval: number;
  /** Minimum interval (ms) */
  minInterval: number;
  /** Fetch new items */
  fetch: (context: ExecutionContext, cursor?: string) => Promise<PollResult>;
  /** Dedupe key extractor */
  dedupeKey: (item: unknown) => string;
}

export interface PollResult {
  items: unknown[];
  cursor?: string;
  hasMore?: boolean;
}

// ============================================
// HTTP Request Configuration
// ============================================

export interface HttpRequestConfig {
  /** HTTP method */
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  
  /** URL path (appended to baseUrl, supports {{input.field}} templates) */
  path: string;
  
  /** Query parameters */
  query?: Record<string, string | TemplateString>;
  
  /** Request headers */
  headers?: Record<string, string | TemplateString>;
  
  /** Request body */
  body?: BodyConfig;
  
  /** Content type */
  contentType?: 'json' | 'form' | 'multipart';
}

export type TemplateString = string; // Supports {{input.field}} syntax

export interface BodyConfig {
  /** Body type */
  type: 'json' | 'form' | 'raw';
  /** Body content (template supported) */
  content: unknown;
}

export interface ResponseTransform {
  /** JSONPath or function to extract data */
  data?: string | ((response: unknown) => unknown);
  /** Error extraction */
  error?: string | ((response: unknown) => string | null);
}

// ============================================
// Rate Limiting
// ============================================

export interface RateLimitConfig {
  /** Requests per window */
  requests: number;
  /** Window size in milliseconds */
  window: number;
  /** Strategy when limit hit */
  strategy: 'queue' | 'error' | 'retry';
  /** Key for rate limit bucket (template) */
  key?: string;
}

// ============================================
// Retry Configuration
// ============================================

export interface RetryConfig {
  /** Maximum retry attempts */
  maxAttempts: number;
  /** Initial delay (ms) */
  initialDelay: number;
  /** Maximum delay (ms) */
  maxDelay: number;
  /** Backoff multiplier */
  backoffMultiplier: number;
  /** HTTP status codes to retry */
  retryableStatuses?: number[];
  /** Error types to retry */
  retryableErrors?: string[];
}

// ============================================
// Pagination
// ============================================

export interface PaginationConfig {
  /** Pagination type */
  type: 'offset' | 'cursor' | 'page' | 'link';
  
  /** For offset: limit param name */
  limitParam?: string;
  /** For offset: offset param name */
  offsetParam?: string;
  
  /** For cursor: cursor param name */
  cursorParam?: string;
  /** Path to next cursor in response */
  nextCursorPath?: string;
  
  /** For page: page param name */
  pageParam?: string;
  
  /** For link: header or path to next URL */
  nextLinkPath?: string;
  
  /** Path to items in response */
  itemsPath: string;
  
  /** Path to total count (optional) */
  totalPath?: string;
  
  /** Default page size */
  defaultPageSize?: number;
  
  /** Max page size */
  maxPageSize?: number;
}

// ============================================
// Execution Context
// ============================================

export interface ExecutionContext {
  /** Resolved credentials */
  credentials: Record<string, unknown>;
  
  /** Organization ID */
  organizationId: string;
  
  /** Logger instance */
  logger: Logger;
  
  /** HTTP client with auth applied */
  http: HttpClient;
  
  /** Store for deduplication/state */
  store: KeyValueStore;
  
  /** Emit events (for triggers) */
  emit?: (event: unknown) => void;
}

export interface Logger {
  debug: (message: string, meta?: Record<string, unknown>) => void;
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
}

export interface HttpClient {
  request: <T = unknown>(config: HttpClientRequest) => Promise<HttpClientResponse<T>>;
  get: <T = unknown>(url: string, config?: Partial<HttpClientRequest>) => Promise<HttpClientResponse<T>>;
  post: <T = unknown>(url: string, data?: unknown, config?: Partial<HttpClientRequest>) => Promise<HttpClientResponse<T>>;
  put: <T = unknown>(url: string, data?: unknown, config?: Partial<HttpClientRequest>) => Promise<HttpClientResponse<T>>;
  patch: <T = unknown>(url: string, data?: unknown, config?: Partial<HttpClientRequest>) => Promise<HttpClientResponse<T>>;
  delete: <T = unknown>(url: string, config?: Partial<HttpClientRequest>) => Promise<HttpClientResponse<T>>;
}

export interface HttpClientRequest {
  url: string;
  method: string;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  data?: unknown;
  timeout?: number;
}

export interface HttpClientResponse<T = unknown> {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: T;
}

export interface KeyValueStore {
  get: <T = unknown>(key: string) => Promise<T | null>;
  set: <T = unknown>(key: string, value: T, ttl?: number) => Promise<void>;
  delete: (key: string) => Promise<void>;
  has: (key: string) => Promise<boolean>;
}

// ============================================
// Test Connection
// ============================================

export type TestConnectionFn = (
  credentials: Record<string, unknown>,
  context: Omit<ExecutionContext, 'store' | 'emit'>
) => Promise<TestConnectionResult>;

export interface TestConnectionResult {
  success: boolean;
  message?: string;
  accountInfo?: {
    id?: string;
    name?: string;
    email?: string;
    [key: string]: unknown;
  };
}

// ============================================
// Connector Instance (Runtime)
// ============================================

export interface ConnectorInstance {
  /** Connector definition */
  definition: ConnectorDefinition;
  
  /** Execute an action */
  executeAction: <TInput, TOutput>(
    actionId: string,
    input: TInput,
    context: ExecutionContext
  ) => Promise<TOutput>;
  
  /** Subscribe to a trigger */
  subscribeTrigger: (
    triggerId: string,
    config: unknown,
    context: ExecutionContext
  ) => Promise<TriggerSubscription>;
  
  /** Test connection */
  testConnection: (
    credentials: Record<string, unknown>,
    context: Omit<ExecutionContext, 'store' | 'emit'>
  ) => Promise<TestConnectionResult>;
}

export interface TriggerSubscription {
  id: string;
  unsubscribe: () => Promise<void>;
}

// ============================================
// Connector Builder Types
// ============================================

export type InferInput<T> = T extends ActionDefinition<infer I, unknown> ? z.infer<I> : never;
export type InferOutput<T> = T extends ActionDefinition<unknown, infer O> ? z.infer<O> : never;
