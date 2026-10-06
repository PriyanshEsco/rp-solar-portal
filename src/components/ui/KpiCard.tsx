import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface KpiCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  trend?: {
    value: number; // e.g. 14.5
    isPositive: boolean;
    periodText?: string; // e.g. "vs last month"
  };
  icon?: React.ReactNode;
  accentColor?: 'green' | 'solar' | 'charcoal';
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  trend,
  icon,
  accentColor = 'green',
}) => {
  const getIconContainerStyle = () => {
    switch (accentColor) {
      case 'solar':
        return { backgroundColor: '#fef3c7', color: '#b45309' };
      case 'charcoal':
        return { backgroundColor: 'var(--rp-gray-100)', color: 'var(--rp-charcoal-700)' };
      case 'green':
      default:
        return { backgroundColor: 'var(--rp-green-surface)', color: 'var(--rp-green-dark)' };
    }
  };

  return (
    <div className="rp-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--rp-gray-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {title}
        </span>
        {icon && (
          <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', ...getIconContainerStyle() }}>
            {icon}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
        <span className="tabular-nums" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--rp-charcoal-900)', letterSpacing: '-0.02em', lineHeight: 1 }}>
          {value}
        </span>
        {unit && <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--rp-gray-500)' }}>{unit}</span>}
      </div>

      {(trend || subtitle) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', flexWrap: 'wrap' }}>
          {trend && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                fontWeight: 600,
                color: trend.isPositive ? 'var(--rp-success)' : 'var(--rp-danger)',
                backgroundColor: trend.isPositive ? 'var(--rp-success-surface)' : 'var(--rp-danger-surface)',
                padding: '2px 6px',
                borderRadius: 'var(--radius-xs)',
              }}
            >
              {trend.value > 0 ? (
                trend.isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />
              ) : (
                <Minus size={12} />
              )}
              {trend.value > 0 ? `${trend.value}%` : '0%'}
            </span>
          )}
          {trend?.periodText && <span style={{ color: 'var(--rp-gray-400)' }}>{trend.periodText}</span>}
          {!trend && subtitle && <span style={{ color: 'var(--rp-gray-500)' }}>{subtitle}</span>}
        </div>
      )}
    </div>
  );
};
