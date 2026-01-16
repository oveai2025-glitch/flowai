/**
 * Human Approval Node
 * 
 * Pauses workflow execution and waits for human approval.
 * This is a DIFFERENTIATING FEATURE not found in n8n or Zapier.
 * 
 * Features:
 * - Pause workflow for approval
 * - Multiple approval channels (email, Slack, in-app)
 * - Configurable timeout
 * - Approval with data input
 * - Multi-approver support
 * - Escalation on timeout
 * 
 * @module lib/nodes/workflow/human-approval
 */

import { z } from 'zod';

// ============================================
// Node Definition
// ============================================

export const humanApprovalNodeDefinition = {
  type: 'workflow-human-approval',
  name: 'Human Approval',
  description: 'Pause workflow and wait for human approval',
  category: 'workflow',
  icon: 'user-check',
  color: '#10B981',
  
  inputs: ['main'],
  outputs: ['approved', 'rejected', 'timeout'],
  
  properties: [
    {
      name: 'title',
      displayName: 'Approval Title',
      type: 'string',
      required: true,
      description: 'Title shown to approvers',
      placeholder: 'Approve new user registration',
    },
    {
      name: 'description',
      displayName: 'Description',
      type: 'text',
      description: 'Detailed description of what needs approval',
    },
    {
      name: 'approvers',
      displayName: 'Approvers',
      type: 'collection',
      description: 'Who can approve this request',
      items: [
        {
          name: 'type',
          displayName: 'Type',
          type: 'select',
          options: [
            { value: 'user', label: 'Specific User' },
            { value: 'role', label: 'Role' },
            { value: 'email', label: 'Email Address' },
            { value: 'channel', label: 'Slack/Teams Channel' },
          ],
        },
        {
          name: 'value',
          displayName: 'Value',
          type: 'string',
          description: 'User ID, role name, email, or channel',
        },
      ],
    },
    {
      name: 'approvalType',
      displayName: 'Approval Type',
      type: 'select',
      options: [
        { value: 'single', label: 'Any one approver' },
        { value: 'all', label: 'All approvers' },
        { value: 'majority', label: 'Majority of approvers' },
        { value: 'threshold', label: 'Minimum number' },
      ],
      default: 'single',
    },
    {
      name: 'threshold',
      displayName: 'Minimum Approvers',
      type: 'number',
      default: 1,
      displayOptions: {
        show: { approvalType: ['threshold'] },
      },
    },
    {
      name: 'timeout',
      displayName: 'Timeout',
      type: 'duration',
      default: '7d',
      description: 'How long to wait before timing out',
    },
    {
      name: 'timeoutAction',
      displayName: 'On Timeout',
      type: 'select',
      options: [
        { value: 'reject', label: 'Auto-reject' },
        { value: 'approve', label: 'Auto-approve' },
        { value: 'escalate', label: 'Escalate to manager' },
        { value: 'notify', label: 'Send reminder and extend' },
      ],
      default: 'reject',
    },
    {
      name: 'notificationChannels',
      displayName: 'Notification Channels',
      type: 'multiselect',
      options: [
        { value: 'email', label: 'Email' },
        { value: 'slack', label: 'Slack' },
        { value: 'teams', label: 'Microsoft Teams' },
        { value: 'inapp', label: 'In-App Notification' },
        { value: 'webhook', label: 'Custom Webhook' },
      ],
      default: ['email', 'inapp'],
    },
    {
      name: 'requireComment',
      displayName: 'Require Comment',
      type: 'boolean',
      default: false,
      description: 'Require approver to provide a comment',
    },
    {
      name: 'formFields',
      displayName: 'Additional Form Fields',
      type: 'collection',
      description: 'Extra data to collect from approver',
      items: [
        {
          name: 'key',
          displayName: 'Field Name',
          type: 'string',
        },
        {
          name: 'label',
          displayName: 'Label',
          type: 'string',
        },
        {
          name: 'type',
          displayName: 'Type',
          type: 'select',
          options: [
            { value: 'text', label: 'Text' },
            { value: 'number', label: 'Number' },
            { value: 'select', label: 'Dropdown' },
            { value: 'date', label: 'Date' },
          ],
        },
        {
          name: 'required',
          displayName: 'Required',
          type: 'boolean',
        },
      ],
    },
    {
      name: 'dataToShow',
      displayName: 'Data to Display',
      type: 'expression',
      description: 'Data to show to approvers for context',
    },
  ],
};

// ============================================
// Schemas
// ============================================

export const approverSchema = z.object({
  type: z.enum(['user', 'role', 'email', 'channel']),
  value: z.string(),
});

export const formFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(['text', 'number', 'select', 'date']),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(), // For select type
});

