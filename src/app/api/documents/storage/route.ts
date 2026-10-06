import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/auth/server-guard';
import { db } from '@/lib/db';
import { checkOwnership } from '@/lib/auth/rbac';

// GET /api/documents/storage - Secure Object Storage simulation for document streaming/download
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const docId = url.searchParams.get('docId');
  const isDownload = url.searchParams.get('download') === 'true';

  if (!docId) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_INPUT', message: 'Document ID is required' } },
      { status: 400 }
    );
  }

  // Enforce server-side RBAC and document ownership
  const guard = await guardApiRequest(req, 'documents', 'read', docId);
  if (!guard.authorized || !guard.session) {
    return guard.response!;
  }

  const doc = db.documents.get(docId);
  if (!doc) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Document not found in storage bucket' } },
      { status: 404 }
    );
  }

  const proj = db.projects.get(doc.projectId);
  const cust = db.customers.get(doc.customerId);

  // Return secure storage payload metadata
  const payload = {
    documentId: doc.id,
    fileName: doc.fileName,
    docTypeName: doc.docTypeName,
    fileType: doc.fileType || 'application/pdf',
    fileSize: doc.fileSize,
    storageKey: doc.storageKey || `projects/${proj?.projectCode || 'PROJ'}/documents/${doc.fileName}`,
    storageBucket: 'rpsolar-prod-secure-vault-ap-south-1',
    checksumSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    verificationStatus: doc.verificationStatus,
    uploadedAt: doc.uploadedAt,
    uploadedBy: doc.uploadedByUserName,
    verifiedBy: doc.verifiedBy,
    version: doc.version || 1,
    project: {
      code: proj?.projectCode,
      name: proj?.projectName,
      capacityKw: proj?.capacityKw,
    },
    customer: {
      name: `${cust?.firstName} ${cust?.lastName}`,
      type: cust?.customerType,
      district: cust?.district,
    },
  };

  if (isDownload) {
    const headers = new Headers();
    headers.set('Content-Disposition', `attachment; filename="${doc.fileName}"`);
    headers.set('Content-Type', doc.fileType || 'application/pdf');
    headers.set('X-RPSolar-Storage-Key', doc.storageKey || '');

    return new NextResponse(
      JSON.stringify({
        status: 'BINARY_STREAM_SIMULATION',
        metadata: payload,
        contentNotice: 'Simulated binary object downloaded from secure cloud storage vault.',
      }),
      {
        status: 200,
        headers,
      }
    );
  }

  return NextResponse.json({
    success: true,
    data: payload,
  });
}
