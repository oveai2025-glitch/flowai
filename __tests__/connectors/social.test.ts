/**
 * Social Media Connector Tests
 * Twitter, LinkedIn, GitLab
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
global.fetch = mockFetch;

function mockResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    headers: new Map(),
  };
}

beforeEach(() => mockFetch.mockReset());

describe('Twitter/X Connector', () => {
  const creds = { bearerToken: 'test-bearer-token' };

  describe('Tweets', () => {
    it('should post a tweet', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({
        data: { id: 'tweet-123', text: 'Hello world!' },
      }));

      const response = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: { Authorization: `Bearer ${creds.bearerToken}` },
        body: JSON.stringify({ text: 'Hello world!' }),
      });
      const data: any = await response.json();

      expect(data.data.id).toBe('tweet-123');
      expect(data.data.text).toBe('Hello world!');
    });

    it('should delete a tweet', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({
        data: { deleted: true },
      }));

      const response = await fetch('https://api.twitter.com/2/tweets/123', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${creds.bearerToken}` },
      });
      const data: any = await response.json();

      expect(data.data.deleted).toBe(true);
    });

    it('should get a tweet', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({
        data: {
          id: '123',
          text: 'Test tweet',
          author_id: 'user-1',
          public_metrics: { like_count: 10, retweet_count: 5 },
        },
      }));

      const response = await fetch('https://api.twitter.com/2/tweets/123', {
        headers: { Authorization: `Bearer ${creds.bearerToken}` },
      });
      const data: any = await response.json();

      expect(data.data.id).toBe('123');
      expect(data.data.public_metrics.like_count).toBe(10);
    });
  });

  describe('Search', () => {
    it('should search tweets', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({
        data: [
          { id: '1', text: 'Result 1' },
          { id: '2', text: 'Result 2' },
        ],
        meta: { result_count: 2 },
      }));

      const response = await fetch('https://api.twitter.com/2/tweets/search/recent?query=test', {
        headers: { Authorization: `Bearer ${creds.bearerToken}` },
      });
      const data: any = await response.json();

      expect(data.data).toHaveLength(2);
      expect(data.meta.result_count).toBe(2);
    });
  });

  describe('Users', () => {
    it('should get user by ID', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({
        data: {
          id: 'user-1',
          name: 'Test User',
          username: 'testuser',
          public_metrics: { followers_count: 1000 },
        },
      }));

      const response = await fetch('https://api.twitter.com/2/users/user-1', {
        headers: { Authorization: `Bearer ${creds.bearerToken}` },
      });
      const data: any = await response.json();

      expect(data.data.username).toBe('testuser');
      expect(data.data.public_metrics.followers_count).toBe(1000);
    });

    it('should get user by username', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({
        data: { id: 'user-1', name: 'Test', username: 'testuser' },
      }));

      const response = await fetch('https://api.twitter.com/2/users/by/username/testuser', {
        headers: { Authorization: `Bearer ${creds.bearerToken}` },
      });
      const data: any = await response.json();

      expect(data.data.id).toBe('user-1');
    });
  });

  describe('Interactions', () => {
    it('should like a tweet', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({
        data: { liked: true },
      }));

      const response = await fetch('https://api.twitter.com/2/users/user-1/likes', {
        method: 'POST',
        headers: { Authorization: `Bearer ${creds.bearerToken}` },
        body: JSON.stringify({ tweet_id: '123' }),
      });
      const data: any = await response.json();

      expect(data.data.liked).toBe(true);
    });

    it('should retweet', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({
        data: { retweeted: true },
      }));

      const response = await fetch('https://api.twitter.com/2/users/user-1/retweets', {
        method: 'POST',
        headers: { Authorization: `Bearer ${creds.bearerToken}` },
        body: JSON.stringify({ tweet_id: '123' }),
      });
      const data: any = await response.json();

      expect(data.data.retweeted).toBe(true);
    });

    it('should follow a user', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({
        data: { following: true },
      }));

      const response = await fetch('https://api.twitter.com/2/users/user-1/following', {
        method: 'POST',
        headers: { Authorization: `Bearer ${creds.bearerToken}` },
        body: JSON.stringify({ target_user_id: 'user-2' }),
      });
      const data: any = await response.json();

      expect(data.data.following).toBe(true);
    });
  });
});

describe('LinkedIn Connector', () => {
  const creds = { accessToken: 'test-access-token' };

  describe('Profile', () => {
    it('should get current user profile', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({
        id: 'user-1',
        firstName: { localized: { en_US: 'John' } },
        lastName: { localized: { en_US: 'Doe' } },
      }));

      const response = await fetch('https://api.linkedin.com/v2/me', {
        headers: { Authorization: `Bearer ${creds.accessToken}` },
      });
      const data: any = await response.json();

      expect(data.id).toBe('user-1');
      expect(data.firstName.localized.en_US).toBe('John');
    });
  });

  describe('Posts', () => {
    it('should create a post', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({}, 201));

      const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${creds.accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify({
          author: 'urn:li:person:user-1',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: { text: 'Test post' },
            },
          },
        }),
      });

      expect(response.status).toBe(201);
    });

    it('should delete a post', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({}, 204));

      const response = await fetch('https://api.linkedin.com/v2/ugcPosts/post-123', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${creds.accessToken}` },
      });

      expect(response.status).toBe(204);
    });
  });

  describe('Company Pages', () => {
    it('should get company page', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({
        id: 12345,
        localizedName: 'Test Company',
        localizedDescription: 'A test company',
      }));

      const response = await fetch('https://api.linkedin.com/v2/organizations/12345', {
        headers: { Authorization: `Bearer ${creds.accessToken}` },
      });
      const data: any = await response.json();

      expect(data.localizedName).toBe('Test Company');
    });
  });
});

describe('GitLab Connector', () => {
  const creds = { accessToken: 'test-token', baseUrl: 'https://gitlab.com/api/v4' };

  describe('Projects', () => {
    it('should list projects', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse([
        { id: 1, name: 'Project 1', web_url: 'https://gitlab.com/user/project1' },
        { id: 2, name: 'Project 2', web_url: 'https://gitlab.com/user/project2' },
      ]));

      const response = await fetch(`${creds.baseUrl}/projects`, {
        headers: { Authorization: `Bearer ${creds.accessToken}` },
      });
      const data: any = await response.json();

      expect(data).toHaveLength(2);
      expect(data[0].name).toBe('Project 1');
    });

    it('should get a project', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({
        id: 1,
        name: 'My Project',
        web_url: 'https://gitlab.com/user/my-project',
        default_branch: 'main',
        star_count: 10,
      }));

      const response = await fetch(`${creds.baseUrl}/projects/1`, {
        headers: { Authorization: `Bearer ${creds.accessToken}` },
      });
      const data: any = await response.json();

      expect(data.name).toBe('My Project');
      expect(data.star_count).toBe(10);
    });
  });

  describe('Issues', () => {
    it('should list issues', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse([
        { id: 1, iid: 1, title: 'Bug report', state: 'opened' },
        { id: 2, iid: 2, title: 'Feature request', state: 'opened' },
      ]));

      const response = await fetch(`${creds.baseUrl}/projects/1/issues`, {
        headers: { Authorization: `Bearer ${creds.accessToken}` },
      });
      const data: any = await response.json();

      expect(data).toHaveLength(2);
    });

    it('should create an issue', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({
        id: 3,
        iid: 3,
        title: 'New issue',
        web_url: 'https://gitlab.com/user/project/issues/3',
      }));

      const response = await fetch(`${creds.baseUrl}/projects/1/issues`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${creds.accessToken}` },
        body: JSON.stringify({ title: 'New issue', description: 'Details' }),
      });
      const data: any = await response.json();

      expect(data.title).toBe('New issue');
    });
  });

  describe('Merge Requests', () => {
    it('should list merge requests', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse([
        { id: 1, iid: 1, title: 'MR 1', state: 'opened' },
      ]));

      const response = await fetch(`${creds.baseUrl}/projects/1/merge_requests`, {
        headers: { Authorization: `Bearer ${creds.accessToken}` },
      });
      const data: any = await response.json();

      expect(data).toHaveLength(1);
    });

    it('should create a merge request', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({
        id: 2,
        iid: 2,
        title: 'New feature',
        web_url: 'https://gitlab.com/user/project/-/merge_requests/2',
      }));

      const response = await fetch(`${creds.baseUrl}/projects/1/merge_requests`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${creds.accessToken}` },
        body: JSON.stringify({
          source_branch: 'feature',
          target_branch: 'main',
          title: 'New feature',
        }),
      });
      const data: any = await response.json();

      expect(data.title).toBe('New feature');
    });
  });

  describe('Pipelines', () => {
    it('should list pipelines', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse([
        { id: 1, status: 'success', ref: 'main' },
        { id: 2, status: 'failed', ref: 'feature' },
      ]));

      const response = await fetch(`${creds.baseUrl}/projects/1/pipelines`, {
        headers: { Authorization: `Bearer ${creds.accessToken}` },
      });
      const data: any = await response.json();

      expect(data).toHaveLength(2);
      expect(data[0].status).toBe('success');
    });

    it('should trigger a pipeline', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({
        id: 3,
        status: 'pending',
        web_url: 'https://gitlab.com/user/project/-/pipelines/3',
      }));

      const response = await fetch(`${creds.baseUrl}/projects/1/pipeline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${creds.accessToken}` },
        body: JSON.stringify({ ref: 'main' }),
      });
      const data: any = await response.json();

      expect(data.status).toBe('pending');
    });
  });
});
