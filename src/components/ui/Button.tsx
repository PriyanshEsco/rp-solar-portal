import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'solar' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      className = '',
      style = {},
      ...props
    },
    ref
  ) => {
    const getVariantStyles = (): React.CSSProperties => {
      switch (variant) {
        case 'primary':
          return {
            backgroundColor: 'var(--rp-green-primary)',
            color: 'var(--rp-white)',
            border: '1px solid var(--rp-green-dark)',
          };
        case 'solar':
          return {
            backgroundColor: 'var(--rp-solar-yellow)',
            color: 'var(--rp-charcoal-900)',
            border: '1px solid var(--rp-solar-amber)',
            fontWeight: 600,
          };
        case 'secondary':
          return {
            backgroundColor: 'var(--rp-white)',
            color: 'var(--rp-charcoal-800)',
            border: '1px solid var(--rp-gray-300)',
          };
        case 'outline':
          return {
            backgroundColor: 'transparent',
            color: 'var(--rp-green-primary)',
            border: '1px solid var(--rp-green-primary)',
          };
        case 'danger':
          return {
            backgroundColor: 'var(--rp-danger)',
            color: 'var(--rp-white)',
            border: '1px solid #b91c1c',
          };
        case 'ghost':
          return {
            backgroundColor: 'transparent',
            color: 'var(--rp-charcoal-700)',
            border: '1px solid transparent',
          };
        default:
          return {};
      }
    };

    const getSizeStyles = (): React.CSSProperties => {
      switch (size) {
        case 'sm':
          return { padding: '6px 12px', fontSize: '0.8125rem', height: '32px' };
        case 'lg':
          return { padding: '12px 22px', fontSize: '0.9375rem', height: '44px' };
        case 'md':
        default:
          return { padding: '8px 16px', fontSize: '0.875rem', height: '38px' };
      }
    };

    const baseStyles: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      fontWeight: 500,
      borderRadius: 'var(--radius-sm)',
      cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
      opacity: disabled || isLoading ? 0.6 : 1,
      transition: 'background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
      boxShadow: variant === 'ghost' ? 'none' : 'var(--shadow-xs)',
      userSelect: 'none',
      whiteSpace: 'nowrap',
      ...getSizeStyles(),
      ...getVariantStyles(),
      ...style,
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        style={baseStyles}
        className={className}
        {...props}
      >
        {isLoading && <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />}
        {!isLoading && leftIcon}
        <span>{children}</span>
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
