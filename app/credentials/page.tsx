/**
 * FlowAtGenAi - Credentials Page
 * 
 * Manage API keys and OAuth connections for connectors.
 * 
 * @module app/credentials/page
 */

'use client';

import React, { useState } from 'react';
import {
  Search,
  Plus,
  Key,
  Shield,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  Edit,
  Trash2,
  RefreshCw,
  ExternalLink,
  Lock,
  Unlock,
  AlertTriangle,
  Clock,
  Zap,
} from 'lucide-react';
import { cn, formatRelativeTime } from '../../lib/utils';

// ============================================
// Types
// ============================================

interface Credential {
  id: string;
  name: string;
  connectorId: string;
  connectorName: string;
  connectorIcon: string;
  connectorColor: string;
  authType: 'apiKey' | 'oauth2' | 'basic' | 'bearer';
  status: 'valid' | 'invalid' | 'expired' | 'pending';
  lastUsed?: string;
  lastValidated?: string;
  createdAt: string;
  usedInWorkflows: number;
}

// ============================================
// Mock Data
// ============================================

const mockCredentials: Credential[] = [
  {
    id: 'cred_1',
    name: 'Production Slack',
    connectorId: 'slack',
    connectorName: 'Slack',
    connectorIcon: '💬',
    connectorColor: '#4A154B',
    authType: 'oauth2',
    status: 'valid',
    lastUsed: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    lastValidated: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    usedInWorkflows: 8,
  },
  {
    id: 'cred_2',
    name: 'OpenAI API Key',
    connectorId: 'openai',
    connectorName: 'OpenAI',
    connectorIcon: '🤖',
    connectorColor: '#10A37F',
    authType: 'apiKey',
    status: 'valid',
    lastUsed: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    lastValidated: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    usedInWorkflows: 12,
  },
  {
    id: 'cred_3',
    name: 'Stripe Live',
    connectorId: 'stripe',
    connectorName: 'Stripe',
    connectorIcon: '💳',
    connectorColor: '#635BFF',
    authType: 'apiKey',
    status: 'valid',
    lastUsed: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    lastValidated: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    usedInWorkflows: 5,
  },
  {
    id: 'cred_4',
    name: 'GitHub Personal Token',
    connectorId: 'github',
    connectorName: 'GitHub',
    connectorIcon: '🐙',
    connectorColor: '#24292F',
    authType: 'bearer',
    status: 'expired',
    lastUsed: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    lastValidated: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    usedInWorkflows: 3,
  },
  {
    id: 'cred_5',
    name: 'HubSpot Marketing',
    connectorId: 'hubspot',
    connectorName: 'HubSpot',
    connectorIcon: '🧡',
    connectorColor: '#FF7A59',
    authType: 'oauth2',
    status: 'invalid',
    lastUsed: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    lastValidated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    usedInWorkflows: 2,
  },
  {
    id: 'cred_6',
    name: 'Google Sheets Service',
    connectorId: 'google-sheets',
    connectorName: 'Google Sheets',
    connectorIcon: '📊',
    connectorColor: '#34A853',
    authType: 'oauth2',
    status: 'valid',
    lastUsed: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    lastValidated: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    usedInWorkflows: 6,
  },
];

const connectorsList = [
  { id: 'slack', name: 'Slack', icon: '💬', color: '#4A154B', authType: 'oauth2' },
  { id: 'openai', name: 'OpenAI', icon: '🤖', color: '#10A37F', authType: 'apiKey' },
  { id: 'stripe', name: 'Stripe', icon: '💳', color: '#635BFF', authType: 'apiKey' },
  { id: 'github', name: 'GitHub', icon: '🐙', color: '#24292F', authType: 'oauth2' },
  { id: 'hubspot', name: 'HubSpot', icon: '🧡', color: '#FF7A59', authType: 'oauth2' },
  { id: 'google-sheets', name: 'Google Sheets', icon: '📊', color: '#34A853', authType: 'oauth2' },
  { id: 'notion', name: 'Notion', icon: '📝', color: '#000000', authType: 'apiKey' },
  { id: 'airtable', name: 'Airtable', icon: '📋', color: '#18BFFF', authType: 'apiKey' },
  { id: 'discord', name: 'Discord', icon: '🎮', color: '#5865F2', authType: 'apiKey' },
  { id: 'twilio', name: 'Twilio', icon: '📱', color: '#F22F46', authType: 'basic' },
];

// ============================================
// Status Badge
// ============================================

