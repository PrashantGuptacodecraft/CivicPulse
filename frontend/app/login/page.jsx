'use client';

/**
 * CivicPulse Login Page
 *
 * Two tabs:
 *   1. Citizen — Phone OTP flow
 *   2. Official — Email + Password flow
 *
 * On success: stores token → redirects to role-appropriate route
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/auth-context.jsx';

// Role → landing route mapping
function roleDashboard(role) {
  const map = {
    PLATFORM_SUPER_ADMIN: '/dashboard',
    NATIONAL_ADMIN:        '/dashboard',
    STATE_ADMIN:           '/dashboard',
    DISTRICT_ULB_ADMIN:    '/dashboard',
    DEPARTMENT_OFFICER:    '/dashboard',
    VERIFICATION_OFFICER:  '/verification',
    FIELD_SUPERVISOR:      '/field',
    FIELD_WORKER:          '/field',
    DISASTER_COORDINATOR:  '/situation-room',
    AUDITOR:               '/analytics',
    CITIZEN:               '/',
  };
  return map[role] ?? '/';
}

// ─── OTP & Google Citizen Flow ────────────────────────────────────────────────
function CitizenLoginTab() {
  const { login } = useAuth();
  const router    = useRouter();

  const [step, setStep]       = useState('phone'); // 'phone' | 'otp'
  const [phone, setPhone]     = useState('');
  const [otp, setOtp]         = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  // Google Sign-In state
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');

  async function handleGoogleLogin(accountEmail, accountName) {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: accountEmail || 'citizen.demo@gmail.com',
          name: accountName || 'Citizen User',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Google login failed.');
        return;
      }
      login(data.token, data.user);
      setShowGoogleModal(false);
      router.push(roleDashboard(data.user.role));
    } catch {
      setError('Network error during Google sign-in. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function sendOtp(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || 'Failed to send OTP.');
      setStep('otp');
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), otp: otp.trim() }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || 'Invalid OTP.');
      login(data.token, data.user);
      router.push(roleDashboard(data.user.role));
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Continue with Google */}
      <button
        type="button"
        onClick={() => setShowGoogleModal(true)}
        disabled={loading}
        className="btn-press w-full h-11 flex items-center justify-center gap-2.5 bg-white hover:bg-surface-secondary border border-border-primary rounded-xl text-sm font-semibold text-text-primary transition-all shadow-sm hover:shadow outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
        <span>Continue with Google</span>
      </button>

      {/* Divider */}
      <div className="relative my-3">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border-primary/80" />
        </div>
        <div className="relative flex justify-center text-[11px] uppercase">
          <span className="bg-white px-2 text-text-tertiary font-semibold tracking-wider">
            or continue with mobile OTP
          </span>
        </div>
      </div>

      {step === 'phone' ? (
        <form onSubmit={sendOtp} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5" htmlFor="phone">
              Mobile Number
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 h-11 bg-surface-tertiary border border-r-0 border-border-primary rounded-l-xl text-sm text-text-secondary font-medium">
                +91
              </span>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="98765 43210"
                value={phone.replace('+91', '')}
                onChange={(e) => setPhone('+91' + e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="flex-1 h-11 px-3 bg-white border border-border-primary rounded-r-xl text-sm text-text-primary placeholder-text-tertiary outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
                required
                autoFocus
              />
            </div>
            <p className="text-[11px] text-text-tertiary mt-1">
              Supports test login with dummy OTP <span className="font-mono font-medium text-primary">1234</span> or <span className="font-mono font-medium text-primary">123456</span>
            </p>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <button
            type="submit"
            disabled={loading || phone.replace('+91', '').length < 10}
            className="btn-press w-full h-11 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 text-sm"
          >
            {loading ? 'Sending OTP…' : 'Send OTP'}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="space-y-4">
          <p className="text-sm text-text-secondary">
            OTP sent to <span className="font-semibold text-text-primary">{phone}</span>.{' '}
            <button type="button" onClick={() => setStep('phone')} className="text-primary hover:underline">
              Change
            </button>
          </p>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5" htmlFor="otp">
              Enter OTP
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="• • • • • •"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full h-11 px-3 bg-white border border-border-primary rounded-xl text-sm text-center tracking-[0.5em] font-mono text-text-primary placeholder-text-tertiary outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
              required
              autoFocus
            />
          </div>

          {/* Dummy OTP Quick-Fill helper */}
          <div className="p-2.5 bg-blue-50/70 border border-blue-200/60 rounded-xl space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-900">
              <svg className="w-3.5 h-3.5 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Test Mode: Quick OTP</span>
            </div>
            <p className="text-[11px] text-blue-800 leading-normal">
              Click to fill dummy OTP:{' '}
              <button
                type="button"
                onClick={() => setOtp('1234')}
                className="inline-flex items-center px-1.5 py-0.5 rounded font-mono font-bold text-[11px] bg-white text-blue-900 border border-blue-300 hover:bg-blue-600 hover:text-white transition-colors"
              >
                1234
              </button>{' '}
              or{' '}
              <button
                type="button"
                onClick={() => setOtp('123456')}
                className="inline-flex items-center px-1.5 py-0.5 rounded font-mono font-bold text-[11px] bg-white text-blue-900 border border-blue-300 hover:bg-blue-600 hover:text-white transition-colors"
              >
                123456
              </button>
            </p>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <button
            type="submit"
            disabled={loading || otp.length < 4}
            className="btn-press w-full h-11 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 text-sm"
          >
            {loading ? 'Verifying…' : 'Verify & Login'}
          </button>
        </form>
      )}

      {/* Google Sign-in Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-elevation-3 border border-border-primary/80 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border-primary/50">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <h2 className="text-base font-bold text-text-primary">Sign in with Google</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="text-text-tertiary hover:text-text-primary p-1 rounded-lg"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-xs text-text-secondary">
              Select an account or enter your email to continue to CivicPulse.
            </p>

            {/* 1-click Demo Account */}
            <button
              type="button"
              onClick={() => handleGoogleLogin('citizen.demo@gmail.com', 'Demo Citizen')}
              disabled={loading}
              className="w-full flex items-center gap-3 p-3 text-left border border-border-primary rounded-xl hover:bg-surface-secondary transition-colors group"
            >
              <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-sm">
                CD
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-text-primary group-hover:text-primary transition-colors">
                    Citizen Demo
                  </span>
                  <span className="text-[10px] font-medium bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">
                    1-Click
                  </span>
                </div>
                <p className="text-xs text-text-tertiary truncate">citizen.demo@gmail.com</p>
              </div>
              <svg className="w-4 h-4 text-text-tertiary group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Custom Google Account */}
            <div className="pt-2 border-t border-border-primary/50 space-y-2">
              <label className="block text-xs font-medium text-text-secondary" htmlFor="google-email-input">
                Or sign in with another Google email
              </label>
              <div className="flex gap-2">
                <input
                  id="google-email-input"
                  type="email"
                  placeholder="your.email@gmail.com"
                  value={customGoogleEmail}
                  onChange={(e) => setCustomGoogleEmail(e.target.value)}
                  className="flex-1 h-9 px-3 bg-white border border-border-primary rounded-lg text-xs text-text-primary placeholder-text-tertiary outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <button
                  type="button"
                  disabled={loading || !customGoogleEmail.includes('@')}
                  onClick={() => handleGoogleLogin(customGoogleEmail, customGoogleEmail.split('@')[0])}
                  className="px-3 h-9 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Sign in
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Email+Password Flow ───────────────────────────────────────────────────────
function OfficialLoginTab() {
  const { login } = useAuth();
  const router    = useRouter();

  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]  = useState(false);
  const [error, setError]      = useState('');
  const [showPw, setShowPw]    = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/password/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || 'Login failed.');
      login(data.token, data.user);
      router.push(roleDashboard(data.user.role));
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5" htmlFor="email">
          Official Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="officer@pune.gov.in"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full h-11 px-3 bg-white border border-border-primary rounded-xl text-sm text-text-primary placeholder-text-tertiary outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
          required
          autoFocus
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5" htmlFor="password">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPw ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-11 px-3 pr-10 bg-white border border-border-primary rounded-xl text-sm text-text-primary placeholder-text-tertiary outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
            required
            minLength={8}
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
            aria-label={showPw ? 'Hide password' : 'Show password'}
          >
            {showPw ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            )}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="btn-press w-full h-11 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 text-sm"
      >
        {loading ? 'Logging in…' : 'Login to CivicPulse'}
      </button>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const [tab, setTab] = useState('citizen');

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-elevation-2 border border-border-primary/60 overflow-hidden">

          {/* Header */}
          <div className="px-6 pt-7 pb-5 border-b border-border-primary/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #2563EB, #8B5CF6)' }}>
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-text-primary leading-tight">Sign in to CivicPulse</h1>
                <p className="text-xs text-text-tertiary">Civic Intelligence Platform</p>
              </div>
            </div>

            {/* Tab selector */}
            <div className="flex bg-surface-tertiary rounded-xl p-1 gap-1" role="tablist">
              {[
                { id: 'citizen', label: 'Citizen (OTP)' },
                { id: 'official', label: 'Official Login' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={`flex-1 h-8 rounded-lg text-xs font-semibold transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    tab === id
                      ? 'bg-white text-text-primary shadow-elevation-1'
                      : 'text-text-tertiary hover:text-text-secondary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div className="px-6 py-5">
            {tab === 'citizen' ? <CitizenLoginTab /> : <OfficialLoginTab />}
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 text-center space-y-2">
            {tab === 'citizen' && (
              <p className="text-xs text-text-tertiary">
                New to CivicPulse?{' '}
                <Link href="/register" className="text-primary font-semibold hover:underline">
                  Create account
                </Link>
              </p>
            )}
            <p className="text-[10px] text-text-tertiary">
              By continuing, you agree to CivicPulse&apos;s terms of service and privacy policy.
            </p>
          </div>
        </div>

        {/* Help text */}
        <p className="text-center text-xs text-text-tertiary mt-5">
          Government officials: use your official department email to login.
        </p>
      </div>
    </div>
  );
}
