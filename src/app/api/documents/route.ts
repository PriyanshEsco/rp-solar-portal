import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/auth/server-guard';
import { db, DatabaseStore, appCache } from '@/lib/db';
import { getAdminManagedCustomerIds } from '@/lib/auth/rbac';
import { recordAuditLog } from '@/lib/audit';
import { DocumentRecord, DocumentVerificationStatus } from '@/lib/types';

// GET /api/documents - List documents with RBAC scope, filters, and missing documents compliance analytics
export async function GET(req: NextRequest) {
  const guard = await guardApiRequest(req, 'documents', 'read');
  if (!guard.authorized || !guard.session) {
    return guard.response!;
  }

  const { userType, profileId } = guard.session;
  const url = new URL(req.url);
  const statusFilter = url.searchParams.get('status');
  const categoryFilter = url.searchParams.get('category');
  const projectIdFilter = url.searchParams.get('projectId');
  const searchFilter = url.searchParams.get('search')?.toLowerCase();
  const pageParam = url.searchParams.get('page');
  const limitParam = url.searchParams.get('limit') || url.searchParams.get('pageSize');
  const sortBy = url.searchParams.get('sortBy') || 'uploadedAt';
  const sortOrder = url.searchParams.get('sortOrder') || 'desc';

  let accessibleDocs: DocumentRecord[] = [];

  if (userType === 'super_admin') {
    accessibleDocs = Array.from(db.documents.values());
  } else if (userType === 'admin') {
    const managedCustIds = new Set(getAdminManagedCustomerIds(profileId));
    accessibleDocs = Array.from(db.documents.values()).filter((d) => managedCustIds.has(d.customerId));
  } else if (userType === 'employee') {
    accessibleDocs = Array.from(db.documents.values()).filter(
      (d) => db.customers.get(d.customerId)?.assignedEmployeeId === profileId
    );
  } else if (userType === 'customer') {
    accessibleDocs = db.getDocumentsForCustomer(profileId);
    if (accessibleDocs.length === 0) {
      accessibleDocs = Array.from(db.documents.values()).filter((d) => d.customerId === profileId);
    }
  }

  // Enrich with Customer & Project metadata
  let enriched = accessibleDocs.map((doc) => {
    const cust = db.customers.get(doc.customerId);
    const proj = db.projects.get(doc.projectId);
    const org = proj?.b2bOrganizationId
      ? db.organizations.get(proj.b2bOrganizationId)
      : cust?.b2bOrganizationId
      ? db.organizations.get(cust.b2bOrganizationId)
      : null;
    const isB2B = !!org || cust?.customerType === 'commercial' || cust?.customerType === 'industrial';

    return {
      ...doc,
      projectCode: proj?.projectCode || 'RPS-PROJ',
      projectName: proj?.projectName || `${cust?.firstName} ${cust?.lastName} Solar`,
      customerName: isB2B
        ? org?.orgName || `${cust?.firstName} ${cust?.lastName}`
        : `${cust?.firstName} ${cust?.lastName}`.trim(),
      customerType: isB2B ? 'B2B' : 'B2C',
      isB2B,
      district: cust?.district || 'Central District',
      state: cust?.state || 'Delhi',
      solarCapacityKw: proj?.capacityKw || cust?.proposedCapacityKw || 5.0,
    };
  });

  // Calculate Missing Documents & Compliance Metrics
  let accessibleProjects: any[] = [];
  if (userType === 'super_admin') {
    accessibleProjects = Array.from(db.projects.values());
  } else if (userType === 'admin') {
    const managedCustIds = new Set(getAdminManagedCustomerIds(profileId));
    accessibleProjects = Array.from(db.projects.values()).filter((p) => managedCustIds.has(p.customerId));
  } else if (userType === 'employee') {
    accessibleProjects = Array.from(db.projects.values()).filter(
      (p) => db.customers.get(p.customerId)?.assignedEmployeeId === profileId
    );
  } else if (userType === 'customer') {
    accessibleProjects = Array.from(db.projects.values()).filter((p) => p.customerId === profileId);
  }

  const projectComplianceList = accessibleProjects
    .map((p) => db.getProjectCompliance(p.id))
    .filter(Boolean);

  const totalDocumentsRequired = projectComplianceList.reduce((acc, p) => acc + (p?.totalRequired || 0), 0);
  const totalDocumentsVerified = enriched.filter((d) => d.verificationStatus === 'verified').length;
  const totalDocumentsUploaded = enriched.filter(
    (d) => d.verificationStatus === 'uploaded' || d.verificationStatus === 'under_review'
  ).length;
  const totalDocumentsRejected = enriched.filter((d) => d.verificationStatus === 'rejected').length;
  const totalDocumentsPending = Math.max(0, totalDocumentsRequired - totalDocumentsVerified);
  const overallComplianceRate =
    totalDocumentsRequired > 0 ? Math.min(100, Math.round((totalDocumentsVerified / totalDocumentsRequired) * 100)) : 100;

  // Apply filters
  if (statusFilter && statusFilter !== 'all') {
    enriched = enriched.filter((d) => d.verificationStatus === statusFilter);
  }
  if (categoryFilter && categoryFilter !== 'all') {
    enriched = enriched.filter((d) => d.category === categoryFilter);
  }
  if (projectIdFilter && projectIdFilter !== 'all') {
    enriched = enriched.filter((d) => d.projectId === projectIdFilter);
  }
  if (searchFilter) {
    enriched = enriched.filter(
      (d) =>
        d.docTypeName.toLowerCase().includes(searchFilter) ||
        d.fileName.toLowerCase().includes(searchFilter) ||
        d.customerName?.toLowerCase().includes(searchFilter) ||
        d.projectCode?.toLowerCase().includes(searchFilter) ||
        d.uploadedByUserName?.toLowerCase().includes(searchFilter)
    );
  }

  // Sorting
  enriched.sort((a, b) => {
    let comp = 0;
    if (sortBy === 'docTypeName') comp = a.docTypeName.localeCompare(b.docTypeName);
    else if (sortBy === 'fileName') comp = a.fileName.localeCompare(b.fileName);
    else if (sortBy === 'verificationStatus') comp = a.verificationStatus.localeCompare(b.verificationStatus);
    else comp = new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime();
    return sortOrder === 'asc' ? comp : -comp;
  });

  // Server-side Pagination
  const total = enriched.length;
  const page = Math.max(1, parseInt(pageParam || '1', 10));
  const limit = limitParam === 'all' ? total : Math.max(1, parseInt(limitParam || '50', 10));
  const totalPages = Math.ceil(total / limit) || 1;
  const paginatedData = limitParam === 'all' ? enriched : enriched.slice((page - 1) * limit, page * limit);

  return NextResponse.json({
    success: true,
    data: paginatedData,
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
    compliance: {
      documentsPending: totalDocumentsPending,
      documentsUploaded: totalDocumentsUploaded,
      documentsVerified: totalDocumentsVerified,
      documentsRejected: totalDocumentsRejected,
      totalRequired: totalDocumentsRequired,
      complianceRate: overallComplianceRate,
      projectCompliance: projectComplianceList,
    },
    catalog: DatabaseStore.STANDARD_DOCUMENT_CATALOG,
    meta: {
      count: paginatedData.length,
      total,
      scope: userType,
    },
  });
}

