# WFAIB 90-Day Implementation Plan

**Goal:** Build enterprise-grade workflow automation platform competing with n8n/Zapier  
**Start Date:** December 27, 2024  
**Target Completion:** March 27, 2025

---

## Milestone Overview

| # | Milestone | Days | Priority | Dependencies |
|---|-----------|------|----------|--------------|
| A | Enterprise Execution Engine (Temporal) | 7 | 🔴 P0 | None |
| B | Secure Code Sandbox (isolated-vm) | 5 | 🔴 P0 | None |
| C | Connector SDK & Plugin Architecture | 7 | 🔴 P0 | A |
| D | 50 Core Connectors | 14 | 🔴 P0 | C |
| E | Advanced Workflow Primitives | 7 | 🟠 P1 | A |
| F | Multi-Tenancy & RLS | 5 | 🟠 P1 | A |
| G | Enterprise Auth (SSO/SAML/RBAC) | 7 | 🟠 P1 | F |
| H | Visual Editor Enhancements | 10 | 🟠 P1 | E |
| I | Observability & Monitoring | 5 | 🟡 P2 | A |
| J | AI Agent Framework | 10 | 🟡 P2 | C |
| K | Version Control & Environments | 5 | 🟡 P2 | F |
| L | Production Infrastructure | 8 | 🟠 P1 | All |

**Total: 90 days**

---

## Milestone A: Enterprise Execution Engine (Temporal)

**Branch:** `feat/temporal-execution`  
**Duration:** 7 days  
**Priority:** 🔴 P0 - CRITICAL

### Objectives
Replace BullMQ-based execution with Temporal.io for durable, resumable, production-grade workflow orchestration.

### Deliverables

| File | Type | Description |
|------|------|-------------|
| `lib/temporal/client.ts` | NEW | Temporal client singleton |
| `lib/temporal/connection.ts` | NEW | Connection management |
| `worker/temporal/worker.ts` | NEW | Temporal worker process |
| `worker/temporal/workflows/automation.ts` | NEW | Generic automation workflow |
| `worker/temporal/activities/node-executor.ts` | NEW | Node execution activity |
| `worker/temporal/activities/connector.ts` | NEW | Connector call activity |
| `app/api/runs/route.ts` | MODIFY | Use Temporal to start workflows |
| `app/api/runs/[id]/route.ts` | MODIFY | Query Temporal for status |
| `prisma/schema.prisma` | MODIFY | Add execution event tables |
| `docker-compose.yml` | MODIFY | Add Temporal dev server |
| `infra/helm/temporal/` | NEW | Temporal Helm chart values |

### Tests

| Test File | Coverage |
|-----------|----------|
| `tests/unit/temporal-client.test.ts` | Client connection, error handling |
| `tests/unit/workflow-execution.test.ts` | Workflow start, signal, query |
| `tests/integration/execution-durability.test.ts` | Crash recovery, replay |
| `tests/integration/worker-restart.test.ts` | Mid-run worker restart |

### Acceptance Criteria
- [ ] `docker-compose up` boots Temporal dev server
- [ ] POST `/api/runs` creates Temporal workflow
- [ ] GET `/api/runs/:id` returns workflow status from Temporal
- [ ] Worker crash mid-execution → workflow resumes after restart
- [ ] Execution history queryable via Temporal UI
- [ ] All tests pass with >80% coverage

### Architecture Decision Record
- **Decision:** Use Temporal over BullMQ
- **Rationale:** Durable execution, event sourcing, saga support
- **Trade-off:** Higher infra complexity, justified by reliability

---

## Milestone B: Secure Code Sandbox

**Branch:** `feat/isolated-sandbox`  
**Duration:** 5 days  
**Priority:** 🔴 P0 - CRITICAL

### Objectives
Replace pattern-based sandbox with true V8 isolate-based execution using `isolated-vm`.

### Deliverables

| File | Type | Description |
|------|------|-------------|
| `sandbox/isolate-pool.ts` | NEW | Pool of pre-warmed isolates |
| `sandbox/isolate-runner.ts` | NEW | Execute code in isolate |
| `sandbox/context-builder.ts` | NEW | Build safe execution context |
| `sandbox/permissions.ts` | NEW | Permission system |
| `sandbox/resource-limits.ts` | NEW | CPU/memory enforcement |
| `worker/task-runner/` | NEW | Separate process for untrusted code |
| `sandbox/runner.ts` | REWRITE | Use isolate-runner |

### Tests

