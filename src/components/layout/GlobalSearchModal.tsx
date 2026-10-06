'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  X,
  FolderKanban,
  Users,
  CreditCard,
  FileText,
  ArrowRight,
  RotateCw,
  Phone,
  MapPin,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';

export interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEntity?: (type: string, id: string) => void;
}

interface SearchResults {
  customers: Array<{
    id: string;
    name: string;
    code: string;
    phone: string;
    district: string;
    type: string;
    capacityKw: number;
    employeeName: string;
    link: string;
  }>;
  projects: Array<{
    id: string;
    code: string;
    customerName: string;
    district: string;
    capacityKw: number;
    currentStage: string;
    status: string;
    employeeName: string;
    link: string;
  }>;
  payments: Array<{
    id: string;
    projectCode: string;
    customerName: string;
    totalAmount: number;
    paidAmount: number;
    status: string;
    invoiceNumber: string;
    link: string;
  }>;
  documents: Array<{
    id: string;
    fileName: string;
    documentType: string;
    customerName: string;
    projectCode: string;
    verificationStatus: string;
    link: string;
  }>;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose, onSelectEntity }) => {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResults>({
    customers: [],
    projects: [],
    payments: [],
    documents: [],
  });
  const [totalMatches, setTotalMatches] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setQuery('');
      setResults({ customers: [], projects: [], payments: [], documents: [] });
      setTotalMatches(0);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults({ customers: [], projects: [], payments: [], documents: [] });
      setTotalMatches(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        if (data.success) {
          setResults(data.results || { customers: [], projects: [], payments: [], documents: [] });
          setTotalMatches(data.meta?.totalMatches || 0);
        }
      } catch (err) {
        console.error('Search fetch failed', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Keyboard shortcut listener
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

  const handleItemClick = (type: string, id: string, link: string) => {
    if (onSelectEntity) {
      onSelectEntity(type, id);
    }
    onClose();
    router.push(link);
  };

  const hasAnyResults =
    results.customers.length > 0 ||
    results.projects.length > 0 ||
    results.payments.length > 0 ||
    results.documents.length > 0;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '60px 20px 20px 20px',
      }}
      onClick={onClose}
    >
      <div
        className="animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '680px',
          backgroundColor: 'var(--rp-white)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--rp-gray-200)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '82vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--rp-gray-200)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: 'var(--rp-white)',
          }}
        >
          <Search size={20} style={{ color: loading ? 'var(--rp-green-primary)' : 'var(--rp-gray-400)' }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search by customer name, mobile, project ID, district, invoice, app no..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '0.9375rem',
              color: 'var(--rp-charcoal-900)',
              backgroundColor: 'transparent',
            }}
          />
          {loading && <RotateCw size={16} className="animate-spin" style={{ color: 'var(--rp-green-primary)' }} />}
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{ background: 'none', border: 'none', color: 'var(--rp-gray-400)', cursor: 'pointer', padding: '2px' }}
            >
              <X size={16} />
            </button>
          )}
          <kbd
            style={{
              padding: '2px 6px',
              fontSize: '0.6875rem',
              fontWeight: 600,
              backgroundColor: 'var(--rp-gray-100)',
              border: '1px solid var(--rp-gray-300)',
              borderRadius: 'var(--radius-xs)',
              color: 'var(--rp-charcoal-700)',
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results Container */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Default prompt when query is empty */}
          {!query && (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--rp-gray-400)' }}>
              <Sparkles size={28} style={{ margin: '0 auto 8px', color: 'var(--rp-solar-yellow)' }} />
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--rp-charcoal-800)' }}>
                Global Multi-Index Business Search
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--rp-gray-500)', marginTop: '4px' }}>
                Instant live lookup across Customers, Projects, Payments, Invoices, and Statutory Documents.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
                {['Rajesh Verma', 'RPS-2026', 'INV-2026', 'PMSGY'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setQuery(s)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-xs)',
                      border: '1px solid var(--rp-gray-200)',
                      backgroundColor: 'var(--rp-gray-50)',
                      fontSize: '0.6875rem',
                      color: 'var(--rp-charcoal-700)',
                      cursor: 'pointer',
                    }}
                  >
                    Try "{s}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading Skeleton */}
          {loading && !hasAnyResults && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Skeleton width="30%" height="16px" />
              <Skeleton width="100%" height="48px" />
              <Skeleton width="100%" height="48px" />
              <Skeleton width="30%" height="16px" style={{ marginTop: '8px' }} />
              <Skeleton width="100%" height="48px" />
            </div>
          )}

          {/* No results empty state */}
          {query.trim().length >= 2 && !loading && !hasAnyResults && (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--rp-gray-400)' }}>
              <Search size={32} style={{ margin: '0 auto 8px', color: 'var(--rp-gray-400)' }} />
              <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--rp-charcoal-800)' }}>
                No matching records found for "{query}"
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--rp-gray-500)', marginTop: '4px' }}>
                Please check the spelling or search by Customer Name, Mobile (+91), Project ID, or District.
              </p>
            </div>
          )}

          {/* Group 1: Customers */}
          {results.customers.length > 0 && (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  color: '#0284c7',
                  textTransform: 'uppercase',
                  marginBottom: '8px',
                }}
              >
                <Users size={14} /> Customers ({results.customers.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {results.customers.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleItemClick('customer', c.id, c.link)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-xs)',
                      backgroundColor: 'var(--rp-gray-50)',
                      border: '1px solid var(--rp-gray-200)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--rp-green-surface)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--rp-gray-50)')}
                  >
                    <div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--rp-charcoal-900)' }}>
                        {c.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '2px', fontSize: '0.6875rem', color: 'var(--rp-gray-500)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Phone size={10} /> {c.phone}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <MapPin size={10} /> {c.district}
                        </span>
                        <span>{c.capacityKw} kW ({c.type})</span>
                      </div>
                    </div>
                    <ArrowRight size={14} style={{ color: 'var(--rp-gray-400)' }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Group 2: Projects */}
          {results.projects.length > 0 && (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  color: '#059669',
                  textTransform: 'uppercase',
                  marginBottom: '8px',
                }}
              >
                <FolderKanban size={14} /> Solar Projects ({results.projects.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {results.projects.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleItemClick('project', p.id, p.link)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-xs)',
                      backgroundColor: 'var(--rp-gray-50)',
                      border: '1px solid var(--rp-gray-200)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--rp-green-surface)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--rp-gray-50)')}
                  >
                    <div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--rp-charcoal-900)' }}>
                        {p.code} • {p.customerName}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '2px', fontSize: '0.6875rem', color: 'var(--rp-gray-500)' }}>
                        <span>Stage: <strong>{p.currentStage}</strong></span>
                        <span>{p.capacityKw} kW</span>
                        <span>Eng: {p.employeeName}</span>
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '0.625rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-xs)',
                        backgroundColor: '#dcfce7',
                        color: '#166534',
                      }}
                    >
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Group 3: Payments & Invoices */}
          {results.payments.length > 0 && (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  color: '#d97706',
                  textTransform: 'uppercase',
                  marginBottom: '8px',
                }}
              >
                <CreditCard size={14} /> Payments & Billing ({results.payments.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {results.payments.map((pay) => (
                  <div
                    key={pay.id}
                    onClick={() => handleItemClick('payment', pay.id, pay.link)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-xs)',
                      backgroundColor: 'var(--rp-gray-50)',
                      border: '1px solid var(--rp-gray-200)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--rp-green-surface)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--rp-gray-50)')}
                  >
                    <div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--rp-charcoal-900)' }}>
                        {pay.invoiceNumber} • {pay.customerName}
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-500)', marginTop: '2px' }}>
                        Paid: ₹{pay.paidAmount.toLocaleString('en-IN')} of ₹{pay.totalAmount.toLocaleString('en-IN')} ({pay.projectCode})
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '0.625rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-xs)',
                        backgroundColor: pay.status === 'paid' ? '#dcfce7' : '#fef3c7',
                        color: pay.status === 'paid' ? '#166534' : '#92400e',
                      }}
                    >
                      {pay.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Group 4: Documents */}
          {results.documents.length > 0 && (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  color: '#0891b2',
                  textTransform: 'uppercase',
                  marginBottom: '8px',
                }}
              >
                <FileText size={14} /> Vault Documents ({results.documents.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {results.documents.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => handleItemClick('document', d.id, d.link)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-xs)',
                      backgroundColor: 'var(--rp-gray-50)',
                      border: '1px solid var(--rp-gray-200)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--rp-green-surface)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--rp-gray-50)')}
                  >
                    <div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--rp-charcoal-900)' }}>
                        {d.fileName}
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-500)', marginTop: '2px' }}>
                        {d.documentType.toUpperCase()} • Customer: {d.customerName} {d.projectCode && `(${d.projectCode})`}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '0.625rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-xs)',
                        backgroundColor: d.verificationStatus === 'verified' ? '#dcfce7' : d.verificationStatus === 'rejected' ? '#fee2e2' : '#fef3c7',
                        color: d.verificationStatus === 'verified' ? '#166534' : d.verificationStatus === 'rejected' ? '#991b1b' : '#92400e',
                      }}
                    >
                      {d.verificationStatus}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div
          style={{
            padding: '10px 20px',
            borderTop: '1px solid var(--rp-gray-200)',
            backgroundColor: 'var(--rp-gray-50)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: 'var(--rp-gray-500)',
          }}
        >
          <span>
            {totalMatches > 0 ? `${totalMatches} matching record${totalMatches === 1 ? '' : 's'}` : 'Type to search'}
          </span>
          <div style={{ display: 'flex', gap: '12px' }}>
            <span>Navigate <strong>↑↓</strong></span>
            <span>Select <strong>↵</strong></span>
            <span>Close <strong>ESC</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
