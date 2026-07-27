const router = require('express').Router();
const pool   = require('../db/pool');
const { verifyToken } = require('../middleware/auth');

// GET /api/invoices
router.get('/', verifyToken, async (req, res) => {
  const { search, type, date, amount } = req.query;
  let query  = 'SELECT * FROM invoices WHERE 1=1';
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    query += ` AND (company_name ILIKE $${params.length} OR invoice_number ILIKE $${params.length})`;
  }
  if (type) {
    params.push(type);
    query += ` AND invoice_type = $${params.length}`;
  }
  if (date) {
    params.push(date);
    query += ` AND invoice_date = $${params.length}`;
  }
  if (amount) {
    params.push(parseFloat(amount));
    query += ` AND (grand_total = $${params.length} OR balance_due = $${params.length})`;
  }
  query += ' ORDER BY created_at DESC';

  try {
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to retrieve invoices.' });
  }
});

// POST /api/invoices
router.post('/', verifyToken, async (req, res) => {
  const {
    invoice_type, company_name, contact_person, address_1, address_2, address_3,
    city, country, customer_vat, invoice_date, subtotal, discount_percent,
    discount_amount, municipality_fee, vat_total, advance_payment,
    grand_total, balance_due, items
  } = req.body;

  if (!invoice_type || !company_name || !invoice_date || subtotal === undefined ||
      vat_total === undefined || grand_total === undefined || !items) {
    return res.status(400).json({ error: 'Missing required invoice fields.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const prefix = await client.query("SELECT value FROM settings WHERE key = 'serial_prefix'");
    const serial = await client.query("SELECT value FROM settings WHERE key = 'next_serial'");
    const pfx    = prefix.rows[0]?.value || 'PI-';
    const num    = parseInt(serial.rows[0]?.value || '1001');
    const invoice_number = `${pfx}${num}`;

    const result = await client.query(
      `INSERT INTO invoices (
        invoice_number, invoice_type, company_name, contact_person, address_1, address_2,
        address_3, city, country, customer_vat, invoice_date, subtotal, discount_percent,
        discount_amount, municipality_fee, vat_total, advance_payment, grand_total,
        balance_due, items, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
      RETURNING id`,
      [
        invoice_number, invoice_type, company_name, contact_person||'',
        address_1||'', address_2||'', address_3||'', city||'', country||'', customer_vat||'',
        invoice_date, subtotal, discount_percent||0, discount_amount||0, municipality_fee||0,
        vat_total, advance_payment||0, grand_total, balance_due,
        JSON.stringify(items), req.user.email
      ]
    );

    await client.query("UPDATE settings SET value=$1 WHERE key='next_serial'", [String(num + 1)]);
    await client.query('COMMIT');

    res.status(201).json({ success: true, invoice_number, invoice_id: result.rows[0].id });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(err.message);
    res.status(500).json({ error: 'Failed to save invoice.' });
  } finally {
    client.release();
  }
});

module.exports = router;
