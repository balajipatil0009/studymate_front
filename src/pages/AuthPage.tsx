import { useState, type FormEvent } from 'react';
import { GraduationCap, Leaf, Sprout } from 'lucide-react';
import { Btn } from '../components/ui';
import { useAuth } from '../state/AuthContext';

const FIELD =
  'mb-2 w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-faint focus:border-brand/60 focus:bg-surface-strong';

export function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isLogin = mode === 'login';
  const canSubmit =
    email.trim().length > 3 && password.length >= (isLogin ? 1 : 6) && (isLogin || name.trim().length > 1);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (isLogin) await login(email.trim(), password);
      else await register(name.trim(), email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-brand/15 blur-[130px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 bottom-0 h-[460px] w-[460px] rounded-full bg-brand-soft/15 blur-[130px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(var(--color-line-soft) 1px, transparent 1px), linear-gradient(90deg, var(--color-line-soft) 1px, transparent 1px)',
          backgroundSize: '54px 54px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, #000 10%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, #000 10%, transparent 75%)',
        }}
      />

      <form
        className="relative w-full max-w-[420px] rounded-[28px] border border-line bg-surface p-7 shadow-[var(--shadow-panel)] backdrop-blur-2xl"
        onSubmit={submit}
      >
        <div className="flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[linear-gradient(135deg,#6366f1,#a855f7)] text-white shadow-[0_12px_26px_-12px_rgba(99,102,241,0.95)]">
            <GraduationCap size={21} strokeWidth={1.9} />
          </div>
          <div>
            <div className="text-[17px] font-bold tracking-[-0.02em]">StudyMate</div>
            <div className="text-[10.5px] text-faint">Learn · Build · Bloom</div>
          </div>
        </div>

        <h1 className="mt-6 flex items-center gap-2 text-[24px] font-extrabold tracking-[-0.03em]">
          {isLogin ? (
            <>
              Welcome back <Sprout size={22} className="text-mint" />
            </>
          ) : (
            <>
              Start blooming <Leaf size={22} className="text-mint" />
            </>
          )}
        </h1>
        <p className="mb-5 mt-1 text-[13.5px] text-muted">
          {isLogin
            ? 'Sign in to pick up your tracks, timers and progress.'
            : 'Create an account — it takes less than a minute.'}
        </p>

        {error && (
          <div className="mb-3 rounded-xl border border-danger/25 bg-danger/10 px-3 py-2.5 text-[13px] text-danger">
            {error}
          </div>
        )}

        {!isLogin && (
          <input
            className={FIELD}
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        )}
        <input
          className={FIELD}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <input
          className={FIELD}
          type="password"
          placeholder={isLogin ? 'Password' : 'Password (6+ characters)'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={isLogin ? 'current-password' : 'new-password'}
        />

        <div className="mt-3">
          <Btn variant="primary" large block type="submit" disabled={!canSubmit || busy}>
            {busy ? 'One moment…' : isLogin ? 'Sign in' : 'Create account'}
          </Btn>
        </div>

        <p className="mt-4 text-center text-[13.5px] text-muted">
          {isLogin ? 'No account yet?' : 'Already have an account?'}{' '}
          <button
            type="button"
            className="font-bold text-brand-soft transition-colors hover:text-brand"
            onClick={() => {
              setMode(isLogin ? 'register' : 'login');
              setError(null);
            }}
          >
            {isLogin ? 'Create one' : 'Sign in'}
          </button>
        </p>
      </form>
    </div>
  );
}
