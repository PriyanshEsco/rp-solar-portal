import React from 'react';

export interface ProgressBarProps {
  progress: number; // 0 to 100
  label?: string;
  showPercent?: boolean;
  height?: number;
  colorVariant?: 'green' | 'solar' | 'auto';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  label,
  showPercent = true,
  height = 8,
  colorVariant = 'auto',
}) => {
  const clamped = Math.min(100, Math.max(0, progress));

  const getColor = () => {
    if (colorVariant === 'green') return 'var(--rp-green-primary)';
    if (colorVariant === 'solar') return 'var(--rp-solar-yellow)';
    if (clamped >= 100) return 'var(--rp-green-primary)';
    if (clamped >= 50) return 'var(--rp-solar-yellow)';
    return 'var(--rp-solar-orange)';
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {(label || showPercent) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', fontWeight: 600, color: 'var(--rp-charcoal-700)' }}>
          {label && <span>{label}</span>}
          {showPercent && <span style={{ marginLeft: 'auto' }}>{clamped}%</span>}
        </div>
      )}
      <div
        style={{
          width: '100%',
          height: `${height}px`,
          backgroundColor: 'var(--rp-gray-200)',
          borderRadius: '9999px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${clamped}%`,
            height: '100%',
            backgroundColor: getColor(),
            borderRadius: '9999px',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
};
