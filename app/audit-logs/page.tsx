'use client';

import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  History, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  ChevronRight, 
  Calendar,
  User,
  Activity,
  ArrowUpDown
} from 'lucide-react';

/**
 * Audit Log Viewer Page
 * 
 * Provides a comprehensive history of all system events:
 * - Workflow creations, updates, and deletions
 * - Execution starts and stops
 * - Credential access and modifications
 * - Member invitations and role changes
 * - Billing events
 */

interface AuditLog {
  id: string;
  event: string;
  actor: { name: string; email: string };
  target: string;
  status: 'success' | 'failure' | 'warning' | 'info';
  timestamp: string;
  details: any;
}

const MOCK_LOGS: AuditLog[] = [
  {
    id: 'log-1',
    event: 'WORKFLOW_UPDATED',
    actor: { name: 'John Doe', email: 'john@acme.com' },
    target: 'Order Processing Pipeline',
    status: 'success',
    timestamp: '2024-03-20T14:30:00Z',
    details: { changes: { nodes: 12, edges: 15 } }
  },
  {
    id: 'log-2',
    event: 'CREDENTIAL_ACCESSED',
    actor: { name: 'Sarah Smith', email: 'sarah@acme.com' },
    target: 'AWS Production Keys',
    status: 'info',
    timestamp: '2024-03-20T14:25:00Z',
    details: { ip: '192.168.1.105', userAgent: 'Mozilla/5.0...' }
  },
  {
    id: 'log-3',
    event: 'EXECUTION_FAILED',
    actor: { name: 'System', email: 'system@flowatgenai.com' },
    target: 'Nightly Sync',
    status: 'failure',
    timestamp: '2024-03-20T14:10:00Z',
    details: { error: 'Connection timeout', nodeId: 'node-sync-1' }
  },
  {
    id: 'log-4',
    event: 'MEMBER_INVITED',
    actor: { name: 'John Doe', email: 'john@acme.com' },
    target: 'alex@external.com',
    status: 'success',
    timestamp: '2024-03-20T13:45:00Z',
    details: { role: 'Viewer' }
  },
  {
    id: 'log-5',
    event: 'BILLING_UPDATED',
    actor: { name: 'Sarah Smith', email: 'sarah@acme.com' },
    target: 'Subscription Plan',
    status: 'warning',
    timestamp: '2024-03-20T12:00:00Z',
    details: { oldPlan: 'Free', newPlan: 'Enterprise' }
  }
];

export default function AuditLogsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 p-8">
      <div className="max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <History className="text-blue-600" />
              Audit Logs
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Track every action and event across your organization.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-medium bg-white dark:bg-slate-900 hover:bg-slate-50 transition-colors">
              <Download size={16} />
              Export CSV
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              <Calendar size={16} />
              Last 30 Days
            </button>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by event, actor, or target..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <select className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 appearance-none focus:ring-2 focus:ring-blue-500 outline-none transition-all">
              <option>All Event Types</option>
              <option>Workflow</option>
              <option>Security</option>
              <option>Members</option>
              <option>Billing</option>
            </select>
          </div>
          <div className="relative">
            <Activity className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <select className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 appearance-none focus:ring-2 focus:ring-blue-500 outline-none transition-all">
              <option>All Statuses</option>
              <option>Success</option>
              <option>Failure</option>
              <option>Warning</option>
            </select>
          </div>
        </div>

        {/* Main Table & Detail View */}
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
                      <div className="flex items-center gap-2 cursor-pointer hover:text-blue-600 transition-colors">
                        Event <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Actor</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Target</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {MOCK_LOGS.map((log) => (
                    <tr 
                      key={log.id} 
                      onClick={() => setSelectedLog(log)}
                      className={`hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer transition-colors ${selectedLog?.id === log.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                    >
                      <td className="px-6 py-5">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{log.event.replace(/_/g, ' ')}</span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-400">
                            {log.actor.name === 'System' ? 'S' : log.actor.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-900 dark:text-white">{log.actor.name}</div>
                            <div className="text-xs text-slate-500">{log.actor.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">{log.target}</span>
                      </td>
                      <td className="px-6 py-5">
                        <StatusBadge status={log.status} />
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-xs text-slate-400 font-mono">
                          {new Date(log.timestamp).toLocaleString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="p-6 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-sm text-slate-500">Showing 1 to 5 of 1,240 events</span>
              <div className="flex gap-2">
                <button className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-sm font-medium hover:bg-white transition-colors disabled:opacity-50" disabled>Previous</button>
                <button className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-sm font-medium hover:bg-white transition-colors">Next</button>
              </div>
            </div>
          </div>

          {/* Details Panel */}
          {selectedLog && (
            <div className="w-full lg:w-96 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in slide-in-from-right-8 duration-300">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 dark:text-white">Event Details</h3>
                <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-600">
                  <ChevronRight size={20} />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Event Metadata</h4>
                  <div className="space-y-3">
                    <DetailItem label="Event ID" value={selectedLog.id} mono />
                    <DetailItem label="Full Type" value={selectedLog.event} />
                    <DetailItem label="IP Address" value={selectedLog.details.ip || 'Local Network'} mono />
                    <DetailItem label="Timestamp" value={new Date(selectedLog.timestamp).toISOString()} mono />
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Raw Data</h4>
                  <div className="bg-slate-950 rounded-xl p-4 overflow-x-auto">
                    <pre className="text-[11px] text-emerald-400 font-mono">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                </div>

                <div className="pt-6">
                  <button className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                    <Activity size={16} />
                    View Related Workflow
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Helpers
// ============================================

function StatusBadge({ status }: { status: AuditLog['status'] }) {
  const styles = {
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200/50',
    failure: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200/50',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200/50',
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200/50',
  };

  const Icons = {
    success: CheckCircle,
    failure: AlertTriangle,
    warning: AlertTriangle,
    info: Info,
  };

  const Icon = Icons[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${styles[status]}`}>
      <Icon size={12} />
      {status}
    </span>
  );
}

function DetailItem({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium text-slate-500">{label}</span>
      <span className={`text-xs text-slate-900 dark:text-white font-medium truncate ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  );
}
