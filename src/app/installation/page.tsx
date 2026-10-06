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
import { FilterBar } from '@/components/ui/FilterBar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { KpiCard } from '@/components/ui/KpiCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import {
  Wrench,
  Zap,
  Sun,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Search,
  Layers,
  MapPin,
  Users,
  Compass,
  Cpu,
  Calendar,
  Camera,
  FileCheck,
  ArrowRight,
  Edit3,
  Info,
  Check,
} from 'lucide-react';
import { InstallationRecord, InstallationStageItem, InstallationStageKey } from '@/lib/types';

export default function InstallationManagementPage() {
  const { user: currentUser } = useAuth();
  const toast = useToast();

  const [installations, setInstallations] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<{
    totalInstallations: number;
    fullyCompleted: number;
    inProgressCount: number;
    pendingCount: number;
    avgProgress: number;
  }>({
    totalInstallations: 0,
    fullyCompleted: 0,
    inProgressCount: 0,
    pendingCount: 0,
    avgProgress: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Drawer / Detail state
  const [selectedInstallation, setSelectedInstallation] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Stage Update Modal State
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  const [activeStageKey, setActiveStageKey] = useState<string>('structure_supply');
  const [stageForm, setStageForm] = useState<{
    status: 'pending' | 'in_progress' | 'completed' | 'delayed' | 'on_hold';
    plannedDate: string;
    actualDate: string;
    assignedPerson: string;
    assignedTeam: string;
    remarks: string;
    photoUrl: string;
  }>({
    status: 'completed',
    plannedDate: new Date().toISOString().split('T')[0],
    actualDate: new Date().toISOString().split('T')[0],
    assignedPerson: '',
    assignedTeam: '',
    remarks: '',
    photoUrl: '',
  });

  // Fetch Installations
  const fetchInstallations = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/installation');
      const data = await res.json();
      if (data.success) {
        setInstallations(data.data || []);
        if (data.analytics) {
          setAnalytics(data.analytics);
        }
      } else {
        toast.error('Failed to load installations', data.error?.message || 'Server error');
      }
    } catch (err: any) {
      toast.error('Error', err.message || 'Failed to connect to installation endpoint');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInstallations();
  }, [fetchInstallations]);

  // Filtered installations
  const filteredInstallations = installations.filter((item) => {
    if (statusFilter !== 'all') {
      if (statusFilter === 'completed' && item.installationProgress !== 100) return false;
      if (statusFilter === 'in_progress' && (item.installationProgress === 0 || item.installationProgress === 100)) return false;
      if (statusFilter === 'pending' && item.installationProgress > 0) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.customerName?.toLowerCase().includes(q);
      const matchCode = item.projectCode?.toLowerCase().includes(q);
      const matchDistrict = item.district?.toLowerCase().includes(q);
      const matchTech = item.leadTechnicianName?.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchDistrict && !matchTech) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredInstallations.length / pageSize) || 1;
  const paginatedInstallations = filteredInstallations.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Handle open stage update modal
  const handleOpenStageUpdate = (inst: any, stage: InstallationStageItem) => {
    setSelectedInstallation(inst);
    setActiveStageKey(stage.stageKey);
    setStageForm({
      status: stage.status || 'completed',
      plannedDate: stage.plannedDate || new Date().toISOString().split('T')[0],
      actualDate: stage.actualDate || (stage.status === 'completed' ? new Date().toISOString().split('T')[0] : ''),
      assignedPerson: stage.assignedPerson || inst.leadTechnicianName || '',
      assignedTeam: stage.assignedTeam || inst.assignedTeam || '',
      remarks: stage.remarks || '',
      photoUrl: stage.photos && stage.photos.length > 0 ? stage.photos[0] : '',
    });
    setIsStageModalOpen(true);
  };

  // Submit stage update
  const handleSubmitStageUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstallation) return;

    try {
      const res = await fetch(`/api/installation/${selectedInstallation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stageKey: activeStageKey,
          stageUpdates: {
            status: stageForm.status,
            plannedDate: stageForm.plannedDate,
            actualDate: stageForm.actualDate || undefined,
            assignedPerson: stageForm.assignedPerson,
            assignedTeam: stageForm.assignedTeam,
            remarks: stageForm.remarks,
            photos: stageForm.photoUrl ? [stageForm.photoUrl] : undefined,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.showToast({
          type: 'success',
          title: 'Installation Stage Updated',
          message: data.message || 'Stage status and progress updated successfully.',
        });
        setIsStageModalOpen(false);
        fetchInstallations();
        // Update currently opened drawer
        if (selectedInstallation) {
          const updatedInst = (await (await fetch(`/api/installation/${selectedInstallation.id}`)).json()).data;
          if (updatedInst) setSelectedInstallation(updatedInst);
        }
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
        message: err.message || 'Failed to update stage',
      });
    }
  };

  // Table Columns
  const columns: Column<any>[] = [
    {
      key: 'project',
      header: 'Customer & Project',
      render: (row) => (
        <div className="flex flex-col">
          <div className="flex items-center space-x-2">
            <span
              className="font-semibold text-charcoal-900 text-xs hover:text-solar-green cursor-pointer"
              onClick={() => {
                setSelectedInstallation(row);
                setIsDrawerOpen(true);
              }}
            >
              {row.customerName}
            </span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
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
      key: 'specs',
      header: 'Solar System Specs',
      render: (row) => (
        <div className="flex flex-col text-xs">
          <div className="flex items-center text-charcoal-800 font-semibold">
            <Sun className="w-3.5 h-3.5 text-solar-amber mr-1" />
            <span>{row.capacityKw} kW Solar Plant</span>
          </div>
          <div className="text-[11px] text-charcoal-500 mt-0.5 flex items-center space-x-1.5">
            <Compass className="w-3 h-3 text-charcoal-400" />
            <span>Tilt: <strong>{row.tiltAngle}° South</strong></span>
            <span>•</span>
            <span>{row.panelCount} Panels</span>
          </div>
        </div>
      ),
    },
    {
      key: 'team',
      header: 'Assigned Crew & Engineer',
      render: (row) => (
        <div className="flex flex-col text-xs text-charcoal-600">
          <div className="font-medium text-charcoal-800 flex items-center space-x-1">
            <Users className="w-3.5 h-3.5 text-solar-green mr-1" />
            <span>{row.leadTechnicianName || 'Field Team'}</span>
          </div>
          <div className="text-[10px] text-charcoal-400 mt-0.5">{row.assignedTeam}</div>
        </div>
      ),
    },
    {
      key: 'progress',
      header: 'Installation Progress (%)',
      render: (row) => {
        const completedStages = (row.stages || []).filter((s: any) => s.status === 'completed').length;
        return (
          <div className="w-36 flex flex-col space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-charcoal-800">{row.installationProgress}%</span>
              <span className="text-[10px] text-charcoal-500 font-mono">
                {completedStages}/9 Stages
              </span>
            </div>
            <ProgressBar
              progress={row.installationProgress}
              height={6}
              colorVariant={row.installationProgress >= 100 ? 'green' : row.installationProgress >= 50 ? 'solar' : 'auto'}
            />
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        let badgeStatus: any = 'pending';
        let label = 'Pending Start';
        if (row.installationProgress === 100) {
          badgeStatus = 'completed';
          label = 'Commissioned';
        } else if (row.installationProgress > 0) {
          badgeStatus = 'in_progress';
          label = 'In Progress';
        }
        return <StatusBadge status={badgeStatus} customLabel={label} size="sm" />;
      },
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
              setSelectedInstallation(row);
              setIsDrawerOpen(true);
            }}
          >
            <Layers className="w-3.5 h-3.5 mr-1 text-solar-green" />
            9 Stages
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Solar Plant Installation & Field QA Tracking"
        subtitle="Track all 9 EPC engineering stages from MMS delivery and civil grouting to AC/DC stringing, net metering, and safety audit."
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Installation', href: '/installation' },
        ]}
        actions={
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={fetchInstallations} isLoading={isLoading}>
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Refresh
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* KPI Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Total Plant Installations"
            value={analytics.totalInstallations}
            subtitle="Active rooftop EPC tracker"
            accentColor="green"
            icon={<Wrench className="w-6 h-6 text-solar-green" />}
          />
          <KpiCard
            title="In-Progress Mounts"
            value={analytics.inProgressCount}
            subtitle="Under active structural / DC wiring"
            accentColor="solar"
            icon={<Clock className="w-6 h-6 text-solar-amber" />}
          />
          <KpiCard
            title="Fully Commissioned"
            value={analytics.fullyCompleted}
            subtitle="100% 9-stage verified & synchronized"
            accentColor="green"
            icon={<CheckCircle2 className="w-6 h-6 text-emerald-600" />}
          />
          <KpiCard
            title="Portfolio Avg Progress"
            value={`${analytics.avgProgress}%`}
            subtitle="Across all operational sites"
            accentColor="charcoal"
            icon={<Zap className="w-6 h-6 text-blue-600" />}
          />
        </div>

        {/* Clean FilterBar with Quick Status Tabs */}
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search by customer, project ID, district, or engineer..."
          tabs={[
            { value: 'all', label: 'All Installations', count: installations.length },
            {
              value: 'in_progress',
              label: 'In Progress',
              count: analytics.inProgressCount,
            },
            {
              value: 'completed',
              label: 'Completed & Handed Over',
              count: analytics.fullyCompleted,
            },
          ]}
          activeTab={statusFilter}
          onTabChange={setStatusFilter}
          activeFilterCount={statusFilter !== 'all' || searchQuery ? 1 : 0}
          onResetFilters={() => {
            setStatusFilter('all');
            setSearchQuery('');
          }}
          totalCount={filteredInstallations.length}
        />

        {/* Main Table */}
        <div className="bg-white rounded-lg border border-charcoal-200 shadow-sm overflow-hidden">
          <Table
            columns={columns}
            data={paginatedInstallations}
            keyExtractor={(i) => i.id}
            isLoading={isLoading}
            emptyTitle="No projects are currently waiting for installation."
            emptyDescription="Structural mounting and wiring schedules will appear here once materials are dispatched."
          />

          <div className="p-4 border-t border-charcoal-100 flex items-center justify-between">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              totalRecords={filteredInstallations.length}
            />
          </div>
        </div>
      </div>

      {/* DRAWER: 9-STAGE INSTALLATION TRACKER */}
      {selectedInstallation && (
        <Drawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          title={`Installation 360: ${selectedInstallation.projectCode}`}
          width="580px"
        >
          <div className="space-y-6 pb-8 text-xs">
            {/* Plant Header Card */}
            <div className="bg-charcoal-900 text-white p-5 rounded-lg space-y-3 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-solar-amber text-charcoal-900 font-bold uppercase">
                      {selectedInstallation.customerType}
                    </span>
                    <span className="font-mono text-charcoal-300 text-xs">{selectedInstallation.projectCode}</span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">{selectedInstallation.customerName}</h3>
                  <p className="text-xs text-charcoal-400 mt-0.5">{selectedInstallation.district}, {selectedInstallation.state}</p>
                </div>
                <div className="text-right">
                  <span className="text-charcoal-400 text-[10px] block">Capacity</span>
                  <span className="text-lg font-black text-solar-amber">{selectedInstallation.capacityKw} kW</span>
                </div>
              </div>

              {/* Progress */}
              <div className="pt-2 border-t border-charcoal-700/80 space-y-1">
                <div className="flex justify-between text-[11px] text-charcoal-300">
                  <span>9-Stage EPC Execution Progress</span>
                  <span className="font-bold text-solar-amber">{selectedInstallation.installationProgress}% Complete</span>
                </div>
                <div className="w-full bg-charcoal-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-solar-amber h-full transition-all duration-500 rounded-full"
                    style={{ width: `${selectedInstallation.installationProgress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Technical Hardware Specifications Summary Card */}
            <div className="bg-white border border-charcoal-200 rounded-lg p-4 space-y-3">
              <h4 className="font-semibold text-charcoal-900 flex items-center text-xs">
                <Cpu className="w-4 h-4 text-solar-green mr-1.5" />
                Technical Plant Specifications
              </h4>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-charcoal-700">
                <div className="bg-charcoal-50 p-2 rounded">
                  <span className="text-charcoal-400 text-[10px] block">Rooftop Tilt & Azimuth:</span>
                  <span className="font-bold text-charcoal-900">{selectedInstallation.tiltAngle}° True South</span>
                </div>
                <div className="bg-charcoal-50 p-2 rounded">
                  <span className="text-charcoal-400 text-[10px] block">PV Module Array:</span>
                  <span className="font-bold text-charcoal-900">{selectedInstallation.panelCount}x {selectedInstallation.panelModel}</span>
                </div>
                <div className="bg-charcoal-50 p-2 rounded">
                  <span className="text-charcoal-400 text-[10px] block">Solar Inverter:</span>
                  <span className="font-bold text-charcoal-900">{selectedInstallation.inverterModel}</span>
                </div>
                <div className="bg-charcoal-50 p-2 rounded">
                  <span className="text-charcoal-400 text-[10px] block">Mounting Structure:</span>
                  <span className="font-bold text-charcoal-900">{selectedInstallation.structureType}</span>
                </div>
              </div>
            </div>

            {/* 9 Structured Stages Tracker Timeline */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-charcoal-900 text-xs flex items-center">
                  <Layers className="w-4 h-4 text-solar-green mr-1.5" />
                  9 Canonical Installation Stages
                </h4>
                <span className="text-[11px] text-charcoal-500 font-mono">
                  {selectedInstallation.stages?.filter((s: any) => s.status === 'completed').length || 0} / 9 Done
                </span>
              </div>

              <div className="space-y-3">
                {selectedInstallation.stages?.map((stage: InstallationStageItem, idx: number) => {
                  const isCompleted = stage.status === 'completed';
                  const isInProgress = stage.status === 'in_progress';
                  const isDelayed = stage.status === 'delayed';

                  return (
                    <div
                      key={stage.stageKey}
                      className={`p-3.5 rounded-lg border transition-all ${
                        isCompleted
                          ? 'bg-emerald-50/40 border-emerald-200'
                          : isInProgress
                          ? 'bg-amber-50/40 border-amber-200 ring-1 ring-amber-300'
                          : isDelayed
                          ? 'bg-rose-50/40 border-rose-200'
                          : 'bg-white border-charcoal-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5 ${
                              isCompleted
                                ? 'bg-emerald-600 text-white'
                                : isInProgress
                                ? 'bg-solar-amber text-charcoal-900'
                                : 'bg-charcoal-100 text-charcoal-600'
                            }`}
                          >
                            {isCompleted ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h5 className="font-bold text-charcoal-900 text-xs">{stage.stageName}</h5>
                              {isCompleted && (
                                <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.2 rounded">
                                  ✓ Cleared
                                </span>
                              )}
                              {isInProgress && (
                                <span className="bg-amber-100 text-amber-900 text-[9px] font-bold px-1.5 py-0.2 rounded">
                                  Active Stage
                                </span>
                              )}
                            </div>

                            <div className="text-[11px] text-charcoal-500 mt-1 space-y-0.5">
                              <div>
                                Assigned: <strong>{stage.assignedPerson || selectedInstallation.leadTechnicianName}</strong> ({stage.assignedTeam || selectedInstallation.assignedTeam})
                              </div>
                              <div className="flex items-center space-x-2 text-[10px] text-charcoal-400">
                                <span>Planned: {stage.plannedDate || 'Pending'}</span>
                                {stage.actualDate && (
                                  <>
                                    <span>•</span>
                                    <span className="text-emerald-700 font-medium">Completed: {stage.actualDate}</span>
                                  </>
                                )}
                              </div>
                            </div>

                            {stage.remarks && (
                              <p className="text-[11px] text-charcoal-600 mt-1 italic bg-white/70 p-1.5 rounded border border-charcoal-100">
                                {stage.remarks}
                              </p>
                            )}
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenStageUpdate(selectedInstallation, stage)}
                          className="text-[11px] px-2 py-1 flex-shrink-0"
                        >
                          <Edit3 className="w-3 h-3 mr-1" />
                          Update
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Drawer>
      )}

      {/* MODAL: STAGE UPDATE & PHOTO ATTACHMENT */}
      {selectedInstallation && (
        <Modal
          isOpen={isStageModalOpen}
          onClose={() => setIsStageModalOpen(false)}
          title={`Update Installation Stage: ${activeStageKey.replace(/_/g, ' ').toUpperCase()}`}
          maxWidth="md"
        >
          <form onSubmit={handleSubmitStageUpdate} className="space-y-4 text-xs">
            <div className="bg-charcoal-50 p-3 rounded-lg border border-charcoal-200 text-charcoal-700 space-y-1">
              <span className="font-semibold text-charcoal-900 block">Project: {selectedInstallation.projectCode} — {selectedInstallation.customerName}</span>
              <p className="text-[11px] text-charcoal-500">Updating this stage will dynamically re-calculate the total plant installation progress percentage.</p>
            </div>

            {/* Stage Status */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-charcoal-800">
                Stage Execution Status <span className="text-rose-600">*</span>
              </label>
              <select
                value={stageForm.status}
                onChange={(e) => setStageForm({ ...stageForm, status: e.target.value as any })}
                className="w-full text-xs px-3 py-2 bg-white border border-charcoal-300 rounded-md focus:outline-none focus:ring-1 focus:ring-solar-green"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed & Verified</option>
                <option value="delayed">Delayed</option>
                <option value="on_hold">On Hold</option>
              </select>
            </div>

            {/* Planned & Actual Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-charcoal-800">Planned Target Date</label>
                <DatePicker
                  value={stageForm.plannedDate}
                  onChange={(val) => setStageForm({ ...stageForm, plannedDate: val })}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-charcoal-800">Actual Completion Date</label>
                <DatePicker
                  value={stageForm.actualDate}
                  onChange={(val) => setStageForm({ ...stageForm, actualDate: val })}
                />
              </div>
            </div>

            {/* Assigned Person / Team */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-charcoal-800">Assigned Person</label>
                <Input
                  placeholder="e.g. Rahul Sharma"
                  value={stageForm.assignedPerson}
                  onChange={(e) => setStageForm({ ...stageForm, assignedPerson: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-charcoal-800">Assigned Team</label>
                <Input
                  placeholder="e.g. Electrical Crew Alpha"
                  value={stageForm.assignedTeam}
                  onChange={(e) => setStageForm({ ...stageForm, assignedTeam: e.target.value })}
                />
              </div>
            </div>

            {/* Site Photos / Attachment URL */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-charcoal-800">Site Photo / QA Inspection Attachment</label>
              <Input
                placeholder="e.g. /assets/sites/del-001-inverter.jpg or photo upload URL"
                value={stageForm.photoUrl}
                onChange={(e) => setStageForm({ ...stageForm, photoUrl: e.target.value })}
              />
            </div>

            {/* Remarks */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-charcoal-800">QA Remarks & Engineering Notes</label>
              <Input
                placeholder="e.g. Earthing tested < 1.8 Ohms; DC cabling routed through UV-resistant PVC conduits"
                value={stageForm.remarks}
                onChange={(e) => setStageForm({ ...stageForm, remarks: e.target.value })}
              />
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-charcoal-200 flex items-center justify-end space-x-3">
              <Button variant="outline" onClick={() => setIsStageModalOpen(false)} type="button">
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Save Stage Progress
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </AppShell>
  );
}
