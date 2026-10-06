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
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { useToast } from '@/components/ui/Toast';
import { useAuth, DEMO_ACCOUNTS } from '@/context/AuthContext';
import { EmployeePerformanceStats } from '@/lib/types';
import {
  UserPlus,
  Users,
  ShieldCheck,
  UserCheck,
  Building,
  KeyRound,
  Lock,
  Power,
  BarChart2,
  History,
  Edit,
  Briefcase,
  Phone,
  Mail,
  Sun,
  CreditCard,
  CheckCircle2,
  FolderKanban,
  AlertTriangle,
  RefreshCw,
  Search,
} from 'lucide-react';

export default function UserManagementPage() {
  const { user: currentUser, quickLogin } = useAuth();
  const toast = useToast();

  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modals & Drawers State
  const [isOnboardOpen, setIsOnboardOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPerformanceOpen, setIsPerformanceOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isResetPwdOpen, setIsResetPwdOpen] = useState(false);
  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);

  // Active targeted user & employee stats
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [employeeStats, setEmployeeStats] = useState<EmployeePerformanceStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [userActivityLogs, setUserActivityLogs] = useState<any[]>([]);

  // Form states for creation
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    phoneNumber: '+91 ',
    userType: 'employee',
    department: 'sales',
    designation: 'Project Executive',
    branchRegion: 'Delhi/NCR',
    reportingAdminId: 'adm-prof-north',
  });

  // Edit form state
  const [editData, setEditData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    department: '',
    designation: '',
    branchRegion: '',
    reportingAdminId: '',
  });

  const [newPasswordVal, setNewPasswordVal] = useState('Password123!');
  const isSuperAdmin = currentUser?.userType === 'super_admin';
  const isAdmin = currentUser?.userType === 'admin';

  // Fetch Users
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      let url = `/api/users?role=${roleFilter}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setUsers(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [roleFilter, searchQuery]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers, currentUser]);

  // Handle Onboarding
  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('User Registered', json.message);
        setIsOnboardOpen(false);
        fetchUsers();
      } else {
        toast.error('Registration Failed', json.error?.message || 'Error occurred');
      }
    } catch (e: any) {
      toast.error('Error', e.message);
    }
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Profile Updated', 'User details updated successfully.');
        setIsEditOpen(false);
        fetchUsers();
      } else {
        toast.error('Update Failed', json.error?.message);
      }
    } catch (e: any) {
      toast.error('Error', e.message);
    }
  };

  // Handle Toggle Status
  const handleStatusToggle = async () => {
    if (!selectedUser) return;
    try {
      const newStatus = selectedUser.status === 'active' ? 'inactive' : 'active';
      const res = await fetch(`/api/users/${selectedUser.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Status Updated', `Account is now ${newStatus}.`);
        setIsStatusConfirmOpen(false);
        fetchUsers();
      } else {
        toast.error('Failed', json.error?.message);
      }
    } catch (e: any) {
      toast.error('Error', e.message);
    }
  };

  // Handle Admin Reset Password
  const handleResetPassword = async () => {
    if (!selectedUser) return;
    try {
      const res = await fetch(`/api/users/${selectedUser.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: newPasswordVal }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Password Reset', json.message);
        setIsResetPwdOpen(false);
      } else {
        toast.error('Reset Failed', json.error?.message);
      }
    } catch (e: any) {
      toast.error('Error', e.message);
    }
  };

  // Load Employee Performance
  const openPerformanceDrawer = async (userRecord: any) => {
    setSelectedUser(userRecord);
    setIsPerformanceOpen(true);
    setIsLoadingStats(true);
    setEmployeeStats(null);

    const empProfileId = userRecord.profile?.id;
    if (!empProfileId) {
      setIsLoadingStats(false);
      return;
    }

    try {
      const res = await fetch(`/api/employees/${empProfileId}/performance`);
      const json = await res.json();
      if (json.success && json.data) {
        setEmployeeStats(json.data);
      } else {
        toast.error('Access Denied', json.error?.message || 'Cannot view performance of unmanaged employee.');
      }
    } catch (e) {
      toast.error('Error loading performance stats');
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Load User Activity
  const openActivityDrawer = async (userRecord: any) => {
    setSelectedUser(userRecord);
    setIsActivityOpen(true);
    try {
      const res = await fetch(`/api/users/${userRecord.id}/activity`);
      const json = await res.json();
      if (json.success) {
        setUserActivityLogs(json.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Open Edit Modal with Prepopulated Values
  const openEditModal = (userRecord: any) => {
    setSelectedUser(userRecord);
    setEditData({
      firstName: userRecord.profile?.firstName || '',
      lastName: userRecord.profile?.lastName || '',
      phoneNumber: userRecord.phoneNumber || '',
      department: userRecord.profile?.department || 'sales',
      designation: userRecord.profile?.designation || '',
      branchRegion: userRecord.profile?.branchRegion || userRecord.profile?.assignedRegion || '',
      reportingAdminId: userRecord.reportingAdminId || 'adm-prof-north',
    });
    setIsEditOpen(true);
  };

  // Table Columns Definition
  const columns: Column<any>[] = [
    {
      key: 'name',
      header: 'User & Identity',
      sortable: true,
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: 'var(--radius-xs)',
              backgroundColor: row.userType === 'super_admin' ? '#fecaca' : row.userType === 'admin' ? '#fde68a' : '#bbf7d0',
              color: row.userType === 'super_admin' ? '#991b1b' : row.userType === 'admin' ? '#92400e' : '#065f46',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.8125rem',
            }}
          >
            {row.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--rp-charcoal-900)' }}>{row.name}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--rp-gray-500)' }}>{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'phoneNumber',
      header: 'Mobile',
      render: (row) => <span style={{ fontSize: '0.8125rem' }}>{row.phoneNumber || '—'}</span>,
    },
    {
      key: 'userType',
      header: 'Role Tier',
      sortable: true,
      render: (row) => <StatusBadge status={row.userType} />,
    },
    {
      key: 'reportingAdminName',
      header: 'Assigned Admin',
      render: (row) => (
        <span style={{ fontSize: '0.8125rem', color: row.reportingAdminName === 'N/A' ? 'var(--rp-gray-400)' : 'var(--rp-charcoal-700)', fontWeight: 500 }}>
          {row.reportingAdminName}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Account Status',
      sortable: true,
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'joiningDate',
      header: 'Joining Date',
      sortable: true,
      render: (row) => <span style={{ fontSize: '0.75rem', color: 'var(--rp-gray-500)' }}>{row.joiningDate || row.createdAt?.split('T')[0]}</span>,
    },
    {
      key: 'actions',
      header: 'Actions & Performance',
      align: 'right',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
          {row.userType === 'employee' && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<BarChart2 size={13} />}
              onClick={() => openPerformanceDrawer(row)}
            >
              Performance
            </Button>
          )}

          {(isSuperAdmin || (currentUser?.id === row.id)) && (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Edit size={13} />}
              onClick={() => openEditModal(row)}
            >
              Edit
            </Button>
          )}

          {isSuperAdmin && row.userType !== 'super_admin' && (
            <>
              <button
                onClick={() => {
                  setSelectedUser(row);
                  setIsResetPwdOpen(true);
                }}
                style={{
                  padding: '6px 8px',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid var(--rp-gray-300)',
                  backgroundColor: 'var(--rp-white)',
                  color: 'var(--rp-charcoal-700)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Reset Password"
              >
                <KeyRound size={14} />
              </button>

              <button
                onClick={() => {
                  setSelectedUser(row);
                  setIsStatusConfirmOpen(true);
                }}
                style={{
                  padding: '6px 8px',
                  borderRadius: 'var(--radius-xs)',
                  border: `1px solid ${row.status === 'active' ? '#fecaca' : '#bbf7d0'}`,
                  backgroundColor: row.status === 'active' ? 'var(--rp-danger-surface)' : 'var(--rp-success-surface)',
                  color: row.status === 'active' ? 'var(--rp-danger)' : 'var(--rp-success)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title={row.status === 'active' ? 'Disable Account' : 'Enable Account'}
              >
                <Power size={14} />
              </button>
            </>
          )}

          <button
            onClick={() => openActivityDrawer(row)}
            style={{
              padding: '6px 8px',
              borderRadius: 'var(--radius-xs)',
              border: '1px solid var(--rp-gray-300)',
              backgroundColor: 'var(--rp-white)',
              color: 'var(--rp-gray-500)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            title="View Audit Logs"
          >
            <History size={14} />
          </button>
        </div>
      ),
    },
  ];

  // User counts for KPIs
  const totalUsers = users.length;
  const adminCount = users.filter((u) => u.userType === 'admin').length;
  const empCount = users.filter((u) => u.userType === 'employee').length;
  const custCount = users.filter((u) => u.userType === 'customer').length;

  return (
    <AppShell>
      <PageHeader
        title="Enterprise User & Hierarchy Management"
        subtitle="Role-Based Access Control directory, reporting hierarchy assignment, and operational performance tracking."
        breadcrumbs={[
          { label: 'IAM & Organization', href: '/users' },
          { label: 'User Directory' },
        ]}
        actions={
          <>
            <Button
              variant="secondary"
              leftIcon={<RefreshCw size={14} />}
              onClick={fetchUsers}
              isLoading={isLoading}
            >
              Refresh
            </Button>

            {isSuperAdmin && (
              <Button
                variant="primary"
                leftIcon={<UserPlus size={15} />}
                onClick={() => setIsOnboardOpen(true)}
              >
                + Onboard User
              </Button>
            )}
          </>
        }
      />

      <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Role Scoping Notice */}
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--rp-green-surface)',
            border: '1px solid #bbf7d0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck size={20} style={{ color: 'var(--rp-green-dark)' }} />
            <div>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--rp-green-dark)' }}>
                Active Hierarchy Scope: {currentUser?.userType?.toUpperCase()}
              </span>
              <p style={{ fontSize: '0.75rem', color: 'var(--rp-charcoal-700)', marginTop: '2px' }}>
                {isSuperAdmin
                  ? 'Full Global Directory: You have authority to manage all Admins, Employees, and Reporting hierarchies.'
                  : isAdmin
                  ? 'Regional Scope: You can ONLY see and inspect performance for employees reporting directly under your admin profile.'
                  : 'Self Scope: You can inspect your own profile and performance records.'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--rp-charcoal-700)', fontWeight: 600 }}>Test Different Scope:</span>
            {DEMO_ACCOUNTS.slice(0, 3).map((acc) => (
              <button
                key={acc.key}
                onClick={() => quickLogin(acc.key)}
                style={{
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: currentUser?.email === acc.email ? '1px solid var(--rp-green-primary)' : '1px solid var(--rp-gray-300)',
                  backgroundColor: currentUser?.email === acc.email ? 'var(--rp-green-primary)' : 'var(--rp-white)',
                  color: currentUser?.email === acc.email ? 'var(--rp-white)' : 'var(--rp-charcoal-800)',
                }}
              >
                {acc.label}
              </button>
            ))}
          </div>
        </div>

        {/* Top KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <KpiCard
            title="Scoped Users"
            value={totalUsers}
            unit="Accounts"
            icon={<Users size={18} />}
            accentColor="green"
          />
          <KpiCard
            title="Regional Admins"
            value={adminCount}
            unit="Managers"
            icon={<ShieldCheck size={18} />}
            accentColor="charcoal"
          />
          <KpiCard
            title="Field & Sales Employees"
            value={empCount}
            unit="Executives"
            icon={<Briefcase size={18} />}
            accentColor="solar"
          />
          <KpiCard
            title="Active Solar Customers"
            value={custCount}
            unit="Consumers"
            icon={<UserCheck size={18} />}
            accentColor="green"
          />
        </div>

        {/* FilterBar & Permission-Aware Table */}
        <section className="rp-card">
          <div className="rp-card-header">
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700 }}>User Hierarchy & Staff Directory</h4>
          </div>
          <div className="rp-card-body" style={{ padding: '20px' }}>
            <FilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Search by name, email, phone..."
              activeFilterCount={roleFilter !== 'all' ? 1 : 0}
              onResetFilters={() => {
                setSearchQuery('');
                setRoleFilter('all');
              }}
            >
              {isSuperAdmin && (
                <div style={{ width: '180px' }}>
                  <Select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    options={[
                      { value: 'all', label: 'All Role Tiers' },
                      { value: 'admin', label: 'Admins Only' },
                      { value: 'employee', label: 'Employees Only' },
                      { value: 'customer', label: 'Customers Only' },
                    ]}
                  />
                </div>
              )}
            </FilterBar>

            <Table
              columns={columns}
              data={users}
              keyExtractor={(row) => row.id}
              isLoading={isLoading}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={(k) => {
                setSortOrder(sortBy === k && sortOrder === 'asc' ? 'desc' : 'asc');
                setSortBy(k);
              }}
            />

            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(users.length / pageSize) || 1}
              pageSize={pageSize}
              totalRecords={users.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </section>

      </div>

      {/* ========================================================================= */}
      {/* 1. ONBOARD USER MODAL (Super Admin Only)                                 */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isOnboardOpen}
        onClose={() => setIsOnboardOpen(false)}
        title="Onboard Enterprise Staff / Admin"
        subtitle="R P Solar Pvt. Ltd. — Register new employee or branch administrator"
        maxWidth="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsOnboardOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleOnboardSubmit}>
              Complete Registration
            </Button>
          </>
        }
      >
        <form onSubmit={handleOnboardSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Input
              label="First Name"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              placeholder="e.g. Alok"
              isRequired
            />
            <Input
              label="Last Name"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              placeholder="e.g. Mishra"
              isRequired
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Input
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="alok.mishra@rpsolar.com"
              isRequired
            />
            <Input
              label="Mobile Number"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              placeholder="+91 98110 99887"
              isRequired
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Select
              label="Role Tier"
              value={formData.userType}
              onChange={(e) => setFormData({ ...formData, userType: e.target.value })}
              options={[
                { value: 'employee', label: 'Employee (Field/Sales Ops)' },
                { value: 'admin', label: 'Regional Admin' },
              ]}
              isRequired
            />

            <Select
              label="Branch / Operating Region"
              value={formData.branchRegion}
              onChange={(e) => setFormData({ ...formData, branchRegion: e.target.value })}
              options={[
                { value: 'Delhi/NCR', label: 'North Hub (Delhi/NCR)' },
                { value: 'Bangalore Metro', label: 'South Hub (Bangalore)' },
                { value: 'Mumbai/Pune', label: 'West Hub (Mumbai/Pune)' },
                { value: 'Jaipur Region', label: 'Rajasthan Hub (Jaipur)' },
              ]}
              isRequired
            />
          </div>

          {formData.userType === 'employee' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Select
                label="Department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                options={[
                  { value: 'sales', label: 'Sales & Project Acquisition' },
                  { value: 'survey_engineering', label: 'Site Survey & Engineering' },
                  { value: 'installation_ops', label: 'Installation & Construction' },
                  { value: 'subsidy_liaison', label: 'DISCOM & Subsidy Liaison' },
                  { value: 'accounts', label: 'Billing & Accounts' },
                ]}
              />

              <Select
                label="Assign Reporting Admin"
                value={formData.reportingAdminId}
                onChange={(e) => setFormData({ ...formData, reportingAdminId: e.target.value })}
                options={[
                  { value: 'adm-prof-north', label: 'Rajesh Verma (North Admin - Delhi)' },
                  { value: 'adm-prof-south', label: 'Suresh Menon (South Admin - Bangalore)' },
                ]}
                isRequired
              />
            </div>
          )}
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* 2. EDIT USER MODAL                                                        */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit Profile: ${selectedUser?.name}`}
        subtitle={`Role: ${selectedUser?.userType} • Email: ${selectedUser?.email}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleEditSubmit}>
              Save Changes
            </Button>
          </>
        }
      >
        <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Input
              label="First Name"
              value={editData.firstName}
              onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
              isRequired
            />
            <Input
              label="Last Name"
              value={editData.lastName}
              onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
              isRequired
            />
          </div>

          <Input
            label="Mobile Number"
            value={editData.phoneNumber}
            onChange={(e) => setEditData({ ...editData, phoneNumber: e.target.value })}
            isRequired
          />

          {selectedUser?.userType === 'employee' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <Input
                  label="Designation"
                  value={editData.designation}
                  onChange={(e) => setEditData({ ...editData, designation: e.target.value })}
                />
                <Input
                  label="Assigned Region"
                  value={editData.branchRegion}
                  onChange={(e) => setEditData({ ...editData, branchRegion: e.target.value })}
                />
              </div>

              {isSuperAdmin && (
                <Select
                  label="Change Employee Reporting Admin"
                  value={editData.reportingAdminId}
                  onChange={(e) => setEditData({ ...editData, reportingAdminId: e.target.value })}
                  options={[
                    { value: 'adm-prof-north', label: 'Rajesh Verma (North Admin - Delhi)' },
                    { value: 'adm-prof-south', label: 'Suresh Menon (South Admin - Bangalore)' },
                  ]}
                />
              )}
            </>
          )}
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* 3. EMPLOYEE PERFORMANCE DRAWER                                            */}
      {/* ========================================================================= */}
      <Drawer
        isOpen={isPerformanceOpen}
        onClose={() => setIsPerformanceOpen(false)}
        title={`Employee Performance & KPI Audit`}
        subtitle={employeeStats ? `${employeeStats.employeeName} (${employeeStats.employeeCode})` : 'Loading...'}
        width="580px"
        footer={
          <Button variant="secondary" onClick={() => setIsPerformanceOpen(false)}>
            Close Performance View
          </Button>
        }
      >
        {isLoadingStats ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--rp-gray-500)' }}>
            Calculating performance metrics...
          </div>
        ) : employeeStats ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Header info */}
            <div style={{ padding: '14px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--rp-gray-50)', border: '1px solid var(--rp-gray-200)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--rp-charcoal-900)' }}>
                    {employeeStats.employeeName}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--rp-gray-500)', marginTop: '2px' }}>
                    {employeeStats.designation} • Dept: <strong>{employeeStats.department}</strong>
                  </div>
                </div>
                <StatusBadge status="active" />
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--rp-charcoal-700)', marginTop: '8px', borderTop: '1px dashed var(--rp-gray-200)', paddingTop: '6px' }}>
                Reporting Admin: <strong>{employeeStats.reportingAdminName}</strong>
              </div>
            </div>

            {/* Performance KPI Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <KpiCard
                title="Total Customers"
                value={employeeStats.totalCustomers}
                unit="Consumers"
                subtitle={`B2B: ${employeeStats.b2bCustomers} • B2C: ${employeeStats.b2cCustomers}`}
                icon={<Users size={16} />}
                accentColor="green"
              />

              <KpiCard
                title="Installed Capacity"
                value={employeeStats.totalSolarCapacityKw}
                unit="kW"
                subtitle="Aggregated Solar Plants"
                icon={<Sun size={16} />}
                accentColor="solar"
              />

              <KpiCard
                title="Project Lifecycle"
                value={employeeStats.activeProjects}
                unit="Active"
                subtitle={`Completed: ${employeeStats.completedProjects} Plants`}
                icon={<FolderKanban size={16} />}
                accentColor="charcoal"
              />

              <KpiCard
                title="Completion Rate"
                value={`${employeeStats.completionRatePercent}%`}
                unit="On-Schedule"
                subtitle={`${employeeStats.pendingTasks} Pending Tasks`}
                icon={<CheckCircle2 size={16} />}
                accentColor="green"
              />
            </div>

            {/* Financial Collections Metric */}
            <div className="rp-card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--rp-charcoal-900)', marginBottom: '10px' }}>
                Payment Collection Performance
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--rp-gray-500)' }}>Total Collected</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--rp-green-dark)' }}>
                    ₹{employeeStats.totalPaymentCollections.toLocaleString('en-IN')}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--rp-gray-500)' }}>Pending Balance</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--rp-solar-orange)' }}>
                    ₹{employeeStats.pendingPaymentCollections.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
              <ProgressBar
                progress={
                  employeeStats.totalPaymentCollections + employeeStats.pendingPaymentCollections > 0
                    ? Math.round(
                        (employeeStats.totalPaymentCollections /
                          (employeeStats.totalPaymentCollections + employeeStats.pendingPaymentCollections)) *
                          100
                      )
                    : 100
                }
                label="Collection Efficiency Ratio"
              />
            </div>

          </div>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--rp-danger)' }}>
            No performance statistics available.
          </div>
        )}
      </Drawer>

      {/* ========================================================================= */}
      {/* 4. USER AUDIT ACTIVITY DRAWER                                             */}
      {/* ========================================================================= */}
      <Drawer
        isOpen={isActivityOpen}
        onClose={() => setIsActivityOpen(false)}
        title={`Audit Trail: ${selectedUser?.email}`}
        subtitle="Security events, stage sign-offs, and state transitions"
        width="500px"
        footer={
          <Button variant="secondary" onClick={() => setIsActivityOpen(false)}>
            Close Trail
          </Button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {userActivityLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px', color: 'var(--rp-gray-400)' }}>
              No audit logs recorded for this user.
            </div>
          ) : (
            userActivityLogs.map((log) => (
              <div
                key={log.id}
                style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--rp-gray-50)',
                  border: '1px solid var(--rp-gray-200)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--rp-green-dark)' }}>
                    {log.action}
                  </span>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-400)' }}>
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--rp-gray-600)', lineHeight: 1.4 }}>
                  {log.details}
                </p>
                <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-400)', marginTop: '4px' }}>
                  IP: {log.actorIp} • Status: <strong style={{ color: log.status === 'SUCCESS' ? 'var(--rp-success)' : 'var(--rp-danger)' }}>{log.status}</strong>
                </div>
              </div>
            ))
          )}
        </div>
      </Drawer>

      {/* ========================================================================= */}
      {/* 5. ADMIN RESET PASSWORD MODAL                                             */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isResetPwdOpen}
        onClose={() => setIsResetPwdOpen(false)}
        title={`Admin Password Override`}
        subtitle={`Reset credentials for ${selectedUser?.email}`}
        maxWidth="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsResetPwdOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleResetPassword}>
              Confirm Reset
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--rp-gray-600)' }}>
            Enter a new password for this user. They will immediately be able to sign in with these credentials.
          </p>
          <Input
            label="New Temporary / Permanent Password"
            value={newPasswordVal}
            onChange={(e) => setNewPasswordVal(e.target.value)}
            isRequired
          />
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* 6. STATUS ENABLE/DISABLE CONFIRMATION                                     */}
      {/* ========================================================================= */}
      <ConfirmationModal
        isOpen={isStatusConfirmOpen}
        onClose={() => setIsStatusConfirmOpen(false)}
        onConfirm={handleStatusToggle}
        title={selectedUser?.status === 'active' ? 'Disable User Account' : 'Reactivate User Account'}
        message={
          selectedUser?.status === 'active'
            ? `Are you sure you want to deactivate ${selectedUser?.name} (${selectedUser?.email})? They will immediately be locked out of the portal.`
            : `Are you sure you want to re-enable ${selectedUser?.name} (${selectedUser?.email})?`
        }
        confirmLabel={selectedUser?.status === 'active' ? 'Yes, Deactivate Account' : 'Yes, Reactivate Account'}
        variant={selectedUser?.status === 'active' ? 'danger' : 'primary'}
      />

    </AppShell>
  );
}
