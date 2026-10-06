'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { KpiCard } from '@/components/ui/KpiCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ChartCard } from '@/components/ui/ChartCard';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import {
  Users,
  Building2,
  UserCheck,
  FolderKanban,
  CheckCircle2,
  Clock,
  Sun,
  IndianRupee,
  BadgePercent,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
  Filter,
  RefreshCw,
  Layers,
  Wrench,
  FileText,
  Zap,
  Activity,
  Calendar,
  Compass,
  AlertCircle,
  ExternalLink,
  Check,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';

export default function RoleBasedDashboardPage() {
  const { user: currentUser } = useAuth();
  const toast = useToast();

  const [dashboardData, setDashboardData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Super Admin Filters
  const [selectedFY, setSelectedFY] = useState('FY 2025-26');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedAdmin, setSelectedAdmin] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Format Currency
  const formatINR = (val: number | undefined) => {
    if (val === undefined || isNaN(val)) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Fetch Dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.set('fy', selectedFY);
      params.set('month', selectedMonth);
      params.set('adminId', selectedAdmin);
      params.set('employeeId', selectedEmployee);
      params.set('type', selectedType);
      params.set('status', selectedStatus);

      const res = await fetch(`/api/dashboard?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setDashboardData(data);
      } else {
        toast.showToast({
          type: 'error',
          title: 'Failed to load dashboard',
          message: data.error?.message || 'Server error',
        });
      }
    } catch (err: any) {
      toast.showToast({
        type: 'error',
        title: 'Error',
        message: err.message || 'Could not connect to dashboard endpoint',
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedFY, selectedMonth, selectedAdmin, selectedEmployee, selectedType, selectedStatus]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const userRole = currentUser?.userType || 'super_admin';

  return (
    <AppShell>
      <PageHeader
        title={
          userRole === 'super_admin'
            ? 'Executive Super Admin Dashboard'
            : userRole === 'admin'
            ? `Branch Admin Dashboard (${dashboardData?.adminProfile?.region || 'Regional Office'})`
            : `Field Officer Operational Dashboard (${currentUser?.username || 'My Tasks'})`
        }
        subtitle={
          userRole === 'super_admin'
            ? 'Enterprise-wide solar EPC operations, revenue recovery, project pipeline, and statutory subsidy analytics.'
            : userRole === 'admin'
            ? 'Managing regional field officers, team solar capacity, milestone collections, and bottleneck resolution.'
            : 'Immediate actionable queue: pending statutory documents, customer milestone payments, site installations, and inspections.'
        }
        breadcrumbs={[
          { label: 'Portal', href: '/dashboard' },
          {
            label:
              userRole === 'super_admin'
                ? 'Super Admin'
                : userRole === 'admin'
                ? 'Admin'
                : 'Employee',
            href: '/dashboard',
          },
        ]}
        actions={
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={fetchDashboardData} isLoading={isLoading}>
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Refresh
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* ========================================================================= */}
        {/* 1. SUPER ADMIN DASHBOARD                                                  */}
        {/* ========================================================================= */}
        {userRole === 'super_admin' && dashboardData?.kpis && (
          <div className="space-y-6">
            {/* Modern Executive Filter Bar */}
            <div className="rp-card" style={{ padding: '18px 20px', border: '1px solid var(--rp-gray-200)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ padding: '6px', backgroundColor: 'var(--rp-green-surface)', borderRadius: 'var(--radius-sm)', color: 'var(--rp-green-dark)' }}>
                    <Filter size={16} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--rp-charcoal-900)' }}>
                      Enterprise Analytics &amp; Operations Filter
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--rp-gray-500)' }}>
                      Slice metrics across financial years, regional admins, field officers, and customer segments.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFY('FY 2025-26');
                      setSelectedMonth('all');
                      setSelectedAdmin('all');
                      setSelectedEmployee('all');
                      setSelectedType('all');
                      setSelectedStatus('all');
                    }}
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--rp-charcoal-600)',
                      backgroundColor: 'var(--rp-gray-100)',
                      border: '1px solid var(--rp-gray-200)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                    }}
                  >
                    Reset All Filters
                  </button>
                </div>
              </div>

              {/* Quick Filter Segment Pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--rp-gray-100)' }}>
                {[
                  { label: 'All Portfolio', type: 'all', status: 'all' },
                  { label: '🏠 B2C Residential', type: 'b2c', status: 'all' },
                  { label: '🏭 B2B Industrial & Commercial', type: 'b2b', status: 'all' },
                  { label: '⚡ Active Installations', type: 'all', status: 'in_progress' },
                  { label: '✅ 100% Commissioned', type: 'all', status: 'completed' },
                ].map((preset, idx) => {
                  const isActive = selectedType === preset.type && selectedStatus === preset.status;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedType(preset.type);
                        setSelectedStatus(preset.status);
                      }}
                      style={{
                        padding: '5px 12px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        borderRadius: '9999px',
                        border: isActive ? '1px solid var(--rp-green-primary)' : '1px solid var(--rp-gray-200)',
                        backgroundColor: isActive ? 'var(--rp-green-primary)' : 'var(--rp-white)',
                        color: isActive ? 'var(--rp-white)' : 'var(--rp-charcoal-700)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              {/* 6-Column Responsive Filter Selectors */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--rp-gray-500)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                    Financial Year
                  </label>
                  <select
                    value={selectedFY}
                    onChange={(e) => setSelectedFY(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', fontSize: '0.8125rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--rp-gray-300)', backgroundColor: 'var(--rp-white)', color: 'var(--rp-charcoal-900)' }}
                  >
                    <option value="FY 2025-26">FY 2025-26</option>
                    <option value="FY 2026-27">FY 2026-27</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--rp-gray-500)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                    Calendar Month
                  </label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', fontSize: '0.8125rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--rp-gray-300)', backgroundColor: 'var(--rp-white)', color: 'var(--rp-charcoal-900)' }}
                  >
                    <option value="all">All Months</option>
                    <option value="01">January</option>
                    <option value="02">February</option>
                    <option value="03">March</option>
                    <option value="04">April</option>
                    <option value="05">May</option>
                    <option value="06">June</option>
                    <option value="07">July</option>
                    <option value="08">August</option>
                    <option value="09">September</option>
                    <option value="10">October</option>
                    <option value="11">November</option>
                    <option value="12">December</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--rp-gray-500)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                    Admin Regional Office
                  </label>
                  <select
                    value={selectedAdmin}
                    onChange={(e) => setSelectedAdmin(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', fontSize: '0.8125rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--rp-gray-300)', backgroundColor: 'var(--rp-white)', color: 'var(--rp-charcoal-900)' }}
                  >
                    <option value="all">All Regional Branches</option>
                    {dashboardData?.filters?.availableAdmins?.map((a: any) => (
                      <option key={a.id} value={a.id}>{a.name} ({a.region})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--rp-gray-500)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                    Field Engineer / Officer
                  </label>
                  <select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', fontSize: '0.8125rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--rp-gray-300)', backgroundColor: 'var(--rp-white)', color: 'var(--rp-charcoal-900)' }}
                  >
                    <option value="all">All Field Officers</option>
                    {dashboardData?.filters?.availableEmployees?.map((emp: any) => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--rp-gray-500)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                    Customer Segment
                  </label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', fontSize: '0.8125rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--rp-gray-300)', backgroundColor: 'var(--rp-white)', color: 'var(--rp-charcoal-900)' }}
                  >
                    <option value="all">All Segments (B2C &amp; B2B)</option>
                    <option value="b2c">B2C Residential Rooftop</option>
                    <option value="b2b">B2B Commercial &amp; Industrial</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--rp-gray-500)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                    Project Stage Status
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', fontSize: '0.8125rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--rp-gray-300)', backgroundColor: 'var(--rp-white)', color: 'var(--rp-charcoal-900)' }}
                  >
                    <option value="all">All Statuses</option>
                    <option value="feasibility_survey">Feasibility &amp; Survey</option>
                    <option value="in_progress">Active Installation</option>
                    <option value="completed">Commissioned &amp; Closed</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 12 SUPER ADMIN EXECUTIVE KPIS */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <KpiCard
                title="Total Customers"
                value={dashboardData.kpis.totalCustomers}
                subtitle={`${dashboardData.kpis.b2cCustomers} B2C • ${dashboardData.kpis.b2bCustomers} B2B`}
                accentColor="green"
                icon={<Users className="w-6 h-6 text-solar-green" />}
              />
              <KpiCard
                title="Active Projects"
                value={dashboardData.kpis.activeProjects}
                subtitle="Under engineering execution"
                accentColor="solar"
                icon={<FolderKanban className="w-6 h-6 text-solar-amber" />}
              />
              <KpiCard
                title="Completed Projects"
                value={dashboardData.kpis.completedProjects}
                subtitle="100% Commissioned & Handed Over"
                accentColor="green"
                icon={<CheckCircle2 className="w-6 h-6 text-emerald-600" />}
              />
              <KpiCard
                title="Pending / Survey"
                value={dashboardData.kpis.pendingProjects}
                subtitle="Initial feasibility & TFR"
                accentColor="charcoal"
                icon={<Clock className="w-6 h-6 text-charcoal-500" />}
              />

              <KpiCard
                title="Total Solar Capacity"
                value={`${dashboardData.kpis.totalSolarCapacityKw} kW`}
                subtitle="Turnkey cumulative capacity"
                accentColor="solar"
                icon={<Sun className="w-6 h-6 text-solar-amber" />}
              />
              <KpiCard
                title="Total Payment Received"
                value={formatINR(dashboardData.kpis.totalPaymentReceived)}
                subtitle="Cleared in verified ledger"
                accentColor="green"
                icon={<IndianRupee className="w-6 h-6 text-emerald-600" />}
              />
              <KpiCard
                title="Pending Payment Balance"
                value={formatINR(dashboardData.kpis.pendingPayment)}
                subtitle="Milestone receivables due"
                accentColor="solar"
                icon={<Clock className="w-6 h-6 text-rose-600" />}
              />
              <KpiCard
                title="Subsidy Redeemed"
                value={formatINR(dashboardData.kpis.subsidyRedeemedAmount)}
                subtitle="Direct DBT to consumers"
                accentColor="green"
                icon={<BadgePercent className="w-6 h-6 text-solar-green" />}
              />

              <KpiCard
                title="Subsidy In Process"
                value={formatINR(dashboardData.kpis.subsidyPendingAmount)}
                subtitle="National Portal / PM Surya Ghar"
                accentColor="charcoal"
                icon={<BadgePercent className="w-6 h-6 text-amber-600" />}
              />
              <KpiCard
                title="B2B Commercial Accounts"
                value={dashboardData.kpis.b2bCustomers}
                subtitle="High-capacity industrial plants"
                accentColor="charcoal"
                icon={<Building2 className="w-6 h-6 text-purple-600" />}
              />
              <KpiCard
                title="B2C Residential Accounts"
                value={dashboardData.kpis.b2cCustomers}
                subtitle="Rooftop clean energy homes"
                accentColor="green"
                icon={<Users className="w-6 h-6 text-blue-600" />}
              />
              <KpiCard
                title="Active Field Staff"
                value={dashboardData.kpis.activeEmployees}
                subtitle="Engineers & regional officers"
                accentColor="green"
                icon={<UserCheck className="w-6 h-6 text-solar-green" />}
              />
            </div>

            {/* 9 ANALYTICAL GRAPHS & BREAKDOWNS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 1. Monthly Customer Onboarding */}
              <div className="bg-white p-5 rounded-lg border border-charcoal-200 shadow-xs space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-charcoal-900 text-sm flex items-center">
                    <TrendingUp className="w-4 h-4 text-solar-green mr-1.5" />
                    1. Monthly Customer Onboarding Trend
                  </h3>
                  <span className="text-xs text-charcoal-500 font-medium">B2C vs B2B</span>
                </div>
                <div className="space-y-3 pt-2">
                  {dashboardData.graphs.monthlyOnboarding.map((item: any) => (
                    <div key={item.month} className="space-y-1 text-xs">
                      <div className="flex justify-between font-medium">
                        <span className="text-charcoal-700">{item.month}</span>
                        <span className="text-charcoal-900 font-bold">{item.total} Clients ({item.b2c} B2C / {item.b2b} B2B)</span>
                      </div>
                      <div className="w-full bg-charcoal-100 h-2.5 rounded-full overflow-hidden flex">
                        <div className="bg-solar-green h-full" style={{ width: `${(item.b2c / item.total) * 100}%` }} title={`B2C: ${item.b2c}`} />
                        <div className="bg-purple-600 h-full" style={{ width: `${(item.b2b / item.total) * 100}%` }} title={`B2B: ${item.b2b}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Monthly Solar Capacity Added (kW) */}
              <div className="bg-white p-5 rounded-lg border border-charcoal-200 shadow-xs space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-charcoal-900 text-sm flex items-center">
                    <Sun className="w-4 h-4 text-solar-amber mr-1.5" />
                    2. Monthly Solar Capacity Addition (kW)
                  </h3>
                  <span className="text-xs text-solar-green font-bold">+28% MoM Growth</span>
                </div>
                <div className="space-y-3 pt-2">
                  {dashboardData.graphs.monthlyCapacityAdded.map((item: any) => (
                    <div key={item.month} className="space-y-1 text-xs">
                      <div className="flex justify-between font-medium">
                        <span className="text-charcoal-700">{item.month}</span>
                        <span className="text-charcoal-900 font-bold">{item.capacityKw} kW</span>
                      </div>
                      <ProgressBar
                        progress={Math.min(100, Math.round((item.capacityKw / 200) * 100))}
                        height={6}
                        colorVariant="solar"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. B2B vs B2C Portfolio Split */}
              <div className="bg-white p-5 rounded-lg border border-charcoal-200 shadow-xs space-y-4">
                <h3 className="font-bold text-charcoal-900 text-sm flex items-center">
                  <Building2 className="w-4 h-4 text-purple-600 mr-1.5" />
                  3. B2B Commercial vs B2C Residential Distribution
                </h3>
                <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                  <div className="p-4 rounded-lg bg-purple-50/60 border border-purple-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-900 text-sm">B2B Commercial</span>
                      <span className="font-mono text-purple-700 font-bold text-xs">
                        {dashboardData.graphs.customerTypeDistribution.b2b.percentage}%
                      </span>
                    </div>
                    <div className="text-xl font-black text-purple-950">
                      {dashboardData.graphs.customerTypeDistribution.b2b.capacityKw} kW
                    </div>
                    <p className="text-[11px] text-purple-800">
                      {dashboardData.graphs.customerTypeDistribution.b2b.count} Industrial accounts
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-blue-50/60 border border-blue-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-900 text-sm">B2C Residential</span>
                      <span className="font-mono text-blue-700 font-bold text-xs">
                        {dashboardData.graphs.customerTypeDistribution.b2c.percentage}%
                      </span>
                    </div>
                    <div className="text-xl font-black text-blue-950">
                      {dashboardData.graphs.customerTypeDistribution.b2c.capacityKw} kW
                    </div>
                    <p className="text-[11px] text-blue-800">
                      {dashboardData.graphs.customerTypeDistribution.b2c.count} Rooftop home accounts
                    </p>
                  </div>
                </div>
              </div>

              {/* 4. Project Status Pipeline */}
              <div className="bg-white p-5 rounded-lg border border-charcoal-200 shadow-xs space-y-4">
                <h3 className="font-bold text-charcoal-900 text-sm flex items-center">
                  <Layers className="w-4 h-4 text-solar-green mr-1.5" />
                  4. Project Operational Status Pipeline
                </h3>
                <div className="space-y-2.5 pt-2">
                  {dashboardData.graphs.projectStatusPipeline.map((item: any) => (
                    <div key={item.status} className="flex items-center justify-between text-xs p-2 rounded bg-charcoal-50">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="font-semibold text-charcoal-800">{item.status}</span>
                      </div>
                      <span className="font-bold text-charcoal-900 font-mono text-sm">{item.count} Projects</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. 9-Stage Installation Progress Distribution */}
              <div className="bg-white p-5 rounded-lg border border-charcoal-200 shadow-xs space-y-4">
                <h3 className="font-bold text-charcoal-900 text-sm flex items-center">
                  <Wrench className="w-4 h-4 text-solar-green mr-1.5" />
                  5. Plant Installation Progress Distribution
                </h3>
                <div className="space-y-3 pt-2">
                  {dashboardData.graphs.installationProgressDistribution.map((item: any) => (
                    <div key={item.range} className="space-y-1 text-xs">
                      <div className="flex justify-between font-medium">
                        <span className="text-charcoal-700">{item.range}</span>
                        <span className="font-bold text-charcoal-900 font-mono">{item.count} Plants</span>
                      </div>
                      <div className="w-full bg-charcoal-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-solar-green h-full"
                          style={{ width: `${Math.min(100, item.count * 25)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 6. Payment Collection vs Target Recovery */}
              <div className="bg-white p-5 rounded-lg border border-charcoal-200 shadow-xs space-y-4">
                <h3 className="font-bold text-charcoal-900 text-sm flex items-center">
                  <IndianRupee className="w-4 h-4 text-emerald-600 mr-1.5" />
                  6. Monthly Payment Collection vs Targets
                </h3>
                <div className="space-y-3 pt-2">
                  {dashboardData.graphs.paymentCollectionTrends.map((item: any) => {
                    const pct = Math.round((item.collected / item.target) * 100);
                    return (
                      <div key={item.month} className="space-y-1 text-xs">
                        <div className="flex justify-between font-medium">
                          <span className="text-charcoal-700">{item.month}</span>
                          <span className="font-bold text-charcoal-900">
                            {formatINR(item.collected)} / {formatINR(item.target)} ({pct}%)
                          </span>
                        </div>
                        <ProgressBar progress={pct} height={6} colorVariant="green" />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 7. Subsidy Status Distribution */}
              <div className="bg-white p-5 rounded-lg border border-charcoal-200 shadow-xs space-y-4">
                <h3 className="font-bold text-charcoal-900 text-sm flex items-center">
                  <BadgePercent className="w-4 h-4 text-solar-green mr-1.5" />
                  7. National Portal Subsidy Processing Breakdown
                </h3>
                <div className="space-y-2 pt-2">
                  {dashboardData.graphs.subsidyStatusDistribution.map((item: any) => (
                    <div key={item.status} className="flex items-center justify-between text-xs p-2 rounded bg-charcoal-50">
                      <span className="font-medium text-charcoal-800">{item.status}</span>
                      <span className="font-bold text-solar-green font-mono">{item.count} Accounts</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 8. Employee Performance Leaderboard */}
              <div className="bg-white p-5 rounded-lg border border-charcoal-200 shadow-xs space-y-4">
                <h3 className="font-bold text-charcoal-900 text-sm flex items-center">
                  <UserCheck className="w-4 h-4 text-solar-green mr-1.5" />
                  8. Field Officer Performance Leaderboard
                </h3>
                <div className="divide-y divide-charcoal-100 max-h-56 overflow-y-auto">
                  {dashboardData.graphs.employeePerformance.map((emp: any, idx: number) => (
                    <div key={emp.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2.5">
                        <span className="w-5 h-5 rounded-full bg-charcoal-100 text-charcoal-700 font-bold flex items-center justify-center text-[10px]">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-bold text-charcoal-900">{emp.name}</div>
                          <div className="text-[11px] text-charcoal-500 font-mono">{emp.code} • {emp.region} ({emp.projectsCount} Projs)</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-solar-amber text-xs">{emp.capacityKw} kW</div>
                        <div className="text-[10px] text-emerald-700 font-semibold">{formatINR(emp.collections)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 9. Workflow Bottlenecks Matrix */}
              <div className="bg-white p-5 rounded-lg border border-charcoal-200 shadow-xs space-y-4 lg:col-span-2">
                <h3 className="font-bold text-charcoal-900 text-sm flex items-center">
                  <AlertTriangle className="w-4 h-4 text-rose-600 mr-1.5" />
                  9. Operational Workflow Bottlenecks & Stage Dwell Time
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1 text-xs">
                  {dashboardData.graphs.workflowBottlenecks.map((item: any) => (
                    <div key={item.stage} className="p-3.5 rounded-lg border border-charcoal-200 bg-charcoal-50/70 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          item.severity === 'high' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {item.severity.toUpperCase()} DWELL
                        </span>
                        <span className="font-bold text-charcoal-900 font-mono">{item.pendingCount} Projects</span>
                      </div>
                      <div className="font-semibold text-charcoal-900 text-xs">{item.stage}</div>
                      <div className="text-[11px] text-charcoal-500">
                        Average Cycle Time: <strong className="text-charcoal-800">{item.avgDays} Days</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. ADMIN DASHBOARD (Strict Regional Team Scope)                           */}
        {/* ========================================================================= */}
        {userRole === 'admin' && dashboardData?.kpis && (
          <div className="space-y-6">
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-4 text-xs flex items-center justify-between text-charcoal-800">
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-solar-green" />
                <div>
                  <h3 className="font-bold text-charcoal-900 text-sm">
                    Regional Administrative Scope: {dashboardData.adminProfile?.name} ({dashboardData.adminProfile?.region})
                  </h3>
                  <p className="text-charcoal-600 mt-0.5">
                    Managing field engineers, customer milestone collections, statutory compliance, and stage QA.
                  </p>
                </div>
              </div>
            </div>

            {/* 8 ADMIN TEAM KPIS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard
                title="Team Customers"
                value={dashboardData.kpis.teamCustomers}
                subtitle="Assigned in branch territory"
                accentColor="green"
                icon={<Users className="w-6 h-6 text-solar-green" />}
              />
              <KpiCard
                title="Team Capacity"
                value={`${dashboardData.kpis.teamCapacityKw} kW`}
                subtitle="Under branch management"
                accentColor="solar"
                icon={<Sun className="w-6 h-6 text-solar-amber" />}
              />
              <KpiCard
                title="Active Projects"
                value={dashboardData.kpis.activeProjects}
                subtitle="Under physical execution"
                accentColor="solar"
                icon={<FolderKanban className="w-6 h-6 text-solar-amber" />}
              />
              <KpiCard
                title="Completed Projects"
                value={dashboardData.kpis.completedProjects}
                subtitle="Fully Commissioned"
                accentColor="green"
                icon={<CheckCircle2 className="w-6 h-6 text-emerald-600" />}
              />

              <KpiCard
                title="Pending Payments"
                value={formatINR(dashboardData.kpis.pendingPayments)}
                subtitle="Receivable milestone dues"
                accentColor="solar"
                icon={<IndianRupee className="w-6 h-6 text-rose-600" />}
              />
              <KpiCard
                title="Pending Documents"
                value={dashboardData.kpis.pendingDocuments}
                subtitle="Awaiting branch verification"
                accentColor="charcoal"
                icon={<FileText className="w-6 h-6 text-amber-600" />}
              />
              <KpiCard
                title="Installation Pending"
                value={dashboardData.kpis.installationPending}
                subtitle="Plants in progress"
                accentColor="green"
                icon={<Wrench className="w-6 h-6 text-blue-600" />}
              />
              <KpiCard
                title="Subsidy In Queue"
                value={dashboardData.kpis.subsidyPending}
                subtitle="National Portal tracking"
                accentColor="green"
                icon={<BadgePercent className="w-6 h-6 text-solar-green" />}
              />
            </div>

            {/* Admin Team Graphs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Field Officer Leaderboard */}
              <div className="bg-white p-5 rounded-lg border border-charcoal-200 shadow-xs space-y-4">
                <h3 className="font-bold text-charcoal-900 text-sm flex items-center">
                  <UserCheck className="w-4 h-4 text-solar-green mr-1.5" />
                  Branch Field Officer Allocation & Performance
                </h3>
                <div className="divide-y divide-charcoal-100">
                  {dashboardData.graphs.employeeLeaderboard?.map((emp: any) => (
                    <div key={emp.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-charcoal-900">{emp.name}</div>
                        <div className="text-[11px] text-charcoal-500 font-mono">
                          {emp.code} • {emp.customers} Customers • {emp.projects} Projects
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-solar-green text-sm">{emp.capacityKw} kW</div>
                        <div className="text-[10px] text-charcoal-500">{formatINR(emp.collected)} collected</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Regional Payment Recovery */}
              <div className="bg-white p-5 rounded-lg border border-charcoal-200 shadow-xs space-y-4">
                <h3 className="font-bold text-charcoal-900 text-sm flex items-center">
                  <IndianRupee className="w-4 h-4 text-emerald-600 mr-1.5" />
                  Branch Milestone Payment Recovery
                </h3>
                <div className="space-y-4 pt-2 text-xs">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-charcoal-50 p-2.5 rounded">
                      <span className="text-charcoal-400 text-[10px] block">Total Contract:</span>
                      <span className="font-bold text-charcoal-900">{formatINR(dashboardData.graphs.paymentCollection?.totalDue)}</span>
                    </div>
                    <div className="bg-emerald-50 p-2.5 rounded border border-emerald-100">
                      <span className="text-emerald-700 text-[10px] block">Recovered:</span>
                      <span className="font-bold text-emerald-800">{formatINR(dashboardData.graphs.paymentCollection?.totalPaid)}</span>
                    </div>
                    <div className="bg-rose-50 p-2.5 rounded border border-rose-100">
                      <span className="text-rose-700 text-[10px] block">Outstanding:</span>
                      <span className="font-bold text-rose-800">{formatINR(dashboardData.graphs.paymentCollection?.pending)}</span>
                    </div>
                  </div>

                  <ProgressBar
                    progress={
                      dashboardData.graphs.paymentCollection?.totalDue > 0
                        ? Math.round((dashboardData.graphs.paymentCollection.totalPaid / dashboardData.graphs.paymentCollection.totalDue) * 100)
                        : 80
                    }
                    height={8}
                    colorVariant="green"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. EMPLOYEE DASHBOARD (Action Required Queue Focused)                     */}
        {/* ========================================================================= */}
        {userRole === 'employee' && dashboardData?.kpis && (
          <div className="space-y-6">
            {/* ACTION REQUIRED WORK QUEUE CARD */}
            <div className="bg-white rounded-lg border-2 border-solar-amber p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-charcoal-100 pb-3">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-solar-amber" />
                  <h3 className="font-black text-charcoal-900 text-sm uppercase tracking-wide">
                    ACTION REQUIRED — Operational Work Queue
                  </h3>
                </div>
                <span className="text-xs font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                  {dashboardData.actionRequired?.items?.length || 0} Priority Actions
                </span>
              </div>

              {/* Action Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <Link href="/documents" className="block p-3.5 rounded-lg border border-rose-200 bg-rose-50/60 hover:bg-rose-100/60 transition-colors">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-rose-900 text-sm">
                      {dashboardData.actionRequired?.pendingDocumentsCount} Documents
                    </span>
                    <FileText className="w-4 h-4 text-rose-700" />
                  </div>
                  <p className="text-[11px] text-rose-800 mt-1">Pending upload or statutory verification</p>
                  <span className="text-[10px] font-bold text-rose-700 mt-2 flex items-center">
                    Open Vault <ArrowRight className="w-3 h-3 ml-1" />
                  </span>
                </Link>

                <Link href="/payments" className="block p-3.5 rounded-lg border border-amber-200 bg-amber-50/60 hover:bg-amber-100/60 transition-colors">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-amber-900 text-sm">
                      {dashboardData.actionRequired?.pendingPaymentsCount} Payments
                    </span>
                    <IndianRupee className="w-4 h-4 text-amber-700" />
                  </div>
                  <p className="text-[11px] text-amber-800 mt-1">Pending milestone collections</p>
                  <span className="text-[10px] font-bold text-amber-700 mt-2 flex items-center">
                    Record Payment <ArrowRight className="w-3 h-3 ml-1" />
                  </span>
                </Link>

                <Link href="/installation" className="block p-3.5 rounded-lg border border-blue-200 bg-blue-50/60 hover:bg-blue-100/60 transition-colors">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-blue-900 text-sm">
                      {dashboardData.actionRequired?.pendingInstallationsCount} Installations
                    </span>
                    <Wrench className="w-4 h-4 text-blue-700" />
                  </div>
                  <p className="text-[11px] text-blue-800 mt-1">Pending structural or wiring stages</p>
                  <span className="text-[10px] font-bold text-blue-700 mt-2 flex items-center">
                    Advance Stages <ArrowRight className="w-3 h-3 ml-1" />
                  </span>
                </Link>

                <Link href="/subsidies" className="block p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/60 transition-colors">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-emerald-900 text-sm">
                      {dashboardData.actionRequired?.waitingInspectionCount} Inspections
                    </span>
                    <BadgePercent className="w-4 h-4 text-emerald-700" />
                  </div>
                  <p className="text-[11px] text-emerald-800 mt-1">Waiting for DISCOM / CEIG audit</p>
                  <span className="text-[10px] font-bold text-emerald-700 mt-2 flex items-center">
                    Track Subsidy <ArrowRight className="w-3 h-3 ml-1" />
                  </span>
                </Link>
              </div>
            </div>

            {/* 8 EMPLOYEE PERSONAL COUNTERS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard
                title="My Customers"
                value={dashboardData.kpis.myCustomers}
                subtitle="Directly assigned to me"
                accentColor="green"
                icon={<Users className="w-6 h-6 text-solar-green" />}
              />
              <KpiCard
                title="My Active Projects"
                value={dashboardData.kpis.activeProjects}
                subtitle="Under active execution"
                accentColor="solar"
                icon={<FolderKanban className="w-6 h-6 text-solar-amber" />}
              />
              <KpiCard
                title="Completed Plants"
                value={dashboardData.kpis.completedProjects}
                subtitle="Fully Commissioned"
                accentColor="green"
                icon={<CheckCircle2 className="w-6 h-6 text-emerald-600" />}
              />
              <KpiCard
                title="My Solar Capacity"
                value={`${dashboardData.kpis.mySolarCapacityKw} kW`}
                subtitle="Delivered portfolio"
                accentColor="solar"
                icon={<Sun className="w-6 h-6 text-solar-amber" />}
              />

              <KpiCard
                title="My Payments Collected"
                value={formatINR(dashboardData.kpis.myTotalPaid)}
                subtitle="Collected from my projects"
                accentColor="green"
                icon={<IndianRupee className="w-6 h-6 text-emerald-600" />}
              />
              <KpiCard
                title="Pending Documents"
                value={dashboardData.kpis.pendingDocuments}
                subtitle="Action required"
                accentColor="solar"
                icon={<FileText className="w-6 h-6 text-rose-600" />}
              />
              <KpiCard
                title="Pending Mounts"
                value={dashboardData.kpis.installationPending}
                subtitle="In-progress sites"
                accentColor="charcoal"
                icon={<Wrench className="w-6 h-6 text-blue-600" />}
              />
              <KpiCard
                title="Subsidy Pending"
                value={dashboardData.kpis.subsidyPending}
                subtitle="Portal applications"
                accentColor="green"
                icon={<BadgePercent className="w-6 h-6 text-solar-green" />}
              />
            </div>

            {/* Employee Operational Graphs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Onboarding */}
              <div className="bg-white p-5 rounded-lg border border-charcoal-200 shadow-xs space-y-4">
                <h3 className="font-bold text-charcoal-900 text-sm flex items-center">
                  <TrendingUp className="w-4 h-4 text-solar-green mr-1.5" />
                  My Monthly Solar Capacity Delivered
                </h3>
                <div className="space-y-3 pt-2">
                  {dashboardData.graphs.myMonthlyOnboarding?.map((item: any) => (
                    <div key={item.month} className="space-y-1 text-xs">
                      <div className="flex justify-between font-medium">
                        <span className="text-charcoal-700">{item.month}</span>
                        <span className="font-bold text-charcoal-900">{item.capacityKw} kW ({item.count} Sites)</span>
                      </div>
                      <ProgressBar
                        progress={Math.min(100, Math.round((item.capacityKw / 40) * 100))}
                        height={6}
                        colorVariant="solar"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* My Project Pipeline */}
              <div className="bg-white p-5 rounded-lg border border-charcoal-200 shadow-xs space-y-4">
                <h3 className="font-bold text-charcoal-900 text-sm flex items-center">
                  <FolderKanban className="w-4 h-4 text-solar-green mr-1.5" />
                  My Project Pipeline Status
                </h3>
                <div className="space-y-2.5 pt-2 text-xs">
                  {dashboardData.graphs.myProjectStatus?.map((item: any) => (
                    <div key={item.status} className="p-3 rounded-lg bg-charcoal-50 flex items-center justify-between">
                      <span className="font-semibold text-charcoal-800">{item.status}</span>
                      <span className="font-bold text-solar-green font-mono text-sm">{item.count} Projects</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
