import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '0.75rem',
        color: 'var(--rp-gray-500)',
        marginBottom: '6px',
      }}
      aria-label="Breadcrumb"
    >
      <Link
        href="/"
        style={{
          display: 'flex',
          alignItems: 'center',
          color: 'var(--rp-gray-500)',
          textDecoration: 'none',
        }}
      >
        <Home size={13} style={{ marginRight: '4px' }} />
        <span>Portal</span>
      </Link>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            <ChevronRight size={12} style={{ color: 'var(--rp-gray-400)' }} />
            {item.href && !isLast ? (
              <Link
                href={item.href}
                style={{
                  color: 'var(--rp-gray-600)',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                {item.label}
              </Link>
            ) : (
              <span style={{ color: isLast ? 'var(--rp-charcoal-900)' : 'var(--rp-gray-600)', fontWeight: isLast ? 600 : 400 }}>
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