| Test File | Coverage |
|-----------|----------|
| `tests/unit/isolate-security.test.ts` | Escape attempts, resource limits |
| `tests/unit/context-isolation.test.ts` | Global pollution prevention |
| `tests/integration/sandbox-attacks.test.ts` | Known attack vectors |

### Acceptance Criteria
- [ ] Code runs in separate V8 isolate
- [ ] Memory limit enforced (configurable, default 128MB)
- [ ] CPU timeout enforced (configurable, default 5s)
- [ ] No access to Node.js APIs (require, process, etc.)
- [ ] Prototype pollution attacks blocked
- [ ] All security tests pass

---

## Milestone C: Connector SDK & Plugin Architecture

**Branch:** `feat/connector-sdk`  
**Duration:** 7 days  
**Priority:** 🔴 P0 - CRITICAL

### Objectives
Build extensible connector architecture supporting both declarative and programmatic connectors.

### Deliverables

| File | Type | Description |
|------|------|-------------|
| `packages/connector-sdk/` | NEW | NPM package for connector development |
| `packages/connector-sdk/src/types.ts` | NEW | Core type definitions |
| `packages/connector-sdk/src/base.ts` | NEW | Base connector class |
| `packages/connector-sdk/src/auth/oauth2.ts` | NEW | OAuth2 flow handler |
| `packages/connector-sdk/src/auth/api-key.ts` | NEW | API key handler |
| `packages/connector-sdk/src/testing.ts` | NEW | Connector test utilities |
| `lib/connector-registry.ts` | NEW | Dynamic connector loading |
| `lib/connector-loader.ts` | NEW | Hot-reload support |
| `lib/oauth-manager.ts` | NEW | Centralized OAuth handling |
| `app/api/connectors/` | NEW | Connector management API |
| `app/api/oauth/callback/` | NEW | OAuth callback handler |

### SDK Interface
```typescript
// Declarative connector example
export const slackConnector: ConnectorDefinition = {
  id: 'slack',
  name: 'Slack',
  version: '1.0.0',
  auth: { type: 'oauth2', scopes: ['chat:write'] },
  actions: {
    sendMessage: {
      inputs: z.object({ channel: z.string(), text: z.string() }),
      outputs: z.object({ ts: z.string() }),
      execute: async (input, context) => { /* ... */ }
    }
  }
};
```

### Acceptance Criteria
- [ ] SDK package publishable to npm
- [ ] Connectors load dynamically at runtime
- [ ] OAuth2 flows work end-to-end
- [ ] Connector versioning supported
- [ ] Documentation generated from types

---

## Milestone D: 50 Core Connectors

**Branch:** `feat/core-connectors`  
**Duration:** 14 days  
**Priority:** 🔴 P0 - CRITICAL

### Connector Categories & Targets

| Category | Connectors | Count |
|----------|------------|-------|
| Communication | Slack, Discord, Microsoft Teams, Telegram, Twilio SMS, Email SMTP, SendGrid, Mailchimp | 8 |
| CRM | Salesforce, HubSpot, Pipedrive, Zoho CRM | 4 |
| Database | PostgreSQL, MySQL, MongoDB, Redis, Supabase, Firebase | 6 |
| Storage | AWS S3, Google Cloud Storage, Dropbox, Google Drive, OneDrive | 5 |
| Project Management | Jira, Asana, Trello, Linear, Monday.com, Notion | 6 |
| Payments | Stripe, PayPal, Square | 3 |
| Analytics | Google Analytics, Mixpanel, Segment | 3 |
| Developer | GitHub, GitLab, Bitbucket, Webhook, HTTP/REST | 5 |
| Forms | Typeform, Google Forms, Airtable | 3 |
| AI/ML | OpenAI, Anthropic, Google AI, Replicate, Hugging Face | 5 |
| E-commerce | Shopify, WooCommerce | 2 |

**Total: 50 connectors**

### Acceptance Criteria
- [ ] All 50 connectors implemented using SDK
- [ ] Each connector has minimum 3 actions
- [ ] OAuth connectors have full auth flow
- [ ] Each connector has integration test
- [ ] Documentation for each connector

---

## Milestone E: Advanced Workflow Primitives

**Branch:** `feat/workflow-primitives`  
**Duration:** 7 days  
**Priority:** 🟠 P1 - HIGH

### Deliverables

