const router = require('express').Router();
const bcrypt = require('bcrypt');
const pool   = require('../db/pool');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// GET /api/users  — admin only
router.get('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, email, role, is_2fa_enabled, created_at FROM users ORDER BY created_at ASC'
    );
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to load users.' });
  }
});

// POST /api/users  — admin creates/updates a user
router.post('/', verifyToken, verifyAdmin, async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !role) {
    return res.status(400).json({ error: 'Email and role are required.' });
  }
  const emailTrimmed = email.trim().toLowerCase();

  try {
    const existing = await pool.query('SELECT * FROM users WHERE email = $1', [emailTrimmed]);

    if (existing.rows.length) {
      // Update
      const updates = ['role = $1'];
      const params  = [role];
      if (password) {
        updates.push(`password_hash = $${params.length + 1}`);
        params.push(await bcrypt.hash(password, 12));
      }
      params.push(emailTrimmed);
      await pool.query(
        `UPDATE users SET ${updates.join(', ')} WHERE email = $${params.length}`,
        params
      );
      res.json({ success: true, message: `User ${emailTrimmed} updated.` });
    } else {
      // Create
      if (!password) return res.status(400).json({ error: 'Password is required for new users.' });
      const hash = await bcrypt.hash(password, 12);
      await pool.query(
        'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3)',
        [emailTrimmed, hash, role]
      );
      res.status(201).json({ success: true, message: `User ${emailTrimmed} created.` });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to save user.' });
  }
});

// DELETE /api/users/:id  — admin only
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  if (parseInt(req.params.id) === req.user.userId) {
    return res.status(400).json({ error: 'You cannot delete your own account.' });
  }
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'User deleted.' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

module.exports = router;
