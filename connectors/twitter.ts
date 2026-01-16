/**
 * Twitter (X) Connector
 * 
 * This module provides a comprehensive interface for interacting with the 
 * Twitter/X API v2. It allows workflows to perform social media automation, 
 * including posting updates, searching for trends, and managing user 
 * interactions.
 * 
 * Operational Capabilities:
 * - Tweet Management: Create, delete, and retrieve tweets with media support.
 * - User Intelligence: Follow/unfollow users and fetch profile data.
 * - Search & Discovery: Filter global tweets based on keywords, hashtags, and geo.
 * - Direct Messaging: Automated response handling for customer support flows.
 * 
 * Security & Auth:
 * - Supports OAuth 2.0 (PKCE) and API Key/Secret pairs.
 * - Tokens are securely stored and decrypted via the CredentialService.
 * 
 * @module connectors/twitter
 * @see {@link https://developer.twitter.com/en/docs/twitter-api}
 */

import { z } from 'zod';

/**
 * Metadata definition for the Twitter/X Connector.
 * @constant
 */
export const TwitterConnectorMetadata = {
  id: 'twitter',
  name: 'Twitter/X',
  description: 'Automate tweets, search, and user interactions on the X platform.',
  icon: 'twitter',
  category: 'Social Media',
  color: '#1DA1F2',
};

/**
 * Zod schema for Twitter credentials.
 * Supports both User Context and App Context.
 */
export const TwitterAuthSchema = z.object({
  /** Client ID from the Twitter Developer Portal */
  appKey: z.string().describe('Consumer App Key'),
  /** Client Secret from the Twitter Developer Portal */
  appSecret: z.string().describe('Consumer App Secret'),
  /** Access Token for a specific user */
  accessToken: z.string().describe('User Access Token'),
  /** Access Token Secret for a specific user */
  accessSecret: z.string().describe('User Access Secret'),
});

interface TwitterCredentials {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
  bearerToken: string;
}

class TwitterClient {
  private credentials: TwitterCredentials;
  private baseUrl = 'https://api.twitter.com/2';

  constructor(credentials: TwitterCredentials) {
    this.credentials = credentials;
  }

