'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { StatusBadge } from '@/components/ui/StatusBadge';
import { KpiCard } from '@/components/ui/KpiCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { LIFECYCLE_PHASES } from '@/lib/project-stages';
import { StageStatus } from '@/lib/types';
import {
  Sun,
  Building2,
  Zap,
  CreditCard,
  FileText,
  Wrench,
  BadgePercent,
  Receipt,
  Award,
  History,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  Calendar,
  UserCheck,
  ShieldCheck,
  ArrowLeft,
  ChevronRight,
  Download,
  Upload,
  ExternalLink,
  Edit3,
  Plus,
  Info,
  MapPin,
  Phone,
  Mail,
  Check,
  Circle,
  FileCheck,
  RefreshCw,
} from 'lucide-react';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id as string;
  const { user: currentUser } = useAuth();
  const toast = useToast();

  const [data360, setData360] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'project' | 'payments' | 'documents' | 'installation' | 'subsidy' | 'invoice' | 'warranty' | 'activity'
  >('overview');

  // Stage Modal for updating stage
  const [selectedStage, setSelectedStage] = useState<any | null>(null);
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
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

  // Stage Detail Drawer (when user clicks a stage in timeline)
  const [stageDetailDrawer, setStageDetailDrawer] = useState<any | null>(null);
  const [isStageDrawerOpen, setIsStageDrawerOpen] = useState(false);

  // Edit Project Metadata modal
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
  const [editProjectForm, setEditProjectForm] = useState({
    projectName: '',
    priority: 'standard',
    status: 'in_progress',
    targetCompletionDate: '',
    remarks: '',
  });

  // Fetch complete 360 data
  const fetchProject360 = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      const json = await res.json();
      if (json.success && json.data) {
        setData360(json.data);
        setEditProjectForm({
          projectName: json.data.project?.projectName || '',
          priority: json.data.project?.priority || 'standard',
          status: json.data.project?.status || 'in_progress',
          targetCompletionDate: json.data.project?.targetCompletionDate || '',
          remarks: json.data.project?.remarks || '',
        });
      } else {
        toast.error('Load Error', json.error?.message || 'Failed to load project details');
      }
    } catch (err: any) {
      toast.error('Network Error', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject360();
  }, [fetchProject360, currentUser]);

  // Open Stage editor
  const handleOpenStageEditor = (stage: any) => {
    setSelectedStage(stage);
    setStageForm({
      status: stage.status || 'in_progress',
      completionDate: stage.completionDate || (stage.status === 'completed' ? new Date().toISOString().split('T')[0] : ''),
      remarks: stage.remarks || '',
      documentName: '',
    });
    setIsStageModalOpen(true);
  };

  // Open Stage Detail Drawer
  const handleOpenStageDrawer = (stage: any) => {
    setStageDetailDrawer(stage);
    setIsStageDrawerOpen(true);
  };

  // Submit stage update
  const handleStageUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStage || !projectId) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/stages`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stageKey: selectedStage.stageKey,
          status: stageForm.status,
          completionDate: stageForm.status === 'completed' ? (stageForm.completionDate || new Date().toISOString().split('T')[0]) : null,
          remarks: stageForm.remarks,
          documentName: stageForm.documentName || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Stage Updated', `Stage '${selectedStage.stageName}' transitioned to ${stageForm.status.replace('_', ' ')}.`);
        setIsStageModalOpen(false);
        fetchProject360();
      } else {
        toast.error('Update Failed', json.error?.message);
      }
    } catch (err: any) {
      toast.error('Error', err.message);
    }
  };

  // Submit Project Metadata update
  const handleEditProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editProjectForm),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Project Updated', 'Project specifications updated successfully.');
        setIsEditProjectModalOpen(false);
        fetchProject360();
      } else {
        toast.error('Update Failed', json.error?.message);
      }
    } catch (err: any) {
      toast.error('Error', err.message);
    }
  };

  if (isLoading && !data360) {
    return (
      <AppShell>
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--rp-gray-500)' }}>
          <RefreshCw className="animate-spin" size={32} style={{ margin: '0 auto 12px' }} />
          Loading Project 360 & Lifecycle State...
        </div>
      </AppShell>
    );
  }

  if (!data360) {
    return (
      <AppShell>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <AlertTriangle size={48} color="var(--rp-solar-orange)" style={{ margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--rp-charcoal-900)' }}>Project Not Found</h2>
          <p style={{ color: 'var(--rp-gray-500)', marginTop: '6px' }}>The requested solar project ID is invalid or access is restricted.</p>
          <Button variant="primary" onClick={() => router.push('/projects')} style={{ marginTop: '16px' }}>
            Back to Projects Directory
          </Button>
        </div>
      </AppShell>
    );
  }

  const { project, kpiProgress, payment, documents, installation, subsidy, invoice, warranty, activity } = data360;
  const stages: any[] = project?.stages || [];
  const stageHistory: any[] = project?.stageHistory || [];

  // High-level visual timeline milestones (12 key phases)
  const timelinePhases = [
    { key: 'onboarding', label: 'Customer Onboarded', stageKey: 'brown_file' },
    { key: 'documentation', label: 'Documents & Loan', stageKey: 'jan_samarth_loan' },
    { key: 'registration', label: 'Registration & TFR', stageKey: 'mnre_registration' },
    { key: 'work_order', label: 'Work Order Issued', stageKey: 'work_order' },
    { key: 'structure', label: 'Structure Mounting', stageKey: 'structure_installation' },
    { key: 'wiring_earthing', label: 'Wiring & Earthing', stageKey: 'wiring_earthing_installation' },
    { key: 'system_installation', label: 'System Installation', stageKey: 'system_installation' },
    { key: 'meter', label: 'Net Meter Sync', stageKey: 'net_meter_installed' },
    { key: 'inspection', label: 'DISCOM Inspection', stageKey: 'inspections' },
    { key: 'subsidy', label: 'Subsidy Portal', stageKey: 'subsidy_apply' },
    { key: 'warranty', label: 'Warranty Handover', stageKey: 'warranty_issued' },
    { key: 'invoice', label: 'Final Tax Invoice', stageKey: 'invoice_file' },
  ];

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

  return (
    <AppShell>
      {/* Top Breadcrumb & Quick Back Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <Link
          href="/projects"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: 'var(--rp-green-dark)',
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={16} /> Back to Projects
        </Link>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" size="sm" onClick={() => setIsEditProjectModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Edit3 size={13} /> Edit Project Specs
          </Button>
          <Button variant="secondary" size="sm" onClick={() => fetchProject360()} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <RefreshCw size={13} /> Refresh
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. COMPREHENSIVE HEADER                                                   */}
      {/* ========================================================================= */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--rp-gray-200)',
          padding: '24px',
          marginBottom: '20px',
          boxShadow: 'var(--shadow-xs)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          
          {/* Left: Customer & Project ID */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: project.isB2B ? '#fef3c7' : 'var(--rp-green-surface)',
                color: project.isB2B ? '#b45309' : 'var(--rp-green-dark)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {project.isB2B ? <Building2 size={26} /> : <Sun size={26} />}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span className={project.isB2B ? 'badge-solid-amber' : 'badge-solid-green'} style={{ padding: '2px 8px', fontSize: '0.6875rem', borderRadius: 'var(--radius-xs)' }}>
                  {project.customerCategory}
                </span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--rp-gray-500)' }}>
                  {project.projectCode}
                </span>
                <span className="badge-outline-green" style={{ padding: '2px 8px', fontSize: '0.6875rem', borderRadius: 'var(--radius-xs)', textTransform: 'capitalize' }}>
                  {project.status?.replace('_', ' ')}
                </span>
              </div>

              <h1 style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--rp-charcoal-900)', marginTop: '4px', letterSpacing: '-0.02em' }}>
                {project.isB2B ? project.organization?.orgName || project.customer?.name : `${project.customer?.firstName} ${project.customer?.lastName}`}
              </h1>

              <div style={{ fontSize: '0.8125rem', color: 'var(--rp-charcoal-600)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span><strong>Contact:</strong> {project.customer?.name} ({project.customer?.phoneNumber})</span>
                <span>•</span>
                <span><strong>Location:</strong> {project.customer?.city || project.customer?.district}, {project.customer?.state}</span>
                <span>•</span>
                <span><strong>Consumer No:</strong> {project.customer?.electricityConsumerNumber || 'Pending'}</span>
              </div>
            </div>
          </div>

          {/* Right: Technical & Assignment Pill Details */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, auto)', gap: '20px', padding: '12px 18px', backgroundColor: 'var(--rp-gray-50)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--rp-gray-200)' }}>
            <div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-400)', fontWeight: 600, textTransform: 'uppercase' }}>Solar Capacity</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--rp-green-dark)', marginTop: '2px' }}>
                {project.capacityKw} kW
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-500)', textTransform: 'capitalize' }}>
                {project.systemType?.replace('_', ' ')}
              </div>
            </div>

            <div style={{ borderLeft: '1px solid var(--rp-gray-200)', paddingLeft: '16px' }}>
              <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-400)', fontWeight: 600, textTransform: 'uppercase' }}>Lead Engineer</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--rp-charcoal-900)', marginTop: '2px' }}>
                {project.assignedEmployee?.name || 'Unassigned'}
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-500)' }}>
                {project.assignedEmployee?.region || 'Central HQ'}
              </div>
            </div>

            <div style={{ borderLeft: '1px solid var(--rp-gray-200)', paddingLeft: '16px' }}>
              <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-400)', fontWeight: 600, textTransform: 'uppercase' }}>Supervising Admin</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--rp-charcoal-900)', marginTop: '2px' }}>
                {project.assignedAdmin?.name || 'Super Admin Scope'}
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-500)' }}>
                {project.assignedAdmin?.region || 'Executive'}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. HIGH-LEVEL PROGRESS METRICS (4 CARDS)                                   */}
      {/* ========================================================================= */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
        
        {/* Project Progress */}
        <div className="rp-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--rp-gray-500)', textTransform: 'uppercase' }}>
              PROJECT PROGRESS
            </span>
            <Layers size={18} color="var(--rp-green-primary)" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--rp-charcoal-900)' }}>
            {kpiProgress?.projectProgress || 0}%
          </div>
          <ProgressBar progress={kpiProgress?.projectProgress || 0} height={6} showPercent={false} colorVariant="green" />
          <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-500)' }}>
            {stages.filter((s) => s.status === 'completed').length} of 26 Stages Completed
          </div>
        </div>

        {/* Payment Progress */}
        <div className="rp-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--rp-gray-500)', textTransform: 'uppercase' }}>
              PAYMENT PROGRESS
            </span>
            <CreditCard size={18} color="var(--rp-solar-yellow)" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--rp-charcoal-900)' }}>
            {kpiProgress?.paymentProgress || 0}%
          </div>
          <ProgressBar progress={kpiProgress?.paymentProgress || 0} height={6} showPercent={false} colorVariant="solar" />
          <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-500)' }}>
            ₹{payment.paidAmount?.toLocaleString('en-IN')} / ₹{payment.totalAmount?.toLocaleString('en-IN')}
          </div>
        </div>

        {/* Installation Progress */}
        <div className="rp-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--rp-gray-500)', textTransform: 'uppercase' }}>
              INSTALLATION PROGRESS
            </span>
            <Wrench size={18} color="#4338ca" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--rp-charcoal-900)' }}>
            {kpiProgress?.installationProgress || 0}%
          </div>
          <ProgressBar progress={kpiProgress?.installationProgress || 0} height={6} showPercent={false} colorVariant="green" />
          <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-500)' }}>
            Status: {installation?.status?.replace('_', ' ') || 'In Progress'}
          </div>
        </div>

        {/* Subsidy Progress */}
        <div className="rp-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--rp-gray-500)', textTransform: 'uppercase' }}>
              SUBSIDY PROGRESS
            </span>
            <BadgePercent size={18} color="var(--rp-solar-orange)" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--rp-charcoal-900)' }}>
            {kpiProgress?.subsidyProgress || 0}%
          </div>
          <ProgressBar progress={kpiProgress?.subsidyProgress || 0} height={6} showPercent={false} colorVariant="solar" />
          <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-500)' }}>
            {subsidy?.status === 'not_applied' ? 'Commercial (AD Tax Route)' : `DBT: ${subsidy?.status?.replace('_', ' ')}`}
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. VISUAL PROJECT TIMELINE (CLICKABLE STAGES)                              */}
      {/* ========================================================================= */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--rp-gray-200)',
          padding: '18px 20px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--rp-charcoal-900)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Interactive Visual Project Lifecycle
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--rp-gray-500)', marginTop: '2px' }}>
              Click any stage milestone to inspect status, engineering notes, attached verification docs, and history.
            </div>
          </div>
          <span className="badge-outline-green" style={{ padding: '3px 8px', fontSize: '0.6875rem', borderRadius: 'var(--radius-xs)' }}>
            Active Stage: {project.currentStage}
          </span>
        </div>

        {/* Timeline Horizontal Steps */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', padding: '6px 0 10px 0' }}>
          {timelinePhases.map((phase, idx) => {
            const linkedStage = stages.find((s) => s.stageKey === phase.stageKey) || stages.find((s) => s.lifecyclePhase === phase.key);
            const isCompleted = linkedStage?.status === 'completed';
            const isInProgress = linkedStage?.status === 'in_progress';
            const isBlocked = linkedStage?.status === 'blocked';

            let bgColor = 'var(--rp-gray-100)';
            let textColor = 'var(--rp-charcoal-700)';
            let borderColor = 'var(--rp-gray-200)';
            let icon = <Circle size={12} color="var(--rp-gray-400)" />;

            if (isCompleted) {
              bgColor = '#ecfdf5';
              textColor = '#065f46';
              borderColor = '#10b981';
              icon = <Check size={13} color="#059669" />;
            } else if (isInProgress) {
              bgColor = '#fffbeb';
              textColor = '#b45309';
              borderColor = 'var(--rp-solar-yellow)';
              icon = <Clock size={13} color="#d97706" />;
            } else if (isBlocked) {
              bgColor = '#fef2f2';
              textColor = '#991b1b';
              borderColor = '#ef4444';
              icon = <AlertTriangle size={13} color="#dc2626" />;
            }

            return (
              <React.Fragment key={phase.key}>
                <button
                  type="button"
                  onClick={() => linkedStage && handleOpenStageDrawer(linkedStage)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: bgColor,
                    border: `1.5px solid ${borderColor}`,
                    color: textColor,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {icon}
                  </span>
                  <span>{phase.label}</span>
                </button>

                {idx < timelinePhases.length - 1 && (
                  <ChevronRight size={14} color="var(--rp-gray-300)" style={{ flexShrink: 0 }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MAIN NAVIGATION TABS (9 SECTIONS)                                       */}
      {/* ========================================================================= */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--rp-gray-200)', gap: '4px', marginBottom: '20px', overflowX: 'auto' }}>
        {[
          { id: 'overview', label: '1. Overview', icon: Info },
          { id: 'project', label: '2. Project & 26 Stages', icon: Layers, badge: '26' },
          { id: 'payments', label: '3. Payments', icon: CreditCard },
          { id: 'documents', label: '4. Documents', icon: FileText, badge: documents?.length },
          { id: 'installation', label: '5. Installation', icon: Wrench },
          { id: 'subsidy', label: '6. Subsidy', icon: BadgePercent },
          { id: 'invoice', label: '7. Invoice', icon: Receipt },
          { id: 'warranty', label: '8. Warranty', icon: Award },
          { id: 'activity', label: '9. Activity Log', icon: History, badge: activity?.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '10px 16px',
                fontSize: '0.8125rem',
                fontWeight: isActive ? 700 : 600,
                color: isActive ? 'var(--rp-green-dark)' : 'var(--rp-charcoal-600)',
                borderBottom: isActive ? '2px solid var(--rp-green-primary)' : '2px solid transparent',
                marginBottom: '-2px',
                background: isActive ? 'var(--rp-green-surface)' : 'transparent',
                borderRadius: 'var(--radius-xs) var(--radius-xs) 0 0',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={15} color={isActive ? 'var(--rp-green-primary)' : 'currentColor'} />
              {tab.label}
              {tab.badge !== undefined && (
                <span style={{ fontSize: '0.625rem', padding: '1px 5px', borderRadius: '10px', backgroundColor: isActive ? 'var(--rp-green-primary)' : 'var(--rp-gray-200)', color: isActive ? '#ffffff' : 'var(--rp-charcoal-700)', fontWeight: 700 }}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW 360                                                       */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
          
          {/* Left Column: Project Summary & Milestone Progress */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div className="rp-card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--rp-charcoal-900)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={18} color="var(--rp-solar-orange)" />
                Solar EPC Contract Execution Summary
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--rp-charcoal-700)', lineHeight: 1.6 }}>
                {project.remarks || 'Standard turnkey EPC installation for rooftop solar power plant including engineering survey, DISCOM Net-Metering sanction, civil structural mounting, and National Subsidy documentation.'}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--rp-gray-200)' }}>
                <div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-400)' }}>CONTRACT VALUE</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--rp-charcoal-900)' }}>
                    ₹{payment.totalAmount?.toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-400)' }}>TOTAL CAPACITY</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--rp-green-dark)' }}>
                    {project.capacityKw} kW
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-400)' }}>ESTIMATED ANNUAL YIELD</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--rp-solar-orange)' }}>
                    {(project.capacityKw * 1450).toLocaleString('en-IN')} kWh/yr
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Next Steps / Active Tasks */}
            <div className="rp-card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--rp-charcoal-900)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} color="var(--rp-green-primary)" />
                Current Active Stages Under Execution
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {stages.filter((s) => s.status === 'in_progress').map((s) => (
                  <div
                    key={s.stageKey}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-xs)',
                      backgroundColor: '#fffdf7',
                      border: '1px solid #fef3c7',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--rp-charcoal-900)' }}>
                        Stage #{s.order}: {s.stageName}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--rp-gray-600)', marginTop: '2px' }}>
                        {s.remarks || 'Work in progress by site engineering team'}
                      </div>
                    </div>
                    <Button variant="primary" size="sm" onClick={() => handleOpenStageEditor(s)}>
                      Update Stage
                    </Button>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Customer & Staff Specs Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div className="rp-card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--rp-charcoal-900)', marginBottom: '14px' }}>
                Customer Profile & Contacts
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8125rem' }}>
                <div>
                  <span style={{ color: 'var(--rp-gray-500)' }}>Customer Name:</span>
                  <div style={{ fontWeight: 700, color: 'var(--rp-charcoal-900)' }}>{project.customer?.name}</div>
                </div>

                {project.isB2B && (
                  <div>
                    <span style={{ color: 'var(--rp-gray-500)' }}>Organization:</span>
                    <div style={{ fontWeight: 700, color: 'var(--rp-charcoal-900)' }}>{project.organization?.orgName}</div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-500)' }}>GSTIN: {project.organization?.gstin}</div>
                  </div>
                )}

                <div>
                  <span style={{ color: 'var(--rp-gray-500)' }}>Mobile Phone:</span>
                  <div style={{ fontWeight: 600 }}>{project.customer?.phoneNumber}</div>
                </div>

                <div>
                  <span style={{ color: 'var(--rp-gray-500)' }}>Email Address:</span>
                  <div style={{ fontWeight: 600 }}>{project.customer?.email}</div>
                </div>

                <div>
                  <span style={{ color: 'var(--rp-gray-500)' }}>Site Installation Address:</span>
                  <div style={{ fontWeight: 600 }}>{project.customer?.address}, {project.customer?.city} ({project.customer?.pincode})</div>
                </div>

                <div>
                  <span style={{ color: 'var(--rp-gray-500)' }}>DISCOM & Consumer Number:</span>
                  <div style={{ fontWeight: 700, color: 'var(--rp-green-dark)' }}>
                    {project.customer?.electricityConsumerNumber} ({project.customer?.discomName})
                  </div>
                </div>
              </div>
            </div>

            <div className="rp-card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--rp-charcoal-900)', marginBottom: '14px' }}>
                Assigned Execution Hierarchy
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.8125rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <UserCheck size={18} color="var(--rp-green-primary)" />
                  <div>
                    <div style={{ fontWeight: 700 }}>{project.assignedEmployee?.name}</div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-500)' }}>
                      Lead Site Engineer • {project.assignedEmployee?.code}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ShieldCheck size={18} color="var(--rp-solar-yellow)" />
                  <div>
                    <div style={{ fontWeight: 700 }}>{project.assignedAdmin?.name}</div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-500)' }}>
                      Supervising Regional Admin ({project.assignedAdmin?.region})
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: 26 STRUCTURED OPERATIONAL STAGES                                   */}
      {/* ========================================================================= */}
      {activeTab === 'project' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {LIFECYCLE_PHASES.map((phase) => {
            const phaseStages = stages.filter((s) => s.lifecyclePhase === phase.key);
            if (phaseStages.length === 0) return null;

            return (
              <div
                key={phase.key}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--rp-gray-200)',
                  overflow: 'hidden',
                }}
              >
                {/* Phase Header */}
                <div
                  style={{
                    padding: '10px 16px',
                    backgroundColor: 'var(--rp-gray-50)',
                    borderBottom: '1px solid var(--rp-gray-200)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: phase.color }} />
                    <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--rp-charcoal-900)' }}>
                      {phase.label}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--rp-gray-500)' }}>
                    {phase.description}
                  </span>
                </div>

                {/* Stages List */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {phaseStages.map((stage: any, sIdx: number) => (
                    <div
                      key={stage.stageKey}
                      style={{
                        padding: '14px 16px',
                        borderBottom: sIdx < phaseStages.length - 1 ? '1px solid var(--rp-gray-100)' : 'none',
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
                        gap: '12px',
                        alignItems: 'center',
                        backgroundColor: stage.status === 'in_progress' ? '#fffdf7' : 'transparent',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--rp-gray-400)' }}>
                            #{stage.order}
                          </span>
                          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--rp-charcoal-900)' }}>
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

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenStageDrawer(stage)}
                          style={{ padding: '4px 8px', fontSize: '0.6875rem' }}
                        >
                          Inspect
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleOpenStageEditor(stage)}
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
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PAYMENTS & INSTALLMENTS                                             */}
      {/* ========================================================================= */}
      {activeTab === 'payments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <KpiCard
              title="TOTAL CONTRACT VALUE"
              value={`₹${payment.totalAmount?.toLocaleString('en-IN')}`}
              subtitle="All equipment, structure & net metering"
              accentColor="charcoal"
            />
            <KpiCard
              title="TOTAL COLLECTED"
              value={`₹${payment.paidAmount?.toLocaleString('en-IN')}`}
              subtitle={`${kpiProgress?.paymentProgress}% of contract received`}
              accentColor="green"
            />
            <KpiCard
              title="BALANCE OUTSTANDING"
              value={`₹${payment.balanceAmount?.toLocaleString('en-IN')}`}
              subtitle="Linked to final installation milestones"
              accentColor="solar"
            />
          </div>

          <div className="rp-card" style={{ padding: '20px' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--rp-charcoal-900)', marginBottom: '14px' }}>
              Milestone Installment Schedule
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(payment.installments || []).map((inst: any) => (
                <div
                  key={inst.id}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-xs)',
                    border: '1px solid var(--rp-gray-200)',
                    backgroundColor: inst.status === 'paid' ? 'var(--rp-green-surface)' : 'var(--rp-gray-50)',
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 1.5fr',
                    gap: '12px',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--rp-charcoal-900)' }}>
                      Installment #{inst.installmentNumber}: {inst.title}
                    </div>
                    {inst.referenceNumber && (
                      <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-500)', marginTop: '2px' }}>
                        Ref: {inst.referenceNumber} • Method: {inst.paymentMethod}
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-400)' }}>AMOUNT</div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--rp-charcoal-900)' }}>
                      ₹{inst.amount?.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div>
                    <span className={inst.status === 'paid' ? 'badge-solid-green' : 'badge-solid-amber'} style={{ padding: '2px 8px', fontSize: '0.6875rem', borderRadius: 'var(--radius-xs)', textTransform: 'capitalize' }}>
                      {inst.status}
                    </span>
                  </div>

                  <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--rp-gray-600)' }}>
                    {inst.paidDate ? `Paid on ${inst.paidDate}` : 'Pending Completion'}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: DOCUMENTS VAULT                                                     */}
      {/* ========================================================================= */}
      {activeTab === 'documents' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--rp-charcoal-900)' }}>
              Project Compliance & Technical Documents ({documents?.length || 0})
            </div>
            <Button variant="primary" size="sm" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Upload size={14} /> Upload New Document
            </Button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {documents?.map((doc: any) => (
              <div
                key={doc.id}
                className="rp-card"
                style={{ padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <FileText size={24} color="var(--rp-green-primary)" />
                    <span className="badge-solid-green" style={{ padding: '2px 6px', fontSize: '0.625rem', borderRadius: 'var(--radius-xs)' }}>
                      {doc.verificationStatus}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--rp-charcoal-900)', marginTop: '10px' }}>
                    {doc.docTypeName}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-500)', marginTop: '3px' }}>
                    File: {doc.fileName} • {doc.fileSize || '2 MB'}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-400)', marginTop: '2px' }}>
                    Verified By: {doc.verifiedBy || 'Central Admin'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--rp-gray-100)', paddingTop: '10px' }}>
                  <Button variant="secondary" size="sm" style={{ width: '100%', fontSize: '0.6875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <Download size={12} /> Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: INSTALLATION SPECIFICATIONS                                         */}
      {/* ========================================================================= */}
      {activeTab === 'installation' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          
          <div className="rp-card" style={{ padding: '20px' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--rp-charcoal-900)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wrench size={18} color="var(--rp-green-primary)" />
              Solar PV Equipment & Mounting Hardware Specs
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.8125rem' }}>
              <div>
                <span style={{ color: 'var(--rp-gray-500)' }}>Solar PV Modules:</span>
                <div style={{ fontWeight: 700, color: 'var(--rp-charcoal-900)' }}>
                  {installation?.panelModel} ({installation?.panelCount} Modules)
                </div>
              </div>

              <div>
                <span style={{ color: 'var(--rp-gray-500)' }}>String Inverter Model & Serial:</span>
                <div style={{ fontWeight: 700, color: 'var(--rp-charcoal-900)' }}>
                  {installation?.inverterModel}
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-500)' }}>Serial: {installation?.inverterSerial}</div>
              </div>

              <div>
                <span style={{ color: 'var(--rp-gray-500)' }}>Module Mounting Structure (MMS):</span>
                <div style={{ fontWeight: 600 }}>{installation?.structureType}</div>
              </div>

              <div>
                <span style={{ color: 'var(--rp-gray-500)' }}>Roof Tilt Angle:</span>
                <div style={{ fontWeight: 700, color: 'var(--rp-green-dark)' }}>{installation?.tiltAngle}° Azimuth South</div>
              </div>

              <div>
                <span style={{ color: 'var(--rp-gray-500)' }}>Lead Installation Technician:</span>
                <div style={{ fontWeight: 600 }}>{installation?.leadTechnicianName}</div>
              </div>

              <div>
                <span style={{ color: 'var(--rp-gray-500)' }}>CEIG Safety Audit Status:</span>
                <div style={{ marginTop: '2px' }}>
                  <span className={installation?.safetyAuditPassed ? 'badge-solid-green' : 'badge-solid-amber'} style={{ padding: '2px 8px', fontSize: '0.6875rem', borderRadius: 'var(--radius-xs)' }}>
                    {installation?.safetyAuditPassed ? 'Safety Clearance Approved' : 'Audit In Progress'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="rp-card" style={{ padding: '20px' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--rp-charcoal-900)', marginBottom: '14px' }}>
              Site Execution Timetable
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.8125rem' }}>
              <div>
                <span style={{ color: 'var(--rp-gray-500)' }}>Civil & Structural Mounting Kickoff:</span>
                <div style={{ fontWeight: 700 }}>{installation?.scheduledDate}</div>
              </div>

              <div>
                <span style={{ color: 'var(--rp-gray-500)' }}>Commissioning & Net Meter Sync Date:</span>
                <div style={{ fontWeight: 700, color: 'var(--rp-green-dark)' }}>
                  {installation?.completionDate || 'Expected by ' + project.targetCompletionDate}
                </div>
              </div>

              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--rp-charcoal-900)', marginBottom: '8px' }}>
                  Site Verification Photos
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ width: '120px', height: '80px', backgroundColor: 'var(--rp-gray-100)', borderRadius: 'var(--radius-xs)', border: '1px dashed var(--rp-gray-300)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem', color: 'var(--rp-gray-500)' }}>
                    Roof Mount Photo
                  </div>
                  <div style={{ width: '120px', height: '80px', backgroundColor: 'var(--rp-gray-100)', borderRadius: 'var(--radius-xs)', border: '1px dashed var(--rp-gray-300)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem', color: 'var(--rp-gray-500)' }}>
                    Inverter Sync Photo
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: SUBSIDY TRACKER                                                     */}
      {/* ========================================================================= */}
      {activeTab === 'subsidy' && (
        <div className="rp-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--rp-charcoal-900)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BadgePercent size={20} color="var(--rp-solar-orange)" />
            National Solar Subsidy (DBT) Portal Tracking
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
            <div style={{ padding: '14px', borderRadius: 'var(--radius-xs)', backgroundColor: 'var(--rp-gray-50)', border: '1px solid var(--rp-gray-200)' }}>
              <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-400)' }}>SCHEME APPLIED AMOUNT</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--rp-green-dark)', marginTop: '2px' }}>
                ₹{subsidy?.appliedAmount?.toLocaleString('en-IN') || '0'}
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: 'var(--radius-xs)', backgroundColor: 'var(--rp-gray-50)', border: '1px solid var(--rp-gray-200)' }}>
              <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-400)' }}>SANCTIONED SUBSIDY</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--rp-solar-orange)', marginTop: '2px' }}>
                ₹{subsidy?.sanctionedAmount?.toLocaleString('en-IN') || '0'}
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: 'var(--radius-xs)', backgroundColor: 'var(--rp-gray-50)', border: '1px solid var(--rp-gray-200)' }}>
              <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-400)' }}>DISBURSED TO BANK</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--rp-charcoal-900)', marginTop: '2px' }}>
                ₹{subsidy?.disbursedAmount?.toLocaleString('en-IN') || '0'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8125rem' }}>
            <div><strong>Scheme Title:</strong> {subsidy?.schemeName}</div>
            <div><strong>National Portal Application No:</strong> {subsidy?.nationalPortalAppNo}</div>
            <div><strong>DISCOM Consumer Reference:</strong> {subsidy?.discomConsumerNo}</div>
            <div><strong>Linked DBT Bank Account:</strong> {subsidy?.dbtAccountNumber}</div>
            <div><strong>Subsidy Application Status:</strong> <span className="badge-solid-green" style={{ padding: '2px 8px', fontSize: '0.6875rem', borderRadius: 'var(--radius-xs)', textTransform: 'capitalize' }}>{subsidy?.status?.replace('_', ' ')}</span></div>
            <div><strong>Status Remarks:</strong> {subsidy?.remarks}</div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: TAX INVOICE & BREAKDOWN                                             */}
      {/* ========================================================================= */}
      {activeTab === 'invoice' && (
        <div className="rp-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--rp-gray-200)', paddingBottom: '16px', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-500)' }}>TAX INVOICE NUMBER</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--rp-charcoal-900)' }}>
                {invoice?.invoiceNumber}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--rp-gray-500)', marginTop: '2px' }}>
                Issue Date: {invoice?.issueDate} • Due Date: {invoice?.dueDate}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span className={invoice?.status === 'paid' ? 'badge-solid-green' : 'badge-solid-amber'} style={{ padding: '3px 10px', fontSize: '0.75rem', borderRadius: 'var(--radius-xs)', textTransform: 'capitalize' }}>
                {invoice?.status}
              </span>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--rp-green-dark)', marginTop: '4px' }}>
                ₹{invoice?.totalAmount?.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--rp-charcoal-900)', marginBottom: '8px' }}>
            Billed EPC Components & Service Charges
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(invoice?.lineItems || []).map((item: any, idx: number) => (
              <div
                key={idx}
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-xs)',
                  backgroundColor: 'var(--rp-gray-50)',
                  border: '1px solid var(--rp-gray-200)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.8125rem',
                }}
              >
                <div>
                  <span style={{ fontWeight: 600 }}>{item.description}</span>
                  {item.capacityKw && <span style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-500)', marginLeft: '6px' }}>({item.capacityKw} kW @ ₹{item.rate}/kW)</span>}
                </div>
                <div style={{ fontWeight: 800, color: 'var(--rp-charcoal-900)' }}>
                  ₹{item.total?.toLocaleString('en-IN')}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--rp-gray-200)' }}>
            <div style={{ width: '260px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8125rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--rp-gray-500)' }}>Taxable Subtotal:</span>
                <span>₹{invoice?.baseAmount?.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--rp-gray-500)' }}>GST (13.8% Composite):</span>
                <span>₹{invoice?.taxGstAmount?.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.9375rem', borderTop: '1px solid var(--rp-gray-300)', paddingTop: '4px' }}>
                <span>Total Amount:</span>
                <span style={{ color: 'var(--rp-green-dark)' }}>₹{invoice?.totalAmount?.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: WARRANTIES & PERFORMANCE GUARANTEES                                 */}
      {/* ========================================================================= */}
      {activeTab === 'warranty' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          
          <div className="rp-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Award size={24} color="var(--rp-green-primary)" />
            <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--rp-charcoal-900)' }}>
              25-Year PV Module Performance
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--rp-gray-600)' }}>
              {warranty?.panelManufacturer}
            </p>
            <div style={{ fontSize: '0.6875rem', color: 'var(--rp-green-dark)', fontWeight: 700 }}>
              Linear degradation guarantee (&gt;84.8% at Year 25)
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-500)' }}>
              Certificate: {warranty?.certificateNumber}
            </div>
          </div>

          <div className="rp-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Award size={24} color="var(--rp-solar-yellow)" />
            <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--rp-charcoal-900)' }}>
              {warranty?.inverterWarrantyYears}-Year Inverter Warranty
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--rp-gray-600)' }}>
              {warranty?.inverterManufacturer}
            </p>
            <div style={{ fontSize: '0.6875rem', color: 'var(--rp-solar-orange)', fontWeight: 700 }}>
              Full on-site component replacement guarantee
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-500)' }}>
              Valid until: {warranty?.endDate}
            </div>
          </div>

          <div className="rp-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Award size={24} color="#4338ca" />
            <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--rp-charcoal-900)' }}>
              5-Year Workmanship Warranty
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--rp-gray-600)' }}>
              R P Solar Pvt. Ltd. Official EPC Guarantee
            </p>
            <div style={{ fontSize: '0.6875rem', color: '#4338ca', fontWeight: 700 }}>
              Includes AC/DC cabling, waterproofing & structural joints
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-500)' }}>
              Active Coverage Status: Valid
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 9: ACTIVITY & IMMUTABLE AUDIT LOG                                      */}
      {/* ========================================================================= */}
      {activeTab === 'activity' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--rp-charcoal-900)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={18} color="var(--rp-green-primary)" />
            Immutable Audit Trail & Project Historical Log
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {stageHistory.map((hist: any, hIdx: number) => (
              <div
                key={hist.id || hIdx}
                style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid var(--rp-gray-200)',
                  backgroundColor: '#ffffff',
                  display: 'grid',
                  gridTemplateColumns: '1.5fr 1fr 2fr 1fr',
                  gap: '12px',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--rp-charcoal-900)' }}>
                    {hist.stageName}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-500)' }}>
                    {new Date(hist.timestamp).toLocaleString()}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-400)' }}>TRANSITION</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                    <span style={{ color: 'var(--rp-gray-500)' }}>{hist.previousStatus}</span> →{' '}
                    <span style={{ color: 'var(--rp-green-dark)' }}>{hist.newStatus}</span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-400)' }}>ENGINEERING REMARKS</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--rp-charcoal-800)' }}>
                    {hist.remarks || 'Stage transitioned'}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-400)' }}>AUTHOR</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--rp-charcoal-900)' }}>
                    {hist.changedByUserName} ({hist.changedByUserRole})
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE INSPECTION DRAWER (WHEN USER CLICKS A STAGE IN TIMELINE)            */}
      {/* ========================================================================= */}
      <Drawer
        isOpen={isStageDrawerOpen}
        onClose={() => setIsStageDrawerOpen(false)}
        title={stageDetailDrawer?.stageName}
        subtitle={`Stage #${stageDetailDrawer?.order} • ${project?.projectCode}`}
        width="540px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <Button variant="secondary" onClick={() => setIsStageDrawerOpen(false)}>
              Close
            </Button>
            <Button variant="primary" onClick={() => { setIsStageDrawerOpen(false); handleOpenStageEditor(stageDetailDrawer); }}>
              Update This Stage
            </Button>
          </div>
        }
      >
        {stageDetailDrawer && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '14px', borderRadius: 'var(--radius-xs)', backgroundColor: 'var(--rp-gray-50)', border: '1px solid var(--rp-gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-400)' }}>OPERATIONAL STATUS</div>
                <div style={{ marginTop: '4px' }}>
                  {getStageStatusBadge(stageDetailDrawer.status)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-400)' }}>COMPLETION DATE</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--rp-charcoal-900)', marginTop: '2px' }}>
                  {stageDetailDrawer.completionDate || 'Pending Execution'}
                </div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--rp-gray-500)', textTransform: 'uppercase' }}>
                Engineering Notes & Remarks
              </div>
              <div style={{ padding: '12px', borderRadius: 'var(--radius-xs)', backgroundColor: 'var(--rp-gray-50)', border: '1px solid var(--rp-gray-200)', fontSize: '0.8125rem', color: 'var(--rp-charcoal-800)', marginTop: '6px' }}>
                {stageDetailDrawer.remarks || 'No remarks provided for this operational stage.'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--rp-gray-500)', textTransform: 'uppercase' }}>
                Last Updated By
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--rp-charcoal-800)', marginTop: '4px' }}>
                {stageDetailDrawer.updatedBy?.name || 'System Initializer'} ({stageDetailDrawer.updatedBy?.role || 'engine'}) on {new Date(stageDetailDrawer.updatedAt || Date.now()).toLocaleString()}
              </div>
            </div>

            {/* Stage History */}
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--rp-gray-500)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Stage Transition History
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {stageHistory.filter((h: any) => h.stageKey === stageDetailDrawer.stageKey).map((h: any, idx: number) => (
                  <div key={idx} style={{ padding: '8px 10px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--rp-gray-200)', fontSize: '0.75rem' }}>
                    <div style={{ fontWeight: 600 }}>
                      {h.previousStatus} → <span style={{ color: 'var(--rp-green-dark)' }}>{h.newStatus}</span>
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-500)' }}>
                      By {h.changedByUserName} on {new Date(h.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* ========================================================================= */}
      {/* STAGE STATUS TRANSITION MODAL                                             */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isStageModalOpen}
        onClose={() => setIsStageModalOpen(false)}
        title={`Update Stage: ${selectedStage?.stageName}`}
        subtitle={`Stage #${selectedStage?.order} • ${project?.projectCode}`}
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
            placeholder="e.g. Structure erected with 28 deg tilt angle, anchor grouted."
            isRequired
          />

          <Input
            label="Attach Verification Document (Optional)"
            value={stageForm.documentName}
            onChange={(e) => setStageForm({ ...stageForm, documentName: e.target.value })}
            placeholder="e.g. structural_inspection_signoff.pdf"
          />
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* EDIT PROJECT METADATA MODAL                                               */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isEditProjectModalOpen}
        onClose={() => setIsEditProjectModalOpen(false)}
        title="Edit Project Specifications"
        subtitle={project?.projectCode}
        maxWidth="md"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
            <Button variant="secondary" onClick={() => setIsEditProjectModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleEditProjectSubmit}>
              Save Specifications
            </Button>
          </div>
        }
      >
        <form onSubmit={handleEditProjectSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Input
            label="Project Title"
            value={editProjectForm.projectName}
            onChange={(e) => setEditProjectForm({ ...editProjectForm, projectName: e.target.value })}
            isRequired
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Select
              label="Priority"
              value={editProjectForm.priority}
              onChange={(e) => setEditProjectForm({ ...editProjectForm, priority: e.target.value })}
              options={[
                { value: 'standard', label: 'Standard' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'critical', label: 'Critical' },
              ]}
            />

            <Select
              label="Overall Project Status"
              value={editProjectForm.status}
              onChange={(e) => setEditProjectForm({ ...editProjectForm, status: e.target.value })}
              options={[
                { value: 'draft', label: 'Draft' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'installation_in_progress', label: 'Installation In Progress' },
                { value: 'net_metering', label: 'Net Metering Sync' },
                { value: 'completed', label: 'Completed' },
                { value: 'on_hold', label: 'On Hold' },
              ]}
            />
          </div>

          <DatePicker
            label="Target Completion Date"
            value={editProjectForm.targetCompletionDate}
            onChange={(d) => setEditProjectForm({ ...editProjectForm, targetCompletionDate: d })}
          />

          <Input
            label="Engineering Notes / Remarks"
            value={editProjectForm.remarks}
            onChange={(e) => setEditProjectForm({ ...editProjectForm, remarks: e.target.value })}
          />
        </form>
      </Modal>

    </AppShell>
  );
}