export const humanApprovalInputSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  approvers: z.array(approverSchema).min(1),
  approvalType: z.enum(['single', 'all', 'majority', 'threshold']).default('single'),
  threshold: z.number().optional(),
  timeout: z.string().default('7d'),
  timeoutAction: z.enum(['reject', 'approve', 'escalate', 'notify']).default('reject'),
  notificationChannels: z.array(z.enum(['email', 'slack', 'teams', 'inapp', 'webhook'])).default(['email', 'inapp']),
  requireComment: z.boolean().default(false),
  formFields: z.array(formFieldSchema).optional(),
  dataToShow: z.unknown().optional(),
});

export const approvalResponseSchema = z.object({
  approver: z.object({
    id: z.string(),
    email: z.string().optional(),
    name: z.string().optional(),
  }),
  decision: z.enum(['approved', 'rejected']),
  comment: z.string().optional(),
  formData: z.record(z.unknown()).optional(),
  timestamp: z.string(),
});

export const humanApprovalOutputSchema = z.object({
  status: z.enum(['approved', 'rejected', 'timeout']),
  responses: z.array(approvalResponseSchema),
  finalDecision: z.object({
    decision: z.enum(['approved', 'rejected', 'timeout']),
    reason: z.string(),
    timestamp: z.string(),
  }),
  originalData: z.unknown(),
});

// ============================================
// Approval Request Model
// ============================================

export interface ApprovalRequest {
  id: string;
  workflowId: string;
  runId: string;
  nodeId: string;
  
  // Request details
  title: string;
  description?: string;
  dataToShow?: unknown;
  formFields?: z.infer<typeof formFieldSchema>[];
  
  // Approvers
  approvers: z.infer<typeof approverSchema>[];
  approvalType: 'single' | 'all' | 'majority' | 'threshold';
  threshold?: number;
  
  // Status
  status: 'pending' | 'approved' | 'rejected' | 'timeout';
  responses: z.infer<typeof approvalResponseSchema>[];
  
  // Timing
  createdAt: Date;
  expiresAt: Date;
  resolvedAt?: Date;
  
  // Organization
  organizationId: string;
}

// ============================================
// Approval Logic
// ============================================

export function checkApprovalComplete(
  request: ApprovalRequest
): { complete: boolean; decision?: 'approved' | 'rejected'; reason?: string } {
  const { approvalType, threshold, approvers, responses } = request;
  
  const approvals = responses.filter(r => r.decision === 'approved').length;
  const rejections = responses.filter(r => r.decision === 'rejected').length;
  const totalResponses = responses.length;
  const totalApprovers = approvers.length;

  switch (approvalType) {
    case 'single':
      // Any one approval is enough
      if (approvals >= 1) {
        return { complete: true, decision: 'approved', reason: 'Single approver approved' };
      }
      // Any rejection completes (optional: could wait for all)
      if (rejections >= 1) {
        return { complete: true, decision: 'rejected', reason: 'Approver rejected' };
      }
      break;

    case 'all':
      // All must approve
      if (approvals === totalApprovers) {
        return { complete: true, decision: 'approved', reason: 'All approvers approved' };
      }
      // Any rejection means rejected
      if (rejections >= 1) {
        return { complete: true, decision: 'rejected', reason: 'One or more approvers rejected' };
      }
      break;

    case 'majority':
      const majorityNeeded = Math.ceil(totalApprovers / 2);
      if (approvals >= majorityNeeded) {
        return { complete: true, decision: 'approved', reason: `Majority approved (${approvals}/${totalApprovers})` };
      }
      if (rejections > totalApprovers - majorityNeeded) {
        return { complete: true, decision: 'rejected', reason: `Majority rejected (${rejections}/${totalApprovers})` };
      }
      break;

    case 'threshold':
      const minRequired = threshold || 1;
      if (approvals >= minRequired) {
        return { complete: true, decision: 'approved', reason: `Threshold met (${approvals}/${minRequired})` };
      }
      // Check if threshold is still possible
      const potentialApprovals = approvals + (totalApprovers - totalResponses);
      if (potentialApprovals < minRequired) {
        return { complete: true, decision: 'rejected', reason: 'Cannot reach approval threshold' };
      }
      break;
  }

  return { complete: false };
}

// ============================================
// Notification Templates
// ============================================

export function generateApprovalEmail(request: ApprovalRequest): {
  subject: string;
  html: string;
  text: string;
} {
  const approvalUrl = `${process.env.APP_URL}/approvals/${request.id}`;
  
  return {
    subject: `[Action Required] ${request.title}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937;">${request.title}</h2>
        ${request.description ? `<p style="color: #6b7280;">${request.description}</p>` : ''}
        
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0; color: #374151;">
            <strong>Workflow:</strong> ${request.workflowId}<br>
            <strong>Expires:</strong> ${request.expiresAt.toLocaleDateString()}
          </p>
        </div>
        
        <div style="margin: 24px 0;">
          <a href="${approvalUrl}?action=approve" 
             style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-right: 8px;">
            Approve
          </a>
          <a href="${approvalUrl}?action=reject" 
             style="background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Reject
          </a>
        </div>
        
        <p style="color: #9ca3af; font-size: 12px;">
          Or view details at: <a href="${approvalUrl}">${approvalUrl}</a>
        </p>
      </div>
    `,
    text: `
${request.title}

${request.description || ''}

Workflow: ${request.workflowId}
Expires: ${request.expiresAt.toLocaleDateString()}

Approve: ${approvalUrl}?action=approve
Reject: ${approvalUrl}?action=reject

View details: ${approvalUrl}
    `.trim(),
  };
}

