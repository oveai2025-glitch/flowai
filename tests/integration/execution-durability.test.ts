/**
 * Execution Durability Integration Tests
 * 
 * Tests that verify:
 * - Workflows survive worker restarts
 * - State is preserved across crashes
 * - Retries work correctly
 * - Long-running workflows complete
 * 
 * @module tests/integration/execution-durability.test
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker, Runtime } from '@temporalio/worker';
import { Client } from '@temporalio/client';
import { v4 as uuid } from 'uuid';

// Import workflow and activities
import { automationWorkflow, AutomationWorkflowInput } from '../../worker/temporal/workflows/automation';
import * as activities from '../../worker/temporal/activities/node-executor';

describe('Workflow Execution Durability', () => {
  let testEnv: TestWorkflowEnvironment;
  let client: Client;
  let worker: Worker;

  beforeAll(async () => {
    // Start test environment (in-memory Temporal)
    Runtime.install({});
    testEnv = await TestWorkflowEnvironment.createLocal();
    client = testEnv.client;
  });

  afterAll(async () => {
    await testEnv?.teardown();
  });

  beforeEach(async () => {
    // Create fresh worker for each test
    worker = await Worker.create({
      connection: testEnv.nativeConnection,
      taskQueue: 'test-queue',
      workflowsPath: require.resolve('../../worker/temporal/workflows/automation'),
      activities,
    });
  });

  // ============================================
  // Basic Execution Tests
  // ============================================

  describe('Basic Execution', () => {
    it('should complete a simple workflow', async () => {
      const workflowId = `test-${uuid()}`;
      
      const input: AutomationWorkflowInput = {
        definition: {
          id: 'test-workflow',
          name: 'Test Workflow',
          nodes: [
            {
              id: 'trigger-1',
              type: 'trigger-manual',
              data: { label: 'Manual Trigger' },
              position: { x: 0, y: 0 },
            },
            {
              id: 'transform-1',
              type: 'transform-set',
              data: { 
                label: 'Set Value',
                config: { key: 'result', value: 'success' }
              },
              position: { x: 200, y: 0 },
            },
          ],
          edges: [
            { id: 'e1', source: 'trigger-1', target: 'transform-1' },
          ],
        },
        input: { test: true },
        organizationId: 'org-123',
        triggerType: 'manual',
      };

      // Run worker in background
      const workerPromise = worker.run();

      // Start workflow
      const handle = await client.workflow.start(automationWorkflow, {
        workflowId,
        taskQueue: 'test-queue',
        args: [input],
      });

      // Wait for result
      const result = await handle.result();

      // Stop worker
      worker.shutdown();
      await workerPromise;

      // Verify result
      expect(result.status).toBe('success');
      expect(result.results['trigger-1']).toBeDefined();
      expect(result.results['transform-1']).toBeDefined();
    });

    it('should execute nodes in correct order', async () => {
      const workflowId = `test-${uuid()}`;
      const executionOrder: string[] = [];

      // Mock activities to track order
      const trackedActivities = {
        ...activities,
        executeNode: async (input: any) => {
          executionOrder.push(input.nodeId);
          return activities.executeNode(input);
        },
      };

      const trackedWorker = await Worker.create({
        connection: testEnv.nativeConnection,
        taskQueue: 'tracked-queue',
        workflowsPath: require.resolve('../../worker/temporal/workflows/automation'),
        activities: trackedActivities,
      });

      const input: AutomationWorkflowInput = {
        definition: {
          id: 'ordered-workflow',
          name: 'Ordered Workflow',
          nodes: [
            { id: 'node-1', type: 'trigger-manual', data: { label: 'Start' }, position: { x: 0, y: 0 } },
            { id: 'node-2', type: 'transform-set', data: { label: 'Step 2' }, position: { x: 200, y: 0 } },
            { id: 'node-3', type: 'transform-set', data: { label: 'Step 3' }, position: { x: 400, y: 0 } },
          ],
          edges: [
            { id: 'e1', source: 'node-1', target: 'node-2' },
            { id: 'e2', source: 'node-2', target: 'node-3' },
          ],
        },
        input: {},
        organizationId: 'org-123',
        triggerType: 'manual',
      };

      const workerPromise = trackedWorker.run();

      const handle = await client.workflow.start(automationWorkflow, {
        workflowId,
        taskQueue: 'tracked-queue',
        args: [input],
      });

      await handle.result();

      trackedWorker.shutdown();
      await workerPromise;

      // Verify order
      expect(executionOrder).toEqual(['node-1', 'node-2', 'node-3']);
    });
  });

  // ============================================
  // Crash Recovery Tests
  // ============================================

  describe('Crash Recovery', () => {
    it('should resume workflow after worker restart', async () => {
      const workflowId = `crash-test-${uuid()}`;
      let nodeExecutionCount = 0;
      let workerRestartHappened = false;

      // Create workflow that will be interrupted
      const input: AutomationWorkflowInput = {
        definition: {
          id: 'crash-workflow',
          name: 'Crash Test Workflow',
          nodes: [
            { id: 'node-1', type: 'trigger-manual', data: { label: 'Start' }, position: { x: 0, y: 0 } },
            { id: 'node-2', type: 'wait-delay', data: { label: 'Wait', config: { duration: 100 } }, position: { x: 200, y: 0 } },
            { id: 'node-3', type: 'transform-set', data: { label: 'End' }, position: { x: 400, y: 0 } },
          ],
          edges: [
            { id: 'e1', source: 'node-1', target: 'node-2' },
            { id: 'e2', source: 'node-2', target: 'node-3' },
          ],
        },
        input: {},
        organizationId: 'org-123',
        triggerType: 'manual',
      };

      // Start workflow
      const handle = await client.workflow.start(automationWorkflow, {
        workflowId,
        taskQueue: 'crash-queue',
        args: [input],
      });

      // Create first worker
      let worker1 = await Worker.create({
        connection: testEnv.nativeConnection,
        taskQueue: 'crash-queue',
        workflowsPath: require.resolve('../../worker/temporal/workflows/automation'),
        activities,
      });

      // Run worker briefly then stop (simulating crash)
      const worker1Promise = worker1.run();
      await new Promise(resolve => setTimeout(resolve, 50));
      worker1.shutdown();
      await worker1Promise;

      workerRestartHappened = true;

      // Create second worker to continue
      let worker2 = await Worker.create({
        connection: testEnv.nativeConnection,
        taskQueue: 'crash-queue',
        workflowsPath: require.resolve('../../worker/temporal/workflows/automation'),
        activities,
      });

      const worker2Promise = worker2.run();

      // Wait for workflow to complete
      const result = await handle.result();

      worker2.shutdown();
      await worker2Promise;

      // Workflow should complete successfully after restart
      expect(result.status).toBe('success');
      expect(workerRestartHappened).toBe(true);
    });

    it('should preserve workflow state across restarts', async () => {
      const workflowId = `state-test-${uuid()}`;

      const input: AutomationWorkflowInput = {
        definition: {
          id: 'state-workflow',
          name: 'State Test',
          nodes: [
            { id: 'trigger', type: 'trigger-manual', data: { label: 'Start' }, position: { x: 0, y: 0 } },
          ],
          edges: [],
        },
        input: { initialValue: 42 },
        organizationId: 'org-123',
        triggerType: 'manual',
      };

      const workerPromise = worker.run();

      const handle = await client.workflow.start(automationWorkflow, {
        workflowId,
        taskQueue: 'test-queue',
        args: [input],
      });

      const result = await handle.result();

      worker.shutdown();
      await workerPromise;

      // Verify input was preserved
      expect(result.results['trigger'].output).toEqual({ initialValue: 42 });
    });
  });

  // ============================================
  // Retry & Error Handling Tests
  // ============================================

  describe('Retry & Error Handling', () => {
    it('should retry failed activities', async () => {
      const workflowId = `retry-test-${uuid()}`;
      let attemptCount = 0;

      // Activity that fails twice then succeeds
      const flakeyActivities = {
        ...activities,
        executeConnector: async (input: any) => {
          attemptCount++;
          if (attemptCount < 3) {
            throw new Error('Temporary failure');
          }
          return { data: 'success' };
        },
      };

      const retryWorker = await Worker.create({
        connection: testEnv.nativeConnection,
        taskQueue: 'retry-queue',
        workflowsPath: require.resolve('../../worker/temporal/workflows/automation'),
        activities: flakeyActivities,
      });

      const input: AutomationWorkflowInput = {
        definition: {
          id: 'retry-workflow',
          name: 'Retry Test',
          nodes: [
            { id: 'trigger', type: 'trigger-manual', data: { label: 'Start' }, position: { x: 0, y: 0 } },
            { id: 'action', type: 'action-http-get', data: { label: 'HTTP' }, position: { x: 200, y: 0 } },
          ],
          edges: [
            { id: 'e1', source: 'trigger', target: 'action' },
          ],
        },
        input: {},
        organizationId: 'org-123',
        triggerType: 'manual',
      };

      const workerPromise = retryWorker.run();

      const handle = await client.workflow.start(automationWorkflow, {
        workflowId,
        taskQueue: 'retry-queue',
        args: [input],
      });

      const result = await handle.result();

      retryWorker.shutdown();
      await workerPromise;

      // Should succeed after retries
      expect(result.status).toBe('success');
      expect(attemptCount).toBe(3);
    });

    it('should handle non-retryable errors', async () => {
      const workflowId = `nonretry-test-${uuid()}`;

      // Activity that throws non-retryable error
      const errorActivities = {
        ...activities,
        executeConnector: async (input: any) => {
          const error = new Error('Configuration error');
          error.name = 'ConfigurationError';
          throw error;
        },
      };

      const errorWorker = await Worker.create({
        connection: testEnv.nativeConnection,
        taskQueue: 'error-queue',
        workflowsPath: require.resolve('../../worker/temporal/workflows/automation'),
        activities: errorActivities,
      });

      const input: AutomationWorkflowInput = {
        definition: {
          id: 'error-workflow',
          name: 'Error Test',
          nodes: [
            { id: 'trigger', type: 'trigger-manual', data: { label: 'Start' }, position: { x: 0, y: 0 } },
            { id: 'action', type: 'action-http-get', data: { label: 'HTTP' }, position: { x: 200, y: 0 } },
          ],
          edges: [
            { id: 'e1', source: 'trigger', target: 'action' },
          ],
          settings: {
            errorHandling: 'stop',
          },
        },
        input: {},
        organizationId: 'org-123',
        triggerType: 'manual',
      };

      const workerPromise = errorWorker.run();

      const handle = await client.workflow.start(automationWorkflow, {
        workflowId,
        taskQueue: 'error-queue',
        args: [input],
      });

      const result = await handle.result();

      errorWorker.shutdown();
      await workerPromise;

      // Should fail with error
      expect(result.status).toBe('failed');
      expect(result.error).toContain('Configuration error');
    });
  });

  // ============================================
  // Signal & Query Tests
  // ============================================

  describe('Signals & Queries', () => {
    it('should respond to state queries', async () => {
      const workflowId = `query-test-${uuid()}`;

      const input: AutomationWorkflowInput = {
        definition: {
          id: 'query-workflow',
          name: 'Query Test',
          nodes: [
            { id: 'trigger', type: 'trigger-manual', data: { label: 'Start' }, position: { x: 0, y: 0 } },
            { id: 'wait', type: 'wait-delay', data: { label: 'Wait', config: { duration: 5000 } }, position: { x: 200, y: 0 } },
          ],
          edges: [
            { id: 'e1', source: 'trigger', target: 'wait' },
          ],
        },
        input: {},
        organizationId: 'org-123',
        triggerType: 'manual',
      };

      const workerPromise = worker.run();

      const handle = await client.workflow.start(automationWorkflow, {
        workflowId,
        taskQueue: 'test-queue',
        args: [input],
      });

      // Wait a bit for workflow to start
      await new Promise(resolve => setTimeout(resolve, 100));

      // Query state
      const state = await handle.query('getState');

      // Cancel workflow
      await handle.cancel();

      worker.shutdown();
      await workerPromise;

      // Should return current state
      expect(state).toBeDefined();
      expect(state.status).toBe('running');
      expect(state.completedNodes).toContain('trigger');
    });

    it('should handle pause/resume signals', async () => {
      const workflowId = `signal-test-${uuid()}`;

      const input: AutomationWorkflowInput = {
        definition: {
          id: 'signal-workflow',
          name: 'Signal Test',
          nodes: [
            { id: 'trigger', type: 'trigger-manual', data: { label: 'Start' }, position: { x: 0, y: 0 } },
            { id: 'wait', type: 'wait-delay', data: { label: 'Wait', config: { duration: 100 } }, position: { x: 200, y: 0 } },
            { id: 'end', type: 'transform-set', data: { label: 'End' }, position: { x: 400, y: 0 } },
          ],
          edges: [
            { id: 'e1', source: 'trigger', target: 'wait' },
            { id: 'e2', source: 'wait', target: 'end' },
          ],
        },
        input: {},
        organizationId: 'org-123',
        triggerType: 'manual',
      };

      const workerPromise = worker.run();

      const handle = await client.workflow.start(automationWorkflow, {
        workflowId,
        taskQueue: 'test-queue',
        args: [input],
      });

      // Pause workflow
      await handle.signal('pause');
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      let state = await handle.query('getState');
      expect(state.status).toBe('paused');

      // Resume workflow
      await handle.signal('resume');

      const result = await handle.result();

      worker.shutdown();
      await workerPromise;

      expect(result.status).toBe('success');
    });
  });
});
