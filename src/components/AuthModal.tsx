import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { BrandLogo } from './BrandLogo.tsx';

export const AuthModal: React.FC = () => {
  const {
    authModalOpen,
    authModalMode,
    closeAuthModal,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
  } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>(authModalMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    setMode(authModalMode);
    setError(null);
    setInfoMessage(null);
  }, [authModalMode, authModalOpen]);

  if (!authModalOpen) return null;

  const mapAuthError = (err: unknown): string => {
    const code = (err as { code?: string })?.code || '';
    if (code === 'auth/operation-not-allowed') {
      return 'Email/Password sign-in is not yet enabled in Firebase Console (Authentication → Sign-in method → Email/Password). Please use Continue with Google below for instant access.';
    }
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
      return 'Incorrect email or password. Please verify your credentials or reset your password.';
    }
    if (code === 'auth/email-already-in-use') {
      return 'An account with this email already exists. Try signing in instead.';
    }
    if (code === 'auth/weak-password') {
      return 'Password must be at least 6 characters long.';
    }
    if (code === 'auth/popup-closed-by-user') {
      return 'Sign-in popup was closed before completing.';
    }
    return err instanceof Error ? err.message : 'Authentication failed. Please try again.';
  };

  const handleGoogle = async () => {
    setError(null);
    setInfoMessage(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setSubmitting(true);

    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
      } else if (mode === 'signup') {
        if (!displayName.trim()) {
          throw new Error('Please enter your display name.');
        }
        await signUpWithEmail(email, password, displayName);
      } else {
        await resetPassword(email);
        setInfoMessage('Password reset email sent. Check your inbox for further instructions.');
      }
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-blue-200/80 dark:border-sky-400/20 bg-white dark:bg-[#08173A] p-6 sm:p-8 shadow-2xl">
        <button
          type="button"
          onClick={closeAuthModal}
          aria-label="Close sign in dialog"
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-6">
          <BrandLogo className="mb-4" />
          <h2 id="auth-modal-title" className="font-display text-xl font-bold text-zinc-950 dark:text-white">
            {mode === 'signin'
              ? 'Sign in to your account'
              : mode === 'signup'
              ? 'Create a fan account'
              : 'Reset your password'}
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {mode === 'signin'
              ? 'Vote in verified fan polls and manage your preferences.'
              : mode === 'signup'
              ? 'Join PINOY BIG BROTHER 3.0 to participate in weekly community polls.'
              : 'Enter your email address to receive a password reset link.'}
          </p>
        </div>

        {/* Google One-Click Auth */}
        <button
          type="button"
          disabled={submitting}
          onClick={handleGoogle}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-300 dark:border-white/15 bg-zinc-50 dark:bg-white/5 px-4 py-2.5 text-sm font-semibold text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors disabled:opacity-60 cursor-pointer"
        >
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#EA4335"
              d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.9 1.5l2.7-2.6C16.9 3.3 14.7 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z"
            />
          </svg>
          Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-200 dark:bg-white/10" />
          <span className="text-xs text-zinc-500">or with email</span>
          <div className="h-px flex-1 bg-zinc-200 dark:bg-white/10" />
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}
        {infoMessage && (
          <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-700 dark:text-emerald-300">
            {infoMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <div>
              <label htmlFor="auth-name" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Display Name
              </label>
              <input
                id="auth-name"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Carlo Mendoza"
                className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-950 dark:text-white focus:border-amber-500 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Email Address
            </label>
            <input
              id="auth-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-950 dark:text-white focus:border-amber-500 focus:outline-none"
            />
          </div>

          {mode !== 'reset' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="auth-password" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Password
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => setMode('reset')}
                    className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                id="auth-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-950 dark:text-white focus:border-amber-500 focus:outline-none"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 transition-colors disabled:opacity-60 cursor-pointer"
          >
            {submitting
              ? 'Please wait...'
              : mode === 'signin'
              ? 'Sign In'
              : mode === 'signup'
              ? 'Create Account'
              : 'Send Reset Link'}
          </button>
        </form>

        <div className="mt-5 text-center text-xs text-zinc-600 dark:text-zinc-400">
          {mode === 'signin' ? (
            <>
              New to PINOY BIG BROTHER 3.0?{' '}
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('signin')}
                className="font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
              >
                Back to sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
