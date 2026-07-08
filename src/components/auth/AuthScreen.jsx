import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { LogIn, UserPlus, Loader2 } from 'lucide-react';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('signin');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const fn =
      mode === 'signin'
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password });
    const { error } = await fn;
    if (error) setError(error.message);
    setBusy(false);
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4" style={{ background: 'var(--color-surface)' }}>
      <div className="w-full max-w-sm">
        {/* Logo / brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ background: 'var(--color-accent-muted)' }}>
            <span className="text-2xl">✦</span>
          </div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>AI Chat</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-faint)' }}>Your personal assistant</p>
        </div>

        <form onSubmit={submit} className="rounded-2xl p-6 space-y-4" style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)' }}>
          <h2 className="text-base font-medium" style={{ color: 'var(--color-text)' }}>
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h2>

          <div className="space-y-3">
            <input
              type="email"
              required
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors"
              style={{
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
              }}
            />
            <input
              type="password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors"
              style={{
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
              }}
            />
          </div>

          {error && (
            <div className="rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--color-danger-muted)', color: '#fca5a5' }}>
              {error}
            </div>
          )}

          <button
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium text-white transition-colors disabled:opacity-50"
            style={{ background: 'var(--color-accent)' }}
          >
            {busy ? (
              <Loader2 className="animate-spin" size={16} />
            ) : mode === 'signin' ? (
              <><LogIn size={16} /> Sign in</>
            ) : (
              <><UserPlus size={16} /> Create account</>
            )}
          </button>

          <button
            type="button"
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="w-full text-sm transition-colors"
            style={{ color: 'var(--color-text-faint)' }}
          >
            {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}