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

module.exports = { register, login, verifyTwoFactor, setupTwoFactor, confirmTwoFactor, me };