// POST /api/documents - Upload and securely register a customer/project document
export async function POST(req: NextRequest) {
  const guard = await guardApiRequest(req, 'documents', 'create');
  if (!guard.authorized || !guard.session) {
    return guard.response!;
  }

  try {
    const body = await req.json();
    const {
      projectId,
      docTypeCode = 'site_survey',
      docTypeName,
      fileName,
      fileType = 'application/pdf',
      fileSize = '1.5 MB',
      fileSizeBytes = 1572864,
      category,
      remarks,
    } = body;

    if (!projectId || !fileName) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Project ID and File Name are required' } },
        { status: 400 }
      );
    }

    const actor = {
      userId: guard.session.userId,
      name: guard.session.username || guard.session.email.split('@')[0],
      role: guard.session.userType,
    };

    const result = db.uploadDocument({
      projectId,
      docTypeCode,
      docTypeName,
      fileName,
      fileType,
      fileSize,
      fileSizeBytes: Number(fileSizeBytes),
      category,
      remarks,
      actor,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: 'UPLOAD_FAILED', message: result.error } },
        { status: 400 }
      );
    }

    // Invalidate dashboard and document cache tags
    if (result.document) {
      db.indexDocument(result.document);
    }
    appCache.invalidateTags('dashboard', 'documents');

    recordAuditLog({
      actorUserId: guard.session.userId,
      actorEmail: guard.session.email,
      actorUserType: guard.session.userType,
      action: 'DOCUMENT_UPLOADED',
      entityTable: 'documents',
      entityId: result.document!.id,
      details: `Uploaded document '${result.document!.docTypeName}' (${fileName}) for Project ${projectId}. Storage Key: ${result.document!.storageKey}`,
      status: 'SUCCESS',
    });

    return NextResponse.json({
      success: true,
      message: `Document '${result.document!.docTypeName}' successfully uploaded to secure storage.`,
      data: result.document,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: err.message || 'Failed to upload document' } },
      { status: 500 }
    );
  }
}

