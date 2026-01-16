/**
 * FlowAtGenAi - Authentication Utilities
 * 
 * JWT-based authentication with RBAC.
 * 
 * @module lib/auth
 */

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// ============================================
// Types
// ============================================

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  emailVerified: boolean;
}

export interface OrganizationUser {
  userId: string;
  organizationId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  permissions: string[];
}

export interface Session {
  user: User;
  organizationId: string;
  role: OrganizationUser['role'];
  permissions: string[];
  expiresAt: number;
}

export interface JWTPayload {
  sub: string; // User ID
  email: string;
  name: string;
  org: string; // Organization ID
  role: string;
  permissions: string[];
  iat: number;
  exp: number;
}

// ============================================
// Configuration
// ============================================

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const BCRYPT_ROUNDS = 12;

// ============================================
// Password Utilities
// ============================================

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ============================================
// JWT Utilities
// ============================================

export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
}

// ============================================
// Session Utilities
// ============================================

export function getSessionFromToken(token: string): Session | null {
  const payload = verifyToken(token);
  if (!payload) return null;

  return {
    user: {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      emailVerified: true,
    },
    organizationId: payload.org,
    role: payload.role as OrganizationUser['role'],
    permissions: payload.permissions,
    expiresAt: payload.exp * 1000,
  };
}

export function getTokenFromRequest(request: NextRequest): string | null {
  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Check cookies
  const cookieToken = request.cookies.get('auth_token')?.value;
  if (cookieToken) {
    return cookieToken;
  }

  // Check query parameter (for webhooks)
  const queryToken = request.nextUrl.searchParams.get('token');
  if (queryToken) {
    return queryToken;
  }

  return null;
}

// ============================================
// RBAC Permissions
// ============================================

export const PERMISSIONS = {
  // Workflow permissions
  'workflow:read': 'View workflows',
  'workflow:create': 'Create workflows',
  'workflow:update': 'Edit workflows',
  'workflow:delete': 'Delete workflows',
  'workflow:execute': 'Run workflows',
  
  // Execution permissions
  'execution:read': 'View executions',
  'execution:cancel': 'Cancel executions',
  'execution:retry': 'Retry executions',
  
  // Credential permissions
  'credential:read': 'View credentials',
  'credential:create': 'Create credentials',
  'credential:update': 'Edit credentials',
  'credential:delete': 'Delete credentials',
  
  // Team permissions
  'team:read': 'View team members',
  'team:invite': 'Invite team members',
  'team:remove': 'Remove team members',
  'team:role': 'Change member roles',
  
  // Settings permissions
  'settings:read': 'View settings',
  'settings:update': 'Update settings',
  'billing:read': 'View billing',
  'billing:update': 'Manage billing',
  
  // Admin permissions
  'admin:all': 'Full admin access',
} as const;

export type Permission = keyof typeof PERMISSIONS;

export const ROLE_PERMISSIONS: Record<OrganizationUser['role'], Permission[]> = {
  owner: Object.keys(PERMISSIONS) as Permission[],
  admin: [
    'workflow:read', 'workflow:create', 'workflow:update', 'workflow:delete', 'workflow:execute',
    'execution:read', 'execution:cancel', 'execution:retry',
    'credential:read', 'credential:create', 'credential:update', 'credential:delete',
    'team:read', 'team:invite', 'team:remove',
    'settings:read', 'settings:update',
    'billing:read',
  ],
  member: [
    'workflow:read', 'workflow:create', 'workflow:update', 'workflow:execute',
    'execution:read', 'execution:cancel', 'execution:retry',
    'credential:read', 'credential:create',
    'team:read',
    'settings:read',
  ],
  viewer: [
    'workflow:read',
    'execution:read',
    'team:read',
    'settings:read',
  ],
};

export function hasPermission(session: Session, permission: Permission): boolean {
  if (session.role === 'owner') return true;
  if (session.permissions.includes('admin:all')) return true;
  return session.permissions.includes(permission);
}

export function requirePermission(session: Session, permission: Permission): void {
  if (!hasPermission(session, permission)) {
    throw new Error(`Permission denied: ${permission}`);
  }
}

// ============================================
// Middleware
// ============================================

export interface AuthenticatedRequest extends NextRequest {
  session: Session;
}

export function withAuth(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>,
  options?: {
    requiredPermissions?: Permission[];
  }
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const token = getTokenFromRequest(request);

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const session = getSessionFromToken(token);

    if (!session) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Check required permissions
    if (options?.requiredPermissions) {
      for (const permission of options.requiredPermissions) {
        if (!hasPermission(session, permission)) {
          return NextResponse.json(
            { error: `Permission denied: ${permission}` },
            { status: 403 }
          );
        }
      }
    }

    // Add session to request
    (request as AuthenticatedRequest).session = session;

    return handler(request as AuthenticatedRequest);
  };
}

// ============================================
// API Key Authentication
// ============================================

export interface ApiKey {
  id: string;
  organizationId: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  scopes: string[];
  rateLimit: number;
  isActive: boolean;
  lastUsedAt?: Date;
  expiresAt?: Date;
}

export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const prefix = 'sk_live_';
  const randomPart = Array.from({ length: 32 }, () =>
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      .charAt(Math.floor(Math.random() * 62))
  ).join('');
  
  const key = prefix + randomPart;
  const hash = bcrypt.hashSync(key, 10);

  return { key, prefix, hash };
}

export async function verifyApiKey(key: string, hash: string): Promise<boolean> {
  return bcrypt.compare(key, hash);
}

// ============================================
// OAuth State Management
// ============================================

const oauthStates = new Map<string, { redirectUrl: string; expiresAt: number }>();

export function generateOAuthState(redirectUrl: string): string {
  const state = Array.from({ length: 32 }, () =>
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      .charAt(Math.floor(Math.random() * 62))
  ).join('');

  oauthStates.set(state, {
    redirectUrl,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
  });

  return state;
}

export function verifyOAuthState(state: string): string | null {
  const data = oauthStates.get(state);
  
  if (!data || data.expiresAt < Date.now()) {
    oauthStates.delete(state);
    return null;
  }

  oauthStates.delete(state);
  return data.redirectUrl;
}

// ============================================
// Rate Limiting
// ============================================

const rateLimits = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const data = rateLimits.get(key);

  if (!data || data.resetAt < now) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (data.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: data.resetAt };
  }

  data.count++;
  return { allowed: true, remaining: limit - data.count, resetAt: data.resetAt };
}

export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  options: {
    limit: number;
    windowMs: number;
    keyGenerator?: (request: NextRequest) => string;
  }
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const key = options.keyGenerator
      ? options.keyGenerator(request)
      : request.ip || 'unknown';

    const { allowed, remaining, resetAt } = checkRateLimit(
      key,
      options.limit,
      options.windowMs
    );

    const headers = {
      'X-RateLimit-Limit': String(options.limit),
      'X-RateLimit-Remaining': String(remaining),
      'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
    };

    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers }
      );
    }

    const response = await handler(request);
    
    // Add rate limit headers to response
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  };
}
