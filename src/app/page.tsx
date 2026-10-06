'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function RootPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f172a',
        color: '#f8fafc',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <Loader2
        size={36}
        className="animate-spin"
        style={{ color: '#f59e0b', marginBottom: '16px' }}
      />
      <div style={{ fontSize: '1rem', fontWeight: 600, letterSpacing: '0.02em' }}>
        Loading R P Solar Management Portal...
      </div>
      <div style={{ fontSize: '0.8125rem', color: '#94a3b8', marginTop: '6px' }}>
        Authenticating enterprise session
      </div>
    </div>
  );
}
