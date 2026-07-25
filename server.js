const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'database.db');

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Support base64 image uploads
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve frontend static assets from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Database setup
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to local SQLite database.');
    initializeDatabase();
  }
});

// Crypto Helpers
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const check = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === check;
}

// Generate simple mock JWT token (base64 encoded JSON)
function generateToken(user) {
  const payload = {
    username: user.username,
    role: user.role,
    exp: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

function decodeToken(token) {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

// Auth Middleware
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. Token missing.' });
  }
  const token = authHeader.split(' ')[1];
  const user = decodeToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized. Invalid or expired token.' });
  }
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Forbidden. Admin rights required.' });
  }
}

function initializeDatabase() {
  db.serialize(() => {
    // 1. Users Table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL
    )`);

    // 2. Settings Table
    db.run(`CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )`);

    // 3. Invoices Table
    db.run(`CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT UNIQUE NOT NULL,
      invoice_type TEXT NOT NULL, -- 'room', 'event', 'misc'
      company_name TEXT NOT NULL,
      contact_person TEXT,
      address_1 TEXT,
      address_2 TEXT,
      address_3 TEXT,
      city TEXT,
      country TEXT,
      customer_vat TEXT,
      invoice_date TEXT NOT NULL,
      currency TEXT DEFAULT 'SAR',
      subtotal REAL NOT NULL,
      discount_percent REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      municipality_fee REAL DEFAULT 0,
      vat_total REAL NOT NULL,
      advance_payment REAL DEFAULT 0,
      grand_total REAL NOT NULL,
      balance_due REAL NOT NULL,
      items TEXT NOT NULL, -- JSON string representing invoice items
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Run dynamic migrations to update older schema versions with customer columns
    const addColumn = (col, type) => {
      db.run(`ALTER TABLE invoices ADD COLUMN ${col} ${type}`, (err) => {
        // Ignore error if column already exists
      });
    };
    addColumn('contact_person', 'TEXT');
    addColumn('address_1', 'TEXT');
    addColumn('address_2', 'TEXT');
    addColumn('address_3', 'TEXT');
    addColumn('city', 'TEXT');
    addColumn('country', 'TEXT');
    addColumn('customer_vat', 'TEXT');

    // 4. Customers Table
    db.run(`CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_number TEXT UNIQUE NOT NULL,
      company_name TEXT NOT NULL,
      contact_person TEXT,
      address_1 TEXT,
      address_2 TEXT,
      address_3 TEXT,
      city TEXT,
      country TEXT,
      vat_number TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Seed default admin user if table is empty
    db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
      if (err) console.error('Error counting users:', err);
      else if (row.count === 0) {
        const defaultAdminHash = hashPassword('admin123');
        db.run('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', ['admin', defaultAdminHash, 'admin'], (err) => {
          if (err) console.error('Failed to seed default admin:', err);
          else console.log('Default admin user created successfully (username: admin, password: admin123).');
        });
      }
    });

    // Seed default settings
    const defaultSettings = [
      { key: 'hotel_name', value: 'Lotus Palace Hotel' },
      { key: 'address_1', value: 'Olaya District, King Fahd Road' },
      { key: 'address_2', value: 'PO Box 12345' },
      { key: 'address_3', value: 'Building 44' },
      { key: 'city', value: 'Riyadh' },
      { key: 'country', value: 'Saudi Arabia' },
      { key: 'phone', value: '+966 11 456 7890' },
      { key: 'email', value: 'reservations@lotuspalace.com' },
      { key: 'website', value: 'www.lotuspalace.com' },
      { key: 'vat_number', value: '310123456700003' },
      { key: 'account_name', value: '' },
      { key: 'account_number', value: '' },
      { key: 'iban_number', value: '' },
      { key: 'bank_name', value: '' },
      { key: 'branch_name', value: '' },
      { key: 'swift_code', value: '' },
      { key: 'payment_terms', value: 'Please make payment within 7 days of invoice date.' },
      { key: 'serial_prefix', value: 'PI-' },
      { key: 'next_serial', value: '1001' },
      { key: 'next_customer_serial', value: '1001' },
      { key: 'hotel_logo', value: '' },
      { key: 'hotel_stamp', value: '' }
    ];

    defaultSettings.forEach((item) => {
      db.run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', [item.key, item.value]);
    });
  });
}

// API Endpoints

// Authentication
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(404).json({ error: 'Username and password are required' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = generateToken(user);
    res.json({
      success: true,
      token,
      user: {
        username: user.username,
        role: user.role
      }
    });
  });
});

// Settings Management
app.get('/api/settings', authenticate, (req, res) => {
  db.all('SELECT key, value FROM settings', (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    const settingsObj = {};
    rows.forEach(row => {
      settingsObj[row.key] = row.value;
    });
    res.json(settingsObj);
  });
});

app.post('/api/settings', authenticate, (req, res) => {
  const settings = req.body;
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    for (const key in settings) {
      if (settings.hasOwnProperty(key)) {
        stmt.run(key, String(settings[key]));
      }
    }
    db.run('COMMIT', (err) => {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ error: 'Failed to save settings' });
      }
      res.json({ success: true, message: 'Settings updated successfully' });
    });
  });
  stmt.finalize();
});

// User Management (Admin only)
app.get('/api/users', authenticate, requireAdmin, (req, res) => {
  db.all('SELECT id, username, role FROM users', (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});

app.post('/api/users', authenticate, requireAdmin, (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !role) {
    return res.status(400).json({ error: 'Username and role are required' });
  }

  // Check if updating or creating
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, existingUser) => {
    if (err) return res.status(500).json({ error: 'Database error' });

    if (existingUser) {
      // Update
      if (password) {
        // Update password and role
        const hash = hashPassword(password);
        db.run('UPDATE users SET password_hash = ?, role = ? WHERE username = ?', [hash, role, username], function(err) {
          if (err) return res.status(500).json({ error: 'Database error' });
          res.json({ success: true, message: `User ${username} updated successfully` });
        });
      } else {
        // Update role only
        db.run('UPDATE users SET role = ? WHERE username = ?', [role, username], function(err) {
          if (err) return res.status(500).json({ error: 'Database error' });
          res.json({ success: true, message: `User ${username} role updated to ${role}` });
        });
      }
    } else {
      // Create new
      if (!password) {
        return res.status(400).json({ error: 'Password is required for new users' });
      }
      const hash = hashPassword(password);
      db.run('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', [username, hash, role], function(err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Username already exists' });
          }
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true, message: `User ${username} created successfully` });
      });
    }
  });
});

app.delete('/api/users/:username', authenticate, requireAdmin, (req, res) => {
  const targetUsername = req.params.username;
  if (targetUsername === req.user.username) {
    return res.status(400).json({ error: 'Cannot delete yourself' });
  }
  if (targetUsername === 'admin') {
    return res.status(400).json({ error: 'Cannot delete default admin user' });
  }

  db.run('DELETE FROM users WHERE username = ?', [targetUsername], function(err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ success: true, message: `User ${targetUsername} deleted` });
  });
});

// Invoices Management
app.post('/api/invoices', authenticate, (req, res) => {
  const {
    invoice_type,
    company_name,
    contact_person,
    address_1,
    address_2,
    address_3,
    city,
    country,
    customer_vat,
    invoice_date,
    subtotal,
    discount_percent,
    discount_amount,
    municipality_fee,
    vat_total,
    advance_payment,
    grand_total,
    balance_due,
    items
  } = req.body;

  if (!invoice_type || !company_name || !invoice_date || subtotal === undefined || vat_total === undefined || grand_total === undefined || balance_due === undefined || !items) {
    return res.status(400).json({ error: 'Missing required invoice parameters' });
  }

  // Double check calculations server-side for integrity (optional, but highly professional)
  // Let's enforce sequential serial incrementing in a transaction
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // Get suffix and prefix
    db.get("SELECT value FROM settings WHERE key = 'serial_prefix'", (err, rowPrefix) => {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ error: 'Database error reading prefix' });
      }
      
      db.get("SELECT value FROM settings WHERE key = 'next_serial'", (err, rowSerial) => {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Database error reading serial' });
        }

        const prefix = rowPrefix ? rowPrefix.value : 'PI-';
        const serialNum = parseInt(rowSerial ? rowSerial.value : '1001');
        const invoice_number = `${prefix}${serialNum}`;

        // Insert invoice
        db.run(
          `INSERT INTO invoices (
            invoice_number, invoice_type, company_name, contact_person, address_1, address_2, address_3, city, country, customer_vat, invoice_date, currency, 
            subtotal, discount_percent, discount_amount, municipality_fee, 
            vat_total, advance_payment, grand_total, balance_due, items, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SAR', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            invoice_number,
            invoice_type,
            company_name,
            contact_person || '',
            address_1 || '',
            address_2 || '',
            address_3 || '',
            city || '',
            country || '',
            customer_vat || '',
            invoice_date,
            subtotal,
            discount_percent || 0,
            discount_amount || 0,
            municipality_fee || 0,
            vat_total,
            advance_payment || 0,
            grand_total,
            balance_due,
            JSON.stringify(items),
            req.user.username
          ],
          function(err) {
            if (err) {
              db.run('ROLLBACK');
              console.error('Error inserting invoice:', err.message);
              return res.status(500).json({ error: 'Failed to record invoice: ' + err.message });
            }

            // Increment serial
            const nextSerialVal = String(serialNum + 1);
            db.run("UPDATE settings SET value = ? WHERE key = 'next_serial'", [nextSerialVal], (err) => {
              if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Failed to increment serial number' });
              }

              db.run('COMMIT', (err) => {
                if (err) {
                  db.run('ROLLBACK');
                  return res.status(500).json({ error: 'Transaction commit failed' });
                }
                
                // Return success details
                res.status(201).json({
                  success: true,
                  invoice_number,
                  invoice_id: this.lastID
                });
              });
            });
          }
        );
      });
    });
  });
});