const StatusBadge: React.FC<{ status: Credential['status'] }> = ({ status }) => {
  const config = {
    valid: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-400/10', label: 'Valid' },
    invalid: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10', label: 'Invalid' },
    expired: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-400/10', label: 'Expired' },
    pending: { icon: Clock, color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Pending' },
  };

  const { icon: Icon, color, bg, label } = config[status];

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium', bg, color)}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
};

// ============================================
// Auth Type Badge
// ============================================

const AuthTypeBadge: React.FC<{ authType: Credential['authType'] }> = ({ authType }) => {
  const labels = {
    apiKey: 'API Key',
    oauth2: 'OAuth 2.0',
    basic: 'Basic Auth',
    bearer: 'Bearer Token',
  };

  return (
    <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
      {labels[authType]}
    </span>
  );
};

// ============================================
// Credential Card
// ============================================

interface CredentialCardProps {
  credential: Credential;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onRefresh: (id: string) => void;
}

const CredentialCard: React.FC<CredentialCardProps> = ({
  credential,
  onEdit,
  onDelete,
  onRefresh,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
            style={{ backgroundColor: `${credential.connectorColor}20` }}
          >
            {credential.connectorIcon}
          </div>
          <div>
            <h3 className="text-sm font-medium text-white">{credential.name}</h3>
            <p className="text-xs text-gray-500">{credential.connectorName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={credential.status} />
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-40 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 py-1">
                  <button
                    onClick={() => { onEdit(credential.id); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700"
                  >
                    <Edit className="w-4 h-4" /> Edit
                  </button>
                  <button
                    onClick={() => { onRefresh(credential.id); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700"
                  >
                    <RefreshCw className="w-4 h-4" /> Validate
                  </button>
                  <div className="my-1 border-t border-gray-700" />
                  <button
                    onClick={() => { onDelete(credential.id); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-900/30"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <AuthTypeBadge authType={credential.authType} />
        <span className="text-xs text-gray-500">•</span>
        <span className="text-xs text-gray-500">
          Used in {credential.usedInWorkflows} workflow{credential.usedInWorkflows !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-800 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {credential.lastUsed ? `Used ${formatRelativeTime(credential.lastUsed)}` : 'Never used'}
        </span>
        {credential.status !== 'valid' && (
          <button
            onClick={() => onRefresh(credential.id)}
            className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
          >
            <RefreshCw className="w-3 h-3" />
            Reconnect
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================
// Add Credential Modal
// ============================================

interface AddCredentialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (connectorId: string, name: string) => void;
}

const AddCredentialModal: React.FC<AddCredentialModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [selectedConnector, setSelectedConnector] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredConnectors = connectorsList.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = () => {
    if (selectedConnector && name) {
      onAdd(selectedConnector, name);
      onClose();
      setSelectedConnector(null);
      setName('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-gray-900 border border-gray-700 rounded-xl shadow-2xl">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Add Credential</h2>
          <p className="text-sm text-gray-400 mt-1">Connect to a new service</p>
        </div>

        <div className="p-4">
          {!selectedConnector ? (
            <>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search connectors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {filteredConnectors.map((connector) => (
                  <button
                    key={connector.id}
                    onClick={() => setSelectedConnector(connector.id)}
                    className="flex items-center gap-3 p-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors text-left"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                      style={{ backgroundColor: `${connector.color}20` }}
                    >
                      {connector.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{connector.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{connector.authType}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Credential Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Production Slack"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-blue-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-400">Secure Connection</p>
                    <p className="text-xs text-blue-300 mt-1">
                      Your credentials are encrypted and stored securely. We never store plain-text passwords.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-4 border-t border-gray-800">
          {selectedConnector ? (
            <>
              <button
                onClick={() => setSelectedConnector(null)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleAdd}
                disabled={!name}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Connect
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors ml-auto"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// Main Page
// ============================================

export default function CredentialsPage() {
  const [credentials, setCredentials] = useState(mockCredentials);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const handleEdit = (id: string) => {
    console.log('Edit credential:', id);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this credential?')) {
      setCredentials((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const handleRefresh = (id: string) => {
    console.log('Refresh credential:', id);
  };

  const handleAdd = (connectorId: string, name: string) => {
    const connector = connectorsList.find((c) => c.id === connectorId);
    if (connector) {
      const newCredential: Credential = {
        id: `cred_${Date.now()}`,
        name,
        connectorId,
        connectorName: connector.name,
        connectorIcon: connector.icon,
        connectorColor: connector.color,
        authType: connector.authType as Credential['authType'],
        status: 'valid',
        createdAt: new Date().toISOString(),
        usedInWorkflows: 0,
      };
      setCredentials((prev) => [newCredential, ...prev]);
    }
  };

  const filteredCredentials = credentials.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.connectorName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const validCount = credentials.filter((c) => c.status === 'valid').length;
  const invalidCount = credentials.filter((c) => c.status !== 'valid').length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Credentials</h1>
          <p className="text-gray-400 mt-1">Manage your API keys and OAuth connections</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Credential
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center">
              <Key className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{credentials.length}</p>
              <p className="text-sm text-gray-400">Total Credentials</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-400">{validCount}</p>
              <p className="text-sm text-gray-400">Valid</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-900/30 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-400">{invalidCount}</p>
              <p className="text-sm text-gray-400">Need Attention</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search credentials..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Credentials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCredentials.map((credential) => (
          <CredentialCard
            key={credential.id}
            credential={credential}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onRefresh={handleRefresh}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredCredentials.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
            <Key className="w-8 h-8 text-gray-600" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No credentials found</h3>
          <p className="text-gray-500 mb-4">
            {searchQuery
              ? 'Try adjusting your search'
              : 'Add your first credential to get started'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Credential
            </button>
          )}
        </div>
      )}

      {/* Add Modal */}
      <AddCredentialModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAdd}
      />
    </div>
  );
}
