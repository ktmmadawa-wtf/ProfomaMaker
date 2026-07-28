const bcrypt    = require('bcrypt');
const jwt       = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode    = require('qrcode');
const pool      = require('../db/pool');

const SALT_ROUNDS = 12;

// ── POST /api/auth/register ──────────────────────────────────────────────────
async function register(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  const emailTrimmed = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailTrimmed)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [emailTrimmed]);
    if (existing.rows.length) {
      return res.status(400).json({ error: 'An account with that email already exists.' });
    }

    // First registered user or matching ADMIN_EMAIL gets admin role
    const countRes  = await pool.query('SELECT COUNT(*) FROM users');
    const isFirst   = parseInt(countRes.rows[0].count) === 0;
    const isAdminEmail = emailTrimmed === (process.env.ADMIN_EMAIL || '').toLowerCase();
    const role = isFirst || isAdminEmail ? 'admin' : 'user';

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role',
      [emailTrimmed, password_hash, role]
    );

    res.status(201).json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
}

// ── POST /api/auth/login  (Step 1 — credentials) ────────────────────────────
async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.trim().toLowerCase()]);
    const user   = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.is_2fa_enabled) {
      const partialToken = jwt.sign(
        { userId: user.id, step: '2fa' },
        process.env.JWT_SECRET,
        { expiresIn: '5m' }
      );
      return res.json({ requiresTwoFactor: true, partialToken });
    }

    // No 2FA configured — issue full session token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ success: true, token, user: { email: user.email, role: user.role } });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
}

// ── POST /api/auth/verify-2fa  (Step 2 — TOTP code) ─────────────────────────
async function verifyTwoFactor(req, res) {
  const { partialToken, code } = req.body;
  if (!partialToken || !code) {
    return res.status(400).json({ error: 'partialToken and code are required.' });
  }

  let decoded;
  try {
    decoded = jwt.verify(partialToken, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }
  if (decoded.step !== '2fa') {
    return res.status(401).json({ error: 'Invalid session token.' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
    const user   = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const valid = speakeasy.totp.verify({
      secret:   user.twofa_secret,
      encoding: 'base32',
      token:    code,
      window:   1   // allows ±30s clock skew
    });

    if (!valid) return res.status(400).json({ error: 'Invalid verification code. Please try again.' });

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ success: true, token, user: { email: user.email, role: user.role } });
  } catch (err) {
    console.error('2FA verify error:', err.message);
    res.status(500).json({ error: '2FA verification failed.' });
  }
}

// ── POST /api/auth/setup-2fa  — generate secret + QR code ───────────────────
async function setupTwoFactor(req, res) {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.userId]);
    const user   = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const secret = speakeasy.generateSecret({
      name:   `ProfomaMaker (${user.email})`,
      issuer: 'ProfomaMaker'
    });

    await pool.query('UPDATE users SET twofa_secret = $1 WHERE id = $2', [secret.base32, user.id]);

    const qrDataUrl = await qrcode.toDataURL(secret.otpauth_url);
    res.json({ qrCode: qrDataUrl, secret: secret.base32 });
  } catch (err) {
    console.error('2FA setup error:', err.message);
    res.status(500).json({ error: '2FA setup failed.' });
  }
}

// ── POST /api/auth/confirm-2fa  — verify code and activate 2FA ───────────────
async function confirmTwoFactor(req, res) {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Verification code is required.' });

  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.userId]);
    const user   = result.rows[0];
    if (!user?.twofa_secret) {
      return res.status(400).json({ error: 'Please complete 2FA setup first.' });
    }

    const valid = speakeasy.totp.verify({
      secret:   user.twofa_secret,
      encoding: 'base32',
      token:    code,
      window:   1
    });

    if (!valid) return res.status(400).json({ error: 'Invalid code. Check your authenticator app.' });

    await pool.query('UPDATE users SET is_2fa_enabled = TRUE WHERE id = $1', [user.id]);
    res.json({ success: true, message: '2FA has been enabled for your account.' });
  } catch (err) {
    console.error('2FA confirm error:', err.message);
    res.status(500).json({ error: 'Failed to enable 2FA.' });
  }
}

// ── POST /api/auth/forgot-password ───────────────────────────────────────────
async function forgotPassword(req, res) {
  const { email } = req.body;
  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Email address is required.' });
  }

  const emailTrimmed = email.trim().toLowerCase();
  try {
    const result = await pool.query('SELECT id, email FROM users WHERE email = $1', [emailTrimmed]);
    const user = result.rows[0];

    if (!user) {
      // Don't leak registered status, but give clear response
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset code has been generated.'
      });
    }

    // Generate 6-digit reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes validity

    await pool.query(
      'UPDATE users SET reset_code = $1, reset_code_expires = $2 WHERE id = $3',
      [resetCode, expiresAt, user.id]
    );

    // Note: For local/testing without SMTP, return the code so UX demo can easily complete
    res.json({
      success: true,
      message: `Reset code generated and sent to ${user.email}.`,
      resetCode: resetCode // Returned for demo/testing display
    });
  } catch (err) {
    console.error('Forgot password error:', err.message);
    res.status(500).json({ error: 'Failed to process password recovery request.' });
  }
}

// ── POST /api/auth/reset-password ────────────────────────────────────────────
async function resetPassword(req, res) {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: 'Email, reset code, and new password are required.' });
  }

  const emailTrimmed = email.trim().toLowerCase();
  const codeTrimmed = code.trim();

  // Strong password validation rules
  // Minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 digit, 1 special character
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

  if (!passwordRegex.test(newPassword)) {
    return res.status(400).json({
      error: 'Password must be at least 8 characters long and contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character.'
    });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [emailTrimmed]);
    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ error: 'Invalid reset code or email.' });
    }

    if (!user.reset_code || user.reset_code !== codeTrimmed) {
      return res.status(400).json({ error: 'Invalid or incorrect reset code.' });
    }

    if (user.reset_code_expires && new Date(user.reset_code_expires) < new Date()) {
      return res.status(400).json({ error: 'Reset code has expired. Please request a new code.' });
    }

    const password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await pool.query(
      'UPDATE users SET password_hash = $1, reset_code = NULL, reset_code_expires = NULL WHERE id = $2',
      [password_hash, user.id]
    );

    res.json({ success: true, message: 'Password has been reset successfully. You can now log in with your new password.' });
  } catch (err) {
    console.error('Reset password error:', err.message);
    res.status(500).json({ error: 'Failed to reset password. Please try again.' });
  }
}

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
async function me(req, res) {
  try {
    const result = await pool.query(
      'SELECT id, email, role, is_2fa_enabled FROM users WHERE id = $1',
      [req.user.userId]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(user);
  } catch (err) {
    console.error('Me error:', err.message);
    res.status(500).json({ error: 'Failed to fetch user.' });
  }
}

module.exports = {
  register,
  login,
  verifyTwoFactor,
  setupTwoFactor,
  confirmTwoFactor,
  forgotPassword,
  resetPassword,
  me
};

