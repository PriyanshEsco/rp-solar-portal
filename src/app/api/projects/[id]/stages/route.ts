import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { guardApiRequest } from '@/lib/auth/server-guard';
import { db } from '@/lib/db';
import { checkOwnership } from '@/lib/auth/rbac';
import { recordAuditLog } from '@/lib/audit';
import { StageStatus } from '@/lib/types';

// PATCH /api/projects/[id]/stages - Update stage status, completion date, remarks, and documents with immutable audit history
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

  // Validate ownership
  const ownership = checkOwnership(guard.session, 'projects', projectId);
  if (!ownership.allowed) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN_OWNERSHIP_VIOLATION', message: ownership.reason } },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const {
      stageKey,
      status,
      completionDate,
      remarks,
      documentName,
      documentUrl,
    } = body;

    if (!stageKey || !status) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'stageKey and status are required.' } },
        { status: 400 }
      );
    }

    const validStatuses: StageStatus[] = ['not_started', 'in_progress', 'completed', 'blocked', 'not_applicable'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_STATUS', message: `Invalid status. Allowed: ${validStatuses.join(', ')}` } },
        { status: 400 }
      );
    }

    let docAttachment = undefined;
    if (documentName) {
      docAttachment = {
        id: `doc-${crypto.randomBytes(4).toString('hex')}`,
        name: documentName,
        url: documentUrl || `/uploads/projects/${projectId}/${documentName}`,
        uploadedAt: new Date().toISOString(),
      };
    }

    // Resolve actor details
    const actorUser = {
      userId: guard.session.userId,
      name: guard.session.username || guard.session.email.split('@')[0],
      role: guard.session.userType,
    };

    const updateResult = db.updateProjectStage(
      projectId,
      stageKey,
      {
        status,
        completionDate,
        remarks,
        document: docAttachment,
      },
      actorUser
    );

    if (!updateResult.success) {
      return NextResponse.json(
        { success: false, error: { code: 'STAGE_UPDATE_ERROR', message: updateResult.error } },
        { status: 400 }
      );
    }

    recordAuditLog({
      actorUserId: guard.session.userId,
      actorEmail: guard.session.email,
      actorUserType: guard.session.userType,
      action: 'PROJECT_STAGE_TRANSITION',
      entityTable: 'projects',
      entityId: projectId,
      details: `Project ${project.projectCode} transitioned stage '${stageKey}' to status '${status}'. Remarks: ${remarks || 'None'}`,
      status: 'SUCCESS',
    });

    return NextResponse.json({
      success: true,
      message: `Stage '${stageKey}' successfully transitioned to '${status}'.`,
      data: {
        project: updateResult.project,
        updatedStage: updateResult.project?.stages?.find((s) => s.stageKey === stageKey),
        history: updateResult.project?.stageHistory,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: err.message || 'Failed to update project stage' } },
      { status: 500 }
    );
  }
}
