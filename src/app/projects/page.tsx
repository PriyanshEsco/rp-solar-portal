'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
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
import { Timeline, TimelineItem } from '@/components/ui/Timeline';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { LIFECYCLE_PHASES, CANONICAL_OPERATIONAL_STAGES } from '@/lib/project-stages';
import { StageStatus, LifecyclePhase } from '@/lib/types';
import {
  FolderKanban,
  Zap,
  Sun,
  Building2,
  Home,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Calendar,
  Layers,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  Paperclip,
  Edit3,
  History,
  TrendingUp,
  Award,
  RefreshCw,
  Plus,
} from 'lucide-react';

export default function ProjectManagementPage() {
  const { user: currentUser } = useAuth();
  const toast = useToast();

  const [projects, setProjects] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'all' | 'b2b' | 'b2c'>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modals & Drawers
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [activeDrawerTab, setActiveDrawerTab] = useState<'lifecycle' | 'history' | 'specs'>('lifecycle');
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<string>('all');

  // Stage Update Modal state
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<any | null>(null);
  const [stageForm, setStageForm] = useState<{
    status: StageStatus;
    completionDate: string;
    remarks: string;
    documentName: string;
  }>({
    status: 'in_progress',
    completionDate: '',
    remarks: '',
    documentName: '',
  });

  // Create Project Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    customerId: '',
    projectName: '',
    capacityKw: '5.0',
    systemType: 'on_grid',
    priority: 'standard',
    startDate: new Date().toISOString().split('T')[0],
    targetCompletionDate: '',
    remarks: '',
  });

  // Fetch Projects
  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      let url = `/api/projects?type=${typeFilter}`;
      if (statusFilter !== 'all') url += `&status=${statusFilter}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setProjects(json.data);
        setSelectedProject((prev: any) => (prev ? (json.data.find((p: any) => p.id === prev.id) || prev) : null));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [typeFilter, statusFilter, searchQuery]);

  // Fetch Customers for assignment
  const fetchCustomers = useCallback(async () => {
    try {
      const res = await fetch('/api/customers?type=all');
      const json = await res.json();
      if (json.success) {
        setCustomers(json.data);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
    fetchCustomers();
  }, [fetchProjects, fetchCustomers, currentUser?.id]);

  // Stage status styling helpers
  const getStageStatusBadge = (status: StageStatus) => {
    switch (status) {
      case 'completed':
        return <span className="badge-solid-green" style={{ padding: '3px 8px', fontSize: '0.6875rem', borderRadius: 'var(--radius-xs)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={11} /> Completed</span>;
      case 'in_progress':
        return <span className="badge-solid-amber" style={{ padding: '3px 8px', fontSize: '0.6875rem', borderRadius: 'var(--radius-xs)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Clock size={11} /> In Progress</span>;
      case 'blocked':
        return <span className="badge-solid-red" style={{ padding: '3px 8px', fontSize: '0.6875rem', borderRadius: 'var(--radius-xs)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={11} /> Blocked</span>;
      case 'not_applicable':
        return <span className="badge-solid-gray" style={{ padding: '3px 8px', fontSize: '0.6875rem', borderRadius: 'var(--radius-xs)' }}>N/A</span>;
      default:
        return <span className="badge-outline-gray" style={{ padding: '3px 8px', fontSize: '0.6875rem', borderRadius: 'var(--radius-xs)' }}>Not Started</span>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'critical':
        return <span className="badge-solid-red" style={{ padding: '2px 6px', fontSize: '0.6875rem', borderRadius: 'var(--radius-xs)' }}>Critical</span>;
      case 'high':
        return <span className="badge-solid-amber" style={{ padding: '2px 6px', fontSize: '0.6875rem', borderRadius: 'var(--radius-xs)' }}>High</span>;
      case 'medium':
        return <span className="badge-outline-amber" style={{ padding: '2px 6px', fontSize: '0.6875rem', borderRadius: 'var(--radius-xs)' }}>Medium</span>;
      default:
        return <span className="badge-outline-gray" style={{ padding: '2px 6px', fontSize: '0.6875rem', borderRadius: 'var(--radius-xs)' }}>Standard</span>;
    }
  };

  // Open Stage Update modal
  const openStageEditor = (stage: any) => {
    setEditingStage(stage);
    setStageForm({
      status: stage.status || 'in_progress',
      completionDate: stage.completionDate || (stage.status === 'completed' ? new Date().toISOString().split('T')[0] : ''),
      remarks: stage.remarks || '',
      documentName: '',
    });
    setIsStageModalOpen(true);
  };

  // Submit Stage update
  const handleStageUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !editingStage) return;

    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/stages`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stageKey: editingStage.stageKey,
          status: stageForm.status,
          completionDate: stageForm.status === 'completed' ? (stageForm.completionDate || new Date().toISOString().split('T')[0]) : null,
          remarks: stageForm.remarks,
          documentName: stageForm.documentName || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Stage Updated', `Stage '${editingStage.stageName}' transitioned to ${stageForm.status.replace('_', ' ')}.`);
        setIsStageModalOpen(false);
        fetchProjects();
      } else {
        toast.error('Update Failed', json.error?.message);
      }
    } catch (err: any) {
      toast.error('Error', err.message);
    }
  };

  // Submit Create Project
  const handleCreateProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Project Created', json.message);
        setIsCreateModalOpen(false);
        fetchProjects();
      } else {
        toast.error('Creation Failed', json.error?.message);
      }
    } catch (err: any) {
      toast.error('Error', err.message);
    }
  };

  // Open Project Details Drawer
  const openProjectDetails = (proj: any) => {
    setSelectedProject(proj);
    setActiveDrawerTab('lifecycle');
    setSelectedPhaseFilter('all');
    setIsDetailDrawerOpen(true);
  };

  // Compute KPI Totals
  const totalProjects = projects.length;
  const totalCapacityKw = projects.reduce((acc, p) => acc + (p.capacityKw || 0), 0);
  const inProgressProjects = projects.filter((p) => p.status === 'in_progress' || p.status === 'installation_in_progress' || p.status === 'net_metering').length;
  const completedProjects = projects.filter((p) => p.status === 'completed' || p.status === 'commissioned').length;

  // Table Columns definition
  const columns: Column<any>[] = [
    {
      key: 'projectCode',
      header: 'Project Code / Title',
      sortable: true,
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-xs)',
              backgroundColor: row.isB2B ? '#fef3c7' : 'var(--rp-green-surface)',
              color: row.isB2B ? '#b45309' : 'var(--rp-green-dark)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {row.isB2B ? <Building2 size={18} /> : <Sun size={18} />}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--rp-charcoal-900)' }}>
                {row.projectCode}
              </span>
              <span className={row.isB2B ? 'badge-solid-amber' : 'badge-solid-green'} style={{ padding: '1px 5px', fontSize: '0.625rem', borderRadius: 'var(--radius-xs)' }}>
                {row.customerType}
              </span>
              {getPriorityBadge(row.priority)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--rp-charcoal-600)', marginTop: '2px', fontWeight: 500 }}>
              {row.projectName}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer / Organization',
      sortable: true,
      render: (row) => (
        <div>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--rp-charcoal-900)' }}>
            {row.isB2B ? row.organization?.orgName || row.customer?.name : row.customer?.name}
          </div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-500)', marginTop: '2px' }}>
            {row.customer?.city || row.customer?.district || 'Delhi'}, {row.customer?.state || 'Delhi'}
          </div>
        </div>
      ),
    },
    {
      key: 'capacityKw',
      header: 'Capacity & Type',
      sortable: true,
      render: (row) => (
        <div>
          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--rp-green-dark)' }}>
            {row.capacityKw} kW
          </div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-500)', textTransform: 'capitalize' }}>
            {row.systemType?.replace('_', ' ')}
          </div>
        </div>
      ),
    },
    {
      key: 'currentStage',
      header: 'Current Active Stage',
      render: (row) => (
        <div>
          <span className="badge-outline-green" style={{ padding: '3px 8px', fontSize: '0.6875rem', borderRadius: 'var(--radius-xs)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Zap size={11} color="var(--rp-solar-orange)" /> {row.currentStage}
          </span>
          <div style={{ width: '130px', marginTop: '6px' }}>
            <ProgressBar progress={row.stagesSummary?.progressPercent || 0} height={6} showPercent={false} colorVariant="solar" />
            <div style={{ fontSize: '0.625rem', color: 'var(--rp-gray-500)', marginTop: '2px', textAlign: 'right' }}>
              {row.stagesSummary?.completedStagesCount || 0}/26 ({row.stagesSummary?.progressPercent || 0}%)
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'assignedEmployee',
      header: 'Assigned Staff',
      render: (row) => (
        <div>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--rp-charcoal-900)' }}>
            {row.assignedEmployee?.name || 'Unassigned'}
          </div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-500)' }}>
            Admin: {row.assignedAdmin?.name || 'Central'}
          </div>
        </div>
      ),
    },
    {
      key: 'timeline',
      header: 'Timeline',
      render: (row) => (
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--rp-charcoal-800)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Calendar size={12} color="var(--rp-gray-400)" /> {row.startDate}
          </div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-500)', marginTop: '2px' }}>
            Exp: {row.expectedCompletion}
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Lifecycle 360',
      render: (row) => (
        <div style={{ display: 'flex', gap: '6px' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              openProjectDetails(row);
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
          >
            <Layers size={13} />
            Stages
          </Button>
          <Link href={`/projects/${row.id}`} style={{ textDecoration: 'none' }}>
            <Button
              variant="primary"
              size="sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
            >
              Customer 360
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Solar Project Management"
        subtitle="End-to-end solar EPC tracking: 26 structured operational stages from Feasibility to Grid Sync & Subsidy"
        breadcrumbs={[
          { label: 'Portal', href: '/' },
          { label: 'Solar Projects' },
        ]}
        actions={
          <Button
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} />
            Create Project
          </Button>
        }
      />

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <KpiCard
          title="TOTAL PROJECTS"
          value={totalProjects.toString()}
          subtitle="All active & completed installations"
          icon={<FolderKanban size={22} />}
          accentColor="green"
        />
        <KpiCard
          title="CAPACITY UNDER EXECUTION"
          value={`${totalCapacityKw.toFixed(1)} kW`}
          subtitle={`${(totalCapacityKw / 1000).toFixed(2)} MW cumulative load`}
          icon={<Zap size={22} />}
          accentColor="solar"
        />
        <KpiCard
          title="ACTIVE WORKFLOW"
          value={inProgressProjects.toString()}
          subtitle="In structural mounting, wiring & testing"
          icon={<Clock size={22} />}
          accentColor="solar"
        />
        <KpiCard
          title="COMMISSIONED & METERS"
          value={completedProjects.toString()}
          subtitle="Net-metered & subsidy in progress"
          icon={<CheckCircle2 size={22} />}
          accentColor="green"
        />
      </div>

      {/* Lifecycle Flow Ribbon */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--rp-gray-200)',
          padding: '16px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--rp-charcoal-900)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Standard Project Lifecycle Flow (12 High-Level Phases)
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--rp-gray-500)' }}>
            Total 26 Operational Checklist Items
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
          {LIFECYCLE_PHASES.map((phase, idx) => (
            <React.Fragment key={phase.key}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-xs)',
                  backgroundColor: 'var(--rp-gray-50)',
                  border: '1px solid var(--rp-gray-200)',
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  color: 'var(--rp-charcoal-800)',
                  whiteSpace: 'nowrap',
                }}
              >
                <span
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    backgroundColor: phase.color,
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.5625rem',
                    fontWeight: 700,
                  }}
                >
                  {idx + 1}
                </span>
                {phase.shortLabel}
              </div>
              {idx < LIFECYCLE_PHASES.length - 1 && (
                <ArrowRight size={12} color="var(--rp-gray-400)" style={{ flexShrink: 0 }} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <FilterBar
        searchPlaceholder="Search by Project ID, Customer, Organization, Current Stage..."
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      >
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ display: 'flex', backgroundColor: 'var(--rp-gray-100)', padding: '2px', borderRadius: 'var(--radius-xs)' }}>
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              style={{
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: 'var(--radius-xs)',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: typeFilter === 'all' ? '#ffffff' : 'transparent',
                color: typeFilter === 'all' ? 'var(--rp-green-dark)' : 'var(--rp-gray-600)',
                boxShadow: typeFilter === 'all' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              All ({projects.length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('b2b')}
              style={{
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: 'var(--radius-xs)',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: typeFilter === 'b2b' ? '#ffffff' : 'transparent',
                color: typeFilter === 'b2b' ? 'var(--rp-green-dark)' : 'var(--rp-gray-600)',
                boxShadow: typeFilter === 'b2b' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              B2B Commercial ({projects.filter((p) => p.isB2B).length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('b2c')}
              style={{
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: 'var(--radius-xs)',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: typeFilter === 'b2c' ? '#ffffff' : 'transparent',
                color: typeFilter === 'b2c' ? 'var(--rp-green-dark)' : 'var(--rp-gray-600)',
                boxShadow: typeFilter === 'b2c' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              B2C Residential ({projects.filter((p) => !p.isB2B).length})
            </button>
          </div>

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Project Statuses' },
              { value: 'installation_in_progress', label: 'Installation In Progress' },
              { value: 'net_metering', label: 'Net Metering Sync' },
              { value: 'completed', label: 'Completed' },
              { value: 'draft', label: 'Draft' },
            ]}
          />
        </div>
      </FilterBar>

      {/* Main Project Directory Table */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-sm)', border: '1px solid var(--rp-gray-200)', marginTop: '16px' }}>
        <Table
          columns={columns}
          data={projects.slice((currentPage - 1) * pageSize, currentPage * pageSize)}
          keyExtractor={(row) => row.id}
          isLoading={isLoading}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={(key) => {
            if (sortBy === key) {
              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
            } else {
              setSortBy(key);
              setSortOrder('asc');
            }
          }}
          onRowClick={(row) => openProjectDetails(row)}
          emptyTitle="No active solar projects found."
          emptyDescription="Create a new solar project from an onboarded customer or adjust your stage filters."
        />

        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--rp-gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--rp-gray-500)' }}>
            Showing {projects.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
            {Math.min(currentPage * pageSize, projects.length)} of {projects.length} solar projects
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(projects.length / pageSize) || 1}
            pageSize={pageSize}
            totalRecords={projects.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PROJECT 360 LIFECYCLE DRAWER                                              */}
      {/* ========================================================================= */}
      <Drawer
        isOpen={isDetailDrawerOpen}
        onClose={() => setIsDetailDrawerOpen(false)}
        title={selectedProject?.projectName || selectedProject?.projectCode}
        subtitle={`${selectedProject?.projectCode} • ${selectedProject?.capacityKw}kW ${selectedProject?.systemType?.replace('_', ' ')}`}
        width="860px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--rp-gray-500)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={14} color="var(--rp-green-primary)" />
              Assigned Lead: {selectedProject?.assignedEmployee?.name} (Admin: {selectedProject?.assignedAdmin?.name})
            </div>
            <Button variant="secondary" onClick={() => setIsDetailDrawerOpen(false)}>
              Close Overview
            </Button>
          </div>
        }
      >
        {selectedProject && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Top Summary Banner */}
            <div style={{ padding: '16px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--rp-gray-50)', border: '1px solid var(--rp-gray-200)', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '12px', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className={selectedProject.isB2B ? 'badge-solid-amber' : 'badge-solid-green'} style={{ padding: '2px 6px', fontSize: '0.625rem', borderRadius: 'var(--radius-xs)' }}>
                    {selectedProject.customerType} Solar Project
                  </span>
                  {getPriorityBadge(selectedProject.priority)}
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--rp-charcoal-900)', marginTop: '4px' }}>
                  {selectedProject.isB2B ? selectedProject.organization?.orgName || selectedProject.customer?.name : selectedProject.customer?.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--rp-gray-500)', marginTop: '2px' }}>
                  Consumer No: {selectedProject.customer?.electricityConsumerNumber || 'N/A'} • {selectedProject.customer?.city}, {selectedProject.customer?.state}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-400)' }}>SOLAR CAPACITY</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--rp-green-dark)' }}>
                  {selectedProject.capacityKw} kW
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-500)' }}>
                  Est: ₹{selectedProject.totalCost?.toLocaleString('en-IN')}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-400)' }}>LIFECYCLE PROGRESS</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--rp-solar-orange)' }}>
                  {selectedProject.stagesSummary?.progressPercent || 0}%
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-500)' }}>
                  {selectedProject.stagesSummary?.completedStagesCount || 0} / 26 Stages Done
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-400)' }}>TARGET COMMISSION</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--rp-charcoal-800)' }}>
                  {selectedProject.expectedCompletion}
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-500)' }}>
                  Started: {selectedProject.startDate}
                </div>
              </div>
            </div>

            {/* Navigation Tabs inside Drawer */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--rp-gray-200)', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setActiveDrawerTab('lifecycle')}
                style={{
                  padding: '8px 16px',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: activeDrawerTab === 'lifecycle' ? 'var(--rp-green-dark)' : 'var(--rp-gray-500)',
                  borderBottom: activeDrawerTab === 'lifecycle' ? '2px solid var(--rp-green-primary)' : '2px solid transparent',
                  background: 'none',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Layers size={14} />
                26 Structured Stages
              </button>

              <button
                type="button"
                onClick={() => setActiveDrawerTab('history')}
                style={{
                  padding: '8px 16px',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: activeDrawerTab === 'history' ? 'var(--rp-green-dark)' : 'var(--rp-gray-500)',
                  borderBottom: activeDrawerTab === 'history' ? '2px solid var(--rp-green-primary)' : '2px solid transparent',
                  background: 'none',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <History size={14} />
                Immutable Audit History ({selectedProject.stageHistory?.length || 0})
              </button>

              <button
                type="button"
                onClick={() => setActiveDrawerTab('specs')}
                style={{
                  padding: '8px 16px',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: activeDrawerTab === 'specs' ? 'var(--rp-green-dark)' : 'var(--rp-gray-500)',
                  borderBottom: activeDrawerTab === 'specs' ? '2px solid var(--rp-green-primary)' : '2px solid transparent',
                  background: 'none',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <FileText size={14} />
                Customer & Site Specs
              </button>
            </div>

            {/* TAB 1: 26 STRUCTURED STAGES (Grouped by 12 Lifecycle Phases) */}
            {activeDrawerTab === 'lifecycle' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Phase Filter buttons */}
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedPhaseFilter('all')}
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      borderRadius: 'var(--radius-xs)',
                      border: selectedPhaseFilter === 'all' ? '1px solid var(--rp-green-primary)' : '1px solid var(--rp-gray-200)',
                      backgroundColor: selectedPhaseFilter === 'all' ? 'var(--rp-green-surface)' : 'var(--rp-gray-50)',
                      color: selectedPhaseFilter === 'all' ? 'var(--rp-green-dark)' : 'var(--rp-charcoal-700)',
                      cursor: 'pointer',
                    }}
                  >
                    All Phases (26 Stages)
                  </button>
                  {LIFECYCLE_PHASES.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setSelectedPhaseFilter(p.key)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        borderRadius: 'var(--radius-xs)',
                        border: selectedPhaseFilter === p.key ? '1px solid var(--rp-green-primary)' : '1px solid var(--rp-gray-200)',
                        backgroundColor: selectedPhaseFilter === p.key ? 'var(--rp-green-surface)' : 'var(--rp-gray-50)',
                        color: selectedPhaseFilter === p.key ? 'var(--rp-green-dark)' : 'var(--rp-charcoal-700)',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {p.shortLabel}
                    </button>
                  ))}
                </div>

                {/* Stages List Render */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {LIFECYCLE_PHASES.filter((phase) => selectedPhaseFilter === 'all' || selectedPhaseFilter === phase.key).map((phase) => {
                    const phaseStages = (selectedProject.stages || []).filter((s: any) => s.lifecyclePhase === phase.key);
                    if (phaseStages.length === 0) return null;

                    return (
                      <div
                        key={phase.key}
                        style={{
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--rp-gray-200)',
                          backgroundColor: '#ffffff',
                          overflow: 'hidden',
                        }}
                      >
                        {/* Phase Header */}
                        <div
                          style={{
                            padding: '8px 14px',
                            backgroundColor: 'var(--rp-gray-50)',
                            borderBottom: '1px solid var(--rp-gray-200)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: phase.color }} />
                            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--rp-charcoal-900)' }}>
                              {phase.label}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-500)' }}>
                            {phase.description}
                          </span>
                        </div>

                        {/* Stage Items */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          {phaseStages.map((stage: any, sIdx: number) => (
                            <div
                              key={stage.stageKey}
                              style={{
                                padding: '12px 14px',
                                borderBottom: sIdx < phaseStages.length - 1 ? '1px solid var(--rp-gray-100)' : 'none',
                                display: 'grid',
                                gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
                                gap: '12px',
                                alignItems: 'center',
                                backgroundColor: stage.status === 'in_progress' ? '#fffdf7' : 'transparent',
                              }}
                            >
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--rp-gray-400)' }}>
                                    #{stage.order}
                                  </span>
                                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--rp-charcoal-900)' }}>
                                    {stage.stageName}
                                  </span>
                                </div>
                                {stage.remarks && (
                                  <div style={{ fontSize: '0.75rem', color: 'var(--rp-gray-600)', marginTop: '3px', fontStyle: 'italic' }}>
                                    &ldquo;{stage.remarks}&rdquo;
                                  </div>
                                )}
                              </div>

                              <div>
                                {getStageStatusBadge(stage.status)}
                              </div>

                              <div>
                                <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-400)' }}>COMPLETION</div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--rp-charcoal-800)' }}>
                                  {stage.completionDate || 'Pending'}
                                </div>
                              </div>

                              <div>
                                <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-400)' }}>UPDATED BY</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--rp-charcoal-800)' }}>
                                  {stage.updatedBy?.name || 'System Engine'}
                                </div>
                              </div>

                              <div>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => openStageEditor(stage)}
                                  style={{ padding: '4px 8px', fontSize: '0.6875rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <Edit3 size={11} /> Update
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: IMMUTABLE STAGE AUDIT HISTORY */}
            {activeDrawerTab === 'history' && (
              <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--rp-charcoal-900)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={16} color="var(--rp-green-primary)" />
                  Permanent Lifecycle Transition Log (Immutable Historical Records)
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {selectedProject.stageHistory && selectedProject.stageHistory.length > 0 ? (
                    selectedProject.stageHistory.map((hist: any, hIdx: number) => (
                      <div
                        key={hist.id || hIdx}
                        style={{
                          padding: '12px',
                          borderRadius: 'var(--radius-xs)',
                          border: '1px solid var(--rp-gray-200)',
                          backgroundColor: 'var(--rp-gray-50)',
                          display: 'grid',
                          gridTemplateColumns: '1.5fr 1fr 2fr 1fr',
                          gap: '10px',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--rp-charcoal-900)' }}>
                            {hist.stageName}
                          </div>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-500)', marginTop: '2px' }}>
                            {new Date(hist.timestamp).toLocaleString()}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-500)' }}>TRANSITION</div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                            <span style={{ color: 'var(--rp-gray-500)' }}>{hist.previousStatus}</span> →{' '}
                            <span style={{ color: 'var(--rp-green-dark)' }}>{hist.newStatus}</span>
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-500)' }}>REMARKS</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--rp-charcoal-800)' }}>
                            {hist.remarks || 'Status updated'}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-500)' }}>AUTHOR</div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--rp-charcoal-900)' }}>
                            {hist.changedByUserName} ({hist.changedByUserRole})
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--rp-gray-500)', fontSize: '0.8125rem' }}>
                      No stage history events recorded yet.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: CUSTOMER & SITE SPECS */}
            {activeDrawerTab === 'specs' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--rp-gray-200)', backgroundColor: 'var(--rp-gray-50)' }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--rp-green-dark)', marginBottom: '10px' }}>
                    Customer & Installation Site
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.75rem' }}>
                    <div><strong>Customer Name:</strong> {selectedProject.customer?.name}</div>
                    <div><strong>Customer Type:</strong> {selectedProject.customerType}</div>
                    <div><strong>Phone:</strong> {selectedProject.customer?.phoneNumber}</div>
                    <div><strong>Email:</strong> {selectedProject.customer?.email}</div>
                    <div><strong>Site Address:</strong> {selectedProject.customer?.address}</div>
                    <div><strong>District & State:</strong> {selectedProject.customer?.district}, {selectedProject.customer?.state}</div>
                    <div><strong>Consumer Number:</strong> {selectedProject.customer?.electricityConsumerNumber}</div>
                    <div><strong>DISCOM:</strong> {selectedProject.customer?.discomName || 'Regional DISCOM'}</div>
                  </div>
                </div>

                <div style={{ padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--rp-gray-200)', backgroundColor: 'var(--rp-gray-50)' }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--rp-solar-orange)', marginBottom: '10px' }}>
                    Engineering & Commercial Parameters
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.75rem' }}>
                    <div><strong>Solar Capacity:</strong> {selectedProject.capacityKw} kW</div>
                    <div><strong>System Type:</strong> {selectedProject.systemType}</div>
                    <div><strong>Total EPC Contract:</strong> ₹{selectedProject.totalCost?.toLocaleString('en-IN')}</div>
                    <div><strong>Assigned Engineer:</strong> {selectedProject.assignedEmployee?.name} ({selectedProject.assignedEmployee?.code})</div>
                    <div><strong>Regional Admin:</strong> {selectedProject.assignedAdmin?.name}</div>
                    <div><strong>Project Start Date:</strong> {selectedProject.startDate}</div>
                    <div><strong>Target Completion:</strong> {selectedProject.expectedCompletion}</div>
                    <div><strong>Remarks:</strong> {selectedProject.remarks || 'Standard installation schedule'}</div>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </Drawer>

      {/* ========================================================================= */}
      {/* STAGE STATUS TRANSITION MODAL                                             */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isStageModalOpen}
        onClose={() => setIsStageModalOpen(false)}
        title={`Update Stage: ${editingStage?.stageName}`}
        subtitle={`Stage #${editingStage?.order} • ${selectedProject?.projectCode}`}
        maxWidth="md"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
            <Button variant="secondary" onClick={() => setIsStageModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleStageUpdateSubmit}>
              Save & Record History
            </Button>
          </div>
        }
      >
        <form onSubmit={handleStageUpdateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Select
            label="Stage Operational Status"
            value={stageForm.status}
            onChange={(e) => setStageForm({ ...stageForm, status: e.target.value as StageStatus })}
            isRequired
            options={[
              { value: 'not_started', label: 'Not Started' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'completed', label: 'Completed' },
              { value: 'blocked', label: 'Blocked' },
              { value: 'not_applicable', label: 'Not Applicable' },
            ]}
          />

          {stageForm.status === 'completed' && (
            <DatePicker
              label="Completion Signoff Date"
              value={stageForm.completionDate}
              onChange={(d) => setStageForm({ ...stageForm, completionDate: d })}
              isRequired
            />
          )}

          <Input
            label="Verification Remarks / Engineering Notes"
            value={stageForm.remarks}
            onChange={(e) => setStageForm({ ...stageForm, remarks: e.target.value })}
            placeholder="e.g. Inverter sync tested, CEIG safety certificate signed."
            isRequired
          />

          <Input
            label="Attach Verification Document (Optional)"
            value={stageForm.documentName}
            onChange={(e) => setStageForm({ ...stageForm, documentName: e.target.value })}
            placeholder="e.g. site_inspection_report.pdf"
          />

          <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-500)', backgroundColor: 'var(--rp-gray-50)', padding: '10px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--rp-gray-200)' }}>
            <strong>Immutable Audit Notice:</strong> This change will be permanently logged with your user credentials ({currentUser?.email}) into the project stage history ledger.
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* CREATE NEW PROJECT MODAL                                                  */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Initialize New Solar Project"
        subtitle="Links customer to 26 operational EPC lifecycle stages"
        maxWidth="md"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
            <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateProjectSubmit}>
              Create Project
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateProjectSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Select
            label="Select Customer Account"
            value={createForm.customerId}
            onChange={(e) => {
              const custId = e.target.value;
              const found = customers.find((c) => c.id === custId);
              setCreateForm({
                ...createForm,
                customerId: custId,
                projectName: found ? `${found.name} ${found.proposedCapacityKw || 5}kW Solar Plant` : '',
                capacityKw: found ? String(found.proposedCapacityKw || 5) : '5.0',
              });
            }}
            isRequired
            options={[
              { value: '', label: '-- Select Customer --' },
              ...customers.map((c) => ({
                value: c.id,
                label: `${c.name} (${c.categoryLabel} - ${c.city})`,
              })),
            ]}
          />

          <Input
            label="Project Title"
            value={createForm.projectName}
            onChange={(e) => setCreateForm({ ...createForm, projectName: e.target.value })}
            placeholder="e.g. Ramesh Patel 5kW Rooftop Solar"
            isRequired
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input
              label="Solar Capacity (kW)"
              type="number"
              value={createForm.capacityKw}
              onChange={(e) => setCreateForm({ ...createForm, capacityKw: e.target.value })}
              isRequired
            />
            <Select
              label="System Type"
              value={createForm.systemType}
              onChange={(e) => setCreateForm({ ...createForm, systemType: e.target.value as any })}
              options={[
                { value: 'on_grid', label: 'On-Grid Net Metered' },
                { value: 'hybrid', label: 'Hybrid Solar + Battery' },
                { value: 'off_grid', label: 'Off-Grid Standalone' },
              ]}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Select
              label="Priority"
              value={createForm.priority}
              onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
              options={[
                { value: 'standard', label: 'Standard' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'critical', label: 'Critical' },
              ]}
            />
            <DatePicker
              label="Target Completion Date"
              value={createForm.targetCompletionDate}
              onChange={(d) => setCreateForm({ ...createForm, targetCompletionDate: d })}
            />
          </div>

          <Input
            label="Initial Engineering Remarks"
            value={createForm.remarks}
            onChange={(e) => setCreateForm({ ...createForm, remarks: e.target.value })}
            placeholder="Site surveyed; foundation drawing in progress."
          />
        </form>
      </Modal>

    </AppShell>
  );
}