export function generateSlackMessage(request: ApprovalRequest): {
  text: string;
  blocks: unknown[];
} {
  const approvalUrl = `${process.env.APP_URL}/approvals/${request.id}`;
  
  return {
    text: `[Approval Required] ${request.title}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `🔔 ${request.title}`,
        },
      },
      ...(request.description ? [{
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: request.description,
        },
      }] : []),
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Workflow:*\n${request.workflowId}`,
          },
          {
            type: 'mrkdwn',
            text: `*Expires:*\n${request.expiresAt.toLocaleDateString()}`,
          },
        ],
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '✅ Approve',
            },
            style: 'primary',
            action_id: `approve_${request.id}`,
            url: `${approvalUrl}?action=approve`,
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '❌ Reject',
            },
            style: 'danger',
            action_id: `reject_${request.id}`,
            url: `${approvalUrl}?action=reject`,
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Details',
            },
            action_id: `view_${request.id}`,
            url: approvalUrl,
          },
        ],
      },
    ],
  };
}

// ============================================
// Temporal Integration
// ============================================

/**
 * Execute human approval node in Temporal workflow
 * Uses signals to receive approval responses
 */
export interface HumanApprovalSignal {
  nodeId: string;
  approverId: string;
  decision: 'approved' | 'rejected';
  comment?: string;
  formData?: Record<string, unknown>;
}

export async function executeHumanApprovalNode(
  config: z.infer<typeof humanApprovalInputSchema>,
  nodeId: string,
  inputData: unknown,
  context: {
    workflowId: string;
    runId: string;
    organizationId: string;
    waitForSignal: (
      signalName: string,
      timeout: string
    ) => Promise<HumanApprovalSignal | null>;
    sendNotification: (
      channel: string,
      approver: z.infer<typeof approverSchema>,
      content: { email?: unknown; slack?: unknown }
    ) => Promise<void>;
  }
): Promise<z.infer<typeof humanApprovalOutputSchema>> {
  // Create approval request
  const request: ApprovalRequest = {
    id: `approval-${nodeId}-${Date.now()}`,
    workflowId: context.workflowId,
    runId: context.runId,
    nodeId,
    title: config.title,
    description: config.description,
    dataToShow: config.dataToShow || inputData,
    formFields: config.formFields,
    approvers: config.approvers,
    approvalType: config.approvalType,
    threshold: config.threshold,
    status: 'pending',
    responses: [],
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + parseDuration(config.timeout)),
    organizationId: context.organizationId,
  };

  // Send notifications
  for (const channel of config.notificationChannels) {
    for (const approver of config.approvers) {
      await context.sendNotification(channel, approver, {
        email: generateApprovalEmail(request),
        slack: generateSlackMessage(request),
      });
    }
  }

  // Wait for approvals
  const responses: z.infer<typeof approvalResponseSchema>[] = [];
  
  while (true) {
    // Wait for signal or timeout
    const signal = await context.waitForSignal('humanApproval', config.timeout);
    
    if (!signal) {
      // Timeout occurred
      return {
        status: 'timeout',
        responses,
        finalDecision: {
          decision: 'timeout',
          reason: `Approval timed out after ${config.timeout}`,
          timestamp: new Date().toISOString(),
        },
        originalData: inputData,
      };
    }

    // Record response
    responses.push({
      approver: { id: signal.approverId },
      decision: signal.decision,
      comment: signal.comment,
      formData: signal.formData,
      timestamp: new Date().toISOString(),
    });

    // Check if approval is complete
    const check = checkApprovalComplete({
      ...request,
      responses,
    });

    if (check.complete && check.decision) {
      return {
        status: check.decision,
        responses,
        finalDecision: {
          decision: check.decision,
          reason: check.reason || '',
          timestamp: new Date().toISOString(),
        },
        originalData: inputData,
      };
    }
  }
}

// ============================================
// Utilities
// ============================================

function parseDuration(duration: string): number {
  const units: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
  };

  const match = duration.match(/^(\d+)([smhdw])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // Default 7 days

  return parseInt(match[1], 10) * units[match[2]];
}

export default {
  definition: humanApprovalNodeDefinition,
  inputSchema: humanApprovalInputSchema,
  outputSchema: humanApprovalOutputSchema,
  execute: executeHumanApprovalNode,
};
