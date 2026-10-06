'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Drawer } from '../ui/Drawer';
import {
  Bell,
  CheckCheck,
  Zap,
  FileCheck,
  CheckCircle2,
  FolderKanban,
  UserCheck,
  FileX,
  CreditCard,
  Calendar,
  AlertTriangle,
  Award,
  Receipt,
  RotateCw,
  ExternalLink,
  PlusCircle,
  Sparkles,
  Send,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { NotificationItem, NotificationType } from '@/lib/types';

export interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCountChange?: (unreadCount: number) => void;
}

const NOTIFICATION_TYPES: { type: NotificationType; label: string; defaultTitle: string; defaultMsg: string; link: string }[] = [
  { type: 'customer_assigned', label: 'Customer Assigned', defaultTitle: 'Customer Assigned to Portfolio', defaultMsg: 'New 5.5 kW residential lead assigned to your management list.', link: '/customers' },
  { type: 'project_assigned', label: 'Project Assigned', defaultTitle: 'Project Assigned: RPS-2026-DEL-001', defaultMsg: 'You have been assigned as lead project executive.', link: '/projects' },
  { type: 'project_stage_updated', label: 'Project Stage Updated', defaultTitle: 'Structure Installation Completed', defaultMsg: 'Project RPS-2026-DEL-001 stage updated to Structure Completed.', link: '/projects' },
  { type: 'document_uploaded', label: 'Document Uploaded', defaultTitle: 'New Document Uploaded', defaultMsg: 'Electricity Discom Bill uploaded and ready for review.', link: '/documents' },
  { type: 'document_rejected', label: 'Document Rejected', defaultTitle: 'Document Rejected by QA', defaultMsg: 'Site layout drawing rejected: Missing parapet shadow study.', link: '/documents' },
  { type: 'payment_received', label: 'Payment Received', defaultTitle: 'Milestone Payment Received: ₹1,50,000', defaultMsg: 'Payment verified and credited via RTGS transfer.', link: '/payments' },
  { type: 'payment_overdue', label: 'Payment Overdue', defaultTitle: 'Milestone 3 Payment Overdue', defaultMsg: 'Payment of ₹60,000 is 5 days overdue for Customer Meera Patel.', link: '/payments' },
  { type: 'installation_scheduled', label: 'Installation Scheduled', defaultTitle: 'Wiring & Earthing Scheduled', defaultMsg: 'Site commissioning scheduled for 10 Oct 2026 with technician team.', link: '/installation' },
  { type: 'installation_completed', label: 'Installation Completed', defaultTitle: 'Installation Stage Completed', defaultMsg: 'Heavy GI structural mounting signed off by site engineer.', link: '/installation' },
  { type: 'inspection_pending', label: 'Inspection Pending', defaultTitle: 'DISCOM Net Meter Inspection Pending', defaultMsg: 'BSES inspection pending for net meter bidirectional sync.', link: '/installation' },
  { type: 'subsidy_updated', label: 'Subsidy Updated', defaultTitle: 'PM Surya Ghar Subsidy Approved', defaultMsg: 'Central DBT subsidy of ₹78,000 approved on National Solar Portal.', link: '/subsidies' },
  { type: 'warranty_issued', label: 'Warranty Issued', defaultTitle: '25-Year Performance Warranty Issued', defaultMsg: 'OEM Warranty Certificate WAR-2026-001 issued for Waaree panels.', link: '/projects' },
  { type: 'invoice_uploaded', label: 'Invoice Uploaded', defaultTitle: 'Tax Invoice INV-2026-001 Uploaded', defaultMsg: 'GST tax invoice for ₹2,47,500 generated and attached to project.', link: '/payments' },
];

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ isOpen, onClose, onCountChange }) => {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'all' | 'unread' | 'projects' | 'payments' | 'installation' | 'subsidy'>('all');
  const [showSimulate, setShowSimulate] = useState(false);
  const [simType, setSimType] = useState<NotificationType>('project_stage_updated');
  const [simTitle, setSimTitle] = useState('');
  const [simMessage, setSimMessage] = useState('');
  const [submittingSim, setSubmittingSim] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setNotifications(data.data);
        if (onCountChange) {
          onCountChange(data.meta?.unreadCount ?? 0);
        }
      }
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const markAllRead = async () => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' }),
      });
      const data = await res.json();
      if (data.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        if (onCountChange) onCountChange(0);
      }
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const markSingleRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read', notificationId: id }),
      });
      const data = await res.json();
      if (data.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        const unread = notifications.filter((n) => n.id !== id && !n.isRead).length;
        if (onCountChange) onCountChange(unread);
      }
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const handleNotificationClick = (item: NotificationItem) => {
    if (!item.isRead) {
      markSingleRead(item.id);
    }
    if (item.link) {
      onClose();
      router.push(item.link);
    }
  };

  const handleTriggerSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    const config = NOTIFICATION_TYPES.find((t) => t.type === simType);
    try {
      setSubmittingSim(true);
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: simType,
          title: simTitle || config?.defaultTitle || 'System Alert',
          message: simMessage || config?.defaultMsg || 'Operational event triggered.',
          link: config?.link || '/projects',
          recipientRole: 'all',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowSimulate(false);
        setSimTitle('');
        setSimMessage('');
        fetchNotifications();
      }
    } catch (err) {
      console.error('Failed to trigger simulated notification', err);
    } finally {
      setSubmittingSim(false);
    }
  };

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'customer_assigned':
        return <UserCheck size={16} style={{ color: '#0284c7' }} />;
      case 'project_assigned':
      case 'project_stage_updated':
        return <FolderKanban size={16} style={{ color: '#16a34a' }} />;
      case 'document_uploaded':
        return <FileCheck size={16} style={{ color: '#0891b2' }} />;
      case 'document_rejected':
        return <FileX size={16} style={{ color: '#dc2626' }} />;
      case 'payment_received':
        return <Zap size={16} style={{ color: '#d97706' }} />;
      case 'payment_overdue':
        return <AlertTriangle size={16} style={{ color: '#e11d48' }} />;
      case 'installation_scheduled':
        return <Calendar size={16} style={{ color: '#4f46e5' }} />;
      case 'installation_completed':
        return <CheckCircle2 size={16} style={{ color: '#059669' }} />;
      case 'inspection_pending':
        return <AlertTriangle size={16} style={{ color: '#ea580c' }} />;
      case 'subsidy_updated':
        return <CheckCircle2 size={16} style={{ color: '#0d9488' }} />;
      case 'warranty_issued':
        return <Award size={16} style={{ color: '#7c3aed' }} />;
      case 'invoice_uploaded':
        return <Receipt size={16} style={{ color: '#0284c7' }} />;
      default:
        return <Bell size={16} style={{ color: 'var(--rp-gray-500)' }} />;
    }
  };

  const filtered = notifications.filter((n) => {
    if (activeCategory === 'unread') return !n.isRead;
    if (activeCategory === 'projects')
      return (
        n.type === 'project_assigned' ||
        n.type === 'project_stage_updated' ||
        n.type === 'customer_assigned'
      );
    if (activeCategory === 'payments')
      return n.type === 'payment_received' || n.type === 'payment_overdue' || n.type === 'invoice_uploaded';
    if (activeCategory === 'installation')
      return (
        n.type === 'installation_scheduled' ||
        n.type === 'installation_completed' ||
        n.type === 'inspection_pending'
      );
    if (activeCategory === 'subsidy')
      return n.type === 'subsidy_updated' || n.type === 'warranty_issued' || n.type === 'document_uploaded' || n.type === 'document_rejected';
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Notification Center"
      subtitle={
        unreadCount > 0
          ? `${unreadCount} unread operational alerts requiring attention`
          : 'All system notifications are up to date'
      }
      width="460px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSimulate(!showSimulate)}
            style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            <Sparkles size={14} style={{ color: 'var(--rp-solar-orange)' }} />
            {showSimulate ? 'Hide Simulator' : 'Test Triggers'}
          </Button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="ghost" size="sm" onClick={markAllRead} disabled={unreadCount === 0}>
              <CheckCheck size={14} /> Mark All Read
            </Button>
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      }
    >
      {/* Simulator Panel if toggled */}
      {showSimulate && (
        <form
          onSubmit={handleTriggerSimulate}
          style={{
            marginBottom: '16px',
            padding: '14px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--rp-green-surface)',
            border: '1px solid #bbf7d0',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--rp-green-dark)' }}>
              ⚡ Trigger Lifecycle Notification Event
            </span>
          </div>

          <div>
            <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--rp-charcoal-700)', display: 'block', marginBottom: '4px' }}>
              Select Notification Trigger (13 Events)
            </label>
            <select
              value={simType}
              onChange={(e) => {
                const t = e.target.value as NotificationType;
                setSimType(t);
                const conf = NOTIFICATION_TYPES.find((item) => item.type === t);
                if (conf) {
                  setSimTitle(conf.defaultTitle);
                  setSimMessage(conf.defaultMsg);
                }
              }}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: 'var(--radius-xs)',
                border: '1px solid var(--rp-gray-300)',
                fontSize: '0.75rem',
                backgroundColor: 'var(--rp-white)',
              }}
            >
              {NOTIFICATION_TYPES.map((t) => (
                <option key={t.type} value={t.type}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--rp-charcoal-700)', display: 'block', marginBottom: '4px' }}>
              Notification Title
            </label>
            <input
              type="text"
              placeholder="e.g. Structure Installation Completed"
              value={simTitle}
              onChange={(e) => setSimTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: 'var(--radius-xs)',
                border: '1px solid var(--rp-gray-300)',
                fontSize: '0.75rem',
                backgroundColor: 'var(--rp-white)',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--rp-charcoal-700)', display: 'block', marginBottom: '4px' }}>
              Notification Message
            </label>
            <textarea
              rows={2}
              placeholder="Custom notification message..."
              value={simMessage}
              onChange={(e) => setSimMessage(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: 'var(--radius-xs)',
                border: '1px solid var(--rp-gray-300)',
                fontSize: '0.75rem',
                backgroundColor: 'var(--rp-white)',
              }}
            />
          </div>

          <Button type="submit" variant="primary" size="sm" disabled={submittingSim}>
            <Send size={13} /> {submittingSim ? 'Triggering...' : 'Dispatch Live Notification'}
          </Button>
        </form>
      )}

      {/* Category Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          borderBottom: '1px solid var(--rp-gray-200)',
          paddingBottom: '10px',
          marginBottom: '16px',
          overflowX: 'auto',
        }}
      >
        <button
          onClick={() => setActiveCategory('all')}
          style={{
            padding: '4px 8px',
            borderRadius: 'var(--radius-xs)',
            fontSize: '0.6875rem',
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            whiteSpace: 'nowrap',
            backgroundColor: activeCategory === 'all' ? 'var(--rp-green-primary)' : 'var(--rp-gray-100)',
            color: activeCategory === 'all' ? 'var(--rp-white)' : 'var(--rp-charcoal-700)',
          }}
        >
          All ({notifications.length})
        </button>

        <button
          onClick={() => setActiveCategory('unread')}
          style={{
            padding: '4px 8px',
            borderRadius: 'var(--radius-xs)',
            fontSize: '0.6875rem',
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            whiteSpace: 'nowrap',
            backgroundColor: activeCategory === 'unread' ? 'var(--rp-green-primary)' : 'var(--rp-gray-100)',
            color: activeCategory === 'unread' ? 'var(--rp-white)' : 'var(--rp-charcoal-700)',
          }}
        >
          Unread ({unreadCount})
        </button>

        <button
          onClick={() => setActiveCategory('projects')}
          style={{
            padding: '4px 8px',
            borderRadius: 'var(--radius-xs)',
            fontSize: '0.6875rem',
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            whiteSpace: 'nowrap',
            backgroundColor: activeCategory === 'projects' ? 'var(--rp-green-primary)' : 'var(--rp-gray-100)',
            color: activeCategory === 'projects' ? 'var(--rp-white)' : 'var(--rp-charcoal-700)',
          }}
        >
          Projects
        </button>

        <button
          onClick={() => setActiveCategory('payments')}
          style={{
            padding: '4px 8px',
            borderRadius: 'var(--radius-xs)',
            fontSize: '0.6875rem',
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            whiteSpace: 'nowrap',
            backgroundColor: activeCategory === 'payments' ? 'var(--rp-green-primary)' : 'var(--rp-gray-100)',
            color: activeCategory === 'payments' ? 'var(--rp-white)' : 'var(--rp-charcoal-700)',
          }}
        >
          Payments
        </button>

        <button
          onClick={() => setActiveCategory('installation')}
          style={{
            padding: '4px 8px',
            borderRadius: 'var(--radius-xs)',
            fontSize: '0.6875rem',
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            whiteSpace: 'nowrap',
            backgroundColor: activeCategory === 'installation' ? 'var(--rp-green-primary)' : 'var(--rp-gray-100)',
            color: activeCategory === 'installation' ? 'var(--rp-white)' : 'var(--rp-charcoal-700)',
          }}
        >
          Installation
        </button>

        <button
          onClick={() => setActiveCategory('subsidy')}
          style={{
            padding: '4px 8px',
            borderRadius: 'var(--radius-xs)',
            fontSize: '0.6875rem',
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            whiteSpace: 'nowrap',
            backgroundColor: activeCategory === 'subsidy' ? 'var(--rp-green-primary)' : 'var(--rp-gray-100)',
            color: activeCategory === 'subsidy' ? 'var(--rp-white)' : 'var(--rp-charcoal-700)',
          }}
        >
          Subsidy & Docs
        </button>
      </div>

      {/* Notifications Stream */}
      {loading && notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px', color: 'var(--rp-gray-400)' }}>
          <RotateCw size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
          <p style={{ fontSize: '0.8125rem' }}>Loading notifications...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '40px 20px',
            backgroundColor: 'var(--rp-gray-50)',
            borderRadius: 'var(--radius-sm)',
            border: '1px dashed var(--rp-gray-300)',
          }}
        >
          <Bell size={28} style={{ color: 'var(--rp-gray-400)', margin: '0 auto 8px' }} />
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--rp-charcoal-800)' }}>No notifications in this view</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--rp-gray-500)', marginTop: '4px' }}>
            All operations and approvals are currently clear.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map((item) => {
            const timeAgo = item.createdAt
              ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Recent';

            return (
              <div
                key={item.id}
                onClick={() => handleNotificationClick(item)}
                style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: item.isRead ? 'var(--rp-white)' : 'var(--rp-green-surface)',
                  border: `1px solid ${item.isRead ? 'var(--rp-gray-200)' : '#86efac'}`,
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start',
                  cursor: item.link ? 'pointer' : 'default',
                  transition: 'all 0.15s ease',
                  boxShadow: item.isRead ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: item.isRead ? 'var(--rp-gray-100)' : 'var(--rp-white)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    border: '1px solid var(--rp-gray-200)',
                  }}
                >
                  {getTypeIcon(item.type)}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '0.8125rem',
                        fontWeight: item.isRead ? 600 : 700,
                        color: 'var(--rp-charcoal-900)',
                        lineHeight: 1.3,
                      }}
                    >
                      {item.title}
                    </span>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-400)', whiteSpace: 'nowrap' }}>
                      {timeAgo}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.75rem', color: 'var(--rp-gray-600)', marginTop: '4px', lineHeight: 1.4 }}>
                    {item.message}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                    {item.link && (
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          color: 'var(--rp-green-dark)',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        View Record <ExternalLink size={10} />
                      </span>
                    )}

                    {!item.isRead && (
                      <button
                        onClick={(e) => markSingleRead(item.id, e)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--rp-gray-400)',
                          fontSize: '0.6875rem',
                          cursor: 'pointer',
                          padding: '2px 4px',
                          borderRadius: 'var(--radius-xs)',
                        }}
                        title="Mark as read"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Drawer>
  );
};
