const router = require('express').Router();
const pool   = require('../db/pool');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// GET /api/settings
router.get('/', verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT key, value FROM settings');
    const obj = {};
    rows.forEach(r => { obj[r.key] = r.value; });
    // Never expose smtp_pass
    delete obj.smtp_pass;
    res.json(obj);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to load settings.' });
  }
});

// POST /api/settings
router.post('/', verifyToken, verifyAdmin, async (req, res) => {
  const settings = req.body;
  const client   = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [key, value] of Object.entries(settings)) {
      await client.query(
        'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
        [key, String(value)]
      );
    }
    await client.query('COMMIT');
    res.json({ success: true, message: 'Settings saved.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(500).json({ error: 'Failed to save settings.' });
  } finally {
    client.release();
  }
});

module.exports = router;