| Primitive | Files | Description |
|-----------|-------|-------------|
| Branching (If/Else) | `lib/nodes/logic/branch.ts` | Conditional paths |
| Switch/Router | `lib/nodes/logic/switch.ts` | Multi-path routing |
| Loop/Iterator | `lib/nodes/logic/loop.ts` | Array iteration |
| Merge | `lib/nodes/logic/merge.ts` | Combine branches |
| Aggregate | `lib/nodes/logic/aggregate.ts` | Collect items |
| Parallel | `lib/nodes/logic/parallel.ts` | Concurrent execution |
| Wait/Delay | `lib/nodes/timing/wait.ts` | Timed delays |
| Schedule | `lib/nodes/timing/schedule.ts` | Wait until time |
| Sub-workflow | `lib/nodes/workflow/sub.ts` | Nested workflows |
| Human Task | `lib/nodes/workflow/human-task.ts` | Approval nodes |
| Error Handler | `lib/nodes/error/handler.ts` | Try/Catch/Finally |
| Retry | `lib/nodes/error/retry.ts` | Configurable retry |

### Acceptance Criteria
- [ ] All primitives integrate with Temporal
- [ ] Visual editor supports all node types
- [ ] Parallel execution tested for race conditions
- [ ] Human task sends notifications
- [ ] Error handlers support all 5 strategies

---

## Milestone F: Multi-Tenancy & Row-Level Security

**Branch:** `feat/multi-tenancy`  
**Duration:** 5 days  
**Priority:** 🟠 P1 - HIGH

### Deliverables

| File | Type | Description |
|------|------|-------------|
| `prisma/migrations/rls.sql` | NEW | PostgreSQL RLS policies |
| `lib/tenant-context.ts` | NEW | Request-scoped tenant |
| `lib/db-tenant.ts` | NEW | RLS-aware Prisma client |
| `lib/encryption/tenant-keys.ts` | NEW | Per-tenant key derivation |
| `worker/tenant-queue.ts` | NEW | Tenant-aware queue routing |
| `middleware/tenant.ts` | NEW | Tenant resolution middleware |

### RLS Implementation
```sql
-- Enable RLS on all tenant tables
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY tenant_isolation ON workflows
  USING (organization_id = current_setting('app.current_tenant')::uuid);

-- Set tenant context per request
SET app.current_tenant = 'org-id-here';
```

### Acceptance Criteria
- [ ] RLS enabled on all tenant tables
- [ ] Cross-tenant data access impossible
- [ ] Per-tenant credential encryption
- [ ] Premium tenants get dedicated workers
- [ ] Tenant quotas enforced at runtime

---

## Milestone G: Enterprise Auth (SSO/SAML/RBAC)

**Branch:** `feat/enterprise-auth`  
**Duration:** 7 days  
**Priority:** 🟠 P1 - HIGH

### Deliverables

| File | Type | Description |
|------|------|-------------|
| `lib/auth/saml/provider.ts` | NEW | SAML 2.0 IdP integration |
| `lib/auth/saml/metadata.ts` | NEW | SP metadata generation |
| `lib/auth/oidc/provider.ts` | NEW | OIDC/OAuth2 IdP |
| `lib/auth/rbac/permissions.ts` | NEW | Permission definitions |
| `lib/auth/rbac/policy.ts` | NEW | Policy evaluation engine |
| `lib/auth/api-keys/` | NEW | Scoped API key system |
| `app/api/auth/saml/` | NEW | SAML endpoints (metadata, acs, slo) |
| `app/api/auth/oidc/` | NEW | OIDC endpoints |
| `prisma/schema.prisma` | MODIFY | Add RBAC tables |

### RBAC Model
```typescript
// Granular permissions
const permissions = [
  'workflow:create', 'workflow:read', 'workflow:update', 'workflow:delete', 'workflow:execute',
  'run:read', 'run:cancel', 'run:replay',
  'connector:create', 'connector:read', 'connector:update', 'connector:delete',
  'credential:create', 'credential:read', 'credential:use',
  'team:manage', 'billing:manage', 'audit:read'
];

// Role → Permission mapping (configurable)
const roles = {
  viewer: ['workflow:read', 'run:read'],
  member: ['workflow:*', 'run:*', 'connector:read', 'credential:use'],
  admin: ['*', '-billing:manage'],
  owner: ['*']
};
```

### Acceptance Criteria
- [ ] SAML SSO with Okta, Azure AD, OneLogin tested
- [ ] OIDC with Google, Auth0 tested
- [ ] Custom roles creatable
- [ ] API keys scoped to specific permissions
- [ ] All auth flows have audit trails

---

## Milestone H: Visual Editor Enhancements

**Branch:** `feat/editor-v2`  
**Duration:** 10 days  
**Priority:** 🟠 P1 - HIGH

### Deliverables

