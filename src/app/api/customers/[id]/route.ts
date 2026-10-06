import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/auth/server-guard';
import { db } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const customerId = params.id;

  // Enforce both base permission AND resource ownership!
  const guard = await guardApiRequest(req, 'customers', 'read', customerId);
  if (!guard.authorized || !guard.session) {
    return guard.response!;
  }

  const customer = db.customers.get(customerId);
  if (!customer) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: `Customer ${customerId} not found` } },
      { status: 404 }
    );
  }

  // Also include customer's projects
  const projects = Array.from(db.projects.values()).filter((p) => p.customerId === customer.id);

  return NextResponse.json({
    success: true,
    data: {
      ...customer,
      projects,
    },
  });
}
