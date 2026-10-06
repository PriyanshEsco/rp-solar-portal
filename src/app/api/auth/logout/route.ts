import { NextRequest, NextResponse } from 'next/server';
import { revokeRefreshToken } from '@/lib/auth/security';
import { getSessionFromRequest } from '@/lib/auth/server-guard';
import { recordAuditLog } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const userAgent = req.headers.get('user-agent') || 'Browser Client';
  const session = await getSessionFromRequest(req);

  const refreshToken = req.cookies.get('rp_refresh_token')?.value;
  if (refreshToken) {
    revokeRefreshToken(refreshToken);
  }

  if (session) {
    recordAuditLog({
      actorUserId: session.userId,
      actorEmail: session.email,
      actorUserType: session.userType,
      actorIp: ip,
      userAgent,
      action: 'LOGOUT',
      entityTable: 'users',
      entityId: session.userId,
      details: `User ${session.email} logged out and invalidated session`,
      status: 'SUCCESS',
    });
  }

  const response = NextResponse.json({
    success: true,
    message: 'Successfully logged out and session revoked.',
  });

  // Clear authentication cookies
  response.cookies.delete('rp_access_token');
  response.cookies.delete('rp_refresh_token');

  return response;
}
