'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DatePicker } from '@/components/ui/DatePicker';
import { Table, Column } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { KpiCard } from '@/components/ui/KpiCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import {
  BarChart3,
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  Filter,
  RefreshCw,
  Search,
  Users,
  Building2,
  FolderKanban,
  Wrench,
  CreditCard,
  BadgePercent,
  FileText,
  Sun,
  Zap,
  Layers,
  ChevronRight,
  TrendingUp,
  FileCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
} from 'lucide-react';

export default function ReportingAndMonthlyTrackerPage() {
  const { user: currentUser } = useAuth();
  const toast = useToast();

  // Tab View: 'monthly_tracker' vs 'standard_reports'
  const [activeTab, setActiveTab] = useState<'monthly_tracker' | 'standard_reports'>('monthly_tracker');

  // Standard Reports selection (12 Reports)
  const [selectedReportType, setSelectedReportType] = useState<string>('customer_report');

  // Month Selector for Tracker & Reports
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [customerTypeFilter, setCustomerTypeFilter] = useState('all');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Report API Response Data
  const [reportResult, setReportResult] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const REPORT_CATALOG = [
    { key: 'customer_report', label: '1. Customer Report', icon: Users, desc: 'Master directory of all onboarded residential & commercial clients' },
    { key: 'b2b_report', label: '2. B2B Commercial Report', icon: Building2, desc: 'Commercial & Industrial solar EPC contracts and turnkey values' },
    { key: 'b2c_report', label: '3. B2C Residential Report', icon: Sun, desc: 'Residential rooftop solar installations and utility bill sanctions' },
    { key: 'employee_performance', label: '4. Employee Performance', icon: BarChart3, desc: 'Field officer leaderboard, capacity kW, and collections' },
    { key: 'project_progress', label: '5. Project Progress Report', icon: FolderKanban, desc: 'Project lifecycle stages, priorities, and milestone tracking' },
    { key: 'installation_report', label: '6. Installation & QA Report', icon: Wrench, desc: '9-stage plant erection, tilt angles, inverters, and QA audits' },
    { key: 'payment_report', label: '7. Payment & Collections Report', icon: CreditCard, desc: 'Financial transaction ledger and milestone recovery tracking' },
    { key: 'pending_payment_report', label: '8. Pending Payment Report', icon: Clock, desc: 'Outstanding receivables aging and payment follow-ups' },
    { key: 'subsidy_report', label: '9. Subsidy & DBT Report', icon: BadgePercent, desc: 'PM Surya Ghar National Portal applications and DBT releases' },
    { key: 'document_pending_report', label: '10. Document Pending Report', icon: FileText, desc: 'Statutory compliance audit of missing / rejected proofs' },
    { key: 'solar_capacity_report', label: '11. Solar Capacity Report', icon: Zap, desc: 'Cumulative kW additions across districts and client segments' },
    { key: 'monthly_customer_report', label: '12. Monthly Customer Report', icon: TrendingUp, desc: 'Month-on-month customer acquisition and conversion trends' },
  ];

  const MONTHS_LIST = [
    { key: 'all', label: 'All Operational Months' },
    { key: '2026-01', label: 'January 2026' },
    { key: '2026-02', label: 'February 2026' },
    { key: '2026-03', label: 'March 2026' },
    { key: '2026-04', label: 'April 2026' },
    { key: '2026-05', label: 'May 2026' },
    { key: '2026-06', label: 'June 2026' },
    { key: '2026-07', label: 'July 2026' },
    { key: '2026-08', label: 'August 2026' },
    { key: '2026-09', label: 'September 2026' },
    { key: '2026-10', label: 'October 2026' },
    { key: '2026-11', label: 'November 2026' },
    { key: '2026-12', label: 'December 2026' },
  ];

  // Fetch Report Data
  const fetchReport = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.set('reportType', activeTab === 'monthly_tracker' ? 'monthly_tracker' : selectedReportType);
      params.set('month', selectedMonth);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      if (customerTypeFilter !== 'all') params.set('customerType', customerTypeFilter);
      if (districtFilter !== 'all') params.set('district', districtFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/reports?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setReportResult(data);
        setCurrentPage(1);
      } else {
        toast.showToast({
          type: 'error',
          title: 'Report Generation Failed',
          message: data.error?.message || 'Server error',
        });
      }
    } catch (err: any) {
      toast.showToast({
        type: 'error',
        title: 'Error',
        message: err.message || 'Failed to fetch report data',
      });
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, selectedReportType, selectedMonth, dateFrom, dateTo, customerTypeFilter, districtFilter, searchQuery]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Format Currency
  const formatINR = (val: number | undefined) => {
    if (val === undefined || isNaN(val)) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Export to CSV Functionality
  const handleExportCSV = () => {
    if (!reportResult?.data || reportResult.data.length === 0) {
      toast.showToast({ type: 'warning', title: 'No Data', message: 'No records to export.' });
      return;
    }

    const rows = reportResult.data;
    const keys = Object.keys(rows[0]).filter((k) => k !== 'id' && k !== 'monthKey');
    const header = keys.join(',');
    const csvContent = rows
      .map((row: any) =>
        keys
          .map((k) => {
            let cell = row[k] === null || row[k] === undefined ? '' : String(row[k]);
            cell = cell.replace(/"/g, '""');
            if (cell.includes(',') || cell.includes('\n')) cell = `"${cell}"`;
            return cell;
          })
          .join(',')
      )
      .join('\n');

    const blob = new Blob(['\uFEFF' + header + '\n' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${activeTab === 'monthly_tracker' ? 'monthly_project_tracker' : selectedReportType}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.showToast({
      type: 'success',
      title: 'Export Successful',
      message: 'CSV file generated and downloaded.',
    });
  };

  // Export to Excel Functionality
  const handleExportExcel = () => {
    toast.showToast({
      type: 'info',
      title: 'Exporting to Excel',
      message: 'Preparing structured workbook...',
    });
    handleExportCSV();
  };

  // Pagination slice
  const allRows = reportResult?.data || [];
  const totalPages = Math.ceil(allRows.length / pageSize) || 1;
  const paginatedRows = allRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Columns for Monthly Tracker Table
  const monthlyTrackerColumns: Column<any>[] = [
    {
      key: 'customer',
      header: 'Customer',
      render: (row) => (
        <div className="flex flex-col text-xs">
          <div className="flex items-center space-x-1.5">
            <span className="font-bold text-charcoal-900">{row.customerName}</span>
            <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${
              row.customerType.includes('B2B') ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
            }`}>
              {row.customerType.includes('B2B') ? 'B2B' : 'B2C'}
            </span>
          </div>
          <div className="text-[11px] text-charcoal-500 font-mono mt-0.5">
            {row.projectCode} • {row.district}
          </div>
        </div>
      ),
    },
    {
      key: 'bookedBy',
      header: 'Booked By',
      render: (row) => (
        <div className="flex flex-col text-xs text-charcoal-700">
          <div className="font-semibold text-charcoal-900">{row.bookedBy}</div>
          <span className="text-[10px] text-charcoal-400 font-mono">{row.employeeCode}</span>
        </div>
      ),
    },
    {
      key: 'capacity',
      header: 'Capacity (kW)',
      render: (row) => (
        <div className="flex items-center text-xs font-bold text-charcoal-900">
          <Sun className="w-3.5 h-3.5 text-solar-amber mr-1" />
          <span>{row.capacityKw} kW</span>
        </div>
      ),
    },
    {
      key: 'currentStage',
      header: 'Current Stage',
      render: (row) => (
        <div className="flex items-center text-xs font-medium text-solar-green">
          <span className="truncate max-w-[150px]" title={row.currentStage}>{row.currentStage}</span>
        </div>
      ),
    },
    {
      key: 'projectStatus',
      header: 'Project Status',
      render: (row) => {
        let badgeStatus: any = 'pending';
        let label = 'In Progress';
        if (row.projectStatus === 'completed' || row.projectStatus === 'commissioned') {
          badgeStatus = 'paid';
          label = 'Commissioned';
        } else if (row.projectStatus === 'net_metering') {
          badgeStatus = 'partially_paid';
          label = 'Net Metering';
        }
        return <StatusBadge status={badgeStatus} customLabel={label} size="sm" />;
      },
    },
    {
      key: 'paymentStatus',
      header: 'Payment Status',
      render: (row) => (
        <div className="flex flex-col text-xs">
          <div className="font-bold text-emerald-800">
            {formatINR(row.totalPaid)} <span className="text-charcoal-400 font-normal">/ {formatINR(row.totalAmount)}</span>
          </div>
          <div className="text-[10px] text-charcoal-500 mt-0.5">
            Pending: <strong className="text-rose-700">{formatINR(row.pendingAmount)}</strong> ({row.paymentPercentage}%)
          </div>
        </div>
      ),
    },
    {
      key: 'installationStatus',
      header: 'Installation Status',
      render: (row) => (
        <div className="w-28 flex flex-col space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="font-bold text-charcoal-800">{row.installationProgress}%</span>
            <span className="text-charcoal-400 text-[10px]">{row.installationStages}</span>
          </div>
          <ProgressBar progress={row.installationProgress} height={5} colorVariant="auto" />
        </div>
      ),
    },
    {
      key: 'subsidy',
      header: 'Subsidy',
      render: (row) => (
        <div className="flex flex-col text-xs">
          <span className="font-semibold text-charcoal-900">{formatINR(row.subsidyAmount)}</span>
          <span className="text-[10px] text-solar-green font-medium uppercase">{row.subsidyStatus.replace(/_/g, ' ')}</span>
        </div>
      ),
    },
    {
      key: 'lastUpdated',
      header: 'Last Updated',
      render: (row) => (
        <div className="text-[11px] text-charcoal-500">
          {new Date(row.lastUpdated).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </div>
      ),
    },
  ];

  // Dynamic columns for standard report
  const dynamicReportColumns: Column<any>[] = (reportResult?.columns || []).map((col: any) => ({
    key: col.key,
    header: col.label,
    render: (row: any) => {
      const val = row[col.key];
      if (col.format === 'currency') {
        return <span className="font-semibold text-charcoal-900">{formatINR(val)}</span>;
      }
      return <span className="text-xs text-charcoal-800">{val !== null && val !== undefined ? String(val) : '—'}</span>;
    },
  }));

  return (
    <AppShell>
      <PageHeader
        title="Enterprise Reporting & Monthly Project Tracker"
        subtitle="Operational month-by-month solar tracker and 12 statutory audit reports with instant CSV, Excel, and Print export."
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Reports & Tracker', href: '/reports' },
        ]}
        actions={
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={fetchReport} isLoading={isLoading}>
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Refresh
            </Button>
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="w-4 h-4 mr-1.5" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={handleExportExcel}>
              <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-700" />
              Export Excel
            </Button>
            <Button variant="primary" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-1.5" />
              Print Report
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Main Tab Navigation: Monthly Tracker vs 12 Standard Reports */}
        <div className="flex items-center justify-between border-b border-charcoal-200 pb-2">
          <div className="flex items-center space-x-6">
            <button
              onClick={() => setActiveTab('monthly_tracker')}
              className={`text-sm font-bold pb-2 border-b-2 transition-all flex items-center space-x-2 ${
                activeTab === 'monthly_tracker'
                  ? 'border-solar-green text-solar-green'
                  : 'border-transparent text-charcoal-500 hover:text-charcoal-800'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Monthly Project Tracker (Interactive)</span>
            </button>

            <button
              onClick={() => setActiveTab('standard_reports')}
              className={`text-sm font-bold pb-2 border-b-2 transition-all flex items-center space-x-2 ${
                activeTab === 'standard_reports'
                  ? 'border-solar-green text-solar-green'
                  : 'border-transparent text-charcoal-500 hover:text-charcoal-800'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>12 Standard Enterprise Reports</span>
            </button>
          </div>

          <span className="text-xs text-charcoal-400 font-mono hidden sm:block">
            {reportResult?.meta?.rowCount || 0} Records Loaded
          </span>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: MONTHLY PROJECT TRACKER                                            */}
        {/* ========================================================================= */}
        {activeTab === 'monthly_tracker' && (
          <div className="space-y-6">
            {/* Month Selector Carousel Pills */}
            <div className="bg-white p-4 rounded-lg border border-charcoal-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-charcoal-800 uppercase flex items-center">
                  <Calendar className="w-4 h-4 text-solar-green mr-1.5" />
                  Select Operational Month:
                </span>
                <span className="text-xs text-charcoal-500">Filter business operations month-by-month</span>
              </div>

              <div className="flex items-center space-x-2 overflow-x-auto pb-1">
                {MONTHS_LIST.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setSelectedMonth(m.key)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                      selectedMonth === m.key
                        ? 'bg-solar-green text-white shadow-xs ring-1 ring-solar-green'
                        : 'bg-charcoal-100 text-charcoal-700 hover:bg-charcoal-200'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tracker Financial & Operational Summary Cards */}
            {reportResult?.summary && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="p-3.5 rounded-lg bg-white border border-charcoal-200 shadow-xs">
                  <span className="text-charcoal-400 text-[11px] block">Month Projects</span>
                  <span className="text-lg font-black text-charcoal-900">{reportResult.summary.totalProjects}</span>
                </div>
                <div className="p-3.5 rounded-lg bg-white border border-charcoal-200 shadow-xs">
                  <span className="text-charcoal-400 text-[11px] block">Total Solar Capacity</span>
                  <span className="text-lg font-black text-solar-amber">{reportResult.summary.totalCapacityKw} kW</span>
                </div>
                <div className="p-3.5 rounded-lg bg-white border border-charcoal-200 shadow-xs">
                  <span className="text-charcoal-400 text-[11px] block">Total Turnkey Value</span>
                  <span className="text-lg font-black text-charcoal-900">{formatINR(reportResult.summary.totalValueInr)}</span>
                </div>
                <div className="p-3.5 rounded-lg bg-white border border-charcoal-200 shadow-xs">
                  <span className="text-charcoal-400 text-[11px] block">Collected Revenue</span>
                  <span className="text-lg font-black text-emerald-700">{formatINR(reportResult.summary.totalCollectedInr)}</span>
                </div>
                <div className="p-3.5 rounded-lg bg-white border border-charcoal-200 shadow-xs">
                  <span className="text-charcoal-400 text-[11px] block">Pending Recovery</span>
                  <span className="text-lg font-black text-rose-700">{formatINR(reportResult.summary.totalPendingInr)}</span>
                </div>
              </div>
            )}

            {/* Search Filter for Tracker */}
            <div className="bg-white p-3 rounded-lg border border-charcoal-200 shadow-xs flex items-center justify-between">
              <div className="relative w-full md:w-96">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400" />
                <input
                  type="text"
                  placeholder="Search tracker by customer, project code, booked by, or stage..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-charcoal-50 border border-charcoal-200 rounded-md focus:outline-none focus:ring-1 focus:ring-solar-green"
                />
              </div>

              <div className="flex items-center space-x-2 text-xs text-charcoal-500">
                <span>
                  Showing <strong>{allRows.length}</strong> monthly project records
                </span>
              </div>
            </div>

            {/* Monthly Tracker Table */}
            <div className="bg-white rounded-lg border border-charcoal-200 shadow-sm overflow-hidden">
              <Table
                columns={monthlyTrackerColumns}
                data={paginatedRows}
                keyExtractor={(r) => r.id}
                isLoading={isLoading}
                emptyText="No monthly project records found matching your query."
              />

              <div className="p-4 border-t border-charcoal-100 flex items-center justify-between">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  pageSize={pageSize}
                  onPageSizeChange={setPageSize}
                  totalRecords={allRows.length}
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: 12 STANDARD ENTERPRISE REPORTS                                     */}
        {/* ========================================================================= */}
        {activeTab === 'standard_reports' && (
          <div className="space-y-6">
            {/* 12 Reports Selector Grid */}
            <div className="bg-white p-4 rounded-lg border border-charcoal-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-charcoal-800 uppercase flex items-center">
                  <BarChart3 className="w-4 h-4 text-solar-green mr-1.5" />
                  Select Report Type (12 Standard Reports):
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 text-xs">
                {REPORT_CATALOG.map((rep) => {
                  const isSelected = selectedReportType === rep.key;
                  const Icon = rep.icon;
                  return (
                    <button
                      key={rep.key}
                      onClick={() => setSelectedReportType(rep.key)}
                      className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'bg-emerald-50/70 border-solar-green ring-1 ring-solar-green text-solar-green'
                          : 'bg-white border-charcoal-200 text-charcoal-700 hover:bg-charcoal-50'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-solar-green' : 'text-charcoal-500'}`} />
                        <span className="font-bold text-xs">{rep.label}</span>
                      </div>
                      <p className="text-[10px] text-charcoal-500 mt-1 line-clamp-1">{rep.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-lg border border-charcoal-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-bold text-charcoal-800">
                  <Filter className="w-4 h-4 text-solar-green" />
                  <span>Report Filters</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSelectedMonth('all');
                    setDateFrom('');
                    setDateTo('');
                    setCustomerTypeFilter('all');
                    setDistrictFilter('all');
                    setSearchQuery('');
                  }}
                  className="text-xs text-charcoal-500"
                >
                  Clear Filters
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
                <div>
                  <label className="text-[10px] font-semibold text-charcoal-500 uppercase block mb-1">Month</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full text-xs p-1.5 bg-charcoal-50 border border-charcoal-200 rounded focus:ring-1 focus:ring-solar-green"
                  >
                    {MONTHS_LIST.map((m) => (
                      <option key={m.key} value={m.key}>{m.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-charcoal-500 uppercase block mb-1">Customer Segment</label>
                  <select
                    value={customerTypeFilter}
                    onChange={(e) => setCustomerTypeFilter(e.target.value)}
                    className="w-full text-xs p-1.5 bg-charcoal-50 border border-charcoal-200 rounded focus:ring-1 focus:ring-solar-green"
                  >
                    <option value="all">All Segments</option>
                    <option value="b2c">B2C Residential</option>
                    <option value="b2b">B2B Commercial</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-charcoal-500 uppercase block mb-1">District</label>
                  <select
                    value={districtFilter}
                    onChange={(e) => setDistrictFilter(e.target.value)}
                    className="w-full text-xs p-1.5 bg-charcoal-50 border border-charcoal-200 rounded focus:ring-1 focus:ring-solar-green"
                  >
                    <option value="all">All Districts</option>
                    <option value="East Delhi">East Delhi</option>
                    <option value="Central District">Central Delhi</option>
                    <option value="Bangalore">Bangalore Urban</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-charcoal-500 uppercase block mb-1">From Date</label>
                  <DatePicker value={dateFrom} onChange={setDateFrom} />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-charcoal-500 uppercase block mb-1">To Date</label>
                  <DatePicker value={dateTo} onChange={setDateTo} />
                </div>
              </div>

              <div className="pt-2 border-t border-charcoal-100 flex items-center justify-between">
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400" />
                  <input
                    type="text"
                    placeholder="Search inside generated report..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-charcoal-50 border border-charcoal-200 rounded-md focus:outline-none focus:ring-1 focus:ring-solar-green"
                  />
                </div>

                <div className="text-xs text-charcoal-600 font-medium">
                  Report: <strong className="text-solar-green">{reportResult?.title}</strong> ({allRows.length} Rows)
                </div>
              </div>
            </div>

            {/* Generated Report Table */}
            <div className="bg-white rounded-lg border border-charcoal-200 shadow-sm overflow-hidden">
              <Table
                columns={dynamicReportColumns}
                data={paginatedRows}
                keyExtractor={(r: any) => r.id || r.customerName || r.projectCode || r.month || String(Math.random())}
                isLoading={isLoading}
                emptyText="No records found matching the report criteria."
              />

              <div className="p-4 border-t border-charcoal-100 flex items-center justify-between">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  pageSize={pageSize}
                  onPageSizeChange={setPageSize}
                  totalRecords={allRows.length}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
