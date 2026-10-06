import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createPasswordResetToken } from '@/lib/auth/security';
import { recordAuditLog } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const userAgent = req.headers.get('user-agent') || 'Browser Client';

  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_EMAIL', message: 'Email is required' } },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = Array.from(db.users.values()).find((u) => u.email.toLowerCase() === normalizedEmail);

    // Generic response to prevent user enumeration
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email address, a password reset link has been dispatched.',
      });
    }

    const resetToken = createPasswordResetToken(user.email);

    recordAuditLog({
      actorUserId: user.id,
      actorEmail: user.email,
      actorUserType: user.userType,
      actorIp: ip,
      userAgent,
      action: 'PASSWORD_RESET_REQUESTED',
      entityTable: 'users',
      entityId: user.id,
      details: `Password reset requested for ${user.email}`,
      status: 'SUCCESS',
    });

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email address, a password reset link has been dispatched.',
      // In development/demo environment, return token for immediate verification
      debugResetToken: resetToken,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
