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
import { FileUploader } from '@/components/ui/FileUploader';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import {
  UserPlus,
  Building2,
  Home,
  Users,
  Sun,
  FileText,
  CreditCard,
  CheckCircle2,
  FolderKanban,
  Zap,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
  Clock,
  Shield,
  Briefcase,
  Layers,
  ArrowRight,
} from 'lucide-react';

export default function CustomerManagementPage() {
  const { user: currentUser } = useAuth();
  const toast = useToast();

  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'all' | 'b2b' | 'b2c'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modals & Drawers
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<'b2c' | 'b2b' | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  // Form state: B2C
  const [b2cForm, setB2cForm] = useState({
    firstName: '',
    lastName: '',
    mobileNumber: '+91 ',
    alternateMobile: '',
    email: '',
    address: '',
    district: '',
    state: 'Delhi',
    pincode: '',
    electricityConsumerNumber: '',
    discomName: 'BSES Rajdhani Power Ltd',
    existingLoadKw: '5.0',
    solarInstallationCapacityKw: '5.0',
    discomApplicationType: 'brown_file',
    paymentMode: 'jan_samarth_loan',
    workOrderStatus: 'issued',
    mnreRegistrationStatus: 'registered',
    tfrStatus: 'approved',
    assignedEmployeeId: 'emp-prof-rahul',
    assignedAdminId: 'adm-prof-north',
  });

  // Form state: B2B
  const [b2bForm, setB2bForm] = useState({
    orgName: '',
    contactPerson: '',
    designation: 'Managing Director',
    mobile: '+91 ',
    email: '',
    billingAddress: '',
    installationAddress: '',
    district: '',
    state: 'Karnataka',
    pincode: '',
    gstin: '',
    pan: '',
    projectName: '',
    solarCapacityKw: '25.0',
    expectedCompletionDate: '2026-06-30',
    projectStatus: 'feasibility_survey',
    priority: 'high',
    remarks: 'Industrial rooftop contract with Net Metering & SLD.',
    assignedEmployeeId: 'emp-prof-vikram',
    assignedAdminId: 'adm-prof-south',
  });

  // Fetch Customers
  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      let url = `/api/customers?type=${typeFilter}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setCustomers(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [typeFilter, searchQuery]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers, currentUser]);

  // Handle B2C Submit
  const handleB2CSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...b2cForm, customerMode: 'b2c' }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('B2C Consumer Onboarded', json.message);
        setIsOnboardingModalOpen(false);
        setSelectedType(null);
        fetchCustomers();
      } else {
        toast.error('Onboarding Failed', json.error?.message);
      }
    } catch (e: any) {
      toast.error('Error', e.message);
    }
  };

  // Handle B2B Submit
  const handleB2BSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...b2bForm, customerMode: 'b2b' }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('B2B Organization Onboarded', json.message);
        setIsOnboardingModalOpen(false);
        setSelectedType(null);
        fetchCustomers();
      } else {
        toast.error('Onboarding Failed', json.error?.message);
      }
    } catch (e: any) {
      toast.error('Error', e.message);
    }
  };

  const openCustomerDetails = (cust: any) => {
    setSelectedCustomer(cust);
    setIsDetailDrawerOpen(true);
  };

  // Columns definition
  const columns: Column<any>[] = [
    {
      key: 'name',
      header: 'Customer / Organization',
      sortable: true,
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: 'var(--radius-xs)',
              backgroundColor: row.isB2B ? '#fef3c7' : 'var(--rp-green-surface)',
              color: row.isB2B ? '#b45309' : 'var(--rp-green-dark)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {row.isB2B ? <Building2 size={18} /> : <Home size={18} />}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--rp-charcoal-900)' }}>
              {row.isB2B ? row.organization?.orgName || row.name : row.name}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--rp-gray-500)' }}>
              {row.isB2B ? `Contact: ${row.name}` : row.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'categoryLabel',
      header: 'Type',
      render: (row) => (
        <span
          className={row.isB2B ? 'badge-solid-amber' : 'badge-solid-green'}
          style={{ padding: '2px 8px', fontSize: '0.6875rem', fontWeight: 700, borderRadius: 'var(--radius-xs)' }}
        >
          {row.categoryLabel}
        </span>
      ),
    },
    {
      key: 'totalCapacityKw',
      header: 'Solar Load',
      sortable: true,
      render: (row) => (
        <div>
          <span style={{ fontWeight: 700, color: 'var(--rp-charcoal-900)' }}>{row.totalCapacityKw} kW</span>
          {row.sanctionedLoadKw && (
            <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-400)' }}>
              Load: {row.sanctionedLoadKw} kW
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'electricityConsumerNumber',
      header: 'Consumer / DISCOM',
      render: (row) => (
        <div>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--rp-charcoal-800)' }}>
            {row.electricityConsumerNumber}
          </div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-500)' }}>{row.city}, {row.state}</div>
        </div>
      ),
    },
    {
      key: 'assignedEmployee',
      header: 'Assigned Lead',
      render: (row) => (
        <span style={{ fontSize: '0.8125rem', color: 'var(--rp-charcoal-700)', fontWeight: 500 }}>
          {row.assignedEmployee?.name || 'Unassigned'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <Button variant="secondary" size="sm" onClick={() => openCustomerDetails(row)}>
          View 360
        </Button>
      ),
    },
  ];

  // Counts for KPIs
  const totalCount = customers.length;
  const b2bCount = customers.filter((c) => c.isB2B).length;
  const b2cCount = customers.filter((c) => !c.isB2B).length;
  const totalKw = customers.reduce((acc, c) => acc + (c.totalCapacityKw || 0), 0);

  return (
    <AppShell>
      <PageHeader
        title="Customer Accounts & Plant Onboarding"
        subtitle="End-to-end consumer acquisition, B2B industrial projects, DISCOM workflow state, and Jan Samarth subsidy tracking."
        breadcrumbs={[
          { label: 'Customer Relations', href: '/customers' },
          { label: 'Accounts Directory' },
        ]}
        actions={
          <>
            <Button variant="secondary" leftIcon={<RefreshCw size={14} />} onClick={fetchCustomers} isLoading={isLoading}>
              Refresh
            </Button>
            <Button
              variant="primary"
              leftIcon={<UserPlus size={15} />}
              onClick={() => {
                setSelectedType(null);
                setIsOnboardingModalOpen(true);
              }}
            >
              + ADD CUSTOMER
            </Button>
          </>
        }
      />

      <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* KPI Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <KpiCard
            title="Total Registered Customers"
            value={totalCount}
            unit="Accounts"
            icon={<Users size={18} />}
            accentColor="green"
          />
          <KpiCard
            title="B2B Commercial / Industrial"
            value={b2bCount}
            unit="Enterprises"
            icon={<Building2 size={18} />}
            accentColor="solar"
          />
          <KpiCard
            title="B2C Residential Rooftops"
            value={b2cCount}
            unit="Consumers"
            icon={<Home size={18} />}
            accentColor="green"
          />
          <KpiCard
            title="Contracted Solar Capacity"
            value={totalKw}
            unit="kW"
            icon={<Sun size={18} />}
            accentColor="charcoal"
          />
        </div>

        {/* FilterBar & Data Table */}
        <section className="rp-card">
          <div className="rp-card-header">
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setTypeFilter('all')}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  backgroundColor: typeFilter === 'all' ? 'var(--rp-green-primary)' : 'var(--rp-gray-100)',
                  color: typeFilter === 'all' ? 'var(--rp-white)' : 'var(--rp-charcoal-700)',
                }}
              >
                All Accounts ({totalCount})
              </button>
              <button
                onClick={() => setTypeFilter('b2b')}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  backgroundColor: typeFilter === 'b2b' ? 'var(--rp-green-primary)' : 'var(--rp-gray-100)',
                  color: typeFilter === 'b2b' ? 'var(--rp-white)' : 'var(--rp-charcoal-700)',
                }}
              >
                B2B Enterprises ({b2bCount})
              </button>
              <button
                onClick={() => setTypeFilter('b2c')}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  backgroundColor: typeFilter === 'b2c' ? 'var(--rp-green-primary)' : 'var(--rp-gray-100)',
                  color: typeFilter === 'b2c' ? 'var(--rp-white)' : 'var(--rp-charcoal-700)',
                }}
              >
                B2C Residential ({b2cCount})
              </button>
            </div>
          </div>

          <div className="rp-card-body" style={{ padding: '20px' }}>
            <FilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Search by customer name, mobile, consumer number, or city..."
              activeFilterCount={typeFilter !== 'all' ? 1 : 0}
              onResetFilters={() => {
                setSearchQuery('');
                setTypeFilter('all');
              }}
            />

            <Table
              columns={columns}
              data={customers}
              keyExtractor={(row) => row.id}
              isLoading={isLoading}
              emptyTitle="No customers are assigned yet."
              emptyDescription="Onboard a new residential (B2C) or commercial (B2B) customer to initiate solar lifecycle tracking."
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={(k) => {
                setSortOrder(sortBy === k && sortOrder === 'asc' ? 'desc' : 'asc');
                setSortBy(k);
              }}
            />

            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(customers.length / pageSize) || 1}
              pageSize={pageSize}
              totalRecords={customers.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </section>

      </div>

      {/* ========================================================================= */}
      {/* ONBOARDING MODAL: FIRST SELECT CUSTOMER TYPE [ B2B ] [ B2C ]              */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isOnboardingModalOpen}
        onClose={() => {
          setIsOnboardingModalOpen(false);
          setSelectedType(null);
        }}
        title={
          selectedType === 'b2c'
            ? 'Onboard B2C Residential Customer'
            : selectedType === 'b2b'
            ? 'Onboard Project-Oriented B2B Enterprise'
            : 'Add New Customer Account'
        }
        subtitle="R P Solar Pvt. Ltd. — Dynamic Client Onboarding & Project Initialization"
        maxWidth={selectedType ? 'lg' : 'md'}
        footer={
          selectedType ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <Button variant="ghost" onClick={() => setSelectedType(null)}>
                ← Change Customer Type
              </Button>
              <div style={{ display: 'flex', gap: '10px' }}>
                <Button variant="secondary" onClick={() => setIsOnboardingModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={selectedType === 'b2c' ? handleB2CSubmit : handleB2BSubmit}
                >
                  Confirm & Complete Onboarding
                </Button>
              </div>
            </div>
          ) : null
        }
      >
        {/* STEP 1: SELECT CUSTOMER TYPE [ B2B ] [ B2C ] */}
        {!selectedType && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 0' }}>
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--rp-gray-500)' }}>
                SELECT CUSTOMER TYPE TO PROCEED
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* B2B Selection Card */}
              <button
                type="button"
                onClick={() => setSelectedType('b2b')}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '28px 20px',
                  borderRadius: 'var(--radius-md)',
                  border: '2px solid var(--rp-gray-300)',
                  backgroundColor: 'var(--rp-gray-50)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--rp-solar-yellow)';
                  e.currentTarget.style.backgroundColor = '#fffbeb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--rp-gray-300)';
                  e.currentTarget.style.backgroundColor = 'var(--rp-gray-50)';
                }}
              >
                <div style={{ width: '54px', height: '54px', borderRadius: '50%', backgroundColor: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                  <Building2 size={28} />
                </div>
                <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--rp-charcoal-900)' }}>
                  B2B
                </div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#b45309', marginTop: '2px' }}>
                  Commercial & Industrial
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--rp-gray-500)', marginTop: '8px', lineHeight: 1.4 }}>
                  Project-oriented enterprise onboarding with GST, PAN, high-tension DISCOM, and technical SLD attachments.
                </p>
              </button>

              {/* B2C Selection Card */}
              <button
                type="button"
                onClick={() => setSelectedType('b2c')}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '28px 20px',
                  borderRadius: 'var(--radius-md)',
                  border: '2px solid var(--rp-gray-300)',
                  backgroundColor: 'var(--rp-gray-50)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--rp-green-primary)';
                  e.currentTarget.style.backgroundColor = 'var(--rp-green-surface)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--rp-gray-300)';
                  e.currentTarget.style.backgroundColor = 'var(--rp-gray-50)';
                }}
              >
                <div style={{ width: '54px', height: '54px', borderRadius: '50%', backgroundColor: 'var(--rp-green-surface)', color: 'var(--rp-green-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                  <Home size={28} />
                </div>
                <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--rp-charcoal-900)' }}>
                  B2C
                </div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--rp-green-primary)', marginTop: '2px' }}>
                  Residential & Domestic
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--rp-gray-500)', marginTop: '8px', lineHeight: 1.4 }}>
                  Consumer solar rooftop with Brown/New file DISCOM workflow, Jan Samarth solar loan, and TFR feasibility.
                </p>
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* STEP 2A: B2C CUSTOMER FORM                                          */}
        {/* ------------------------------------------------------------------- */}
        {selectedType === 'b2c' && (
          <form onSubmit={handleB2CSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            
            {/* Section 1: Customer Personal & Contact */}
            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--rp-green-dark)', borderBottom: '1px solid var(--rp-gray-200)', paddingBottom: '4px', marginBottom: '12px' }}>
                1. Customer Contact & Location
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Input
                  label="Customer First Name"
                  value={b2cForm.firstName}
                  onChange={(e) => setB2cForm({ ...b2cForm, firstName: e.target.value })}
                  placeholder="e.g. Ramesh"
                  isRequired
                />
                <Input
                  label="Customer Last Name"
                  value={b2cForm.lastName}
                  onChange={(e) => setB2cForm({ ...b2cForm, lastName: e.target.value })}
                  placeholder="e.g. Saxena"
                  isRequired
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '10px' }}>
                <Input
                  label="Mobile Number"
                  value={b2cForm.mobileNumber}
                  onChange={(e) => setB2cForm({ ...b2cForm, mobileNumber: e.target.value })}
                  isRequired
                />
                <Input
                  label="Alternate Mobile"
                  value={b2cForm.alternateMobile}
                  onChange={(e) => setB2cForm({ ...b2cForm, alternateMobile: e.target.value })}
                  placeholder="Optional"
                />
                <Input
                  label="Email Address"
                  type="email"
                  value={b2cForm.email}
                  onChange={(e) => setB2cForm({ ...b2cForm, email: e.target.value })}
                  placeholder="ramesh@gmail.com"
                  isRequired
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '12px', marginTop: '10px' }}>
                <Input
                  label="Address"
                  value={b2cForm.address}
                  onChange={(e) => setB2cForm({ ...b2cForm, address: e.target.value })}
                  placeholder="House No, Street"
                />
                <Input
                  label="District"
                  value={b2cForm.district}
                  onChange={(e) => setB2cForm({ ...b2cForm, district: e.target.value })}
                  placeholder="District"
                />
                <Input
                  label="State"
                  value={b2cForm.state}
                  onChange={(e) => setB2cForm({ ...b2cForm, state: e.target.value })}
                  placeholder="State"
                />
                <Input
                  label="Pincode"
                  value={b2cForm.pincode}
                  onChange={(e) => setB2cForm({ ...b2cForm, pincode: e.target.value })}
                  placeholder="110001"
                />
              </div>
            </div>

            {/* Section 2: Solar Technical Parameters */}
            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--rp-green-dark)', borderBottom: '1px solid var(--rp-gray-200)', paddingBottom: '4px', marginBottom: '12px' }}>
                2. Solar Technical & DISCOM Parameters
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <Input
                  label="Existing Sanctioned Load (kW)"
                  type="number"
                  value={b2cForm.existingLoadKw}
                  onChange={(e) => setB2cForm({ ...b2cForm, existingLoadKw: e.target.value })}
                  isRequired
                />
                <Input
                  label="Solar Installation Capacity (kW)"
                  type="number"
                  value={b2cForm.solarInstallationCapacityKw}
                  onChange={(e) => setB2cForm({ ...b2cForm, solarInstallationCapacityKw: e.target.value })}
                  isRequired
                />
                <Input
                  label="Electricity Consumer Number"
                  value={b2cForm.electricityConsumerNumber}
                  onChange={(e) => setB2cForm({ ...b2cForm, electricityConsumerNumber: e.target.value })}
                  placeholder="e.g. BSES-DL-98210"
                />
              </div>
            </div>

            {/* Section 3: Business / Workflow State */}
            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--rp-green-dark)', borderBottom: '1px solid var(--rp-gray-200)', paddingBottom: '4px', marginBottom: '12px' }}>
                3. Business & Workflow Configuration
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <Select
                  label="DISCOM Application Type"
                  value={b2cForm.discomApplicationType}
                  onChange={(e) => setB2cForm({ ...b2cForm, discomApplicationType: e.target.value as any })}
                  options={[
                    { value: 'brown_file', label: 'Brown File (Existing Meter)' },
                    { value: 'new_connection', label: 'New Connection' },
                    { value: 'name_correction', label: 'Name Correction' },
                    { value: 'cot', label: 'COT (Change of Tariff)' },
                    { value: 'load_increased', label: 'Load Extension / Increased' },
                  ]}
                />

                <Select
                  label="Payment & Financing Route"
                  value={b2cForm.paymentMode}
                  onChange={(e) => setB2cForm({ ...b2cForm, paymentMode: e.target.value as any })}
                  options={[
                    { value: 'jan_samarth_loan', label: 'Jan Samarth Solar Loan' },
                    { value: 'cash', label: 'Direct Cash / Net Banking' },
                    { value: 'bank_loan', label: 'Private Bank Loan' },
                  ]}
                />

                <Select
                  label="Work Order Status"
                  value={b2cForm.workOrderStatus}
                  onChange={(e) => setB2cForm({ ...b2cForm, workOrderStatus: e.target.value as any })}
                  options={[
                    { value: 'issued', label: 'Work Order Issued' },
                    { value: 'signed', label: 'Work Order Signed' },
                    { value: 'draft', label: 'Draft' },
                  ]}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginTop: '10px' }}>
                <Select
                  label="MNRE Portal Registration"
                  value={b2cForm.mnreRegistrationStatus}
                  onChange={(e) => setB2cForm({ ...b2cForm, mnreRegistrationStatus: e.target.value as any })}
                  options={[
                    { value: 'registered', label: 'Registered' },
                    { value: 'approved', label: 'Approved' },
                    { value: 'pending', label: 'Pending' },
                  ]}
                />

                <Select
                  label="TFR Feasibility"
                  value={b2cForm.tfrStatus}
                  onChange={(e) => setB2cForm({ ...b2cForm, tfrStatus: e.target.value as any })}
                  options={[
                    { value: 'approved', label: 'TFR Approved' },
                    { value: 'pending', label: 'TFR Pending' },
                    { value: 'waived', label: 'Waived' },
                  ]}
                />

                <Select
                  label="Assigned Employee"
                  value={b2cForm.assignedEmployeeId}
                  onChange={(e) => setB2cForm({ ...b2cForm, assignedEmployeeId: e.target.value })}
                  options={[
                    { value: 'emp-prof-rahul', label: 'Rahul Sharma (Delhi)' },
                    { value: 'emp-prof-vikram', label: 'Vikram Nair (Bangalore)' },
                  ]}
                />

                <Select
                  label="Assigned Admin"
                  value={b2cForm.assignedAdminId}
                  onChange={(e) => setB2cForm({ ...b2cForm, assignedAdminId: e.target.value })}
                  options={[
                    { value: 'adm-prof-north', label: 'Rajesh Verma (North Admin)' },
                    { value: 'adm-prof-south', label: 'Suresh Menon (South Admin)' },
                  ]}
                />
              </div>
            </div>

          </form>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* STEP 2B: B2B CUSTOMER FORM (Project-Oriented)                       */}
        {/* ------------------------------------------------------------------- */}
        {selectedType === 'b2b' && (
          <form onSubmit={handleB2BSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            
            {/* Section 1: Organization & Contact Person */}
            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--rp-solar-orange)', borderBottom: '1px solid var(--rp-gray-200)', paddingBottom: '4px', marginBottom: '12px' }}>
                1. Organization & Commercial Entity
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
                <Input
                  label="Organization Name"
                  value={b2bForm.orgName}
                  onChange={(e) => setB2bForm({ ...b2bForm, orgName: e.target.value })}
                  placeholder="e.g. Apex Industrial Polymers Pvt. Ltd."
                  isRequired
                />
                <Input
                  label="GSTIN Number"
                  value={b2bForm.gstin}
                  onChange={(e) => setB2bForm({ ...b2bForm, gstin: e.target.value })}
                  placeholder="29AAAAA0000A1Z5"
                />
                <Input
                  label="PAN Number"
                  value={b2bForm.pan}
                  onChange={(e) => setB2bForm({ ...b2bForm, pan: e.target.value })}
                  placeholder="AAAAA0000A"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginTop: '10px' }}>
                <Input
                  label="Key Contact Person"
                  value={b2bForm.contactPerson}
                  onChange={(e) => setB2bForm({ ...b2bForm, contactPerson: e.target.value })}
                  placeholder="e.g. Sunil Narang"
                  isRequired
                />
                <Input
                  label="Designation"
                  value={b2bForm.designation}
                  onChange={(e) => setB2bForm({ ...b2bForm, designation: e.target.value })}
                  placeholder="Director / Plant Head"
                />
                <Input
                  label="Official Mobile"
                  value={b2bForm.mobile}
                  onChange={(e) => setB2bForm({ ...b2bForm, mobile: e.target.value })}
                  isRequired
                />
                <Input
                  label="Corporate Email"
                  type="email"
                  value={b2bForm.email}
                  onChange={(e) => setB2bForm({ ...b2bForm, email: e.target.value })}
                  placeholder="sunil@apexind.com"
                  isRequired
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
                <Input
                  label="Billing Address"
                  value={b2bForm.billingAddress}
                  onChange={(e) => setB2bForm({ ...b2bForm, billingAddress: e.target.value })}
                  placeholder="Registered corporate office"
                />
                <Input
                  label="Plant Installation Site Address"
                  value={b2bForm.installationAddress}
                  onChange={(e) => setB2bForm({ ...b2bForm, installationAddress: e.target.value })}
                  placeholder="Factory / Warehouse roof location"
                />
              </div>
            </div>

            {/* Section 2: Project-Oriented Onboarding Fields */}
            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--rp-solar-orange)', borderBottom: '1px solid var(--rp-gray-200)', paddingBottom: '4px', marginBottom: '12px' }}>
                2. Project Specification & Milestones
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
                <Input
                  label="Project Title"
                  value={b2bForm.projectName}
                  onChange={(e) => setB2bForm({ ...b2bForm, projectName: e.target.value })}
                  placeholder="e.g. Apex 50kW Industrial Rooftop Solar"
                />
                <Input
                  label="Solar Capacity (kW)"
                  type="number"
                  value={b2bForm.solarCapacityKw}
                  onChange={(e) => setB2bForm({ ...b2bForm, solarCapacityKw: e.target.value })}
                  isRequired
                />
                <DatePicker
                  label="Expected Completion"
                  value={b2bForm.expectedCompletionDate}
                  onChange={(d) => setB2bForm({ ...b2bForm, expectedCompletionDate: d })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginTop: '10px' }}>
                <Select
                  label="Project Status"
                  value={b2bForm.projectStatus}
                  onChange={(e) => setB2bForm({ ...b2bForm, projectStatus: e.target.value })}
                  options={[
                    { value: 'feasibility_survey', label: 'Feasibility Survey' },
                    { value: 'installation_in_progress', label: 'Installation In Progress' },
                    { value: 'draft', label: 'Draft Proposal' },
                  ]}
                />

                <Select
                  label="Project Priority"
                  value={b2bForm.priority}
                  onChange={(e) => setB2bForm({ ...b2bForm, priority: e.target.value })}
                  options={[
                    { value: 'high', label: 'High Priority' },
                    { value: 'medium', label: 'Medium Priority' },
                    { value: 'critical', label: 'Critical Fast-Track' },
                    { value: 'standard', label: 'Standard' },
                  ]}
                />

                <Select
                  label="Assigned Lead Engineer"
                  value={b2bForm.assignedEmployeeId}
                  onChange={(e) => setB2bForm({ ...b2bForm, assignedEmployeeId: e.target.value })}
                  options={[
                    { value: 'emp-prof-vikram', label: 'Vikram Nair (Bangalore)' },
                    { value: 'emp-prof-rahul', label: 'Rahul Sharma (Delhi)' },
                  ]}
                />

                <Select
                  label="Assigned Regional Admin"
                  value={b2bForm.assignedAdminId}
                  onChange={(e) => setB2bForm({ ...b2bForm, assignedAdminId: e.target.value })}
                  options={[
                    { value: 'adm-prof-south', label: 'Suresh Menon (South Admin)' },
                    { value: 'adm-prof-north', label: 'Rajesh Verma (North Admin)' },
                  ]}
                />
              </div>
            </div>

            {/* Section 3: Expandable Compliance & Documents Check */}
            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--rp-solar-orange)', borderBottom: '1px solid var(--rp-gray-200)', paddingBottom: '4px', marginBottom: '8px' }}>
                3. B2B Verification Documents Staged
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '0.75rem', color: 'var(--rp-charcoal-700)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="checkbox" defaultChecked accent-color="var(--rp-green-primary)" /> GST Registration Certificate
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="checkbox" defaultChecked accent-color="var(--rp-green-primary)" /> Company PAN Card
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="checkbox" defaultChecked accent-color="var(--rp-green-primary)" /> Commercial EPC Agreement
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="checkbox" defaultChecked accent-color="var(--rp-green-primary)" /> Structural Stability Certificate
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="checkbox" defaultChecked accent-color="var(--rp-green-primary)" /> Technical Single Line Diagram (SLD)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="checkbox" defaultChecked accent-color="var(--rp-green-primary)" /> High Tension (HT) Bill Copy
                </label>
              </div>
            </div>

          </form>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* CUSTOMER 360 DETAIL DRAWER                                                */}
      {/* ========================================================================= */}
      <Drawer
        isOpen={isDetailDrawerOpen}
        onClose={() => setIsDetailDrawerOpen(false)}
        title={selectedCustomer?.isB2B ? selectedCustomer?.organization?.orgName || selectedCustomer?.name : selectedCustomer?.name}
        subtitle={`${selectedCustomer?.categoryLabel} • Consumer No: ${selectedCustomer?.electricityConsumerNumber}`}
        width="600px"
        footer={
          <Button variant="secondary" onClick={() => setIsDetailDrawerOpen(false)}>
            Close Overview
          </Button>
        }
      >
        {selectedCustomer && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Header pill card */}
            <div style={{ padding: '16px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--rp-gray-50)', border: '1px solid var(--rp-gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className={selectedCustomer.isB2B ? 'badge-solid-amber' : 'badge-solid-green'} style={{ padding: '3px 8px', fontSize: '0.6875rem', fontWeight: 700, borderRadius: 'var(--radius-xs)' }}>
                  {selectedCustomer.categoryLabel}
                </span>
                <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--rp-charcoal-900)', marginTop: '4px' }}>
                  {selectedCustomer.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--rp-gray-500)', marginTop: '2px' }}>
                  {selectedCustomer.email} • {selectedCustomer.phoneNumber}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-400)' }}>SOLAR CAPACITY</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--rp-green-dark)' }}>
                  {selectedCustomer.totalCapacityKw} kW
                </div>
              </div>
            </div>

            {/* B2C Workflow State Card */}
            {!selectedCustomer.isB2B && selectedCustomer.workflow && (
              <div className="rp-card" style={{ padding: '16px' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--rp-charcoal-900)', marginBottom: '12px' }}>
                  B2C Workflow & DISCOM State
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.8125rem' }}>
                  <div style={{ padding: '8px', backgroundColor: 'var(--rp-gray-50)', borderRadius: 'var(--radius-xs)' }}>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-400)' }}>APPLICATION TYPE</div>
                    <strong>{selectedCustomer.workflow.discomApplicationType?.replace('_', ' ').toUpperCase()}</strong>
                  </div>
                  <div style={{ padding: '8px', backgroundColor: 'var(--rp-gray-50)', borderRadius: 'var(--radius-xs)' }}>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-400)' }}>PAYMENT ROUTE</div>
                    <strong>{selectedCustomer.workflow.paymentMode?.replace(/_/g, ' ').toUpperCase()}</strong>
                  </div>
                  <div style={{ padding: '8px', backgroundColor: 'var(--rp-gray-50)', borderRadius: 'var(--radius-xs)' }}>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-400)' }}>WORK ORDER</div>
                    <span style={{ color: 'var(--rp-success)', fontWeight: 700 }}>
                      {selectedCustomer.workflow.workOrderStatus?.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ padding: '8px', backgroundColor: 'var(--rp-gray-50)', borderRadius: 'var(--radius-xs)' }}>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-400)' }}>MNRE REGISTRATION</div>
                    <span style={{ color: 'var(--rp-green-dark)', fontWeight: 700 }}>
                      {selectedCustomer.workflow.mnreRegistrationStatus?.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* B2B Organization Card */}
            {selectedCustomer.isB2B && selectedCustomer.organization && (
              <div className="rp-card" style={{ padding: '16px' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--rp-charcoal-900)', marginBottom: '12px' }}>
                  Corporate Entity & Tax Credentials
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.8125rem' }}>
                  <div>
                    <span style={{ color: 'var(--rp-gray-500)' }}>GSTIN:</span> <strong>{selectedCustomer.organization.gstin}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--rp-gray-500)' }}>PAN:</span> <strong>{selectedCustomer.organization.pan}</strong>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ color: 'var(--rp-gray-500)' }}>Billing Address:</span>{' '}
                    <span>{selectedCustomer.organization.billingAddress}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Assigned Team Hierarchy */}
            <div className="rp-card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--rp-charcoal-900)', marginBottom: '8px' }}>
                Operational Hierarchy & Ownership
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--rp-charcoal-700)', lineHeight: 1.6 }}>
                <div>Assigned Field/Sales Lead: <strong>{selectedCustomer.assignedEmployee?.name || 'Rahul Sharma'}</strong></div>
                <div>Supervising Regional Admin: <strong>{selectedCustomer.assignedAdmin?.name || 'Rajesh Verma (North Hub)'}</strong></div>
              </div>
            </div>

            {/* Linked Projects Table */}
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--rp-charcoal-900)', marginBottom: '8px' }}>
                Solar Projects ({selectedCustomer.projects?.length || 0})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedCustomer.projects?.map((p: any) => (
                  <div
                    key={p.id}
                    style={{
                      padding: '12px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--rp-gray-50)',
                      border: '1px solid var(--rp-gray-200)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--rp-charcoal-900)' }}>
                        {p.projectCode} • {p.capacityKw} kW
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--rp-gray-500)' }}>{p.currentStage}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <StatusBadge status={p.status} />
                      <a href={`/projects/${p.id}`} style={{ textDecoration: 'none' }}>
                        <Button variant="secondary" size="sm" style={{ fontSize: '0.6875rem' }}>
                          View 360
                        </Button>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </Drawer>

    </AppShell>
  );
}
