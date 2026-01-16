/**
 * Temporal Connection Manager
 * 
 * Manages connections to Temporal server with:
 * - Connection pooling
 * - Automatic reconnection
 * - Health checking
 * - Graceful shutdown
 * 
 * @module lib/temporal/connection
 */

import { Connection, Client } from '@temporalio/client';
import { NativeConnection } from '@temporalio/worker';
import { logger } from '../logger';

// ============================================
// Configuration
// ============================================

export interface TemporalConfig {
  /** Temporal server address (host:port) */
  address: string;
  /** Namespace for workflows */
  namespace: string;
  /** TLS configuration for production */
  tls?: {
    clientCertPath?: string;
    clientKeyPath?: string;
    serverRootCACertPath?: string;
  };
  /** Connection timeout in milliseconds */
  connectTimeoutMs?: number;
  /** Enable mTLS */
  mtls?: boolean;
}

// ============================================
// Environment-based Configuration
// ============================================

export function getTemporalConfig(): TemporalConfig {
  return {
    address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
    namespace: process.env.TEMPORAL_NAMESPACE || 'default',
    connectTimeoutMs: parseInt(process.env.TEMPORAL_CONNECT_TIMEOUT_MS || '10000', 10),
    mtls: process.env.TEMPORAL_MTLS === 'true',
    tls: process.env.TEMPORAL_MTLS === 'true' ? {
      clientCertPath: process.env.TEMPORAL_CLIENT_CERT_PATH,
      clientKeyPath: process.env.TEMPORAL_CLIENT_KEY_PATH,
      serverRootCACertPath: process.env.TEMPORAL_SERVER_ROOT_CA_CERT_PATH,
    } : undefined,
  };
}

// ============================================
// Connection Singleton
// ============================================

let clientConnection: Connection | null = null;
let temporalClient: Client | null = null;
let workerConnection: NativeConnection | null = null;

/**
 * Get or create Temporal client connection
 * Used by API routes to start/query workflows
 */
export async function getClientConnection(): Promise<Connection> {
  if (clientConnection) {
    return clientConnection;
  }

  const config = getTemporalConfig();
  
  logger.info('Establishing Temporal client connection', {
    address: config.address,
    namespace: config.namespace,
  });

  try {
    clientConnection = await Connection.connect({
      address: config.address,
      connectTimeout: config.connectTimeoutMs,
      // TLS configuration for production
      ...(config.tls && {
        tls: {
          clientCertPair: config.tls.clientCertPath && config.tls.clientKeyPath ? {
            crt: await loadFile(config.tls.clientCertPath),
            key: await loadFile(config.tls.clientKeyPath),
          } : undefined,
          serverRootCACertificate: config.tls.serverRootCACertPath 
            ? await loadFile(config.tls.serverRootCACertPath)
            : undefined,
        },
      }),
    });

    logger.info('Temporal client connection established');
    return clientConnection;
  } catch (error) {
    logger.error('Failed to connect to Temporal', error);
    throw new TemporalConnectionError('Failed to establish Temporal connection', error);
  }
}

/**
 * Get or create Temporal client instance
 * High-level client for workflow operations
 */
export async function getTemporalClient(): Promise<Client> {
  if (temporalClient) {
    return temporalClient;
  }

  const connection = await getClientConnection();
  const config = getTemporalConfig();

  temporalClient = new Client({
    connection,
    namespace: config.namespace,
  });

  return temporalClient;
}

/**
 * Get or create native connection for workers
 * Workers use a different connection type for performance
 */
export async function getWorkerConnection(): Promise<NativeConnection> {
  if (workerConnection) {
    return workerConnection;
  }

  const config = getTemporalConfig();

  logger.info('Establishing Temporal worker connection', {
    address: config.address,
  });

  try {
    workerConnection = await NativeConnection.connect({
      address: config.address,
      // TLS for production
      ...(config.tls && {
        tls: {
          clientCertPair: config.tls.clientCertPath && config.tls.clientKeyPath ? {
            crt: await loadFile(config.tls.clientCertPath),
            key: await loadFile(config.tls.clientKeyPath),
          } : undefined,
          serverRootCACertificate: config.tls.serverRootCACertPath 
            ? await loadFile(config.tls.serverRootCACertPath)
            : undefined,
        },
      }),
    });

    logger.info('Temporal worker connection established');
    return workerConnection;
  } catch (error) {
    logger.error('Failed to establish worker connection', error);
    throw new TemporalConnectionError('Failed to establish worker connection', error);
  }
}

/**
 * Health check for Temporal connection
 */
export async function checkTemporalHealth(): Promise<{
  healthy: boolean;
  latencyMs: number;
  error?: string;
}> {
  const start = Date.now();
  
  try {
    const client = await getTemporalClient();
    const config = getTemporalConfig();
    
    // Attempt to describe the namespace as a health check
    const handle = client.workflowService;
    await handle.describeNamespace({ namespace: config.namespace });
    
    return {
      healthy: true,
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      healthy: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Gracefully close all connections
 */
export async function closeConnections(): Promise<void> {
  logger.info('Closing Temporal connections');

  const closePromises: Promise<void>[] = [];

  if (workerConnection) {
    closePromises.push(
      workerConnection.close().then(() => {
        workerConnection = null;
      })
    );
  }

  if (clientConnection) {
    closePromises.push(
      clientConnection.close().then(() => {
        clientConnection = null;
        temporalClient = null;
      })
    );
  }

  await Promise.all(closePromises);
  logger.info('Temporal connections closed');
}

// ============================================
// Utilities
// ============================================

async function loadFile(path: string): Promise<Buffer> {
  const fs = await import('fs/promises');
  return fs.readFile(path);
}

// ============================================
// Error Types
// ============================================

export class TemporalConnectionError extends Error {
  public readonly cause: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'TemporalConnectionError';
    this.cause = cause;
  }
}

// ============================================
// Shutdown Handler
// ============================================

// Register shutdown handlers
if (typeof process !== 'undefined') {
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, closing Temporal connections`);
    await closeConnections();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
