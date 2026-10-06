import React from 'react';
import { Breadcrumbs, BreadcrumbItem } from './Breadcrumbs';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  actions,
}) => {
  return (
    <div
      style={{
        padding: '20px 28px',
        backgroundColor: 'var(--rp-white)',
        borderBottom: '1px solid var(--rp-gray-200)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
      }}
    >
      <div>
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            color: 'var(--rp-charcoal-900)',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: '0.875rem', color: 'var(--rp-gray-500)', marginTop: '4px' }}>
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className="page-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {actions}
        </div>
      )}
    </div>
  );
};

