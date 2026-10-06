import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isRequired?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, error, leftIcon, rightIcon, isRequired, disabled, style = {}, className = '', ...props }, ref) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '100%' }}>
        {label && (
          <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--rp-charcoal-700)' }}>
            {label} {isRequired && <span style={{ color: 'var(--rp-danger)' }}>*</span>}
          </label>
        )}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          {leftIcon && (
            <div style={{ position: 'absolute', left: '12px', color: 'var(--rp-gray-500)', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            disabled={disabled}
            style={{
              width: '100%',
              height: '38px',
              padding: leftIcon && rightIcon ? '8px 36px' : leftIcon ? '8px 12px 8px 36px' : rightIcon ? '8px 36px 8px 12px' : '8px 12px',
              fontSize: '0.875rem',
              color: 'var(--rp-charcoal-900)',
              backgroundColor: disabled ? 'var(--rp-gray-100)' : 'var(--rp-white)',
              border: `1px solid ${error ? 'var(--rp-danger)' : 'var(--rp-gray-300)'}`,
              borderRadius: 'var(--radius-sm)',
              boxShadow: 'var(--shadow-xs)',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              ...style,
            }}
            className={className}
            {...props}
          />
          {rightIcon && (
            <div style={{ position: 'absolute', right: '12px', color: 'var(--rp-gray-500)', display: 'flex', alignItems: 'center' }}>
              {rightIcon}
            </div>
          )}
        </div>
        {error && <span style={{ fontSize: '0.75rem', color: 'var(--rp-danger)' }}>{error}</span>}
        {!error && helperText && <span style={{ fontSize: '0.75rem', color: 'var(--rp-gray-500)' }}>{helperText}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
