'use client';

import React, { useState } from 'react';
import { 
  Building2, 
  Users, 
  CreditCard, 
  Settings, 
  ShieldCheck, 
  Bell, 
  Globe, 
  Mail, 
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

/**
 * Organization Settings Page
 * 
 * Provides management for:
 * - Basic Profile (Name, Logo, Domain)
 * - Team Management (Members, Roles, Invites)
 * - Billing & Subscription (Plans, Invoices, Payment Methods)
 * - Security & Access (SSO, API Keys)
 * - Notifications & Alerts
 */

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const tabs = [
    { id: 'profile', name: 'Profile', icon: Building2 },
    { id: 'members', name: 'Members', icon: Users },
    { id: 'billing', name: 'Billing', icon: CreditCard },
    { id: 'security', name: 'Security', icon: ShieldCheck },
    { id: 'notifications', name: 'Notifications', icon: Bell },
  ];

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }, 1000);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
      <div className="max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Organization Settings</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage your organization's members, billing, and global configuration.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <div className="w-full md:w-64 flex flex-col gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <tab.icon size={18} />
                {tab.name}
              </button>
            ))}
          </div>

          {/* Main Content */}
          <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-8">
              {activeTab === 'profile' && <ProfileTab handleSave={handleSave} isSaving={isSaving} />}
              {activeTab === 'members' && <MembersTab />}
              {activeTab === 'billing' && <BillingTab />}
              {activeTab === 'security' && <SecurityTab />}
              {activeTab === 'notifications' && <NotificationsTab />}
            </div>
            
            {/* Footer Actions */}
            <div className="px-8 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                <Save size={16} />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Success Toast */}
      {showToast && (
        <div className="fixed bottom-8 right-8 flex items-center gap-3 px-6 py-4 bg-emerald-500 text-white rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 size={20} />
          <span className="font-medium">Settings saved successfully!</span>
        </div>
      )}
    </div>
  );
}

// ============================================
// Sub-components for Tabs
// ============================================

