'use client';

import React, { useState } from 'react';
import { 
  Activity, 
  ShieldCheck, 
  Database, 
  Zap, 
  Server, 
  Cpu, 
  HardDrive, 
  Bell, 
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronRight,
  Info
} from 'lucide-react';

/**
 * System Monitoring & Health Page
 * 
 * Central hub for infrastructure oversight:
 * - Real-time component health status
 * - Resource utilization (CPU, RAM, Disk)
 * - Incident log and resolution tracking
 * - Worker heartbeat monitor
 * - Infrastructure metadata
 */

export default function MonitoringPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const components = [
    { name: 'Core API Gateway', status: 'HEALTHY', latency: '42ms', version: 'v1.4.2' },
    { name: 'PostgreSQL Database', status: 'HEALTHY', latency: '5ms', version: 'v15.3' },
    { name: 'Temporal Orchestrator', status: 'HEALTHY', latency: '12ms', version: 'v1.20.1' },
    { name: 'Redis Cache Layer', status: 'DEGRADED', latency: '145ms', message: 'High connection overhead' },
    { name: 'Worker Fleet (US-East)', status: 'HEALTHY', latency: '8ms', active: 12 },
    { name: 'S3 Object Storage', status: 'HEALTHY', latency: '-', version: 'AWS standard' },
  ];

  const refreshStatus = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1200);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 p-8">
      <div className="max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <Activity className="text-blue-600" />
              System Monitoring
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Live status and infrastructure health report.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-bold border border-emerald-200/50">
              <CheckCircle2 size={14} />
              All Systems Operational
            </div>
            <button 
              onClick={refreshStatus}
              className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:bg-slate-50 transition-all group"
            >
              <RefreshCw size={18} className={`text-slate-500 group-hover:text-blue-600 transition-colors ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
          {/* Component List */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-2">Components</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {components.map((comp, i) => (
                <div key={i} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-start justify-between group hover:border-blue-500/30 transition-all">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${comp.status === 'HEALTHY' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'}`}></div>
                      <span className="font-bold text-slate-900 dark:text-white text-sm">{comp.name}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      {comp.message || `Latency: ${comp.latency} • ${comp.version || comp.active + ' active'}`}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                </div>
              ))}
            </div>

            {/* Incident Log */}
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-2 pt-6">Recent Incidents</h3>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {[
                  { title: 'Redis Connection Spikes', status: 'INVESTIGATING', time: '12 min ago', severity: 'WARNING' },
                  { title: 'Database Migration Fault', status: 'RESOLVED', time: '2 hours ago', severity: 'CRITICAL' },
                  { title: 'Temporal Worker Latency', status: 'MONITORING', time: '5 hours ago', severity: 'INFO' },
                ].map((inc, i) => (
                  <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${inc.severity === 'CRITICAL' ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-500'}`}>
                        {inc.severity === 'CRITICAL' ? <XCircle size={18} /> : <AlertTriangle size={18} />}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">{inc.title}</h4>
                        <div className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-tight">
                          {inc.status} • {inc.time}
                        </div>
                      </div>
                    </div>
                    <button className="text-xs font-bold text-blue-600 border border-blue-600/20 px-3 py-1 rounded-full hover:bg-blue-600 hover:text-white transition-all">Details</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Infrastructure Metrics */}
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-2">Resource Usage</h3>
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-10">
              <ResourceBar label="CPU Load" value={24} icon={Cpu} color="bg-blue-600" />
              <ResourceBar label="Memory Usage" value={68} icon={Zap} color="bg-purple-600" />
              <ResourceBar label="Storage" value={82} icon={HardDrive} color="bg-amber-500" />
              <ResourceBar label="Network I/O" value={12} icon={Activity} color="bg-emerald-500" />
              
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase">Server Metadata</h4>
                  <Server size={14} className="text-slate-300" />
                </div>
                <div className="space-y-3">
                  <MetadataItem label="Region" value="us-east-1a" />
                  <MetadataItem label="Runtime" value="Node.js 20.x" />
                  <MetadataItem label="Architecture" value="x64 / linux" />
                  <MetadataItem label="Uptime" value="12 days, 4 hours" />
                </div>
              </div>
            </div>

            {/* Active Alerts CTA */}
            <div className="p-6 rounded-3xl bg-slate-900 dark:bg-blue-600 text-white shadow-xl flex items-center gap-6 group cursor-pointer relative overflow-hidden">
              <div className="relative z-10">
                <h4 className="font-bold mb-1">Alert Configuration</h4>
                <p className="text-[10px] opacity-70 leading-relaxed">Configure Slack and PagerDuty endpoints for real-time failure notification.</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Bell size={20} />
              </div>
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-8 -mt-8"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Sub-components
// ============================================

function ResourceBar({ label, value, icon: Icon, color }: any) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-slate-400" />
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{label}</span>
        </div>
        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 rounded">{value}%</span>
      </div>
      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${value}%` }}></div>
      </div>
    </div>
  );
}

function MetadataItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-slate-500">{label}</span>
      <span className="font-bold text-slate-900 dark:text-white">{value}</span>
    </div>
  );
}