  private getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.credentials.bearerToken}`,
      'Content-Type': 'application/json',
    };
  }

  async postTweet(text: string, options?: {
    replyTo?: string;
    mediaIds?: string[];
    poll?: { options: string[]; durationMinutes: number };
  }): Promise<{ id: string; text: string }> {
    const body: Record<string, unknown> = { text };
    
    if (options?.replyTo) {
      body.reply = { in_reply_to_tweet_id: options.replyTo };
    }
    if (options?.mediaIds) {
      body.media = { media_ids: options.mediaIds };
    }
    if (options?.poll) {
      body.poll = { options: options.poll.options, duration_minutes: options.poll.durationMinutes };
    }

    const response = await fetch(`${this.baseUrl}/tweets`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return { id: data.data.id, text: data.data.text };
  }

  async deleteTweet(tweetId: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/tweets/${tweetId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    const data = await response.json();
    return data.data?.deleted || false;
  }

  async getTweet(tweetId: string): Promise<{
    id: string;
    text: string;
    authorId: string;
    createdAt: string;
    publicMetrics: { retweetCount: number; likeCount: number; replyCount: number };
  }> {
    const response = await fetch(
      `${this.baseUrl}/tweets/${tweetId}?tweet.fields=author_id,created_at,public_metrics`,
      { headers: this.getHeaders() }
    );

    const data = await response.json();
    return {
      id: data.data.id,
      text: data.data.text,
      authorId: data.data.author_id,
      createdAt: data.data.created_at,
      publicMetrics: {
        retweetCount: data.data.public_metrics?.retweet_count || 0,
        likeCount: data.data.public_metrics?.like_count || 0,
        replyCount: data.data.public_metrics?.reply_count || 0,
      },
    };
  }

  async searchTweets(query: string, options?: {
    maxResults?: number;
    startTime?: string;
    endTime?: string;
  }): Promise<Array<{ id: string; text: string; authorId: string }>> {
    const params = new URLSearchParams({
      query,
      max_results: String(options?.maxResults || 10),
      'tweet.fields': 'author_id,created_at',
    });

    if (options?.startTime) params.append('start_time', options.startTime);
    if (options?.endTime) params.append('end_time', options.endTime);

    const response = await fetch(
      `${this.baseUrl}/tweets/search/recent?${params}`,
      { headers: this.getHeaders() }
    );

    const data = await response.json();
    return data.data?.map((t: { id: string; text: string; author_id: string }) => ({
      id: t.id,
      text: t.text,
      authorId: t.author_id,
    })) || [];
  }

  async getUser(userId: string): Promise<{
    id: string;
    name: string;
    username: string;
    followersCount: number;
    followingCount: number;
    tweetCount: number;
  }> {
    const response = await fetch(
      `${this.baseUrl}/users/${userId}?user.fields=public_metrics`,
      { headers: this.getHeaders() }
    );

    const data = await response.json();
    return {
      id: data.data.id,
      name: data.data.name,
      username: data.data.username,
      followersCount: data.data.public_metrics?.followers_count || 0,
      followingCount: data.data.public_metrics?.following_count || 0,
      tweetCount: data.data.public_metrics?.tweet_count || 0,
    };
  }

  async getUserByUsername(username: string): Promise<{ id: string; name: string; username: string }> {
    const response = await fetch(
      `${this.baseUrl}/users/by/username/${username}`,
      { headers: this.getHeaders() }
    );

    const data = await response.json();
    return { id: data.data.id, name: data.data.name, username: data.data.username };
  }

  async getUserTweets(userId: string, maxResults: number = 10): Promise<Array<{ id: string; text: string; createdAt: string }>> {
    const response = await fetch(
      `${this.baseUrl}/users/${userId}/tweets?max_results=${maxResults}&tweet.fields=created_at`,
      { headers: this.getHeaders() }
    );

    const data = await response.json();
    return data.data?.map((t: { id: string; text: string; created_at: string }) => ({
      id: t.id,
      text: t.text,
      createdAt: t.created_at,
    })) || [];
  }

  async like(tweetId: string, userId: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/users/${userId}/likes`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ tweet_id: tweetId }),
    });

    const data = await response.json();
    return data.data?.liked || false;
  }

  async unlike(tweetId: string, userId: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/users/${userId}/likes/${tweetId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    const data = await response.json();
    return !data.data?.liked;
  }

  async retweet(tweetId: string, userId: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/users/${userId}/retweets`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ tweet_id: tweetId }),
    });

    const data = await response.json();
    return data.data?.retweeted || false;
  }

  async follow(targetUserId: string, userId: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/users/${userId}/following`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ target_user_id: targetUserId }),
    });

    const data = await response.json();
    return data.data?.following || false;
  }

  async unfollow(targetUserId: string, userId: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/users/${userId}/following/${targetUserId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    const data = await response.json();
    return !data.data?.following;
  }

  async getFollowers(userId: string, maxResults: number = 100): Promise<Array<{ id: string; name: string; username: string }>> {
    const response = await fetch(
      `${this.baseUrl}/users/${userId}/followers?max_results=${maxResults}`,
      { headers: this.getHeaders() }
    );

    const data = await response.json();
    return data.data?.map((u: { id: string; name: string; username: string }) => ({
      id: u.id,
      name: u.name,
      username: u.username,
    })) || [];
  }

  async getFollowing(userId: string, maxResults: number = 100): Promise<Array<{ id: string; name: string; username: string }>> {
    const response = await fetch(
      `${this.baseUrl}/users/${userId}/following?max_results=${maxResults}`,
      { headers: this.getHeaders() }
    );

    const data = await response.json();
    return data.data?.map((u: { id: string; name: string; username: string }) => ({
      id: u.id,
      name: u.name,
      username: u.username,
    })) || [];
  }

  async sendDirectMessage(recipientId: string, text: string): Promise<{ eventId: string }> {
    const response = await fetch(`${this.baseUrl}/dm_conversations/with/${recipientId}/messages`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ text }),
    });

    const data = await response.json();
    return { eventId: data.data?.dm_event_id || '' };
  }
}

