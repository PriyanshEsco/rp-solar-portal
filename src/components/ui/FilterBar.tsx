import React from 'react';
import { SearchBar } from './SearchBar';
import { Filter, RotateCcw } from 'lucide-react';

export interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchPlaceholder?: string;
  activeFilterCount?: number;
  onResetFilters?: () => void;
  children?: React.ReactNode;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  activeFilterCount = 0,
  onResetFilters,
  children,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        backgroundColor: 'var(--rp-white)',
        border: '1px solid var(--rp-gray-200)',
        borderRadius: 'var(--radius-md)',
        marginBottom: '16px',
        flexWrap: 'wrap',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, flexWrap: 'wrap' }}>
        <SearchBar
          value={searchQuery}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
          width="280px"
        />
        {children}
      </div>

      {activeFilterCount > 0 && onResetFilters && (
        <button
          onClick={onResetFilters}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.8125rem',
            color: 'var(--rp-danger)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: 'var(--radius-xs)',
          }}
        >
          <RotateCcw size={14} />
          <span>Reset Filters ({activeFilterCount})</span>
        </button>
      )}
    </div>
  );
};
