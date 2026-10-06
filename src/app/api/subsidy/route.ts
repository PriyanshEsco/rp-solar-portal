import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/auth/server-guard';
import { db } from '@/lib/db';
import { getAdminManagedCustomerIds } from '@/lib/auth/rbac';
import { recordAuditLog } from '@/lib/audit';
import { SubsidyRecord } from '@/lib/types';

// GET /api/subsidy - List all subsidies with decoupled status, analytics, and RBAC scoping
export async function GET(req: NextRequest) {
  const guard = await guardApiRequest(req, 'subsidy', 'read');
  if (!guard.authorized || !guard.session) {
    return guard.response!;
  }

  const { userType, profileId } = guard.session;
  const url = new URL(req.url);
  const statusFilter = url.searchParams.get('status');
  const searchFilter = url.searchParams.get('search')?.toLowerCase();

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

  // Ensure each project has its subsidy tracker initialized
  const enriched = accessibleProjects.map((proj) => {
    const sub = db.getOrCreateSubsidy(proj.id);
    const cust = db.customers.get(proj.customerId);
    const org = proj.b2bOrganizationId
      ? db.organizations.get(proj.b2bOrganizationId)
      : cust?.b2bOrganizationId
      ? db.organizations.get(cust.b2bOrganizationId)
      : null;
    const isB2B = !!org || cust?.customerType === 'commercial' || cust?.customerType === 'industrial';

    return {
      id: sub.id,
      projectId: proj.id,
      projectCode: proj.projectCode,
      projectName: proj.projectName,
      customerId: proj.customerId,
      customerName: isB2B ? (org?.orgName || `${cust?.firstName} ${cust?.lastName}`) : `${cust?.firstName} ${cust?.lastName}`.trim(),
      customerType: isB2B ? 'B2B' : 'B2C',
      isB2B,
      district: cust?.district || 'Delhi NCR',
      state: cust?.state || 'Delhi',
      solarCapacityKw: sub.solarCapacityKw || proj.capacityKw || 5.0,
      subsidyApplicable: sub.subsidyApplicable,
      schemeName: sub.schemeName,
      applicationNumber: sub.applicationNumber || 'Not Generated',
      applicationDate: sub.applicationDate || '',
      subsidyAmount: sub.subsidyAmount,
      inspectionStatus: sub.inspectionStatus,
      subsidyStatus: sub.subsidyStatus,
      redemptionDate: sub.redemptionDate || '',
      dbtAccountNumber: sub.dbtAccountNumber || '',
      discomConsumerNo: sub.discomConsumerNo || cust?.electricityConsumerNumber || '',
      inspectionDate: sub.inspectionDate || '',
      inspectorName: sub.inspectorName || '',
      remarks: sub.remarks || '',
      rejectionReason: sub.rejectionReason || '',
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt,
    };
  });

  // Calculate Subsidy Analytics (Decoupled from payment/project status)
  const totalSubsidies = enriched.length;
  const applicableSubsidies = enriched.filter((s) => s.subsidyApplicable);
  const totalSubsidyAmount = applicableSubsidies.reduce((acc, s) => acc + s.subsidyAmount, 0);
  const totalRedeemedAmount = applicableSubsidies
    .filter((s) => s.subsidyStatus === 'redeemed')
    .reduce((acc, s) => acc + s.subsidyAmount, 0);
  const totalUnderProcessAmount = applicableSubsidies
    .filter((s) => s.subsidyStatus === 'under_process' || s.subsidyStatus === 'approved' || s.subsidyStatus === 'applied')
    .reduce((acc, s) => acc + s.subsidyAmount, 0);

  const approvedCount = applicableSubsidies.filter((s) => s.subsidyStatus === 'approved' || s.subsidyStatus === 'redeemed').length;
  const redeemedCount = applicableSubsidies.filter((s) => s.subsidyStatus === 'redeemed').length;
  const underProcessCount = applicableSubsidies.filter((s) => s.subsidyStatus === 'under_process' || s.subsidyStatus === 'applied').length;
  const pendingInspectionCount = applicableSubsidies.filter((s) => s.inspectionStatus === 'pending' || s.subsidyStatus === 'inspection_pending').length;
  const notAppliedCount = applicableSubsidies.filter((s) => s.subsidyStatus === 'not_applied').length;

  // Filter
  let filtered = enriched;
  if (statusFilter && statusFilter !== 'all') {
    filtered = filtered.filter((s) => s.subsidyStatus === statusFilter);
  }
  if (searchFilter) {
    filtered = filtered.filter(
      (s) =>
        s.customerName?.toLowerCase().includes(searchFilter) ||
        s.projectCode?.toLowerCase().includes(searchFilter) ||
        s.applicationNumber?.toLowerCase().includes(searchFilter) ||
        s.discomConsumerNo?.toLowerCase().includes(searchFilter) ||
        s.district?.toLowerCase().includes(searchFilter)
    );
  }

  return NextResponse.json({
    success: true,
    data: filtered,
    analytics: {
      totalSubsidies,
      applicableCount: applicableSubsidies.length,
      totalSubsidyAmount,
      totalRedeemedAmount,
      totalUnderProcessAmount,
      approvedCount,
      redeemedCount,
      underProcessCount,
      pendingInspectionCount,
      notAppliedCount,
    },
    meta: {
      count: filtered.length,
      scope: userType,
    },
  });
}

// POST /api/subsidy - Create / Register subsidy application
export async function POST(req: NextRequest) {
  const guard = await guardApiRequest(req, 'subsidy', 'create');
  if (!guard.authorized || !guard.session) {
    return guard.response!;
  }

  try {
    const body = await req.json();
    const { projectId, applicationNumber, applicationDate, schemeName, subsidyAmount, remarks } = body;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Project ID is required' } },
        { status: 400 }
      );
    }

    const actor = {
      userId: guard.session.userId,
      name: guard.session.username || guard.session.email.split('@')[0],
      role: guard.session.userType,
    };

    const result = db.updateSubsidy(
      projectId,
      {
        applicationNumber,
        applicationDate: applicationDate || new Date().toISOString().split('T')[0],
        schemeName,
        subsidyAmount: subsidyAmount !== undefined ? Number(subsidyAmount) : undefined,
        subsidyStatus: 'applied',
        remarks,
      },
      actor
    );

    recordAuditLog({
      actorUserId: guard.session.userId,
      actorEmail: guard.session.email,
      actorUserType: guard.session.userType,
      action: 'SUBSIDY_APPLICATION_RECORDED',
      entityTable: 'subsidies',
      entityId: result.subsidy!.id,
      details: `Registered PM Surya Ghar subsidy application '${applicationNumber}' (₹${result.subsidy!.subsidyAmount}) for Project ${projectId}.`,
      status: 'SUCCESS',
    });

    return NextResponse.json({
      success: true,
      message: `Subsidy application successfully recorded for Project ${projectId}.`,
      data: result.subsidy,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: err.message || 'Failed to record subsidy' } },
      { status: 500 }
    );
  }
}
