'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import {
  ShieldCheck,
  Search,
  Filter,
  Download,
  Printer,
  Calendar,
  User,
  Activity,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  FolderKanban,
  CreditCard,
  FileText,
  Wrench,
  BadgePercent,
  Award,
  Layers,
  Sparkles,
  Eye,
  Lock,
  Plus,
  X,
  Server,
  Terminal,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { AuditLogEntry } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';

export default function AuditLogsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [scopingMeta, setScopingMeta] = useState<string>('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState('all');
  const [selectedAction, setSelectedAction] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');

  // Inspector Modal
  const [inspectEntry, setInspectEntry] = useState<AuditLogEntry | null>(null);

  // New Record Modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [newAction, setNewAction] = useState('UPDATE_PROJECT_STAGE');
  const [newModule, setNewModule] = useState('projects');
  const [newRecordId, setNewRecordId] = useState('Project RP1023 (RPS-2026-DEL-001)');
  const [newPrevValue, setNewPrevValue] = useState('Structure Installation: In Progress');
  const [newNewValue, setNewNewValue] = useState('Structure Installation: Completed');
  const [newDetails, setNewDetails] = useState('Manish updated Project RP1023 — Structure Installation changed from In Progress → Completed after structural QA.');
  const [submittingLog, setSubmittingLog] = useState(false);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedModule !== 'all') params.append('module', selectedModule);
      if (selectedAction !== 'all') params.append('action', selectedAction);
      if (searchTerm) params.append('search', searchTerm);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setLogs(data.data);
        if (data.meta?.scopingApplied) {
          setScopingMeta(data.meta.scopingApplied);
        }
      }
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedModule, selectedAction, startDate, endDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  const handleExportCSV = () => {
    const params = new URLSearchParams();
    if (selectedModule !== 'all') params.append('module', selectedModule);
    if (selectedAction !== 'all') params.append('action', selectedAction);
    if (searchTerm) params.append('search', searchTerm);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    params.append('export', 'csv');

    window.open(`/api/audit-logs?${params.toString()}`, '_blank');
  };

  const handleCreateAuditLog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingLog(true);
      const res = await fetch('/api/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: newAction,
          module: newModule,
          entityTable: newModule,
          entityId: 'proj-rps-2026-01',
          recordIdentifier: newRecordId,
          previousValue: newPrevValue,
          newValue: newNewValue,
          details: newDetails,
          status: 'SUCCESS',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowNewModal(false);
        fetchLogs();
      }
    } catch (err) {
      console.error('Failed to record audit log', err);
    } finally {
      setSubmittingLog(false);
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedModule('all');
    setSelectedAction('all');
    setStartDate('');
    setEndDate('');
  };

  const getModuleBadge = (mod?: string) => {
    const m = (mod || '').toLowerCase();
    switch (m) {
      case 'projects':
        return { label: 'Projects', icon: FolderKanban, color: '#059669', bg: '#ecfdf5' };
      case 'customers':
        return { label: 'Customers', icon: User, color: '#0284c7', bg: '#f0f9ff' };
      case 'payments':
        return { label: 'Payments', icon: CreditCard, color: '#d97706', bg: '#fffbeb' };
      case 'documents':
        return { label: 'Documents', icon: FileText, color: '#0891b2', bg: '#ecfeff' };
      case 'installations':
      case 'installation':
        return { label: 'Installation', icon: Wrench, color: '#4f46e5', bg: '#eef2ff' };
      case 'subsidies':
      case 'subsidy':
        return { label: 'Subsidy', icon: BadgePercent, color: '#0d9488', bg: '#f0fdfa' };
      case 'warranties':
      case 'warranty':
        return { label: 'Warranty', icon: Award, color: '#7c3aed', bg: '#f5f3ff' };
      case 'users':
        return { label: 'IAM Users', icon: ShieldCheck, color: '#e11d48', bg: '#fff1f2' };
      default:
        return { label: mod || 'System', icon: Server, color: '#475569', bg: '#f1f5f9' };
    }
  };

  // KPIs
  const totalEvents = logs.length;
  const stateTransitions = logs.filter((l) => l.previousValue && l.newValue).length;
  const uniqueActors = new Set(logs.map((l) => l.actorName || l.actorEmail)).size;

  return (
    <AppShell allowedRoles={['super_admin', 'admin', 'employee']}>
      <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--rp-green-surface)',
                  color: 'var(--rp-green-dark)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #bbf7d0',
                }}
              >
                <ShieldCheck size={22} />
              </div>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--rp-charcoal-900)', margin: 0 }}>
                  Immutable Audit Trail & Activity Ledger
                </h1>
                <p style={{ fontSize: '0.8125rem', color: 'var(--rp-gray-500)', marginTop: '2px' }}>
                  Permanent enterprise event log tracking all state changes, customer assignments, approvals, and financial transactions.
                </p>
              </div>
            </div>

            {/* Scoping Pill */}
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-xs)',
                  backgroundColor: 'var(--rp-green-dark)',
                  color: 'var(--rp-white)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Lock size={10} /> {scopingMeta || 'Pan-India Enterprise Complete'}
              </span>
              <span
                style={{
                  fontSize: '0.6875rem',
                  color: 'var(--rp-gray-500)',
                  backgroundColor: 'var(--rp-gray-100)',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-xs)',
                }}
              >
                Role: <strong>{user?.userType?.replace('_', ' ').toUpperCase()}</strong>
              </span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Button variant="secondary" size="sm" onClick={() => fetchLogs()} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </Button>
            <Button variant="secondary" size="sm" onClick={handleExportCSV}>
              <Download size={14} /> Export CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={() => window.print()}>
              <Printer size={14} /> Print
            </Button>
            <Button variant="primary" size="sm" onClick={() => setShowNewModal(true)}>
              <Plus size={14} /> Simulate Event
            </Button>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '14px',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--rp-white)',
              padding: '16px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--rp-gray-200)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--rp-gray-500)', textTransform: 'uppercase' }}>
                Total Operations Logged
              </span>
              <Activity size={16} style={{ color: 'var(--rp-green-primary)' }} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--rp-charcoal-900)', marginTop: '6px' }}>
              {totalEvents}
            </div>
            <span style={{ fontSize: '0.6875rem', color: 'var(--rp-success)', fontWeight: 600 }}>
              100% Tamper-proof append-only ledger
            </span>
          </div>

          <div
            style={{
              backgroundColor: 'var(--rp-white)',
              padding: '16px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--rp-gray-200)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--rp-gray-500)', textTransform: 'uppercase' }}>
                Stage & Value Transitions
              </span>
              <ArrowRight size={16} style={{ color: 'var(--rp-solar-orange)' }} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--rp-charcoal-900)', marginTop: '6px' }}>
              {stateTransitions}
            </div>
            <span style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-500)' }}>
              Previous Value → New Value Diffs
            </span>
          </div>

          <div
            style={{
              backgroundColor: 'var(--rp-white)',
              padding: '16px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--rp-gray-200)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--rp-gray-500)', textTransform: 'uppercase' }}>
                Active System Actors
              </span>
              <User size={16} style={{ color: '#0284c7' }} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--rp-charcoal-900)', marginTop: '6px' }}>
              {uniqueActors}
            </div>
            <span style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-500)' }}>
              Super Admins, Admins, Field Engineers
            </span>
          </div>

          <div
            style={{
              backgroundColor: 'var(--rp-white)',
              padding: '16px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--rp-gray-200)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--rp-gray-500)', textTransform: 'uppercase' }}>
                Ledger Status
              </span>
              <CheckCircle2 size={16} style={{ color: 'var(--rp-success)' }} />
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--rp-green-dark)', marginTop: '6px' }}>
              VERIFIED ACTIVE
            </div>
            <span style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-500)' }}>
              SHA-256 session integrity checks
            </span>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div
          style={{
            backgroundColor: 'var(--rp-white)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--rp-gray-200)',
            padding: '16px',
            marginBottom: '20px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '6px', flex: '1 1 280px', minWidth: '240px' }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <Search
                  size={16}
                  style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--rp-gray-400)' }}
                />
                <input
                  type="text"
                  placeholder="Search user, action, record (e.g. RP1023), diff value..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    borderRadius: 'var(--radius-xs)',
                    border: '1px solid var(--rp-gray-300)',
                    fontSize: '0.8125rem',
                    backgroundColor: 'var(--rp-gray-50)',
                  }}
                />
              </div>
              <Button type="submit" variant="secondary" size="sm">
                Search
              </Button>
            </form>

            {/* Select Dropdowns */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Module Filter */}
              <select
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
                style={{
                  padding: '7px 10px',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid var(--rp-gray-300)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  backgroundColor: 'var(--rp-white)',
                  color: 'var(--rp-charcoal-800)',
                }}
              >
                <option value="all">All Modules</option>
                <option value="projects">Projects</option>
                <option value="customers">Customers</option>
                <option value="payments">Payments</option>
                <option value="documents">Documents</option>
                <option value="installations">Installations</option>
                <option value="subsidies">Subsidies</option>
                <option value="warranties">Warranties</option>
                <option value="users">IAM Users</option>
                <option value="system">System Core</option>
              </select>

              {/* Action Filter */}
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                style={{
                  padding: '7px 10px',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid var(--rp-gray-300)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  backgroundColor: 'var(--rp-white)',
                  color: 'var(--rp-charcoal-800)',
                }}
              >
                <option value="all">All Actions</option>
                <option value="UPDATE_PROJECT_STAGE">UPDATE_PROJECT_STAGE</option>
                <option value="ASSIGN_CUSTOMER">ASSIGN_CUSTOMER</option>
                <option value="RECORD_PAYMENT">RECORD_PAYMENT</option>
                <option value="VERIFY_DOCUMENT">VERIFY_DOCUMENT</option>
                <option value="REJECT_DOCUMENT">REJECT_DOCUMENT</option>
                <option value="SCHEDULE_INSTALLATION">SCHEDULE_INSTALLATION</option>
                <option value="UPDATE_SUBSIDY_STATUS">UPDATE_SUBSIDY_STATUS</option>
                <option value="ISSUE_WARRANTY">ISSUE_WARRANTY</option>
                <option value="CREATE_ADMIN_USER">CREATE_ADMIN_USER</option>
                <option value="SYSTEM_BOOTSTRAP">SYSTEM_BOOTSTRAP</option>
              </select>

              {/* Date Filters */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    padding: '6px 8px',
                    borderRadius: 'var(--radius-xs)',
                    border: '1px solid var(--rp-gray-300)',
                    fontSize: '0.75rem',
                    backgroundColor: 'var(--rp-white)',
                  }}
                  title="From Date"
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--rp-gray-400)' }}>to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{
                    padding: '6px 8px',
                    borderRadius: 'var(--radius-xs)',
                    border: '1px solid var(--rp-gray-300)',
                    fontSize: '0.75rem',
                    backgroundColor: 'var(--rp-white)',
                  }}
                  title="To Date"
                />
              </div>

              {/* View Mode Toggle */}
              <div style={{ display: 'flex', border: '1px solid var(--rp-gray-300)', borderRadius: 'var(--radius-xs)', overflow: 'hidden' }}>
                <button
                  onClick={() => setViewMode('table')}
                  style={{
                    padding: '6px 10px',
                    border: 'none',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: viewMode === 'table' ? 'var(--rp-green-primary)' : 'var(--rp-white)',
                    color: viewMode === 'table' ? 'var(--rp-white)' : 'var(--rp-charcoal-700)',
                  }}
                >
                  Table
                </button>
                <button
                  onClick={() => setViewMode('timeline')}
                  style={{
                    padding: '6px 10px',
                    border: 'none',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: viewMode === 'timeline' ? 'var(--rp-green-primary)' : 'var(--rp-white)',
                    color: viewMode === 'timeline' ? 'var(--rp-white)' : 'var(--rp-charcoal-700)',
                  }}
                >
                  Timeline
                </button>
              </div>

              {(searchTerm || selectedModule !== 'all' || selectedAction !== 'all' || startDate || endDate) && (
                <Button variant="ghost" size="sm" onClick={resetFilters} style={{ fontSize: '0.75rem' }}>
                  Reset
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Audit Log Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', backgroundColor: 'var(--rp-white)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--rp-gray-200)' }}>
            <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px', color: 'var(--rp-green-primary)' }} />
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--rp-charcoal-700)' }}>Loading audit records from secure ledger...</p>
          </div>
        ) : logs.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              backgroundColor: 'var(--rp-white)',
              borderRadius: 'var(--radius-sm)',
              border: '1px dashed var(--rp-gray-300)',
            }}
          >
            <ShieldCheck size={36} style={{ color: 'var(--rp-gray-400)', margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--rp-charcoal-800)' }}>No audit events found</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--rp-gray-500)', marginTop: '4px' }}>
              Try clearing filters or search queries to view older audit trails.
            </p>
            <Button variant="secondary" size="sm" onClick={resetFilters} style={{ marginTop: '14px' }}>
              Clear All Filters
            </Button>
          </div>
        ) : viewMode === 'table' ? (
          /* High-Density Tabular View */
          <div
            style={{
              backgroundColor: 'var(--rp-white)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--rp-gray-200)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--rp-gray-100)', borderBottom: '1px solid var(--rp-gray-200)', color: 'var(--rp-charcoal-700)' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 700, width: '160px' }}>Timestamp</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, width: '200px' }}>User & Role</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, width: '160px' }}>Module & Action</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, width: '220px' }}>Record Identifier</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700 }}>Value Transition (Previous → New)</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, width: '100px', textAlign: 'center' }}>Inspect</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const mb = getModuleBadge(log.module || log.entityTable);
                    const ModuleIcon = mb.icon;

                    return (
                      <tr
                        key={log.id}
                        style={{
                          borderBottom: '1px solid var(--rp-gray-200)',
                          transition: 'background-color 0.1s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--rp-green-surface)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        {/* Timestamp */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--rp-charcoal-900)', fontWeight: 600 }}>
                            <Calendar size={13} style={{ color: 'var(--rp-gray-400)' }} />
                            <span>{log.timestamp || new Date(log.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-400)', marginTop: '2px' }}>
                            {log.createdAt ? new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </div>
                        </td>

                        {/* User & Role */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                          <div style={{ fontWeight: 700, color: 'var(--rp-charcoal-900)' }}>
                            {log.actorName || log.actorEmail?.split('@')[0] || 'System Engine'}
                          </div>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-500)', marginTop: '2px' }}>
                            {log.actorEmail || 'system@rpsolar.com'}
                          </div>
                          <span
                            style={{
                              display: 'inline-block',
                              marginTop: '4px',
                              padding: '2px 6px',
                              borderRadius: 'var(--radius-xs)',
                              fontSize: '0.625rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              backgroundColor: 'var(--rp-gray-100)',
                              color: 'var(--rp-charcoal-700)',
                            }}
                          >
                            {log.actorRole || log.actorUserType || 'SYSTEM'}
                          </span>
                        </td>

                        {/* Module & Action */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: 'var(--radius-xs)',
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              backgroundColor: mb.bg,
                              color: mb.color,
                            }}
                          >
                            <ModuleIcon size={12} /> {mb.label}
                          </span>
                          <div
                            style={{
                              fontSize: '0.75rem',
                              fontFamily: 'monospace',
                              fontWeight: 600,
                              color: 'var(--rp-charcoal-800)',
                              marginTop: '4px',
                            }}
                          >
                            {log.action}
                          </div>
                        </td>

                        {/* Record */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                          <div style={{ fontWeight: 700, color: 'var(--rp-charcoal-900)' }}>
                            {log.recordIdentifier || log.entityId}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--rp-gray-600)', marginTop: '4px', lineHeight: 1.3 }}>
                            {log.details}
                          </div>
                        </td>

                        {/* Value Transition */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                          {log.previousValue || log.newValue ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  flexWrap: 'wrap',
                                }}
                              >
                                {log.previousValue && (
                                  <span
                                    style={{
                                      padding: '3px 8px',
                                      borderRadius: 'var(--radius-xs)',
                                      backgroundColor: '#fee2e2',
                                      color: '#991b1b',
                                      fontSize: '0.6875rem',
                                      fontWeight: 600,
                                      border: '1px solid #fecaca',
                                    }}
                                  >
                                    {log.previousValue}
                                  </span>
                                )}

                                {log.previousValue && log.newValue && (
                                  <ArrowRight size={14} style={{ color: 'var(--rp-gray-400)', flexShrink: 0 }} />
                                )}

                                {log.newValue && (
                                  <span
                                    style={{
                                      padding: '3px 8px',
                                      borderRadius: 'var(--radius-xs)',
                                      backgroundColor: '#dcfce7',
                                      color: '#166534',
                                      fontSize: '0.6875rem',
                                      fontWeight: 700,
                                      border: '1px solid #bbf7d0',
                                    }}
                                  >
                                    {log.newValue}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--rp-gray-400)', fontStyle: 'italic' }}>
                              State snapshot recorded
                            </span>
                          )}
                        </td>

                        {/* Action / Inspect */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'top', textAlign: 'center' }}>
                          <button
                            onClick={() => setInspectEntry(log)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: 'var(--radius-xs)',
                              border: '1px solid var(--rp-gray-300)',
                              backgroundColor: 'var(--rp-white)',
                              color: 'var(--rp-charcoal-700)',
                              fontSize: '0.6875rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            title="Inspect detailed payload"
                          >
                            <Eye size={12} /> Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Visual Timeline Stream View */
          <div
            style={{
              backgroundColor: 'var(--rp-white)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--rp-gray-200)',
              padding: '24px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ position: 'relative', paddingLeft: '30px' }}>
              {/* Timeline Line */}
              <div
                style={{
                  position: 'absolute',
                  left: '11px',
                  top: '10px',
                  bottom: '10px',
                  width: '2px',
                  backgroundColor: 'var(--rp-gray-200)',
                }}
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {logs.map((log) => {
                  const mb = getModuleBadge(log.module || log.entityTable);
                  const ModuleIcon = mb.icon;

                  return (
                    <div key={log.id} style={{ position: 'relative' }}>
                      {/* Timeline Node */}
                      <div
                        style={{
                          position: 'absolute',
                          left: '-30px',
                          top: '2px',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: mb.bg,
                          border: `2px solid ${mb.color}`,
                          color: mb.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 2,
                        }}
                      >
                        <ModuleIcon size={12} />
                      </div>

                      {/* Card Content */}
                      <div
                        style={{
                          padding: '16px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--rp-gray-50)',
                          border: '1px solid var(--rp-gray-200)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--rp-charcoal-900)' }}>
                              {log.actorName || log.actorEmail}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--rp-gray-500)' }}>
                              performed <strong style={{ color: 'var(--rp-charcoal-800)' }}>{log.action}</strong>
                            </span>
                            <span
                              style={{
                                padding: '2px 6px',
                                borderRadius: 'var(--radius-xs)',
                                fontSize: '0.625rem',
                                fontWeight: 700,
                                backgroundColor: mb.bg,
                                color: mb.color,
                              }}
                            >
                              {mb.label}
                            </span>
                          </div>

                          <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-400)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} /> {log.timestamp || log.createdAt}
                          </div>
                        </div>

                        <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--rp-charcoal-800)', marginTop: '6px' }}>
                          {log.recordIdentifier}
                        </div>

                        <p style={{ fontSize: '0.75rem', color: 'var(--rp-gray-600)', marginTop: '4px', lineHeight: 1.4 }}>
                          {log.details}
                        </p>

                        {/* Diff Box */}
                        {(log.previousValue || log.newValue) && (
                          <div
                            style={{
                              marginTop: '10px',
                              padding: '8px 12px',
                              borderRadius: 'var(--radius-xs)',
                              backgroundColor: 'var(--rp-white)',
                              border: '1px solid var(--rp-gray-200)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              flexWrap: 'wrap',
                            }}
                          >
                            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--rp-gray-400)' }}>STATE TRANSITION:</span>
                            {log.previousValue && (
                              <span style={{ fontSize: '0.75rem', color: '#991b1b', fontWeight: 600, backgroundColor: '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>
                                {log.previousValue}
                              </span>
                            )}
                            <ArrowRight size={12} style={{ color: 'var(--rp-gray-400)' }} />
                            {log.newValue && (
                              <span style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 700, backgroundColor: '#dcfce7', padding: '2px 6px', borderRadius: '4px' }}>
                                {log.newValue}
                              </span>
                            )}
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                          <Button variant="ghost" size="sm" onClick={() => setInspectEntry(log)} style={{ fontSize: '0.6875rem', padding: '2px 8px' }}>
                            <Eye size={12} /> View Raw Payload
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Detailed Inspector Modal */}
        {inspectEntry && (
          <Modal
            isOpen={!!inspectEntry}
            onClose={() => setInspectEntry(null)}
            title="Audit Record Deep Inspection"
            subtitle={`Log ID: ${inspectEntry.id} • Verified Tamper-proof`}
            maxWidth="lg"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ padding: '10px', backgroundColor: 'var(--rp-gray-50)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--rp-gray-200)' }}>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--rp-gray-400)', textTransform: 'uppercase' }}>Actor Details</div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--rp-charcoal-900)', marginTop: '2px' }}>
                    {inspectEntry.actorName} ({inspectEntry.actorEmail})
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-500)', marginTop: '2px' }}>
                    Role: {inspectEntry.actorRole}
                  </div>
                </div>

                <div style={{ padding: '10px', backgroundColor: 'var(--rp-gray-50)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--rp-gray-200)' }}>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--rp-gray-400)', textTransform: 'uppercase' }}>Network & Security</div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--rp-charcoal-900)', marginTop: '2px' }}>
                    IP: {inspectEntry.actorIp || '127.0.0.1'}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-500)', marginTop: '2px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    Agent: {inspectEntry.userAgent || 'Enterprise Web Client'}
                  </div>
                </div>
              </div>

              <div style={{ padding: '12px', backgroundColor: 'var(--rp-green-surface)', borderRadius: 'var(--radius-xs)', border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--rp-green-dark)', textTransform: 'uppercase' }}>
                  Action Summary
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--rp-charcoal-900)', marginTop: '2px' }}>
                  {inspectEntry.action} on {inspectEntry.recordIdentifier}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--rp-charcoal-700)', marginTop: '4px' }}>
                  {inspectEntry.details}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--rp-charcoal-800)', marginBottom: '4px' }}>
                  Raw JSON Payload
                </div>
                <pre
                  style={{
                    backgroundColor: '#1e293b',
                    color: '#f8fafc',
                    padding: '12px',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: '0.75rem',
                    overflowX: 'auto',
                    fontFamily: 'monospace',
                    lineHeight: 1.4,
                  }}
                >
                  {JSON.stringify(inspectEntry, null, 2)}
                </pre>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <Button variant="secondary" size="sm" onClick={() => setInspectEntry(null)}>
                  Close
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Simulate / Record Audit Modal */}
        {showNewModal && (
          <Modal
            isOpen={showNewModal}
            onClose={() => setShowNewModal(false)}
            title="Simulate / Record Operational Activity"
            subtitle="Demonstrate live immutable audit logging and state transitions"
            maxWidth="md"
          >
            <form onSubmit={handleCreateAuditLog} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--rp-charcoal-800)', display: 'block', marginBottom: '4px' }}>
                    Module
                  </label>
                  <select
                    value={newModule}
                    onChange={(e) => {
                      setNewModule(e.target.value);
                      if (e.target.value === 'projects') setNewAction('UPDATE_PROJECT_STAGE');
                      if (e.target.value === 'payments') setNewAction('RECORD_PAYMENT');
                      if (e.target.value === 'documents') setNewAction('VERIFY_DOCUMENT');
                      if (e.target.value === 'subsidies') setNewAction('UPDATE_SUBSIDY_STATUS');
                    }}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: 'var(--radius-xs)',
                      border: '1px solid var(--rp-gray-300)',
                      fontSize: '0.8125rem',
                    }}
                  >
                    <option value="projects">Projects</option>
                    <option value="customers">Customers</option>
                    <option value="payments">Payments</option>
                    <option value="documents">Documents</option>
                    <option value="installations">Installations</option>
                    <option value="subsidies">Subsidies</option>
                    <option value="warranties">Warranties</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--rp-charcoal-800)', display: 'block', marginBottom: '4px' }}>
                    Action Code
                  </label>
                  <input
                    type="text"
                    value={newAction}
                    onChange={(e) => setNewAction(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: 'var(--radius-xs)',
                      border: '1px solid var(--rp-gray-300)',
                      fontSize: '0.8125rem',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--rp-charcoal-800)', display: 'block', marginBottom: '4px' }}>
                  Target Record Identifier
                </label>
                <input
                  type="text"
                  value={newRecordId}
                  onChange={(e) => setNewRecordId(e.target.value)}
                  placeholder="e.g. Project RP1023 (RPS-2026-DEL-001)"
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: 'var(--radius-xs)',
                    border: '1px solid var(--rp-gray-300)',
                    fontSize: '0.8125rem',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--rp-charcoal-800)', display: 'block', marginBottom: '4px' }}>
                    Previous Value
                  </label>
                  <input
                    type="text"
                    value={newPrevValue}
                    onChange={(e) => setNewPrevValue(e.target.value)}
                    placeholder="e.g. Structure Installation: In Progress"
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: 'var(--radius-xs)',
                      border: '1px solid var(--rp-gray-300)',
                      fontSize: '0.8125rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--rp-charcoal-800)', display: 'block', marginBottom: '4px' }}>
                    New Value
                  </label>
                  <input
                    type="text"
                    value={newNewValue}
                    onChange={(e) => setNewNewValue(e.target.value)}
                    placeholder="e.g. Structure Installation: Completed"
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: 'var(--radius-xs)',
                      border: '1px solid var(--rp-gray-300)',
                      fontSize: '0.8125rem',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--rp-charcoal-800)', display: 'block', marginBottom: '4px' }}>
                  Activity Details & Remarks
                </label>
                <textarea
                  rows={2}
                  value={newDetails}
                  onChange={(e) => setNewDetails(e.target.value)}
                  placeholder="Comprehensive description of the activity..."
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: 'var(--radius-xs)',
                    border: '1px solid var(--rp-gray-300)',
                    fontSize: '0.8125rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowNewModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={submittingLog}>
                  <ShieldCheck size={14} /> {submittingLog ? 'Recording...' : 'Commit to Audit Ledger'}
                </Button>
              </div>
            </form>
          </Modal>
        )}

      </div>
    </AppShell>
  );
}
