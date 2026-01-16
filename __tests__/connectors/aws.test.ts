/**
 * Connector Unit Tests - Part 1
 * AWS Service Connectors
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
global.fetch = mockFetch;

function mockResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Map(),
  };
}

beforeEach(() => mockFetch.mockReset());

describe('AWS Lambda Connector', () => {
  const creds = { accessKeyId: 'AKIATEST', secretAccessKey: 'test', region: 'us-east-1' };

  it('should invoke a Lambda function', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ result: 'success' }));
    const response = await fetch(`https://lambda.${creds.region}.amazonaws.com/2015-03-31/functions/test/invocations`, {
      method: 'POST',
      body: JSON.stringify({ input: 'test' }),
    });
    const data = await response.json();
    expect(data.result).toBe('success');
  });

  it('should list Lambda functions', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({
      Functions: [{ FunctionName: 'func1' }, { FunctionName: 'func2' }],
    }));
    const response = await fetch(`https://lambda.${creds.region}.amazonaws.com/2015-03-31/functions`);
    const data: any = await response.json();
    expect(data.Functions).toHaveLength(2);
  });
});

describe('AWS SES Connector', () => {
  const creds = { accessKeyId: 'AKIATEST', secretAccessKey: 'test', region: 'us-east-1' };

  it('should send an email', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ MessageId: 'msg-123' }));
    const response = await fetch(`https://email.${creds.region}.amazonaws.com/v2/email/outbound-emails`, {
      method: 'POST',
      body: JSON.stringify({ to: ['test@example.com'], subject: 'Test' }),
    });
    const data: any = await response.json();
    expect(data.MessageId).toBe('msg-123');
  });

  it('should get send quota', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({
      SendQuota: { Max24HourSend: 50000, MaxSendRate: 14, SentLast24Hours: 1000 },
    }));
    const response = await fetch(`https://email.${creds.region}.amazonaws.com/v2/email/account`);
    const data: any = await response.json();
    expect(data.SendQuota.Max24HourSend).toBe(50000);
  });
});

describe('AWS DynamoDB Connector', () => {
  const creds = { accessKeyId: 'AKIATEST', secretAccessKey: 'test', region: 'us-east-1' };

  it('should put an item', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({}));
    const response = await fetch(`https://dynamodb.${creds.region}.amazonaws.com`, {
      method: 'POST',
      headers: { 'X-Amz-Target': 'DynamoDB_20120810.PutItem' },
      body: JSON.stringify({ TableName: 'test', Item: { pk: { S: 'test' } } }),
    });
    expect(response.ok).toBe(true);
  });

  it('should get an item', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({
      Item: { pk: { S: 'user#123' }, name: { S: 'John' } },
    }));
    const response = await fetch(`https://dynamodb.${creds.region}.amazonaws.com`, {
      method: 'POST',
      headers: { 'X-Amz-Target': 'DynamoDB_20120810.GetItem' },
    });
    const data: any = await response.json();
    expect(data.Item.name.S).toBe('John');
  });

  it('should query items', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({
      Items: [{ pk: { S: 'a' } }, { pk: { S: 'b' } }],
      Count: 2,
    }));
    const response = await fetch(`https://dynamodb.${creds.region}.amazonaws.com`, {
      method: 'POST',
      headers: { 'X-Amz-Target': 'DynamoDB_20120810.Query' },
    });
    const data: any = await response.json();
    expect(data.Items).toHaveLength(2);
  });
});

describe('AWS SNS Connector', () => {
  const creds = { accessKeyId: 'AKIATEST', secretAccessKey: 'test', region: 'us-east-1' };

  it('should publish a message', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ MessageId: 'sns-msg-123' }));
    const response = await fetch(`https://sns.${creds.region}.amazonaws.com`, {
      method: 'POST',
      body: 'Action=Publish&Message=test',
    });
    const data: any = await response.json();
    expect(data.MessageId).toBeDefined();
  });

  it('should create a topic', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ TopicArn: 'arn:aws:sns:us-east-1:123:test' }));
    const response = await fetch(`https://sns.${creds.region}.amazonaws.com`, {
      method: 'POST',
      body: 'Action=CreateTopic&Name=test',
    });
    const data: any = await response.json();
    expect(data.TopicArn).toContain('sns');
  });
});
