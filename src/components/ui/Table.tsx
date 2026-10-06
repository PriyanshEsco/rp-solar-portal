import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, PackageOpen } from 'lucide-react';
import { Skeleton } from './Skeleton';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  isLoading?: boolean;
  emptyText?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ReactNode;
  emptyAction?: React.ReactNode;
  selectedIds?: string[];
  onSelectRow?: (id: string, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  onRowClick?: (row: T) => void;
  skeletonRows?: number;
}

export function Table<T extends Record<string, any>>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyText = 'No records found matching criteria',
  emptyTitle,
  emptyDescription,
  emptyIcon,
  emptyAction,
  selectedIds,
  onSelectRow,
  onSelectAll,
  sortBy,
  sortOrder,
  onSort,
  onRowClick,
  skeletonRows = 4,
}: TableProps<T>) {
  const isAllSelected = data.length > 0 && selectedIds && selectedIds.length === data.length;

  return (
    <div style={{ width: '100%', overflowX: 'auto', border: '1px solid var(--rp-gray-200)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--rp-white)', boxShadow: 'var(--shadow-xs)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
        <thead>
          <tr style={{ backgroundColor: 'var(--rp-gray-50)', borderBottom: '1px solid var(--rp-gray-200)' }}>
            {onSelectAll && (
              <th style={{ padding: '12px 16px', width: '40px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  style={{ accentColor: 'var(--rp-green-primary)', width: '15px', height: '15px', cursor: 'pointer' }}
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  padding: '12px 16px',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'var(--rp-charcoal-700)',
                  width: col.width,
                  textAlign: col.align || 'left',
                  cursor: col.sortable ? 'pointer' : 'default',
                  userSelect: 'none',
                }}
                onClick={() => col.sortable && onSort && onSort(col.key)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: col.align === 'right' ? 'flex-end' : col.align === 'center' ? 'center' : 'flex-start' }}>
                  <span>{col.header}</span>
                  {col.sortable && (
                    <span style={{ color: sortBy === col.key ? 'var(--rp-green-primary)' : 'var(--rp-gray-400)' }}>
                      {sortBy === col.key ? (
                        sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                      ) : (
                        <ArrowUpDown size={14} />
                      )}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: skeletonRows }).map((_, r) => (
              <tr key={`skel-${r}`} style={{ borderBottom: r < skeletonRows - 1 ? '1px solid var(--rp-gray-200)' : 'none' }}>
                {onSelectAll && (
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <Skeleton width="15px" height="15px" />
                  </td>
                )}
                {columns.map((col, c) => (
                  <td key={`skel-c-${c}`} style={{ padding: '14px 16px' }}>
                    <Skeleton
                      width={c === 0 ? '75%' : c === columns.length - 1 ? '50%' : '85%'}
                      height="16px"
                    />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (onSelectAll ? 1 : 0)} style={{ padding: '48px 24px', textAlign: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--rp-gray-100)',
                      color: 'var(--rp-gray-400)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '12px',
                    }}
                  >
                    {emptyIcon || <PackageOpen size={22} />}
                  </div>
                  <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--rp-charcoal-800)', marginBottom: '4px' }}>
                    {emptyTitle || emptyText}
                  </h4>
                  {emptyDescription && (
                    <p style={{ fontSize: '0.8125rem', color: 'var(--rp-gray-500)', maxWidth: '400px', lineHeight: 1.4, marginBottom: emptyAction ? '16px' : '0' }}>
                      {emptyDescription}
                    </p>
                  )}
                  {emptyAction && <div style={{ marginTop: '12px' }}>{emptyAction}</div>}
                </div>
              </td>
            </tr>
          ) : (
            data.map((row, idx) => {
              const rowId = keyExtractor(row);
              const isSelected = selectedIds?.includes(rowId);
              return (
                <tr
                  key={rowId}
                  onClick={() => onRowClick && onRowClick(row)}
                  style={{
                    borderBottom: idx < data.length - 1 ? '1px solid var(--rp-gray-200)' : 'none',
                    backgroundColor: isSelected ? 'var(--rp-green-surface)' : idx % 2 === 1 ? 'var(--rp-gray-50)' : 'var(--rp-white)',
                    cursor: onRowClick ? 'pointer' : 'default',
                    transition: 'background-color 0.1s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = '#f1f5f9';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = idx % 2 === 1 ? 'var(--rp-gray-50)' : 'var(--rp-white)';
                  }}
                >
                  {onSelectRow && (
                    <td style={{ padding: '12px 16px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => onSelectRow(rowId, e.target.checked)}
                        style={{ accentColor: 'var(--rp-green-primary)', width: '15px', height: '15px', cursor: 'pointer' }}
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      style={{
                        padding: '12px 16px',
                        color: 'var(--rp-charcoal-900)',
                        textAlign: col.align || 'left',
                      }}
                    >
                      {col.render ? col.render(row, idx) : row[col.key]}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
