import React from 'react';
import { Search, X } from 'lucide-react';

export interface SearchBarProps {
  value: string;
  onChange: (query: string) => void;
  onClear?: () => void;
  placeholder?: string;
  width?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onClear,
  placeholder = 'Search by keyword, code, or ID...',
  width = '320px',
}) => {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width }}>
      <div style={{ position: 'absolute', left: '12px', color: 'var(--rp-gray-400)', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
        <Search size={16} />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          height: '36px',
          padding: value ? '6px 32px 6px 36px' : '6px 12px 6px 36px',
          fontSize: '0.8125rem',
          color: 'var(--rp-charcoal-900)',
          backgroundColor: 'var(--rp-white)',
          border: '1px solid var(--rp-gray-300)',
          borderRadius: 'var(--radius-sm)',
          boxShadow: 'var(--shadow-xs)',
        }}
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange('');
            if (onClear) onClear();
          }}
          style={{
            position: 'absolute',
            right: '8px',
            background: 'none',
            border: 'none',
            color: 'var(--rp-gray-400)',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
          }}
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};
