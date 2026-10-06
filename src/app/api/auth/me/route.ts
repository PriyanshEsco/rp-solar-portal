import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/server-guard';
import { db } from '@/lib/db';
import { getAdminManagedCustomerIds, getAdminManagedEmployeeIds } from '@/lib/auth/rbac';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);

  if (!session) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated or session expired' },
      },
      { status: 401 }
    );
  }

  const user = db.users.get(session.userId);
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'USER_NOT_FOUND', message: 'User does not exist' } },
      { status: 404 }
    );
  }

  // Get associated profile
  let profileData: any = null;
  let managedScope: any = {};

  if (session.userType === 'admin') {
    const admin = db.admins.get(session.profileId);
    profileData = admin;
    managedScope = {
      managedEmployeeIds: getAdminManagedEmployeeIds(session.profileId),
      managedCustomerIds: getAdminManagedCustomerIds(session.profileId),
      region: admin?.branchRegion,
    };
  } else if (session.userType === 'employee') {
    const employee = db.employees.get(session.profileId);
    profileData = employee;
    const assignedCustomers = Array.from(db.customers.values())
      .filter((c) => c.assignedEmployeeId === session.profileId)
      .map((c) => c.id);
    const assignedProjects = Array.from(db.projects.values())
      .filter((p) => p.assignedEngineerId === session.profileId)
      .map((p) => p.id);

    managedScope = {
      reportingAdminId: employee?.reportingAdminId,
      assignedCustomerIds: assignedCustomers,
      assignedProjectIds: assignedProjects,
      department: employee?.department,
    };
  } else if (session.userType === 'customer') {
    const customer = db.customers.get(session.profileId);
    profileData = customer;
  }

  return NextResponse.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        userType: user.userType,
        status: user.status,
        lastLoginAt: user.lastLoginAt,
      },
      session: {
        sessionId: session.sessionId,
        profileId: session.profileId,
        userType: session.userType,
      },
      profile: profileData,
      scope: managedScope,
    },
  });
}
