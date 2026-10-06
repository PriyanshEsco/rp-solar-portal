import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/auth/server-guard';
import { db } from '@/lib/db';

// GET /api/employees/[id]/performance
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const employeeId = params.id;

  // Enforce ownership: Admin can ONLY inspect managed employees!
  const guard = await guardApiRequest(req, 'employees', 'read', employeeId);
  if (!guard.authorized || !guard.session) {
    return guard.response!;
  }

  const stats = db.getEmployeePerformance(employeeId);
  if (!stats) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: `Employee ${employeeId} not found` } },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: stats,
  });
}
