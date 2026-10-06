import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { verifyPassword, generateAccessToken, createRefreshToken } from '@/lib/auth/security';
import { recordAuditLog } from '@/lib/audit';
import { SessionPayload } from '@/lib/types';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const userAgent = req.headers.get('user-agent') || 'Browser Client';

  try {
    const body = await req.json();
    const { identifier, password, rememberMe } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Email/Username and password are required.' },
        },
        { status: 400 }
      );
    }

    // Lookup user by email or username (case-insensitive)
    const normalizedIdentifier = identifier.trim().toLowerCase();
    let targetUser = Array.from(db.users.values()).find(
      (u) => u.email.toLowerCase() === normalizedIdentifier || u.username.toLowerCase() === normalizedIdentifier
    );

    if (!targetUser) {
      recordAuditLog({
        actorIp: ip,
        userAgent,
        action: 'LOGIN_FAILED_USER_NOT_FOUND',
        entityTable: 'users',
        entityId: 'none',
        details: `Failed login attempt for identifier '${identifier}'`,
        status: 'BLOCKED_UNAUTHORIZED',
      });

      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials provided.' },
        },
        { status: 401 }
      );
    }

    // Check account lockout
    if (targetUser.lockoutUntil && new Date(targetUser.lockoutUntil) > new Date()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ACCOUNT_LOCKED',
            message: `Account is temporarily locked due to multiple failed login attempts. Try again after ${new Date(
              targetUser.lockoutUntil
            ).toLocaleTimeString()}.`,
          },
        },
        { status: 429 }
      );
    }

    // Verify Password
    const isPasswordValid = await verifyPassword(password, targetUser.passwordHash);

    if (!isPasswordValid) {
      targetUser.failedLoginAttempts += 1;
      if (targetUser.failedLoginAttempts >= 5) {
        targetUser.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min lock
      }
      targetUser.updatedAt = new Date().toISOString();

      recordAuditLog({
        actorUserId: targetUser.id,
        actorEmail: targetUser.email,
        actorUserType: targetUser.userType,
        actorIp: ip,
        userAgent,
        action: 'LOGIN_FAILED_BAD_PASSWORD',
        entityTable: 'users',
        entityId: targetUser.id,
        details: `Invalid password attempt (${targetUser.failedLoginAttempts}/5 failed tries)`,
        status: 'BLOCKED_UNAUTHORIZED',
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid credentials provided.',
            attemptsRemaining: Math.max(0, 5 - targetUser.failedLoginAttempts),
          },
        },
        { status: 401 }
      );
    }

    // Reset failed login counter upon success
    targetUser.failedLoginAttempts = 0;
    targetUser.lockoutUntil = null;
    targetUser.lastLoginAt = new Date().toISOString();
    targetUser.updatedAt = new Date().toISOString();

    // Find linked profile
    let profileId = targetUser.id;
    let reportingAdminId: string | undefined;
    let assignedRegion: string | undefined;

    if (targetUser.userType === 'admin') {
      const admin = Array.from(db.admins.values()).find((a) => a.userId === targetUser!.id);
      if (admin) {
        profileId = admin.id;
        assignedRegion = admin.branchRegion;
      }
    } else if (targetUser.userType === 'employee') {
      const emp = Array.from(db.employees.values()).find((e) => e.userId === targetUser!.id);
      if (emp) {
        profileId = emp.id;
        reportingAdminId = emp.reportingAdminId;
        assignedRegion = emp.assignedRegion;
      }
    } else if (targetUser.userType === 'customer') {
      const cust = Array.from(db.customers.values()).find((c) => c.userId === targetUser!.id);
      if (cust) {
        profileId = cust.id;
      }
    }

    const sessionId = `sess-${crypto.randomBytes(12).toString('hex')}`;
    const sessionPayload: SessionPayload = {
      userId: targetUser.id,
      email: targetUser.email,
      username: targetUser.username,
      userType: targetUser.userType,
      profileId,
      reportingAdminId,
      assignedRegion,
      sessionId,
    };

    const accessToken = await generateAccessToken(sessionPayload);
    const refreshToken = createRefreshToken(targetUser.id, !!rememberMe);

    recordAuditLog({
      actorUserId: targetUser.id,
      actorEmail: targetUser.email,
      actorUserType: targetUser.userType,
      actorIp: ip,
      userAgent,
      action: 'LOGIN_SUCCESS',
      entityTable: 'users',
      entityId: targetUser.id,
      details: `User ${targetUser.email} logged in successfully with role ${targetUser.userType}`,
      status: 'SUCCESS',
    });

    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: targetUser.id,
          email: targetUser.email,
          username: targetUser.username,
          userType: targetUser.userType,
          status: targetUser.status,
          profileId,
          assignedRegion,
          reportingAdminId,
        },
        tokens: {
          accessToken,
          refreshToken,
          tokenType: 'Bearer',
          expiresInSeconds: 15 * 60,
        },
      },
    });

    // Set secure HttpOnly cookies
    response.cookies.set('rp_access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60, // 15 min
    });

    response.cookies.set('rp_refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: (rememberMe ? 30 : 7) * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error.message || 'Login process failed' } },
      { status: 500 }
    );
  }
}
