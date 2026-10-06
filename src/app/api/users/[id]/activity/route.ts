import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/auth/server-guard';
import { db } from '@/lib/db';

// GET /api/users/[id]/activity - User activity & audit log entries
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const targetUserId = params.id;
  const guard = await guardApiRequest(req, 'users', 'read');
  if (!guard.authorized || !guard.session) {
    return guard.response!;
  }

  // Filter audit logs where actor or entity is this user
  const userLogs = db.auditLogs.filter(
    (log) => log.actorUserId === targetUserId || (log.entityTable === 'users' && log.entityId === targetUserId)
  );

  return NextResponse.json({
    success: true,
    data: userLogs,
    meta: { count: userLogs.length },
  });
}
