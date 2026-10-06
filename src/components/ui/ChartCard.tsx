import React from 'react';

export interface ChartDataPoint {
  label: string;
  value: number;
  secondaryValue?: number;
}

export interface ChartCardProps {
  title: string;
  subtitle?: string;
  data: ChartDataPoint[];
  metricLabel?: string;
  metricValue?: string;
  actions?: React.ReactNode;
  height?: number;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  data,
  metricLabel,
  metricValue,
  actions,
  height = 180,
}) => {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="rp-card">
      <div className="rp-card-header">
        <div>
          <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--rp-charcoal-900)' }}>{title}</h4>
          {subtitle && <p style={{ fontSize: '0.75rem', color: 'var(--rp-gray-500)', marginTop: '2px' }}>{subtitle}</p>}
        </div>
        {actions && <div>{actions}</div>}
      </div>

      <div className="rp-card-body" style={{ padding: '16px 20px' }}>
        {metricValue && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--rp-charcoal-900)' }}>{metricValue}</div>
            {metricLabel && <div style={{ fontSize: '0.75rem', color: 'var(--rp-gray-500)' }}>{metricLabel}</div>}
          </div>
        )}

        {/* Clean SVG / Bar Visualizer */}
        <div style={{ height: `${height}px`, display: 'flex', alignItems: 'flex-end', gap: '12px', paddingTop: '10px' }}>
          {data.map((item, idx) => {
            const heightPercent = Math.max(6, (item.value / maxValue) * 100);
            return (
              <div
                key={idx}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  height: '100%',
                  justifyContent: 'flex-end',
                }}
              >
                <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--rp-gray-500)' }}>
                  {item.value}
                </span>
                <div
                  style={{
                    width: '100%',
                    maxWidth: '36px',
                    height: `${heightPercent}%`,
                    backgroundColor: 'var(--rp-green-primary)',
                    borderRadius: 'var(--radius-xs) var(--radius-xs) 0 0',
                    transition: 'height 0.3s ease',
                  }}
                  title={`${item.label}: ${item.value}`}
                />
                <span style={{ fontSize: '0.6875rem', color: 'var(--rp-charcoal-700)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
