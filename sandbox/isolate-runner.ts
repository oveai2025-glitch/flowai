/**
 * Isolated VM Sandbox Runner
 * 
 * Secure code execution using V8 isolates via isolated-vm.
 * Provides:
 * - Memory isolation (separate V8 heap)
 * - CPU time limits
 * - No access to Node.js APIs
 * - No prototype pollution
 * - Configurable resource limits
 * 
 * @module sandbox/isolate-runner
 */

import ivm from 'isolated-vm';
import { logger } from '../lib/logger';

// ============================================
// Configuration
// ============================================

export interface SandboxConfig {
  /** Maximum execution time in milliseconds */
  timeout: number;
  /** Maximum memory in MB */
  memoryLimit: number;
  /** Maximum code size in bytes */
  maxCodeSize?: number;
  /** Enable strict mode */
  strict?: boolean;
}

const DEFAULT_CONFIG: SandboxConfig = {
  timeout: 5000,
  memoryLimit: 128,
  maxCodeSize: 1024 * 1024, // 1MB
  strict: true,
};

// ============================================
// Sandbox Runner Class
// ============================================

export class SandboxRunner {
  private config: SandboxConfig;
  private isolate: ivm.Isolate | null = null;
  private isDisposed = false;

  constructor(config: Partial<SandboxConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Execute code in the sandbox
   */
  async execute(
    code: string,
    context: Record<string, unknown> = {}
  ): Promise<unknown> {
    if (this.isDisposed) {
      throw new SandboxError('Sandbox has been disposed');
    }

    // Validate code size
    if (code.length > (this.config.maxCodeSize || DEFAULT_CONFIG.maxCodeSize!)) {
      throw new SandboxSecurityError('Code exceeds maximum size limit');
    }

    // Security validation
    this.validateCode(code);

    // Create isolate with memory limit
    this.isolate = new ivm.Isolate({
      memoryLimit: this.config.memoryLimit,
    });

    try {
      // Create context within isolate
      const ivmContext = await this.isolate.createContext();

      // Get the jail (global object in isolate)
      const jail = ivmContext.global;

      // Set up safe globals
      await this.setupSafeGlobals(jail, context);

      // Wrap user code in a function
      const wrappedCode = this.wrapCode(code);

      // Compile the script
      const script = await this.isolate.compileScript(wrappedCode, {
        filename: 'user-code.js',
      });

      // Execute with timeout
      const result = await script.run(ivmContext, {
        timeout: this.config.timeout,
        copy: true, // Copy result out of isolate
      });

      // Validate and return result
      return this.validateOutput(result);

    } catch (error) {
      // Handle specific error types
      if (error instanceof ivm.ExternalCopy) {
        throw new SandboxError('Execution produced invalid output');
      }

      if (error instanceof Error) {
        if (error.message.includes('Script execution timed out')) {
          throw new SandboxTimeoutError('Code execution timed out');
        }
        if (error.message.includes('Isolate was disposed')) {
          throw new SandboxMemoryError('Memory limit exceeded');
        }
        if (error.message.includes('out of memory')) {
          throw new SandboxMemoryError('Memory limit exceeded');
        }
      }

      throw new SandboxError(
        `Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );

    } finally {
      // Always dispose isolate after execution
      await this.disposeIsolate();
    }
  }

  /**
   * Dispose of the sandbox and release resources
   */
  async dispose(): Promise<void> {
    if (this.isDisposed) return;
    
    await this.disposeIsolate();
    this.isDisposed = true;
  }

  // ============================================
  // Private Methods
  // ============================================

  private async disposeIsolate(): Promise<void> {
    if (this.isolate && !this.isolate.isDisposed) {
      this.isolate.dispose();
      this.isolate = null;
    }
  }

  /**
   * Validate code for security issues
   */
  private validateCode(code: string): void {
    const forbiddenPatterns: Array<{ pattern: RegExp; message: string }> = [
      // Module system
      { pattern: /\brequire\s*\(/, message: 'require() is not allowed' },
      { pattern: /\bimport\s+/, message: 'import is not allowed' },
      { pattern: /\bimport\s*\(/, message: 'dynamic import is not allowed' },
      
      // Dangerous globals (should be blocked by isolate, but defense in depth)
      { pattern: /\bprocess\b/, message: 'process is not allowed' },
      { pattern: /\bglobal\b/, message: 'global is not allowed' },
      { pattern: /\bglobalThis\b/, message: 'globalThis is not allowed' },
      
      // Code execution (isolated-vm blocks these, but validate anyway)
      { pattern: /\beval\s*\(/, message: 'eval() is not allowed' },
      { pattern: /\bFunction\s*\(/, message: 'Function constructor is not allowed' },
      
      // Prototype pollution attempts
      { pattern: /__proto__/, message: '__proto__ access is not allowed' },
      { pattern: /\bconstructor\s*\[/, message: 'constructor access is not allowed' },
      { pattern: /Object\.setPrototypeOf/, message: 'Object.setPrototypeOf is not allowed' },
      { pattern: /Object\.defineProperty/, message: 'Object.defineProperty is not allowed' },
      { pattern: /Object\.defineProperties/, message: 'Object.defineProperties is not allowed' },
      { pattern: /Reflect\./, message: 'Reflect is not allowed' },
      { pattern: /\bProxy\b/, message: 'Proxy is not allowed' },
      
      // File system / child process indicators
      { pattern: /child_process/, message: 'child_process access is not allowed' },
      { pattern: /\bfs\b/, message: 'fs module access is not allowed' },
      { pattern: /\bexec\s*\(/, message: 'exec() is not allowed' },
      { pattern: /\bspawn\s*\(/, message: 'spawn() is not allowed' },
      
      // Network (blocked by isolate, defense in depth)
      { pattern: /\bfetch\s*\(/, message: 'fetch() is not allowed' },
      { pattern: /XMLHttpRequest/, message: 'XMLHttpRequest is not allowed' },
      { pattern: /WebSocket/, message: 'WebSocket is not allowed' },
      
      // Timers (infinite loops prevention)
      { pattern: /\bsetTimeout\s*\(/, message: 'setTimeout is not allowed' },
      { pattern: /\bsetInterval\s*\(/, message: 'setInterval is not allowed' },
      { pattern: /\bsetImmediate\s*\(/, message: 'setImmediate is not allowed' },
    ];

    for (const { pattern, message } of forbiddenPatterns) {
      if (pattern.test(code)) {
        throw new SandboxSecurityError(message);
      }
    }
  }

  /**
   * Set up safe globals in the isolate
   */
  private async setupSafeGlobals(
    jail: ivm.Reference<Record<string | symbol, unknown>>,
    context: Record<string, unknown>
  ): Promise<void> {
    // Deep freeze the input to prevent modification
    const frozenContext = this.deepFreeze(context);

    // Set input data
    await jail.set('input', new ivm.ExternalCopy(frozenContext.input || {}).copyInto());
    
    // Set variables
    for (const [key, value] of Object.entries(frozenContext)) {
      if (key !== 'input' && key !== 'console') {
        await jail.set(key, new ivm.ExternalCopy(value).copyInto());
      }
    }

    // Set up console (logging only, no side effects)
    const logs: Array<{ level: string; args: unknown[] }> = [];
    
    await jail.set('console', new ivm.Reference({
      log: (...args: unknown[]) => logs.push({ level: 'log', args }),
      warn: (...args: unknown[]) => logs.push({ level: 'warn', args }),
      error: (...args: unknown[]) => logs.push({ level: 'error', args }),
      info: (...args: unknown[]) => logs.push({ level: 'info', args }),
    }));

    // Set up safe built-ins
    await jail.set('JSON', new ivm.Reference({
      parse: (text: string) => JSON.parse(text),
      stringify: (value: unknown) => JSON.stringify(value),
    }));

    // Math is safe and useful
    await jail.set('Math', new ivm.Reference(Math));

    // Date (without mutation methods)
    await jail.set('Date', new ivm.Reference({
      now: () => Date.now(),
      parse: (str: string) => Date.parse(str),
      UTC: (...args: number[]) => Date.UTC(...args),
    }));

    // Safe string/array methods
    await jail.set('parseInt', new ivm.Reference(parseInt));
    await jail.set('parseFloat', new ivm.Reference(parseFloat));
    await jail.set('isNaN', new ivm.Reference(isNaN));
    await jail.set('isFinite', new ivm.Reference(isFinite));
    await jail.set('encodeURIComponent', new ivm.Reference(encodeURIComponent));
    await jail.set('decodeURIComponent', new ivm.Reference(decodeURIComponent));
    await jail.set('encodeURI', new ivm.Reference(encodeURI));
    await jail.set('decodeURI', new ivm.Reference(decodeURI));
  }

  /**
   * Wrap user code in a safe function
   */
  private wrapCode(code: string): string {
    const strictMode = this.config.strict ? '"use strict";' : '';
    
    return `
      ${strictMode}
      (function() {
        try {
          ${code}
        } catch (error) {
          return { __error__: true, message: error.message || String(error) };
        }
      })()
    `;
  }

  /**
   * Deep freeze an object to prevent modification
   */
  private deepFreeze<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    // Freeze arrays
    if (Array.isArray(obj)) {
      for (const item of obj) {
        this.deepFreeze(item);
      }
      return Object.freeze(obj);
    }

    // Freeze objects
    for (const value of Object.values(obj as Record<string, unknown>)) {
      this.deepFreeze(value);
    }
    
    return Object.freeze(obj);
  }

  /**
   * Validate output before returning
   */
  private validateOutput(result: unknown): unknown {
    // Check for error marker
    if (
      result &&
      typeof result === 'object' &&
      '__error__' in result &&
      (result as Record<string, unknown>).__error__
    ) {
      throw new SandboxError(
        `Runtime error: ${(result as Record<string, unknown>).message}`
      );
    }

    // Validate output size
    const serialized = JSON.stringify(result);
    const maxOutputSize = 10 * 1024 * 1024; // 10MB
    
    if (serialized.length > maxOutputSize) {
      throw new SandboxError('Output exceeds maximum size limit');
    }

    return result;
  }
}

// ============================================
// Isolate Pool (for performance)
// ============================================

export class SandboxPool {
  private pool: SandboxRunner[] = [];
  private config: SandboxConfig;
  private maxSize: number;

  constructor(config: Partial<SandboxConfig> = {}, maxSize = 10) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.maxSize = maxSize;
  }

  /**
   * Get a sandbox from the pool or create a new one
   */
  async acquire(): Promise<SandboxRunner> {
    const runner = this.pool.pop();
    if (runner) {
      return runner;
    }
    return new SandboxRunner(this.config);
  }

  /**
   * Return a sandbox to the pool
   */
  async release(runner: SandboxRunner): Promise<void> {
    // Don't pool if we're at capacity
    if (this.pool.length >= this.maxSize) {
      await runner.dispose();
      return;
    }
    
    // Add back to pool for reuse
    // Note: isolated-vm isolates should be disposed and recreated
    // for security, so we don't actually pool them
    await runner.dispose();
  }

  /**
   * Execute code using a pooled sandbox
   */
  async execute(
    code: string,
    context: Record<string, unknown> = {}
  ): Promise<unknown> {
    const runner = await this.acquire();
    try {
      return await runner.execute(code, context);
    } finally {
      await this.release(runner);
    }
  }

  /**
   * Dispose all sandboxes in the pool
   */
  async dispose(): Promise<void> {
    await Promise.all(this.pool.map(r => r.dispose()));
    this.pool = [];
  }
}

// ============================================
// Error Types
// ============================================

export class SandboxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SandboxError';
  }
}

export class SandboxSecurityError extends SandboxError {
  constructor(message: string) {
    super(message);
    this.name = 'SandboxSecurityError';
  }
}

export class SandboxTimeoutError extends SandboxError {
  constructor(message: string) {
    super(message);
    this.name = 'SandboxTimeoutError';
  }
}

export class SandboxMemoryError extends SandboxError {
  constructor(message: string) {
    super(message);
    this.name = 'SandboxMemoryError';
  }
}

// ============================================
// Convenience Function
// ============================================

/**
 * Execute code in a one-off sandbox
 */
export async function executeInSandbox(
  code: string,
  context: Record<string, unknown> = {},
  config: Partial<SandboxConfig> = {}
): Promise<unknown> {
  const runner = new SandboxRunner(config);
  try {
    return await runner.execute(code, context);
  } finally {
    await runner.dispose();
  }
}