| Component | Files | Description |
|-----------|-------|-------------|
| Expression Editor | `components/editor/ExpressionEditor.tsx` | Monaco with autocomplete |
| Data Mapper | `components/editor/DataMapper.tsx` | Visual field mapping |
| Schema Inspector | `components/editor/SchemaInspector.tsx` | Output schema viewer |
| Debug Panel | `components/editor/DebugPanel.tsx` | Step-through debugging |
| Test Runner | `components/editor/TestRunner.tsx` | Execute with test data |
| Node Search | `components/editor/NodeSearch.tsx` | Command palette |
| Mini Map | `components/editor/MiniMap.tsx` | Workflow overview |
| Keyboard Shortcuts | `lib/editor/shortcuts.ts` | Vim-like bindings |

### Expression Language
```javascript
// JSONata-compatible expressions
{{ $input.data.user.name }}
{{ $node["HTTP Request"].output.body }}
{{ $env.API_KEY }}
{{ $now.format("YYYY-MM-DD") }}
{{ $items.filter(x => x.active).length }}
```

### Acceptance Criteria
- [ ] Expression autocomplete with schema awareness
- [ ] Drag-drop field mapping
- [ ] Breakpoints in workflow
- [ ] Step execution with state inspection
- [ ] Keyboard-navigable (no mouse required)

---

## Milestone I: Observability & Monitoring

**Branch:** `feat/observability`  
**Duration:** 5 days  
**Priority:** 🟡 P2 - MEDIUM

### Deliverables

| File | Type | Description |
|------|------|-------------|
| `lib/telemetry/otel.ts` | NEW | OpenTelemetry setup |
| `lib/telemetry/tracing.ts` | NEW | Distributed tracing |
| `lib/telemetry/metrics.ts` | ENHANCE | Additional metrics |
| `lib/alerting/rules.ts` | NEW | Alert rule engine |
| `lib/alerting/channels.ts` | NEW | Notification channels |
| `app/api/metrics/` | ENHANCE | Metrics API |
| `infra/grafana/` | NEW | Dashboard templates |

### Key Metrics
- `wfaib_workflow_execution_duration_seconds` (histogram)
- `wfaib_node_execution_duration_seconds` (histogram by node type)
- `wfaib_queue_depth` (gauge by tenant)
- `wfaib_connector_requests_total` (counter by connector, status)
- `wfaib_llm_tokens_total` (counter by provider, model)

### Acceptance Criteria
- [ ] All requests have trace IDs
- [ ] Grafana dashboards for key metrics
- [ ] Alert on: high error rate, queue backup, slow execution
- [ ] Logs correlate with traces
- [ ] Export to Datadog/New Relic optional

---

## Milestone J: AI Agent Framework

**Branch:** `feat/ai-agents`  
**Duration:** 10 days  
**Priority:** 🟡 P2 - MEDIUM

### Deliverables

| File | Type | Description |
|------|------|-------------|
| `lib/ai/agent/core.ts` | NEW | Agent execution loop |
| `lib/ai/agent/tools.ts` | NEW | Tool definition & invocation |
| `lib/ai/agent/memory.ts` | NEW | Conversation memory |
| `lib/ai/agent/planner.ts` | NEW | Task planning |
| `lib/nodes/ai/agent.ts` | NEW | Agent workflow node |
| `lib/nodes/ai/tool-use.ts` | NEW | Tool execution node |
| `lib/ai/embeddings/` | NEW | Vector embedding support |
| `lib/ai/rag/` | NEW | RAG pipeline |

### Agent Architecture
```typescript
// Connectors exposed as tools
const slackTool = {
  name: 'send_slack_message',
  description: 'Send a message to a Slack channel',
  parameters: z.object({
    channel: z.string(),
    message: z.string()
  }),
  execute: async (params) => slackConnector.sendMessage(params)
};

// Agent loop
while (!done) {
  const action = await llm.decide(context, tools);
  if (action.type === 'tool_use') {
    const result = await executeTool(action);
    context.addObservation(result);
  } else {
    done = true;
  }
}
```

### Acceptance Criteria
- [ ] Agents can use any connector as tool
- [ ] Multi-turn conversations with memory
- [ ] Human-in-the-loop approval gates
- [ ] Token usage tracked per agent
- [ ] RAG with Pinecone/Weaviate

---

## Milestone K: Version Control & Environments

**Branch:** `feat/versioning`  
**Duration:** 5 days  
**Priority:** 🟡 P2 - MEDIUM

### Deliverables

