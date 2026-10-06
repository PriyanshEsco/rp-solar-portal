'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { TopNavbar } from './TopNavbar';
import { GlobalSearchModal } from './GlobalSearchModal';
import { NotificationDrawer } from './NotificationDrawer';
import ProtectedRoute from '../ProtectedRoute';

export interface AppShellProps {
  children: React.ReactNode;
  allowedRoles?: any[];
}

export const AppShell: React.FC<AppShellProps> = ({ children, allowedRoles }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Global Cmd+K keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--rp-gray-50)' }}>
        
        {/* Desktop & Tablet Sidebar */}
        <div className="desktop-sidebar">
          <Sidebar
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
        </div>

        {/* Mobile Drawer Overlay */}
        {isMobileSidebarOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              zIndex: 1000,
              display: 'flex',
            }}
            onClick={() => setIsMobileSidebarOpen(false)}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <Sidebar
                isCollapsed={false}
                onToggleCollapse={() => {}}
                isMobileOpen={true}
                onMobileClose={() => setIsMobileSidebarOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Main Layout Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <TopNavbar
            onOpenSearch={() => setIsSearchOpen(true)}
            onOpenNotifications={() => setIsNotificationsOpen(true)}
            onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
          />

          {/* Main Application Content Container */}
          <main style={{ flex: 1, overflowY: 'auto' }}>
            {children}
          </main>
        </div>

        {/* Global Modals & Drawers */}
        <GlobalSearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
        />

        <NotificationDrawer
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
        />

      </div>
    </ProtectedRoute>
  );
};
