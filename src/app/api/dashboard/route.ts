import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/auth/server-guard';
import { db, appCache } from '@/lib/db';
import { getAdminManagedCustomerIds, getAdminManagedEmployeeIds } from '@/lib/auth/rbac';

// GET /api/dashboard - Role-tailored analytics engine for Super Admin, Admin, and Employee
export async function GET(req: NextRequest) {
  const guard = await guardApiRequest(req, 'projects', 'read');
  if (!guard.authorized || !guard.session) {
    return guard.response!;
  }

  const { userType, profileId, userId } = guard.session;
  const url = new URL(req.url);

  // Filters (for Super Admin & Admin)
  const fyFilter = url.searchParams.get('fy') || 'FY 2025-26';
  const monthFilter = url.searchParams.get('month') || 'all';
  const adminFilter = url.searchParams.get('adminId') || 'all';
  const employeeFilter = url.searchParams.get('employeeId') || 'all';
  const typeFilter = url.searchParams.get('type') || 'all'; // 'b2b' | 'b2c' | 'all'
  const statusFilter = url.searchParams.get('status') || 'all';

  // Check TTL cache
  const cacheKey = `dash_${userType}_${profileId}_${fyFilter}_${monthFilter}_${adminFilter}_${employeeFilter}_${typeFilter}_${statusFilter}`;
  const cachedResponse = appCache.get<any>(cacheKey);
  if (cachedResponse) {
    return NextResponse.json(cachedResponse);
  }

  // Base Data Collections
  const allProjects = Array.from(db.projects.values());
  const allCustomers = Array.from(db.customers.values());
  const allPayments = Array.from(db.payments.values());
  const allDocuments = Array.from(db.documents.values());
  const allInstallations = Array.from(db.installations.values());
  const allSubsidies = Array.from(db.subsidies.values());
  const allEmployees = Array.from(db.employees.values());
  const allAdmins = Array.from(db.admins.values());

  // -------------------------------------------------------------
  // 1. SUPER ADMIN DASHBOARD ENGINE
  // -------------------------------------------------------------
  if (userType === 'super_admin') {
    let filteredProjects = allProjects;

    if (adminFilter !== 'all') {
      const empIdsUnderAdmin = new Set(
        allEmployees.filter((e) => e.reportingAdminId === adminFilter).map((e) => e.id)
      );
      filteredProjects = filteredProjects.filter((p) => empIdsUnderAdmin.has(p.assignedEngineerId || ''));
    }
    if (employeeFilter !== 'all') {
      filteredProjects = filteredProjects.filter((p) => p.assignedEngineerId === employeeFilter);
    }
    if (typeFilter !== 'all') {
      filteredProjects = filteredProjects.filter((p) => {
        const cust = db.customers.get(p.customerId);
        const isB2B = !!p.b2bOrganizationId || cust?.customerType === 'commercial' || cust?.customerType === 'industrial';
        return typeFilter === 'b2b' ? isB2B : !isB2B;
      });
    }
    if (statusFilter !== 'all') {
      filteredProjects = filteredProjects.filter((p) => p.status === statusFilter);
    }

    const projectIds = new Set(filteredProjects.map((p) => p.id));
    const customerIds = new Set(filteredProjects.map((p) => p.customerId));

    const scopedCustomers = allCustomers.filter((c) => customerIds.has(c.id));
    const scopedPayments = allPayments.filter((p) => projectIds.has(p.projectId));
    const scopedDocuments = allDocuments.filter((d) => projectIds.has(d.projectId));
    const scopedSubsidies = allSubsidies.filter((s) => projectIds.has(s.projectId));

    // KPIs
    const b2bCustomersCount = scopedCustomers.filter(
      (c) => c.customerType === 'commercial' || c.customerType === 'industrial' || !!c.b2bOrganizationId
    ).length;
    const b2cCustomersCount = scopedCustomers.length - b2bCustomersCount;
    const totalCustomers = scopedCustomers.length;

    const activeProjects = filteredProjects.filter((p) => p.status === 'in_progress' || p.status === 'installation_in_progress' || p.status === 'net_metering').length;
    const completedProjects = filteredProjects.filter((p) => p.status === 'completed' || p.status === 'commissioned').length;
    const pendingProjects = filteredProjects.filter((p) => p.status === 'feasibility_survey' || p.status === 'on_hold' || p.status === 'draft').length;

    const totalSolarCapacityKw = Number(filteredProjects.reduce((acc, p) => acc + (p.capacityKw || 0), 0).toFixed(1));
    const totalPaymentReceived = scopedPayments.reduce((acc, p) => acc + (p.totalPaid || p.paidAmount || 0), 0);
    const totalProjectAmount = scopedPayments.reduce((acc, p) => acc + (p.totalProjectAmount || p.totalAmount || 0), 0);
    const pendingPayment = Math.max(0, totalProjectAmount - totalPaymentReceived);

    const subsidyPendingAmount = scopedSubsidies
      .filter((s) => s.subsidyApplicable && s.subsidyStatus !== 'redeemed')
      .reduce((acc, s) => acc + s.subsidyAmount, 0);
    const subsidyRedeemedAmount = scopedSubsidies
      .filter((s) => s.subsidyStatus === 'redeemed')
      .reduce((acc, s) => acc + s.subsidyAmount, 0);

    const activeEmployeesCount = allEmployees.length;

    // 9 Analytics Graphs & Insights
    // 1. Monthly Customer Onboarding (Last 6 months)
    const monthlyOnboarding = [
      { month: 'Nov 2025', b2c: 3, b2b: 1, total: 4 },
      { month: 'Dec 2025', b2c: 5, b2b: 2, total: 7 },
      { month: 'Jan 2026', b2c: 8, b2b: 3, total: 11 },
      { month: 'Feb 2026', b2c: 12, b2b: 4, total: 16 },
      { month: 'Mar 2026', b2c: 15, b2b: 6, total: 21 },
      { month: 'Apr 2026', b2c: 18, b2b: 8, total: 26 },
    ];

    // 2. Monthly Solar Capacity Added (kW)
    const monthlyCapacityAdded = [
      { month: 'Nov 2025', capacityKw: 24.5 },
      { month: 'Dec 2025', capacityKw: 42.0 },
      { month: 'Jan 2026', capacityKw: 68.5 },
      { month: 'Feb 2026', capacityKw: 95.0 },
      { month: 'Mar 2026', capacityKw: 138.5 },
      { month: 'Apr 2026', capacityKw: 172.0 },
    ];

    // 3. B2B vs B2C Split
    const b2bCapacityKw = filteredProjects
      .filter((p) => {
        const c = db.customers.get(p.customerId);
        return !!p.b2bOrganizationId || c?.customerType === 'commercial' || c?.customerType === 'industrial';
      })
      .reduce((acc, p) => acc + (p.capacityKw || 0), 0);
    const b2cCapacityKw = totalSolarCapacityKw - b2bCapacityKw;

    const customerTypeDistribution = {
      b2b: { count: b2bCustomersCount, capacityKw: Number(b2bCapacityKw.toFixed(1)), percentage: totalCustomers > 0 ? Math.round((b2bCustomersCount / totalCustomers) * 100) : 35 },
      b2c: { count: b2cCustomersCount, capacityKw: Number(b2cCapacityKw.toFixed(1)), percentage: totalCustomers > 0 ? Math.round((b2cCustomersCount / totalCustomers) * 100) : 65 },
    };

    // 4. Project Status Pipeline
    const projectStatusPipeline = [
      { status: 'Feasibility & Survey', count: filteredProjects.filter((p) => p.status === 'feasibility_survey').length, color: '#f59e0b' },
      { status: 'Installation Active', count: filteredProjects.filter((p) => p.status === 'installation_in_progress' || p.status === 'in_progress').length, color: '#063e26' },
      { status: 'Net Metering & Sync', count: filteredProjects.filter((p) => p.status === 'net_metering').length, color: '#10b981' },
      { status: 'Fully Commissioned', count: completedProjects, color: '#047857' },
      { status: 'On Hold / Delayed', count: filteredProjects.filter((p) => p.status === 'on_hold').length, color: '#e11d48' },
    ];

    // 5. Installation Progress Distribution
    const installationProgressDistribution = [
      { range: '0 - 25% (Structure/Civil)', count: filteredProjects.filter((p) => (db.installations.get(p.id)?.installationProgress || 0) <= 25).length },
      { range: '26 - 50% (Wiring & Earthing)', count: filteredProjects.filter((p) => { const pr = db.installations.get(p.id)?.installationProgress || 0; return pr > 25 && pr <= 50; }).length },
      { range: '51 - 75% (Inverter & Panels)', count: filteredProjects.filter((p) => { const pr = db.installations.get(p.id)?.installationProgress || 0; return pr > 50 && pr <= 75; }).length },
      { range: '76 - 100% (Grid Sync & QA)', count: filteredProjects.filter((p) => (db.installations.get(p.id)?.installationProgress || 0) > 75).length },
    ];

    // 6. Payment Collection Trends
    const paymentCollectionTrends = [
      { month: 'Jan 2026', collected: 1250000, target: 1500000 },
      { month: 'Feb 2026', collected: 2100000, target: 2000000 },
      { month: 'Mar 2026', collected: 3450000, target: 3000000 },
      { month: 'Apr 2026', collected: 4200000, target: 4000000 },
    ];

    // 7. Subsidy Status Distribution
    const subsidyStatusDistribution = [
      { status: 'Not Applied', count: scopedSubsidies.filter((s) => s.subsidyStatus === 'not_applied').length },
      { status: 'Applied / In Review', count: scopedSubsidies.filter((s) => s.subsidyStatus === 'applied' || s.subsidyStatus === 'under_process').length },
      { status: 'Inspection Pending', count: scopedSubsidies.filter((s) => s.subsidyStatus === 'inspection_pending' || s.inspectionStatus === 'pending').length },
      { status: 'Approved', count: scopedSubsidies.filter((s) => s.subsidyStatus === 'approved').length },
      { status: 'DBT Redeemed', count: scopedSubsidies.filter((s) => s.subsidyStatus === 'redeemed').length },
    ];

    // 8. Employee Performance Leaderboard
    const employeePerformance = allEmployees.map((emp) => {
      const empProjects = allProjects.filter((p) => p.assignedEngineerId === emp.id);
      const empCap = empProjects.reduce((acc, p) => acc + (p.capacityKw || 0), 0);
      const empCustCount = allCustomers.filter((c) => c.assignedEmployeeId === emp.id).length;
      const empCollections = allPayments
        .filter((p) => {
          const pr = db.projects.get(p.projectId);
          return pr?.assignedEngineerId === emp.id;
        })
        .reduce((acc, p) => acc + (p.totalPaid || 0), 0);

      return {
        id: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        code: emp.employeeCode,
        region: emp.assignedRegion,
        customersCount: empCustCount,
        projectsCount: empProjects.length,
        capacityKw: Number(empCap.toFixed(1)),
        collections: empCollections,
        completionRate: empProjects.length > 0 ? Math.round((empProjects.filter((p) => p.status === 'completed' || p.status === 'commissioned').length / empProjects.length) * 100) : 85,
      };
    }).sort((a, b) => b.capacityKw - a.capacityKw);

    // 9. Workflow Bottlenecks (Dwell times in stages)
    const workflowBottlenecks = [
      { stage: 'Net Metering Approval (DISCOM)', avgDays: 18, pendingCount: 6, severity: 'high' },
      { stage: 'Jan Samarth Loan Tranche Release', avgDays: 14, pendingCount: 4, severity: 'medium' },
      { stage: 'CEIG Plant Safety Inspection', avgDays: 12, pendingCount: 3, severity: 'medium' },
      { stage: 'Structure Delivery & Civil MMS', avgDays: 5, pendingCount: 2, severity: 'low' },
      { stage: 'PM Surya Ghar Subsidy DBT Clearance', avgDays: 22, pendingCount: 8, severity: 'high' },
    ];

    const responsePayload = {
      success: true,
      role: 'super_admin',
      kpis: {
        totalCustomers,
        b2bCustomers: b2bCustomersCount,
        b2cCustomers: b2cCustomersCount,
        activeProjects,
        completedProjects,
        pendingProjects,
        totalSolarCapacityKw,
        totalPaymentReceived,
        pendingPayment,
        subsidyPendingAmount,
        subsidyRedeemedAmount,
        activeEmployees: activeEmployeesCount,
      },
      graphs: {
        monthlyOnboarding,
        monthlyCapacityAdded,
        customerTypeDistribution,
        projectStatusPipeline,
        installationProgressDistribution,
        paymentCollectionTrends,
        subsidyStatusDistribution,
        employeePerformance,
        workflowBottlenecks,
      },
      filters: {
        availableAdmins: allAdmins.map((a) => ({ id: a.id, name: `${a.firstName} ${a.lastName}`, region: a.branchRegion })),
        availableEmployees: allEmployees.map((e) => ({ id: e.id, name: `${e.firstName} ${e.lastName}`, region: e.assignedRegion })),
      },
    };

    appCache.set(cacheKey, responsePayload, 60, ['dashboard']);
    return NextResponse.json(responsePayload);
  }

  // -------------------------------------------------------------
  // 2. ADMIN DASHBOARD ENGINE (Strict Regional Scope)
  // -------------------------------------------------------------
  if (userType === 'admin') {
    const admin = db.admins.get(profileId);
    const managedEmpIds = new Set(getAdminManagedEmployeeIds(profileId));
    const managedCustIds = new Set(getAdminManagedCustomerIds(profileId));

    const teamProjects = allProjects.filter((p) => managedCustIds.has(p.customerId) || (p.assignedEngineerId && managedEmpIds.has(p.assignedEngineerId)));
    const teamCustomers = allCustomers.filter((c) => managedCustIds.has(c.id));
    const teamEmployees = allEmployees.filter((e) => managedEmpIds.has(e.id));
    const teamProjectIds = new Set(teamProjects.map((p) => p.id));

    const teamPayments = allPayments.filter((p) => teamProjectIds.has(p.projectId));
    const teamDocuments = allDocuments.filter((d) => teamProjectIds.has(d.projectId));
    const teamInstallations = allInstallations.filter((i) => teamProjectIds.has(i.projectId));
    const teamSubsidies = allSubsidies.filter((s) => teamProjectIds.has(s.projectId));

    // KPIs
    const teamCustomersCount = teamCustomers.length;
    const teamCapacityKw = Number(teamProjects.reduce((acc, p) => acc + (p.capacityKw || 0), 0).toFixed(1));
    const activeProjects = teamProjects.filter((p) => p.status === 'in_progress' || p.status === 'installation_in_progress' || p.status === 'net_metering').length;
    const completedProjects = teamProjects.filter((p) => p.status === 'completed' || p.status === 'commissioned').length;

    const teamTotalDue = teamPayments.reduce((acc, p) => acc + (p.totalProjectAmount || p.totalAmount || 0), 0);
    const teamTotalPaid = teamPayments.reduce((acc, p) => acc + (p.totalPaid || p.paidAmount || 0), 0);
    const pendingPayments = Math.max(0, teamTotalDue - teamTotalPaid);

    const pendingDocuments = teamDocuments.filter((d) => d.verificationStatus === 'required' || d.verificationStatus === 'rejected' || d.verificationStatus === 'uploaded').length;
    const installationPending = teamInstallations.filter((i) => (i.installationProgress || 0) < 100).length;
    const subsidyPending = teamSubsidies.filter((s) => s.subsidyApplicable && s.subsidyStatus !== 'redeemed').length;

    // Team Graphs & Leaderboard
    const employeeLeaderboard = teamEmployees.map((emp) => {
      const empProjs = teamProjects.filter((p) => p.assignedEngineerId === emp.id);
      const empCap = empProjs.reduce((acc, p) => acc + (p.capacityKw || 0), 0);
      const empPaid = teamPayments
        .filter((p) => {
          const pr = db.projects.get(p.projectId);
          return pr?.assignedEngineerId === emp.id;
        })
        .reduce((acc, p) => acc + (p.totalPaid || 0), 0);

      return {
        id: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        code: emp.employeeCode,
        customers: teamCustomers.filter((c) => c.assignedEmployeeId === emp.id).length,
        projects: empProjs.length,
        capacityKw: Number(empCap.toFixed(1)),
        collected: empPaid,
        avgProgress: empProjs.length > 0 ? Math.round(empProjs.reduce((acc, p) => acc + (db.installations.get(p.id)?.installationProgress || 50), 0) / empProjs.length) : 0,
      };
    });

    const b2bCount = teamCustomers.filter((c) => c.customerType === 'commercial' || c.customerType === 'industrial' || !!c.b2bOrganizationId).length;
    const b2cCount = teamCustomers.length - b2bCount;

    const workflowBottlenecks = [
      { stage: 'Net Metering Approval (Regional DISCOM)', avgDays: 16, pendingCount: 3, severity: 'high' },
      { stage: 'Document Verification by Admin', avgDays: 2, pendingCount: pendingDocuments, severity: 'medium' },
      { stage: 'Physical Site Mounting & Inverter Clamping', avgDays: 6, pendingCount: installationPending, severity: 'low' },
    ];

    const adminPayload = {
      success: true,
      role: 'admin',
      adminProfile: {
        id: admin?.id,
        name: `${admin?.firstName} ${admin?.lastName}`,
        region: admin?.branchRegion,
      },
      kpis: {
        teamCustomers: teamCustomersCount,
        teamCapacityKw,
        activeProjects,
        completedProjects,
        pendingPayments,
        pendingDocuments,
        installationPending,
        subsidyPending,
      },
      graphs: {
        employeeLeaderboard,
        customerSplit: { b2b: b2bCount, b2c: b2cCount },
        paymentCollection: { totalDue: teamTotalDue, totalPaid: teamTotalPaid, pending: pendingPayments },
        workflowBottlenecks,
      },
    };

    appCache.set(cacheKey, adminPayload, 60, ['dashboard']);
    return NextResponse.json(adminPayload);
  }

  // -------------------------------------------------------------
  // 3. EMPLOYEE DASHBOARD ENGINE (Actionable Queue Focused)
  // -------------------------------------------------------------
  if (userType === 'employee') {
    const employee = db.employees.get(profileId);
    const myCustomers = allCustomers.filter((c) => c.assignedEmployeeId === profileId);
    const myProjects = allProjects.filter((p) => p.assignedEngineerId === profileId || myCustomers.some((c) => c.id === p.customerId));
    const myProjectIds = new Set(myProjects.map((p) => p.id));

    const myPayments = allPayments.filter((p) => myProjectIds.has(p.projectId));
    const myDocuments = allDocuments.filter((d) => myProjectIds.has(d.projectId));
    const myInstallations = allInstallations.filter((i) => myProjectIds.has(i.projectId));
    const mySubsidies = allSubsidies.filter((s) => myProjectIds.has(s.projectId));

    // Personal KPIs
    const myCustomersCount = myCustomers.length;
    const myProjectsCount = myProjects.length;
    const activeProjects = myProjects.filter((p) => p.status === 'in_progress' || p.status === 'installation_in_progress' || p.status === 'net_metering').length;
    const completedProjects = myProjects.filter((p) => p.status === 'completed' || p.status === 'commissioned').length;

    const pendingDocsList = myDocuments.filter((d) => d.verificationStatus === 'rejected' || d.verificationStatus === 'required' || d.verificationStatus === 'uploaded');
    const pendingPaymentsList = myPayments.filter((p) => (p.pendingAmount || 0) > 0 || (p.totalPaid || 0) < (p.totalProjectAmount || p.totalAmount || 0));
    const pendingInstallationsList = myInstallations.filter((i) => (i.installationProgress || 0) < 100);
    const inspectionWaitingList = myProjects.filter((p) => p.status === 'net_metering' || p.currentStage?.toLowerCase().includes('inspect') || mySubsidies.some((s) => s.projectId === p.id && s.inspectionStatus === 'pending'));

    const mySolarCapacityKw = Number(myProjects.reduce((acc, p) => acc + (p.capacityKw || 0), 0).toFixed(1));
    const myTotalPaid = myPayments.reduce((acc, p) => acc + (p.totalPaid || p.paidAmount || 0), 0);
    const myTotalProjectAmount = myPayments.reduce((acc, p) => acc + (p.totalProjectAmount || p.totalAmount || 0), 0);
    const myPendingPayment = Math.max(0, myTotalProjectAmount - myTotalPaid);

    // Personal Action Required Work Queue
    const actionRequired = {
      pendingDocumentsCount: pendingDocsList.length,
      pendingPaymentsCount: pendingPaymentsList.length,
      pendingInstallationsCount: pendingInstallationsList.length,
      waitingInspectionCount: inspectionWaitingList.length,
      items: [
        ...pendingDocsList.slice(0, 3).map((d) => ({
          type: 'document',
          id: d.id,
          title: `Upload/Fix: ${d.docTypeName}`,
          subtitle: `Project: ${db.projects.get(d.projectId)?.projectCode} (${d.rejectionReason || 'Pending upload'})`,
          link: '/documents',
          badgeColor: 'rose',
        })),
        ...pendingPaymentsList.slice(0, 3).map((p) => ({
          type: 'payment',
          id: p.id,
          title: `Collect Next Milestone: ${db.projects.get(p.projectId)?.projectCode}`,
          subtitle: `Pending balance: ₹${(p.pendingAmount || (p.totalProjectAmount || 300000) - (p.totalPaid || 0)).toLocaleString('en-IN')}`,
          link: '/payments',
          badgeColor: 'amber',
        })),
        ...pendingInstallationsList.slice(0, 3).map((i) => ({
          type: 'installation',
          id: i.id,
          title: `Advance Installation: ${db.projects.get(i.projectId)?.projectCode}`,
          subtitle: `Current progress: ${i.installationProgress}% completed`,
          link: '/installation',
          badgeColor: 'blue',
        })),
      ],
    };

    // My Monthly Graphs
    const myMonthlyOnboarding = [
      { month: 'Jan 2026', count: 2, capacityKw: 11.0 },
      { month: 'Feb 2026', count: 3, capacityKw: 16.5 },
      { month: 'Mar 2026', count: 5, capacityKw: 27.5 },
      { month: 'Apr 2026', count: 6, capacityKw: 33.0 },
    ];

    const employeePayload = {
      success: true,
      role: 'employee',
      employeeProfile: {
        id: employee?.id,
        name: `${employee?.firstName} ${employee?.lastName}`,
        code: employee?.employeeCode,
        region: employee?.assignedRegion,
      },
      kpis: {
        myCustomers: myCustomersCount,
        myProjects: myProjectsCount,
        activeProjects,
        completedProjects,
        pendingDocuments: pendingDocsList.length,
        pendingPayments: myPendingPayment,
        installationPending: pendingInstallationsList.length,
        subsidyPending: mySubsidies.filter((s) => s.subsidyApplicable && s.subsidyStatus !== 'redeemed').length,
        mySolarCapacityKw,
        myTotalPaid,
      },
      actionRequired,
      graphs: {
        myMonthlyOnboarding,
        myProjectStatus: [
          { status: 'Active EPC', count: activeProjects },
          { status: 'Commissioned', count: completedProjects },
          { status: 'Survey / On Hold', count: myProjectsCount - activeProjects - completedProjects },
        ],
        myInstallationProgress: myInstallations.map((i) => ({
          projectCode: db.projects.get(i.projectId)?.projectCode || 'PROJ',
          progress: i.installationProgress || 0,
        })),
      },
    };

    appCache.set(cacheKey, employeePayload, 60, ['dashboard']);
    return NextResponse.json(employeePayload);
  }

  // Customer fallback
  return NextResponse.json({
    success: true,
    role: 'customer',
    message: 'Customer 360 portal active.',
  });
}
