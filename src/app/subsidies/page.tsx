'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DatePicker } from '@/components/ui/DatePicker';
import { Modal } from '@/components/ui/Modal';
import { Drawer } from '@/components/ui/Drawer';
import { Table, Column } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { KpiCard } from '@/components/ui/KpiCard';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import {
  BadgePercent,
  IndianRupee,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Search,
  Building2,
  User,
  Sun,
  Zap,
  MapPin,
  Calendar,
  ExternalLink,
  Edit3,
  Check,
  XCircle,
  Landmark,
  FileCheck,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { SubsidyRecord, SubsidyStatus, SubsidyInspectionStatus } from '@/lib/types';

export default function SubsidyManagementPage() {
  const { user: currentUser } = useAuth();
  const toast = useToast();

  const [subsidies, setSubsidies] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<{
    totalSubsidies: number;
    applicableCount: number;
    totalSubsidyAmount: number;
    totalRedeemedAmount: number;
    totalUnderProcessAmount: number;
    approvedCount: number;
    redeemedCount: number;
    underProcessCount: number;
    pendingInspectionCount: number;
    notAppliedCount: number;
  }>({
    totalSubsidies: 0,
    applicableCount: 0,
    totalSubsidyAmount: 0,
    totalRedeemedAmount: 0,
    totalUnderProcessAmount: 0,
    approvedCount: 0,
    redeemedCount: 0,
    underProcessCount: 0,
    pendingInspectionCount: 0,
    notAppliedCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedSubsidy, setSelectedSubsidy] = useState<any | null>(null);
  const [subsidyForm, setSubsidyForm] = useState<{
    subsidyStatus: SubsidyStatus;
    applicationNumber: string;
    applicationDate: string;
    subsidyAmount: string;
    subsidyApplicable: boolean;
    schemeName: string;
    inspectionStatus: SubsidyInspectionStatus;
    inspectionDate: string;
    inspectorName: string;
    redemptionDate: string;
    dbtAccountNumber: string;
    remarks: string;
    rejectionReason: string;
  }>({
    subsidyStatus: 'under_process',
    applicationNumber: '',
    applicationDate: '',
    subsidyAmount: '78000',
    subsidyApplicable: true,
    schemeName: 'PM Surya Ghar: Muft Bijli Yojana (National Solar Portal)',
    inspectionStatus: 'passed',
    inspectionDate: '',
    inspectorName: '',
    redemptionDate: '',
    dbtAccountNumber: '',
    remarks: '',
    rejectionReason: '',
  });

  // Fetch Subsidies
  const fetchSubsidies = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/subsidy');
      const data = await res.json();
      if (data.success) {
        setSubsidies(data.data || []);
        if (data.analytics) {
          setAnalytics(data.analytics);
        }
      } else {
        toast.showToast({
          type: 'error',
          title: 'Failed to load subsidies',
          message: data.error?.message || 'Unauthorized or server error',
        });
      }
    } catch (err: any) {
      toast.showToast({
        type: 'error',
        title: 'Error',
        message: err.message || 'Failed to connect to subsidy endpoint',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSubsidies();
  }, [fetchSubsidies]);

  // Format INR Currency
  const formatINR = (val: number | undefined) => {
    if (val === undefined || isNaN(val)) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Filtered Subsidies
  const filteredSubsidies = subsidies.filter((item) => {
    if (statusFilter !== 'all' && item.subsidyStatus !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.customerName?.toLowerCase().includes(q);
      const matchCode = item.projectCode?.toLowerCase().includes(q);
      const matchApp = item.applicationNumber?.toLowerCase().includes(q);
      const matchDiscom = item.discomConsumerNo?.toLowerCase().includes(q);
      const matchDistrict = item.district?.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchApp && !matchDiscom && !matchDistrict) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredSubsidies.length / pageSize) || 1;
  const paginatedSubsidies = filteredSubsidies.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Open Update Modal
  const handleOpenUpdate = (row: any) => {
    setSelectedSubsidy(row);
    setSubsidyForm({
      subsidyStatus: row.subsidyStatus || 'under_process',
      applicationNumber: row.applicationNumber === 'Not Generated' ? '' : row.applicationNumber || '',
      applicationDate: row.applicationDate || new Date().toISOString().split('T')[0],
      subsidyAmount: String(row.subsidyAmount || 78000),
      subsidyApplicable: row.subsidyApplicable !== false,
      schemeName: row.schemeName || 'PM Surya Ghar: Muft Bijli Yojana (National Solar Portal)',
      inspectionStatus: row.inspectionStatus || 'pending',
      inspectionDate: row.inspectionDate || '',
      inspectorName: row.inspectorName || '',
      redemptionDate: row.redemptionDate || '',
      dbtAccountNumber: row.dbtAccountNumber || '',
      remarks: row.remarks || '',
      rejectionReason: row.rejectionReason || '',
    });
    setIsUpdateModalOpen(true);
  };

  // Submit Update
  const handleSubmitUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubsidy) return;

    try {
      const res = await fetch(`/api/subsidy/${selectedSubsidy.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subsidyStatus: subsidyForm.subsidyStatus,
          applicationNumber: subsidyForm.applicationNumber,
          applicationDate: subsidyForm.applicationDate,
          subsidyAmount: Number(subsidyForm.subsidyAmount),
          subsidyApplicable: subsidyForm.subsidyApplicable,
          schemeName: subsidyForm.schemeName,
          inspectionStatus: subsidyForm.inspectionStatus,
          inspectionDate: subsidyForm.inspectionDate,
          inspectorName: subsidyForm.inspectorName,
          redemptionDate: subsidyForm.redemptionDate || undefined,
          dbtAccountNumber: subsidyForm.dbtAccountNumber,
          remarks: subsidyForm.remarks,
          rejectionReason: subsidyForm.rejectionReason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.showToast({
          type: 'success',
          title: 'Subsidy Status Updated',
          message: data.message || 'Subsidy record and DBT redemption updated.',
        });
        setIsUpdateModalOpen(false);
        fetchSubsidies();
      } else {
        toast.showToast({
          type: 'error',
          title: 'Update Failed',
          message: data.error?.message || 'Server error',
        });
      }
    } catch (err: any) {
      toast.showToast({
        type: 'error',
        title: 'Error',
        message: err.message || 'Failed to update subsidy record',
      });
    }
  };

  // Table Columns
  const columns: Column<any>[] = [
    {
      key: 'customer',
      header: 'Customer & Project',
      render: (row) => (
        <div className="flex flex-col text-xs">
          <div className="flex items-center space-x-1.5">
            <span className="font-semibold text-charcoal-900">{row.customerName}</span>
            <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${
              row.isB2B ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
            }`}>
              {row.customerType}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-[11px] text-charcoal-500 mt-0.5">
            <span className="font-mono bg-charcoal-100 px-1 py-0.2 rounded text-[10px] text-charcoal-700">{row.projectCode}</span>
            <span>•</span>
            <span>{row.district}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'capacity',
      header: 'Solar Capacity',
      render: (row) => (
        <div className="flex flex-col text-xs">
          <div className="flex items-center font-bold text-charcoal-800">
            <Sun className="w-3.5 h-3.5 text-solar-amber mr-1" />
            <span>{row.solarCapacityKw} kW Plant</span>
          </div>
          <div className="text-[11px] text-charcoal-500 mt-0.5 font-mono">
            CA: {row.discomConsumerNo || 'Pending CA'}
          </div>
        </div>
      ),
    },
    {
      key: 'application',
      header: 'Application & Scheme',
      render: (row) => (
        <div className="flex flex-col text-xs">
          <div className="font-mono font-bold text-solar-green text-xs">
            {row.applicationNumber || 'Not Generated'}
          </div>
          <div className="text-[11px] text-charcoal-500 mt-0.5 truncate max-w-[170px]" title={row.schemeName}>
            {row.subsidyApplicable ? 'PM Surya Ghar DBT' : 'Commercial (Non-DBT)'}
          </div>
          {row.applicationDate && (
            <span className="text-[10px] text-charcoal-400">Applied: {row.applicationDate}</span>
          )}
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Subsidy Amount',
      render: (row) => (
        <div className="flex flex-col text-xs">
          <div className="font-bold text-emerald-700 text-sm">
            {row.subsidyApplicable ? formatINR(row.subsidyAmount) : 'N/A (Exempt)'}
          </div>
          <div className="text-[10px] text-charcoal-500 mt-0.5">
            {row.subsidyStatus === 'redeemed' ? (
              <span className="text-emerald-700 font-semibold">✓ DBT Credited</span>
            ) : row.subsidyApplicable ? (
              'Direct Bank Credit'
            ) : (
              'Depreciation Benefit'
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'inspection',
      header: 'Inspection Status',
      render: (row) => {
        let badgeStatus: any = 'pending';
        let label = 'Pending';

        if (row.inspectionStatus === 'passed') {
          badgeStatus = 'paid';
          label = 'Passed';
        } else if (row.inspectionStatus === 'scheduled') {
          badgeStatus = 'partially_paid';
          label = 'Scheduled';
        } else if (row.inspectionStatus === 'failed') {
          badgeStatus = 'rejected';
          label = 'Failed';
        }

        return (
          <div className="flex flex-col space-y-0.5">
            <StatusBadge status={badgeStatus} customLabel={label} size="sm" />
            {row.inspectorName && (
              <span className="text-[10px] text-charcoal-400 truncate max-w-[120px]" title={row.inspectorName}>
                by {row.inspectorName}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'subsidyStatus',
      header: 'Subsidy Status',
      render: (row) => {
        let badgeStatus: any = 'pending';
        let label = 'Not Applied';

        switch (row.subsidyStatus) {
          case 'redeemed':
            badgeStatus = 'paid';
            label = 'Redeemed (DBT Paid)';
            break;
          case 'approved':
            badgeStatus = 'completed';
            label = 'Approved';
            break;
          case 'under_process':
            badgeStatus = 'in_progress';
            label = 'Under Process';
            break;
          case 'inspection_pending':
            badgeStatus = 'partially_paid';
            label = 'Inspection Pending';
            break;
          case 'applied':
            badgeStatus = 'draft';
            label = 'Applied';
            break;
          case 'rejected':
            badgeStatus = 'rejected';
            label = 'Rejected';
            break;
          default:
            badgeStatus = 'pending';
            label = 'Not Applied';
        }

        return (
          <div className="flex flex-col space-y-0.5">
            <StatusBadge status={badgeStatus} customLabel={label} size="sm" />
            {row.redemptionDate && (
              <span className="text-[10px] text-emerald-700 font-medium">
                Credited: {row.redemptionDate}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleOpenUpdate(row)}
          className="text-xs px-2 py-1"
        >
          <Edit3 className="w-3.5 h-3.5 mr-1 text-solar-green" />
          Update
        </Button>
      ),
    },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Solar Subsidy & DBT National Portal Tracker"
        subtitle="Manage PM Surya Ghar Muft Bijli Yojana & State Solar Subsidy applications, CEIG/DISCOM inspection milestones, and direct benefit transfer (DBT) redemptions."
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Subsidies', href: '/subsidies' },
        ]}
        actions={
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={fetchSubsidies} isLoading={isLoading}>
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Refresh
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Decoupled Subsidy Architecture Notice */}
        <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3.5 text-xs text-amber-900 flex items-center space-x-2">
          <Info className="w-4 h-4 text-amber-700 flex-shrink-0" />
          <div>
            <strong>Decoupled Subsidy Governance:</strong> Subsidy records, inspection workflows, and DBT redemptions remain strictly decoupled from EPC stage progression and milestone payment collections.
          </div>
        </div>

        {/* KPI Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Total Subsidy Portfolio"
            value={formatINR(analytics.totalSubsidyAmount)}
            subtitle={`${analytics.applicableCount} eligible rooftop consumers`}
            accentColor="green"
            icon={<IndianRupee className="w-6 h-6 text-solar-green" />}
          />
          <KpiCard
            title="Under Process / In Queue"
            value={formatINR(analytics.totalUnderProcessAmount)}
            subtitle={`${analytics.underProcessCount} portal applications active`}
            accentColor="solar"
            icon={<Clock className="w-6 h-6 text-solar-amber" />}
          />
          <KpiCard
            title="DBT Redeemed & Disbursed"
            value={formatINR(analytics.totalRedeemedAmount)}
            subtitle={`${analytics.redeemedCount} consumer accounts credited`}
            accentColor="green"
            icon={<CheckCircle2 className="w-6 h-6 text-emerald-600" />}
          />
          <KpiCard
            title="Pending Inspections"
            value={analytics.pendingInspectionCount}
            subtitle="DISCOM / CEIG field audit clearance"
            accentColor="solar"
            icon={<AlertCircle className="w-6 h-6 text-rose-600" />}
          />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-charcoal-200 shadow-sm p-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0">
              {[
                { key: 'all', label: 'All Accounts', count: subsidies.length },
                {
                  key: 'under_process',
                  label: 'Under Process',
                  count: subsidies.filter((s) => s.subsidyStatus === 'under_process').length,
                },
                {
                  key: 'approved',
                  label: 'Approved',
                  count: subsidies.filter((s) => s.subsidyStatus === 'approved').length,
                },
                {
                  key: 'redeemed',
                  label: 'Redeemed (DBT Paid)',
                  count: subsidies.filter((s) => s.subsidyStatus === 'redeemed').length,
                },
                {
                  key: 'inspection_pending',
                  label: 'Inspection Pending',
                  count: subsidies.filter((s) => s.subsidyStatus === 'inspection_pending').length,
                },
                {
                  key: 'not_applied',
                  label: 'Not Applied',
                  count: subsidies.filter((s) => s.subsidyStatus === 'not_applied').length,
                },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex items-center space-x-1.5 ${
                    statusFilter === tab.key
                      ? 'bg-solar-green text-white shadow-sm'
                      : 'bg-charcoal-100 text-charcoal-600 hover:bg-charcoal-200'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      statusFilter === tab.key ? 'bg-white/20 text-white' : 'bg-charcoal-200 text-charcoal-700'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400" />
              <input
                type="text"
                placeholder="Search by customer, project ID, application #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-charcoal-50 border border-charcoal-200 rounded-md focus:outline-none focus:ring-1 focus:ring-solar-green"
              />
            </div>
          </div>
        </div>

        {/* Main Table */}
        <div className="bg-white rounded-lg border border-charcoal-200 shadow-sm overflow-hidden">
          <Table
            columns={columns}
            data={paginatedSubsidies}
            keyExtractor={(s) => s.id}
            isLoading={isLoading}
            emptyTitle="No subsidy applications found."
            emptyDescription="PM Surya Ghar National Portal applications will appear once residential solar capacity is registered."
          />

          <div className="p-4 border-t border-charcoal-100 flex items-center justify-between">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              totalRecords={filteredSubsidies.length}
            />
          </div>
        </div>
      </div>

      {/* MODAL: UPDATE SUBSIDY / RECORD DBT REDEMPTION */}
      {selectedSubsidy && (
        <Modal
          isOpen={isUpdateModalOpen}
          onClose={() => setIsUpdateModalOpen(false)}
          title={`Update Subsidy Tracking: ${selectedSubsidy.projectCode}`}
          maxWidth="lg"
        >
          <form onSubmit={handleSubmitUpdate} className="space-y-4 text-xs">
            <div className="bg-charcoal-50 p-3 rounded-lg border border-charcoal-200 grid grid-cols-2 md:grid-cols-4 gap-2 text-charcoal-700">
              <div>
                <span className="text-charcoal-400 text-[10px] block">Customer:</span>
                <span className="font-bold text-charcoal-900">{selectedSubsidy.customerName}</span>
              </div>
              <div>
                <span className="text-charcoal-400 text-[10px] block">Solar Plant Capacity:</span>
                <span className="font-bold text-charcoal-900">{selectedSubsidy.solarCapacityKw} kW</span>
              </div>
              <div>
                <span className="text-charcoal-400 text-[10px] block">DISCOM Consumer CA:</span>
                <span className="font-mono text-charcoal-900">{selectedSubsidy.discomConsumerNo || 'Pending'}</span>
              </div>
              <div>
                <span className="text-charcoal-400 text-[10px] block">Max Eligible DBT:</span>
                <span className="font-bold text-emerald-700">{formatINR(selectedSubsidy.subsidyAmount)}</span>
              </div>
            </div>

            {/* Subsidy Status Selector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-charcoal-800">
                  Subsidy Status <span className="text-rose-600">*</span>
                </label>
                <select
                  value={subsidyForm.subsidyStatus}
                  onChange={(e) => setSubsidyForm({ ...subsidyForm, subsidyStatus: e.target.value as any })}
                  className="w-full text-xs px-3 py-2 bg-white border border-charcoal-300 rounded-md focus:outline-none focus:ring-1 focus:ring-solar-green"
                >
                  <option value="not_applied">Not Applied</option>
                  <option value="applied">Applied (Portal Application Submitted)</option>
                  <option value="under_process">Under Process (National Portal Review)</option>
                  <option value="inspection_pending">Inspection Pending</option>
                  <option value="approved">Approved (Sanction Issued)</option>
                  <option value="redeemed">Redeemed (DBT Funds Credited to Bank)</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-charcoal-800">
                  Application Number (PM Surya Ghar / National Portal)
                </label>
                <Input
                  placeholder="e.g. PMSGY-DL-2026-98210"
                  value={subsidyForm.applicationNumber}
                  onChange={(e) => setSubsidyForm({ ...subsidyForm, applicationNumber: e.target.value })}
                />
              </div>
            </div>

            {/* Dates & Amount */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-charcoal-800">Application Date</label>
                <DatePicker
                  value={subsidyForm.applicationDate}
                  onChange={(val) => setSubsidyForm({ ...subsidyForm, applicationDate: val })}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-charcoal-800">Subsidy Amount (₹)</label>
                <Input
                  type="number"
                  value={subsidyForm.subsidyAmount}
                  onChange={(e) => setSubsidyForm({ ...subsidyForm, subsidyAmount: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-charcoal-800">Redemption Date (DBT Paid)</label>
                <DatePicker
                  value={subsidyForm.redemptionDate}
                  onChange={(val) => setSubsidyForm({ ...subsidyForm, redemptionDate: val })}
                />
              </div>
            </div>

            {/* Inspection Status & Inspector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-charcoal-800">
                  DISCOM / CEIG Inspection Status
                </label>
                <select
                  value={subsidyForm.inspectionStatus}
                  onChange={(e) => setSubsidyForm({ ...subsidyForm, inspectionStatus: e.target.value as any })}
                  className="w-full text-xs px-3 py-2 bg-white border border-charcoal-300 rounded-md focus:outline-none focus:ring-1 focus:ring-solar-green"
                >
                  <option value="pending">Pending Inspection</option>
                  <option value="scheduled">Scheduled with DISCOM AE</option>
                  <option value="passed">Passed (JIR Report Cleared)</option>
                  <option value="failed">Failed / Rectification Required</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-charcoal-800">Inspector Name / Officer</label>
                <Input
                  placeholder="e.g. BSES AE Dixit"
                  value={subsidyForm.inspectorName}
                  onChange={(e) => setSubsidyForm({ ...subsidyForm, inspectorName: e.target.value })}
                />
              </div>
            </div>

            {/* DBT Bank Account Number */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-charcoal-800">Customer DBT Bank Account Details</label>
              <Input
                placeholder="e.g. State Bank of India A/C **** 4412 (Aadhar Linked)"
                value={subsidyForm.dbtAccountNumber}
                onChange={(e) => setSubsidyForm({ ...subsidyForm, dbtAccountNumber: e.target.value })}
              />
            </div>

            {/* Remarks */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-charcoal-800">Subsidy Tracking Notes & Remarks</label>
              <Input
                placeholder="e.g. Joint Inspection Report (JIR) uploaded to National Solar Portal"
                value={subsidyForm.remarks}
                onChange={(e) => setSubsidyForm({ ...subsidyForm, remarks: e.target.value })}
              />
            </div>

            {/* Rejection Reason if applicable */}
            {subsidyForm.subsidyStatus === 'rejected' && (
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-rose-800">Rejection Reason</label>
                <Input
                  placeholder="e.g. Meter sanction mismatch / consumer load exceeds slab"
                  value={subsidyForm.rejectionReason}
                  onChange={(e) => setSubsidyForm({ ...subsidyForm, rejectionReason: e.target.value })}
                  required
                />
              </div>
            )}

            {/* Actions */}
            <div className="pt-4 border-t border-charcoal-200 flex items-center justify-end space-x-3">
              <Button variant="outline" onClick={() => setIsUpdateModalOpen(false)} type="button">
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Save Subsidy Record
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </AppShell>
  );
}
