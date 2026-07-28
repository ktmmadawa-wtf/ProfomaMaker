require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const pool = require('./pool');

async function migrate(closePool = false) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Users
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id                 SERIAL PRIMARY KEY,
        email              TEXT UNIQUE NOT NULL,
        password_hash      TEXT NOT NULL,
        role               TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
        twofa_secret       TEXT,
        is_2fa_enabled     BOOLEAN NOT NULL DEFAULT FALSE,
        reset_code         TEXT,
        reset_code_expires TIMESTAMPTZ,
        created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Ensure reset columns exist for previously created DBs
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_code TEXT');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_code_expires TIMESTAMPTZ');

    // Settings
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY,
        value TEXT
      )
    `);

    // Invoices
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id               SERIAL PRIMARY KEY,
        invoice_number   TEXT UNIQUE NOT NULL,
        invoice_type     TEXT NOT NULL,
        company_name     TEXT NOT NULL,
        contact_person   TEXT,
        address_1        TEXT,
        address_2        TEXT,
        address_3        TEXT,
        city             TEXT,
        country          TEXT,
        customer_vat     TEXT,
        invoice_date     TEXT NOT NULL,
        currency         TEXT NOT NULL DEFAULT 'SAR',
        subtotal         NUMERIC(12,2) NOT NULL,
        discount_percent NUMERIC(5,2)  DEFAULT 0,
        discount_amount  NUMERIC(12,2) DEFAULT 0,
        municipality_fee NUMERIC(12,2) DEFAULT 0,
        vat_total        NUMERIC(12,2) NOT NULL,
        advance_payment  NUMERIC(12,2) DEFAULT 0,
        grand_total      NUMERIC(12,2) NOT NULL,
        balance_due      NUMERIC(12,2) NOT NULL,
        items            JSONB NOT NULL DEFAULT '[]',
        created_by       TEXT NOT NULL,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Customers
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id              SERIAL PRIMARY KEY,
        customer_number TEXT UNIQUE NOT NULL,
        company_name    TEXT NOT NULL,
        contact_person  TEXT,
        address_1       TEXT,
        address_2       TEXT,
        address_3       TEXT,
        city            TEXT,
        country         TEXT,
        vat_number      TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Item Presets
    await client.query(`
      CREATE TABLE IF NOT EXISTS item_presets (
        id            SERIAL PRIMARY KEY,
        category      TEXT NOT NULL CHECK (category IN ('room', 'event', 'misc')),
        description   TEXT NOT NULL,
        default_price NUMERIC(12,2) DEFAULT 0,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Seed default presets
    const defaultPresets = [
      ['room',  'Single Room Only', 350.00],
      ['room',  'Single Room with Breakfast', 450.00],
      ['room',  'Twin Room', 500.00],
      ['room',  'Twin Room with Half Board', 650.00],
      ['room',  'Executive Room with Full Board', 850.00],
      ['room',  'Deluxe Suite', 1200.00],
      ['event', 'Hall Rental', 2500.00],
      ['event', 'Coffee Break', 75.00],
      ['event', 'Lunch Buffet', 150.00],
      ['event', 'Dinner Banquet', 200.00],
      ['event', 'AV & Sound Supply', 1000.00],
      ['event', 'Stage & Floral Decoration', 1500.00],
      ['misc',  'Valet Parking Charges', 50.00],
      ['misc',  'Floral Decoration', 300.00],
      ['misc',  'Airport Transfer', 150.00],
      ['misc',  'Laundry Service', 80.00]
    ];

    for (const [category, description, price] of defaultPresets) {
      await client.query(
        'INSERT INTO item_presets (category, description, default_price) SELECT $1, $2, $3 WHERE NOT EXISTS (SELECT 1 FROM item_presets WHERE category = $1 AND description = $2)',
        [category, description, price]
      );
    }

    // Seed default settings
    const defaults = [
      ['hotel_name',            'Lotus Palace Hotel'],
      ['address_1',             'Olaya District, King Fahd Road'],
      ['address_2',             'PO Box 12345'],
      ['address_3',             'Building 44'],
      ['city',                  'Riyadh'],
      ['country',               'Saudi Arabia'],
      ['phone',                 '+966 11 456 7890'],
      ['email',                 'reservations@lotuspalace.com'],
      ['website',               'www.lotuspalace.com'],
      ['vat_number',            '310123456700003'],
      ['account_name',          ''],
      ['account_number',        ''],
      ['iban_number',           ''],
      ['bank_name',             ''],
      ['branch_name',           ''],
      ['swift_code',            ''],
      ['payment_terms',         'Please make payment within 7 days of invoice date.'],
      ['serial_prefix',         'PI-'],
      ['next_serial',           '1001'],
      ['next_customer_serial',  '1001'],
      ['hotel_logo',            ''],
      ['hotel_stamp',           '']
    ];

    for (const [key, value] of defaults) {
      await client.query(
        'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING',
        [key, value]
      );
    }

    await client.query('COMMIT');
    console.log('✅ Migration complete. All tables created and settings seeded.');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('❌ Migration failed:', err.message);
  } finally {
    client.release();
    if (closePool) await pool.end();
  }
}

if (require.main === module) {
  migrate(true);
}

module.exports = migrate;
