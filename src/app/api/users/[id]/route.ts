import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/auth/server-guard';
import { db } from '@/lib/db';
import { recordAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const targetUserId = params.id;
  const guard = await guardApiRequest(req, 'users', 'read');
  if (!guard.authorized || !guard.session) {
    return guard.response!;
  }

  const user = db.users.get(targetUserId);
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
      { status: 404 }
    );
  }

  let profileData: any = null;
  let reportingAdminName = 'N/A';

  if (user.userType === 'admin') {
    profileData = Array.from(db.admins.values()).find((a) => a.userId === user.id) || null;
  } else if (user.userType === 'employee') {
    const emp = Array.from(db.employees.values()).find((e) => e.userId === user.id) || null;
    profileData = emp;
    if (emp) {
      const adm = db.admins.get(emp.reportingAdminId);
      if (adm) reportingAdminName = `${adm.firstName} ${adm.lastName}`;
    }
  } else if (user.userType === 'customer') {
    profileData = Array.from(db.customers.values()).find((c) => c.userId === user.id) || null;
  }

  return NextResponse.json({
    success: true,
    data: {
      ...user,
      profile: profileData,
      reportingAdminName,
    },
  });
}

// PATCH /api/users/[id] - Edit user profile, contact, or reporting admin
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const targetUserId = params.id;
  const guard = await guardApiRequest(req, 'users', 'update');
  if (!guard.authorized || !guard.session) {
    return guard.response!;
  }

  const { userType, userId } = guard.session;

  // Employees can only update their own profile fields
  if (userType === 'employee' && userId !== targetUserId) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Employees can only edit their own profile.' } },
      { status: 403 }
    );
  }

  const targetUser = db.users.get(targetUserId);
  if (!targetUser) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
      { status: 404 }
    );
  }

  try {
    const body = await req.json();
    const {
      firstName,
      lastName,
      phoneNumber,
      email,
      department,
      designation,
      branchRegion,
      reportingAdminId,
    } = body;

    // Update base user fields
    if (phoneNumber) targetUser.phoneNumber = phoneNumber;
    if (email && userType === 'super_admin') targetUser.email = email.trim().toLowerCase();
    targetUser.updatedAt = new Date().toISOString();

    // Update profile
    if (targetUser.userType === 'admin') {
      const admin = Array.from(db.admins.values()).find((a) => a.userId === targetUser.id);
      if (admin) {
        if (firstName) admin.firstName = firstName;
        if (lastName) admin.lastName = lastName;
        if (branchRegion) admin.branchRegion = branchRegion;
        if (department) admin.department = department;
      }
    } else if (targetUser.userType === 'employee') {
      const emp = Array.from(db.employees.values()).find((e) => e.userId === targetUser.id);
      if (emp) {
        if (firstName) emp.firstName = firstName;
        if (lastName) emp.lastName = lastName;
        if (department) emp.department = department;
        if (designation) emp.designation = designation;
        if (branchRegion) emp.assignedRegion = branchRegion;
        // Reassignment of reporting admin is restricted to Super Admin
        if (reportingAdminId && userType === 'super_admin') {
          emp.reportingAdminId = reportingAdminId;
        }
      }
    }

    recordAuditLog({
      actorUserId: guard.session.userId,
      actorEmail: guard.session.email,
      actorUserType: guard.session.userType,
      action: 'USER_UPDATED',
      entityTable: 'users',
      entityId: targetUserId,
      details: `Updated details for ${targetUser.email}`,
      status: 'SUCCESS',
    });

    return NextResponse.json({
      success: true,
      message: 'User details updated successfully.',
      data: targetUser,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
