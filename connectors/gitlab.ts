/**
 * GitLab Connector
 * 
 * Manage GitLab repositories, issues, and pipelines.
 * 
 * @module connectors/gitlab
 */

import { z } from 'zod';

interface GitLabCredentials {
  accessToken: string;
  baseUrl?: string;
}

class GitLabClient {
  private credentials: GitLabCredentials;
  private baseUrl: string;

  constructor(credentials: GitLabCredentials) {
    this.credentials = credentials;
    this.baseUrl = credentials.baseUrl || 'https://gitlab.com/api/v4';
  }

  private getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.credentials.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  async getProjects(search?: string, perPage: number = 20): Promise<Array<{
    id: number;
    name: string;
    path: string;
    description: string;
    webUrl: string;
    defaultBranch: string;
    visibility: string;
  }>> {
    const params = new URLSearchParams({ per_page: String(perPage) });
    if (search) params.append('search', search);

    const response = await fetch(`${this.baseUrl}/projects?${params}`, {
      headers: this.getHeaders(),
    });

    const data = await response.json();
    return data.map((p: { id: number; name: string; path: string; description: string; web_url: string; default_branch: string; visibility: string }) => ({
      id: p.id,
      name: p.name,
      path: p.path,
      description: p.description || '',
      webUrl: p.web_url,
      defaultBranch: p.default_branch,
      visibility: p.visibility,
    }));
  }

  async getProject(projectId: number | string): Promise<{
    id: number;
    name: string;
    description: string;
    webUrl: string;
    defaultBranch: string;
    forksCount: number;
    starsCount: number;
    openIssuesCount: number;
  }> {
    const response = await fetch(`${this.baseUrl}/projects/${encodeURIComponent(projectId)}`, {
      headers: this.getHeaders(),
    });

    const p = await response.json();
    return {
      id: p.id,
      name: p.name,
      description: p.description || '',
      webUrl: p.web_url,
      defaultBranch: p.default_branch,
      forksCount: p.forks_count,
      starsCount: p.star_count,
      openIssuesCount: p.open_issues_count,
    };
  }

