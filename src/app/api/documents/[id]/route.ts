import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/auth/server-guard';
import { db } from '@/lib/db';
import { recordAuditLog } from '@/lib/audit';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/documents/[id] - Get document details
export async function GET(req: NextRequest, context: RouteContext) {
  const guard = await guardApiRequest(req, 'documents', 'read');
  if (!guard.authorized || !guard.session) {
    return guard.response!;
  }

  const { id } = await context.params;
  const doc = db.documents.get(id);

  if (!doc) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } },
      { status: 404 }
    );
  }

  const cust = db.customers.get(doc.customerId);
  const proj = db.projects.get(doc.projectId);

  return NextResponse.json({
    success: true,
    data: {
      ...doc,
      projectCode: proj?.projectCode,
      projectName: proj?.projectName,
      customerName: `${cust?.firstName} ${cust?.lastName}`,
      customerType: cust?.customerType,
    },
  });
}

// PATCH /api/documents/[id] - Verify, Reject, or Replace a document
export async function PATCH(req: NextRequest, context: RouteContext) {
  const guard = await guardApiRequest(req, 'documents', 'update');
  if (!guard.authorized || !guard.session) {
    return guard.response!;
  }

  try {
    const { id } = await context.params;
    const doc = db.documents.get(id);

    if (!doc) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { action, status, reason, remarks, fileName, fileType, fileSize, fileSizeBytes } = body;

    const actor = {
      userId: guard.session.userId,
      name: guard.session.username || guard.session.email.split('@')[0],
      role: guard.session.userType,
    };

    if (action === 'replace') {
      if (!fileName) {
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_INPUT', message: 'Replacement file name is required' } },
          { status: 400 }
        );
      }

      const result = db.replaceDocument(id, {
        fileName,
        fileType,
        fileSize,
        fileSizeBytes: Number(fileSizeBytes),
        remarks,
        actor,
      });

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: { code: 'REPLACE_FAILED', message: result.error } },
          { status: 400 }
        );
      }

      recordAuditLog({
        actorUserId: guard.session.userId,
        actorEmail: guard.session.email,
        actorUserType: guard.session.userType,
        action: 'DOCUMENT_REPLACED',
        entityTable: 'documents',
        entityId: id,
        details: `Replaced document '${doc.docTypeName}' with new version (v${result.document?.version}) '${fileName}'.`,
        status: 'SUCCESS',
      });

      return NextResponse.json({
        success: true,
        message: `Document '${doc.docTypeName}' successfully updated to version ${result.document?.version}.`,
        data: result.document,
      });
    }

    // Verification Workflow (Verify / Reject / Under Review)
    if (status === 'verified' || status === 'rejected' || status === 'under_review') {
      // Employees cannot approve their own documents unless super_admin or admin
      if (status === 'verified' && guard.session.userType === 'customer') {
        return NextResponse.json(
          { success: false, error: { code: 'UNAUTHORIZED', message: 'Customers cannot verify documents' } },
          { status: 403 }
        );
      }

      const result = db.updateDocumentVerification(id, {
        status,
        reason,
        actor,
      });

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
        action: status === 'verified' ? 'DOCUMENT_VERIFIED' : status === 'rejected' ? 'DOCUMENT_REJECTED' : 'DOCUMENT_STATUS_CHANGED',
        entityTable: 'documents',
        entityId: id,
        details: `Updated verification status of '${doc.docTypeName}' to '${status.toUpperCase()}'${reason ? ` (Reason: ${reason})` : ''}.`,
        status: 'SUCCESS',
      });

      return NextResponse.json({
        success: true,
        message: `Document '${doc.docTypeName}' marked as ${status.toUpperCase()}.`,
        data: result.document,
      });
    }

    return NextResponse.json(
      { success: false, error: { code: 'INVALID_ACTION', message: 'Invalid action or status specified' } },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: err.message || 'Failed to update document' } },
      { status: 500 }
    );
  }
}

// DELETE /api/documents/[id] - Delete a document
export async function DELETE(req: NextRequest, context: RouteContext) {
  const guard = await guardApiRequest(req, 'documents', 'delete');
  if (!guard.authorized || !guard.session) {
    return guard.response!;
  }

  const { id } = await context.params;
  const doc = db.documents.get(id);

  if (!doc) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } },
      { status: 404 }
    );
  }

  // Permission check: Verified documents cannot be deleted by employees
  if (doc.verificationStatus === 'verified' && guard.session.userType === 'employee') {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Verified statutory documents can only be deleted by Admins' } },
      { status: 403 }
    );
  }

  db.deleteDocument(id);

  recordAuditLog({
    actorUserId: guard.session.userId,
    actorEmail: guard.session.email,
    actorUserType: guard.session.userType,
    action: 'DOCUMENT_DELETED',
    entityTable: 'documents',
    entityId: id,
    details: `Deleted document '${doc.docTypeName}' (${doc.fileName}) from Project ${doc.projectId}.`,
    status: 'SUCCESS',
  });

  return NextResponse.json({
    success: true,
    message: `Document '${doc.docTypeName}' successfully deleted.`,
  });
}
