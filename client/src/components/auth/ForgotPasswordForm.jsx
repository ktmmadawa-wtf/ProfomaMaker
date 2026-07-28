import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function ForgotPasswordForm() {
  const [step, setStep] = useState(1); // 1 = Request code, 2 = Enter code & new password
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [demoCode, setDemoCode] = useState('');

  const navigate = useNavigate();

  // Live password validation criteria checks
  const passHasMinLength = newPassword.length >= 8;
  const passHasUpper = /[A-Z]/.test(newPassword);
  const passHasLower = /[a-z]/.test(newPassword);
  const passHasNumber = /[0-9]/.test(newPassword);
  const passHasSpecial = /[@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);
  const passMatches = newPassword && confirmPassword && newPassword === confirmPassword;

  const isPasswordValid =
    passHasMinLength && passHasUpper && passHasLower && passHasNumber && passHasSpecial;

  // Step 1: Submit email to request code
  const handleRequestCode = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const { data } = await axios.post('/api/auth/forgot-password', {
        email: email.trim()
      });

      setSuccessMsg(data.message || 'Verification code sent to your email.');
      if (data.resetCode) {
        setDemoCode(data.resetCode);
        setCode(data.resetCode); // Pre-fill code for effortless testing UX
      }
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to request reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Submit code & new password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!isPasswordValid) {
      setError('Please ensure your new password meets all security requirements.');
      return;
    }

    if (!passMatches) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const { data } = await axios.post('/api/auth/reset-password', {
        email: email.trim(),
        code: code.trim(),
        newPassword
      });

      setSuccessMsg(data.message || 'Password reset successful!');
      setTimeout(() => {
        navigate('/login?reset=1');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password. Please check your code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <img
            src="/icons/icon-192.png"
            alt="Proforma by Madawa"
            className="w-20 h-20 mx-auto mb-3 rounded-2xl object-contain"
          />
          <h1 className="text-2xl font-bold text-white">Reset Your Password</h1>
          <p className="text-slate-400 text-sm mt-1">
            {step === 1
              ? 'Enter your email address to receive a reset code'
              : 'Enter the 6-digit code and set your new password'}
          </p>
        </div>

        <div className="card shadow-2xl">
          {error && <div className="alert-error mb-4">{error}</div>}
          {successMsg && <div className="alert-success mb-4">{successMsg}</div>}

          {/* Step 1 Form — Enter Email */}
          {step === 1 && (
            <form onSubmit={handleRequestCode} className="space-y-4">
              <div>
                <label className="label">Account Email Address</label>
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="name@company.com"
                />
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Sending Code…
                  </span>
                ) : (
                  'Send Reset Code'
                )}
              </button>
            </form>
          )}

          {/* Step 2 Form — Enter Reset Code & New Password */}
          {step === 2 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {demoCode && (
                <div className="bg-blue-950/60 border border-blue-800/80 rounded-lg p-3 text-xs text-blue-200 flex items-center justify-between">
                  <span>Demo Reset Code: <strong className="font-mono text-base text-blue-400">{demoCode}</strong></span>
                  <span className="text-[10px] text-blue-300">Valid for 15 mins</span>
                </div>
              )}

              <div>
                <label className="label">Verification Code</label>
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="input text-center text-xl font-mono tracking-widest"
                  placeholder="123456"
                />
              </div>

              <div>
                <label className="label">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="label">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input"
                  placeholder="••••••••"
                />
              </div>

              {/* Security rules checklist */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3 space-y-1.5 text-xs">
                <p className="font-semibold text-slate-300 mb-1">Password Requirements:</p>
                <div className="grid grid-cols-2 gap-1">
                  <span className={passHasMinLength ? 'text-green-400 font-medium' : 'text-slate-400'}>
                    {passHasMinLength ? '✓' : '○'} At least 8 characters
                  </span>
                  <span className={passHasUpper ? 'text-green-400 font-medium' : 'text-slate-400'}>
                    {passHasUpper ? '✓' : '○'} One uppercase letter
                  </span>
                  <span className={passHasLower ? 'text-green-400 font-medium' : 'text-slate-400'}>
                    {passHasLower ? '✓' : '○'} One lowercase letter
                  </span>
                  <span className={passHasNumber ? 'text-green-400 font-medium' : 'text-slate-400'}>
                    {passHasNumber ? '✓' : '○'} One digit (0-9)
                  </span>
                  <span className={passHasSpecial ? 'text-green-400 font-medium' : 'text-slate-400'}>
                    {passHasSpecial ? '✓' : '○'} One special character
                  </span>
                  <span className={passMatches ? 'text-green-400 font-medium' : 'text-slate-400'}>
                    {passMatches ? '✓' : '○'} Passwords match
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !isPasswordValid || !passMatches}
                className="btn-primary w-full mt-2 disabled:opacity-40"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Resetting Password…
                  </span>
                ) : (
                  'Reset Password & Sign In'
                )}
              </button>
            </form>
          )}

          <div className="mt-6 text-center border-t border-slate-700/60 pt-4">
            <Link to="/login" className="text-slate-400 hover:text-white text-sm font-medium transition">
              ← Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
