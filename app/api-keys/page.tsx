'use client';

import React, { useState } from 'react';
import { 
  Key, 
  Plus, 
  Trash2, 
  Copy, 
  Eye, 
  EyeOff, 
  Shield, 
  Zap, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  RotateCcw
} from 'lucide-react';

/**
 * API Key Management Page
 * 
 * Allows users to:
 * - Generate new API keys (Secret keys)
 * - View and copy public keys
 * - Revoke or rotate existing keys
 * - Set scopes and permissions for keys
 * - Monitor usage per key
 */

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  fullKey?: string;
  status: 'active' | 'revoked' | 'expired';
  created: string;
  lastUsed: string;
  usageCount: number;
  environment: 'production' | 'development';
}

const MOCK_KEYS: ApiKey[] = [
  {
    id: 'key-1',
    name: 'Production Server Sync',
    keyPrefix: 'fl_live_v2_9a82',
    status: 'active',
    created: '2024-01-15T09:00:00Z',
    lastUsed: '2024-03-20T11:45:00Z',
    usageCount: 1254302,
    environment: 'production'
  },
  {
    id: 'key-2',
    name: 'Local Testing',
    keyPrefix: 'fl_test_01j7',
    status: 'active',
    created: '2024-03-01T14:20:00Z',
    lastUsed: '2024-03-19T18:30:00Z',
    usageCount: 450,
    environment: 'development'
  },
  {
    id: 'key-3',
    name: 'Obsolete Integration',
    keyPrefix: 'fl_live_old_7b2p',
    status: 'revoked',
    created: '2023-06-10T11:00:00Z',
    lastUsed: '2023-12-01T09:15:00Z',
    usageCount: 89000,
    environment: 'production'
  }
];

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>(MOCK_KEYS);
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [revealKeyId, setRevealKeyId] = useState<string | null>(null);

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    setShowCopyToast(true);
    setTimeout(() => setShowCopyToast(false), 2000);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 p-8">
      <div className="max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <Key className="text-blue-600" />
              API Keys
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Manage secret keys to access the FlowAtGenAI API programmatically.</p>
          </div>
          <button 
            onClick={() => setShowNewKeyModal(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-blue-500/20 active:scale-95"
          >
            <Plus size={20} />
            Create New Secret Key
          </button>
        </div>

        {/* Security Warning */}
        <div className="mb-8 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 flex items-start gap-4">
          <Shield className="text-amber-500 mt-0.5" size={20} />
          <div>
            <h4 className="text-sm font-bold text-amber-900 dark:text-amber-400">Security Best Practices</h4>
            <p className="text-xs text-amber-800 dark:text-amber-500/80 mt-1 leading-relaxed">
              Never share your secret keys. Store them securely in a password manager or environment variables. 
              If a key is compromised, revoke it immediately and rotate to a new one. 
              Use <span className="font-bold underline cursor-pointer">Development keys</span> for local testing.
            </p>
          </div>
        </div>

        {/* Keys List */}
        <div className="space-y-4">
          {keys.map((key) => (
            <div 
              key={key.id} 
              className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 transition-all ${key.status === 'revoked' ? 'opacity-50 grayscale' : 'hover:border-blue-500/30 hover:shadow-md'}`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 dark:text-white">{key.name}</h3>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter ${key.environment === 'production' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                      {key.environment}
                    </span>
                    {key.status === 'revoked' && (
                      <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">Revoked</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-sm text-slate-500 font-mono bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded">
                      {revealKeyId === key.id ? `${key.keyPrefix}_${Math.random().toString(36).slice(2, 18)}` : `${key.keyPrefix}••••••••••••••••`}
                    </code>
                    <button 
                      onClick={() => setRevealKeyId(revealKeyId === key.id ? null : key.id)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      {revealKeyId === key.id ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button 
                      onClick={() => handleCopy(key.keyPrefix + 'secret_key_mock')}
                      className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-8 md:text-right">
                  <div className="hidden sm:block">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1 md:justify-end">
                      <Zap size={10} /> Usage
                    </p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{key.usageCount.toLocaleString()}</p>
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1 md:justify-end">
                      <Clock size={10} /> Last Used
                    </p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      {new Date(key.lastUsed).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {key.status !== 'revoked' && (
                      <button className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors group relative" title="Rotate Key">
                        <RotateCcw size={18} />
                      </button>
                    )}
                    <button className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete Key">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 text-center p-12 rounded-3xl bg-slate-100 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-800">
          <Zap className="mx-auto text-blue-600 mb-4" size={32} />
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Need to automate?</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
            Get started with our SDKs for Node.js, Python, and Go to integrate FlowAtGenAI directly into your application.
          </p>
          <button className="px-6 py-2 border border-slate-900 dark:border-white rounded-lg text-sm font-bold hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 transition-all">
            Read API Docs
          </button>
        </div>
      </div>

      {/* New Key Modal Overlay (Simplified Illustration) */}
      {showNewKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 space-y-6 animate-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Create Secret Key</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Key Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. My Website Integration"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Environment</label>
                <div className="grid grid-cols-2 gap-3">
                  <button className="py-3 rounded-xl border-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 font-bold text-sm">Production</button>
                  <button className="py-3 rounded-xl border-2 border-slate-200 dark:border-slate-800 text-slate-500 font-bold text-sm">Development</button>
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button 
                onClick={() => setShowNewKeyModal(false)}
                className="flex-1 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg">
                Generate Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copy Notification Toast */}
      {showCopyToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-3 px-6 py-3 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-full shadow-2xl animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 size={18} className="text-emerald-500" />
          <span className="text-sm font-bold">API Key copied to clipboard!</span>
        </div>
      )}
    </div>
  );
}
