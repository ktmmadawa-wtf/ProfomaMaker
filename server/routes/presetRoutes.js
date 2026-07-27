const router = require('express').Router();
const pool   = require('../db/pool');
const { verifyToken } = require('../middleware/auth');

// GET /api/presets
router.get('/', verifyToken, async (req, res) => {
  try {
    const { category } = req.query;
    let query = 'SELECT * FROM item_presets';
    const params = [];
    if (category) {
      params.push(category);
      query += ' WHERE category = $1';
    }
    query += ' ORDER BY category ASC, id ASC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Fetch presets error:', err.message);
    res.status(500).json({ error: 'Failed to load item presets: ' + err.message });
  }
});

// POST /api/presets
router.post('/', verifyToken, async (req, res) => {
  const { category, description, default_price } = req.body;
  if (!category || !description) {
    return res.status(400).json({ error: 'Category and description are required.' });
  }
  if (!['room', 'event', 'misc'].includes(category)) {
    return res.status(400).json({ error: 'Invalid category.' });
  }

  try {
    const price = parseFloat(default_price) || 0;
    const result = await pool.query(
      'INSERT INTO item_presets (category, description, default_price) VALUES ($1, $2, $3) RETURNING *',
      [category, description.trim(), price]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create preset error:', err.message);
    res.status(500).json({ error: 'Failed to create preset: ' + err.message });
  }
});

// PUT /api/presets/:id
router.put('/:id', verifyToken, async (req, res) => {
  const { description, default_price } = req.body;
  if (!description) {
    return res.status(400).json({ error: 'Description is required.' });
  }

  try {
    const price = parseFloat(default_price) || 0;
    const result = await pool.query(
      'UPDATE item_presets SET description = $1, default_price = $2 WHERE id = $3 RETURNING *',
      [description.trim(), price, req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Preset not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update preset error:', err.message);
    res.status(500).json({ error: 'Failed to update preset: ' + err.message });
  }
});

// DELETE /api/presets/:id
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM item_presets WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Preset deleted.' });
  } catch (err) {
    console.error('Delete preset error:', err.message);
    res.status(500).json({ error: 'Failed to delete preset: ' + err.message });
  }
});

module.exports = router;