  async createProject(params: {
    name: string;
    description?: string;
    visibility?: 'private' | 'internal' | 'public';
    initializeWithReadme?: boolean;
  }): Promise<{ id: number; webUrl: string }> {
    const response = await fetch(`${this.baseUrl}/projects`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        name: params.name,
        description: params.description,
        visibility: params.visibility || 'private',
        initialize_with_readme: params.initializeWithReadme,
      }),
    });

    const data = await response.json();
    return { id: data.id, webUrl: data.web_url };
  }

  async getIssues(projectId: number | string, state?: 'opened' | 'closed' | 'all'): Promise<Array<{
    id: number;
    iid: number;
    title: string;
    description: string;
    state: string;
    labels: string[];
    author: string;
    assignees: string[];
    createdAt: string;
  }>> {
    const params = new URLSearchParams();
    if (state) params.append('state', state);

    const response = await fetch(`${this.baseUrl}/projects/${encodeURIComponent(projectId)}/issues?${params}`, {
      headers: this.getHeaders(),
    });

    const data = await response.json();
    return data.map((i: { id: number; iid: number; title: string; description: string; state: string; labels: string[]; author: { username: string }; assignees: Array<{ username: string }>; created_at: string }) => ({
      id: i.id,
      iid: i.iid,
      title: i.title,
      description: i.description || '',
      state: i.state,
      labels: i.labels,
      author: i.author?.username || '',
      assignees: i.assignees?.map(a => a.username) || [],
      createdAt: i.created_at,
    }));
  }

  async createIssue(projectId: number | string, params: {
    title: string;
    description?: string;
    labels?: string[];
    assigneeIds?: number[];
    milestoneId?: number;
  }): Promise<{ id: number; iid: number; webUrl: string }> {
    const response = await fetch(`${this.baseUrl}/projects/${encodeURIComponent(projectId)}/issues`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        title: params.title,
        description: params.description,
        labels: params.labels?.join(','),
        assignee_ids: params.assigneeIds,
        milestone_id: params.milestoneId,
      }),
    });

    const data = await response.json();
    return { id: data.id, iid: data.iid, webUrl: data.web_url };
  }

  async updateIssue(projectId: number | string, issueIid: number, params: {
    title?: string;
    description?: string;
    state?: 'close' | 'reopen';
    labels?: string[];
  }): Promise<{ id: number; iid: number; state: string }> {
    const response = await fetch(`${this.baseUrl}/projects/${encodeURIComponent(projectId)}/issues/${issueIid}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({
        title: params.title,
        description: params.description,
        state_event: params.state,
        labels: params.labels?.join(','),
      }),
    });

    const data = await response.json();
    return { id: data.id, iid: data.iid, state: data.state };
  }

  async getMergeRequests(projectId: number | string, state?: 'opened' | 'closed' | 'merged' | 'all'): Promise<Array<{
    id: number;
    iid: number;
    title: string;
    description: string;
    state: string;
    sourceBranch: string;
    targetBranch: string;
    author: string;
  }>> {
    const params = new URLSearchParams();
    if (state) params.append('state', state);

    const response = await fetch(`${this.baseUrl}/projects/${encodeURIComponent(projectId)}/merge_requests?${params}`, {
      headers: this.getHeaders(),
    });

    const data = await response.json();
    return data.map((mr: { id: number; iid: number; title: string; description: string; state: string; source_branch: string; target_branch: string; author: { username: string } }) => ({
      id: mr.id,
      iid: mr.iid,
      title: mr.title,
      description: mr.description || '',
      state: mr.state,
      sourceBranch: mr.source_branch,
      targetBranch: mr.target_branch,
      author: mr.author?.username || '',
    }));
  }

  async createMergeRequest(projectId: number | string, params: {
    sourceBranch: string;
    targetBranch: string;
    title: string;
    description?: string;
    removeSourceBranch?: boolean;
  }): Promise<{ id: number; iid: number; webUrl: string }> {
    const response = await fetch(`${this.baseUrl}/projects/${encodeURIComponent(projectId)}/merge_requests`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        source_branch: params.sourceBranch,
        target_branch: params.targetBranch,
        title: params.title,
        description: params.description,
        remove_source_branch: params.removeSourceBranch,
      }),
    });

    const data = await response.json();
    return { id: data.id, iid: data.iid, webUrl: data.web_url };
  }

  async mergeMergeRequest(projectId: number | string, mergeRequestIid: number): Promise<{ state: string; mergedAt: string }> {
    const response = await fetch(`${this.baseUrl}/projects/${encodeURIComponent(projectId)}/merge_requests/${mergeRequestIid}/merge`, {
      method: 'PUT',
      headers: this.getHeaders(),
    });

    const data = await response.json();
    return { state: data.state, mergedAt: data.merged_at };
  }

  async getPipelines(projectId: number | string): Promise<Array<{
    id: number;
    status: string;
    ref: string;
    sha: string;
    createdAt: string;
    webUrl: string;
  }>> {
    const response = await fetch(`${this.baseUrl}/projects/${encodeURIComponent(projectId)}/pipelines`, {
      headers: this.getHeaders(),
    });

    const data = await response.json();
    return data.map((p: { id: number; status: string; ref: string; sha: string; created_at: string; web_url: string }) => ({
      id: p.id,
      status: p.status,
      ref: p.ref,
      sha: p.sha,
      createdAt: p.created_at,
      webUrl: p.web_url,
    }));
  }

  async triggerPipeline(projectId: number | string, ref: string, variables?: Record<string, string>): Promise<{
    id: number;
    status: string;
    webUrl: string;
  }> {
    const body: Record<string, unknown> = { ref };
    if (variables) {
      body.variables = Object.entries(variables).map(([key, value]) => ({ key, value }));
    }

    const response = await fetch(`${this.baseUrl}/projects/${encodeURIComponent(projectId)}/pipeline`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return { id: data.id, status: data.status, webUrl: data.web_url };
  }

  async cancelPipeline(projectId: number | string, pipelineId: number): Promise<{ status: string }> {
    const response = await fetch(`${this.baseUrl}/projects/${encodeURIComponent(projectId)}/pipelines/${pipelineId}/cancel`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    const data = await response.json();
    return { status: data.status };
  }

  async retryPipeline(projectId: number | string, pipelineId: number): Promise<{ id: number; status: string }> {
    const response = await fetch(`${this.baseUrl}/projects/${encodeURIComponent(projectId)}/pipelines/${pipelineId}/retry`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    const data = await response.json();
    return { id: data.id, status: data.status };
  }

  async getBranches(projectId: number | string): Promise<Array<{ name: string; protected: boolean; default: boolean }>> {
    const response = await fetch(`${this.baseUrl}/projects/${encodeURIComponent(projectId)}/repository/branches`, {
      headers: this.getHeaders(),
    });

    const data = await response.json();
    return data.map((b: { name: string; protected: boolean; default: boolean }) => ({
      name: b.name,
      protected: b.protected,
      default: b.default,
    }));
  }

  async createBranch(projectId: number | string, branch: string, ref: string): Promise<{ name: string }> {
    const response = await fetch(`${this.baseUrl}/projects/${encodeURIComponent(projectId)}/repository/branches`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ branch, ref }),
    });

    const data = await response.json();
    return { name: data.name };
  }

  async getFile(projectId: number | string, filePath: string, ref: string = 'main'): Promise<{ content: string; encoding: string }> {
    const response = await fetch(`${this.baseUrl}/projects/${encodeURIComponent(projectId)}/repository/files/${encodeURIComponent(filePath)}?ref=${ref}`, {
      headers: this.getHeaders(),
    });

    const data = await response.json();
    return { content: data.content, encoding: data.encoding };
  }

  async createFile(projectId: number | string, filePath: string, params: {
    branch: string;
    content: string;
    commitMessage: string;
  }): Promise<{ filePath: string; branch: string }> {
    const response = await fetch(`${this.baseUrl}/projects/${encodeURIComponent(projectId)}/repository/files/${encodeURIComponent(filePath)}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        branch: params.branch,
        content: params.content,
        commit_message: params.commitMessage,
      }),
    });

    const data = await response.json();
    return { filePath: data.file_path, branch: data.branch };
  }
}

