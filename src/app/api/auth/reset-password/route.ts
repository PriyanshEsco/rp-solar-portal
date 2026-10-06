import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validatePasswordResetToken, consumePasswordResetToken, hashPassword } from '@/lib/auth/security';
import { recordAuditLog } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const userAgent = req.headers.get('user-agent') || 'Browser Client';

  try {
    const { token, newPassword } = await req.json();

    if (!token || !newPassword) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Token and new password are required' } },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters long.' } },
        { status: 400 }
      );
    }

    const email = validatePasswordResetToken(token);
    if (!email) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_TOKEN', message: 'Password reset token is invalid or has expired.' } },
        { status: 400 }
      );
    }

    const user = Array.from(db.users.values()).find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'USER_NOT_FOUND', message: 'User account not found' } },
        { status: 404 }
      );
    }

    // Hash and update password
    user.passwordHash = await hashPassword(newPassword);
    user.updatedAt = new Date().toISOString();
    user.failedLoginAttempts = 0;
    user.lockoutUntil = null;

    consumePasswordResetToken(token);

    recordAuditLog({
      actorUserId: user.id,
      actorEmail: user.email,
      actorUserType: user.userType,
      actorIp: ip,
      userAgent,
      action: 'PASSWORD_RESET_COMPLETED',
      entityTable: 'users',
      entityId: user.id,
      details: `Password reset completed for ${user.email}`,
      status: 'SUCCESS',
    });

    return NextResponse.json({
      success: true,
      message: 'Password has been successfully updated. You can now log in with your new password.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
