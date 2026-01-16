/**
 * Temporal Worker Process
 * 
 * Main worker that processes workflow tasks and activities.
 * Runs as a separate process from the web app.
 * 
 * Features:
 * - Workflow task processing
 * - Activity execution
 * - Graceful shutdown
 * - Health monitoring
 * - Metrics collection
 * 
 * @module worker/temporal/worker
 */

import { Worker, NativeConnection, Runtime } from '@temporalio/worker';
import { getWorkerConnection, getTemporalConfig, closeConnections } from '../../lib/temporal/connection';
import { logger } from '../../lib/logger';
import { 
  queueActiveJobs, 
  queueWaitingJobs,
  workflowRunsTotal,
} from '../../lib/metrics';
import * as activities from './activities/node-executor';

// ============================================
// Worker Configuration
// ============================================

interface WorkerConfig {
  /** Task queue to poll */
  taskQueue: string;
  /** Maximum concurrent workflow tasks */
  maxConcurrentWorkflowTaskExecutions: number;
  /** Maximum concurrent activities */
  maxConcurrentActivityTaskExecutions: number;
  /** Maximum cached workflows */
  maxCachedWorkflows: number;
  /** Enable debug mode */
  debugMode: boolean;
}

function getWorkerConfig(): WorkerConfig {
  return {
    taskQueue: process.env.TEMPORAL_TASK_QUEUE || 'wfaib-main',
    maxConcurrentWorkflowTaskExecutions: parseInt(
      process.env.WORKER_MAX_CONCURRENT_WORKFLOWS || '100',
      10
    ),
    maxConcurrentActivityTaskExecutions: parseInt(
      process.env.WORKER_MAX_CONCURRENT_ACTIVITIES || '100',
      10
    ),
    maxCachedWorkflows: parseInt(
      process.env.WORKER_MAX_CACHED_WORKFLOWS || '1000',
      10
    ),
    debugMode: process.env.NODE_ENV === 'development',
  };
}

// ============================================
// Worker Lifecycle
// ============================================

let worker: Worker | null = null;
let isShuttingDown = false;

/**
 * Create and start the Temporal worker
 */
export async function startWorker(): Promise<Worker> {
  const config = getWorkerConfig();
  const temporalConfig = getTemporalConfig();

  logger.info('Starting Temporal worker', {
    taskQueue: config.taskQueue,
    namespace: temporalConfig.namespace,
    maxWorkflows: config.maxConcurrentWorkflowTaskExecutions,
    maxActivities: config.maxConcurrentActivityTaskExecutions,
  });

  // Configure runtime (optional: for telemetry, logging)
  Runtime.install({
    logger: {
      log: (level, message, meta) => {
        const logLevel = level === 'TRACE' || level === 'DEBUG' ? 'debug' :
                        level === 'INFO' ? 'info' :
                        level === 'WARN' ? 'warn' : 'error';
        logger[logLevel](`[Temporal] ${message}`, meta);
      },
      trace: (message, meta) => logger.debug(`[Temporal] ${message}`, meta),
      debug: (message, meta) => logger.debug(`[Temporal] ${message}`, meta),
      info: (message, meta) => logger.info(`[Temporal] ${message}`, meta),
      warn: (message, meta) => logger.warn(`[Temporal] ${message}`, meta),
      error: (message, meta) => logger.error(`[Temporal] ${message}`, meta),
    },
    telemetryOptions: {
      metrics: {
        // Prometheus metrics endpoint would be configured here
        prometheus: {
          bindAddress: '0.0.0.0:9464',
        },
      },
    },
  });

  // Get connection to Temporal server
  const connection = await getWorkerConnection();

  // Create worker
  worker = await Worker.create({
    connection,
    namespace: temporalConfig.namespace,
    taskQueue: config.taskQueue,

    // Workflow configuration
    workflowsPath: require.resolve('./workflows/automation'),
    maxConcurrentWorkflowTaskExecutions: config.maxConcurrentWorkflowTaskExecutions,
    maxCachedWorkflows: config.maxCachedWorkflows,

    // Activity configuration
    activities,
    maxConcurrentActivityTaskExecutions: config.maxConcurrentActivityTaskExecutions,

    // Sticky workflow execution (for performance)
    stickyQueueScheduleToStartTimeout: '10s',

    // Enable workflow bundle for production
    bundlerOptions: {
      // Webpack configuration for workflow bundling
      ignoreModules: [
        // Modules that shouldn't be bundled
        'pg',
        'isolated-vm',
      ],
    },
  });

  // Start worker and handle shutdown
  setupShutdownHandlers();

  logger.info('Temporal worker started successfully');

  // Start periodic health check and metrics
  startHealthCheck();

  return worker;
}

/**
 * Run the worker (blocking)
 */
export async function runWorker(): Promise<void> {
  const w = await startWorker();
  
  try {
    await w.run();
  } catch (error) {
    if (!isShuttingDown) {
      logger.error('Worker error', error);
      throw error;
    }
  }
}

/**
 * Gracefully shutdown the worker
 */
export async function shutdownWorker(): Promise<void> {
  if (isShuttingDown) {
    return;
  }
  
  isShuttingDown = true;
  logger.info('Shutting down Temporal worker');

  if (worker) {
    // Signal worker to stop accepting new tasks
    worker.shutdown();

    // Wait for in-flight tasks to complete (with timeout)
    const shutdownTimeout = parseInt(process.env.WORKER_SHUTDOWN_TIMEOUT || '30000', 10);
    
    try {
      await Promise.race([
        waitForWorkerShutdown(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Shutdown timeout')), shutdownTimeout)
        ),
      ]);
    } catch (error) {
      logger.warn('Worker shutdown timeout, forcing exit');
    }
  }

  // Close Temporal connections
  await closeConnections();

  logger.info('Temporal worker shutdown complete');
}

async function waitForWorkerShutdown(): Promise<void> {
  // Worker.run() will return when shutdown is complete
  // This is a placeholder for additional cleanup
  await new Promise(resolve => setTimeout(resolve, 100));
}

// ============================================
// Health Check & Metrics
// ============================================

function startHealthCheck(): void {
  const checkInterval = parseInt(process.env.WORKER_HEALTH_CHECK_INTERVAL || '30000', 10);

  setInterval(async () => {
    if (!worker || isShuttingDown) return;

    try {
      // Get worker status
      const status = worker.getState();
      
      logger.debug('Worker health check', {
        state: status,
      });

      // Update metrics
      // Note: Temporal SDK provides detailed metrics via Prometheus
      // These are additional application-level metrics
      
    } catch (error) {
      logger.error('Health check failed', error);
    }
  }, checkInterval);
}

// ============================================
// Shutdown Handlers
// ============================================

function setupShutdownHandlers(): void {
  const handleSignal = async (signal: string) => {
    logger.info(`Received ${signal} signal`);
    await shutdownWorker();
    process.exit(0);
  };

  process.on('SIGTERM', () => handleSignal('SIGTERM'));
  process.on('SIGINT', () => handleSignal('SIGINT'));

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception in worker', error);
    shutdownWorker().then(() => process.exit(1));
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection in worker', reason);
    shutdownWorker().then(() => process.exit(1));
  });
}

// ============================================
// Main Entry Point
// ============================================

if (require.main === module) {
  runWorker()
    .then(() => {
      logger.info('Worker exited normally');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Worker failed to start', error);
      process.exit(1);
    });
}

export { worker };
