'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Sun,
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Zap,
  Building2,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading } = useAuth();

  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!identifier.trim() || !password) {
      setErrorMessage('Please enter your official email or username and password.');
      return;
    }

    setIsSubmitting(true);
    const result = await login(identifier.trim(), password, rememberMe);
    setIsSubmitting(false);

    if (result.success) {
      router.push('/dashboard');
    } else {
      setErrorMessage(result.error || 'Invalid credentials. Please verify and try again.');
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!forgotEmail.trim()) {
      setErrorMessage('Please provide your registered corporate email.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await res.json();
      setIsSubmitting(false);

      if (data.success) {
        setSuccessMessage('Password reset instructions have been dispatched to your email.');
      } else {
        setErrorMessage(data.error?.message || 'Password reset request failed.');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage('Unable to connect to authentication gateway. Please retry.');
    }
  };

  return (
    <div className="solar-auth-backdrop">
      {/* Ambient background glow orbs */}
      <div className="solar-glow-orb-1" />
      <div className="solar-glow-orb-2" />
      <div className="solar-grid-overlay" />

      <div
        style={{
          maxWidth: '1100px',
          width: '100%',
          display: 'grid',
          gridTemplateColumns: '1.1fr 1fr',
          gap: '48px',
          alignItems: 'center',
          position: 'relative',
          zIndex: 10,
        }}
        className="grid-responsive-2col"
      >
        {/* Left Column: Enterprise Branding & Operational Value */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '12px',
                  backgroundColor: '#ffffff',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
                }}
              >
                <img
                  src="/images/rp-solar-logo.jpeg"
                  alt="R.P. Solar Solution Logo"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>

              <div>
                <div
                  style={{
                    fontSize: '1rem',
                    fontWeight: 800,
                    color: '#fbbf24',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  R.P. SOLAR SOLUTION
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>
                  Empowering Sustainable Clean Energy
                </div>
              </div>
            </div>

            <h1
              style={{
                fontSize: '2.5rem',
                fontWeight: 800,
                lineHeight: 1.15,
                color: '#ffffff',
                letterSpacing: '-0.02em',
                marginBottom: '16px',
              }}
            >
              Enterprise Solar EPC &amp; Operations Portal
            </h1>

            <p
              style={{
                color: '#cbd5e1',
                fontSize: '1rem',
                lineHeight: 1.6,
                maxWidth: '480px',
              }}
            >
              Integrated operational intelligence for turnkey rooftop installations, DISCOM sanctions, PM Surya Ghar DBT subsidies, and financial milestone ledgers.
            </p>
          </div>

          {/* Value Highlights */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '14px 18px',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div
                style={{
                  padding: '8px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(10, 86, 52, 0.6)',
                  color: '#4ade80',
                  marginTop: '2px',
                }}
              >
                <Zap size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#f8fafc' }}>
                  26-Stage Project Lifecycle Pipeline
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#94a3b8', marginTop: '2px' }}>
                  Real-time engineering tracking from feasibility survey to CEIG commissioning.
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '14px 18px',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div
                style={{
                  padding: '8px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(245, 158, 11, 0.18)',
                  color: '#fbbf24',
                  marginTop: '2px',
                }}
              >
                <Building2 size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#f8fafc' }}>
                  B2C Residential &amp; B2B Industrial EPC
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#94a3b8', marginTop: '2px' }}>
                  Segmented customer profiles, GSTIN statutory checklists, and milestone billing.
                </div>
              </div>
            </div>
          </div>

          {/* Security Certifications */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
              paddingTop: '8px',
              color: '#94a3b8',
              fontSize: '0.8125rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={16} style={{ color: '#4ade80' }} />
              <span>Multi-Tenant RBAC</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lock size={16} style={{ color: '#38bdf8' }} />
              <span>256-Bit TLS Encryption</span>
            </div>
          </div>
        </div>

        {/* Right Column: Secure Production Sign-In Form */}
        <div
          className="glass-panel"
          style={{
            padding: '40px',
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            border: '1px solid rgba(226, 232, 240, 0.9)',
          }}
        >
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: 'var(--rp-charcoal-900)',
                  letterSpacing: '-0.01em',
                }}
              >
                {mode === 'login' ? 'Enterprise Sign In' : 'Account Recovery'}
              </h2>
              {mode === 'forgot' && (
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--rp-green-primary)',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Back to Sign In
                </button>
              )}
            </div>
            <p style={{ color: 'var(--rp-gray-500)', fontSize: '0.875rem', marginTop: '6px' }}>
              {mode === 'login'
                ? 'Enter your verified credentials to access your operational scope.'
                : 'Enter your registered work email to receive password recovery instructions.'}
            </p>
          </div>

          {/* Feedback Messages */}
          {errorMessage && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                backgroundColor: 'var(--rp-danger-surface)',
                border: '1px solid #fecaca',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '20px',
                color: 'var(--rp-danger)',
                fontSize: '0.875rem',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                backgroundColor: 'var(--rp-success-surface)',
                border: '1px solid #bbf7d0',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '20px',
                color: 'var(--rp-success)',
                fontSize: '0.875rem',
              }}
            >
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* FORM: LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit}>
              <div className="input-field-group">
                <label className="input-label" htmlFor="user-identifier">
                  Official Email or Username
                </label>
                <div className="input-container">
                  <span className="input-icon-left">
                    <Mail size={18} />
                  </span>
                  <input
                    id="user-identifier"
                    type="text"
                    className="input-styled"
                    placeholder="name@rpsolar.com"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="input-field-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="input-label" htmlFor="user-password">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setForgotEmail(identifier);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--rp-green-primary)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="input-container">
                  <span className="input-icon-left">
                    <Lock size={18} />
                  </span>
                  <input
                    id="user-password"
                    type={showPassword ? 'text' : 'password'}
                    className="input-styled"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="input-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '24px',
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    color: 'var(--rp-charcoal-700)',
                    fontWeight: 500,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{
                      accentColor: 'var(--rp-green-primary)',
                      width: '16px',
                      height: '16px',
                      borderRadius: '3px',
                    }}
                  />
                  Keep me signed in
                </label>
              </div>

              <button
                type="submit"
                className="btn-primary-solar"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={18} /> Authenticating...
                  </>
                ) : (
                  <>
                    Sign In to Dashboard <ArrowRight size={18} />
                  </>
                )}
              </button>

              <div
                style={{
                  marginTop: '24px',
                  paddingTop: '20px',
                  borderTop: '1px solid var(--rp-gray-200)',
                  textAlign: 'center',
                  fontSize: '0.75rem',
                  color: 'var(--rp-gray-500)',
                }}
              >
                Protected by R P Solar Enterprise Identity &amp; Access Control.
                <br />
                Authorized personnel only.
              </div>
            </form>
          )}

          {/* FORM: FORGOT PASSWORD */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotSubmit}>
              <div className="input-field-group">
                <label className="input-label" htmlFor="forgot-email">
                  Corporate Work Email
                </label>
                <div className="input-container">
                  <span className="input-icon-left">
                    <Mail size={18} />
                  </span>
                  <input
                    id="forgot-email"
                    type="email"
                    className="input-styled"
                    placeholder="name@rpsolar.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary-solar"
                style={{ marginTop: '8px' }}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={18} /> Sending Instructions...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
