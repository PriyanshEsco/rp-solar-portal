'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, SessionPayload, UserType } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  session: SessionPayload | null;
  profile: any | null;
  scope: any | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  quickLogin: (userTypeKey: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const DEMO_ACCOUNTS = [
  {
    key: 'super_admin',
    label: 'Super Admin',
    desc: 'Full Global Scope Across All Regions',
    email: 'superadmin@rpsolar.com',
    role: 'super_admin' as UserType,
    badgeColor: 'badge-super_admin',
  },
  {
    key: 'admin_north',
    label: 'Admin (North Region)',
    desc: 'Manages Delhi/NCR Employees (Rahul) & Customers',
    email: 'admin.north@rpsolar.com',
    role: 'admin' as UserType,
    badgeColor: 'badge-admin',
  },
  {
    key: 'admin_south',
    label: 'Admin (South Region)',
    desc: 'Manages Bangalore Employees (Vikram) & Customers',
    email: 'admin.south@rpsolar.com',
    role: 'admin' as UserType,
    badgeColor: 'badge-admin',
  },
  {
    key: 'emp_rahul',
    label: 'Employee (Rahul - North Ops)',
    desc: 'Assigned Customer Anil Gupta & Delhi Project',
    email: 'rahul.sharma@rpsolar.com',
    role: 'employee' as UserType,
    badgeColor: 'badge-employee',
  },
  {
    key: 'emp_vikram',
    label: 'Employee (Vikram - South Ops)',
    desc: 'Assigned Customer Priya Krishna & BLR Project',
    email: 'vikram.nair@rpsolar.com',
    role: 'employee' as UserType,
    badgeColor: 'badge-employee',
  },
  {
    key: 'cust_anil',
    label: 'Customer (Anil Gupta)',
    desc: '5.5kW Residential Project (Delhi)',
    email: 'anil.gupta@gmail.com',
    role: 'customer' as UserType,
    badgeColor: 'badge-customer',
  },
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [scope, setScope] = useState<any | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchSession = useCallback(async (token?: string) => {
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/auth/me', { headers });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setUser(json.data.user);
          setSession(json.data.session);
          setProfile(json.data.profile);
          setScope(json.data.scope);
          return true;
        }
      }
      return false;
    } catch (e) {
      return false;
    }
  }, []);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/refresh', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.accessToken) {
          setAccessToken(json.data.accessToken);
          return await fetchSession(json.data.accessToken);
        }
      }
      return false;
    } catch (e) {
      return false;
    }
  }, [fetchSession]);

  useEffect(() => {
    let mounted = true;
    const initAuth = async () => {
      setIsLoading(true);
      const ok = await fetchSession();
      if (!ok) {
        // Attempt refresh
        await refreshSession();
      }
      if (mounted) {
        setIsLoading(false);
      }
    };

    initAuth();
    return () => {
      mounted = false;
    };
  }, [fetchSession, refreshSession]);

  const login = async (identifier: string, password: string, rememberMe?: boolean) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password, rememberMe }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setAccessToken(json.data.tokens.accessToken);
        await fetchSession(json.data.tokens.accessToken);
        return { success: true };
      } else {
        return { success: false, error: json.error?.message || 'Login failed' };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Connection error' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      // Ignore network failures on logout
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
      setScope(null);
      setAccessToken(null);
      window.location.href = '/login';
    }
  };

  const quickLogin = async (userTypeKey: string) => {
    const acc = DEMO_ACCOUNTS.find((a) => a.key === userTypeKey);
    if (acc) {
      const res = await login(acc.email, 'Password123!', true);
      if (res.success && typeof window !== 'undefined') {
        window.location.href = '/dashboard';
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        scope,
        accessToken,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshSession,
        quickLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
