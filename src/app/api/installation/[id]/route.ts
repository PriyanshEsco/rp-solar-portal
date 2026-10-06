import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/auth/server-guard';
import { db } from '@/lib/db';
import { recordAuditLog } from '@/lib/audit';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/installation/[id] - Fetch single installation record
export async function GET(req: NextRequest, context: { params: { id: string } | Promise<{ id: string }> }) {
  const guard = await guardApiRequest(req, 'installation', 'read');
  if (!guard.authorized || !guard.session) {
    return guard.response!;
  }

  const { id } = await Promise.resolve(context.params);
  let inst = db.installations.get(id) || Array.from(db.installations.values()).find((i) => i.projectId === id);
  if (!inst && db.projects.has(id)) {
    inst = db.getOrCreateInstallation(id);
  }

  if (!inst) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Installation record not found' } },
      { status: 404 }
    );
  }

  const proj = db.projects.get(inst.projectId);
  const cust = proj ? db.customers.get(proj.customerId) : null;

  return NextResponse.json({
    success: true,
    data: {
      ...inst,
      projectCode: proj?.projectCode,
      projectName: proj?.projectName,
      customerName: cust ? `${cust.firstName} ${cust.lastName}` : 'Client',
    },
  });
}

// PATCH /api/installation/[id] - Update installation stage or technical specifications
export async function PATCH(req: NextRequest, context: { params: { id: string } | Promise<{ id: string }> }) {
  const guard = await guardApiRequest(req, 'installation', 'update');
  if (!guard.authorized || !guard.session) {
    return guard.response!;
  }

  try {
    const { id } = await Promise.resolve(context.params);
    let inst = db.installations.get(id) || Array.from(db.installations.values()).find((i) => i.projectId === id);
    if (!inst && db.projects.has(id)) {
      inst = db.getOrCreateInstallation(id);
    }

    if (!inst) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Installation record not found' } },
        { status: 404 }
      );
    }

    const body = await req.json();
    const {
      stageKey,
      stageUpdates,
      tiltAngle,
      panelCount,
      panelModel,
      inverterModel,
      inverterSerial,
      structureType,
      leadTechnicianName,
      assignedTeam,
      safetyAuditPassed,
    } = body;

    const actor = {
      userId: guard.session.userId,
      name: guard.session.username || guard.session.email.split('@')[0],
      role: guard.session.userType,
    };

    // Update specific stage if requested
    if (stageKey && stageUpdates) {
      const result = db.updateInstallationStage(inst.projectId, stageKey, stageUpdates, actor);
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: { code: 'STAGE_UPDATE_ERROR', message: result.error } },
          { status: 400 }
        );
      }
      inst = result.installation!;

      recordAuditLog({
        actorUserId: guard.session.userId,
        actorEmail: guard.session.email,
        actorUserType: guard.session.userType,
        action: 'INSTALLATION_STAGE_UPDATED',
        entityTable: 'installations',
        entityId: inst.id,
        details: `Updated installation stage '${stageKey}' to status '${stageUpdates.status}' for Project ${inst.projectId}. Progress: ${inst.installationProgress}%`,
        status: 'SUCCESS',
      });
    }

    // Update technical specs if provided
    if (tiltAngle !== undefined) inst.tiltAngle = Number(tiltAngle);
    if (panelCount !== undefined) inst.panelCount = Number(panelCount);
    if (panelModel !== undefined) inst.panelModel = panelModel;
    if (inverterModel !== undefined) inst.inverterModel = inverterModel;
    if (inverterSerial !== undefined) inst.inverterSerial = inverterSerial;
    if (structureType !== undefined) inst.structureType = structureType;
    if (leadTechnicianName !== undefined) inst.leadTechnicianName = leadTechnicianName;
    if (assignedTeam !== undefined) inst.assignedTeam = assignedTeam;
    if (safetyAuditPassed !== undefined) inst.safetyAuditPassed = safetyAuditPassed;

    inst.updatedAt = new Date().toISOString();

    return NextResponse.json({
      success: true,
      message: 'Installation record successfully updated.',
      data: inst,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: err.message || 'Failed to update installation' } },
      { status: 500 }
    );
  }
}
