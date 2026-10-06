import React from 'react';
import { CheckCircle2, Clock, AlertCircle, CircleDashed } from 'lucide-react';

export interface TimelineItem {
  id: string;
  title: string;
  stageCode?: string;
  status: 'completed' | 'in_progress' | 'pending' | 'blocked';
  timestamp?: string;
  actor?: string;
  description?: string;
  isMandatory?: boolean;
}

export interface TimelineProps {
  items: TimelineItem[];
  activeItemId?: string;
  onItemClick?: (item: TimelineItem) => void;
}

export const Timeline: React.FC<TimelineProps> = ({ items, activeItemId, onItemClick }) => {
  const getStatusIcon = (status: TimelineItem['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 size={18} style={{ color: 'var(--rp-success)' }} />;
      case 'in_progress':
        return <Clock size={18} style={{ color: 'var(--rp-warning)' }} />;
      case 'blocked':
        return <AlertCircle size={18} style={{ color: 'var(--rp-danger)' }} />;
      case 'pending':
      default:
        return <CircleDashed size={18} style={{ color: 'var(--rp-gray-400)' }} />;
    }
  };

  const getLineColor = (status: TimelineItem['status']) => {
    return status === 'completed' ? 'var(--rp-success)' : 'var(--rp-gray-200)';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', position: 'relative' }}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const isActive = activeItemId === item.id;

        return (
          <div
            key={item.id}
            onClick={() => onItemClick && onItemClick(item)}
            style={{
              display: 'flex',
              gap: '16px',
              cursor: onItemClick ? 'pointer' : 'default',
              padding: '6px 0',
            }}
          >
            {/* Left Icon and Vertical Line */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--rp-white)',
                  border: `2px solid ${item.status === 'completed' ? 'var(--rp-success)' : item.status === 'in_progress' ? 'var(--rp-warning)' : 'var(--rp-gray-300)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2,
                }}
              >
                {getStatusIcon(item.status)}
              </div>
              {!isLast && (
                <div
                  style={{
                    width: '2px',
                    flex: 1,
                    minHeight: '28px',
                    backgroundColor: getLineColor(item.status),
                    margin: '4px 0',
                  }}
                />
              )}
            </div>

            {/* Right Details */}
            <div
              style={{
                flex: 1,
                paddingBottom: isLast ? '0' : '16px',
                backgroundColor: isActive ? 'var(--rp-green-surface)' : 'transparent',
                borderRadius: 'var(--radius-sm)',
                padding: isActive ? '8px 12px' : '0 0 16px 0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--rp-charcoal-900)' }}>
                  {item.title}
                </span>
                {item.timestamp && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--rp-gray-400)' }}>{item.timestamp}</span>
                )}
              </div>

              {item.description && (
                <p style={{ fontSize: '0.8125rem', color: 'var(--rp-gray-600)', marginTop: '4px' }}>
                  {item.description}
                </p>
              )}

              {item.actor && (
                <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-400)', marginTop: '4px' }}>
                  Verified by: <strong style={{ color: 'var(--rp-charcoal-700)' }}>{item.actor}</strong>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
