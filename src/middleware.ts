import { NextRequest, NextResponse } from 'next/server';

// Sliding-window in-memory rate limiter for edge/middleware
const requestCounts = new Map<string, { count: number; resetTime: number }>();

function isRateLimited(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = requestCounts.get(key);

  if (!entry || now > entry.resetTime) {
    requestCounts.set(key, { count: 1, resetTime: now + windowMs });
    return false;
  }

  if (entry.count >= maxRequests) {
    return true;
  }

  entry.count += 1;
  return false;
}

export function middleware(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || req.ip || '127.0.0.1';
  const path = req.nextUrl.pathname;

  // Determine if request is local / internal loopback
  const isLocalhost = ip === '127.0.0.1' || ip === '::1' || ip === 'localhost' || ip === '::ffff:127.0.0.1';

  // 1. Rate Limiting on Login Endpoint (Strict: 60 req/min for remote, 500 for localhost)
  if (path.startsWith('/api/auth/login') && req.method === 'POST') {
    const loginLimit = isLocalhost ? 500 : 60;
    const limited = isRateLimited(`login_${ip}`, loginLimit, 60 * 1000);
    if (limited) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many authentication attempts. Please wait a moment and try again.',
          },
        },
        { status: 429 }
      );
    }
  }

  // 2. Rate Limiting on General API endpoints (High throughput: 5000 req/min for localhost, 1500 for remote)
  if (path.startsWith('/api/')) {
    const generalLimit = isLocalhost ? 5000 : 1500;
    const limited = isRateLimited(`api_${ip}`, generalLimit, 60 * 1000);
    if (limited) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'API rate limit exceeded. Please throttle your requests.',
          },
        },
        { status: 429 }
      );
    }
  }

  // 3. CSRF & Origin Validation for Mutative Operations
  const isMutative = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  if (path.startsWith('/api/') && isMutative && !path.startsWith('/api/auth/login')) {
    const origin = req.headers.get('origin');
    const host = req.headers.get('host');

    if (origin && host) {
      try {
        const originUrl = new URL(origin);
        if (originUrl.host !== host && !originUrl.host.includes('localhost') && !originUrl.host.includes('127.0.0.1')) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'CSRF_ORIGIN_MISMATCH',
                message: 'Cross-site request forgery protection: Origin mismatch.',
              },
            },
            { status: 403 }
          );
        }
      } catch (e) {
        // Invalid origin header
      }
    }
  }

  // 4. Continue with Security Headers attached
  const res = NextResponse.next();
  res.headers.set('X-DNS-Prefetch-Control', 'on');
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.headers.set('X-XSS-Protection', '1; mode=block');
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return res;
}

export const config = {
  matcher: ['/api/:path*'],
};
