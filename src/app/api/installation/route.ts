import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/auth/server-guard';
import { db } from '@/lib/db';
import { getAdminManagedCustomerIds } from '@/lib/auth/rbac';
import { recordAuditLog } from '@/lib/audit';

// GET /api/installation - List all installation records with 9 stages & calculated progress %
export async function GET(req: NextRequest) {
  const guard = await guardApiRequest(req, 'installation', 'read');
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

  // Ensure each project has its 9-stage installation initialized
  const enriched = accessibleProjects.map((proj) => {
    const inst = db.getOrCreateInstallation(proj.id);
    const cust = db.customers.get(proj.customerId);
    const org = proj.b2bOrganizationId ? db.organizations.get(proj.b2bOrganizationId) : (cust?.b2bOrganizationId ? db.organizations.get(cust.b2bOrganizationId) : null);
    const emp = db.employees.get(proj.assignedEngineerId || cust?.assignedEmployeeId || '');
    const isB2B = !!org || cust?.customerType === 'commercial' || cust?.customerType === 'industrial';

    const completedStages = inst.stages.filter((s) => s.status === 'completed').length;
    const progress = Math.round((completedStages / inst.stages.length) * 100);

    return {
      id: inst.id,
      projectId: proj.id,
      projectCode: proj.projectCode,
      projectName: proj.projectName,
      customerId: proj.customerId,
      customerName: isB2B ? (org?.orgName || `${cust?.firstName} ${cust?.lastName}`) : `${cust?.firstName} ${cust?.lastName}`.trim(),
      customerType: isB2B ? 'B2B' : 'B2C',
      isB2B,
      district: cust?.district || 'Delhi NCR',
      state: cust?.state || 'Delhi',
      capacityKw: proj.capacityKw || cust?.proposedCapacityKw || 5.0,
      leadTechnicianId: inst.leadTechnicianId || emp?.id,
      leadTechnicianName: inst.leadTechnicianName || (emp ? `${emp.firstName} ${emp.lastName}` : 'Assigned Technician'),
      assignedTeam: inst.assignedTeam || 'Solar EPC Field Crew',
      status: inst.status,
      tiltAngle: inst.tiltAngle,
      panelCount: inst.panelCount,
      panelModel: inst.panelModel,
      inverterModel: inst.inverterModel,
      inverterSerial: inst.inverterSerial,
      structureType: inst.structureType,
      scheduledDate: inst.scheduledDate,
      completionDate: inst.completionDate,
      safetyAuditPassed: inst.safetyAuditPassed,
      sitePhotos: inst.sitePhotos || [],
      installationProgress: progress,
      stages: inst.stages,
      updatedAt: inst.updatedAt,
    };
  });

  // Calculate Installation KPIs
  const totalInstallations = enriched.length;
  const fullyCompleted = enriched.filter((i) => i.installationProgress === 100).length;
  const inProgressCount = enriched.filter((i) => i.installationProgress > 0 && i.installationProgress < 100).length;
  const pendingCount = enriched.filter((i) => i.installationProgress === 0).length;
  const avgProgress = totalInstallations > 0 ? Math.round(enriched.reduce((acc, i) => acc + i.installationProgress, 0) / totalInstallations) : 0;

  // Filters
  let filtered = enriched;
  if (statusFilter && statusFilter !== 'all') {
    if (statusFilter === 'completed') filtered = filtered.filter((i) => i.installationProgress === 100);
    else if (statusFilter === 'in_progress') filtered = filtered.filter((i) => i.installationProgress > 0 && i.installationProgress < 100);
    else if (statusFilter === 'pending') filtered = filtered.filter((i) => i.installationProgress === 0);
  }
  if (searchFilter) {
    filtered = filtered.filter(
      (i) =>
        i.customerName?.toLowerCase().includes(searchFilter) ||
        i.projectCode?.toLowerCase().includes(searchFilter) ||
        i.district?.toLowerCase().includes(searchFilter) ||
        i.leadTechnicianName?.toLowerCase().includes(searchFilter)
    );
  }

  // Sorting
  filtered.sort((a, b) => (b.installationProgress || 0) - (a.installationProgress || 0));

  const pageParam = url.searchParams.get('page');
  const limitParam = url.searchParams.get('limit') || url.searchParams.get('pageSize');
  const total = filtered.length;
  const page = Math.max(1, parseInt(pageParam || '1', 10));
  const limit = limitParam === 'all' ? total : Math.max(1, parseInt(limitParam || '50', 10));
  const totalPages = Math.ceil(total / limit) || 1;
  const paginatedData = limitParam === 'all' ? filtered : filtered.slice((page - 1) * limit, page * limit);

  return NextResponse.json({
    success: true,
    data: paginatedData,
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
    analytics: {
      totalInstallations,
      fullyCompleted,
      inProgressCount,
      pendingCount,
      avgProgress,
    },
    meta: {
      count: paginatedData.length,
      total,
      scope: userType,
    },
  });
}
