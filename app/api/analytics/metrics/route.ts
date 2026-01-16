/**
 * Time-Series Metrics API
 * 
 * Returns historical data points for specific metrics, suitable for graphing.
 * 
 * GET /api/analytics/metrics?type=execution_count&window=7d
 * 
 * Path: app/api/analytics/metrics/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { AnalyticsService, MetricType, TimeWindow } from '@/lib/services/analytics-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = req.headers.get('x-org-id');
    const type = searchParams.get('type') as MetricType;
    const window = (searchParams.get('window') || '24h') as TimeWindow;

    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!type) return NextResponse.json({ error: 'Metric type is required' }, { status: 400 });

    console.log(`[API] Fetching time-series for ${type} (window: ${window})`);

    const data = await AnalyticsService.getTimeSeriesData(orgId, type, window);

    return NextResponse.json({
      metric: type,
      window,
      data,
    });
  } catch (error: any) {
    console.error('[API] Metric fetch failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metric data', detail: error.message },
      { status: 500 }
    );
  }
}

/**
 * Data Format Documentation:
 * 
 * The response contains a list of data points:
 * {
 *   "metric": "execution_count",
 *   "window": "24h",
 *   "data": [
 *     { "time": "2024-03-20T10:00:00Z", "value": 142 },
 *     { "time": "2024-03-20T11:00:00Z", "value": 158 }
 *   ]
 * }
 * 
 * Visualization Tip:
 * Use 'Linear' interpolation for execution counts and 'Monotone' for latency.
 */
