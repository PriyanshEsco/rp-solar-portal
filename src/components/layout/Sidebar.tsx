'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sun,
  LayoutDashboard,
  FolderKanban,
  Users,
  CreditCard,
  Wrench,
  BadgePercent,
  FileText,
  BarChart3,
  ShieldCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  UserCog,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: any;
  badge?: string;
  roleRequired?: string[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen = false,
  onMobileClose,
}) => {
  const pathname = usePathname();
  const { user } = useAuth();

  const navItems: NavItem[] = [
    { label: 'Operations Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Solar Projects (26 Stages)', href: '/projects', icon: FolderKanban, badge: '26' },
    { label: 'Customer 360 & Accounts', href: '/customers', icon: Users },
    { label: 'Team & IAM Directory', href: '/users', icon: UserCog, badge: 'IAM', roleRequired: ['super_admin', 'admin'] },
    { label: 'Payments & Ledgers', href: '/payments', icon: CreditCard },
    { label: 'Field Installation & QA', href: '/installation', icon: Wrench },
    { label: 'Subsidy & PM Surya Ghar', href: '/subsidies', icon: BadgePercent },
    { label: 'Secure Document Vault', href: '/documents', icon: FileText },
    { label: 'Executive Reports & Tracker', href: '/reports', icon: BarChart3, roleRequired: ['super_admin', 'admin'] },
    { label: 'Immutable Audit Logs', href: '/audit-logs', icon: ShieldCheck, roleRequired: ['super_admin', 'admin', 'employee'] },
  ];

  const filteredNavItems = navItems.filter((item) => {
    if (!item.roleRequired) return true;
    return user && item.roleRequired.includes(user.userType);
  });

  return (
    <aside
      style={{
        width: isCollapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)',
        backgroundColor: 'var(--rp-green-dark)',
        color: 'var(--rp-white)',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        flexShrink: 0,
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          height: 'var(--topbar-height)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          padding: isCollapsed ? '0' : '0 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: '#ffffff',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              overflow: 'hidden',
            }}
          >
            <img
              src="/images/rp-solar-logo.jpeg"
              alt="R.P. Solar Solution Logo"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
          {!isCollapsed && (
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 800, letterSpacing: '0.04em', color: 'var(--rp-white)' }}>
                R.P. SOLAR
              </div>
              <div style={{ fontSize: '0.6875rem', color: '#86efac', fontWeight: 600, letterSpacing: '0.02em' }}>
                SOLUTIONS PVT. LTD.
              </div>
            </div>
          )}
        </div>

        {!isCollapsed && (
          <button
            onClick={onToggleCollapse}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.5)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label="Collapse sidebar"
          >
            <ChevronLeft size={18} />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <div style={{ flex: 1, padding: '16px 10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {filteredNavItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'space-between',
                padding: '9px 12px',
                borderRadius: 'var(--radius-sm)',
                textDecoration: 'none',
                color: isActive ? 'var(--rp-white)' : 'rgba(255, 255, 255, 0.72)',
                backgroundColor: isActive ? 'var(--rp-green-primary)' : 'transparent',
                border: isActive ? '1px solid var(--rp-green-light)' : '1px solid transparent',
                fontSize: '0.8125rem',
                fontWeight: isActive ? 600 : 500,
                transition: 'all 0.15s ease',
              }}
              title={isCollapsed ? item.label : undefined}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Icon size={18} style={{ color: isActive ? 'var(--rp-solar-yellow)' : 'rgba(255, 255, 255, 0.7)' }} />
                {!isCollapsed && <span>{item.label}</span>}
              </div>

              {!isCollapsed && item.badge && (
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                    color: 'var(--rp-solar-yellow)',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                  }}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Footer / Expand Button for Collapsed State */}
      {isCollapsed && (
        <div style={{ padding: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={onToggleCollapse}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.6)',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label="Expand sidebar"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Active Region / Branch Footer */}
      {!isCollapsed && (
        <div
          style={{
            padding: '14px 16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(0, 0, 0, 0.15)',
            fontSize: '0.75rem',
          }}
        >
          <div style={{ color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', fontSize: '0.6875rem', fontWeight: 600 }}>
            Operational Scope
          </div>
          <div style={{ color: 'var(--rp-white)', fontWeight: 600, marginTop: '2px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {user?.userType === 'super_admin' ? 'All Pan-India Nodes' : user?.email}
          </div>
        </div>
      )}
    </aside>
  );
};