// Search and retrieve invoice history
app.get('/api/invoices', authenticate, (req, res) => {
  const { search, type, date, amount } = req.query;

  let query = 'SELECT * FROM invoices WHERE 1=1';
  const params = [];

  if (search) {
    query += ' AND (company_name LIKE ? OR invoice_number LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (type) {
    query += ' AND invoice_type = ?';
    params.push(type);
  }

  if (date) {
    query += ' AND invoice_date = ?';
    params.push(date);
  }

  if (amount) {
    // Search close to the grand total or balance due
    query += ' AND (grand_total = ? OR balance_due = ?)';
    params.push(parseFloat(amount), parseFloat(amount));
  }

  query += ' ORDER BY created_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error searching invoices:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    // Parse items JSON for frontend ease
    const formatted = rows.map(row => ({
      ...row,
      items: JSON.parse(row.items)
    }));
    res.json(formatted);
  });
});

// Customer Management APIs
app.get('/api/customers', authenticate, (req, res) => {
  const { search } = req.query;
  let query = 'SELECT * FROM customers';
  const params = [];
  if (search) {
    query += ' WHERE company_name LIKE ? OR contact_person LIKE ? OR customer_number LIKE ?';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  query += ' ORDER BY company_name ASC';

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error searching customers:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

app.post('/api/customers', authenticate, (req, res) => {
  const { id, company_name, contact_person, address_1, address_2, address_3, city, country, vat_number } = req.body;
  if (!company_name) {
    return res.status(400).json({ error: 'Company Name is required' });
  }

  if (id) {
    // Update existing
    db.run(
      `UPDATE customers SET company_name = ?, contact_person = ?, address_1 = ?, address_2 = ?, address_3 = ?, city = ?, country = ?, vat_number = ? WHERE id = ?`,
      [company_name, contact_person || '', address_1 || '', address_2 || '', address_3 || '', city || '', country || '', vat_number || '', id],
      function(err) {
        if (err) return res.status(500).json({ error: 'Database error: ' + err.message });
        res.json({ success: true, message: 'Customer updated successfully' });
      }
    );
  } else {
    // Create new. Get next customer serial in a transaction
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      db.get("SELECT value FROM settings WHERE key = 'next_customer_serial'", (err, rowSerial) => {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Database error reading customer serial' });
        }
        
        const serialNum = parseInt(rowSerial ? rowSerial.value : '1001');
        const customer_number = `CUST-${serialNum}`;
        
        db.run(
          `INSERT INTO customers (customer_number, company_name, contact_person, address_1, address_2, address_3, city, country, vat_number)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [customer_number, company_name, contact_person || '', address_1 || '', address_2 || '', address_3 || '', city || '', country || '', vat_number || ''],
          function(err) {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Database error: ' + err.message });
            }
            
            const nextSerial = String(serialNum + 1);
            db.run("UPDATE settings SET value = ? WHERE key = 'next_customer_serial'", [nextSerial], (err) => {
              if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Failed to increment customer serial' });
              }
              
              db.run('COMMIT', (err) => {
                if (err) {
                  db.run('ROLLBACK');
                  return res.status(500).json({ error: 'Transaction commit failed' });
                }
                res.status(201).json({
                  success: true,
                  customer_number,
                  customer_id: this.lastID
                });
              });
            });
          }
        );
      });
    });
  }
});

app.delete('/api/customers/:id', authenticate, (req, res) => {
  const customerId = req.params.id;
  db.run('DELETE FROM customers WHERE id = ?', [customerId], function(err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ success: true, message: 'Customer deleted successfully' });
  });
});

// Serve frontend routing fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running locally at http://localhost:${PORT}`);
});
