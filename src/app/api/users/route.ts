import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { guardApiRequest } from '@/lib/auth/server-guard';
import { db } from '@/lib/db';
import { recordAuditLog } from '@/lib/audit';
import { User, AdminProfile, EmployeeProfile } from '@/lib/types';
import { getAdminManagedEmployeeIds } from '@/lib/auth/rbac';

// GET /api/users - List users with strict role hierarchy scoping
export async function GET(req: NextRequest) {
  const guard = await guardApiRequest(req, 'users', 'read');
  if (!guard.authorized || !guard.session) {
    return guard.response!;
  }

  const { userType, profileId, userId } = guard.session;
  const url = new URL(req.url);
  const roleFilter = url.searchParams.get('role');
  const searchFilter = url.searchParams.get('search')?.toLowerCase();

  let userRecords: any[] = [];

  if (userType === 'super_admin') {
    // Super Admin sees ALL users
    userRecords = Array.from(db.users.values());
  } else if (userType === 'admin') {
    // Admin can ONLY see employees assigned to them (and self)
    const managedEmpProfileIds = new Set(getAdminManagedEmployeeIds(profileId));
    const managedUserIds = new Set<string>();

    for (const emp of Array.from(db.employees.values())) {
      if (managedEmpProfileIds.has(emp.id)) {
        managedUserIds.add(emp.userId);
      }
    }
    // Add self
    managedUserIds.add(userId);

    userRecords = Array.from(db.users.values()).filter((u) => managedUserIds.has(u.id));
  } else {
    // Employee sees only self
    userRecords = Array.from(db.users.values()).filter((u) => u.id === userId);
  }

  // Enrich each user with their profile and reporting Admin details
  let enriched = userRecords.map((u) => {
    let profileData: any = null;
    let reportingAdminName = 'N/A';
    let reportingAdminId = null;

    if (u.userType === 'admin') {
      const admin = Array.from(db.admins.values()).find((a) => a.userId === u.id);
      profileData = admin || null;
    } else if (u.userType === 'employee') {
      const emp = Array.from(db.employees.values()).find((e) => e.userId === u.id);
      profileData = emp || null;
      if (emp) {
        const adm = db.admins.get(emp.reportingAdminId);
        if (adm) {
          reportingAdminName = `${adm.firstName} ${adm.lastName} (${adm.branchRegion})`;
          reportingAdminId = adm.id;
        }
      }
    } else if (u.userType === 'customer') {
      const cust = Array.from(db.customers.values()).find((c) => c.userId === u.id);
      profileData = cust || null;
    }

    return {
      id: u.id,
      email: u.email,
      username: u.username,
      phoneNumber: u.phoneNumber,
      userType: u.userType,
      status: u.status,
      joiningDate: u.joiningDate,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      profile: profileData,
      reportingAdminName,
      reportingAdminId,
      name: profileData ? `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim() : u.username,
    };
  });

  // Apply filters
  if (roleFilter && roleFilter !== 'all') {
    enriched = enriched.filter((u) => u.userType === roleFilter);
  }

  if (searchFilter) {
    enriched = enriched.filter(
      (u) =>
        u.name.toLowerCase().includes(searchFilter) ||
        u.email.toLowerCase().includes(searchFilter) ||
        u.username.toLowerCase().includes(searchFilter) ||
        u.phoneNumber.toLowerCase().includes(searchFilter)
    );
  }

  return NextResponse.json({
    success: true,
    data: enriched,
    meta: {
      total: enriched.length,
      callerRole: userType,
    },
  });
}

// POST /api/users - Super Admin creates Admin or Employee
export async function POST(req: NextRequest) {
  const guard = await guardApiRequest(req, 'users', 'create');
  if (!guard.authorized || !guard.session) {
    return guard.response!;
  }

  if (guard.session.userType !== 'super_admin') {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only Super Admin is authorized to onboard new enterprise users.' },
      },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const {
      email,
      username,
      phoneNumber,
      password = 'Password123!',
      userType,
      firstName,
      lastName,
      department,
      designation,
      branchRegion,
      reportingAdminId,
    } = body;

    if (!email || !userType || !firstName || !lastName) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Email, user type, first name, and last name are required.' } },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const exists = Array.from(db.users.values()).some((u) => u.email.toLowerCase() === normalizedEmail);
    if (exists) {
      return NextResponse.json(
        { success: false, error: { code: 'USER_EXISTS', message: `User with email ${email} already exists.` } },
        { status: 409 }
      );
    }

    const userId = `usr-${crypto.randomBytes(6).toString('hex')}`;
    const newUser: User = {
      id: userId,
      email: normalizedEmail,
      username: username || normalizedEmail.split('@')[0],
      phoneNumber: phoneNumber || '+91 98110 00000',
      passwordHash: bcrypt.hashSync(password, 10),
      userType,
      status: 'active',
      joiningDate: new Date().toISOString().split('T')[0],
      failedLoginAttempts: 0,
      lockoutUntil: null,
      lastLoginAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.users.set(userId, newUser);

    // Create Profile
    if (userType === 'admin') {
      const adminProfileId = `adm-prof-${crypto.randomBytes(4).toString('hex')}`;
      const adminProf: AdminProfile = {
        id: adminProfileId,
        userId,
        firstName,
        lastName,
        branchRegion: branchRegion || 'Headquarters / North',
        department: department || 'Operations',
        canManageEmployees: true,
      };
      db.admins.set(adminProfileId, adminProf);
    } else if (userType === 'employee') {
      // Find admin
      const admin = reportingAdminId ? db.admins.get(reportingAdminId) : Array.from(db.admins.values())[0];
      const empProfileId = `emp-prof-${crypto.randomBytes(4).toString('hex')}`;
      const empCode = `EMP-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

      const empProf: EmployeeProfile = {
        id: empProfileId,
        userId,
        reportingAdminId: admin ? admin.id : 'adm-prof-north',
        employeeCode: empCode,
        firstName,
        lastName,
        department: department || 'sales',
        designation: designation || 'Project Executive',
        assignedRegion: branchRegion || admin?.branchRegion || 'Delhi/NCR',
        maxActiveProjects: 25,
      };
      db.employees.set(empProfileId, empProf);
    }

    recordAuditLog({
      actorUserId: guard.session.userId,
      actorEmail: guard.session.email,
      actorUserType: guard.session.userType,
      action: 'USER_CREATED',
      entityTable: 'users',
      entityId: userId,
      details: `Created new user ${newUser.email} with role ${userType} (${firstName} ${lastName})`,
      status: 'SUCCESS',
    });

    return NextResponse.json({
      success: true,
      data: {
        id: userId,
        email: newUser.email,
        username: newUser.username,
        userType: newUser.userType,
        status: newUser.status,
      },
      message: `User ${firstName} ${lastName} has been successfully registered.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
