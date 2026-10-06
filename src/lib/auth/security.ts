import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../db';
import { SessionPayload, User } from '../types';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'rp-solar-management-portal-secure-jwt-secret-key-2026-v1'
);

const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes for access tokens
const REFRESH_TOKEN_EXPIRY_DAYS = 7; // 7 days for refresh tokens
const REFRESH_TOKEN_EXPIRY_REMEMBER_DAYS = 30; // 30 days if remember me

/**
 * Verify plaintext password against stored bcrypt hash
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch (error) {
    return false;
  }
}

/**
 * Hash plaintext password
 */
export async function hashPassword(plain: string): Promise<string> {
  return await bcrypt.hash(plain, 10);
}

/**
 * Sign a JWT access token containing session payload
 */
export async function generateAccessToken(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

/**
 * Verify a JWT access token
 */
export async function verifyAccessToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Create a new refresh token and store in token ledger
 */
export function createRefreshToken(userId: string, rememberMe: boolean = false): string {
  const token = crypto.randomBytes(40).toString('hex');
  const days = rememberMe ? REFRESH_TOKEN_EXPIRY_REMEMBER_DAYS : REFRESH_TOKEN_EXPIRY_DAYS;
  const expiresAt = Date.now() + days * 24 * 60 * 60 * 1000;

  db.refreshTokens.set(token, {
    userId,
    expiresAt,
    rememberMe,
  });

  return token;
}

/**
 * Validate and rotate a refresh token (Single-use token rotation pattern)
 */
export function rotateRefreshToken(oldToken: string): { newToken: string; userId: string; rememberMe: boolean } | null {
  const existing = db.refreshTokens.get(oldToken);
  if (!existing) {
    return null;
  }

  // Check expiration
  if (Date.now() > existing.expiresAt) {
    db.refreshTokens.delete(oldToken);
    return null;
  }

  // Invalidate old token (prevent replay attacks)
  db.refreshTokens.delete(oldToken);

  // Issue new token in family
  const newToken = createRefreshToken(existing.userId, existing.rememberMe);
  return {
    newToken,
    userId: existing.userId,
    rememberMe: existing.rememberMe,
  };
}

/**
 * Revoke a refresh token (Logout)
 */
export function revokeRefreshToken(token: string): boolean {
  return db.refreshTokens.delete(token);
}

/**
 * Generate password reset token
 */
export function createPasswordResetToken(email: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour expiry
  db.passwordResetTokens.set(token, { email, expiresAt });
  return token;
}

/**
 * Validate password reset token
 */
export function validatePasswordResetToken(token: string): string | null {
  const entry = db.passwordResetTokens.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    db.passwordResetTokens.delete(token);
    return null;
  }
  return entry.email;
}

/**
 * Consume password reset token
 */
export function consumePasswordResetToken(token: string): boolean {
  return db.passwordResetTokens.delete(token);
}

/**
 * 1. PASSWORD COMPLEXITY VALIDATOR
 * Enforces Enterprise IAM security guidelines
 */
export function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long.');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter (A-Z).');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter (a-z).');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one numerical digit (0-9).');
  }
  if (!/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&* etc.).');
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 2. SLIDING-WINDOW RATE LIMITER
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 60,
  windowSeconds: number = 60
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetAt) {
    const resetAt = now + windowSeconds * 1000;
    rateLimitMap.set(identifier, { count: 1, resetAt });
    return { allowed: true, remaining: maxRequests - 1, resetTime: resetAt };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: record.resetAt };
  }

  record.count += 1;
  return { allowed: true, remaining: maxRequests - record.count, resetTime: record.resetAt };
}

/**
 * 3. FILE UPLOAD SECURITY VALIDATOR
 */
const ALLOWED_EXTENSIONS = new Set(['pdf', 'jpg', 'jpeg', 'png', 'webp', 'doc', 'docx', 'xls', 'xlsx']);
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const DANGEROUS_EXTENSIONS = new Set([
  'exe', 'sh', 'bat', 'cmd', 'com', 'msi', 'jsp', 'php', 'asp', 'aspx', 'py', 'rb', 'js', 'vbs', 'scr', 'bin', 'jar'
]);

export function validateUploadedFile(file: {
  name: string;
  size: number;
  type?: string;
}): { valid: boolean; error?: string } {
  if (!file.name) {
    return { valid: false, error: 'File name is required' };
  }

  // Max 15MB file size limit
  if (file.size > 15 * 1024 * 1024) {
    return { valid: false, error: 'File size exceeds maximum permitted limit of 15MB' };
  }

  const parts = file.name.split('.');
  if (parts.length < 2) {
    return { valid: false, error: 'File has no extension' };
  }

  const ext = parts[parts.length - 1].toLowerCase();

  // Block dangerous executable extensions
  if (DANGEROUS_EXTENSIONS.has(ext)) {
    return { valid: false, error: `Executable or script extension .${ext} is strictly prohibited.` };
  }

  // Whitelist check
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { valid: false, error: `File format .${ext} is not allowed. Supported formats: PDF, JPG, PNG, WEBP, DOCX, XLSX.` };
  }

  // MIME check if provided
  if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
    return { valid: false, error: `MIME type '${file.type}' does not match allowed statutory document formats.` };
  }

  return { valid: true };
}

/**
 * 4. INPUT SANITIZATION & INJECTION DETECTION
 */
export function detectSuspiciousInjection(input: string): boolean {
  if (!input || typeof input !== 'string') return false;

  // Detect SQL injection patterns
  const sqliPatterns = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
    /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
    /\w*((\%27)|(\'))(\s)*((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
    /union(\s)+select/i,
    /exec(\s|\+)+(s|x)p\w+/i,
    /drop(\s)+table/i,
    /insert(\s)+into/i,
    /delete(\s)+from/i,
  ];

  for (const pattern of sqliPatterns) {
    if (pattern.test(input)) return true;
  }

  // Detect XSS patterns
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /onerror\s*=/gi,
    /onload\s*=/gi,
    /eval\s*\(/gi,
    /document\.cookie/gi,
  ];

  for (const pattern of xssPatterns) {
    if (pattern.test(input)) return true;
  }

  return false;
}

