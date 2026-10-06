import React from 'react';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  onBack?: () => void;
  compact?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Unable to complete operational request',
  message = 'We encountered an unexpected issue while retrieving data. Please check your network connection and try again.',
  onRetry,
  onBack,
  compact = false,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: compact ? '24px 16px' : '48px 24px',
        textAlign: 'center',
        backgroundColor: 'var(--rp-white)',
        border: '1px solid #fecaca',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-xs)',
      }}
    >
      <div
        style={{
          width: compact ? '36px' : '48px',
          height: compact ? '36px' : '48px',
          borderRadius: '50%',
          backgroundColor: '#fee2e2',
          color: '#dc2626',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '12px',
        }}
      >
        <AlertCircle size={compact ? 20 : 26} />
      </div>

      <h4
        style={{
          fontSize: compact ? '0.875rem' : '1.0625rem',
          fontWeight: 700,
          color: 'var(--rp-charcoal-900)',
          marginBottom: '6px',
        }}
      >
        {title}
      </h4>

      <p
        style={{
          fontSize: '0.8125rem',
          color: 'var(--rp-gray-600)',
          maxWidth: '460px',
          lineHeight: 1.4,
          marginBottom: onRetry || onBack ? '18px' : '0',
        }}
      >
        {message}
      </p>

      {(onRetry || onBack) && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {onBack && (
            <Button variant="secondary" size="sm" onClick={onBack}>
              <ArrowLeft size={14} /> Go Back
            </Button>
          )}
          {onRetry && (
            <Button variant="primary" size="sm" onClick={onRetry}>
              <RefreshCw size={14} /> Try Again
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