| File | Type | Description |
|------|------|-------------|
| `lib/versioning/git-like.ts` | NEW | Version storage |
| `lib/versioning/diff.ts` | NEW | Workflow diff |
| `lib/versioning/merge.ts` | NEW | Conflict resolution |
| `lib/environments/` | NEW | Environment management |
| `app/api/workflows/[id]/versions/` | NEW | Version API |
| `components/editor/VersionHistory.tsx` | NEW | Version browser |
| `components/editor/DiffViewer.tsx` | NEW | Visual diff |

### Acceptance Criteria
- [ ] Every save creates version
- [ ] Visual diff between versions
- [ ] One-click rollback
- [ ] Dev/Staging/Prod environments
- [ ] Promote between environments

---

## Milestone L: Production Infrastructure

**Branch:** `feat/prod-infra`  
**Duration:** 8 days  
**Priority:** 🟠 P1 - HIGH

### Deliverables

| File | Type | Description |
|------|------|-------------|
| `infra/terraform/aws/` | ENHANCE | Production AWS setup |
| `infra/terraform/gcp/` | NEW | GCP alternative |
| `infra/helm/wfaib/` | ENHANCE | Production values |
| `infra/helm/temporal/` | NEW | Temporal cluster |
| `infra/k8s/` | ENHANCE | Network policies, PDBs |
| `.github/workflows/deploy.yml` | NEW | Production deployment |
| `scripts/disaster-recovery.sh` | NEW | DR procedures |
| `docs/runbooks/` | NEW | Operational runbooks |

### Infrastructure Targets
- Auto-scaling: 3-50 app pods, 2-20 workers
- Database: RDS Multi-AZ with read replicas
- Redis: ElastiCache cluster mode
- Temporal: 3-node cluster with Cassandra/PostgreSQL
- CDN: CloudFront for static assets
- WAF: Rate limiting, SQL injection protection

### Acceptance Criteria
- [ ] Zero-downtime deployments
- [ ] Auto-scaling based on queue depth
- [ ] Multi-region failover tested
- [ ] RTO < 1 hour, RPO < 5 minutes
- [ ] Cost estimates for 10K/100K/1M runs

---

## Timeline Visualization

```
Week 1-2:   [====A: Temporal====][==B: Sandbox==]
Week 2-3:   [======C: Connector SDK======]
Week 3-5:   [============D: 50 Connectors============]
Week 4-5:   [====E: Primitives====][==F: Multi-Tenant==]
Week 5-6:   [======G: Enterprise Auth======]
Week 6-8:   [========H: Editor V2========]
Week 7-8:   [==I: Observability==][==K: Versioning==]
Week 8-10:  [========J: AI Agents========]
Week 10-12: [======L: Production Infra======]
```

---

## Cost Estimates (AWS, US-East-1)

### 10,000 runs/month (Starter)
| Resource | Spec | Monthly Cost |
|----------|------|--------------|
| EKS Cluster | 3x t3.medium | $150 |
| RDS PostgreSQL | db.t3.medium | $60 |
| ElastiCache Redis | cache.t3.micro | $15 |
| Temporal | Included in EKS | - |
| S3 + CloudFront | 10GB | $5 |
| **Total** | | **$230/month** |

### 100,000 runs/month (Pro)
| Resource | Spec | Monthly Cost |
|----------|------|--------------|
| EKS Cluster | 5x t3.large | $400 |
| RDS PostgreSQL | db.r6g.large Multi-AZ | $300 |
| ElastiCache Redis | cache.r6g.large cluster | $200 |
| Temporal | 3-node on EKS | $150 |
| S3 + CloudFront | 100GB | $20 |
| **Total** | | **$1,070/month** |

### 1,000,000 runs/month (Enterprise)
| Resource | Spec | Monthly Cost |
|----------|------|--------------|
| EKS Cluster | 20x c6i.xlarge | $2,400 |
| RDS PostgreSQL | db.r6g.2xlarge Multi-AZ | $900 |
| ElastiCache Redis | cache.r6g.2xlarge cluster | $600 |
| Temporal | 5-node dedicated | $500 |
| S3 + CloudFront | 1TB | $100 |
| **Total** | | **$4,500/month** |

---

## Suggested Pricing

| Plan | Price | Workflows | Runs/month | Connectors | Features |
|------|-------|-----------|------------|------------|----------|
| Free | $0 | 3 | 500 | 10 | Community support |
| Starter | $29 | 10 | 5,000 | 25 | Email support |
| Pro | $99 | 50 | 25,000 | Unlimited | Priority support, SSO |
| Business | $299 | 200 | 100,000 | Unlimited | SAML, Audit, Dedicated |
| Enterprise | Custom | Unlimited | Unlimited | Unlimited | SLA, On-prem, Custom |

---

*Plan authored by Claude Opus 4.5 - Principal Staff Engineer*
