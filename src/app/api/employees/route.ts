import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/auth/server-guard';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const guard = await guardApiRequest(req, 'employees', 'read');
  if (!guard.authorized || !guard.session) {
    return guard.response!;
  }

  const { userType, profileId } = guard.session;
  let accessibleEmployees: any[] = [];

  if (userType === 'super_admin') {
    accessibleEmployees = Array.from(db.employees.values());
  } else if (userType === 'admin') {
    accessibleEmployees = Array.from(db.employees.values()).filter((e) => e.reportingAdminId === profileId);
  } else if (userType === 'employee') {
    const self = db.employees.get(profileId);
    if (self) accessibleEmployees = [self];
  }

  return NextResponse.json({
    success: true,
    data: accessibleEmployees,
    meta: {
      count: accessibleEmployees.length,
      scope: userType,
    },
  });
}