export const gitlabConnector = {
  id: 'gitlab',
  name: 'GitLab',
  version: '1.0.0',
  category: 'developer',
  description: 'Manage GitLab repositories, issues, and pipelines',
  color: '#FC6D26',
  icon: 'https://cdn.flowatgenai.com/connectors/gitlab.svg',
  tags: ['gitlab', 'git', 'ci', 'pipelines', 'issues'],

  authentication: {
    type: 'custom' as const,
    fields: [
      { name: 'accessToken', label: 'Access Token', type: 'password' as const, required: true },
      { name: 'baseUrl', label: 'Base URL', type: 'string' as const, required: false, default: 'https://gitlab.com/api/v4' },
    ],
  },

  actions: {
    getProjects: {
      name: 'Get Projects',
      description: 'List projects',
      input: z.object({ search: z.string().optional(), perPage: z.number().default(20) }),
      output: z.object({ projects: z.array(z.object({ id: z.number(), name: z.string(), webUrl: z.string() })) }),
      execute: async (input: { search?: string; perPage?: number }, ctx: { credentials: GitLabCredentials }) => {
        const client = new GitLabClient(ctx.credentials);
        const projects = await client.getProjects(input.search, input.perPage);
        return { projects };
      },
    },

    getProject: {
      name: 'Get Project',
      description: 'Get project details',
      input: z.object({ projectId: z.union([z.number(), z.string()]) }),
      output: z.object({ id: z.number(), name: z.string(), webUrl: z.string(), starsCount: z.number() }),
      execute: async (input: { projectId: number | string }, ctx: { credentials: GitLabCredentials }) => {
        const client = new GitLabClient(ctx.credentials);
        return await client.getProject(input.projectId);
      },
    },

    createIssue: {
      name: 'Create Issue',
      description: 'Create a new issue',
      input: z.object({
        projectId: z.union([z.number(), z.string()]),
        title: z.string(),
        description: z.string().optional(),
        labels: z.array(z.string()).optional(),
      }),
      output: z.object({ id: z.number(), iid: z.number(), webUrl: z.string() }),
      execute: async (input: { projectId: number | string; title: string; description?: string; labels?: string[] }, ctx: { credentials: GitLabCredentials }) => {
        const client = new GitLabClient(ctx.credentials);
        return await client.createIssue(input.projectId, input);
      },
    },

    getIssues: {
      name: 'Get Issues',
      description: 'List issues',
      input: z.object({ projectId: z.union([z.number(), z.string()]), state: z.enum(['opened', 'closed', 'all']).optional() }),
      output: z.object({ issues: z.array(z.object({ id: z.number(), iid: z.number(), title: z.string(), state: z.string() })) }),
      execute: async (input: { projectId: number | string; state?: 'opened' | 'closed' | 'all' }, ctx: { credentials: GitLabCredentials }) => {
        const client = new GitLabClient(ctx.credentials);
        const issues = await client.getIssues(input.projectId, input.state);
        return { issues };
      },
    },

    createMergeRequest: {
      name: 'Create Merge Request',
      description: 'Create a merge request',
      input: z.object({
        projectId: z.union([z.number(), z.string()]),
        sourceBranch: z.string(),
        targetBranch: z.string(),
        title: z.string(),
        description: z.string().optional(),
      }),
      output: z.object({ id: z.number(), iid: z.number(), webUrl: z.string() }),
      execute: async (input: { projectId: number | string; sourceBranch: string; targetBranch: string; title: string; description?: string }, ctx: { credentials: GitLabCredentials }) => {
        const client = new GitLabClient(ctx.credentials);
        return await client.createMergeRequest(input.projectId, input);
      },
    },

    getMergeRequests: {
      name: 'Get Merge Requests',
      description: 'List merge requests',
      input: z.object({ projectId: z.union([z.number(), z.string()]), state: z.enum(['opened', 'closed', 'merged', 'all']).optional() }),
      output: z.object({ mergeRequests: z.array(z.object({ id: z.number(), iid: z.number(), title: z.string(), state: z.string() })) }),
      execute: async (input: { projectId: number | string; state?: 'opened' | 'closed' | 'merged' | 'all' }, ctx: { credentials: GitLabCredentials }) => {
        const client = new GitLabClient(ctx.credentials);
        const mergeRequests = await client.getMergeRequests(input.projectId, input.state);
        return { mergeRequests };
      },
    },

    triggerPipeline: {
      name: 'Trigger Pipeline',
      description: 'Trigger a CI/CD pipeline',
      input: z.object({
        projectId: z.union([z.number(), z.string()]),
        ref: z.string(),
        variables: z.record(z.string()).optional(),
      }),
      output: z.object({ id: z.number(), status: z.string(), webUrl: z.string() }),
      execute: async (input: { projectId: number | string; ref: string; variables?: Record<string, string> }, ctx: { credentials: GitLabCredentials }) => {
        const client = new GitLabClient(ctx.credentials);
        return await client.triggerPipeline(input.projectId, input.ref, input.variables);
      },
    },

    getPipelines: {
      name: 'Get Pipelines',
      description: 'List pipelines',
      input: z.object({ projectId: z.union([z.number(), z.string()]) }),
      output: z.object({ pipelines: z.array(z.object({ id: z.number(), status: z.string(), ref: z.string() })) }),
      execute: async (input: { projectId: number | string }, ctx: { credentials: GitLabCredentials }) => {
        const client = new GitLabClient(ctx.credentials);
        const pipelines = await client.getPipelines(input.projectId);
        return { pipelines };
      },
    },

    getBranches: {
      name: 'Get Branches',
      description: 'List branches',
      input: z.object({ projectId: z.union([z.number(), z.string()]) }),
      output: z.object({ branches: z.array(z.object({ name: z.string(), protected: z.boolean() })) }),
      execute: async (input: { projectId: number | string }, ctx: { credentials: GitLabCredentials }) => {
        const client = new GitLabClient(ctx.credentials);
        const branches = await client.getBranches(input.projectId);
        return { branches };
      },
    },

    createBranch: {
      name: 'Create Branch',
      description: 'Create a new branch',
      input: z.object({
        projectId: z.union([z.number(), z.string()]),
        branch: z.string(),
        ref: z.string(),
      }),
      output: z.object({ name: z.string() }),
      execute: async (input: { projectId: number | string; branch: string; ref: string }, ctx: { credentials: GitLabCredentials }) => {
        const client = new GitLabClient(ctx.credentials);
        return await client.createBranch(input.projectId, input.branch, input.ref);
      },
    },
  },
};

export default gitlabConnector;
