import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { guardApiRequest } from '@/lib/auth/server-guard';
import { db } from '@/lib/db';
import { recordAuditLog } from '@/lib/audit';

// POST /api/users/[id]/reset-password - Super Admin overrides user password
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const targetUserId = params.id;
  const guard = await guardApiRequest(req, 'users', 'manage');
  if (!guard.authorized || !guard.session) {
    return guard.response!;
  }

  if (guard.session.userType !== 'super_admin') {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Only Super Admin can perform administrative password resets.' } },
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

  try {
    const { newPassword = 'Password123!' } = await req.json().catch(() => ({}));
    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters long.' } },
        { status: 400 }
      );
    }

    targetUser.passwordHash = bcrypt.hashSync(newPassword, 10);
    targetUser.failedLoginAttempts = 0;
    targetUser.lockoutUntil = null;
    targetUser.updatedAt = new Date().toISOString();

    recordAuditLog({
      actorUserId: guard.session.userId,
      actorEmail: guard.session.email,
      actorUserType: guard.session.userType,
      action: 'ADMIN_PASSWORD_RESET',
      entityTable: 'users',
      entityId: targetUserId,
      details: `Super Admin reset password for ${targetUser.email}`,
      status: 'SUCCESS',
    });

    return NextResponse.json({
      success: true,
      message: `Password for ${targetUser.email} has been successfully reset.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
