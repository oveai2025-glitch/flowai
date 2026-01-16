/**
 * GitHub Connector
 * 
 * Integrated integration for GitHub repositories and collaboration:
 * - Repositories (List, Create, Update, Get)
 * - Issues (List, Create, Comment, Close)
 * - Pull Requests (List, Create, Review, Merge)
 * - Organizations (List Teams, Members)
 * - Stars & Watching
 * 
 * @module connectors/github
 */

import { z } from 'zod';

interface GitHubCredentials {
  accessToken: string;
  baseUrl?: string;
}

class GitHubClient {
  private baseUrl: string;

  constructor(private creds: GitHubCredentials) {
    this.baseUrl = creds.baseUrl || 'https://api.github.com';
  }

  private getHeaders() {
    return {
      'Authorization': `token ${this.creds.accessToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'FlowAtGenAI-Connector',
    };
  }

  private async request(path: string, method = 'GET', body?: any) {
    const url = `${this.baseUrl}${path}`;
    const options: RequestInit = {
      method,
      headers: this.getHeaders(),
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    
    if (response.status === 204) return true;
    
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`GitHub API Error: ${data.message || response.statusText}`);
    }

    return data;
  }

  // ============================================
  // Repository Operations
  // ============================================

  async listRepositories(params: { visibility?: 'all' | 'public' | 'private'; sort?: 'created' | 'updated' | 'pushed' | 'full_name' }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/user/repos?${query}`);
  }

  async getRepository(owner: string, repo: string) {
    return this.request(`/repos/${owner}/${repo}`);
  }

  async createRepository(params: { name: string; description?: string; private?: boolean; auto_init?: boolean }) {
    return this.request('/user/repos', 'POST', params);
  }

  // ============================================
  // Issues Operations
  // ============================================

  async listIssues(owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'open') {
    return this.request(`/repos/${owner}/${repo}/issues?state=${state}`);
  }

  async createIssue(owner: string, repo: string, params: { title: string; body?: string; labels?: string[]; assignees?: string[] }) {
    return this.request(`/repos/${owner}/${repo}/issues`, 'POST', params);
  }

  async addIssueComment(owner: string, repo: string, issueNumber: number, body: string) {
    return this.request(`/repos/${owner}/${repo}/issues/${issueNumber}/comments`, 'POST', { body });
  }

  // ============================================
  // Pull Request Operations
  // ============================================

  async listPullRequests(owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'open') {
    return this.request(`/repos/${owner}/${repo}/pulls?state=${state}`);
  }

  async createPullRequest(owner: string, repo: string, params: { title: string; head: string; base: string; body?: string }) {
    return this.request(`/repos/${owner}/${repo}/pulls`, 'POST', params);
  }

  async mergePullRequest(owner: string, repo: string, pullNumber: number, commitTitle?: string) {
    return this.request(`/repos/${owner}/${repo}/pulls/${pullNumber}/merge`, 'PUT', { commit_title: commitTitle });
  }

  // ============================================
  // Starring & Social
  // ============================================

  async starRepository(owner: string, repo: string) {
    return this.request(`/user/starred/${owner}/${repo}`, 'PUT');
  }

  async unstarRepository(owner: string, repo: string) {
    return this.request(`/user/starred/${owner}/${repo}`, 'DELETE');
  }

  async checkIsStarred(owner: string, repo: string) {
    try {
      await this.request(`/user/starred/${owner}/${repo}`);
      return true;
    } catch {
      return false;
    }
  }
}

// ============================================
// Connector Definition
// ============================================

export const githubConnector = {
  id: 'github',
  name: 'GitHub',
  version: '1.0.0',
  category: 'developer',
  description: 'Manage repositories, issues, and pull requests on GitHub',
  color: '#24292F',
  icon: 'https://cdn.flowatgenai.com/connectors/github.svg',
  tags: ['git', 'github', 'repo', 'code', 'collaboration', 'software'],

  authentication: {
    type: 'oauth2' as const,
    fields: [
      { name: 'accessToken', label: 'Personal Access Token', type: 'password' as const, required: true },
    ],
  },

  actions: {
    // Repository Actions
    listRepos: {
      name: 'List Repositories',
      description: 'Get all repositories accessible by the token',
      input: z.object({ visibility: z.enum(['all', 'public', 'private']).default('all') }),
      output: z.array(z.any()),
      execute: async (input: any, ctx: { credentials: GitHubCredentials }) => {
        const client = new GitHubClient(ctx.credentials);
        return await client.listRepositories(input);
      },
    },

    createRepo: {
      name: 'Create Repository',
      description: 'Create a new repository for the authenticated user',
      input: z.object({ name: z.string(), description: z.string().optional(), private: z.boolean().default(false) }),
      output: z.any(),
      execute: async (input: any, ctx: { credentials: GitHubCredentials }) => {
        const client = new GitHubClient(ctx.credentials);
        return await client.createRepository(input);
      },
    },

    // Issue Actions
    createIssue: {
      name: 'Create Issue',
      description: 'Open a new issue in a repository',
      input: z.object({ owner: z.string(), repo: z.string(), title: z.string(), body: z.string().optional() }),
      output: z.any(),
      execute: async (input: any, ctx: { credentials: GitHubCredentials }) => {
        const client = new GitHubClient(ctx.credentials);
        const { owner, repo, ...rest } = input;
        return await client.createIssue(owner, repo, rest);
      },
    },

    addComment: {
      name: 'Add Issue Comment',
      description: 'Post a comment on an existing issue or pull request',
      input: z.object({ owner: z.string(), repo: z.string(), issueNumber: z.number(), body: z.string() }),
      output: z.any(),
      execute: async (input: any, ctx: { credentials: GitHubCredentials }) => {
        const client = new GitHubClient(ctx.credentials);
        return await client.addIssueComment(input.owner, input.repo, input.issueNumber, input.body);
      },
    },

    // PR Actions
    createPR: {
      name: 'Create Pull Request',
      description: 'Draft a new PR from a branch to a base branch',
      input: z.object({ owner: z.string(), repo: z.string(), title: z.string(), head: z.string(), base: z.string().default('main') }),
      output: z.any(),
      execute: async (input: any, ctx: { credentials: GitHubCredentials }) => {
        const client = new GitHubClient(ctx.credentials);
        const { owner, repo, ...rest } = input;
        return await client.createPullRequest(owner, repo, rest);
      },
    },

    // Social Actions
    starRepo: {
      name: 'Star Repository',
      description: 'Add a star to a specific repository',
      input: z.object({ owner: z.string(), repo: z.string() }),
      output: z.object({ success: z.boolean() }),
      execute: async (input: any, ctx: { credentials: GitHubCredentials }) => {
        const client = new GitHubClient(ctx.credentials);
        await client.starRepository(input.owner, input.repo);
        return { success: true };
      },
    },
  },
};

export default githubConnector;
