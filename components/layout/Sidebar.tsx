/**
 * FlowAtGenAi - Sidebar Component
 * 
 * Main navigation sidebar with links to all sections.
 * 
 * @module components/layout/Sidebar
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Workflow,
  History,
  Key,
  Settings,
  Store,
  Users,
  BarChart3,
  HelpCircle,
  Zap,
  Bot,
  Clock,
  Webhook,
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
} from 'lucide-react';
import { cn } from '../../lib/utils';

// ============================================
// Navigation Items
// ============================================

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string | number;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const navigation: NavSection[] = [
  {
    items: [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard },
      { name: 'Workflows', href: '/workflows', icon: Workflow },
      { name: 'Executions', href: '/executions', icon: History },
    ],
  },
  {
    title: 'Automation',
    items: [
      { name: 'AI Agents', href: '/agents', icon: Bot },
      { name: 'Schedules', href: '/schedules', icon: Clock },
      { name: 'Webhooks', href: '/webhooks', icon: Webhook },
    ],
  },
  {
    title: 'Resources',
    items: [
      { name: 'Templates', href: '/templates', icon: Store },
      { name: 'Credentials', href: '/credentials', icon: Key },
      { name: 'Connectors', href: '/connectors', icon: Zap },
    ],
  },
  {
    title: 'Settings',
    items: [
      { name: 'Team', href: '/team', icon: Users },
      { name: 'Analytics', href: '/analytics', icon: BarChart3 },
      { name: 'Settings', href: '/settings', icon: Settings },
    ],
  },
];

// ============================================
// Navigation Link
// ============================================

interface NavLinkProps {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
}

const NavLink: React.FC<NavLinkProps> = ({ item, isActive, collapsed }) => {
  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
        'hover:bg-gray-800/50',
        isActive && 'bg-blue-600/10 text-blue-400 hover:bg-blue-600/20',
        !isActive && 'text-gray-400 hover:text-white',
        collapsed && 'justify-center'
      )}
      title={collapsed ? item.name : undefined}
    >
      <item.icon className={cn('w-5 h-5 flex-shrink-0', isActive && 'text-blue-400')} />
      {!collapsed && (
        <>
          <span className="flex-1 text-sm font-medium">{item.name}</span>
          {item.badge && (
            <span className="px-2 py-0.5 text-xs font-medium bg-blue-600 text-white rounded-full">
              {item.badge}
            </span>
          )}
        </>
      )}
    </Link>
  );
};

// ============================================
// Main Sidebar
// ============================================

const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Don't show sidebar on editor page
  if (pathname?.includes('/workflows/') && pathname?.includes('/edit')) {
    return null;
  }

  return (
    <aside
      className={cn(
        'flex flex-col bg-gray-900 border-r border-gray-800 transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white">FlowAtGenAi</span>
          </Link>
        )}
        {collapsed && (
          <div className="w-8 h-8 mx-auto rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
        )}
      </div>

      {/* New Workflow Button */}
      <div className="p-3">
        <Link
          href="/workflows/new"
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors',
            collapsed && 'justify-center px-2'
          )}
        >
          <Plus className="w-5 h-5" />
          {!collapsed && <span>New Workflow</span>}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {navigation.map((section, sectionIdx) => (
          <div key={sectionIdx} className="mb-4">
            {section.title && !collapsed && (
              <h3 className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {section.title}
              </h3>
            )}
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  isActive={pathname === item.href}
                  collapsed={collapsed}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Help & Collapse */}
      <div className="p-3 border-t border-gray-800 space-y-2">
        <Link
          href="/help"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all',
            collapsed && 'justify-center'
          )}
        >
          <HelpCircle className="w-5 h-5" />
          {!collapsed && <span className="text-sm font-medium">Help & Support</span>}
        </Link>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all w-full',
            collapsed && 'justify-center'
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
