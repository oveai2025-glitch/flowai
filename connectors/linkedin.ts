/**
 * LinkedIn Connector
 * 
 * Manage LinkedIn posts and company pages.
 * 
 * @module connectors/linkedin
 */

import { z } from 'zod';

interface LinkedInCredentials {
  accessToken: string;
  organizationId?: string;
}

class LinkedInClient {
  private credentials: LinkedInCredentials;
  private baseUrl = 'https://api.linkedin.com/v2';

  constructor(credentials: LinkedInCredentials) {
    this.credentials = credentials;
  }

  private getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.credentials.accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    };
  }

  async getProfile(): Promise<{
    id: string;
    firstName: string;
    lastName: string;
    headline: string;
    profilePicture: string;
  }> {
    const response = await fetch(`${this.baseUrl}/me?projection=(id,firstName,lastName,headline,profilePicture)`, {
      headers: this.getHeaders(),
    });

    const data = await response.json();
    return {
      id: data.id,
      firstName: data.firstName?.localized?.en_US || '',
      lastName: data.lastName?.localized?.en_US || '',
      headline: data.headline?.localized?.en_US || '',
      profilePicture: data.profilePicture?.displayImage || '',
    };
  }

  async createPost(params: {
    text: string;
    visibility: 'PUBLIC' | 'CONNECTIONS';
    authorType: 'person' | 'organization';
    authorId: string;
    mediaUrls?: string[];
    articleUrl?: string;
    articleTitle?: string;
    articleDescription?: string;
  }): Promise<{ postId: string }> {
    const author = params.authorType === 'organization'
      ? `urn:li:organization:${params.authorId}`
      : `urn:li:person:${params.authorId}`;

    const body: Record<string, unknown> = {
      author,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: params.text },
          shareMediaCategory: params.articleUrl ? 'ARTICLE' : 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': params.visibility,
      },
    };

    if (params.articleUrl) {
      (body.specificContent as Record<string, unknown>)['com.linkedin.ugc.ShareContent'] = {
        shareCommentary: { text: params.text },
        shareMediaCategory: 'ARTICLE',
        media: [{
          status: 'READY',
          originalUrl: params.articleUrl,
          title: { text: params.articleTitle || '' },
          description: { text: params.articleDescription || '' },
        }],
      };
    }

    const response = await fetch(`${this.baseUrl}/ugcPosts`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    const location = response.headers.get('x-restli-id');
    return { postId: location || '' };
  }

  async deletePost(postId: string): Promise<void> {
    await fetch(`${this.baseUrl}/ugcPosts/${encodeURIComponent(postId)}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
  }

  async getPost(postId: string): Promise<{
    id: string;
    text: string;
    createdAt: number;
    author: string;
  }> {
    const response = await fetch(`${this.baseUrl}/ugcPosts/${encodeURIComponent(postId)}`, {
      headers: this.getHeaders(),
    });

    const data = await response.json();
    return {
      id: data.id,
      text: data.specificContent?.['com.linkedin.ugc.ShareContent']?.shareCommentary?.text || '',
      createdAt: data.created?.time || 0,
      author: data.author || '',
    };
  }

  async getCompanyPage(organizationId: string): Promise<{
    id: string;
    name: string;
    description: string;
    industry: string;
    followerCount: number;
  }> {
    const response = await fetch(`${this.baseUrl}/organizations/${organizationId}`, {
      headers: this.getHeaders(),
    });

    const data = await response.json();
    return {
      id: String(data.id),
      name: data.localizedName || '',
      description: data.localizedDescription || '',
      industry: data.industries?.[0] || '',
      followerCount: 0,
    };
  }

  async getCompanyFollowers(organizationId: string): Promise<{ count: number }> {
    const response = await fetch(
      `${this.baseUrl}/networkSizes/${encodeURIComponent(`urn:li:organization:${organizationId}`)}?edgeType=CompanyFollowedByMember`,
      { headers: this.getHeaders() }
    );

    const data = await response.json();
    return { count: data.firstDegreeSize || 0 };
  }

  async getConnections(start: number = 0, count: number = 50): Promise<Array<{
    id: string;
    firstName: string;
    lastName: string;
  }>> {
    const response = await fetch(
      `${this.baseUrl}/connections?q=viewer&start=${start}&count=${count}&projection=(elements*(id,firstName,lastName))`,
      { headers: this.getHeaders() }
    );

    const data = await response.json();
    return data.elements?.map((e: { id: string; firstName: Record<string, string>; lastName: Record<string, string> }) => ({
      id: e.id,
      firstName: e.firstName?.localized?.en_US || '',
      lastName: e.lastName?.localized?.en_US || '',
    })) || [];
  }

  async sendMessage(recipientId: string, subject: string, body: string): Promise<{ messageId: string }> {
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        recipients: [`urn:li:person:${recipientId}`],
        subject,
        body,
      }),
    });

    const location = response.headers.get('x-restli-id');
    return { messageId: location || '' };
  }

  async searchPeople(keywords: string, start: number = 0, count: number = 10): Promise<Array<{
    id: string;
    firstName: string;
    lastName: string;
    headline: string;
  }>> {
    const response = await fetch(
      `${this.baseUrl}/search/people?keywords=${encodeURIComponent(keywords)}&start=${start}&count=${count}`,
      { headers: this.getHeaders() }
    );

    const data = await response.json();
    return data.elements?.map((e: { id: string; firstName: Record<string, string>; lastName: Record<string, string>; headline: Record<string, string> }) => ({
      id: e.id,
      firstName: e.firstName?.localized?.en_US || '',
      lastName: e.lastName?.localized?.en_US || '',
      headline: e.headline?.localized?.en_US || '',
    })) || [];
  }

  async getPostAnalytics(postId: string): Promise<{
    impressions: number;
    clicks: number;
    likes: number;
    comments: number;
    shares: number;
    engagement: number;
  }> {
    const response = await fetch(
      `${this.baseUrl}/socialActions/${encodeURIComponent(postId)}`,
      { headers: this.getHeaders() }
    );

    const data = await response.json();
    return {
      impressions: data.impressionCount || 0,
      clicks: data.clickCount || 0,
      likes: data.likesSummary?.totalLikes || 0,
      comments: data.commentsSummary?.totalFirstLevelComments || 0,
      shares: data.shareStatistics?.shareCount || 0,
      engagement: data.engagement || 0,
    };
  }

  async likePost(postId: string, actorId: string): Promise<void> {
    await fetch(`${this.baseUrl}/socialActions/${encodeURIComponent(postId)}/likes`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ actor: `urn:li:person:${actorId}` }),
    });
  }

  async commentOnPost(postId: string, actorId: string, text: string): Promise<{ commentId: string }> {
    const response = await fetch(`${this.baseUrl}/socialActions/${encodeURIComponent(postId)}/comments`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        actor: `urn:li:person:${actorId}`,
        message: { text },
      }),
    });

    const location = response.headers.get('x-restli-id');
    return { commentId: location || '' };
  }
}

export const linkedinConnector = {
  id: 'linkedin',
  name: 'LinkedIn',
  version: '1.0.0',
  category: 'social',
  description: 'Manage LinkedIn posts and company pages',
  color: '#0A66C2',
  icon: 'https://cdn.flowatgenai.com/connectors/linkedin.svg',
  tags: ['linkedin', 'social', 'professional', 'company'],

  authentication: {
    type: 'oauth2' as const,
    authorizationUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    scopes: ['r_liteprofile', 'r_emailaddress', 'w_member_social', 'r_organization_social'],
    fields: [
      { name: 'accessToken', label: 'Access Token', type: 'password' as const, required: true },
      { name: 'organizationId', label: 'Organization ID', type: 'string' as const, required: false },
    ],
  },

  actions: {
    getProfile: {
      name: 'Get Profile',
      description: 'Get your LinkedIn profile',
      input: z.object({}),
      output: z.object({
        id: z.string(),
        firstName: z.string(),
        lastName: z.string(),
        headline: z.string(),
      }),
      execute: async (_input: unknown, ctx: { credentials: LinkedInCredentials }) => {
        const client = new LinkedInClient(ctx.credentials);
        return await client.getProfile();
      },
    },

    createPost: {
      name: 'Create Post',
      description: 'Create a LinkedIn post',
      input: z.object({
        text: z.string(),
        visibility: z.enum(['PUBLIC', 'CONNECTIONS']).default('PUBLIC'),
        authorType: z.enum(['person', 'organization']).default('person'),
        authorId: z.string(),
        articleUrl: z.string().optional(),
        articleTitle: z.string().optional(),
        articleDescription: z.string().optional(),
      }),
      output: z.object({ postId: z.string() }),
      execute: async (input: { text: string; visibility?: 'PUBLIC' | 'CONNECTIONS'; authorType?: 'person' | 'organization'; authorId: string; articleUrl?: string; articleTitle?: string; articleDescription?: string }, ctx: { credentials: LinkedInCredentials }) => {
        const client = new LinkedInClient(ctx.credentials);
        return await client.createPost({
          text: input.text,
          visibility: input.visibility || 'PUBLIC',
          authorType: input.authorType || 'person',
          authorId: input.authorId,
          articleUrl: input.articleUrl,
          articleTitle: input.articleTitle,
          articleDescription: input.articleDescription,
        });
      },
    },

    deletePost: {
      name: 'Delete Post',
      description: 'Delete a post',
      input: z.object({ postId: z.string() }),
      output: z.object({ success: z.boolean() }),
      execute: async (input: { postId: string }, ctx: { credentials: LinkedInCredentials }) => {
        const client = new LinkedInClient(ctx.credentials);
        await client.deletePost(input.postId);
        return { success: true };
      },
    },

    getPost: {
      name: 'Get Post',
      description: 'Get post details',
      input: z.object({ postId: z.string() }),
      output: z.object({ id: z.string(), text: z.string(), createdAt: z.number() }),
      execute: async (input: { postId: string }, ctx: { credentials: LinkedInCredentials }) => {
        const client = new LinkedInClient(ctx.credentials);
        return await client.getPost(input.postId);
      },
    },

    getCompanyPage: {
      name: 'Get Company Page',
      description: 'Get company page details',
      input: z.object({ organizationId: z.string() }),
      output: z.object({ id: z.string(), name: z.string(), description: z.string() }),
      execute: async (input: { organizationId: string }, ctx: { credentials: LinkedInCredentials }) => {
        const client = new LinkedInClient(ctx.credentials);
        return await client.getCompanyPage(input.organizationId);
      },
    },

    getCompanyFollowers: {
      name: 'Get Company Followers',
      description: 'Get company follower count',
      input: z.object({ organizationId: z.string() }),
      output: z.object({ count: z.number() }),
      execute: async (input: { organizationId: string }, ctx: { credentials: LinkedInCredentials }) => {
        const client = new LinkedInClient(ctx.credentials);
        return await client.getCompanyFollowers(input.organizationId);
      },
    },

    getPostAnalytics: {
      name: 'Get Post Analytics',
      description: 'Get analytics for a post',
      input: z.object({ postId: z.string() }),
      output: z.object({
        impressions: z.number(),
        clicks: z.number(),
        likes: z.number(),
        comments: z.number(),
        shares: z.number(),
      }),
      execute: async (input: { postId: string }, ctx: { credentials: LinkedInCredentials }) => {
        const client = new LinkedInClient(ctx.credentials);
        return await client.getPostAnalytics(input.postId);
      },
    },

    likePost: {
      name: 'Like Post',
      description: 'Like a post',
      input: z.object({ postId: z.string(), actorId: z.string() }),
      output: z.object({ success: z.boolean() }),
      execute: async (input: { postId: string; actorId: string }, ctx: { credentials: LinkedInCredentials }) => {
        const client = new LinkedInClient(ctx.credentials);
        await client.likePost(input.postId, input.actorId);
        return { success: true };
      },
    },

    commentOnPost: {
      name: 'Comment on Post',
      description: 'Add a comment to a post',
      input: z.object({ postId: z.string(), actorId: z.string(), text: z.string() }),
      output: z.object({ commentId: z.string() }),
      execute: async (input: { postId: string; actorId: string; text: string }, ctx: { credentials: LinkedInCredentials }) => {
        const client = new LinkedInClient(ctx.credentials);
        return await client.commentOnPost(input.postId, input.actorId, input.text);
      },
    },

    sendMessage: {
      name: 'Send Message',
      description: 'Send a message to a connection',
      input: z.object({ recipientId: z.string(), subject: z.string(), body: z.string() }),
      output: z.object({ messageId: z.string() }),
      execute: async (input: { recipientId: string; subject: string; body: string }, ctx: { credentials: LinkedInCredentials }) => {
        const client = new LinkedInClient(ctx.credentials);
        return await client.sendMessage(input.recipientId, input.subject, input.body);
      },
    },
  },
};

export default linkedinConnector;
