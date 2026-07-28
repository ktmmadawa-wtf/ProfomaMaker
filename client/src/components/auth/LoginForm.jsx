import { useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

export default function LoginForm() {
  const [step, setStep]     = useState(1);   // 1 = email+password, 2 = TOTP code
  const [form, setForm]     = useState({ email: '', password: '', code: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const { saveSession, setPartialToken, partialToken } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [params]  = useSearchParams();
  const fromPath  = location.state?.from?.pathname || '/dashboard';

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  // ── Step 1: verify email + password ───────────────────────────────────────
  const handleCredentials = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await axios.post('/api/auth/login', {
        email:    form.email.trim(),
        password: form.password
      });

      if (data.requiresTwoFactor) {
        setPartialToken(data.partialToken);
        setStep(2);
      } else {
        saveSession(data.token, data.user);
        navigate(fromPath, { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: verify TOTP code ───────────────────────────────────────────────
  const handleTwoFactor = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await axios.post('/api/auth/verify-2fa', {
        partialToken,
        code: form.code.trim()
      });
      saveSession(data.token, data.user);
      navigate(fromPath, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <img
            src="/icons/icon-192.png"
            alt="Proforma by Madawa"
            className="w-20 h-20 mx-auto mb-3 rounded-2xl object-contain"
          />
          <h1 className="text-2xl font-bold text-white">
            {step === 1 ? 'Sign in to Proforma' : 'Two-Factor Verification'}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {step === 1
              ? 'Enter your credentials to continue'
              : 'Enter the 6-digit code from your authenticator app'}
          </p>
        </div>

        <div className="card">
          {/* Success message after registration or password reset */}
          {params.get('registered') === '1' && step === 1 && (
            <div className="alert-success mb-4">
              Account created successfully! You can now sign in.
            </div>
          )}
          {params.get('reset') === '1' && step === 1 && (
            <div className="alert-success mb-4">
              Password reset successfully! You can now sign in with your new password.
            </div>
          )}

          {error && <div className="alert-error mb-4">{error}</div>}

          {/* ── Step 1 form ── */}
          {step === 1 && (
            <form onSubmit={handleCredentials} className="space-y-4">
              <div>
                <label className="label">Email address</label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={set('email')}
                  className="input"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="label mb-0">Password</label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-blue-400 hover:text-blue-300 transition font-medium"
                  >
                    Forgot password?
                  </Link>
                </div>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={form.password}
                  onChange={set('password')}
                  className="input"
                  placeholder="Your password"
                />
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Signing in…
                  </span>
                ) : 'Sign In'}
              </button>
            </form>
          )}

          {/* ── Step 2 form ── */}
          {step === 2 && (
            <form onSubmit={handleTwoFactor} className="space-y-4">
              <div>
                <label className="label">Verification code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  autoFocus
                  autoComplete="one-time-code"
                  value={form.code}
                  onChange={set('code')}
                  className="input text-center text-2xl tracking-widest font-mono"
                  placeholder="000000"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Open Google Authenticator or Authy and enter the 6-digit code.
                </p>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Verifying…
                  </span>
                ) : 'Verify Code'}
              </button>

              <button
                type="button"
                onClick={() => { setStep(1); setError(''); setForm(f => ({ ...f, code: '' })); }}
                className="btn-ghost w-full text-sm"
              >
                ← Back to login
              </button>
            </form>
          )}

          {step === 1 && (
            <p className="mt-5 text-center text-sm text-slate-400">
              Don't have an account?{' '}
              <Link to="/register" className="text-blue-400 hover:text-blue-300 font-medium">
                Register
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