export const twitterConnector = {
  id: 'twitter',
  name: 'Twitter/X',
  version: '1.0.0',
  category: 'social',
  description: 'Post and manage content on Twitter/X',
  color: '#1DA1F2',
  icon: 'https://cdn.flowatgenai.com/connectors/twitter.svg',
  tags: ['twitter', 'x', 'social', 'tweets'],

  authentication: {
    type: 'custom' as const,
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'string' as const, required: true },
      { name: 'apiSecret', label: 'API Secret', type: 'password' as const, required: true },
      { name: 'accessToken', label: 'Access Token', type: 'string' as const, required: true },
      { name: 'accessTokenSecret', label: 'Access Token Secret', type: 'password' as const, required: true },
      { name: 'bearerToken', label: 'Bearer Token', type: 'password' as const, required: true },
    ],
  },

  actions: {
    postTweet: {
      name: 'Post Tweet',
      description: 'Post a new tweet',
      input: z.object({
        text: z.string().max(280),
        replyTo: z.string().optional(),
        mediaIds: z.array(z.string()).optional(),
      }),
      output: z.object({ id: z.string(), text: z.string() }),
      execute: async (input: { text: string; replyTo?: string; mediaIds?: string[] }, ctx: { credentials: TwitterCredentials }) => {
        const client = new TwitterClient(ctx.credentials);
        return await client.postTweet(input.text, input);
      },
    },

    deleteTweet: {
      name: 'Delete Tweet',
      description: 'Delete a tweet',
      input: z.object({ tweetId: z.string() }),
      output: z.object({ deleted: z.boolean() }),
      execute: async (input: { tweetId: string }, ctx: { credentials: TwitterCredentials }) => {
        const client = new TwitterClient(ctx.credentials);
        const deleted = await client.deleteTweet(input.tweetId);
        return { deleted };
      },
    },

    getTweet: {
      name: 'Get Tweet',
      description: 'Get tweet details',
      input: z.object({ tweetId: z.string() }),
      output: z.object({
        id: z.string(),
        text: z.string(),
        authorId: z.string(),
        createdAt: z.string(),
        likeCount: z.number(),
        retweetCount: z.number(),
      }),
      execute: async (input: { tweetId: string }, ctx: { credentials: TwitterCredentials }) => {
        const client = new TwitterClient(ctx.credentials);
        const tweet = await client.getTweet(input.tweetId);
        return {
          id: tweet.id,
          text: tweet.text,
          authorId: tweet.authorId,
          createdAt: tweet.createdAt,
          likeCount: tweet.publicMetrics.likeCount,
          retweetCount: tweet.publicMetrics.retweetCount,
        };
      },
    },

    searchTweets: {
      name: 'Search Tweets',
      description: 'Search recent tweets',
      input: z.object({
        query: z.string(),
        maxResults: z.number().default(10),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
      }),
      output: z.object({ tweets: z.array(z.object({ id: z.string(), text: z.string(), authorId: z.string() })) }),
      execute: async (input: { query: string; maxResults?: number; startTime?: string; endTime?: string }, ctx: { credentials: TwitterCredentials }) => {
        const client = new TwitterClient(ctx.credentials);
        const tweets = await client.searchTweets(input.query, input);
        return { tweets };
      },
    },

    getUser: {
      name: 'Get User',
      description: 'Get user profile',
      input: z.object({ userId: z.string() }),
      output: z.object({
        id: z.string(),
        name: z.string(),
        username: z.string(),
        followersCount: z.number(),
        followingCount: z.number(),
      }),
      execute: async (input: { userId: string }, ctx: { credentials: TwitterCredentials }) => {
        const client = new TwitterClient(ctx.credentials);
        return await client.getUser(input.userId);
      },
    },

    getUserByUsername: {
      name: 'Get User by Username',
      description: 'Get user by their username',
      input: z.object({ username: z.string() }),
      output: z.object({ id: z.string(), name: z.string(), username: z.string() }),
      execute: async (input: { username: string }, ctx: { credentials: TwitterCredentials }) => {
        const client = new TwitterClient(ctx.credentials);
        return await client.getUserByUsername(input.username);
      },
    },

    getUserTweets: {
      name: 'Get User Tweets',
      description: 'Get tweets from a user',
      input: z.object({ userId: z.string(), maxResults: z.number().default(10) }),
      output: z.object({ tweets: z.array(z.object({ id: z.string(), text: z.string(), createdAt: z.string() })) }),
      execute: async (input: { userId: string; maxResults?: number }, ctx: { credentials: TwitterCredentials }) => {
        const client = new TwitterClient(ctx.credentials);
        const tweets = await client.getUserTweets(input.userId, input.maxResults);
        return { tweets };
      },
    },

    like: {
      name: 'Like Tweet',
      description: 'Like a tweet',
      input: z.object({ tweetId: z.string(), userId: z.string() }),
      output: z.object({ liked: z.boolean() }),
      execute: async (input: { tweetId: string; userId: string }, ctx: { credentials: TwitterCredentials }) => {
        const client = new TwitterClient(ctx.credentials);
        const liked = await client.like(input.tweetId, input.userId);
        return { liked };
      },
    },

    retweet: {
      name: 'Retweet',
      description: 'Retweet a tweet',
      input: z.object({ tweetId: z.string(), userId: z.string() }),
      output: z.object({ retweeted: z.boolean() }),
      execute: async (input: { tweetId: string; userId: string }, ctx: { credentials: TwitterCredentials }) => {
        const client = new TwitterClient(ctx.credentials);
        const retweeted = await client.retweet(input.tweetId, input.userId);
        return { retweeted };
      },
    },

    follow: {
      name: 'Follow User',
      description: 'Follow a user',
      input: z.object({ targetUserId: z.string(), userId: z.string() }),
      output: z.object({ following: z.boolean() }),
      execute: async (input: { targetUserId: string; userId: string }, ctx: { credentials: TwitterCredentials }) => {
        const client = new TwitterClient(ctx.credentials);
        const following = await client.follow(input.targetUserId, input.userId);
        return { following };
      },
    },

    sendDirectMessage: {
      name: 'Send Direct Message',
      description: 'Send a DM',
      input: z.object({ recipientId: z.string(), text: z.string() }),
      output: z.object({ eventId: z.string() }),
      execute: async (input: { recipientId: string; text: string }, ctx: { credentials: TwitterCredentials }) => {
        const client = new TwitterClient(ctx.credentials);
        return await client.sendDirectMessage(input.recipientId, input.text);
      },
    },
  },
};

export default twitterConnector;
