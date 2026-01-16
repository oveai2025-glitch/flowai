/**
 * FlowAtGenAi - Header Component
 * 
 * Top header with search, notifications, and user menu.
 * 
 * @module components/layout/Header
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Search,
  Bell,
  Settings,
  User,
  LogOut,
  ChevronDown,
  HelpCircle,
  ExternalLink,
  CreditCard,
  Command,
  Workflow,
  Bot,
  FileText,
  Clock,
  Zap,
} from 'lucide-react';
import { cn } from '../../lib/utils';

// Command items for palette
const commandItems = [
  { id: 'new-workflow', name: 'Create New Workflow', icon: Workflow, href: '/workflows/new', category: 'Actions' },
  { id: 'new-agent', name: 'Create AI Agent', icon: Bot, href: '/agents/new', category: 'Actions' },
  { id: 'workflows', name: 'Go to Workflows', icon: Workflow, href: '/workflows', category: 'Navigation' },
  { id: 'executions', name: 'Go to Executions', icon: Clock, href: '/executions', category: 'Navigation' },
  { id: 'templates', name: 'Browse Templates', icon: FileText, href: '/templates', category: 'Navigation' },
  { id: 'settings', name: 'Open Settings', icon: Settings, href: '/settings', category: 'Navigation' },
];

// Mock notifications
const mockNotifications = [
  { id: '1', type: 'success', title: 'Workflow Completed', message: 'Email Campaign finished', time: '2 min ago', read: false },
  { id: '2', type: 'error', title: 'Execution Failed', message: 'Data Sync encountered an error', time: '15 min ago', read: false },
  { id: '3', type: 'info', title: 'New Feature', message: 'AI Agents are now available!', time: '1 hour ago', read: true },
];

const Header: React.FC = () => {
  const pathname = usePathname();
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (pathname?.includes('/edit')) return null;

  const unreadCount = mockNotifications.filter((n) => !n.read).length;
  const filteredCommands = searchQuery
    ? commandItems.filter((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : commandItems;

  return (
    <>
      <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6">
        <button
          onClick={() => setShowCommandPalette(true)}
          className="flex items-center gap-3 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-400 min-w-[300px]"
        >
          <Search className="w-4 h-4" />
          <span className="flex-1 text-left text-sm">Search...</span>
          <kbd className="px-2 py-0.5 text-xs bg-gray-700 rounded flex items-center gap-1">
            <Command className="w-3 h-3" />K
          </kbd>
        </button>

        <div className="flex items-center gap-2">
          <Link href="/pricing" className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-lg">
            <Zap className="w-4 h-4" />Upgrade
          </Link>
          <Link href="/help" className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg">
            <HelpCircle className="w-5 h-5" />
          </Link>
          <div className="relative">
            <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
            </button>
            {showNotifications && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                <div className="absolute right-0 top-full mt-2 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                    <h3 className="font-semibold text-white">Notifications</h3>
                    <button className="text-xs text-blue-400">Mark all read</button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {mockNotifications.map((n) => (
                      <div key={n.id} className={cn('px-4 py-3 border-b border-gray-800 last:border-0 hover:bg-gray-800/50', !n.read && 'bg-blue-600/5')}>
                        <p className="text-sm font-medium text-white">{n.title}</p>
                        <p className="text-xs text-gray-400">{n.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{n.time}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="relative">
            <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-2 p-1.5 hover:bg-gray-800 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">JD</div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                <div className="absolute right-0 top-full mt-2 w-56 bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-50">
                  <div className="px-4 py-3 border-b border-gray-800">
                    <p className="text-sm font-medium text-white">John Doe</p>
                    <p className="text-xs text-gray-400">john@example.com</p>
                  </div>
                  <div className="p-1">
                    <Link href="/settings/profile" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg"><User className="w-4 h-4" />Profile</Link>
                    <Link href="/settings/billing" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg"><CreditCard className="w-4 h-4" />Billing</Link>
                    <Link href="/settings" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg"><Settings className="w-4 h-4" />Settings</Link>
                  </div>
                  <div className="p-1 border-t border-gray-800">
                    <button className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-900/20 rounded-lg w-full"><LogOut className="w-4 h-4" />Sign out</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Command Palette */}
      {showCommandPalette && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCommandPalette(false)} />
          <div className="relative w-full max-w-xl bg-gray-900 border border-gray-700 rounded-xl shadow-2xl">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
              <Search className="w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search commands..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none"
                autoFocus
              />
              <kbd className="px-2 py-1 text-xs text-gray-500 bg-gray-800 rounded">ESC</kbd>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {filteredCommands.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setShowCommandPalette(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 text-gray-300"
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
