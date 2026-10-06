import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/server-guard';
import { verifyOwnership, hasBasePermission, PermissionModule } from '@/lib/auth/rbac';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);

  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'You must be logged in to run ownership tests.' } },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { module, resourceId } = body;

  if (!module || !resourceId) {
    // Run an automated matrix of standard cross-tenant tamper attempts
    const testCases = [
      {
        title: 'Tamper Attempt: Query Customer 1 (Anil Gupta - North)',
        module: 'customers' as PermissionModule,
        resourceId: 'cust-prof-anil',
        expectedBehavior:
          session.userType === 'super_admin'
            ? 'ALLOWED (Super Admin Global Scope)'
            : session.userType === 'admin' && session.profileId === 'adm-prof-north'
            ? 'ALLOWED (Customer managed under North Admin)'
            : session.userType === 'employee' && session.profileId === 'emp-prof-rahul'
            ? 'ALLOWED (Customer assigned to Rahul)'
            : 'BLOCKED (403 Forbidden - Ownership Violation)',
      },
      {
        title: 'Tamper Attempt: Query Customer 2 (Priya Krishna - South)',
        module: 'customers' as PermissionModule,
        resourceId: 'cust-prof-priya',
        expectedBehavior:
          session.userType === 'super_admin'
            ? 'ALLOWED (Super Admin Global Scope)'
            : session.userType === 'admin' && session.profileId === 'adm-prof-south'
            ? 'ALLOWED (Customer managed under South Admin)'
            : session.userType === 'employee' && session.profileId === 'emp-prof-vikram'
            ? 'ALLOWED (Customer assigned to Vikram)'
            : 'BLOCKED (403 Forbidden - Ownership Violation)',
      },
      {
        title: 'Tamper Attempt: Query Project 2 (Bangalore 25kW)',
        module: 'projects' as PermissionModule,
        resourceId: 'proj-blr-002',
        expectedBehavior:
          session.userType === 'super_admin'
            ? 'ALLOWED'
            : session.userType === 'admin' && session.profileId === 'adm-prof-south'
            ? 'ALLOWED'
            : session.userType === 'employee' && session.profileId === 'emp-prof-vikram'
            ? 'ALLOWED'
            : 'BLOCKED (403 Forbidden - Ownership Violation)',
      },
      {
        title: 'Tamper Attempt: Query Employee 2 Profile (Vikram Nair - South)',
        module: 'employees' as PermissionModule,
        resourceId: 'emp-prof-vikram',
        expectedBehavior:
          session.userType === 'super_admin'
            ? 'ALLOWED'
            : session.userType === 'admin' && session.profileId === 'adm-prof-south'
            ? 'ALLOWED'
            : session.profileId === 'emp-prof-vikram'
            ? 'ALLOWED'
            : 'BLOCKED (403 Forbidden - Not managed by caller)',
      },
      {
        title: 'Permission Check: Access Executive Reports',
        module: 'reports' as PermissionModule,
        resourceId: 'reports-summary',
        expectedBehavior:
          session.userType === 'super_admin' || session.userType === 'admin'
            ? 'ALLOWED'
            : 'BLOCKED (403 Forbidden - Missing base permission)',
      },
      {
        title: 'Permission Check: Access Audit Logs',
        module: 'audit_logs' as PermissionModule,
        resourceId: 'audit-ledger',
        expectedBehavior:
          session.userType === 'super_admin' || session.userType === 'admin'
            ? 'ALLOWED'
            : 'BLOCKED (403 Forbidden - Restricted to Admins)',
      },
    ];

    const results = testCases.map((tc) => {
      const basePerm = hasBasePermission(session.userType, tc.module, 'read');
      if (!basePerm) {
        return {
          ...tc,
          hasBasePermission: false,
          ownershipCheck: { allowed: false, reason: `Role ${session.userType} lacks base permission` },
          status: 'BLOCKED (403 Forbidden - Permission Denied)',
          passed: tc.expectedBehavior.startsWith('BLOCKED'),
        };
      }

      const ownership = verifyOwnership(session, tc.module, tc.resourceId);
      const isAllowed = ownership.allowed;
      return {
        ...tc,
        hasBasePermission: true,
        ownershipCheck: ownership,
        status: isAllowed ? 'ALLOWED (200 OK)' : `BLOCKED (403 Forbidden: ${ownership.reason})`,
        passed: isAllowed ? tc.expectedBehavior.startsWith('ALLOWED') : tc.expectedBehavior.startsWith('BLOCKED'),
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        activeUser: {
          email: session.email,
          userType: session.userType,
          profileId: session.profileId,
          region: session.assignedRegion,
        },
        testResults: results,
      },
    });
  }

  // Single test case
  const basePerm = hasBasePermission(session.userType, module, 'read');
  if (!basePerm) {
    return NextResponse.json({
      success: false,
      error: {
        code: 'FORBIDDEN_BASE_PERMISSION',
        message: `Role ${session.userType} has no permission to read ${module}`,
      },
    });
  }

  const ownership = verifyOwnership(session, module, resourceId);
  return NextResponse.json({
    success: ownership.allowed,
    ownershipResult: ownership,
  });
}
