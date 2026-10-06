import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/auth/server-guard';
import { db } from '@/lib/db';
import { recordAuditLog } from '@/lib/audit';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/subsidy/[id] - Fetch single subsidy record
export async function GET(req: NextRequest, context: { params: { id: string } | Promise<{ id: string }> }) {
  const guard = await guardApiRequest(req, 'subsidy', 'read');
  if (!guard.authorized || !guard.session) {
    return guard.response!;
  }

  const { id } = await Promise.resolve(context.params);
  let sub = db.subsidies.get(id) || Array.from(db.subsidies.values()).find((s) => s.projectId === id);
  if (!sub && db.projects.has(id)) {
    sub = db.getOrCreateSubsidy(id);
  }

  if (!sub) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Subsidy record not found' } },
      { status: 404 }
    );
  }

  const proj = db.projects.get(sub.projectId);
  const cust = proj ? db.customers.get(proj.customerId) : null;

  return NextResponse.json({
    success: true,
    data: {
      ...sub,
      projectCode: proj?.projectCode,
      projectName: proj?.projectName,
      customerName: cust ? `${cust.firstName} ${cust.lastName}` : 'Client',
    },
  });
}

// PATCH /api/subsidy/[id] - Update subsidy status, inspection status, or DBT redemption
export async function PATCH(req: NextRequest, context: { params: { id: string } | Promise<{ id: string }> }) {
  const guard = await guardApiRequest(req, 'subsidy', 'update');
  if (!guard.authorized || !guard.session) {
    return guard.response!;
  }

  try {
    const { id } = await Promise.resolve(context.params);
    let sub = db.subsidies.get(id) || Array.from(db.subsidies.values()).find((s) => s.projectId === id);
    if (!sub && db.projects.has(id)) {
      sub = db.getOrCreateSubsidy(id);
    }

    if (!sub) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Subsidy record not found' } },
        { status: 404 }
      );
    }

    const body = await req.json();
    const actor = {
      userId: guard.session.userId,
      name: guard.session.username || guard.session.email.split('@')[0],
      role: guard.session.userType,
    };

    const result = db.updateSubsidy(sub.projectId, body, actor);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: 'UPDATE_FAILED', message: result.error } },
        { status: 400 }
      );
    }

    recordAuditLog({
      actorUserId: guard.session.userId,
      actorEmail: guard.session.email,
      actorUserType: guard.session.userType,
      action: 'SUBSIDY_STATUS_UPDATED',
      entityTable: 'subsidies',
      entityId: sub.id,
      details: `Updated subsidy status to '${result.subsidy?.subsidyStatus}' (Inspection: ${result.subsidy?.inspectionStatus}) for Project ${sub.projectId}.`,
      status: 'SUCCESS',
    });

    return NextResponse.json({
      success: true,
      message: 'Subsidy record successfully updated.',
      data: result.subsidy,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: err.message || 'Failed to update subsidy' } },
      { status: 500 }
    );
  }
}
