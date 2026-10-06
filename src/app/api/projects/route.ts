import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { guardApiRequest } from '@/lib/auth/server-guard';
import { db, appCache } from '@/lib/db';
import { getAdminManagedCustomerIds, getAdminManagedEmployeeIds } from '@/lib/auth/rbac';
import { recordAuditLog } from '@/lib/audit';
import { Project } from '@/lib/types';
import { initializeProjectStages, LIFECYCLE_PHASES } from '@/lib/project-stages';

// GET /api/projects - List projects with enriched ownership, status, stages summary & filters
export async function GET(req: NextRequest) {
  const guard = await guardApiRequest(req, 'projects', 'read');
  if (!guard.authorized || !guard.session) {
    return guard.response!;
  }

  const { userType, profileId } = guard.session;
  const url = new URL(req.url);
  const statusFilter = url.searchParams.get('status');
  const typeFilter = url.searchParams.get('type'); // 'b2b' | 'b2c'
  const searchFilter = url.searchParams.get('search')?.toLowerCase();
  const pageParam = url.searchParams.get('page');
  const limitParam = url.searchParams.get('limit') || url.searchParams.get('pageSize');
  const sortBy = url.searchParams.get('sortBy') || 'createdAt';
  const sortOrder = url.searchParams.get('sortOrder') || 'desc';

  let accessibleProjects: Project[] = [];

  if (userType === 'super_admin') {
    accessibleProjects = Array.from(db.projects.values());
  } else if (userType === 'admin') {
    const managedCustomerIds = new Set(getAdminManagedCustomerIds(profileId));
    const managedEmpIds = new Set(getAdminManagedEmployeeIds(profileId));
    accessibleProjects = Array.from(db.projects.values()).filter(
      (p) => managedCustomerIds.has(p.customerId) || managedEmpIds.has(p.assignedEngineerId)
    );
  } else if (userType === 'employee') {
    accessibleProjects = db.getProjectsForEmployee(profileId);
    if (accessibleProjects.length === 0) {
      accessibleProjects = Array.from(db.projects.values()).filter(
        (p) => p.assignedEngineerId === profileId || db.customers.get(p.customerId)?.assignedEmployeeId === profileId
      );
    }
  } else if (userType === 'customer') {
    accessibleProjects = db.getProjectsForCustomer(profileId);
    if (accessibleProjects.length === 0) {
      accessibleProjects = Array.from(db.projects.values()).filter((p) => p.customerId === profileId);
    }
  }

  // Enrich project records
  let enriched = accessibleProjects.map((p) => {
    const cust = db.customers.get(p.customerId);
    const org = p.b2bOrganizationId ? db.organizations.get(p.b2bOrganizationId) : (cust?.b2bOrganizationId ? db.organizations.get(cust.b2bOrganizationId) : null);
    const emp = db.employees.get(p.assignedEngineerId || cust?.assignedEmployeeId || '');
    const admin = emp ? db.admins.get(emp.reportingAdminId) : null;
    const isB2B = !!org || cust?.customerType === 'commercial' || cust?.customerType === 'industrial';

    // Ensure stages are populated
    const stages = p.stages && p.stages.length > 0 ? p.stages : initializeProjectStages();
    const completedStagesCount = stages.filter((s) => s.status === 'completed').length;
    const totalApplicableStages = stages.filter((s) => s.status !== 'not_applicable').length || 1;
    const progressPercent = Math.round((completedStagesCount / totalApplicableStages) * 100);

    return {
      id: p.id,
      projectCode: p.projectCode,
      projectName: p.projectName || `${isB2B ? org?.orgName : (cust ? `${cust.firstName} ${cust.lastName}` : 'Solar')} ${p.capacityKw}kW Solar`,
      customerId: p.customerId,
      customer: cust
        ? {
            id: cust.id,
            name: `${cust.firstName} ${cust.lastName}`.trim(),
            email: cust.email,
            phoneNumber: cust.phoneNumber,
            address: cust.installationAddress,
            city: cust.city,
            district: cust.district,
            state: cust.state,
            electricityConsumerNumber: cust.electricityConsumerNumber,
          }
        : null,
      customerType: isB2B ? 'B2B' : 'B2C',
      isB2B,
      organization: org || null,
      capacityKw: p.capacityKw,
      systemType: p.systemType,
      totalCost: p.totalCost,
      priority: p.priority || 'standard',
      status: p.status,
      currentStage: p.currentStage || 'Feasibility & Onboarding',
      remarks: p.remarks || '',
      startDate: p.startDate || p.createdAt.split('T')[0],
      expectedCompletion: p.targetCompletionDate || '2026-06-30',
      actualCommissioningDate: p.actualCommissioningDate || null,
      assignedEmployee: emp
        ? {
            id: emp.id,
            name: `${emp.firstName} ${emp.lastName}`,
            code: emp.employeeCode,
            department: emp.department,
            region: emp.assignedRegion,
          }
        : null,
      assignedAdmin: admin
        ? {
            id: admin.id,
            name: `${admin.firstName} ${admin.lastName}`,
            region: admin.branchRegion,
          }
        : null,
      stagesSummary: {
        totalStages: stages.length,
        completedStagesCount,
        progressPercent,
        inProgressStagesCount: stages.filter((s) => s.status === 'in_progress').length,
        blockedStagesCount: stages.filter((s) => s.status === 'blocked').length,
      },
      stages,
      stageHistory: p.stageHistory || [],
      createdAt: p.createdAt,
    };
  });

  // Apply filters
  if (statusFilter && statusFilter !== 'all') {
    enriched = enriched.filter((p) => p.status === statusFilter);
  }
  if (typeFilter && typeFilter !== 'all') {
    enriched = enriched.filter((p) => (typeFilter === 'b2b' ? p.isB2B : !p.isB2B));
  }
  if (searchFilter) {
    enriched = enriched.filter(
      (p) =>
        p.projectCode.toLowerCase().includes(searchFilter) ||
        p.projectName.toLowerCase().includes(searchFilter) ||
        p.customer?.name?.toLowerCase().includes(searchFilter) ||
        p.organization?.orgName?.toLowerCase().includes(searchFilter) ||
        p.currentStage.toLowerCase().includes(searchFilter)
    );
  }

  // Sorting
  enriched.sort((a, b) => {
    let comp = 0;
    if (sortBy === 'projectCode') comp = a.projectCode.localeCompare(b.projectCode);
    else if (sortBy === 'capacityKw' || sortBy === 'capacity') comp = (a.capacityKw || 0) - (b.capacityKw || 0);
    else if (sortBy === 'progress') comp = (a.stagesSummary?.progressPercent || 0) - (b.stagesSummary?.progressPercent || 0);
    else comp = new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
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
    meta: {
      count: paginatedData.length,
      total,
      lifecyclePhases: LIFECYCLE_PHASES,
      scope: userType,
    },
  });
}

