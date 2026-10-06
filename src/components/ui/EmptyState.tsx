import React from 'react';
import { PackageOpen } from 'lucide-react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
        backgroundColor: 'var(--rp-white)',
        border: '1px dashed var(--rp-gray-300)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          backgroundColor: 'var(--rp-gray-100)',
          color: 'var(--rp-gray-500)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '14px',
        }}
      >
        {icon || <PackageOpen size={24} />}
      </div>
      <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--rp-charcoal-900)', marginBottom: '4px' }}>
        {title}
      </h4>
      <p style={{ fontSize: '0.8125rem', color: 'var(--rp-gray-500)', maxWidth: '420px', marginBottom: action ? '20px' : '0' }}>
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
};
