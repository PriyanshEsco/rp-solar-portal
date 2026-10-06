'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { DatePicker } from '@/components/ui/DatePicker';
import { Modal } from '@/components/ui/Modal';
import { Drawer } from '@/components/ui/Drawer';
import { Table, Column } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { FilterBar } from '@/components/ui/FilterBar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { KpiCard } from '@/components/ui/KpiCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import {
  CreditCard,
  IndianRupee,
  Receipt,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Building2,
  User,
  Users,
  ShieldAlert,
  ArrowUpRight,
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  FileCheck,
  Calendar,
  Layers,
  MapPin,
  Zap,
  Sun,
  ShieldCheck,
  RefreshCw,
  Info,
} from 'lucide-react';
import { PaymentRecord, PaymentTransaction, PaymentInstallment } from '@/lib/types';

export default function PaymentManagementPage() {
  const { user: currentUser } = useAuth();
  const toast = useToast();

  const [payments, setPayments] = useState<any[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<{
    totalCollected: number;
    totalPending: number;
    totalOverdue: number;
    thisMonthCollection: number;
    collectionByEmployee: any[];
    collectionByAdmin: any[];
  }>({
    totalCollected: 0,
    totalPending: 0,
    totalOverdue: 0,
    thisMonthCollection: 0,
    collectionByEmployee: [],
    collectionByAdmin: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  // Filters & State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'b2b' | 'b2c'>('all');
  const [viewTab, setViewTab] = useState<'all' | 'partially_paid' | 'paid' | 'pending' | 'overdue'>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Drawer / Detail state
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerActiveTab, setDrawerActiveTab] = useState<'installments' | 'ledger' | 'specs'>('installments');

  // Record Payment Modal State
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recordForm, setRecordForm] = useState({
    projectId: '',
    installmentType: 'booking_amount',
    installmentTitle: 'Booking Amount',
    amount: '',
    paymentMode: 'UPI',
    paymentDate: new Date().toISOString().split('T')[0],
    referenceNumber: '',
    remarks: '',
  });

  // Receipt Modal for individual transaction print preview
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [activeReceiptTransaction, setActiveReceiptTransaction] = useState<{
    transaction: PaymentTransaction;
    payment: any;
  } | null>(null);

  // Fetch Payments and analytics
  const fetchPayments = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/payments');
      const data = await res.json();
      if (data.success) {
        setPayments(data.data || []);
        if (data.analytics) {
          setAnalytics(data.analytics);
        }
      } else {
        toast.error('Failed to load payments', data.error?.message || 'Server error');
      }
    } catch (err: any) {
      toast.error('Error', err.message || 'Failed to connect to payments endpoint');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch Projects for payment dropdown
  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (data.success) {
        setProjectsList(data.data || []);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchPayments();
    fetchProjects();
  }, [fetchPayments, fetchProjects]);

  // Format INR Currency
  const formatINR = (val: number | undefined) => {
    if (val === undefined || isNaN(val)) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Filtered payments
  const filteredPayments = payments.filter((item) => {
    // Tab filter
    if (viewTab !== 'all' && item.status !== viewTab) return false;
    // Status filter
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    // Type filter
    if (typeFilter === 'b2b' && !item.isB2B) return false;
    if (typeFilter === 'b2c' && item.isB2B) return false;
    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.customerName?.toLowerCase().includes(q);
      const matchCode = item.projectCode?.toLowerCase().includes(q);
      const matchDistrict = item.district?.toLowerCase().includes(q);
      const matchEmp = item.assignedEmployee?.name?.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchDistrict && !matchEmp) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredPayments.length / pageSize) || 1;
  const paginatedPayments = filteredPayments.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Handle opening Record Payment Modal
  const handleOpenRecordModal = (payment?: any) => {
    if (payment) {
      setRecordForm({
        projectId: payment.projectId,
        installmentType: 'booking_amount',
        installmentTitle: 'Booking Amount',
        amount: '',
        paymentMode: 'UPI',
        paymentDate: new Date().toISOString().split('T')[0],
        referenceNumber: '',
        remarks: '',
      });
    } else if (projectsList.length > 0) {
      setRecordForm({
        projectId: projectsList[0].id,
        installmentType: 'booking_amount',
        installmentTitle: 'Booking Amount',
        amount: '',
        paymentMode: 'UPI',
        paymentDate: new Date().toISOString().split('T')[0],
        referenceNumber: '',
        remarks: '',
      });
    }
    setIsRecordModalOpen(true);
  };

  // Submit payment transaction
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordForm.projectId) {
      toast.showToast({ type: 'error', title: 'Validation Error', message: 'Please select a Project' });
      return;
    }
    if (!recordForm.amount || Number(recordForm.amount) <= 0) {
      toast.showToast({ type: 'error', title: 'Validation Error', message: 'Please enter a valid amount' });
      return;
    }
    if (!recordForm.referenceNumber.trim()) {
      toast.showToast({ type: 'error', title: 'Validation Error', message: 'Please enter a Transaction / UTR reference number' });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recordForm),
      });
      const data = await res.json();
      if (data.success) {
        toast.showToast({
          type: 'success',
          title: 'Payment Recorded',
          message: data.message || 'Payment transaction successfully recorded in ledger.',
        });
        setIsRecordModalOpen(false);
        fetchPayments();
        // If drawer is open with this payment, refresh selected payment
        if (selectedPayment && selectedPayment.projectId === recordForm.projectId) {
          const updated = (await (await fetch('/api/payments')).json()).data.find(
            (p: any) => p.projectId === recordForm.projectId
          );
          if (updated) setSelectedPayment(updated);
        }
      } else {
        toast.showToast({
          type: 'error',
          title: 'Failed to record payment',
          message: data.error?.message || 'Server error',
        });
      }
    } catch (err: any) {
      toast.showToast({
        type: 'error',
        title: 'Error',
        message: err.message || 'Failed to submit payment transaction',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Selected project in record form
  const activeRecordProject = projectsList.find((p) => p.id === recordForm.projectId) || payments.find((p) => p.projectId === recordForm.projectId);

  // Table Columns
  const columns: Column<any>[] = [
    {
      key: 'customer',
      header: 'Customer & Project',
      render: (row) => (
        <div className="flex flex-col">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-charcoal-900 text-sm hover:text-solar-green cursor-pointer" onClick={() => {
              setSelectedPayment(row);
              setIsDrawerOpen(true);
            }}>
              {row.customerName}
            </span>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
              row.isB2B ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
            }`}>
              {row.customerType}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-xs text-charcoal-500 mt-0.5">
            <span className="font-mono bg-charcoal-100 px-1 py-0.5 rounded text-[11px] text-charcoal-700">{row.projectCode}</span>
            <span>•</span>
            <span>{row.district}, {row.state}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'technical',
      header: 'Load & Capacity',
      render: (row) => (
        <div className="flex flex-col text-xs">
          <div className="flex items-center text-charcoal-800 font-medium">
            <Sun className="w-3.5 h-3.5 text-solar-amber mr-1" />
            <span>{row.solarCapacityKw} kW Solar</span>
          </div>
          <div className="flex items-center text-charcoal-500 mt-0.5">
            <Zap className="w-3.5 h-3.5 text-charcoal-400 mr-1" />
            <span>{row.sanctionedLoadKw} kW Load</span>
          </div>
        </div>
      ),
    },
    {
      key: 'financials',
      header: 'Project Amount & Paid',
      render: (row) => (
        <div className="flex flex-col text-xs">
          <div className="font-semibold text-charcoal-900 text-sm">{formatINR(row.totalProjectAmount)}</div>
          <div className="text-emerald-700 font-medium mt-0.5">
            Paid: {formatINR(row.totalPaid)}
          </div>
        </div>
      ),
    },
    {
      key: 'pending',
      header: 'Pending Balance',
      render: (row) => (
        <div className="flex flex-col text-xs">
          <div className="font-bold text-rose-700 text-sm">{formatINR(row.pendingAmount)}</div>
          <div className="text-charcoal-400 text-[11px]">
            {row.pendingAmount === 0 ? 'Full Settled' : `Due: ${row.dueDate || 'On Milestone'}`}
          </div>
        </div>
      ),
    },
    {
      key: 'progress',
      header: 'Progress (%)',
      render: (row) => (
        <div className="w-32 flex flex-col space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-charcoal-800">{row.paymentPercentage}%</span>
            <span className="text-[10px] text-charcoal-500">
              {row.totalPaid >= row.totalProjectAmount ? '100% Done' : `${Math.round(100 - row.paymentPercentage)}% left`}
            </span>
          </div>
          <ProgressBar
            progress={row.paymentPercentage}
            height={6}
            colorVariant={row.paymentPercentage >= 100 ? 'green' : row.paymentPercentage >= 50 ? 'solar' : 'auto'}
          />
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        let badgeStatus: any = 'pending';
        let label = 'Pending';
        if (row.status === 'paid' || row.paymentPercentage >= 100) {
          badgeStatus = 'paid';
          label = 'Paid';
        } else if (row.status === 'partially_paid' || (row.totalPaid > 0 && row.totalPaid < row.totalProjectAmount)) {
          badgeStatus = 'partially_paid';
          label = 'Partially Paid';
        } else if (row.status === 'overdue') {
          badgeStatus = 'rejected';
          label = 'Overdue';
        }
        return <StatusBadge status={badgeStatus} customLabel={label} size="sm" />;
      },
    },
    {
      key: 'assigned',
      header: 'Officer & Admin',
      render: (row) => (
        <div className="flex flex-col text-xs text-charcoal-600">
          <div className="font-medium text-charcoal-800 truncate max-w-[120px]">
            {row.assignedEmployee?.name || 'Unassigned'}
          </div>
          <div className="text-[11px] text-charcoal-400 truncate max-w-[120px]">
            {row.assignedAdmin?.name || 'Regional Office'}
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSelectedPayment(row);
              setIsDrawerOpen(true);
            }}
            title="View Ledger & Milestones"
          >
            <Receipt className="w-3.5 h-3.5 mr-1 text-solar-green" />
            Ledger
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => handleOpenRecordModal(row)}
            disabled={row.pendingAmount <= 0}
            title={row.pendingAmount <= 0 ? 'Project is fully paid' : 'Record new payment installment'}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Pay
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Payment Management"
        subtitle="Manage customer payment schedules, B2C milestone installments, immutable ledger transactions, and collection analytics."
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Payments', href: '/payments' },
        ]}
        actions={
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={fetchPayments} isLoading={isLoading}>
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Refresh
            </Button>
            <Button variant="primary" onClick={() => handleOpenRecordModal()}>
              <Plus className="w-4 h-4 mr-1.5" />
              Record Payment
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* KPI Dashboard Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Total Collected"
            value={formatINR(analytics.totalCollected)}
            subtitle={`${Math.round(
              (analytics.totalCollected / ((analytics.totalCollected + analytics.totalPending) || 1)) * 100
            )}% of Total Portfolio`}
            accentColor="green"
            icon={<IndianRupee className="w-6 h-6 text-solar-green" />}
          />
          <KpiCard
            title="Total Pending"
            value={formatINR(analytics.totalPending)}
            subtitle="Outstanding milestone balances"
            accentColor="charcoal"
            icon={<Clock className="w-6 h-6 text-amber-600" />}
          />
          <KpiCard
            title="Overdue Receivables"
            value={formatINR(analytics.totalOverdue)}
            subtitle="Requires immediate follow-up"
            accentColor="solar"
            icon={<AlertCircle className="w-6 h-6 text-rose-600" />}
          />
          <KpiCard
            title="This Month's Collection"
            value={formatINR(analytics.thisMonthCollection)}
            subtitle="Current billing cycle throughput"
            accentColor="green"
            icon={<TrendingUp className="w-6 h-6 text-emerald-600" />}
          />
        </div>

        {/* Collection Breakdown Row (Employee & Admin widgets) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Collection by Employee */}
          <div className="bg-white rounded-lg border border-charcoal-200 shadow-sm p-4">
            <div className="flex items-center justify-between pb-3 border-b border-charcoal-100">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-solar-green" />
                <h3 className="font-semibold text-charcoal-900 text-sm">Collection by Field Officers / Employees</h3>
              </div>
              <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                {analytics.collectionByEmployee.length} Officers Active
              </span>
            </div>

            <div className="mt-3 divide-y divide-charcoal-100 max-h-56 overflow-y-auto pr-1">
              {analytics.collectionByEmployee.length === 0 ? (
                <div className="py-6 text-center text-xs text-charcoal-500">No employee collection records yet.</div>
              ) : (
                analytics.collectionByEmployee.map((emp) => {
                  const empTotal = emp.collected + emp.pending;
                  const empPct = empTotal > 0 ? Math.round((emp.collected / empTotal) * 100) : 0;
                  return (
                    <div key={emp.employeeId} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-full bg-solar-green/10 text-solar-green font-bold flex items-center justify-center text-xs">
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-charcoal-900">{emp.name}</div>
                          <div className="text-[11px] text-charcoal-500 font-mono">
                            {emp.code} • {emp.region} ({emp.count} Projects)
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-emerald-700 text-xs">{formatINR(emp.collected)}</div>
                        <div className="text-[10px] text-charcoal-500">
                          {empPct}% collected ({formatINR(emp.pending)} pend.)
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Collection by Admin */}
          <div className="bg-white rounded-lg border border-charcoal-200 shadow-sm p-4">
            <div className="flex items-center justify-between pb-3 border-b border-charcoal-100">
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-solar-amber" />
                <h3 className="font-semibold text-charcoal-900 text-sm">Collection by Regional Admin Branch</h3>
              </div>
              <span className="text-xs font-semibold bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full">
                {analytics.collectionByAdmin.length} Branches
              </span>
            </div>

            <div className="mt-3 divide-y divide-charcoal-100 max-h-56 overflow-y-auto pr-1">
              {analytics.collectionByAdmin.length === 0 ? (
                <div className="py-6 text-center text-xs text-charcoal-500">No regional branch collection records yet.</div>
              ) : (
                analytics.collectionByAdmin.map((adm) => {
                  const admTotal = adm.collected + adm.pending;
                  const admPct = admTotal > 0 ? Math.round((adm.collected / admTotal) * 100) : 0;
                  return (
                    <div key={adm.adminId} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-full bg-solar-amber/20 text-solar-amber font-bold flex items-center justify-center text-xs">
                          {adm.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-charcoal-900">{adm.name}</div>
                          <div className="text-[11px] text-charcoal-500 font-mono">
                            {adm.region} Scope • {adm.count} Projects
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-charcoal-900 text-xs">{formatINR(adm.collected)}</div>
                        <div className="text-[10px] text-charcoal-500">
                          {admPct}% recovery rate
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Clean FilterBar with Quick Status Tabs & Category Selector */}
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search by customer, project ID, district, or officer..."
          tabs={[
            { value: 'all', label: 'All Projects', count: payments.length },
            {
              value: 'partially_paid',
              label: 'Partially Paid',
              count: payments.filter((p) => p.status === 'partially_paid').length,
            },
            {
              value: 'paid',
              label: 'Fully Paid',
              count: payments.filter((p) => p.status === 'paid' || p.paymentPercentage >= 100).length,
            },
            {
              value: 'pending',
              label: 'Pending',
              count: payments.filter((p) => p.status === 'pending').length,
            },
            {
              value: 'overdue',
              label: 'Overdue',
              count: payments.filter((p) => p.status === 'overdue').length,
            },
          ]}
          activeTab={viewTab}
          onTabChange={(tab) => setViewTab(tab as any)}
          activeFilterCount={(viewTab !== 'all' || typeFilter !== 'all' || searchQuery) ? 1 : 0}
          onResetFilters={() => {
            setViewTab('all');
            setTypeFilter('all');
            setSearchQuery('');
          }}
          totalCount={filteredPayments.length}
        >
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="rp-select-filter"
          >
            <option value="all">All Categories</option>
            <option value="b2c">B2C Retail (Residential)</option>
            <option value="b2b">B2B Commercial</option>
          </select>
        </FilterBar>

        {/* Payments Table */}
        <div className="bg-white rounded-lg border border-charcoal-200 shadow-sm overflow-hidden">
          <Table
            columns={columns}
            data={paginatedPayments}
            keyExtractor={(item) => item.id}
            isLoading={isLoading}
            emptyTitle="No pending payments found."
            emptyDescription="All solar project milestone collections are currently settled or up to date."
          />

          <div className="p-4 border-t border-charcoal-100 flex items-center justify-between">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              totalRecords={filteredPayments.length}
            />
          </div>
        </div>
      </div>

      {/* DRAWER: Payment 360 & Milestone Installments & Ledger */}
      {selectedPayment && (
        <Drawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          title={`Payment Ledger: ${selectedPayment.projectCode}`}
          width="540px"
        >
          <div className="space-y-6 pb-8">
            {/* Header Project Financial Summary Card */}
            <div className="bg-charcoal-900 text-white rounded-lg p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-solar-amber text-charcoal-900 font-bold uppercase tracking-wider">
                      {selectedPayment.customerType}
                    </span>
                    <span className="text-xs text-charcoal-300 font-mono">{selectedPayment.projectCode}</span>
                  </div>
                  <h2 className="text-lg font-bold text-white mt-1">{selectedPayment.customerName}</h2>
                  <p className="text-xs text-charcoal-300 flex items-center mt-0.5">
                    <MapPin className="w-3.5 h-3.5 mr-1 text-solar-amber" />
                    {selectedPayment.district}, {selectedPayment.state}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-charcoal-400">Total Project Value</span>
                  <div className="text-xl font-bold text-white">{formatINR(selectedPayment.totalProjectAmount)}</div>
                </div>
              </div>

              {/* Progress and Financial Metrics Grid */}
              <div className="pt-3 border-t border-charcoal-700/80 grid grid-cols-3 gap-3 text-xs">
                <div className="bg-charcoal-800/60 rounded p-2.5">
                  <span className="text-charcoal-400 text-[11px]">Total Paid</span>
                  <div className="text-emerald-400 font-bold text-sm mt-0.5">
                    {formatINR(selectedPayment.totalPaid)}
                  </div>
                </div>
                <div className="bg-charcoal-800/60 rounded p-2.5">
                  <span className="text-charcoal-400 text-[11px]">Pending Amount</span>
                  <div className="text-rose-400 font-bold text-sm mt-0.5">
                    {formatINR(selectedPayment.pendingAmount)}
                  </div>
                </div>
                <div className="bg-charcoal-800/60 rounded p-2.5">
                  <span className="text-charcoal-400 text-[11px]">Collection Progress</span>
                  <div className="text-solar-amber font-bold text-sm mt-0.5">
                    {selectedPayment.paymentPercentage}%
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-charcoal-300">
                  <span>Recovery Progress</span>
                  <span>{selectedPayment.paymentPercentage}% Complete</span>
                </div>
                <div className="w-full bg-charcoal-700 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-solar-amber h-full transition-all duration-500 rounded-full"
                    style={{ width: `${selectedPayment.paymentPercentage}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Quick Action Bar in Drawer */}
            <div className="flex items-center justify-between bg-charcoal-50 p-3 rounded-lg border border-charcoal-200">
              <div className="flex items-center space-x-2 text-xs text-charcoal-600">
                <ShieldCheck className="w-4 h-4 text-solar-green" />
                <span>Double-entry verified payment ledger</span>
              </div>
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  handleOpenRecordModal(selectedPayment);
                }}
                disabled={selectedPayment.pendingAmount <= 0}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Record Next Installment
              </Button>
            </div>

            {/* Drawer Tabs */}
            <div className="border-b border-charcoal-200">
              <nav className="flex space-x-6 text-xs font-semibold">
                <button
                  onClick={() => setDrawerActiveTab('installments')}
                  className={`py-2 border-b-2 flex items-center space-x-1.5 ${
                    drawerActiveTab === 'installments'
                      ? 'border-solar-green text-solar-green'
                      : 'border-transparent text-charcoal-500 hover:text-charcoal-700'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>B2C Milestone Schedule ({selectedPayment.installments?.length || 0})</span>
                </button>
                <button
                  onClick={() => setDrawerActiveTab('ledger')}
                  className={`py-2 border-b-2 flex items-center space-x-1.5 ${
                    drawerActiveTab === 'ledger'
                      ? 'border-solar-green text-solar-green'
                      : 'border-transparent text-charcoal-500 hover:text-charcoal-700'
                  }`}
                >
                  <Receipt className="w-4 h-4" />
                  <span>Transaction Ledger ({selectedPayment.transactions?.length || 0})</span>
                </button>
                <button
                  onClick={() => setDrawerActiveTab('specs')}
                  className={`py-2 border-b-2 flex items-center space-x-1.5 ${
                    drawerActiveTab === 'specs'
                      ? 'border-solar-green text-solar-green'
                      : 'border-transparent text-charcoal-500 hover:text-charcoal-700'
                  }`}
                >
                  <Sun className="w-4 h-4" />
                  <span>Technical & Team Specs</span>
                </button>
              </nav>
            </div>

            {/* TAB 1: B2C MILESTONE SCHEDULE */}
            {drawerActiveTab === 'installments' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-charcoal-600 bg-emerald-50/70 p-3 rounded-lg border border-emerald-100">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>
                      Standard 5-Stage B2C Milestone Payment Schedule (Booking Amount + 4 Installments)
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {(selectedPayment.installments && selectedPayment.installments.length > 0) ? (
                    selectedPayment.installments.map((inst: PaymentInstallment, idx: number) => {
                      const isPaid = inst.status === 'paid' || (inst.paidAmount && inst.paidAmount >= inst.amount);
                      const isPartial = !isPaid && inst.paidAmount && inst.paidAmount > 0;
                      return (
                        <div
                          key={inst.id || idx}
                          className={`p-4 rounded-lg border transition-all ${
                            isPaid
                              ? 'bg-emerald-50/40 border-emerald-200'
                              : isPartial
                              ? 'bg-amber-50/40 border-amber-200'
                              : 'bg-white border-charcoal-200'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3">
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                                  isPaid
                                    ? 'bg-emerald-600 text-white'
                                    : isPartial
                                    ? 'bg-solar-amber text-charcoal-900'
                                    : 'bg-charcoal-100 text-charcoal-600'
                                }`}
                              >
                                {isPaid ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                              </div>
                              <div>
                                <h4 className="font-semibold text-charcoal-900 text-sm">{inst.title}</h4>
                                <div className="text-xs text-charcoal-500 mt-0.5">
                                  Stage Milestone: <span className="font-mono">{inst.stageName || inst.stageTrigger || 'Project Progression'}</span>
                                </div>
                                <div className="text-[11px] text-charcoal-400 mt-1 flex items-center space-x-2">
                                  <span>Due: {inst.dueDate || 'On Stage Completion'}</span>
                                  {inst.paidDate && (
                                    <>
                                      <span>•</span>
                                      <span className="text-emerald-700 font-medium">Cleared on: {inst.paidDate}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="font-bold text-charcoal-900 text-sm">{formatINR(inst.amount)}</div>
                              <div className="mt-1">
                                {isPaid ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                    ✓ Received
                                  </span>
                                ) : isPartial ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900">
                                    Partially Paid ({formatINR(inst.paidAmount)})
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-charcoal-100 text-charcoal-600">
                                    Pending
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-6 text-center text-xs text-charcoal-500 border rounded-lg">
                      No defined milestone installments for this project.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: TRANSACTION LEDGER HISTORY */}
            {drawerActiveTab === 'ledger' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-charcoal-500">
                  <span>Permanent, append-only payment audit records</span>
                  <span className="font-mono text-charcoal-700">{selectedPayment.transactions?.length || 0} Transactions</span>
                </div>

                {(!selectedPayment.transactions || selectedPayment.transactions.length === 0) ? (
                  <div className="p-8 text-center bg-charcoal-50 border border-charcoal-200 rounded-lg text-xs text-charcoal-500">
                    <Receipt className="w-8 h-8 text-charcoal-300 mx-auto mb-2" />
                    No payments have been recorded for this project yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedPayment.transactions.map((tx: PaymentTransaction) => (
                      <div
                        key={tx.id}
                        className="bg-white border border-charcoal-200 rounded-lg p-4 shadow-xs space-y-3 hover:border-solar-green transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-mono font-bold text-xs text-solar-green bg-solar-green/10 px-2 py-0.5 rounded">
                                {tx.receiptNumber}
                              </span>
                              <span className="text-xs font-semibold text-charcoal-900">
                                {tx.installmentTitle || tx.installmentType}
                              </span>
                            </div>
                            <div className="text-xs text-charcoal-500 mt-1 flex items-center space-x-2">
                              <span>Date: {tx.paymentDate}</span>
                              <span>•</span>
                              <span className="font-medium text-charcoal-700">Mode: {tx.paymentMode}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-base font-bold text-emerald-700">{formatINR(tx.amount)}</div>
                            <span className="inline-flex items-center text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">
                              ✓ Verified
                            </span>
                          </div>
                        </div>

                        <div className="bg-charcoal-50 rounded p-2.5 text-xs grid grid-cols-2 gap-2 text-charcoal-600">
                          <div>
                            <span className="text-charcoal-400 text-[10px] block">Reference / UTR No:</span>
                            <span className="font-mono font-semibold text-charcoal-800 text-[11px] break-all">
                              {tx.referenceNumber}
                            </span>
                          </div>
                          <div>
                            <span className="text-charcoal-400 text-[10px] block">Recorded By:</span>
                            <span className="text-charcoal-800 font-medium text-[11px]">
                              {tx.recordedByUserName || 'System Admin'}
                            </span>
                          </div>
                          {tx.remarks && (
                            <div className="col-span-2 pt-1 border-t border-charcoal-200/60">
                              <span className="text-charcoal-400 text-[10px] block">Remarks / Notes:</span>
                              <span className="text-charcoal-700 text-[11px] italic">{tx.remarks}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-end pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setActiveReceiptTransaction({
                                transaction: tx,
                                payment: selectedPayment,
                              });
                              setReceiptModalOpen(true);
                            }}
                          >
                            <Printer className="w-3 h-3 mr-1" />
                            Print Official Receipt
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: TECHNICAL & TEAM SPECS */}
            {drawerActiveTab === 'specs' && (
              <div className="space-y-4 text-xs">
                <div className="bg-white border border-charcoal-200 rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-charcoal-900 flex items-center">
                    <Sun className="w-4 h-4 text-solar-amber mr-1.5" />
                    Solar Installation & Utility Parameters
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-charcoal-700">
                    <div className="bg-charcoal-50 p-2.5 rounded">
                      <span className="text-charcoal-400 text-[11px] block">Solar Plant Capacity</span>
                      <span className="font-bold text-charcoal-900 text-sm">
                        {selectedPayment.solarCapacityKw} kW Rooftop
                      </span>
                    </div>
                    <div className="bg-charcoal-50 p-2.5 rounded">
                      <span className="text-charcoal-400 text-[11px] block">Sanctioned Connected Load</span>
                      <span className="font-bold text-charcoal-900 text-sm">
                        {selectedPayment.sanctionedLoadKw} kW Connected
                      </span>
                    </div>
                    <div className="bg-charcoal-50 p-2.5 rounded">
                      <span className="text-charcoal-400 text-[11px] block">Installation District</span>
                      <span className="font-medium text-charcoal-900">{selectedPayment.district}</span>
                    </div>
                    <div className="bg-charcoal-50 p-2.5 rounded">
                      <span className="text-charcoal-400 text-[11px] block">State Jurisdiction</span>
                      <span className="font-medium text-charcoal-900">{selectedPayment.state}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-charcoal-200 rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-charcoal-900 flex items-center">
                    <Users className="w-4 h-4 text-solar-green mr-1.5" />
                    Assigned Execution Team
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-charcoal-700">
                    <div className="bg-charcoal-50 p-2.5 rounded">
                      <span className="text-charcoal-400 text-[11px] block">Assigned Project Officer</span>
                      <span className="font-semibold text-charcoal-900">
                        {selectedPayment.assignedEmployee?.name || 'Unassigned'}
                      </span>
                      <span className="text-[10px] text-charcoal-500 block">
                        {selectedPayment.assignedEmployee?.code} • {selectedPayment.assignedEmployee?.region}
                      </span>
                    </div>
                    <div className="bg-charcoal-50 p-2.5 rounded">
                      <span className="text-charcoal-400 text-[11px] block">Supervising Regional Admin</span>
                      <span className="font-semibold text-charcoal-900">
                        {selectedPayment.assignedAdmin?.name || 'Central Head Office'}
                      </span>
                      <span className="text-[10px] text-charcoal-500 block">
                        {selectedPayment.assignedAdmin?.region || 'All Regions'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Drawer>
      )}

      {/* MODAL: Record Payment Transaction */}
      <Modal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        title="Record Verified Payment Transaction"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmitPayment} className="space-y-4">
          <div className="bg-charcoal-50 p-3 rounded-lg border border-charcoal-200 text-xs flex items-center space-x-2 text-charcoal-700">
            <Info className="w-4 h-4 text-solar-green flex-shrink-0" />
            <span>
              Every payment transaction recorded creates an immutable ledger entry with auto-recalculated balances.
            </span>
          </div>

          {/* Project & Customer Selection */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-charcoal-800">
              Select Solar Project / Customer <span className="text-rose-600">*</span>
            </label>
            <select
              value={recordForm.projectId}
              onChange={(e) => {
                const pId = e.target.value;
                setRecordForm({ ...recordForm, projectId: pId });
              }}
              className="w-full text-xs px-3 py-2 bg-white border border-charcoal-300 rounded-md focus:outline-none focus:ring-1 focus:ring-solar-green focus:border-solar-green"
              required
            >
              <option value="">-- Choose Project --</option>
              {projectsList.map((p) => {
                const payRecord = payments.find((pr) => pr.projectId === p.id);
                return (
                  <option key={p.id} value={p.id}>
                    {p.projectCode} — {p.projectName || p.customerName || 'Solar Plant'} (Capacity: {p.capacityKw || 5} kW | Pending: {formatINR(payRecord?.pendingAmount)})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Selected Project Specs Preview */}
          {activeRecordProject && (
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-3 text-xs grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <span className="text-charcoal-500 text-[10px] block">Customer / Type:</span>
                <span className="font-semibold text-charcoal-900">
                  {activeRecordProject.customerName || activeRecordProject.projectName}
                </span>
              </div>
              <div>
                <span className="text-charcoal-500 text-[10px] block">Solar Capacity / Load:</span>
                <span className="font-semibold text-charcoal-900">
                  {activeRecordProject.capacityKw || activeRecordProject.solarCapacityKw || 5} kW Solar ({activeRecordProject.sanctionedLoadKw || 5} kW Load)
                </span>
              </div>
              <div>
                <span className="text-charcoal-500 text-[10px] block">Total Project Value:</span>
                <span className="font-bold text-charcoal-900">
                  {formatINR(activeRecordProject.totalProjectAmount || activeRecordProject.totalCost || 300000)}
                </span>
              </div>
              <div>
                <span className="text-charcoal-500 text-[10px] block">Current Pending Balance:</span>
                <span className="font-bold text-rose-700">
                  {formatINR(activeRecordProject.pendingAmount !== undefined ? activeRecordProject.pendingAmount : (activeRecordProject.totalCost || 300000))}
                </span>
              </div>
            </div>
          )}

          {/* Installment Milestone Stage */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-charcoal-800">
                Installment Milestone <span className="text-rose-600">*</span>
              </label>
              <select
                value={recordForm.installmentType}
                onChange={(e) => {
                  const val = e.target.value;
                  const labelMap: Record<string, string> = {
                    booking_amount: 'Booking Amount',
                    installment_1: '1st Installment',
                    installment_2: '2nd Installment',
                    installment_3: '3rd Installment',
                    installment_4: '4th Installment',
                    custom_milestone: 'Custom Milestone / Stage Release',
                    subsidy_disbursement: 'MNRE / State Solar Subsidy',
                  };
                  setRecordForm({
                    ...recordForm,
                    installmentType: val,
                    installmentTitle: labelMap[val] || val,
                  });
                }}
                className="w-full text-xs px-3 py-2 bg-white border border-charcoal-300 rounded-md focus:outline-none focus:ring-1 focus:ring-solar-green focus:border-solar-green"
              >
                <option value="booking_amount">Booking Amount</option>
                <option value="installment_1">1st Installment (Structure Supply)</option>
                <option value="installment_2">2nd Installment (Wiring & Earthing)</option>
                <option value="installment_3">3rd Installment (System Installation)</option>
                <option value="installment_4">4th Installment (Net Meter / Handover)</option>
                <option value="subsidy_disbursement">MNRE / State Subsidy Disbursement</option>
                <option value="custom_milestone">Custom Milestone Amount</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-charcoal-800">
                Amount Received (₹) <span className="text-rose-600">*</span>
              </label>
              <Input
                type="number"
                placeholder="e.g. 50000"
                value={recordForm.amount}
                onChange={(e) => setRecordForm({ ...recordForm, amount: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Payment Mode & Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-charcoal-800">
                Payment Mode <span className="text-rose-600">*</span>
              </label>
              <select
                value={recordForm.paymentMode}
                onChange={(e) => setRecordForm({ ...recordForm, paymentMode: e.target.value })}
                className="w-full text-xs px-3 py-2 bg-white border border-charcoal-300 rounded-md focus:outline-none focus:ring-1 focus:ring-solar-green focus:border-solar-green"
              >
                <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                <option value="NEFT/RTGS">NEFT / RTGS Bank Transfer</option>
                <option value="Net Banking">Net Banking</option>
                <option value="Cheque">Cheque</option>
                <option value="Cash">Cash (Physical Receipt)</option>
                <option value="Jan Samarth Loan">Jan Samarth Loan Disbursement</option>
                <option value="Direct DBT Subsidy">Direct Benefit Transfer (DBT) Subsidy</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-charcoal-800">
                Payment Date <span className="text-rose-600">*</span>
              </label>
              <DatePicker
                value={recordForm.paymentDate}
                onChange={(val) => setRecordForm({ ...recordForm, paymentDate: val })}
              />
            </div>
          </div>

          {/* Reference / UTR Number */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-charcoal-800">
              Transaction / Reference / UTR / Cheque Number <span className="text-rose-600">*</span>
            </label>
            <Input
              placeholder="e.g. UTR-982347102938 or CHQ-002194"
              value={recordForm.referenceNumber}
              onChange={(e) => setRecordForm({ ...recordForm, referenceNumber: e.target.value })}
              required
            />
          </div>

          {/* Remarks */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-charcoal-800">Remarks / Notes</label>
            <Input
              placeholder="e.g. Received 2nd installment upon structure and panel mounting completion"
              value={recordForm.remarks}
              onChange={(e) => setRecordForm({ ...recordForm, remarks: e.target.value })}
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-charcoal-200 flex items-center justify-end space-x-3">
            <Button variant="outline" onClick={() => setIsRecordModalOpen(false)} type="button">
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Verify & Record Payment
            </Button>
          </div>
        </form>
      </Modal>

      {/* OFFICIAL RECEIPT MODAL */}
      {activeReceiptTransaction && (
        <Modal
          isOpen={receiptModalOpen}
          onClose={() => setReceiptModalOpen(false)}
          title="Official Payment Receipt"
          maxWidth="md"
        >
          <div className="p-4 space-y-6 bg-white border border-charcoal-300 rounded-lg">
            {/* Printable Receipt Card */}
            <div id="printable-receipt" className="border-2 border-charcoal-900 rounded p-6 space-y-4">
              <div className="flex items-center justify-between border-b-2 border-charcoal-900 pb-4">
                <div>
                  <h2 className="text-lg font-black text-solar-green tracking-tight">R P SOLAR PVT. LTD.</h2>
                  <p className="text-[11px] text-charcoal-600">Complete Solar EPC & Clean Energy Solutions</p>
                  <p className="text-[10px] text-charcoal-500 font-mono">GSTIN: 07AAACR1234F1Z8</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-charcoal-500">Receipt Voucher</span>
                  <div className="text-sm font-mono font-bold text-charcoal-900">
                    {activeReceiptTransaction.transaction.receiptNumber}
                  </div>
                  <div className="text-[11px] text-charcoal-600">
                    Date: {activeReceiptTransaction.transaction.paymentDate}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-charcoal-500 block text-[10px]">Received From:</span>
                  <span className="font-bold text-charcoal-900 text-sm">
                    {activeReceiptTransaction.payment.customerName}
                  </span>
                  <span className="block text-charcoal-600 text-[11px]">
                    Project: {activeReceiptTransaction.payment.projectCode}
                  </span>
                  <span className="block text-charcoal-600 text-[11px]">
                    District: {activeReceiptTransaction.payment.district}, {activeReceiptTransaction.payment.state}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-charcoal-500 block text-[10px]">Technical Specs:</span>
                  <span className="font-semibold text-charcoal-900 text-xs block">
                    Capacity: {activeReceiptTransaction.payment.solarCapacityKw} kW Solar
                  </span>
                  <span className="text-charcoal-600 text-[11px] block">
                    Load: {activeReceiptTransaction.payment.sanctionedLoadKw} kW Connected
                  </span>
                </div>
              </div>

              <div className="border border-charcoal-300 rounded overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-charcoal-100 text-charcoal-700 font-semibold border-b">
                    <tr>
                      <th className="p-2 text-left">Description / Milestone</th>
                      <th className="p-2 text-left">Payment Mode & Ref</th>
                      <th className="p-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2.5 font-medium text-charcoal-900">
                        {activeReceiptTransaction.transaction.installmentTitle || activeReceiptTransaction.transaction.installmentType}
                      </td>
                      <td className="p-2.5 text-charcoal-600 font-mono text-[11px]">
                        {activeReceiptTransaction.transaction.paymentMode} ({activeReceiptTransaction.transaction.referenceNumber})
                      </td>
                      <td className="p-2.5 text-right font-bold text-emerald-800 text-sm">
                        {formatINR(activeReceiptTransaction.transaction.amount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="pt-2 text-xs text-charcoal-600 space-y-1">
                <p><strong>Remarks:</strong> {activeReceiptTransaction.transaction.remarks || 'Payment cleared against project installment schedule.'}</p>
                <p className="text-[10px] text-charcoal-400">
                  Authorized Signatory: {activeReceiptTransaction.transaction.recordedByUserName || 'Finance Accounts Dept.'}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3">
              <Button variant="outline" onClick={() => setReceiptModalOpen(false)}>
                Close
              </Button>
              <Button variant="primary" onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-1.5" />
                Print Voucher
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </AppShell>
  );
}
