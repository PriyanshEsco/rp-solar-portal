import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  position?: 'right' | 'left';
  width?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  position = 'right',
  width = '460px',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(2px)',
        zIndex: 1100,
        display: 'flex',
        justifyContent: position === 'right' ? 'flex-end' : 'flex-start',
      }}
      onClick={onClose}
    >
      <div
        className={position === 'right' ? 'animate-drawer-right' : 'animate-drawer-left'}
        style={{
          width: '100%',
          maxWidth: width,
          height: '100%',
          backgroundColor: 'var(--rp-white)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1101,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--rp-gray-200)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            backgroundColor: 'var(--rp-gray-50)',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--rp-charcoal-900)' }}>{title}</h3>
            {subtitle && <p style={{ fontSize: '0.8125rem', color: 'var(--rp-gray-500)', marginTop: '2px' }}>{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--rp-gray-400)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label="Close drawer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>{children}</div>

        {/* Footer */}
        {footer && (
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--rp-gray-200)',
              backgroundColor: 'var(--rp-gray-50)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
