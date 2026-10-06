'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { UserType } from '@/lib/types';
import { ShieldAlert, Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserType[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <Loader2 className="animate-spin" size={40} style={{ color: 'var(--primary)' }} />
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Verifying secure session & RBAC scopes...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(user.userType)) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div className="glass-panel" style={{ maxWidth: '500px', width: '100%', padding: '32px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', marginBottom: '16px' }}>
            <ShieldAlert size={48} />
          </div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Access Restricted</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '24px' }}>
            Your account role (<span className={`badge badge-${user.userType}`}>{user.userType}</span>) does not have sufficient clearance to view this module.
          </p>
          <button className="btn btn-secondary" onClick={() => router.push('/dashboard')}>
            Return to Authorized Workspace
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
