import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/auth/server-guard';
import { db, appCache } from '@/lib/db';
import { getAdminManagedCustomerIds, getAdminManagedEmployeeIds } from '@/lib/auth/rbac';
import { recordAuditLog } from '@/lib/audit';
import { PaymentRecord, PaymentTransaction } from '@/lib/types';

// GET /api/payments - List payments with auto-calculated totals, B2C installment stages, and dashboard metrics
export async function GET(req: NextRequest) {
  const guard = await guardApiRequest(req, 'payments', 'read');
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
  const sortBy = url.searchParams.get('sortBy') || 'dueDate';
  const sortOrder = url.searchParams.get('sortOrder') || 'desc';

  let accessiblePayments: PaymentRecord[] = [];

  if (userType === 'super_admin') {
    accessiblePayments = Array.from(db.payments.values());
  } else if (userType === 'admin') {
    const managedCustomerIds = new Set(getAdminManagedCustomerIds(profileId));
    accessiblePayments = Array.from(db.payments.values()).filter((p) => managedCustomerIds.has(p.customerId));
  } else if (userType === 'employee') {
    accessiblePayments = Array.from(db.payments.values()).filter(
      (p) => db.customers.get(p.customerId)?.assignedEmployeeId === profileId
    );
  } else if (userType === 'customer') {
    accessiblePayments = Array.from(db.payments.values()).filter((p) => p.customerId === profileId);
  }

  // Enrich payments with customer, project, district, load, and capacity details
  let enriched = accessiblePayments.map((p) => {
    const cust = db.customers.get(p.customerId);
    const proj = db.projects.get(p.projectId);
    const org = proj?.b2bOrganizationId ? db.organizations.get(proj.b2bOrganizationId) : (cust?.b2bOrganizationId ? db.organizations.get(cust.b2bOrganizationId) : null);
    const emp = db.employees.get(proj?.assignedEngineerId || cust?.assignedEmployeeId || '');
    const admin = emp ? db.admins.get(emp.reportingAdminId) : null;
    const isB2B = !!org || cust?.customerType === 'commercial' || cust?.customerType === 'industrial';

    const totalProjectAmount = p.totalProjectAmount || p.totalAmount || proj?.totalCost || 300000;
    const totalPaid = p.totalPaid !== undefined ? p.totalPaid : p.paidAmount;
    const pendingAmount = Math.max(0, totalProjectAmount - totalPaid);
    const paymentPercentage = totalProjectAmount > 0 ? Math.min(100, Math.round((totalPaid / totalProjectAmount) * 100)) : 0;

    let computedStatus: 'pending' | 'partially_paid' | 'paid' | 'overdue' = p.status;
    if (totalPaid >= totalProjectAmount) computedStatus = 'paid';
    else if (p.dueDate && new Date(p.dueDate) < new Date() && totalPaid < totalProjectAmount) computedStatus = 'overdue';
    else if (totalPaid > 0) computedStatus = 'partially_paid';
    else computedStatus = 'pending';

    const customerDisplayName = isB2B
      ? (org?.orgName || (cust ? `${cust.firstName} ${cust.lastName}` : 'Commercial Client'))
      : (cust ? `${cust.firstName} ${cust.lastName}` : 'Residential Client');

    return {
      id: p.id,
      projectId: p.projectId,
      projectCode: proj?.projectCode || 'RPS-PROJ',
      projectName: proj?.projectName || `${cust?.firstName} ${cust?.lastName} Solar`,
      customerId: p.customerId,
      customerName: customerDisplayName.trim(),
      customerType: isB2B ? 'B2B' : 'B2C',
      isB2B,
      district: cust?.district || 'Central District',
      state: cust?.state || 'Delhi',
      sanctionedLoadKw: cust?.sanctionedLoadKw || 5.0,
      solarCapacityKw: proj?.capacityKw || cust?.proposedCapacityKw || 5.0,
      totalProjectAmount,
      totalPaid,
      pendingAmount,
      paymentPercentage,
      status: computedStatus,
      dueDate: p.dueDate || '2026-04-30',
      installments: p.installments || [],
      transactions: p.transactions || [],
      assignedEmployee: emp
        ? {
            id: emp.id,
            name: `${emp.firstName} ${emp.lastName}`,
            code: emp.employeeCode,
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
    };
  });

  // Calculate Dashboard Metrics
  const totalCollected = enriched.reduce((acc, p) => acc + (p.totalPaid || 0), 0);
  const totalPending = enriched.reduce((acc, p) => acc + (p.pendingAmount || 0), 0);
  const totalOverdue = enriched.filter((p) => p.status === 'overdue').reduce((acc, p) => acc + (p.pendingAmount || 0), 0);

  // This month's collection (March / April 2026)
  const currentYearMonth = new Date().toISOString().substring(0, 7);
  let thisMonthCollection = 0;
  enriched.forEach((p) => {
    (p.transactions || []).forEach((t: PaymentTransaction) => {
      if (t.paymentDate && t.paymentDate.startsWith(currentYearMonth)) {
        thisMonthCollection += t.amount;
      }
    });
  });
  if (thisMonthCollection === 0) {
    thisMonthCollection = totalCollected; // Fallback to recorded collections
  }

  // Collection by Employee
  const employeeMap = new Map<string, { employeeId: string; name: string; code: string; region: string; collected: number; pending: number; count: number }>();
  enriched.forEach((p) => {
    if (p.assignedEmployee) {
      const eId = p.assignedEmployee.id;
      const existing = employeeMap.get(eId) || {
        employeeId: eId,
        name: p.assignedEmployee.name,
        code: p.assignedEmployee.code,
        region: p.assignedEmployee.region,
        collected: 0,
        pending: 0,
        count: 0,
      };
      existing.collected += p.totalPaid;
      existing.pending += p.pendingAmount;
      existing.count += 1;
      employeeMap.set(eId, existing);
    }
  });

  // Collection by Admin
  const adminMap = new Map<string, { adminId: string; name: string; region: string; collected: number; pending: number; count: number }>();
  enriched.forEach((p) => {
    if (p.assignedAdmin) {
      const aId = p.assignedAdmin.id;
      const existing = adminMap.get(aId) || {
        adminId: aId,
        name: p.assignedAdmin.name,
        region: p.assignedAdmin.region,
        collected: 0,
        pending: 0,
        count: 0,
      };
      existing.collected += p.totalPaid;
      existing.pending += p.pendingAmount;
      existing.count += 1;
      adminMap.set(aId, existing);
    }
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
        p.customerName.toLowerCase().includes(searchFilter) ||
        p.projectCode.toLowerCase().includes(searchFilter) ||
        p.district.toLowerCase().includes(searchFilter) ||
        p.assignedEmployee?.name.toLowerCase().includes(searchFilter)
    );
  }

  // Sorting
  enriched.sort((a, b) => {
    let comp = 0;
    if (sortBy === 'customerName') comp = a.customerName.localeCompare(b.customerName);
    else if (sortBy === 'totalProjectAmount') comp = (a.totalProjectAmount || 0) - (b.totalProjectAmount || 0);
    else if (sortBy === 'totalPaid') comp = (a.totalPaid || 0) - (b.totalPaid || 0);
    else if (sortBy === 'pendingAmount') comp = (a.pendingAmount || 0) - (b.pendingAmount || 0);
    else if (sortBy === 'paymentPercentage') comp = (a.paymentPercentage || 0) - (b.paymentPercentage || 0);
    else comp = new Date(b.dueDate || 0).getTime() - new Date(a.dueDate || 0).getTime();
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
    analytics: {
      totalCollected,
      totalPending,
      totalOverdue,
      thisMonthCollection,
      collectionByEmployee: Array.from(employeeMap.values()),
      collectionByAdmin: Array.from(adminMap.values()),
    },
    meta: {
      count: paginatedData.length,
      total,
      scope: userType,
    },
  });
}

// POST /api/payments - Record a verified milestone payment transaction with unique receipt
export async function POST(req: NextRequest) {
  const guard = await guardApiRequest(req, 'payments', 'create');
  if (!guard.authorized || !guard.session) {
    return guard.response!;
  }

  try {
    const body = await req.json();
    const {
      projectId,
      installmentType = 'booking_amount',
      installmentTitle,
      amount,
      paymentMode = 'UPI',
      paymentDate = new Date().toISOString().split('T')[0],
      referenceNumber,
      receiptUrl,
      remarks,
    } = body;

    if (!projectId || !amount || !referenceNumber) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Project ID, Amount, and Reference Number are required.' } },
        { status: 400 }
      );
    }

    const actor = {
      userId: guard.session.userId,
      name: guard.session.username || guard.session.email.split('@')[0],
      role: guard.session.userType,
    };

    const result = db.recordPaymentTransaction({
      projectId,
      installmentType,
      installmentTitle,
      amount: Number(amount),
      paymentMode,
      paymentDate,
      referenceNumber,
      receiptUrl,
      remarks,
      actor,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: 'PAYMENT_RECORD_ERROR', message: result.error } },
        { status: 400 }
      );
    }

    // Invalidate dashboard and payment cache tags
    appCache.invalidateTags('dashboard', 'payments', 'projects');

    recordAuditLog({
      actorUserId: guard.session.userId,
      actorEmail: guard.session.email,
      actorUserType: guard.session.userType,
      action: 'PAYMENT_TRANSACTION_RECORDED',
      entityTable: 'payments',
      entityId: result.transaction?.id || projectId,
      details: `Recorded payment of ₹${Number(amount).toLocaleString('en-IN')} via ${paymentMode} (Ref: ${referenceNumber}) for Project ${projectId}. Receipt: ${result.transaction?.receiptNumber}`,
      status: 'SUCCESS',
    });

    return NextResponse.json({
      success: true,
      message: `Payment of ₹${Number(amount).toLocaleString('en-IN')} successfully recorded. Receipt: ${result.transaction?.receiptNumber}`,
      data: {
        transaction: result.transaction,
        payment: result.payment,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: err.message || 'Failed to record payment transaction' } },
      { status: 500 }
    );
  }
}

