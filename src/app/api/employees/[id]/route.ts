import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/auth/server-guard';
import { db } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const employeeId = params.id;

  const guard = await guardApiRequest(req, 'employees', 'read', employeeId);
  if (!guard.authorized || !guard.session) {
    return guard.response!;
  }

  const employee = db.employees.get(employeeId);
  if (!employee) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: `Employee ${employeeId} not found` } },
      { status: 404 }
    );
  }

  // Load assigned customers
  const assignedCustomers = Array.from(db.customers.values()).filter((c) => c.assignedEmployeeId === employee.id);

  return NextResponse.json({
    success: true,
    data: {
      ...employee,
      assignedCustomers,
    },
  });
}
