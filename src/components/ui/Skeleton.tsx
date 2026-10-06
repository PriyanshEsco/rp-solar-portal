import React from 'react';

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  style?: React.CSSProperties;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '16px',
  borderRadius = 'var(--radius-xs)',
  style,
  className = '',
}) => {
  return (
    <div
      className={`skeleton-shimmer ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius,
        display: 'inline-block',
        ...style,
      }}
    />
  );
};

export interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  rows = 5,
  columns = 6,
  showHeader = true,
}) => {
  return (
    <div
      style={{
        width: '100%',
        backgroundColor: 'var(--rp-white)',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--rp-gray-200)',
        overflow: 'hidden',
      }}
    >
      {showHeader && (
        <div
          style={{
            display: 'flex',
            gap: '16px',
            padding: '12px 16px',
            backgroundColor: 'var(--rp-gray-100)',
            borderBottom: '1px solid var(--rp-gray-200)',
          }}
        >
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} width={`${100 / columns}%`} height="18px" />
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            style={{
              display: 'flex',
              gap: '16px',
              padding: '16px',
              borderBottom: r < rows - 1 ? '1px solid var(--rp-gray-200)' : 'none',
              alignItems: 'center',
            }}
          >
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton
                key={c}
                width={c === 0 ? '70%' : c === 1 ? '90%' : '60%'}
                height={c === 0 ? '16px' : '14px'}
                style={{ flex: 1 }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const SkeletonCard: React.FC<{ height?: string }> = ({ height = '160px' }) => {
  return (
    <div
      style={{
        backgroundColor: 'var(--rp-white)',
        padding: '20px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--rp-gray-200)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton width="40%" height="16px" />
        <Skeleton width="24px" height="24px" borderRadius="50%" />
      </div>
      <Skeleton width="60%" height="28px" style={{ margin: '12px 0' }} />
      <Skeleton width="80%" height="12px" />
    </div>
  );
};

export const SkeletonDetail: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Banner */}
      <div
        style={{
          backgroundColor: 'var(--rp-white)',
          padding: '24px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--rp-gray-200)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '50%' }}>
            <Skeleton width="60%" height="24px" />
            <Skeleton width="40%" height="16px" />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Skeleton width="90px" height="32px" />
            <Skeleton width="90px" height="32px" />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginTop: '8px' }}>
          <Skeleton height="40px" />
          <Skeleton height="40px" />
          <Skeleton height="40px" />
          <Skeleton height="40px" />
        </div>
      </div>

      {/* Main Content Area */}
      <SkeletonTable rows={4} columns={5} />
    </div>
  );
};
