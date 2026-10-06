import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/auth/server-guard';
import { db } from '@/lib/db';
import { recordAuditLog } from '@/lib/audit';

// PATCH /api/users/[id]/status - Enable or Disable a user
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const targetUserId = params.id;
  const guard = await guardApiRequest(req, 'users', 'manage');
  if (!guard.authorized || !guard.session) {
    return guard.response!;
  }

  if (guard.session.userType !== 'super_admin') {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Only Super Admin can change account status.' } },
      { status: 403 }
    );
  }

  const targetUser = db.users.get(targetUserId);
  if (!targetUser) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
      { status: 404 }
    );
  }

  // Prevent super admin from disabling their own root account
  if (targetUser.id === guard.session.userId) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_ACTION', message: 'You cannot disable your own active Super Admin account.' } },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const newStatus = body.status || (targetUser.status === 'active' ? 'inactive' : 'active');

  targetUser.status = newStatus;
  targetUser.updatedAt = new Date().toISOString();

  recordAuditLog({
    actorUserId: guard.session.userId,
    actorEmail: guard.session.email,
    actorUserType: guard.session.userType,
    action: `USER_STATUS_${newStatus.toUpperCase()}`,
    entityTable: 'users',
    entityId: targetUserId,
    details: `Changed status of ${targetUser.email} to ${newStatus}`,
    status: 'SUCCESS',
  });

  return NextResponse.json({
    success: true,
    message: `Account status updated to ${newStatus}.`,
    data: { id: targetUser.id, email: targetUser.email, status: targetUser.status },
  });
}
