'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  durationMs?: number;
}

interface ToastContextType {
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type, title, message, durationMs = 4000 }: Omit<ToastMessage, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastMessage = { id, type, title, message, durationMs };
      setToasts((prev) => [...prev, newToast]);

      if (durationMs > 0) {
        setTimeout(() => {
          removeToast(id);
        }, durationMs);
      }
    },
    [removeToast]
  );

  const success = useCallback((title: string, message?: string) => showToast({ type: 'success', title, message }), [showToast]);
  const error = useCallback((title: string, message?: string) => showToast({ type: 'error', title, message }), [showToast]);
  const warning = useCallback((title: string, message?: string) => showToast({ type: 'warning', title, message }), [showToast]);
  const info = useCallback((title: string, message?: string) => showToast({ type: 'info', title, message }), [showToast]);

  const value = React.useMemo(() => ({ showToast, success, error, warning, info }), [showToast, success, error, warning, info]);

  const getToastIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} style={{ color: 'var(--rp-success)' }} />;
      case 'error':
        return <AlertCircle size={18} style={{ color: 'var(--rp-danger)' }} />;
      case 'warning':
        return <AlertTriangle size={18} style={{ color: 'var(--rp-warning)' }} />;
      case 'info':
      default:
        return <Info size={18} style={{ color: 'var(--rp-info)' }} />;
    }
  };

  const getToastBorder = (type: ToastType) => {
    switch (type) {
      case 'success':
        return '1px solid #bbf7d0';
      case 'error':
        return '1px solid #fecaca';
      case 'warning':
        return '1px solid #fde68a';
      case 'info':
      default:
        return '1px solid #bae6fd';
    }
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast Render Stack */}
      <div
        role="region"
        aria-label="System notifications"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          zIndex: 9999,
          maxWidth: '380px',
          width: '100%',
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            aria-live="assertive"
            className="animate-fade-in"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '14px 16px',
              backgroundColor: 'var(--rp-white)',
              border: getToastBorder(t.type),
              borderRadius: 'var(--radius-sm)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ marginTop: '2px', flexShrink: 0 }}>{getToastIcon(t.type)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--rp-charcoal-900)' }}>{t.title}</div>
              {t.message && (
                <p style={{ fontSize: '0.75rem', color: 'var(--rp-gray-600)', marginTop: '2px', lineHeight: 1.4 }}>
                  {t.message}
                </p>
              )}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              style={{ background: 'none', border: 'none', color: 'var(--rp-gray-400)', cursor: 'pointer', padding: '2px' }}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
