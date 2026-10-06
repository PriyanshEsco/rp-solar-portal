import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/auth/server-guard';
import { db } from '@/lib/db';
import { checkOwnership } from '@/lib/auth/rbac';
import { recordAuditLog } from '@/lib/audit';
import { initializeProjectStages, LIFECYCLE_PHASES } from '@/lib/project-stages';

// GET /api/projects/[id] - Fetch single project 360 details with all 26 stages & immutable history
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await guardApiRequest(req, 'projects', 'read');
  if (!guard.authorized || !guard.session) {
    return guard.response!;
  }

  const projectId = params.id;
  const project = db.projects.get(projectId);
  if (!project) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: `Project '${projectId}' not found.` } },
      { status: 404 }
    );
  }

  // Validate multi-tenant ownership
  const ownership = checkOwnership(guard.session, 'projects', projectId);
  if (!ownership.allowed) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN_OWNERSHIP_VIOLATION', message: ownership.reason } },
      { status: 403 }
    );
  }

  // Fetch complete 360 aggregated model
  const project360 = db.getProject360(projectId);
  if (!project360) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Project data could not be aggregated' } },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: project360,
    meta: {
      lifecyclePhases: LIFECYCLE_PHASES,
    },
  });
}

// PATCH /api/projects/[id] - Update project metadata
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await guardApiRequest(req, 'projects', 'update');
  if (!guard.authorized || !guard.session) {
    return guard.response!;
  }

  const projectId = params.id;
  const project = db.projects.get(projectId);
  if (!project) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: `Project '${projectId}' not found.` } },
      { status: 404 }
    );
  }

  const ownership = checkOwnership(guard.session, 'projects', projectId);
  if (!ownership.allowed) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN_OWNERSHIP_VIOLATION', message: ownership.reason } },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { projectName, priority, status, remarks, targetCompletionDate, capacityKw } = body;

    if (projectName !== undefined) project.projectName = projectName;
    if (priority !== undefined) project.priority = priority;
    if (status !== undefined) project.status = status;
    if (remarks !== undefined) project.remarks = remarks;
    if (targetCompletionDate !== undefined) project.targetCompletionDate = targetCompletionDate;
    if (capacityKw !== undefined) {
      project.capacityKw = Number(capacityKw);
      project.totalCost = Number(capacityKw) * 60000;
    }

    recordAuditLog({
      actorUserId: guard.session.userId,
      actorEmail: guard.session.email,
      actorUserType: guard.session.userType,
      action: 'PROJECT_METADATA_UPDATED',
      entityTable: 'projects',
      entityId: projectId,
      details: `Updated metadata for project ${project.projectCode}`,
      status: 'SUCCESS',
    });

    return NextResponse.json({
      success: true,
      message: 'Project metadata updated successfully.',
      data: project,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: err.message || 'Failed to update project' } },
      { status: 500 }
    );
  }
}
