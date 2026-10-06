import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalRecords: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  pageSize,
  totalRecords,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}) => {
  const startRecord = Math.min((currentPage - 1) * pageSize + 1, totalRecords);
  const endRecord = Math.min(currentPage * pageSize, totalRecords);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        backgroundColor: 'var(--rp-white)',
        borderTop: '1px solid var(--rp-gray-200)',
        fontSize: '0.8125rem',
        color: 'var(--rp-gray-600)',
        flexWrap: 'wrap',
        gap: '12px',
      }}
    >
      {/* Range and page size */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span>
          Showing <strong style={{ color: 'var(--rp-charcoal-900)' }}>{totalRecords > 0 ? startRecord : 0}</strong> -{' '}
          <strong style={{ color: 'var(--rp-charcoal-900)' }}>{endRecord}</strong> of{' '}
          <strong style={{ color: 'var(--rp-charcoal-900)' }}>{totalRecords}</strong> records
        </span>

        {onPageSizeChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              style={{
                padding: '4px 8px',
                borderRadius: 'var(--radius-xs)',
                border: '1px solid var(--rp-gray-300)',
                backgroundColor: 'var(--rp-white)',
                fontSize: '0.8125rem',
                color: 'var(--rp-charcoal-800)',
              }}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Page Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          style={{
            padding: '6px 10px',
            borderRadius: 'var(--radius-xs)',
            border: '1px solid var(--rp-gray-300)',
            backgroundColor: 'var(--rp-white)',
            color: currentPage <= 1 ? 'var(--rp-gray-400)' : 'var(--rp-charcoal-800)',
            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
          aria-label="Previous Page"
        >
          <ChevronLeft size={16} />
        </button>

        <span style={{ padding: '0 8px', fontWeight: 600, color: 'var(--rp-charcoal-900)' }}>
          Page {currentPage} of {Math.max(1, totalPages)}
        </span>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          style={{
            padding: '6px 10px',
            borderRadius: 'var(--radius-xs)',
            border: '1px solid var(--rp-gray-300)',
            backgroundColor: 'var(--rp-white)',
            color: currentPage >= totalPages ? 'var(--rp-gray-400)' : 'var(--rp-charcoal-800)',
            cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
          aria-label="Next Page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};
