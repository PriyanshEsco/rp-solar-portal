import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm Action',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
}) => {
  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return (
          <div style={{ padding: '10px', borderRadius: '50%', backgroundColor: 'var(--rp-danger-surface)', color: 'var(--rp-danger)', display: 'inline-flex' }}>
            <AlertTriangle size={24} />
          </div>
        );
      case 'warning':
        return (
          <div style={{ padding: '10px', borderRadius: '50%', backgroundColor: 'var(--rp-warning-surface)', color: 'var(--rp-warning)', display: 'inline-flex' }}>
            <AlertTriangle size={24} />
          </div>
        );
      case 'primary':
      default:
        return (
          <div style={{ padding: '10px', borderRadius: '50%', backgroundColor: 'var(--rp-green-surface)', color: 'var(--rp-green-primary)', display: 'inline-flex' }}>
            <CheckCircle2 size={24} />
          </div>
        );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        {getIcon()}
        <p style={{ fontSize: '0.875rem', color: 'var(--rp-charcoal-700)', lineHeight: 1.5, marginTop: '4px' }}>
          {message}
        </p>
      </div>
    </Modal>
  );
};
