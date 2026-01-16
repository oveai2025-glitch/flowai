/**
 * DevOps Connectors
 * 
 * Integrated integration for DevOps and CI/CD tools:
 * - Vercel (Deployments, Projects, Domains, Aliases)
 * - CircleCI (Pipelines, Jobs, Artifacts, Contexts)
 * - Bitbucket (Repositories, Pull Requests, Pipelines)
 * - Jenkins (Jobs, Builds, Nodes)
 * 
 * @module connectors/devops-connectors
 */

import { z } from 'zod';

// ============================================
// Types
// ============================================

interface DevOpsCredentials {
  vercel?: { token: string; teamId?: string };
  circleci?: { token: string };
  bitbucket?: { username: string; appPassword: string };
  jenkins?: { url: string; user: string; apiToken: string };
}

// ============================================
// Vercel Implementation
// ============================================

class VercelClient {
  private baseUrl = 'https://api.vercel.com';

  constructor(private creds: { token: string; teamId?: string }) {}

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.creds.token}`,
      'Content-Type': 'application/json',
    };
  }

  private getUrl(path: string) {
    const url = new URL(`${this.baseUrl}${path}`);
    if (this.creds.teamId) url.searchParams.append('teamId', this.creds.teamId);
    return url.toString();
  }

  async listProjects(): Promise<any[]> {
    const response = await fetch(this.getUrl('/v9/projects'), { headers: this.getHeaders() });
    const data = await response.json();
    return data.projects || [];
  }

  async createDeployment(projectId: string, files: any[]): Promise<any> {
    const response = await fetch(this.getUrl('/v13/deployments'), {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ name: projectId, files, project: projectId }),
    });
    return await response.json();
  }

  async listDeployments(projectId?: string): Promise<any[]> {
    const url = projectId ? this.getUrl(`/v6/deployments?projectId=${projectId}`) : this.getUrl('/v6/deployments');
    const response = await fetch(url, { headers: this.getHeaders() });
    const data = await response.json();
    return data.deployments || [];
  }
}

// ============================================
// CircleCI Implementation
// ============================================

class CircleCIClient {
  private baseUrl = 'https://circleci.com/api/v2';

  constructor(private creds: { token: string }) {}

  private getHeaders() {
    return {
      'Circle-Token': this.creds.token,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
  }

  async listPipelines(projectSlug: string): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/project/${projectSlug}/pipeline`, { headers: this.getHeaders() });
    const data = await response.json();
    return data.items || [];
  }

  async triggerPipeline(projectSlug: string, branch = 'main', parameters: any = {}): Promise<any> {
    const response = await fetch(`${this.baseUrl}/project/${projectSlug}/pipeline`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ branch, parameters }),
    });
    return await response.json();
  }

  async getWorkflowJobs(workflowId: string): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/workflow/${workflowId}/job`, { headers: this.getHeaders() });
    const data = await response.json();
    return data.items || [];
  }
}

// ============================================
// Bitbucket Implementation
// ============================================

class BitbucketClient {
  private baseUrl = 'https://api.bitbucket.org/2.0';

  constructor(private creds: { username: string; appPassword: string }) {}

  private getHeaders() {
    const auth = Buffer.from(`${this.creds.username}:${this.creds.appPassword}`).toString('base64');
    return {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
  }

  async listRepositories(workspace: string): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/repositories/${workspace}`, { headers: this.getHeaders() });
    const data = await response.json();
    return data.values || [];
  }

  async createPullRequest(workspace: string, repo: string, title: string, source: string, target = 'main'): Promise<any> {
    const response = await fetch(`${this.baseUrl}/repositories/${workspace}/${repo}/pullrequests`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ title, source: { branch: { name: source } }, destination: { branch: { name: target } } }),
    });
    return await response.json();
  }
}

// ============================================
// Jenkins Implementation
// ============================================

class JenkinsClient {
  constructor(private creds: { url: string; user: string; apiToken: string }) {}

  private getAuthHeader() {
    const auth = Buffer.from(`${this.creds.user}:${this.creds.apiToken}`).toString('base64');
    return { 'Authorization': `Basic ${auth}` };
  }

