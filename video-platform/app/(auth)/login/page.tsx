'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn, resetPasswordForEmail } from '@/lib/supabase/auth';
import TurnstileWidget from '@/components/TurnstileWidget';

const DEFAULT_LOCAL_TURNSTILE_SITE_KEY = '1x00000000000000000000AA';

function isTurnstileEnabled(): boolean {
  if (process.env.NODE_ENV === 'production') {
    return true;
  }

  return process.env.NEXT_PUBLIC_TURNSTILE_ENABLED_IN_DEV === 'true';
}

function resolveTurnstileSiteKey(): string {
  const prodKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';

  if (typeof window === 'undefined') {
    return prodKey;
  }

  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';

  if (!isLocalhost) {
    return prodKey;
  }

  const localKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY_LOCAL ?? '';
  return localKey || prodKey || DEFAULT_LOCAL_TURNSTILE_SITE_KEY;
}

async function verifyTurnstile(token: string): Promise<boolean> {
  const res = await fetch('/api/verify-turnstile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  const data = await res.json();
  return data.success === true;
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-transparent text-white flex items-center justify-center px-4">
          <p className="text-white/70">Loading login...</p>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEmailVerified = searchParams.get('verified') === '1';
  const turnstileEnabled = isTurnstileEnabled();
  const siteKey = resolveTurnstileSiteKey();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);

  const resetTurnstile = () => {
    setTurnstileToken(null);
    setTurnstileResetKey((prev) => prev + 1);
  };

  const switchToReset = () => {
    setResetMode(true);
    resetTurnstile();
    setError('');
  };

  const switchToLogin = () => {
    setResetMode(false);
    resetTurnstile();
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (turnstileEnabled && !turnstileToken) {
      setError('Please wait for the security check to complete.');
      return;
    }

    setLoading(true);

    if (turnstileEnabled) {
      const verified = await verifyTurnstile(turnstileToken!);
      if (!verified) {
        setError('Security check failed. Please try again.');
        resetTurnstile();
        setLoading(false);
        return;
      }
    }

    const { data, error: signInError } = await signIn({ identifier, password });

    if (signInError) {
      setError(signInError.message || 'Failed to sign in');
      resetTurnstile();
      setLoading(false);
      return;
    }

    if (data?.session) {
      router.push(isEmailVerified ? '/onboarding' : '/feed');
      router.refresh();
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (turnstileEnabled && !turnstileToken) {
      setError('Please wait for the security check to complete.');
      return;
    }

    const normalizedIdentifier = identifier.trim();
    if (!normalizedIdentifier.includes('@')) {
      setError('Enter your account email to reset your password.');
      return;
    }

    setLoading(true);

    if (turnstileEnabled) {
      const verified = await verifyTurnstile(turnstileToken!);
      if (!verified) {
        setError('Security check failed. Please try again.');
        resetTurnstile();
        setLoading(false);
        return;
      }
    }

    const { error: resetError } = await resetPasswordForEmail(normalizedIdentifier);

    if (resetError) {
      setError(resetError.message || 'Failed to send reset email');
      resetTurnstile();
      setLoading(false);
      return;
    }

    setResetSent(true);
    setLoading(false);
  };

  if (resetMode) {
    return (
      <div className="min-h-screen bg-transparent text-white flex items-center justify-center px-4">
        <div className="w-full max-w-md space-y-8 bg-[rgba(36,36,32,0.85)] backdrop-blur-md border border-[#3A3A34] rounded-2xl p-8 shadow-xl" style={{ animation: 'fadeInUp 0.5s ease-out forwards', opacity: 0 }}>
          <div className="text-center">
            <h1 className="entrance-slide text-4xl font-bold mb-2" style={{ animation: 'slideInLeft 0.4s ease-out 0.1s forwards', opacity: 0 }}>Localy</h1>
            <p className="text-white/60">Reset your password</p>
          </div>

          {resetSent ? (
            <div className="space-y-6">
              <div className="bg-green-500/20 border border-green-500 text-green-200 px-4 py-3 rounded-lg">
                Check your email for a password reset link.
              </div>
              <button
                onClick={() => { switchToLogin(); setResetSent(false); }}
                className="w-full bg-white text-black font-semibold py-3 rounded-lg hover:bg-white/90 active:scale-98 transition-all duration-200"
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-6">
              {isEmailVerified && (
                <div className="bg-green-500/20 border border-green-500 text-green-200 px-4 py-3 rounded-lg">
                  Email verified. Please sign in again to continue.
                </div>
              )}

              {error && (
                <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium mb-2">
                  Email
                </label>
                <input
                  id="reset-email"
                  type="email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20 transition-all duration-200"
                  placeholder="you@example.com"
                />
              </div>

              {turnstileEnabled && (
                <TurnstileWidget
                  siteKey={siteKey}
                  onVerify={setTurnstileToken}
                  onExpire={() => setTurnstileToken(null)}
                  theme="dark"
                  resetKey={turnstileResetKey}
                />
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black font-semibold py-3 rounded-lg disabled:bg-white/20 disabled:text-white/40 disabled:cursor-not-allowed hover:bg-white/90 active:scale-98 transition-all duration-200"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}

          {!resetSent && (
            <p className="text-center text-white/60">
              <button
                onClick={switchToLogin}
                className="text-white hover:underline"
              >
                Back to Sign In
              </button>
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8 bg-[rgba(36,36,32,0.85)] backdrop-blur-md border border-[#3A3A34] rounded-2xl p-8 shadow-xl" style={{ animation: 'fadeInUp 0.5s ease-out forwards', opacity: 0 }}>
        <div className="text-center">
          <h1 className="entrance-slide text-4xl font-bold mb-2" style={{ animation: 'slideInLeft 0.4s ease-out 0.1s forwards', opacity: 0 }}>Localy</h1>
          <p className="text-white/60">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {isEmailVerified && (
            <div className="bg-green-500/20 border border-green-500 text-green-200 px-4 py-3 rounded-lg">
              Email verified. Please sign in again to continue.
            </div>
          )}

          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20 transition-all duration-200"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="password" className="block text-sm font-medium">
                Password
              </label>
              <button
                type="button"
                onClick={switchToReset}
                className="text-sm text-white/60 hover:text-white hover:underline transition-colors duration-200"
              >
                Forgot Password?
              </button>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20 transition-all duration-200"
              placeholder="••••••••"
            />
          </div>

          {turnstileEnabled && (
            <TurnstileWidget
              siteKey={siteKey}
              onVerify={setTurnstileToken}
              onExpire={() => setTurnstileToken(null)}
              theme="dark"
              resetKey={turnstileResetKey}
            />
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-semibold py-3 rounded-lg disabled:bg-white/20 disabled:text-white/40 disabled:cursor-not-allowed hover:bg-white/90 active:scale-98 transition-all duration-200"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-white/60">
          Don't have an account?{' '}
          <Link href="/signup" className="text-white hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
