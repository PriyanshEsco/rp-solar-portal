'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Drawer } from '@/components/ui/Drawer';
import { Table, Column } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { KpiCard } from '@/components/ui/KpiCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import {
  FileText,
  FileCheck,
  FileX,
  FilePlus,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Download,
  UploadCloud,
  RefreshCw,
  Search,
  Filter,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Edit3,
  Layers,
  MapPin,
  Sun,
  Zap,
  Building2,
  User,
  Plus,
  ChevronDown,
  ChevronRight,
  Printer,
  ExternalLink,
  Info,
} from 'lucide-react';
import { DocumentRecord, DocumentVerificationStatus, RequiredDocumentChecklistItem } from '@/lib/types';

export default function DocumentManagementPage() {
  const { user: currentUser } = useAuth();
  const toast = useToast();

  const [documents, setDocuments] = useState<any[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [compliance, setCompliance] = useState<{
    documentsPending: number;
    documentsUploaded: number;
    documentsVerified: number;
    documentsRejected: number;
    totalRequired: number;
    complianceRate: number;
    projectCompliance: any[];
  }>({
    documentsPending: 0,
    documentsUploaded: 0,
    documentsVerified: 0,
    documentsRejected: 0,
    totalRequired: 0,
    complianceRate: 100,
    projectCompliance: [],
  });
  const [docCatalog, setDocCatalog] = useState<RequiredDocumentChecklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DocumentVerificationStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'all_docs' | 'missing_compliance'>('all_docs');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals & Drawers
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);

  // Upload Form State
  const [uploadForm, setUploadForm] = useState({
    projectId: '',
    docTypeCode: 'electricity_bill',
    fileName: '',
    fileSize: '1.4 MB',
    fileSizeBytes: 1468006,
    fileType: 'application/pdf',
    category: 'utility_bill',
    remarks: '',
  });

  // Replace Form State
  const [replaceForm, setReplaceForm] = useState({
    docId: '',
    fileName: '',
    fileSize: '2.1 MB',
    fileSizeBytes: 2202009,
    fileType: 'application/pdf',
    remarks: '',
  });

  // Verification Decision Form
  const [verifyForm, setVerifyForm] = useState<{
    docId: string;
    decision: 'verified' | 'rejected' | 'under_review';
    reason: string;
  }>({
    docId: '',
    decision: 'verified',
    reason: '',
  });

  // Expanded project compliance checklist in Missing Documents view
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});

  // Fetch Documents
  const fetchDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/documents');
      const data = await res.json();
      if (data.success) {
        setDocuments(data.data || []);
        if (data.compliance) {
          setCompliance(data.compliance);
        }
        if (data.catalog) {
          setDocCatalog(data.catalog);
        }
      } else {
        toast.showToast({
          type: 'error',
          title: 'Failed to load documents',
          message: data.error?.message || 'Unauthorized or server error',
        });
      }
    } catch (err: any) {
      toast.showToast({
        type: 'error',
        title: 'Network Error',
        message: err.message || 'Could not connect to document API',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Fetch Projects for dropdowns
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
    fetchDocuments();
    fetchProjects();
  }, [fetchDocuments, fetchProjects]);

  // Toggle Project accordion in compliance section
  const toggleProjectAccordion = (pId: string) => {
    setExpandedProjects((prev) => ({
      ...prev,
      [pId]: !prev[pId],
    }));
  };

  // Filtered documents
  const filteredDocuments = documents.filter((doc) => {
    if (statusFilter !== 'all' && doc.verificationStatus !== statusFilter) return false;
    if (categoryFilter !== 'all' && doc.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = doc.docTypeName?.toLowerCase().includes(q);
      const matchFile = doc.fileName?.toLowerCase().includes(q);
      const matchCust = doc.customerName?.toLowerCase().includes(q);
      const matchProj = doc.projectCode?.toLowerCase().includes(q);
      const matchUser = doc.uploadedByUserName?.toLowerCase().includes(q);
      if (!matchName && !matchFile && !matchCust && !matchProj && !matchUser) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredDocuments.length / pageSize) || 1;
  const paginatedDocs = filteredDocuments.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Handle Open Upload Modal
  const handleOpenUpload = (presetProjectId?: string, presetDocTypeCode?: string) => {
    const pId = presetProjectId || (projectsList.length > 0 ? projectsList[0].id : '');
    const docType = presetDocTypeCode || 'electricity_bill';
    const catalogItem = docCatalog.find((c) => c.docTypeCode === docType);

    setUploadForm({
      projectId: pId,
      docTypeCode: docType,
      fileName: '',
      fileSize: '1.8 MB',
      fileSizeBytes: 1887436,
      fileType: 'application/pdf',
      category: catalogItem?.category || 'site_docs',
      remarks: '',
    });
    setIsUploadModalOpen(true);
  };

  // Submit Upload
  const handleSubmitUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.projectId) {
      toast.showToast({ type: 'error', title: 'Validation Error', message: 'Please select a Project' });
      return;
    }
    if (!uploadForm.fileName.trim()) {
      toast.showToast({ type: 'error', title: 'Validation Error', message: 'Please enter a File Name' });
      return;
    }

    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(uploadForm),
      });
      const data = await res.json();
      if (data.success) {
        toast.showToast({
          type: 'success',
          title: 'Document Uploaded',
          message: data.message || 'File registered in secure storage vault.',
        });
        setIsUploadModalOpen(false);
        fetchDocuments();
      } else {
        toast.showToast({
          type: 'error',
          title: 'Upload Failed',
          message: data.error?.message || 'Server error',
        });
      }
    } catch (err: any) {
      toast.showToast({
        type: 'error',
        title: 'Error',
        message: err.message || 'Failed to upload document',
      });
    }
  };

  // Submit Replace
  const handleSubmitReplace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replaceForm.docId || !replaceForm.fileName.trim()) {
      toast.showToast({ type: 'error', title: 'Validation Error', message: 'Please enter a replacement file name' });
      return;
    }

    try {
      const res = await fetch(`/api/documents/${replaceForm.docId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'replace',
          fileName: replaceForm.fileName,
          fileSize: replaceForm.fileSize,
          fileSizeBytes: replaceForm.fileSizeBytes,
          remarks: replaceForm.remarks,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.showToast({
          type: 'success',
          title: 'Document Replaced',
          message: data.message || 'New document version saved.',
        });
        setIsReplaceModalOpen(false);
        fetchDocuments();
      } else {
        toast.showToast({
          type: 'error',
          title: 'Replace Failed',
          message: data.error?.message || 'Server error',
        });
      }
    } catch (err: any) {
      toast.showToast({
        type: 'error',
        title: 'Error',
        message: err.message || 'Failed to replace document',
      });
    }
  };

  // Submit Verification Decision
  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyForm.decision === 'rejected' && !verifyForm.reason.trim()) {
      toast.showToast({
        type: 'error',
        title: 'Reason Required',
        message: 'Please provide a clear rejection reason for the field team to correct.',
      });
      return;
    }

    try {
      const res = await fetch(`/api/documents/${verifyForm.docId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: verifyForm.decision,
          reason: verifyForm.reason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.showToast({
          type: 'success',
          title: 'Verification Status Updated',
          message: data.message || `Document marked as ${verifyForm.decision.toUpperCase()}.`,
        });
        setIsVerifyModalOpen(false);
        fetchDocuments();
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
        message: err.message || 'Failed to update verification status',
      });
    }
  };

  // Delete Document
  const handleDeleteDoc = async (doc: any) => {
    if (!confirm(`Are you sure you want to delete '${doc.docTypeName}' (${doc.fileName})?`)) return;

    try {
      const res = await fetch(`/api/documents/${doc.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.showToast({
          type: 'success',
          title: 'Document Deleted',
          message: data.message || 'Document removed from cloud storage.',
        });
        fetchDocuments();
      } else {
        toast.showToast({
          type: 'error',
          title: 'Delete Failed',
          message: data.error?.message || 'Server error',
        });
      }
    } catch (err: any) {
      toast.showToast({
        type: 'error',
        title: 'Error',
        message: err.message || 'Failed to delete document',
      });
    }
  };

  // Trigger Simulated Download
  const handleDownloadDoc = (doc: any) => {
    toast.showToast({
      type: 'info',
      title: 'Downloading Document',
      message: `Fetching '${doc.fileName}' from S3 vault...`,
    });
    window.open(`/api/documents/storage?docId=${doc.id}&download=true`, '_blank');
  };

  // Table Columns
  const columns: Column<any>[] = [
    {
      key: 'document',
      header: 'Document & File',
      render: (row) => (
        <div className="flex items-start space-x-2.5">
          <div className="w-8 h-8 rounded bg-solar-green/10 text-solar-green flex items-center justify-center flex-shrink-0 mt-0.5">
            <FileText className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <span
                className="font-semibold text-charcoal-900 text-xs hover:text-solar-green cursor-pointer"
                onClick={() => {
                  setSelectedDoc(row);
                  setIsPreviewModalOpen(true);
                }}
              >
                {row.docTypeName}
              </span>
              {row.version && row.version > 1 && (
                <span className="bg-charcoal-200 text-charcoal-700 px-1.5 py-0.2 rounded text-[10px] font-mono font-bold">
                  v{row.version}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2 text-[11px] text-charcoal-500 mt-0.5 font-mono">
              <span className="text-charcoal-700 truncate max-w-[180px]">{row.fileName}</span>
              <span>•</span>
              <span>{row.fileSize}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'project',
      header: 'Project & Customer',
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
          <div className="flex items-center space-x-2 text-charcoal-500 text-[11px] mt-0.5">
            <span className="font-mono bg-charcoal-100 px-1 py-0.2 rounded text-[10px]">{row.projectCode}</span>
            <span>•</span>
            <span>{row.district}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'uploadedBy',
      header: 'Uploaded By & Date',
      render: (row) => (
        <div className="flex flex-col text-xs text-charcoal-600">
          <div className="font-medium text-charcoal-800 truncate max-w-[140px]">
            {row.uploadedByUserName || 'System Officer'}
          </div>
          <div className="text-[10px] text-charcoal-400 mt-0.5">
            {new Date(row.uploadedAt).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Verification Status',
      render: (row) => {
        let badgeStatus: any = 'pending';
        let label = 'Uploaded';

        if (row.verificationStatus === 'verified') {
          badgeStatus = 'paid';
          label = 'Verified';
        } else if (row.verificationStatus === 'under_review') {
          badgeStatus = 'partially_paid';
          label = 'Under Review';
        } else if (row.verificationStatus === 'rejected') {
          badgeStatus = 'rejected';
          label = 'Rejected';
        } else if (row.verificationStatus === 'uploaded') {
          badgeStatus = 'draft';
          label = 'Uploaded';
        }

        return (
          <div className="flex flex-col space-y-1">
            <StatusBadge status={badgeStatus} customLabel={label} size="sm" />
            {row.verifiedBy && (
              <span className="text-[10px] text-charcoal-400">
                by {row.verifiedBy}
              </span>
            )}
            {row.rejectionReason && (
              <span className="text-[10px] text-rose-700 font-medium truncate max-w-[130px]" title={row.rejectionReason}>
                ⚠ {row.rejectionReason}
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
        <div className="flex items-center space-x-1.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSelectedDoc(row);
              setIsPreviewModalOpen(true);
            }}
            title="Preview Document"
          >
            <Eye className="w-3.5 h-3.5 text-charcoal-600 hover:text-solar-green" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleDownloadDoc(row)}
            title="Download from Vault"
          >
            <Download className="w-3.5 h-3.5 text-charcoal-600 hover:text-solar-green" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setReplaceForm({
                docId: row.id,
                fileName: '',
                fileSize: '1.9 MB',
                fileSizeBytes: 1992294,
                fileType: row.fileType || 'application/pdf',
                remarks: '',
              });
              setSelectedDoc(row);
              setIsReplaceModalOpen(true);
            }}
            title="Replace / Upload Version"
          >
            <Edit3 className="w-3.5 h-3.5 text-charcoal-600 hover:text-solar-amber" />
          </Button>

          {(currentUser?.userType === 'super_admin' || currentUser?.userType === 'admin') && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setVerifyForm({
                  docId: row.id,
                  decision: 'verified',
                  reason: '',
                });
                setSelectedDoc(row);
                setIsVerifyModalOpen(true);
              }}
              className="text-[11px] px-2 py-0.5"
            >
              Verify
            </Button>
          )}

          {(currentUser?.userType === 'super_admin' || currentUser?.userType === 'admin') && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleDeleteDoc(row)}
              title="Delete Document"
              className="text-rose-600 hover:bg-rose-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Document Management & Statutory Vault"
        subtitle="Secure encrypted cloud storage for customer KYC, site survey reports, AutoCAD single-line diagrams, DISCOM NOCs, and subsidy compliance."
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Documents', href: '/documents' },
        ]}
        actions={
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={fetchDocuments} isLoading={isLoading}>
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Refresh
            </Button>
            <Button variant="primary" onClick={() => handleOpenUpload()}>
              <Plus className="w-4 h-4 mr-1.5" />
              Upload Document
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* KPI Compliance Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Documents Pending"
            value={compliance.documentsPending}
            subtitle="Statutory items required for stages"
            accentColor="solar"
            icon={<Clock className="w-6 h-6 text-amber-600" />}
          />
          <KpiCard
            title="Documents Uploaded"
            value={compliance.documentsUploaded}
            subtitle="Under review / awaiting verification"
            accentColor="charcoal"
            icon={<UploadCloud className="w-6 h-6 text-blue-600" />}
          />
          <KpiCard
            title="Documents Verified"
            value={compliance.documentsVerified}
            subtitle="Audited & approved compliance records"
            accentColor="green"
            icon={<FileCheck className="w-6 h-6 text-solar-green" />}
          />
          <KpiCard
            title="Documents Rejected"
            value={compliance.documentsRejected}
            subtitle="Requires correction & replacement"
            accentColor="solar"
            icon={<FileX className="w-6 h-6 text-rose-600" />}
          />
        </div>

        {/* View Switcher: All Documents vs Missing Documents Compliance Section */}
        <div className="flex items-center justify-between border-b border-charcoal-200 pb-3">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setViewMode('all_docs')}
              className={`text-sm font-semibold pb-2 border-b-2 transition-colors flex items-center space-x-2 ${
                viewMode === 'all_docs'
                  ? 'border-solar-green text-solar-green'
                  : 'border-transparent text-charcoal-500 hover:text-charcoal-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>All Documents ({documents.length})</span>
            </button>
            <button
              onClick={() => setViewMode('missing_compliance')}
              className={`text-sm font-semibold pb-2 border-b-2 transition-colors flex items-center space-x-2 ${
                viewMode === 'missing_compliance'
                  ? 'border-solar-green text-solar-green'
                  : 'border-transparent text-charcoal-500 hover:text-charcoal-800'
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>
                Missing Documents & Compliance Checklist ({compliance.documentsPending} Pending)
              </span>
            </button>
          </div>

          <span className="text-xs font-medium text-charcoal-500 hidden md:block">
            Vault Compliance: <strong className="text-solar-green">{compliance.complianceRate}% Verified</strong>
          </span>
        </div>

        {/* VIEW 1: MISSING DOCUMENTS & PROJECT COMPLIANCE CHECKLIST */}
        {viewMode === 'missing_compliance' && (
          <div className="space-y-4">
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-lg p-4 text-xs flex items-center justify-between text-charcoal-800">
              <div className="flex items-center space-x-2.5">
                <ShieldCheck className="w-5 h-5 text-solar-green flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-charcoal-900 text-sm">Solar EPC Statutory Compliance Checklist</h4>
                  <p className="text-charcoal-600 mt-0.5">
                    Projects must satisfy mandatory statutory documents before advancing stages to Grid Synchronization and Subsidy Redemption.
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-charcoal-500 block">Overall Portfolio Compliance</span>
                <span className="font-bold text-solar-green text-sm">{compliance.complianceRate}%</span>
              </div>
            </div>

            {/* Project Compliance Breakdown Cards */}
            <div className="space-y-3">
              {compliance.projectCompliance.map((projComp) => {
                const isExpanded = !!expandedProjects[projComp.projectId];
                return (
                  <div
                    key={projComp.projectId}
                    className="bg-white rounded-lg border border-charcoal-200 shadow-xs overflow-hidden transition-all"
                  >
                    <div
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-charcoal-50/50"
                      onClick={() => toggleProjectAccordion(projComp.projectId)}
                    >
                      <div className="flex items-center space-x-3">
                        <button className="text-charcoal-400 hover:text-charcoal-700">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-charcoal-900 text-sm">{projComp.customerName}</span>
                            <span className="font-mono bg-charcoal-100 text-charcoal-700 text-xs px-1.5 py-0.2 rounded">
                              {projComp.projectCode}
                            </span>
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              projComp.isB2B ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {projComp.isB2B ? 'B2B Commercial' : 'B2C Residential'}
                            </span>
                          </div>
                          <div className="text-xs text-charcoal-500 mt-0.5">
                            {projComp.projectName} • {projComp.verifiedCount} of {projComp.totalRequired} Mandatory Documents Verified
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="w-36 text-right hidden sm:block">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-charcoal-500 text-[11px]">Compliance</span>
                            <span className="font-bold text-charcoal-800">{projComp.complianceRate}%</span>
                          </div>
                          <ProgressBar
                            progress={projComp.complianceRate}
                            height={6}
                            colorVariant={projComp.complianceRate >= 100 ? 'green' : projComp.complianceRate >= 50 ? 'solar' : 'auto'}
                          />
                        </div>

                        {projComp.missingCount > 0 ? (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            {projComp.missingCount} Pending / Missing
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ✓ 100% Compliant
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Accordion Content: Document Checklist Table */}
                    {isExpanded && (
                      <div className="p-4 bg-charcoal-50/50 border-t border-charcoal-100">
                        <div className="space-y-2">
                          {projComp.checklist.map((item: any) => {
                            const isVerified = item.status === 'verified';
                            const isUploaded = item.status === 'uploaded' || item.status === 'under_review';
                            const isRejected = item.status === 'rejected';
                            const isMissing = item.status === 'required';

                            return (
                              <div
                                key={item.docTypeCode}
                                className={`p-3 rounded-lg border flex items-center justify-between text-xs transition-colors ${
                                  isVerified
                                    ? 'bg-emerald-50/40 border-emerald-200'
                                    : isRejected
                                    ? 'bg-rose-50/40 border-rose-200'
                                    : isUploaded
                                    ? 'bg-blue-50/40 border-blue-200'
                                    : 'bg-white border-charcoal-200'
                                }`}
                              >
                                <div className="flex items-start space-x-3">
                                  <div
                                    className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5 ${
                                      isVerified
                                        ? 'bg-emerald-600 text-white'
                                        : isRejected
                                        ? 'bg-rose-600 text-white'
                                        : isUploaded
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-charcoal-200 text-charcoal-600'
                                    }`}
                                  >
                                    {isVerified ? '✓' : isRejected ? '✕' : isUploaded ? '⏱' : '!'}
                                  </div>
                                  <div>
                                    <div className="flex items-center space-x-2">
                                      <span className="font-semibold text-charcoal-900 text-xs">
                                        {item.docTypeName}
                                      </span>
                                      {item.isMandatory && (
                                        <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-1 py-0.2 rounded">
                                          Mandatory
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-charcoal-500 mt-0.5">{item.description}</p>
                                    {item.document && (
                                      <div className="text-[11px] text-charcoal-600 font-mono mt-1">
                                        File: <strong className="text-charcoal-800">{item.document.fileName}</strong> ({item.document.fileSize})
                                        {item.document.rejectionReason && (
                                          <span className="text-rose-700 font-sans block mt-0.5">
                                            Rejection Reason: {item.document.rejectionReason}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center space-x-2 flex-shrink-0">
                                  {isVerified && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                      ✓ Verified
                                    </span>
                                  )}
                                  {isUploaded && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800">
                                      Under Review
                                    </span>
                                  )}
                                  {isRejected && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800">
                                      Rejected
                                    </span>
                                  )}
                                  {isMissing && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900">
                                      Missing / Pending
                                    </span>
                                  )}

                                  {(isMissing || isRejected) && (
                                    <Button
                                      size="sm"
                                      variant="primary"
                                      onClick={() => handleOpenUpload(projComp.projectId, item.docTypeCode)}
                                      className="text-xs px-2.5 py-1"
                                    >
                                      <UploadCloud className="w-3.5 h-3.5 mr-1" />
                                      Upload Now
                                    </Button>
                                  )}

                                  {item.document && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedDoc(item.document);
                                        setIsPreviewModalOpen(true);
                                      }}
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 2: ALL DOCUMENTS TABLE VIEW */}
        {viewMode === 'all_docs' && (
          <>
            {/* Filter Bar */}
            <div className="bg-white rounded-lg border border-charcoal-200 shadow-sm p-4 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                {/* Status Pills */}
                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0">
                  {[
                    { key: 'all', label: 'All Vault Files', count: documents.length },
                    {
                      key: 'verified',
                      label: 'Verified',
                      count: documents.filter((d) => d.verificationStatus === 'verified').length,
                    },
                    {
                      key: 'under_review',
                      label: 'Under Review',
                      count: documents.filter((d) => d.verificationStatus === 'under_review').length,
                    },
                    {
                      key: 'uploaded',
                      label: 'Uploaded',
                      count: documents.filter((d) => d.verificationStatus === 'uploaded').length,
                    },
                    {
                      key: 'rejected',
                      label: 'Rejected',
                      count: documents.filter((d) => d.verificationStatus === 'rejected').length,
                    },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setStatusFilter(tab.key as any)}
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

                {/* Category Dropdown Filter */}
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium text-charcoal-600">Category:</span>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="text-xs px-2.5 py-1.5 bg-white border border-charcoal-200 rounded-md focus:outline-none focus:ring-1 focus:ring-solar-green"
                  >
                    <option value="all">All Categories</option>
                    <option value="identity">Identity & KYC</option>
                    <option value="utility_bill">Electricity & Utility Bills</option>
                    <option value="technical_sld">Technical SLD & Layouts</option>
                    <option value="site_docs">Site Surveys & DISCOM NOCs</option>
                    <option value="agreement">EPC Agreements & Work Orders</option>
                    <option value="commissioning">Plant Commissioning</option>
                    <option value="warranty">Warranties & Guarantees</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-3 border-t border-charcoal-100">
                <div className="relative w-full md:w-96">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400" />
                  <input
                    type="text"
                    placeholder="Search by doc type, file name, customer, project code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-charcoal-50 border border-charcoal-200 rounded-md focus:outline-none focus:ring-1 focus:ring-solar-green focus:border-solar-green"
                  />
                </div>

                <div className="flex items-center space-x-3 text-xs text-charcoal-500 w-full md:w-auto justify-between md:justify-end">
                  <span>
                    Showing <strong className="text-charcoal-800">{filteredDocuments.length}</strong> statutory documents
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => { setSearchQuery(''); setStatusFilter('all'); setCategoryFilter('all'); }}>
                    Clear Filters
                  </Button>
                </div>
              </div>
            </div>

            {/* Documents Table */}
            <div className="bg-white rounded-lg border border-charcoal-200 shadow-sm overflow-hidden">
              <Table
                columns={columns}
                data={paginatedDocs}
                keyExtractor={(doc) => doc.id}
                isLoading={isLoading}
                emptyTitle="No documents found in vault."
                emptyDescription="Upload statutory electricity bills, Aadhaar cards, or site layouts to initiate verification."
              />

              <div className="p-4 border-t border-charcoal-100 flex items-center justify-between">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  pageSize={pageSize}
                  onPageSizeChange={setPageSize}
                  totalRecords={filteredDocuments.length}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* MODAL 1: UPLOAD DOCUMENT */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload Statutory Document to Vault"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmitUpload} className="space-y-4">
          <div className="bg-charcoal-50 p-3 rounded-lg border border-charcoal-200 text-xs flex items-center space-x-2 text-charcoal-700">
            <Info className="w-4 h-4 text-solar-green flex-shrink-0" />
            <span>
              All documents are stored in secure cloud object storage (S3 Vault) with automatic encryption and SHA-256 integrity checks.
            </span>
          </div>

          {/* Project Selection */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-charcoal-800">
              Select Solar Project / Customer <span className="text-rose-600">*</span>
            </label>
            <select
              value={uploadForm.projectId}
              onChange={(e) => setUploadForm({ ...uploadForm, projectId: e.target.value })}
              className="w-full text-xs px-3 py-2 bg-white border border-charcoal-300 rounded-md focus:outline-none focus:ring-1 focus:ring-solar-green focus:border-solar-green"
              required
            >
              <option value="">-- Choose Project --</option>
              {projectsList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.projectCode} — {p.projectName || p.customerName || 'Solar Plant'} ({p.capacityKw || 5} kW)
                </option>
              ))}
            </select>
          </div>

          {/* Document Type Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-charcoal-800">
                Document Type <span className="text-rose-600">*</span>
              </label>
              <select
                value={uploadForm.docTypeCode}
                onChange={(e) => {
                  const val = e.target.value;
                  const cat = docCatalog.find((c) => c.docTypeCode === val);
                  setUploadForm({
                    ...uploadForm,
                    docTypeCode: val,
                    category: cat?.category || 'site_docs',
                  });
                }}
                className="w-full text-xs px-3 py-2 bg-white border border-charcoal-300 rounded-md focus:outline-none focus:ring-1 focus:ring-solar-green focus:border-solar-green"
              >
                {docCatalog.map((cat) => (
                  <option key={cat.docTypeCode} value={cat.docTypeCode}>
                    {cat.docTypeName} {cat.isMandatory ? '(Mandatory)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-charcoal-800">
                Category
              </label>
              <Input
                value={uploadForm.category}
                onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                placeholder="Category"
              />
            </div>
          </div>

          {/* Simulated File Selection */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-charcoal-800">
              File Name / Upload Asset <span className="text-rose-600">*</span>
            </label>
            <div className="border-2 border-dashed border-charcoal-300 rounded-lg p-5 text-center hover:border-solar-green transition-colors bg-charcoal-50/50">
              <UploadCloud className="w-8 h-8 text-charcoal-400 mx-auto mb-2" />
              <p className="text-xs text-charcoal-700 font-medium">Drag and drop file here, or specify file name below</p>
              <p className="text-[11px] text-charcoal-400 mt-0.5">Supports PDF, DWG, PNG, JPG up to 25 MB</p>

              <div className="mt-3 max-w-sm mx-auto">
                <Input
                  placeholder="e.g. anil_gupta_bses_bill_mar2026.pdf"
                  value={uploadForm.fileName}
                  onChange={(e) => setUploadForm({ ...uploadForm, fileName: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-charcoal-800">Remarks / Engineer Notes</label>
            <Input
              placeholder="e.g. Verified with DISCOM meter sanction portal"
              value={uploadForm.remarks}
              onChange={(e) => setUploadForm({ ...uploadForm, remarks: e.target.value })}
            />
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-charcoal-200 flex items-center justify-end space-x-3">
            <Button variant="outline" onClick={() => setIsUploadModalOpen(false)} type="button">
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              <UploadCloud className="w-4 h-4 mr-1.5" />
              Upload & Secure in Vault
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: REPLACE DOCUMENT VERSION */}
      {selectedDoc && (
        <Modal
          isOpen={isReplaceModalOpen}
          onClose={() => setIsReplaceModalOpen(false)}
          title={`Replace Document Version: ${selectedDoc.docTypeName}`}
          maxWidth="md"
        >
          <form onSubmit={handleSubmitReplace} className="space-y-4">
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="font-bold">Updating to Version {(selectedDoc.version || 1) + 1}</div>
              <p className="text-[11px] text-amber-800">
                Replacing this document will archive the current version ({selectedDoc.fileName}) and reset verification status to &quot;Uploaded&quot; for review.
              </p>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-charcoal-800">
                New Replacement File Name <span className="text-rose-600">*</span>
              </label>
              <Input
                placeholder={`e.g. ${selectedDoc.fileName.replace('.pdf', '')}_v2.pdf`}
                value={replaceForm.fileName}
                onChange={(e) => setReplaceForm({ ...replaceForm, fileName: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-charcoal-800">Reason for Replacement / Remarks</label>
              <Input
                placeholder="e.g. Replaced expired property tax receipt with FY 2025-26 receipt"
                value={replaceForm.remarks}
                onChange={(e) => setReplaceForm({ ...replaceForm, remarks: e.target.value })}
              />
            </div>

            <div className="pt-4 border-t border-charcoal-200 flex items-center justify-end space-x-3">
              <Button variant="outline" onClick={() => setIsReplaceModalOpen(false)} type="button">
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                <Edit3 className="w-4 h-4 mr-1.5" />
                Upload New Version
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 3: INTERACTIVE DOCUMENT PREVIEW */}
      {selectedDoc && (
        <Modal
          isOpen={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
          title={`Document Vault Viewer: ${selectedDoc.docTypeName}`}
          maxWidth="xl"
        >
          <div className="space-y-4">
            {/* Header Metadata Bar */}
            <div className="bg-charcoal-900 text-white p-4 rounded-lg flex items-start justify-between text-xs">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-solar-amber">{selectedDoc.projectCode}</span>
                  <span>•</span>
                  <span>{selectedDoc.customerName}</span>
                </div>
                <div className="text-base font-bold text-white mt-1">{selectedDoc.docTypeName}</div>
                <div className="text-charcoal-400 font-mono text-[11px] mt-0.5">
                  File: {selectedDoc.fileName} ({selectedDoc.fileSize}) • Version {selectedDoc.version || 1}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-charcoal-400 uppercase tracking-wider block">Storage Vault Key</span>
                <span className="font-mono text-emerald-400 text-[11px] block">{selectedDoc.storageKey}</span>
              </div>
            </div>

            {/* High-Fidelity Simulated Document Preview Viewer */}
            <div className="border border-charcoal-300 rounded-lg p-6 bg-white min-h-[380px] flex flex-col justify-between relative shadow-inner">
              {/* Document Watermark Stamp */}
              <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none select-none">
                <span className="text-7xl font-black text-charcoal-900 uppercase transform -rotate-12">
                  R P SOLAR VAULT
                </span>
              </div>

              {/* Top Document Header */}
              <div className="flex items-center justify-between border-b border-charcoal-200 pb-3 relative z-10">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded bg-solar-green text-white font-bold flex items-center justify-center text-xs">
                    RP
                  </div>
                  <div>
                    <h3 className="font-bold text-charcoal-900 text-xs">R P SOLAR PVT. LTD.</h3>
                    <p className="text-[10px] text-charcoal-500">Secure Document Management & Audit System</p>
                  </div>
                </div>

                <div className="text-right">
                  {selectedDoc.verificationStatus === 'verified' ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      ✓ AUDITED & VERIFIED
                    </span>
                  ) : selectedDoc.verificationStatus === 'rejected' ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                      ✕ REJECTED
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
                      ⏱ UNDER AUDIT REVIEW
                    </span>
                  )}
                </div>
              </div>

              {/* Simulated Document Body Content */}
              <div className="py-6 space-y-4 relative z-10 text-xs text-charcoal-700">
                <div className="grid grid-cols-2 gap-4 bg-charcoal-50 p-4 rounded border border-charcoal-200">
                  <div>
                    <span className="text-charcoal-400 text-[10px] block">Customer Entity:</span>
                    <span className="font-bold text-charcoal-900 text-sm">{selectedDoc.customerName}</span>
                    <span className="text-charcoal-500 text-[11px] block">{selectedDoc.district}, {selectedDoc.state}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-charcoal-400 text-[10px] block">Project System Capacity:</span>
                    <span className="font-bold text-charcoal-900 text-sm">{selectedDoc.solarCapacityKw} kW Rooftop Solar</span>
                  </div>
                </div>

                <div className="space-y-2 border border-charcoal-200 rounded p-4">
                  <h4 className="font-bold text-charcoal-900 text-xs flex items-center">
                    <ShieldCheck className="w-4 h-4 text-solar-green mr-1.5" />
                    Security & Verification Audit Trail
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-charcoal-400 block">Uploaded By:</span>
                      <span className="font-semibold text-charcoal-800">{selectedDoc.uploadedByUserName} ({selectedDoc.uploadedByUserRole})</span>
                    </div>
                    <div>
                      <span className="text-charcoal-400 block">Upload Date:</span>
                      <span className="font-semibold text-charcoal-800">{new Date(selectedDoc.uploadedAt).toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="text-charcoal-400 block">Verified By:</span>
                      <span className="font-semibold text-charcoal-800">{selectedDoc.verifiedBy || 'Pending Admin Review'}</span>
                    </div>
                    <div>
                      <span className="text-charcoal-400 block">SHA-256 Checksum:</span>
                      <span className="font-mono text-charcoal-600 text-[10px]">e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b...</span>
                    </div>
                  </div>
                </div>

                {selectedDoc.remarks && (
                  <div className="bg-emerald-50/50 p-3 rounded border border-emerald-100 text-[11px]">
                    <strong className="text-emerald-900">Remarks:</strong> {selectedDoc.remarks}
                  </div>
                )}

                {selectedDoc.rejectionReason && (
                  <div className="bg-rose-50 p-3 rounded border border-rose-200 text-[11px] text-rose-800">
                    <strong className="text-rose-900">Rejection Notice:</strong> {selectedDoc.rejectionReason}
                  </div>
                )}
              </div>

              {/* Bottom Viewer Actions */}
              <div className="flex items-center justify-between border-t border-charcoal-200 pt-3 relative z-10">
                <div className="text-[11px] text-charcoal-400 font-mono">
                  AES-256 Cloud Encrypted Storage Vault
                </div>
                <div className="flex items-center space-x-2">
                  <Button size="sm" variant="outline" onClick={() => handleDownloadDoc(selectedDoc)}>
                    <Download className="w-3.5 h-3.5 mr-1" />
                    Download File
                  </Button>
                  <Button size="sm" variant="primary" onClick={() => window.print()}>
                    <Printer className="w-3.5 h-3.5 mr-1" />
                    Print Vault Record
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 4: VERIFY / REJECT AUDIT DECISION */}
      {selectedDoc && (
        <Modal
          isOpen={isVerifyModalOpen}
          onClose={() => setIsVerifyModalOpen(false)}
          title={`Audit Verification: ${selectedDoc.docTypeName}`}
          maxWidth="md"
        >
          <form onSubmit={handleSubmitVerification} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-charcoal-800">
                Verification Decision <span className="text-rose-600">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setVerifyForm({ ...verifyForm, decision: 'verified' })}
                  className={`p-3 rounded-lg border text-left flex items-center space-x-2 transition-all ${
                    verifyForm.decision === 'verified'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-1 ring-emerald-500'
                      : 'bg-white border-charcoal-200 text-charcoal-700'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <div>
                    <div className="font-bold text-xs">Approve & Verify</div>
                    <div className="text-[10px] text-emerald-700">Meets statutory EPC criteria</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setVerifyForm({ ...verifyForm, decision: 'rejected' })}
                  className={`p-3 rounded-lg border text-left flex items-center space-x-2 transition-all ${
                    verifyForm.decision === 'rejected'
                      ? 'bg-rose-50 border-rose-500 text-rose-900 ring-1 ring-rose-500'
                      : 'bg-white border-charcoal-200 text-charcoal-700'
                  }`}
                >
                  <XCircle className="w-5 h-5 text-rose-600" />
                  <div>
                    <div className="font-bold text-xs">Reject Document</div>
                    <div className="text-[10px] text-rose-700">Requires correction/re-upload</div>
                  </div>
                </button>
              </div>
            </div>

            {verifyForm.decision === 'rejected' && (
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-rose-800">
                  Rejection Reason / Guidance for Field Team <span className="text-rose-600">*</span>
                </label>
                <Input
                  placeholder="e.g. Document is expired / illegible / wrong consumer number"
                  value={verifyForm.reason}
                  onChange={(e) => setVerifyForm({ ...verifyForm, reason: e.target.value })}
                  required
                />
              </div>
            )}

            <div className="pt-4 border-t border-charcoal-200 flex items-center justify-end space-x-3">
              <Button variant="outline" onClick={() => setIsVerifyModalOpen(false)} type="button">
                Cancel
              </Button>
              <Button
                variant={verifyForm.decision === 'rejected' ? 'danger' : 'primary'}
                type="submit"
              >
                {verifyForm.decision === 'verified' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    Confirm Verification
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-1.5" />
                    Submit Rejection
                  </>
                )}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </AppShell>
  );
}
