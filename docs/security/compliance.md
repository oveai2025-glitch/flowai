# Security and Compliance Guide

## 1. Introduction

FlowAtGenAI is built with security as a first-class citizen. As a platform that orchestrates sensitive business data and manages third-party credentials, we adhere to stringent security standards and compliance frameworks to ensure the confidentiality, integrity, and availability of our users' data.

This document outlines our security architecture, data handling policies, and compliance roadmap.

---

## 2. Infrastructure Security

### 2.1 Multi-tenancy Isolation
- **Data Partitioning**: All database records are strictly partitioned by `OrganizationId`. Row Level Security (RLS) policies or application-level middleware ensure that a tenant can never access another tenant's data.
- **Resource Quotas**: To prevent "noisy neighbor" effects, we enforce rate limits and resource quotas (CPU, Memory) at the organization level.
- **Worker Isolation**: Temporal workers are scaled in isolated pods. In enterprise setups, dedicated worker pools can be assigned to specific high-security organizations.

### 2.2 Network Security
- **TLS Everywhere**: All data in transit is encrypted using TLS 1.2 or higher.
- **Virtual Private Cloud (VPC)**: Backing services (Postgres, Redis, Temporal) are located in private subnets with no direct internet access.
- **WAF Protection**: Our API Gateways are protected by Web Application Firewalls to mitigate DDoS attacks and SQL injection attempts.

---

## 3. Data Protection

### 3.1 Encryption at Rest
All persistent data stored in PostgreSQL and Redis is encrypted at rest using industry-standard AES-256 encryption.

### 3.2 The Credential Vault
Credentials for third-party integrations (Connectors) receive special treatment:
1.  **AES-256-CBC Encryption**: Every secret is encrypted with a unique IV before hits the database.
2.  **Master Key Management**: The encryption key is managed via a secure environment variable or a cloud-native KMS (Key Management Service).
3.  **No Plaintext Leaks**: Secrets are only decrypted in memory on the Activity Worker just before a request is made. They are never returned to the frontend.

---

## 4. Identity and Access Management (IAM)

### 4.1 Authentication
- **Strong Hashing**: User passwords (if used) are hashed with Argon2 or bcrypt.
- **MFA Support**: Multi-Factor Authentication is recommended for all administrative accounts.
- **SSO Integration**: SAML and OIDC integrations are available for enterprise customers.

### 4.2 Role-Based Access Control (RBAC)
We support the following roles:
- **Owner**: Full access to organization, billing, and all workflows.
- **Admin**: Can manage members and workflows but cannot delete the organization.
- **Editor**: Can create and modify workflows and credentials.
- **Viewer**: Read-only access to execution logs and dashboards.

---

## 5. Audit Logging and Compliance

### 5.1 Audit Logs
The platform maintains an immutable audit log of all critical actions, including:
- Workflow creation/deletion.
- Credential access/modification.
- User login/logout.
- Policy changes.

### 5.2 Regulatory Compliance Roadmap
- **GDPR**: We provide Data Processing Agreements (DPA) and support the "Right to be Forgotten" via automated data purging.
- **SOC2 Type II**: We are currently building controls and gathering evidence for SOC2 certification.
- **HIPAA**: In dedicated private cloud deployments, we can sign Business Associate Agreements (BAA).

---

## 6. Secure Development Lifecycle (SDLC)

### 6.1 Code Review
All code changes must undergo peer review with a focus on:
- Input validation (anti-XSS and anti-Injection).
- Proper use of authorized scopes.
- Secret exposure prevention.

### 6.2 Vulnerability Scanning
- **Static Analysis (SAST)**: Automated tools scan our codebase for common patterns that lead to vulnerabilities.
- **Dependency Scanning**: We monitor for known CVEs in our npm packages and update them immediately.

---

## 7. Incident Response

In the event of a security incident:
1.  **Containment**: Compromised tokens or keys are immediately revoked.
2.  **Notification**: Affected users are notified within the timeframe required by local laws (e.g., 72 hours for GDPR).
3.  **Remediation**: Post-mortem analysis is performed to prevent recurrence.

---

## 8. Responsible Disclosure

We welcome security researchers. If you find a vulnerability, please contact our security team at `security@flowatgenai.com` before disclosing it publicly.

---

### Change Log
- v1.0.0: Initial Security and Compliance Document.
- v1.1.0: Expanded RBAC and Audit Logging sections.
