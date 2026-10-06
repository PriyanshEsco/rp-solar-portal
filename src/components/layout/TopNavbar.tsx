'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Bell,
  LogOut,
  User as UserIcon,
  Menu,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { StatusBadge } from '../ui/StatusBadge';

export interface TopNavbarProps {
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  onToggleMobileSidebar: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  onOpenSearch,
  onOpenNotifications,
  onToggleMobileSidebar,
}) => {
  const { user, profile, scope, logout } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header
      style={{
        height: 'var(--topbar-height)',
        backgroundColor: 'var(--rp-white)',
        borderBottom: '1px solid var(--rp-gray-200)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}
    >
      {/* Left: Mobile Toggle & Global Search trigger */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
        <button
          onClick={onToggleMobileSidebar}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--rp-charcoal-700)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: 'var(--radius-xs)',
            display: 'none', // Overridden in mobile view via media query/inline
          }}
          className="mobile-burger-btn"
          aria-label="Toggle navigation drawer"
        >
          <Menu size={20} />
        </button>

        {/* Global Search Bar Trigger */}
        <button
          onClick={onOpenSearch}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            maxWidth: '360px',
            height: '38px',
            padding: '0 14px',
            backgroundColor: 'var(--rp-gray-100)',
            border: '1px solid var(--rp-gray-300)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--rp-gray-500)',
            cursor: 'pointer',
            fontSize: '0.8125rem',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Search size={16} style={{ color: 'var(--rp-gray-400)' }} />
            <span>Search projects, customers, invoices...</span>
          </div>
          <kbd
            style={{
              padding: '2px 6px',
              fontSize: '0.6875rem',
              fontWeight: 600,
              backgroundColor: 'var(--rp-white)',
              border: '1px solid var(--rp-gray-300)',
              borderRadius: 'var(--radius-xs)',
              color: 'var(--rp-charcoal-700)',
            }}
          >
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Notifications & User Menu */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>

        {/* Notifications Icon Button */}
        <button
          onClick={onOpenNotifications}
          style={{
            position: 'relative',
            background: 'none',
            border: '1px solid var(--rp-gray-300)',
            borderRadius: 'var(--radius-sm)',
            width: '38px',
            height: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--rp-charcoal-700)',
            cursor: 'pointer',
            backgroundColor: 'var(--rp-white)',
          }}
          aria-label="Open notifications"
        >
          <Bell size={18} />
          <span
            style={{
              position: 'absolute',
              top: '6px',
              right: '6px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'var(--rp-solar-orange)',
              border: '1.5px solid var(--rp-white)',
            }}
          />
        </button>

        {/* User Profile Menu */}
        <div ref={profileRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '4px 10px 4px 4px',
              backgroundColor: 'transparent',
              border: '1px solid var(--rp-gray-300)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: 'var(--rp-green-primary)',
                color: 'var(--rp-white)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.8125rem',
              }}
            >
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--rp-charcoal-900)', lineHeight: 1.1 }}>
                {profile?.firstName ? `${profile.firstName} ${profile.lastName}` : user?.username}
              </span>
              <span style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-500)', textTransform: 'capitalize' }}>
                {user?.userType?.replace('_', ' ')}
              </span>
            </div>
            <ChevronDown size={14} style={{ color: 'var(--rp-gray-400)' }} />
          </button>

          {/* Profile Dropdown */}
          {isProfileOpen && (
            <div
              className="animate-fade-in"
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 6px)',
                width: '260px',
                backgroundColor: 'var(--rp-white)',
                border: '1px solid var(--rp-gray-200)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                padding: '6px',
                zIndex: 100,
              }}
            >
              <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--rp-gray-100)' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--rp-charcoal-900)' }}>
                  {profile?.firstName ? `${profile.firstName} ${profile.lastName}` : user?.username}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--rp-gray-500)' }}>{user?.email}</div>
                <div style={{ marginTop: '6px' }}>
                  <StatusBadge status={user?.userType || 'active'} />
                </div>
              </div>

              <div style={{ padding: '6px 0' }}>
                <div style={{ padding: '6px 12px', fontSize: '0.75rem', color: 'var(--rp-gray-500)' }}>
                  <strong>Region:</strong> {scope?.region || 'Global'}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--rp-gray-100)', paddingTop: '6px' }}>
                <button
                  onClick={() => logout()}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    color: 'var(--rp-danger)',
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    borderRadius: 'var(--radius-xs)',
                  }}
                >
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
