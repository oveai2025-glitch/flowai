/**
 * Analytics Dashboard API
 * 
 * Provides aggregated statistics for the main dashboard view.
 * 
 * GET /api/analytics/dashboard?window=24h
 * 
 * Path: app/api/analytics/dashboard/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { AnalyticsService, TimeWindow } from '@/lib/services/analytics-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = req.headers.get('x-org-id');
    const window = (searchParams.get('window') || '24h') as TimeWindow;

    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`[API] Fetching dashboard stats for org ${orgId} (window: ${window})`);

    const stats = await AnalyticsService.getDashboardStats(orgId, window);

    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('[API] Dashboard stats failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics', detail: error.message },
      { status: 500 }
    );
  }
}

/**
 * Endpoint Usage Information:
 * 
 * This endpoint is optimized for speed and uses cached aggregation results 
 * where possible. If real-time accuracy is required for every request, 
 * use the /api/analytics/metrics endpoint with specific filters.
 * 
 * Performance:
 * Typical response time < 50ms for windows up to 30d.
 */