function ProfileTab({ handleSave, isSaving }: any) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
      <div>
        <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">General Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Organization Name</label>
            <input 
              type="text" 
              defaultValue="Acme Global Inc."
              className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Organization Domain</label>
            <div className="flex items-center">
              <span className="px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-r-0 border-slate-200 dark:border-slate-800 rounded-l-lg text-slate-500 text-sm">https://</span>
              <input 
                type="text" 
                defaultValue="acme.flowatgenai.com"
                className="flex-1 px-4 py-2 rounded-r-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
        <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">Branding</h2>
        <div className="flex items-start gap-6">
          <div className="w-24 h-24 rounded-2xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400 overflow-hidden relative group">
            <Building2 size={32} />
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <span className="text-[10px] text-white font-bold uppercase">Change</span>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Organization Logo</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
              We recommend an image of at least 400x400. PNG or JPG preferred. Max size 2MB.
            </p>
            <button className="text-xs font-semibold text-blue-600 hover:text-blue-700 mt-2">Upload new image</button>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
        <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">Admin Contact</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400">
            <Mail size={16} />
            <span className="text-sm">admin@acme.com</span>
          </div>
          <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400">
            <Globe size={16} />
            <span className="text-sm">United States (EST)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MembersTab() {
  const members = [
    { name: 'John Doe', email: 'john@acme.com', role: 'Owner', status: 'Active' },
    { name: 'Sarah Smith', email: 'sarah@acme.com', role: 'Admin', status: 'Active' },
    { name: 'Mike Johnson', email: 'mike@acme.com', role: 'Developer', status: 'Active' },
    { name: 'Alex Rivera', email: 'alex@external.com', role: 'Viewer', status: 'Invited' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
      <div className="flex justify-between items-center bg-transparent">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Team Members</h2>
          <p className="text-sm text-slate-500">Manage who has access to your organization.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} />
          Invite Member
        </button>
      </div>

      <div className="overflow-hidden border border-slate-200 dark:border-slate-800 rounded-xl">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {members.map((member, i) => (
              <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-white">{member.name}</div>
                      <div className="text-xs text-slate-500">{member.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs font-medium px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {member.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
                    member.status === 'Active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  }`}>
                    {member.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BillingTab() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
      <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg overflow-hidden relative">
        <div className="relative z-10">
          <div className="text-xs font-bold uppercase tracking-widest opacity-80 mb-2">Current Plan</div>
          <h3 className="text-2xl font-bold mb-4">Enterprise Growth</h3>
          <div className="flex items-baseline gap-1 mb-6">
            <span className="text-3xl font-bold">$499</span>
            <span className="text-sm opacity-80">/ month</span>
          </div>
          <button className="px-6 py-2 bg-white text-blue-600 rounded-lg text-sm font-bold hover:bg-slate-100 transition-colors shadow-sm">
            Upgrade Plan
          </button>
        </div>
        <CreditCard className="absolute -bottom-4 -right-4 w-48 h-48 opacity-10 rotate-12" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
          <h3 className="font-bold flex items-center gap-2">
            <CreditCard size={18} className="text-slate-400" />
            Payment Method
          </h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-6 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 flex items-center justify-center italic font-bold text-[8px] text-slate-400">VISA</div>
              <div className="text-sm font-medium">•••• 4242</div>
            </div>
            <button className="text-xs font-bold text-blue-600">Update</button>
          </div>
        </div>

        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
          <h3 className="font-bold flex items-center gap-2">
            <CheckCircle2 size={18} className="text-slate-400" />
            Auto-renew
          </h3>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">Next billing date: April 1, 2024</span>
            <div className="w-10 h-5 bg-blue-600 rounded-full relative p-1 cursor-pointer">
              <div className="w-3 h-3 bg-white rounded-full absolute right-1"></div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold mb-4">Recent Invoices</h3>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400">
                  <Mail size={16} />
                </div>
                <div>
                  <div className="text-sm font-bold">Invoice #INV-2024-00{i}</div>
                  <div className="text-xs text-slate-500">March {i}, 2024</div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <span className="text-sm font-bold">$499.00</span>
                <span className="text-[10px] font-bold text-emerald-500 uppercase">Paid</span>
                <button className="p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Save size={14} className="text-slate-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SecurityTab() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
      <div>
        <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">Security & Auth</h2>
        <div className="space-y-4">
          <div className="p-5 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h4 className="font-bold text-sm">Two-Factor Authentication</h4>
                <p className="text-xs text-slate-500 mt-1">Add an extra layer of security to your organization's accounts.</p>
              </div>
            </div>
            <button className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Configure
            </button>
          </div>

          <div className="p-5 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between opacity-60 grayscale cursor-not-allowed">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg">
                <Globe size={20} />
              </div>
              <div>
                <h4 className="font-bold text-sm flex items-center gap-2">
                  SSO / SAML 
                  <span className="text-[10px] bg-blue-100 text-blue-600 px-1 rounded font-bold uppercase">Pro</span>
                </h4>
                <p className="text-xs text-slate-500 mt-1">Allow members to log in with Okta, Azure AD, or Google Workspace.</p>
              </div>
            </div>
            <button disabled className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold opacity-50">
              Enable
            </button>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
        <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">API Keys</h2>
        <p className="text-sm text-slate-500 mb-6 font-normal">Use these keys to authenticate external requests to the FlowAtGenAI API.</p>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <input 
              type="password" 
              readOnly 
              value="fk_live_092384092384092384023"
              className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono"
            />
            <button className="px-4 py-2 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-lg text-xs font-bold transition-opacity hover:opacity-90">
              Copy
            </button>
          </div>
          <p className="text-[10px] text-slate-400">Created on Jan 12, 2024. Never share this key on public forums.</p>
        </div>
      </div>
    </div>
  );
}

function NotificationsTab() {
  const settings = [
    { title: 'Workflow Executions', desc: 'Get notified when a workflow starts or stops.', enabled: true },
    { title: 'Failure Alerts', desc: 'Urgent alerts when a production workflow fails.', enabled: true },
    { title: 'Member Joins', desc: 'When a new person accepts an invite to your organization.', enabled: false },
    { title: 'Billing Reports', desc: 'Monthly summary of usage and spend.', enabled: true },
    { title: 'Security Logs', desc: 'Weekly audit log report of suspicious activity.', enabled: false },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
      <div>
        <h2 className="text-xl font-semibold mb-2 text-slate-900 dark:text-white">Email Notifications</h2>
        <p className="text-sm text-slate-500 mb-6">Choose what updates you want to receive via email.</p>
      </div>

      <div className="space-y-1">
        {settings.map((item, i) => (
          <div key={i} className="flex items-center justify-between py-4 border-b border-slate-100 dark:border-slate-800 last:border-0 group">
            <div className="flex items-start gap-4">
              <div className={`p-2 rounded-lg ${item.enabled ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'}`}>
                <Bell size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">{item.title}</h4>
                <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
              </div>
            </div>
            <div className={`w-10 h-5 rounded-full relative p-1 cursor-pointer transition-colors ${item.enabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
              <div className={`w-3 h-3 bg-white rounded-full absolute ${item.enabled ? 'right-1' : 'left-1'} transition-all`}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
