import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'md',
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

  const getMaxWidthValue = () => {
    switch (maxWidth) {
      case 'sm':
        return '420px';
      case 'lg':
        return '720px';
      case 'xl':
        return '960px';
      case 'md':
      default:
        return '560px';
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        className="animate-fade-in"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          width: '100%',
          maxWidth: getMaxWidthValue(),
          backgroundColor: 'var(--rp-white)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--rp-gray-200)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--rp-gray-200)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
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
              borderRadius: 'var(--radius-xs)',
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>{children}</div>

        {/* Footer */}
        {footer && (
          <div
            style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--rp-gray-200)',
              backgroundColor: 'var(--rp-gray-50)',
              borderBottomLeftRadius: 'var(--radius-md)',
              borderBottomRightRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