  async buildJob(jobName: string, parameters: any = {}): Promise<void> {
    const url = Object.keys(parameters).length > 0 
      ? `${this.creds.url}/job/${jobName}/buildWithParameters`
      : `${this.creds.url}/job/${jobName}/build`;
    
    await fetch(url, {
      method: 'POST',
      headers: this.getAuthHeader(),
      body: new URLSearchParams(parameters),
    });
  }

  async getJobInfo(jobName: string): Promise<any> {
    const response = await fetch(`${this.creds.url}/job/${jobName}/api/json`, { headers: this.getAuthHeader() });
    return await response.json();
  }
}

// ============================================
// Connector Definition
// ============================================

export const devopsConnector = {
  id: 'devops-suite',
  name: 'DevOps & CI/CD',
  version: '1.0.0',
  category: 'developer',
  description: 'Manage deployments and pipelines across Vercel, CircleCI, Bitbucket, and Jenkins',
  color: '#000000',
  icon: 'https://cdn.flowatgenai.com/connectors/devops.svg',
  tags: ['devops', 'ci', 'cd', 'vercel', 'circleci', 'bitbucket', 'jenkins', 'automation'],

  authentication: {
    type: 'custom' as const,
    fields: [
      { name: 'platform', label: 'Platform', type: 'select' as const, options: [
        { label: 'Vercel', value: 'vercel' },
        { label: 'CircleCI', value: 'circleci' },
        { label: 'Bitbucket', value: 'bitbucket' },
        { label: 'Jenkins', value: 'jenkins' },
      ], required: true },
      { name: 'token', label: 'API Token / App Password', type: 'password' as const, required: true },
      { name: 'extra', label: 'Team ID / Workspace / URL', type: 'string' as const, required: false },
      { name: 'user', label: 'User / Owner', type: 'string' as const, required: false },
    ],
  },

  actions: {
    // Vercel Actions
    vercelListProjects: {
      name: 'Vercel: List Projects',
      description: 'Fetch all Vercel projects',
      input: z.object({}),
      output: z.array(z.any()),
      execute: async (_input: any, ctx: { credentials: any }) => {
        const client = new VercelClient({ token: ctx.credentials.token, teamId: ctx.credentials.extra });
        return await client.listProjects();
      },
    },

    vercelCreateDeployment: {
      name: 'Vercel: Create Deployment',
      description: 'Trigger a new Vercel deployment',
      input: z.object({ projectId: z.string() }),
      output: z.any(),
      execute: async (input: any, ctx: { credentials: any }) => {
        const client = new VercelClient({ token: ctx.credentials.token, teamId: ctx.credentials.extra });
        return await client.createDeployment(input.projectId, []);
      },
    },

    // CircleCI Actions
    circleciTriggerPipeline: {
      name: 'CircleCI: Trigger Pipeline',
      description: 'Start a new CircleCI pipeline',
      input: z.object({ projectSlug: z.string(), branch: z.string().default('main') }),
      output: z.any(),
      execute: async (input: any, ctx: { credentials: any }) => {
        const client = new CircleCIClient({ token: ctx.credentials.token });
        return await client.triggerPipeline(input.projectSlug, input.branch);
      },
    },

    // Bitbucket Actions
    bitbucketCreatePR: {
      name: 'Bitbucket: Create Pull Request',
      description: 'Generate a new PR in Bitbucket',
      input: z.object({ workspace: z.string(), repo: z.string(), title: z.string(), source: z.string() }),
      output: z.any(),
      execute: async (input: any, ctx: { credentials: any }) => {
        const client = new BitbucketClient({ username: ctx.credentials.user, appPassword: ctx.credentials.token });
        return await client.createPullRequest(input.workspace, input.repo, input.title, input.source);
      },
    },

    // Jenkins Actions
    jenkinsBuildJob: {
      name: 'Jenkins: Build Job',
      description: 'Trigger a job build in Jenkins',
      input: z.object({ jobName: z.string(), parameters: z.record(z.string()).optional() }),
      output: z.object({ success: z.boolean() }),
      execute: async (input: any, ctx: { credentials: any }) => {
        const client = new JenkinsClient({ url: ctx.credentials.extra, user: ctx.credentials.user, apiToken: ctx.credentials.token });
        await client.buildJob(input.jobName, input.parameters);
        return { success: true };
      },
    },
  },
};

export default devopsConnector;
