import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function TwoFactorSetup() {
  const { api } = useAuth();
  const navigate = useNavigate();

  const [step, setStep]       = useState('loading'); // loading | scan | verify | done
  const [qrCode, setQrCode]   = useState('');
  const [secret, setSecret]   = useState('');
  const [code, setCode]       = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch QR code from backend on mount
  useEffect(() => {
    api.post('/auth/setup-2fa')
      .then(({ data }) => {
        setQrCode(data.qrCode);
        setSecret(data.secret);
        setStep('scan');
      })
      .catch(err => {
        setError(err.response?.data?.error || 'Failed to start 2FA setup.');
        setStep('error');
      });
  }, [api]);

  const handleConfirm = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/confirm-2fa', { code: code.trim() });
      setStep('done');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid code. Check your app and try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (step === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-64">
        <svg className="animate-spin h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    );
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="max-w-md mx-auto mt-12 px-4">
        <div className="card text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-900/40 border border-green-500/30 mx-auto mb-4">
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">2FA Enabled!</h2>
          <p className="text-slate-400 text-sm mb-6">
            Your account is now protected with two-factor authentication.
            You'll need your authenticator app each time you sign in.
          </p>
          <button onClick={() => navigate('/dashboard')} className="btn-primary w-full">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Scan + Verify ─────────────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto mt-8 px-4 pb-12">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Set up Two-Factor Authentication</h1>
        <p className="text-slate-400 text-sm mt-1">
          Add an extra layer of security to your account.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-6">
        {['Scan QR Code', 'Verify Code'].map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
              ${step === (i === 0 ? 'scan' : 'verify') || (step === 'verify' && i === 0)
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-400'}`}>
              {i === 0 && step === 'verify' ? (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : i + 1}
            </div>
            <span className={`text-sm ${step === (i === 0 ? 'scan' : 'verify') ? 'text-white font-medium' : 'text-slate-400'}`}>
              {label}
            </span>
            {i === 0 && <div className="w-8 h-px bg-slate-600" />}
          </div>
        ))}
      </div>

      <div className="card">
        {error && <div className="alert-error mb-4">{error}</div>}

        {step === 'scan' && (
          <div className="space-y-5">
            <p className="text-slate-300 text-sm">
              <strong className="text-white">Step 1:</strong> Open{' '}
              <span className="text-blue-400">Google Authenticator</span> or{' '}
              <span className="text-blue-400">Authy</span> on your phone and scan the QR code below.
            </p>

            {qrCode && (
              <div className="flex justify-center">
                <div className="bg-white p-3 rounded-xl inline-block">
                  <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                </div>
              </div>
            )}

            <details className="text-sm">
              <summary className="text-slate-400 cursor-pointer hover:text-slate-300 select-none">
                Can't scan? Enter code manually
              </summary>
              <div className="mt-2 bg-slate-900 rounded-lg p-3 font-mono text-xs text-slate-300 break-all select-all">
                {secret}
              </div>
            </details>

            <button onClick={() => setStep('verify')} className="btn-primary w-full">
              I've scanned it → Next
            </button>
          </div>
        )}

        {step === 'verify' && (
          <form onSubmit={handleConfirm} className="space-y-4">
            <p className="text-slate-300 text-sm">
              <strong className="text-white">Step 2:</strong> Enter the 6-digit code shown in your authenticator app to confirm setup.
            </p>

            <div>
              <label className="label">Verification code</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                autoFocus
                value={code}
                onChange={e => setCode(e.target.value)}
                className="input text-center text-2xl tracking-widest font-mono"
                placeholder="000000"
              />
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
              ) : 'Enable 2FA'}
            </button>

            <button
              type="button"
              onClick={() => { setStep('scan'); setError(''); setCode(''); }}
              className="btn-ghost w-full text-sm"
            >
              ← Back to QR code
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
