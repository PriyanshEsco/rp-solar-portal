import React, { useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';

export interface DatePickerProps {
  label?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (date: string) => void;
  helperText?: string;
  error?: string;
  isRequired?: boolean;
  minDate?: string;
  maxDate?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  label,
  value,
  defaultValue,
  onChange,
  helperText,
  error,
  isRequired,
  minDate,
  maxDate,
}) => {
  const [internalDate, setInternalDate] = useState(value || defaultValue || '');

  const handleChange = (newVal: string) => {
    setInternalDate(newVal);
    if (onChange) onChange(newVal);
  };

  const activeValue = value !== undefined ? value : internalDate;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '100%' }}>
      {label && (
        <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--rp-charcoal-700)' }}>
          {label} {isRequired && <span style={{ color: 'var(--rp-danger)' }}>*</span>}
        </label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', left: '12px', color: 'var(--rp-gray-500)', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
          <CalendarIcon size={16} />
        </div>
        <input
          type="date"
          value={activeValue}
          onChange={(e) => handleChange(e.target.value)}
          min={minDate}
          max={maxDate}
          style={{
            width: '100%',
            height: '38px',
            padding: '8px 12px 8px 36px',
            fontSize: '0.875rem',
            color: 'var(--rp-charcoal-900)',
            backgroundColor: 'var(--rp-white)',
            border: `1px solid ${error ? 'var(--rp-danger)' : 'var(--rp-gray-300)'}`,
            borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--shadow-xs)',
          }}
        />
      </div>
      {error && <span style={{ fontSize: '0.75rem', color: 'var(--rp-danger)' }}>{error}</span>}
      {!error && helperText && <span style={{ fontSize: '0.75rem', color: 'var(--rp-gray-500)' }}>{helperText}</span>}
    </div>
  );
};
