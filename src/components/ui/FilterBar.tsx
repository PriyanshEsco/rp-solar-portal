import React from 'react';
import { SearchBar } from './SearchBar';
import { Filter, RotateCcw } from 'lucide-react';

export interface FilterTabOption {
  label: string;
  value: string;
  count?: number;
}

export interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchPlaceholder?: string;
  tabs?: FilterTabOption[];
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  activeFilterCount?: number;
  onResetFilters?: () => void;
  totalCount?: number;
  children?: React.ReactNode;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search by name, code, contact or district...',
  tabs,
  activeTab,
  onTabChange,
  activeFilterCount = 0,
  onResetFilters,
  totalCount,
  children,
}) => {
  return (
    <div className="rp-filter-toolbar">
      {/* Top Row: Quick status tabs if provided */}
      {tabs && tabs.length > 0 && onTabChange && (
        <div className="rp-filter-row" style={{ borderBottom: children || searchQuery ? '1px solid var(--rp-gray-200)' : 'none', paddingBottom: children || searchQuery ? '10px' : '0' }}>
          <div className="rp-filter-tabs">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => onTabChange(tab.value)}
                  className={`rp-filter-tab-btn ${isActive ? 'active' : ''}`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className="rp-filter-tab-count">{tab.count}</span>
                  )}
                </button>
              );
            })}
          </div>
          {totalCount !== undefined && (
            <span style={{ fontSize: '0.8125rem', color: 'var(--rp-charcoal-600)', fontWeight: 500 }}>
              Total: <strong style={{ color: 'var(--rp-green-primary)' }}>{totalCount}</strong>
            </span>
          )}
        </div>
      )}

      {/* Main Filter Controls Row */}
      <div className="rp-filter-row">
        <div className="rp-filter-controls">
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
            type="button"
            onClick={onResetFilters}
            className="rp-btn-reset-filters"
          >
            <RotateCcw size={13} />
            <span>Reset Filters ({activeFilterCount})</span>
          </button>
        )}
      </div>
    </div>
  );
};

