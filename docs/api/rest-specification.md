# FlowAtGenAI REST API Specification

## 1. Introduction

The FlowAtGenAI REST API allows for programmatic interaction with the platform's workflow engine, analytics data, and organization management. It is designed to be highly reliable, secure, and easy to integrate with CI/CD pipelines or external monitoring tools.

### 1.1 Base URL
All API requests should be made to:
`https://api.flowatgenai.com/v1`

---

## 2. Authentication

The API uses Scoped API Keys for authentication. Include your key in the `X-API-KEY` header of every request.

```bash
curl -X GET https://api.flowatgenai.com/v1/workflows \
     -H "X-API-KEY: your_api_key_here"
```

---

## 3. Workflow Management

### 3.1 List Workflows
Retrieves a paginated list of workflows for the authenticated organization.

- **URL**: `/workflows`
- **Method**: `GET`
- **Query Params**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 20)
  - `status`: Filter by status (`ACTIVE`, `PAUSED`, `ARCHIVED`)
- **Success Response**: `200 OK`
```json
{
  "data": [
    {
      "id": "wf_123",
      "name": "Customer Onboarding",
      "status": "ACTIVE",
      "created_at": "2026-01-01T12:00:00Z"
    }
  ],
  "meta": { "total": 145, "page": 1 }
}
```

### 3.2 Create Workflow
Creates a new workflow definition.

- **URL**: `/workflows`
- **Method**: `POST`
- **Body**:
```json
{
  "name": "New Automation",
  "description": "Optional description",
  "definition": {
    "nodes": [],
    "edges": []
  }
}
```

### 3.3 Execute Workflow
Triggers an immediate execution of a specific workflow.

- **URL**: `/workflows/{id}/execute`
- **Method**: `POST`
- **Body**:
```json
{
  "input": {
    "user_id": "123",
    "email": "test@example.com"
  },
  "metadata": {
    "source": "api_trigger"
  }
}
```
- **Success Response**: `202 Accepted`
```json
{ "execution_id": "exec_987", "status": "RUNNING" }
```

---

## 4. Analytics & Metrics

### 4.1 Get Dashboard Statistics
Retrieves aggregated KPIs for the organization.

- **URL**: `/analytics/dashboard`
- **Method**: `GET`
- **Success Response**: `200 OK`
```json
{
  "total_executions": 12500,
  "success_rate": 0.992,
  "avg_latency": 145,
  "savings_estimate": 4500
}
```

### 4.2 Query Metrics
Retrieves time-series data for specific metrics.

- **URL**: `/analytics/metrics`
- **Method**: `GET`
- **Query Params**:
  - `type`: `execution_count`, `error_rate`, etc.
  - `interval`: `1h`, `1d`, `1w`
  - `from`: ISO timestamp
- **Success Response**: `200 OK`

---

## 5. Monitoring & Health

### 5.1 System Health
Provides the current operational status of the platform components.

- **URL**: `/monitoring/health`
- **Method**: `GET`
- **Success Response**: `200 OK`
```json
{
  "status": "HEALTHY",
  "components": [
    { "name": "Database", "status": "HEALTHY", "latency": 5 },
    { "name": "Temporal", "status": "HEALTHY", "latency": 12 }
  ]
}
```

---

## 6. Error Handling

The API uses standard HTTP status codes:

| Code | Meaning |
|------|---------|
| 400  | Bad Request - Invalid parameters |
| 401  | Unauthorized - Invalid API Key |
| 403  | Forbidden - Insufficient permissions |
| 404  | Not Found - Resource does not exist |
| 429  | Too Many Requests - Rate limit exceeded |
| 500  | Internal Server Error - Something went wrong |

---

## 7. Rate Limits

- **General API**: 1,000 requests per minute.
- **Trigger Execution**: 500 requests per minute.
- **Analytics Export**: 10 requests per minute.

---

## 8. Webhooks

You can subscribe to events occurring in your organization.

### Supported Events
- `workflow.completed`
- `workflow.failed`
- `credential.expired`
- `alert.triggered`

---

## 9. SDKs and Client Libraries

We provide official SDKs for the following languages:
- **Node.js**: `@flowatgenai/sdk`
- **Python**: `flowatgenai-python`
- **Go**: `github.com/flowatgenai/sdk-go`

---

### Change Log
- v1.0.0: Initial REST API Documentation.
- v1.1.0: Added Analytics endpoints.
- v1.2.0: Added Monitoring and Health metrics.
