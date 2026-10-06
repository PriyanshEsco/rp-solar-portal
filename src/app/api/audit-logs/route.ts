import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/auth/server-guard';
import { getAuditLogs, recordAuditLog } from '@/lib/audit';
import { getAdminManagedEmployeeIds } from '@/lib/auth/rbac';

export async function GET(req: NextRequest) {
  // Check permission: 'audit_logs:read' (Super Admin, Admin, Employee with appropriate role scoping)
  const guard = await guardApiRequest(req, 'audit_logs', 'read');
  if (!guard.authorized || !guard.session) {
    return guard.response!;
  }

  const { searchParams } = new URL(req.url);
  const moduleParam = searchParams.get('module') || undefined;
  const actionParam = searchParams.get('action') || undefined;
  const searchParam = searchParams.get('search') || undefined;
  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;
  const pageParam = searchParams.get('page');
  const limitParam = searchParams.get('limit') || searchParams.get('pageSize');
  const exportFormat = searchParams.get('export');

  // Compute scope
  let managedEmployeeIds: string[] | undefined = undefined;
  if (guard.session.userType === 'admin') {
    managedEmployeeIds = getAdminManagedEmployeeIds(guard.session.profileId);
  }

  const allFilteredLogs = getAuditLogs(
    10000,
    {
      module: moduleParam,
      action: actionParam,
      search: searchParam,
      startDate,
      endDate,
    },
    {
      role: guard.session.userType,
      profileId: guard.session.profileId,
      userId: guard.session.userId,
      managedEmployeeIds,
    }
  );

  // Handle CSV export
  if (exportFormat === 'csv') {
    const csvHeader = 'Timestamp,Actor Name,Actor Email,Actor Role,Action,Module,Record,Previous Value,New Value,Status,Details\n';
    const csvRows = allFilteredLogs.map((l) => {
      const escape = (str?: string) => `"${(str || '').replace(/"/g, '""')}"`;
      return [
        escape(l.timestamp || l.createdAt),
        escape(l.actorName || l.actorEmail || 'System'),
        escape(l.actorEmail || ''),
        escape(l.actorRole || l.actorUserType || ''),
        escape(l.action),
        escape(l.module || l.entityTable),
        escape(l.recordIdentifier || l.entityId),
        escape(l.previousValue || ''),
        escape(l.newValue || ''),
        escape(l.status),
        escape(l.details),
      ].join(',');
    });

    const csvContent = csvHeader + csvRows.join('\n');
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="RP_Solar_Audit_Trail_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  }

  const total = allFilteredLogs.length;
  const page = Math.max(1, parseInt(pageParam || '1', 10));
  const limit = limitParam === 'all' ? total : Math.max(1, parseInt(limitParam || '50', 10));
  const totalPages = Math.ceil(total / limit) || 1;
  const paginatedLogs = limitParam === 'all' ? allFilteredLogs : allFilteredLogs.slice((page - 1) * limit, page * limit);

  return NextResponse.json({
    success: true,
    data: paginatedLogs,
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
    meta: {
      count: paginatedLogs.length,
      total,
      retrievedBy: guard.session.email,
      role: guard.session.userType,
      scopingApplied:
        guard.session.userType === 'super_admin'
          ? 'Pan-India Enterprise Complete'
          : guard.session.userType === 'admin'
          ? `Admin Managed Team (${managedEmployeeIds?.length || 0} Staff)`
          : 'Assigned Portfolio & Own Actions',
    },
  });
}

export async function POST(req: NextRequest) {
  const guard = await guardApiRequest(req, 'audit_logs', 'manage');
  if (!guard.authorized || !guard.session) {
    return guard.response!;
  }

  try {
    const body = await req.json();
    const { action, module, entityTable, entityId, recordIdentifier, previousValue, newValue, details, status } = body;

    if (!action || !entityId || !details) {
      return NextResponse.json(
        { success: false, error: 'action, entityId, and details are required' },
        { status: 400 }
      );
    }

    const log = recordAuditLog({
      actorUserId: guard.session.userId,
      actorName: guard.session.username,
      actorEmail: guard.session.email,
      actorUserType: guard.session.userType,
      action,
      module: module || entityTable || 'system',
      entityTable: entityTable || 'system',
      entityId,
      recordIdentifier,
      previousValue,
      newValue,
      details,
      status: status || 'SUCCESS',
    });

    return NextResponse.json({
      success: true,
      data: log,
      message: 'Audit record permanently added to immutable ledger',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to record audit log' },
      { status: 500 }
    );
  }
}
