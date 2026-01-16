# FlowAtGenAi 🚀

**World-Class AI-Powered Workflow Automation Platform**

FlowAtGenAi is an enterprise-grade workflow automation platform designed to compete with and exceed n8n, Zapier, and Make.com. Built with modern technologies and AI-first architecture.

![FlowAtGenAi](https://cdn.flowatgenai.com/banner.png)

## ✨ Features

### 🎯 Core Capabilities
- **Visual Workflow Editor** - Drag-and-drop interface with ReactFlow
- **50+ Built-in Connectors** - Slack, OpenAI, HubSpot, Stripe, PostgreSQL, and more
- **AI-Native Nodes** - GPT-4, Claude, Gemini integration with autonomous agents
- **Durable Execution** - Temporal-powered workflows with crash recovery
- **Human-in-the-Loop** - Approval nodes with multi-channel notifications

### 🔌 Connectors
- **Communication**: Slack, Discord, Twilio, Email
- **CRM**: HubSpot, Salesforce
- **Databases**: PostgreSQL, MongoDB, Airtable
- **E-commerce**: Shopify, Stripe
- **AI/ML**: OpenAI, Anthropic
- **Productivity**: Notion, Jira, Google Sheets
- **Developer**: GitHub, HTTP/REST

### 🤖 AI Features
- **AI Prompt Node** - Generate content with any LLM
- **AI Agent Node** - Autonomous agents with tool use
- **AI Extract** - Structured data extraction
- **AI Summarize** - Intelligent summarization
- **Multi-Provider** - OpenAI, Anthropic, Google support

### 🏢 Enterprise Features
- **Multi-Tenancy** - Organization isolation with RBAC
- **Audit Logging** - Complete activity tracking
- **SSO/SAML** - Enterprise authentication
- **API Access** - Full REST API
- **Webhooks** - Secure webhook endpoints
- **Rate Limiting** - Per-organization limits

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      FlowAtGenAi Platform                     │
├──────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │   Next.js   │  │  ReactFlow  │  │   Zustand Store    │   │
│  │   App UI    │  │   Editor    │  │   State Mgmt       │   │
│  └─────────────┘  └─────────────┘  └─────────────────────┘   │
├──────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │  REST API   │  │  Webhooks   │  │   Connector SDK    │   │
│  │  Routes     │  │  Handler    │  │   Builder API      │   │
│  └─────────────┘  └─────────────┘  └─────────────────────┘   │
├──────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐ │
│  │               Temporal Execution Engine                  │ │
│  │   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐   │ │
│  │   │Workflows│  │Activities│  │ Signals │  │ Queries │   │ │
│  │   └─────────┘  └─────────┘  └─────────┘  └─────────┘   │ │
│  └─────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │  PostgreSQL │  │    Redis    │  │   isolated-vm      │   │
│  │  + Prisma   │  │   Caching   │  │   Sandbox          │   │
│  └─────────────┘  └─────────────┘  └─────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- pnpm (recommended) or npm

### Installation

```bash
# Clone the repository
git clone https://github.com/flowatgenai/flowatgenai.git
cd flowatgenai

# Install dependencies
pnpm install

# Start infrastructure (Postgres, Redis, Temporal)
docker-compose up -d

# Run database migrations
pnpm db:migrate

# Start development server
pnpm dev
```

### Environment Variables

Create a `.env.local` file:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/flowatgenai"

# Redis
REDIS_URL="redis://localhost:6379"

# Temporal
TEMPORAL_ADDRESS="localhost:7233"

# Authentication
JWT_SECRET="your-jwt-secret"
NEXTAUTH_SECRET="your-nextauth-secret"

# Encryption
ENCRYPTION_KEY="your-32-char-encryption-key"

# Optional: AI Providers
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."

# Optional: Stripe Billing
STRIPE_SECRET_KEY="sk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

## 📁 Project Structure

```
flowatgenai/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── workflows/         # Workflow pages
│   ├── executions/        # Execution history
│   ├── templates/         # Template marketplace
│   ├── connectors/        # Connector catalog
│   └── analytics/         # Usage analytics
├── components/            # React components
│   ├── workflow/          # Workflow editor components
│   └── layout/            # Layout components
├── connectors/            # Connector implementations
├── lib/                   # Core libraries
│   ├── ai/               # AI agent framework
│   ├── billing/          # Billing & quotas
│   ├── temporal/         # Temporal client/workflows
│   ├── webhook/          # Webhook handler
│   └── workflow/         # Execution engine
├── packages/
│   └── connector-sdk/    # Connector development SDK
├── prisma/               # Database schema
├── stores/               # Zustand state stores
├── types/                # TypeScript types
└── worker/               # Temporal worker process
```

## 🔧 Development

### Running Tests
```bash
pnpm test              # Run all tests
pnpm test:unit         # Unit tests only
pnpm test:integration  # Integration tests
pnpm test:e2e          # End-to-end tests
```

### Building
```bash
pnpm build             # Production build
pnpm start             # Start production server
```

### Linting
```bash
pnpm lint              # ESLint
pnpm type-check        # TypeScript
```

## 📦 Deployment

### Docker
```bash
docker build -t flowatgenai .
docker run -p 3000:3000 flowatgenai
```

### Kubernetes
```bash
kubectl apply -f k8s/
```

### Helm
```bash
helm install flowatgenai ./helm/flowatgenai
```

## 🛠️ Creating Custom Connectors

Use the Connector SDK to build custom integrations:

```typescript
import { createConnector } from '@flowatgenai/connector-sdk';

export const myConnector = createConnector({
  id: 'my-connector',
  name: 'My Connector',
  version: '1.0.0',
  category: 'custom',
  description: 'My custom connector',
})
  .withApiKey({ location: 'header', name: 'Authorization' })
  .withAction('myAction', {
    name: 'My Action',
    description: 'Does something',
    input: z.object({ data: z.string() }),
    output: z.object({ result: z.string() }),
    execute: async (input, ctx) => {
      const response = await ctx.http.post('/api/action', input);
      return response.data;
    },
  })
  .build();
```

## 📊 Pricing Plans

| Feature | Free | Starter | Pro | Business | Enterprise |
|---------|------|---------|-----|----------|------------|
| Workflows | 5 | 20 | 100 | 500 | Unlimited |
| Runs/month | 500 | 5,000 | 25,000 | 100,000 | Unlimited |
| AI Tokens | 10K | 50K | 250K | 1M | Custom |
| Connectors | 10 | 25 | All | All | Custom |
| Support | Community | Email | Priority | Dedicated | 24/7 |

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md).

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🔗 Links

- [Documentation](https://docs.flowatgenai.com)
- [API Reference](https://api.flowatgenai.com/docs)
- [Community Discord](https://discord.gg/flowatgenai)
- [Twitter](https://twitter.com/flowatgenai)

---

Built with ❤️ by the FlowAtGenAi Team
