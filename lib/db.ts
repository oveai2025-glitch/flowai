/**
 * Database Client
 * 
 * Prisma client singleton with:
 * - Connection pooling
 * - Query logging in development
 * - Graceful shutdown
 * 
 * @module lib/db
 */

import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

// ============================================
// Global Singleton Pattern
// ============================================

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// ============================================
// Client Configuration
// ============================================

function createPrismaClient(): PrismaClient {
  const isProduction = process.env.NODE_ENV === 'production';

  return new PrismaClient({
    log: isProduction
      ? ['error', 'warn']
      : [
          { emit: 'event', level: 'query' },
          { emit: 'event', level: 'error' },
          { emit: 'event', level: 'warn' },
        ],
    errorFormat: isProduction ? 'minimal' : 'pretty',
  });
}

// ============================================
// Client Instance
// ============================================

export const db = globalForPrisma.prisma ?? createPrismaClient();

// Prevent multiple instances in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;

  // Log queries in development
  // @ts-expect-error - Prisma event types
  db.$on('query', (e: { query: string; params: string; duration: number }) => {
    logger.debug('Prisma query', {
      query: e.query,
      params: e.params,
      duration: `${e.duration}ms`,
    });
  });
}

// ============================================
// Connection Management
// ============================================

/**
 * Connect to database
 */
export async function connectDatabase(): Promise<void> {
  try {
    await db.$connect();
    logger.info('Database connected');
  } catch (error) {
    logger.error('Failed to connect to database', error);
    throw error;
  }
}

/**
 * Disconnect from database
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await db.$disconnect();
    logger.info('Database disconnected');
  } catch (error) {
    logger.error('Failed to disconnect from database', error);
    throw error;
  }
}

/**
 * Check database health
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  latencyMs: number;
  error?: string;
}> {
  const start = Date.now();

  try {
    await db.$queryRaw`SELECT 1`;
    
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

// ============================================
// Transaction Helpers
// ============================================

export type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Execute a function within a transaction
 */
export async function withTransaction<T>(
  fn: (tx: TransactionClient) => Promise<T>,
  options?: {
    maxWait?: number;
    timeout?: number;
  }
): Promise<T> {
  return db.$transaction(fn, {
    maxWait: options?.maxWait ?? 5000,
    timeout: options?.timeout ?? 10000,
  });
}

// ============================================
// Graceful Shutdown
// ============================================

if (typeof process !== 'undefined') {
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, closing database connection`);
    await disconnectDatabase();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

export default db;
