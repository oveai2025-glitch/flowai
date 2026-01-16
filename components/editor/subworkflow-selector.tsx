/**
 * Subworkflow Selector Component
 * 
 * An interactive modal for selecting and configuring nested workflows:
 * - Workflow Browser: List all active workflows with search and filters.
 * - Input/Output Mapping: Define how data flows between parent and child.
 * - Execution Settings: Configure retry logic and failure propagation.
 * - Blueprint Preview: Visual summary of the selected subworkflow.
 * 
 * @module components/editor/subworkflow-selector
 */

'use client';

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Workflow, 
  ArrowRightLeft, 
  Settings2, 
  ShieldAlert,
  ChevronRight,
  GitCommit,
  Info,
  Layers,
  Check,
  AlertCircle
} from 'lucide-react';

interface WorkflowRef {
  id: string;
  name: string;
  description: string;
  status: string;
  lastEdited: string;
}

export default function SubworkflowSelector() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'browse' | 'mapping' | 'config'>('browse');

  const workflows: WorkflowRef[] = [
    { id: 'wf-1', name: 'Stripe Payment Processor', description: 'Handles webhook and invoice generation', status: 'ACTIVE', lastEdited: '2h ago' },
    { id: 'wf-2', name: 'HubSpot Lead Enrichment', description: 'Enriches lead data via Clearbit and LinkedIn', status: 'ACTIVE', lastEdited: '1d ago' },
    { id: 'wf-3', name: 'Slack Notification Engine', description: 'Unified routing for Slack alerts', status: 'ACTIVE', lastEdited: '5h ago' },
    { id: 'wf-4', name: 'Database Cleanup Utility', description: 'Archives old audit logs and metrics', status: 'PAUSED', lastEdited: '3d ago' },
  ];

  const filteredWorkflows = useMemo(() => 
    workflows.filter(w => w.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [searchTerm]
  );

  return (
    <div className="flex flex-col h-[600px] w-full bg-white dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 dark:border-slate-900 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg text-white">
            <Layers size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Subworkflow Node Configuration</h2>
            <p className="text-xs text-slate-500 font-medium">Link another workflow to execute as a nested step.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-1 bg-slate-200/50 dark:bg-slate-800 rounded-xl">
          <TabButton id="browse" current={activeTab} onClick={setActiveTab} icon={Search} label="Browse" />
          <TabButton id="mapping" current={activeTab} onClick={setActiveTab} icon={ArrowRightLeft} label="Mapping" />
          <TabButton id="config" current={activeTab} onClick={setActiveTab} icon={Settings2} label="Settings" />
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'browse' && (
            <div className="space-y-6">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                <input 
                  type="text"
                  placeholder="Search active workflows..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 pl-12 pr-6 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                {filteredWorkflows.map((wf) => (
                  <button
                    key={wf.id}
                    onClick={() => setSelectedId(wf.id)}
                    className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between text-left group ${
                      selectedId === wf.id 
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 shadow-sm' 
                      : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${selectedId === wf.id ? 'bg-blue-600 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}>
                        <Workflow size={18} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white tracking-tight">{wf.name}</h4>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{wf.description}</p>
                      </div>
                    </div>
                    {selectedId === wf.id ? (
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center">
                        <Check size={14} />
                      </div>
                    ) : (
                      <ChevronRight size={18} className="text-slate-300 group-hover:text-slate-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'mapping' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <ArrowRightLeft size={14} />
                    Input Mapping
                  </h3>
                  <button className="text-[11px] font-bold text-blue-600 hover:underline">Auto-detect Fields</button>
                </div>
                <div className="space-y-3">
                  <MappingField label="customerId" type="string" expression="{{ customer.id }}" />
                  <MappingField label="amount" type="number" expression="{{ checkout.total }}" />
                  <MappingField label="metadata" type="object" expression="{{ metadata }}" />
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                  <GitCommit size={14} />
                  Output Mapping
                </h3>
                <div className="space-y-3">
                  <MappingField label="invoiceId" type="string" expression="result.invoice_id" isOutput />
                  <MappingField label="status" type="string" expression="result.status" isOutput />
                </div>
              </section>
            </div>
          )}

          {activeTab === 'config' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm text-blue-600">
                    <ShieldAlert size={20} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-2">Error Propagation Policy</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed mb-6">Define what happens to the parent workflow if this subworkflow fails.</p>
                    
                    <div className="space-y-3">
                      <PolicyOption 
                        title="Fail Parent Immediate" 
                        desc="Stop parent execution and mark as FAILED" 
                        active={true}
                      />
                      <PolicyOption 
                        title="Handle Gracefully" 
                        desc="Continue parent execution with error details" 
                      />
                      <PolicyOption 
                        title="Retry Subworkflow" 
                        desc="Apply custom retry policy to the child run" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 flex items-start gap-4">
                <Info size={18} className="text-amber-600 mt-1" />
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                  Subworkflows are limited to a recursion depth of <span className="font-bold underline">5</span> levels to prevent circular deadlocks.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Sidebar */}
        <div className="w-72 border-l border-slate-100 dark:border-slate-900 p-6 bg-slate-50/30 dark:bg-slate-900/20">
          <div className="h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center">
                  <Layers size={14} />
                </div>
                <h4 className="font-bold text-xs uppercase text-slate-400 tracking-widest">Blueprint Summary</h4>
              </div>
              
              {!selectedId ? (
                <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-center p-6 bg-white dark:bg-slate-900">
                  <Workflow size={32} className="text-slate-200 mb-4" />
                  <p className="text-xs text-slate-400 leading-relaxed italic">Select a workflow to preview the execution logic.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-2">Metrics</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                        <div className="text-xs font-black text-slate-900 dark:text-white">99.8%</div>
                        <div className="text-[9px] text-slate-400">Success</div>
                      </div>
                      <div className="text-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                        <div className="text-xs font-black text-slate-900 dark:text-white">1.2s</div>
                        <div className="text-[9px] text-slate-400">Avg Run</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h5 className="text-[10px] uppercase font-bold text-slate-400">Nodes Overview</h5>
                    <div className="space-y-2">
                      <MiniNode label="HTTP Request" count={3} />
                      <MiniNode label="Filter Logic" count={2} />
                      <MiniNode label="Stripe Connector" count={1} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button className={`w-full py-4 rounded-2xl font-bold text-sm transition-all shadow-lg ${
              selectedId 
              ? 'bg-blue-600 text-white shadow-blue-500/20 hover:scale-[1.02] active:scale-95' 
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
            }`}>
              Confirm Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Helper Components
// ============================================

function TabButton({ id, current, onClick, icon: Icon, label }: any) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
        current === id 
        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' 
        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-400'
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

function MappingField({ label, type, expression, isOutput = false }: any) {
  return (
    <div className="group bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-blue-500/30 transition-all flex items-center justify-between gap-6">
      <div className="flex items-center gap-4 flex-1">
        <div className={`p-2 rounded-lg text-xs font-mono font-bold ${isOutput ? 'bg-indigo-50 text-indigo-600' : 'bg-blue-50 text-blue-600'}`}>
          {label}
        </div>
        <div className="text-[11px] text-slate-400 italic">{type}</div>
        <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1"></div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
          {expression}
        </div>
        {!isOutput && <ArrowRightLeft size={14} className="text-slate-300" />}
      </div>
    </div>
  );
}

function MiniNode({ label, count }: any) {
  return (
    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
      <span className="truncate pr-2">{label}</span>
      <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 rounded">{count}</span>
    </div>
  );
}

function PolicyOption({ title, desc, active = false }: any) {
  return (
    <div className={`p-4 rounded-2xl border transition-all cursor-pointer ${
      active 
      ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500/50' 
      : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-300'
    }`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold text-slate-900 dark:text-white">{title}</span>
        {active && <Check size={14} className="text-blue-600" />}
      </div>
      <p className="text-[10px] text-slate-500 leading-tight">{desc}</p>
    </div>
  );
}
