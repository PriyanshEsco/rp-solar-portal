import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from './security';
import { db } from '../db';
import { SessionPayload, UserType } from '../types';
import { PermissionAction, PermissionModule, hasBasePermission, verifyOwnership } from './rbac';
import { recordAuditLog } from '../audit';

export interface AuthResult {
  authorized: boolean;
  session?: SessionPayload;
  response?: NextResponse;
}

/**
 * Extract and verify token from Authorization Header or Cookie
 */
export async function getSessionFromRequest(req: NextRequest): Promise<SessionPayload | null> {
  // 1. Check Bearer Authorization Header
  const authHeader = req.headers.get('authorization');
  let token: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  // 2. Check HttpOnly Cookie fallback
  if (!token) {
    token = req.cookies.get('rp_access_token')?.value || null;
  }

  if (!token) {
    return null;
  }

  const payload = await verifyAccessToken(token);
  if (!payload) {
    return null;
  }

  // Verify that the user still exists and is active
  const user = db.users.get(payload.userId);
  if (!user || user.status !== 'active') {
    return null;
  }

  return payload;
}

/**
 * Robust Backend Authorization and Ownership Enforcement Guard
 */
export async function guardApiRequest(
  req: NextRequest,
  module: PermissionModule,
  action: PermissionAction,
  resourceId?: string
): Promise<AuthResult> {
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const userAgent = req.headers.get('user-agent') || 'Browser Client';

  const session = await getSessionFromRequest(req);

  // 1. Authentication Check (401)
  if (!session) {
    recordAuditLog({
      actorIp: ip,
      userAgent,
      action: `AUTH_FAILURE_${module.toUpperCase()}_${action.toUpperCase()}`,
      entityTable: module,
      entityId: resourceId || 'collection',
      details: 'Unauthorized request: Missing or invalid JWT access token',
      status: 'BLOCKED_UNAUTHORIZED',
    });

    return {
      authorized: false,
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication token is missing, expired, or invalid. Please log in.',
          },
        },
        { status: 401 }
      ),
    };
  }

  // 2. RBAC Base Permission Check (403)
  const hasPerm = hasBasePermission(session.userType, module, action);
  if (!hasPerm) {
    recordAuditLog({
      actorUserId: session.userId,
      actorEmail: session.email,
      actorUserType: session.userType,
      actorIp: ip,
      userAgent,
      action: `PERMISSION_DENIED_${module.toUpperCase()}_${action.toUpperCase()}`,
      entityTable: module,
      entityId: resourceId || 'collection',
      details: `Role '${session.userType}' lacks permission for '${module}:${action}'`,
      status: 'BLOCKED_UNAUTHORIZED',
    });

    return {
      authorized: false,
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN_PERMISSION',
            message: `Your role (${session.userType}) does not have permission to ${action} ${module}.`,
          },
        },
        { status: 403 }
      ),
    };
  }

  // 3. Backend Ownership Enforcement Check (403)
  if (resourceId) {
    const ownershipResult = verifyOwnership(session, module, resourceId);
    if (!ownershipResult.allowed) {
      recordAuditLog({
        actorUserId: session.userId,
        actorEmail: session.email,
        actorUserType: session.userType,
        actorIp: ip,
        userAgent,
        action: `OWNERSHIP_VIOLATION_${module.toUpperCase()}`,
        entityTable: module,
        entityId: resourceId,
        details: `Cross-tenant/Unauthorized ownership access attempt blocked: ${ownershipResult.reason}`,
        status: 'BLOCKED_UNAUTHORIZED',
      });

      return {
        authorized: false,
        response: NextResponse.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN_OWNERSHIP_VIOLATION',
              message: ownershipResult.reason || 'You do not own or have administrative scope over this resource.',
              resourceId,
              module,
            },
          },
          { status: 403 }
        ),
      };
    }
  }

  return { authorized: true, session };
}