// POST /api/projects - Create a new solar project with 26 operational stages
export async function POST(req: NextRequest) {
  const guard = await guardApiRequest(req, 'projects', 'create');
  if (!guard.authorized || !guard.session) {
    return guard.response!;
  }

  try {
    const body = await req.json();
    const {
      customerId,
      projectName,
      capacityKw = 5.0,
      systemType = 'on_grid',
      priority = 'standard',
      targetCompletionDate,
      startDate = new Date().toISOString().split('T')[0],
      remarks,
      assignedEngineerId,
    } = body;

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Customer ID is required to link project.' } },
        { status: 400 }
      );
    }

    const customer = db.customers.get(customerId);
    if (!customer) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Customer not found.' } },
        { status: 404 }
      );
    }

    const projectId = `proj-${crypto.randomBytes(4).toString('hex')}`;
    const projectCode = `RPS-2026-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const initialStages = initializeProjectStages({
      applicationType: customer.workflow?.discomApplicationType,
      paymentMode: customer.workflow?.paymentMode,
      assignedUser: {
        userId: guard.session.userId,
        name: guard.session.email.split('@')[0],
        role: guard.session.userType,
      },
    });

    const newProject: Project = {
      id: projectId,
      projectCode,
      projectName: projectName || `${customer.firstName} ${customer.lastName} ${capacityKw}kW Rooftop Solar`,
      customerId,
      b2bOrganizationId: customer.b2bOrganizationId,
      assignedEngineerId: assignedEngineerId || customer.assignedEmployeeId || 'emp-prof-rahul',
      capacityKw: Number(capacityKw),
      systemType,
      totalCost: Number(capacityKw) * 60000,
      priority,
      status: 'draft',
      currentStage: 'Brown File / DISCOM Scoping',
      startDate,
      targetCompletionDate: targetCompletionDate || new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
      remarks: remarks || 'Newly initialized solar project with complete 26 operational stages.',
      stages: initialStages,
      stageHistory: [
        {
          id: `hist-${crypto.randomBytes(4).toString('hex')}`,
          projectId,
          stageKey: 'project_creation',
          stageName: 'Project Initialized',
          previousStatus: 'not_started',
          newStatus: 'in_progress',
          changedByUserId: guard.session.userId,
          changedByUserName: guard.session.email.split('@')[0],
          changedByUserRole: guard.session.userType,
          remarks: 'Project initialized with 26 operational stages.',
          timestamp: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
    };

    db.projects.set(projectId, newProject);

    // Index and invalidate cache
    db.indexProject(newProject);
    appCache.invalidateTags('dashboard', 'projects', 'customers');

    recordAuditLog({
      actorUserId: guard.session.userId,
      actorEmail: guard.session.email,
      actorUserType: guard.session.userType,
      action: 'PROJECT_CREATED',
      entityTable: 'projects',
      entityId: projectId,
      details: `Created Project ${projectCode} (${capacityKw} kW) for Customer ${customer.firstName} ${customer.lastName}`,
      status: 'SUCCESS',
    });

    return NextResponse.json({
      success: true,
      message: `Project ${projectCode} successfully created.`,
      data: newProject,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: err.message || 'Failed to create project' } },
      { status: 500 }
    );
  }
}
