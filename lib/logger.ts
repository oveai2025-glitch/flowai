/**
 * Structured Logger
 * 
 * Production-grade logging with:
 * - JSON structured output
 * - Log levels (debug, info, warn, error)
 * - Context propagation
 * - Secret redaction
 * - Request correlation
 * 
 * @module lib/logger
 */

// ============================================
// Types
// ============================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  requestId?: string;
  organizationId?: string;
  userId?: string;
  workflowId?: string;
  runId?: string;
  nodeId?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  [key: string]: unknown;
}

export interface Logger {
  debug: (message: string, meta?: Record<string, unknown>) => void;
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, error?: unknown, meta?: Record<string, unknown>) => void;
  child: (context: LogContext) => Logger;
  forRequest: (requestId: string, userId?: string, organizationId?: string) => Logger;
  forRun: (runId: string, workflowId: string, organizationId: string) => Logger;
}

// ============================================
// Configuration
// ============================================

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLogLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

const isProduction = process.env.NODE_ENV === 'production';

// ============================================
// Secret Redaction
// ============================================

const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /auth/i,
  /credential/i,
  /private[_-]?key/i,
  /access[_-]?key/i,
  /bearer/i,
  /session/i,
  /cookie/i,
];

const REDACTED = '[REDACTED]';

function redactSensitiveData(obj: unknown, depth = 0): unknown {
  if (depth > 10) return obj; // Prevent infinite recursion

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    // Check if the string looks like a secret
    if (obj.length > 20 && /^(sk-|pk-|ghp_|gho_|whsec_|rk_|xoxb-|xoxp-)/.test(obj)) {
      return REDACTED;
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => redactSensitiveData(item, depth + 1));
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      // Check if key matches sensitive patterns
      const isSensitive = SENSITIVE_PATTERNS.some(pattern => pattern.test(key));
      
      if (isSensitive && typeof value === 'string') {
        result[key] = REDACTED;
      } else {
        result[key] = redactSensitiveData(value, depth + 1);
      }
    }
    
    return result;
  }

  return obj;
}

// ============================================
// Logger Implementation
// ============================================

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[currentLogLevel];
}

function formatError(error: unknown): { name: string; message: string; stack?: string } | undefined {
  if (!error) return undefined;

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: isProduction ? undefined : error.stack,
    };
  }

  return {
    name: 'UnknownError',
    message: String(error),
  };
}

function createLogEntry(
  level: LogLevel,
  message: string,
  context?: LogContext,
  meta?: Record<string, unknown>,
  error?: unknown
): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };

  if (context && Object.keys(context).length > 0) {
    entry.context = context;
  }

  if (meta && Object.keys(meta).length > 0) {
    // Redact sensitive data in meta
    const safetyMeta = redactSensitiveData(meta) as Record<string, unknown>;
    Object.assign(entry, safetyMeta);
  }

  if (error) {
    entry.error = formatError(error);
  }

  return entry;
}

function outputLog(entry: LogEntry): void {
  const output = isProduction
    ? JSON.stringify(entry)
    : formatPretty(entry);

  switch (entry.level) {
    case 'debug':
    case 'info':
      console.log(output);
      break;
    case 'warn':
      console.warn(output);
      break;
    case 'error':
      console.error(output);
      break;
  }
}

function formatPretty(entry: LogEntry): string {
  const levelColors: Record<LogLevel, string> = {
    debug: '\x1b[36m', // Cyan
    info: '\x1b[32m',  // Green
    warn: '\x1b[33m',  // Yellow
    error: '\x1b[31m', // Red
  };

  const reset = '\x1b[0m';
  const dim = '\x1b[2m';
  
  const color = levelColors[entry.level];
  const level = entry.level.toUpperCase().padEnd(5);
  const time = entry.timestamp.split('T')[1]?.split('.')[0] || '';

  let output = `${dim}${time}${reset} ${color}${level}${reset} ${entry.message}`;

  if (entry.context) {
    const contextStr = Object.entries(entry.context)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}=${v}`)
      .join(' ');
    
    if (contextStr) {
      output += ` ${dim}${contextStr}${reset}`;
    }
  }

  if (entry.error) {
    output += `\n  ${color}Error: ${entry.error.message}${reset}`;
    if (entry.error.stack) {
      output += `\n${dim}${entry.error.stack}${reset}`;
    }
  }

  return output;
}

function createLogger(baseContext: LogContext = {}): Logger {
  return {
    debug(message: string, meta?: Record<string, unknown>): void {
      if (!shouldLog('debug')) return;
      outputLog(createLogEntry('debug', message, baseContext, meta));
    },

    info(message: string, meta?: Record<string, unknown>): void {
      if (!shouldLog('info')) return;
      outputLog(createLogEntry('info', message, baseContext, meta));
    },

    warn(message: string, meta?: Record<string, unknown>): void {
      if (!shouldLog('warn')) return;
      outputLog(createLogEntry('warn', message, baseContext, meta));
    },

    error(message: string, error?: unknown, meta?: Record<string, unknown>): void {
      if (!shouldLog('error')) return;
      outputLog(createLogEntry('error', message, baseContext, meta, error));
    },

    child(context: LogContext): Logger {
      return createLogger({ ...baseContext, ...context });
    },

    forRequest(requestId: string, userId?: string, organizationId?: string): Logger {
      return createLogger({
        ...baseContext,
        requestId,
        userId,
        organizationId,
      });
    },

    forRun(runId: string, workflowId: string, organizationId: string): Logger {
      return createLogger({
        ...baseContext,
        runId,
        workflowId,
        organizationId,
      });
    },
  };
}

// ============================================
// Exports
// ============================================

export const logger = createLogger();

export { createLogger, redactSensitiveData };

export default logger;
