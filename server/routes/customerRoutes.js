const router = require('express').Router();
const pool   = require('../db/pool');
const { verifyToken } = require('../middleware/auth');

// GET /api/customers
router.get('/', verifyToken, async (req, res) => {
  const { search } = req.query;
  try {
    let query  = 'SELECT * FROM customers';
    const params = [];
    if (search) {
      query += ' WHERE company_name ILIKE $1 OR contact_person ILIKE $1 OR customer_number ILIKE $1';
      params.push(`%${search}%`);
    }
    query += ' ORDER BY company_name ASC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to load customers.' });
  }
});

// POST /api/customers  — create or update
router.post('/', verifyToken, async (req, res) => {
  const { id, company_name, contact_person, address_1, address_2, address_3, city, country, vat_number } = req.body;
  if (!company_name) return res.status(400).json({ error: 'Company name is required.' });

  const client = await pool.connect();
  try {
    if (id) {
      await client.query(
        `UPDATE customers SET company_name=$1, contact_person=$2, address_1=$3, address_2=$4,
         address_3=$5, city=$6, country=$7, vat_number=$8 WHERE id=$9`,
        [company_name, contact_person||'', address_1||'', address_2||'', address_3||'', city||'', country||'', vat_number||'', id]
      );
      res.json({ success: true, message: 'Customer updated.' });
    } else {
      await client.query('BEGIN');
      const serial = await client.query("SELECT value FROM settings WHERE key = 'next_customer_serial'");
      const num    = parseInt(serial.rows[0]?.value || '1001');
      const customer_number = `CUST-${num}`;

      const result = await client.query(
        `INSERT INTO customers (customer_number, company_name, contact_person, address_1, address_2, address_3, city, country, vat_number)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
        [customer_number, company_name, contact_person||'', address_1||'', address_2||'', address_3||'', city||'', country||'', vat_number||'']
      );
      await client.query("UPDATE settings SET value=$1 WHERE key='next_customer_serial'", [String(num + 1)]);
      await client.query('COMMIT');
      res.status(201).json({ success: true, customer_number, customer_id: result.rows[0].id });
    }
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(err.message);
    res.status(500).json({ error: 'Failed to save customer.' });
  } finally {
    client.release();
  }
});

// DELETE /api/customers/:id
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM customers WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Customer deleted.' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to delete customer.' });
  }
});

function cleanVatNumber(val) {
  if (!val) return '';
  let str = String(val).trim();
  str = str.replace(/^=?"?|"?$/g, '').replace(/^'/, '').trim();
  if (/^[0-9.]+[eE]\+[0-9]+$/.test(str)) {
    try {
      const num = Number(str);
      if (!isNaN(num)) str = BigInt(Math.round(num)).toString();
    } catch {}
  }
  return str;
}

// POST /api/customers/bulk-import (Admin only)
const { verifyAdmin } = require('../middleware/auth');
router.post('/bulk-import', verifyToken, verifyAdmin, async (req, res) => {
  const { customers } = req.body;
  if (!Array.isArray(customers) || customers.length === 0) {
    return res.status(400).json({ error: 'No valid customer rows found for import.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const serialRes = await client.query("SELECT value FROM settings WHERE key = 'next_customer_serial'");
    let nextNum = parseInt(serialRes.rows[0]?.value || '1001');
    let importedCount = 0;

    for (const cust of customers) {
      if (!cust.company_name || !cust.company_name.trim()) continue;

      const customer_number = `CUST-${nextNum}`;
      nextNum++;

      const vatCleaned = cleanVatNumber(cust.vat_number);

      await client.query(
        `INSERT INTO customers (customer_number, company_name, contact_person, address_1, address_2, address_3, city, country, vat_number)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          customer_number,
          cust.company_name.trim(),
          cust.contact_person ? cust.contact_person.trim() : '',
          cust.address_1 ? cust.address_1.trim() : '',
          cust.address_2 ? cust.address_2.trim() : '',
          cust.address_3 ? cust.address_3.trim() : '',
          cust.city ? cust.city.trim() : '',
          cust.country ? cust.country.trim() : '',
          vatCleaned
        ]
      );
      importedCount++;
    }

    await client.query("UPDATE settings SET value=$1 WHERE key='next_customer_serial'", [String(nextNum)]);
    await client.query('COMMIT');

    res.json({ success: true, count: importedCount, message: `Successfully imported ${importedCount} customer(s).` });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Bulk import error:', err.message);
    res.status(500).json({ error: 'Bulk import failed: ' + err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
