/**
 * System Health API
 * 
 * Provides real-time health status of all platform dependencies.
 * 
 * GET /api/monitoring/health
 * 
 * Path: app/api/monitoring/health/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { MonitoringService } from '@/lib/services/monitoring-service';

export async function GET(req: NextRequest) {
  try {
    const orgId = req.headers.get('x-org-id');
    // Health checks are often restricted to internal monitors or platform admins
    
    console.log('[API] Executing recursive system health check');

    const healthResults = await MonitoringService.performFullHealthCheck();
    const metrics = MonitoringService.getSystemMetrics();

    const isHealthy = healthResults.every(r => r.status === 'HEALTHY');

    return NextResponse.json({
      status: isHealthy ? 'OK' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      components: healthResults,
      infrastructure: metrics,
    }, {
      status: isHealthy ? 200 : 207 // 207 Multi-Status for partial success
    });
  } catch (error: any) {
    console.error('[API] Health check critical failure:', error);
    return NextResponse.json({
      status: 'CRITICAL',
      error: error.message,
    }, { status: 500 });
  }
}

/**
 * Monitoring Architecture:
 * 
 * 1. Low-Latency Responses
 * This endpoint is designed to respond within 500ms to avoid blocking 
 * infrastructure load balancers.
 * 
 * 2. Caching
 * In a real production environment, heavy checks (like deep DB audits) 
 * should be cached for 10-30 seconds.
 */
