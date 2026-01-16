/**
 * AWS Lambda Connector
 * 
 * Invoke AWS Lambda functions from workflows.
 * 
 * @module connectors/aws-lambda
 */

import { z } from 'zod';

interface LambdaCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

class LambdaClient {
  private credentials: LambdaCredentials;
  private endpoint: string;

  constructor(credentials: LambdaCredentials) {
    this.credentials = credentials;
    this.endpoint = `https://lambda.${credentials.region}.amazonaws.com`;
  }

  async invoke(functionName: string, payload: unknown, invocationType: 'RequestResponse' | 'Event' = 'RequestResponse'): Promise<{
    statusCode: number;
    payload: unknown;
    executedVersion: string;
  }> {
    const url = `${this.endpoint}/2015-03-31/functions/${functionName}/invocations`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Amz-Invocation-Type': invocationType,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    
    return {
      statusCode: response.status,
      payload: result,
      executedVersion: response.headers.get('x-amz-executed-version') || '$LATEST',
    };
  }

  async listFunctions(maxItems: number = 50): Promise<Array<{
    functionName: string;
    functionArn: string;
    runtime: string;
    handler: string;
    codeSize: number;
    memorySize: number;
    timeout: number;
    lastModified: string;
  }>> {
    const url = `${this.endpoint}/2015-03-31/functions?MaxItems=${maxItems}`;
    
    const response = await fetch(url, {
      method: 'GET',
    });

    const data = await response.json();
    return data.Functions || [];
  }

  async getFunction(functionName: string): Promise<{
    configuration: {
      functionName: string;
      functionArn: string;
      runtime: string;
      handler: string;
      codeSize: number;
      memorySize: number;
      timeout: number;
    };
    code: {
      repositoryType: string;
      location: string;
    };
  }> {
    const url = `${this.endpoint}/2015-03-31/functions/${functionName}`;
    
    const response = await fetch(url, {
      method: 'GET',
    });

    return await response.json();
  }
}

export const awsLambdaConnector = {
  id: 'aws-lambda',
  name: 'AWS Lambda',
  version: '1.0.0',
  category: 'compute',
  description: 'Invoke AWS Lambda functions',
  color: '#FF9900',
  icon: 'https://cdn.flowatgenai.com/connectors/aws-lambda.svg',
  tags: ['aws', 'lambda', 'serverless', 'functions'],

  authentication: {
    type: 'custom' as const,
    fields: [
      { name: 'accessKeyId', label: 'Access Key ID', type: 'string' as const, required: true },
      { name: 'secretAccessKey', label: 'Secret Access Key', type: 'password' as const, required: true },
      { name: 'region', label: 'Region', type: 'string' as const, required: true, default: 'us-east-1' },
    ],
  },

  actions: {
    invoke: {
      name: 'Invoke Function',
      description: 'Invoke a Lambda function',
      input: z.object({
        functionName: z.string(),
        payload: z.record(z.unknown()),
        invocationType: z.enum(['RequestResponse', 'Event']).default('RequestResponse'),
      }),
      output: z.object({
        statusCode: z.number(),
        payload: z.unknown(),
        executedVersion: z.string(),
      }),
      execute: async (input: { functionName: string; payload: Record<string, unknown>; invocationType?: 'RequestResponse' | 'Event' }, ctx: { credentials: LambdaCredentials }) => {
        const client = new LambdaClient(ctx.credentials);
        return await client.invoke(input.functionName, input.payload, input.invocationType);
      },
    },

    listFunctions: {
      name: 'List Functions',
      description: 'List all Lambda functions',
      input: z.object({
        maxItems: z.number().default(50),
      }),
      output: z.object({
        functions: z.array(z.object({
          functionName: z.string(),
          functionArn: z.string(),
          runtime: z.string(),
          handler: z.string(),
          codeSize: z.number(),
          memorySize: z.number(),
          timeout: z.number(),
        })),
      }),
      execute: async (input: { maxItems?: number }, ctx: { credentials: LambdaCredentials }) => {
        const client = new LambdaClient(ctx.credentials);
        const functions = await client.listFunctions(input.maxItems);
        return { functions };
      },
    },

    getFunction: {
      name: 'Get Function',
      description: 'Get details of a Lambda function',
      input: z.object({
        functionName: z.string(),
      }),
      output: z.object({
        configuration: z.object({
          functionName: z.string(),
          functionArn: z.string(),
          runtime: z.string(),
          handler: z.string(),
          codeSize: z.number(),
          memorySize: z.number(),
          timeout: z.number(),
        }),
      }),
      execute: async (input: { functionName: string }, ctx: { credentials: LambdaCredentials }) => {
        const client = new LambdaClient(ctx.credentials);
        return await client.getFunction(input.functionName);
      },
    },
  },
};

export default awsLambdaConnector;
