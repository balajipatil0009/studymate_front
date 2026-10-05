import { useState, type FormEvent } from 'react';
import { Icon } from '../components/Icon';
import { Btn } from '../components/ui';
import { useAuth } from '../state/AuthContext';

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
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-card__brand">
          <div className="sidebar__mark">
            <Icon name="graduation" size={20} />
          </div>
          <div>
            <div className="sidebar__name">StudyMate</div>
            <div className="sidebar__tag">Learn · Build · Bloom</div>
          </div>
        </div>

        <h1>{isLogin ? 'Welcome back 🌱' : 'Start blooming 🌿'}</h1>
        <p className="auth-card__sub">
          {isLogin
            ? 'Sign in to pick up your tracks, timers and progress.'
            : 'Create an account — it takes less than a minute.'}
        </p>

        {error && <div className="auth-error">{error}</div>}

        {!isLogin && (
          <input
            className="field"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        )}
        <input
          className="field"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <input
          className="field"
          type="password"
          placeholder={isLogin ? 'Password' : 'Password (6+ characters)'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={isLogin ? 'current-password' : 'new-password'}
        />

        <Btn variant="primary" large block type="submit" disabled={!canSubmit || busy}>
          {busy ? 'One moment…' : isLogin ? 'Sign in' : 'Create account'}
        </Btn>

        <p className="auth-alt">
          {isLogin ? 'No account yet?' : 'Already have an account?'}{' '}
          <button
            type="button"
            className="link-btn"
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
