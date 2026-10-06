import React from 'react';

export type StatusType =
  | 'draft'
  | 'feasibility_survey'
  | 'installation_in_progress'
  | 'net_metering'
  | 'commissioned'
  | 'subsidy_processing'
  | 'completed'
  | 'on_hold'
  | 'cancelled'
  | 'pending'
  | 'in_progress'
  | 'verified'
  | 'rejected'
  | 'paid'
  | 'partially_paid'
  | 'active'
  | 'inactive'
  | 'suspended';

export interface StatusBadgeProps {
  status: StatusType | string;
  customLabel?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, customLabel, size = 'md' }) => {
  const normalized = status.toLowerCase();

  const getBadgeStyle = (): { bg: string; color: string; border: string; label: string } => {
    switch (normalized) {
      case 'completed':
      case 'commissioned':
      case 'verified':
      case 'paid':
      case 'active':
        return {
          bg: 'var(--rp-success-surface)',
          color: 'var(--rp-green-dark)',
          border: '#bbf7d0',
          label: customLabel || normalized.replace(/_/g, ' '),
        };
      case 'installation_in_progress':
      case 'in_progress':
      case 'net_metering':
      case 'subsidy_processing':
      case 'partially_paid':
        return {
          bg: 'var(--rp-warning-surface)',
          color: '#92400e',
          border: '#fde68a',
          label: customLabel || normalized.replace(/_/g, ' '),
        };
      case 'feasibility_survey':
      case 'pending':
        return {
          bg: 'var(--rp-info-surface)',
          color: '#075985',
          border: '#bae6fd',
          label: customLabel || normalized.replace(/_/g, ' '),
        };
      case 'rejected':
      case 'cancelled':
      case 'suspended':
        return {
          bg: 'var(--rp-danger-surface)',
          color: 'var(--rp-danger)',
          border: '#fecaca',
          label: customLabel || normalized.replace(/_/g, ' '),
        };
      case 'draft':
      case 'on_hold':
      case 'inactive':
      default:
        return {
          bg: 'var(--rp-gray-100)',
          color: 'var(--rp-charcoal-700)',
          border: 'var(--rp-gray-300)',
          label: customLabel || normalized.replace(/_/g, ' '),
        };
    }
  };

  const badge = getBadgeStyle();

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: size === 'sm' ? '2px 8px' : '4px 10px',
        fontSize: size === 'sm' ? '0.6875rem' : '0.75rem',
        fontWeight: 600,
        textTransform: 'capitalize',
        borderRadius: 'var(--radius-xs)',
        backgroundColor: badge.bg,
        color: badge.color,
        border: `1px solid ${badge.border}`,
        whiteSpace: 'nowrap',
        lineHeight: 1.2,
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: badge.color,
          display: 'inline-block',
        }}
      />
      <span>{badge.label}</span>
    </span>
  );
};
