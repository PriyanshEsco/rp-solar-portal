import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { rotateRefreshToken, generateAccessToken } from '@/lib/auth/security';
import { SessionPayload } from '@/lib/types';
import { recordAuditLog } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let refreshToken = body.refreshToken;

    if (!refreshToken) {
      refreshToken = req.cookies.get('rp_refresh_token')?.value;
    }

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_REFRESH_TOKEN', message: 'No refresh token provided.' } },
        { status: 400 }
      );
    }

    const rotated = rotateRefreshToken(refreshToken);
    if (!rotated) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token is expired or revoked. Please log in again.' } },
        { status: 401 }
      );
    }

    const user = db.users.get(rotated.userId);
    if (!user || user.status !== 'active') {
      return NextResponse.json(
        { success: false, error: { code: 'USER_INACTIVE', message: 'User is suspended or inactive.' } },
        { status: 403 }
      );
    }

    // Resolve profile
    let profileId = user.id;
    let reportingAdminId: string | undefined;
    let assignedRegion: string | undefined;

    if (user.userType === 'admin') {
      const admin = Array.from(db.admins.values()).find((a) => a.userId === user.id);
      if (admin) {
        profileId = admin.id;
        assignedRegion = admin.branchRegion;
      }
    } else if (user.userType === 'employee') {
      const emp = Array.from(db.employees.values()).find((e) => e.userId === user.id);
      if (emp) {
        profileId = emp.id;
        reportingAdminId = emp.reportingAdminId;
        assignedRegion = emp.assignedRegion;
      }
    } else if (user.userType === 'customer') {
      const cust = Array.from(db.customers.values()).find((c) => c.userId === user.id);
      if (cust) {
        profileId = cust.id;
      }
    }

    const sessionId = `sess-${crypto.randomBytes(12).toString('hex')}`;
    const sessionPayload: SessionPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
      userType: user.userType,
      profileId,
      reportingAdminId,
      assignedRegion,
      sessionId,
    };

    const newAccessToken = await generateAccessToken(sessionPayload);

    const response = NextResponse.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: rotated.newToken,
        tokenType: 'Bearer',
        expiresInSeconds: 15 * 60,
      },
    });

    response.cookies.set('rp_access_token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60,
    });

    response.cookies.set('rp_refresh_token', rotated.newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: (rotated.rememberMe ? 30 : 7) * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error.message || 'Token refresh failed' } },
      { status: 500 }
    );
  }
}
