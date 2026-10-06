import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  helperText?: string;
  error?: string;
  isRequired?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, helperText, error, isRequired, disabled, style = {}, className = '', ...props }, ref) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '100%' }}>
        {label && (
          <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--rp-charcoal-700)' }}>
            {label} {isRequired && <span style={{ color: 'var(--rp-danger)' }}>*</span>}
          </label>
        )}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <select
            ref={ref}
            disabled={disabled}
            style={{
              width: '100%',
              height: '38px',
              padding: '8px 32px 8px 12px',
              fontSize: '0.875rem',
              color: 'var(--rp-charcoal-900)',
              backgroundColor: disabled ? 'var(--rp-gray-100)' : 'var(--rp-white)',
              border: `1px solid ${error ? 'var(--rp-danger)' : 'var(--rp-gray-300)'}`,
              borderRadius: 'var(--radius-sm)',
              boxShadow: 'var(--shadow-xs)',
              appearance: 'none',
              cursor: disabled ? 'not-allowed' : 'pointer',
              ...style,
            }}
            className={className}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
          <div style={{ position: 'absolute', right: '10px', color: 'var(--rp-gray-500)', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
            <ChevronDown size={16} />
          </div>
        </div>
        {error && <span style={{ fontSize: '0.75rem', color: 'var(--rp-danger)' }}>{error}</span>}
        {!error && helperText && <span style={{ fontSize: '0.75rem', color: 'var(--rp-gray-500)' }}>{helperText}</span>}
      </div>
    );
  }
);

Select.displayName = 'Select';
