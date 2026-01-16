'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  AlertCircle, 
  Activity, 
  Calendar, 
  CheckCircle2, 
  Zap,
  Play,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  RefreshCw,
  MoreVertical
} from 'lucide-react';

/**
 * Analytics Dashboard Page
 * 
 * Provides a high-level overview of system and workflow performance:
 * - Key Performance Indicators (KPIs)
 * - Time-series charts for execution volume
 * - Performance distribution (Success vs Failure)
 * - Top performing workflows list
 * - Resource consumption tracking
 */

export default function AnalyticsDashboard() {
  const [window, setWindow] = useState('24h');
  const [isLoading, setIsLoading] = useState(false);

  const stats = [
    { label: 'Total Executions', value: '12,450', change: '+12.5%', trend: 'up', icon: Play, color: 'text-blue-600' },
    { label: 'Success Rate', value: '98.2%', change: '+0.4%', trend: 'up', icon: CheckCircle2, color: 'text-emerald-600' },
    { label: 'Avg. Latency', value: '450ms', change: '-15ms', trend: 'up', icon: Clock, color: 'text-amber-600' },
    { label: 'Credits Used', value: '45.2k', change: '+5.2%', trend: 'down', icon: Zap, color: 'text-purple-600' },
  ];

  const refreshData = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 800);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 p-8">
      <div className="max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <BarChart3 className="text-blue-600" />
              Workflow Analytics
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Real-time performance metrics and operational insights.</p>
          </div>
          <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            {['1h', '24h', '7d', '30d'].map((w) => (
              <button
                key={w}
                onClick={() => setWindow(w)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  window === w 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
                }`}
              >
                {w}
              </button>
            ))}
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1"></div>
            <button 
              onClick={refreshData}
              className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {stats.map((stat, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm group hover:border-blue-500/30 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl bg-slate-50 dark:bg-slate-800 ${stat.color}`}>
                  <stat.icon size={20} />
                </div>
                <div className={`flex items-center gap-1 text-xs font-bold ${stat.trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {stat.trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {stat.change}
                </div>
              </div>
              <h3 className="text-sm font-medium text-slate-500 mb-1">{stat.label}</h3>
              <div className="text-3xl font-bold text-slate-900 dark:text-white">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Execution Volume</h3>
                <p className="text-sm text-slate-500">Total runs across all workflows</p>
              </div>
              <TrendingUp className="text-blue-600" size={24} />
            </div>
            
            {/* Simulated Chart Visualization */}
            <div className="h-64 flex items-end justify-between gap-2 px-2">
              {[40, 65, 45, 90, 60, 75, 55, 100, 85, 70, 95, 80].map((h, i) => (
                <div key={i} className="flex-1 group relative">
                  <div 
                    className="w-full bg-blue-100 dark:bg-blue-900/40 rounded-t-lg transition-all group-hover:bg-blue-600" 
                    style={{ height: `${h}%` }}
                  ></div>
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {h * 12} runs
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-4 px-2">
              {['12 AM', '4 AM', '8 AM', '12 PM', '4 PM', '8 PM'].map((t) => (
                <span key={t} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t}</span>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Failure Distribution</h3>
            <p className="text-sm text-slate-500 mb-8">Top error categories for failed runs</p>
            
            <div className="space-y-6">
              {[
                { label: 'Timeout', value: 45, color: 'bg-amber-500' },
                { label: 'Auth Failure', value: 25, color: 'bg-rose-500' },
                { label: 'Rate Limit', value: 20, color: 'bg-indigo-500' },
                { label: 'Other', value: 10, color: 'bg-slate-300' },
              ].map((item, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                    <span className="text-slate-500">{item.label}</span>
                    <span className="text-slate-900 dark:text-white">{item.value}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color}`} style={{ width: `${item.value}%` }}></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-start gap-4">
              <AlertCircle size={20} className="text-blue-600 mt-1" />
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                <span className="font-bold text-slate-900 dark:text-white">Tip:</span> Your timeout rate is 12% higher than last week. Consider increasing node retry limits for network-heavy connectors.
              </p>
            </div>
          </div>
        </div>

        {/* Top Workflows Table */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Active Workflows</h3>
              <p className="text-sm text-slate-500 mt-1">Showing performance for your most active automations.</p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
              <Filter size={16} />
              Customize View
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                  <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Workflow</th>
                  <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Executions</th>
                  <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Success</th>
                  <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Avg. Time</th>
                  <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last Run</th>
                  <th className="px-8 py-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {[
                  { name: 'Stripe Invoice Processor', runs: 5642, success: 99.8, time: '1.2s', last: '2 min ago' },
                  { name: 'HubSpot Contact Sync', runs: 3210, success: 97.5, time: '0.8s', last: '15 min ago' },
                  { name: 'Slack Notify Bot', runs: 1250, success: 100, time: '0.3s', last: '1 hour ago' },
                  { name: 'S3 Database Backup', runs: 45, success: 100, time: '12.4s', last: '12 hours ago' },
                ].map((row, i) => (
                  <tr key={i} className="group hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center">
                          <Activity size={20} />
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white">{row.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{row.runs.toLocaleString()}</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: `${row.success}%` }}></div>
                        </div>
                        <span className="text-xs font-bold text-emerald-600">{row.success}%</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-sm font-mono text-slate-500">{row.time}</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-xs text-slate-400">{row.last}</span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button className="p-2 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-600 transition-all">
                        <ArrowUpRight size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-6 bg-slate-50 dark:bg-slate-800/30 text-center">
            <button className="text-sm font-bold text-blue-600 hover:underline">View All Active Workflows</button>
          </div>
        </div>
      </div>
    </div>
  );
}
