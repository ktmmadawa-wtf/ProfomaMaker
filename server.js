const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'database.db');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SALT_ROUNDS = 12;

const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || '';

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://profomamaker.onrender.com'] 
    : ['http://localhost:3000', 'http://localhost:10000'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Serve frontend static assets from public folder
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  etag: false
}));

// Database setup
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to local SQLite database.');
    initializeDatabase();
  }
});

// Password Helpers
async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  return await bcrypt.compare(password, storedHash);
}

// JWT Token Management
function generateToken(user) {
  return jwt.sign(
    { username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function decodeToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
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

function generateOtp() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

async function hashOtp(otp) {
  return await bcrypt.hash(otp, 10);
}

async function verifyOtp(otp, storedHash) {
  if (!storedHash) return false;
  return await bcrypt.compare(otp, storedHash);
}

function createTransporter() {
  if (!SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined
  });
}

async function sendOtpEmail(toEmail, otp) {
  const transporter = createTransporter();
  if (!transporter) {
    throw new Error('SMTP is not configured');
  }
  const mailOptions = {
    from: SMTP_FROM || SMTP_USER || 'noreply@localhost',
    to: toEmail,
    subject: 'Your Proforma Invoice Maker verification code',
    text: `Your verification code is ${otp}. It expires in 5 minutes.`,
    html: `<p>Your verification code is <strong>${otp}</strong>.</p><p>It expires in 5 minutes.</p>`
  };
  await transporter.sendMail(mailOptions);
}

async function getSmtpSettings() {
  if (SMTP_HOST) {
    return { host: SMTP_HOST, port: SMTP_PORT, user: SMTP_USER, from: SMTP_FROM };
  }
  return new Promise((resolve, reject) => {
    db.all("SELECT key, value FROM settings WHERE key IN ('smtp_host','smtp_port','smtp_user','smtp_from')", (err, rows) => {
      if (err) return reject(err);
      const settings = {};
      rows.forEach(r => { settings[r.key] = r.value; });
      if (!settings.smtp_host) return resolve(null);
      resolve({
        host: settings.smtp_host,
        port: parseInt(settings.smtp_port || '587', 10),
        user: settings.smtp_user || '',
        from: settings.smtp_from || ''
      });
    });
  });
}

function initializeDatabase() {
  db.serialize(() => {
    // 1. Users Table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      email TEXT,
      two_factor_enabled INTEGER DEFAULT 0
    )`);

    // Migrate existing users table if needed
    const addUserColumn = (col, type) => {
      db.run(`ALTER TABLE users ADD COLUMN ${col} ${type}`, (err) => {
        // Ignore error if column already exists
      });
    };
    addUserColumn('email', 'TEXT');
    addUserColumn('two_factor_enabled', 'INTEGER DEFAULT 0');

    // 2. Settings Table
    db.run(`CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )`);

    // 3. Invoices Table
    db.run(`CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT UNIQUE NOT NULL,
      invoice_type TEXT NOT NULL,
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
      items TEXT NOT NULL,
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

    // 5. Two Factor Authentication Codes Table
    db.run(`CREATE TABLE IF NOT EXISTS two_factor_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      code_hash TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // Seed default admin user if table is empty
    const seedDefaultAdmin = async () => {
      try {
        const count = await new Promise((resolve, reject) => {
          db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
            if (err) reject(err);
            else resolve(row ? row.count : 0);
          });
        });

        if (count === 0) {
          const defaultAdminHash = await hashPassword('admin123');
          await new Promise((resolve, reject) => {
            db.run(
              'INSERT INTO users (username, password_hash, role, email, two_factor_enabled) VALUES (?, ?, ?, ?, ?)',
              ['admin', defaultAdminHash, 'admin', '', 0],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
          console.log('Default admin user created successfully (username: admin, password: admin123).');
          console.log('WARNING: Please change this password immediately after first login!');
        }
      } catch (err) {
        console.error('Error seeding default admin:', err);
      }
    };

    seedDefaultAdmin();

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
      { key: 'hotel_stamp', value: '' },
      { key: 'smtp_host', value: '' },
      { key: 'smtp_port', value: '587' },
      { key: 'smtp_user', value: '' },
      { key: 'smtp_pass', value: '' },
      { key: 'smtp_from', value: '' }
    ];

    defaultSettings.forEach((item) => {
      db.run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', [item.key, item.value]);
    });
  });
}

// API Endpoints

// Authentication
app.post('/api/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    if (user.two_factor_enabled) {
      const otp = generateOtp();
      const otpHash = await hashOtp(otp);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO two_factor_codes (user_id, code_hash, expires_at) VALUES (?, ?, ?)',
          [user.id, otpHash, expiresAt],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      try {
        await sendOtpEmail(user.email, otp);
      } catch (mailErr) {
        console.error('Failed to send OTP email:', mailErr.message);
      }

      const tempToken = jwt.sign(
        { userId: user.id, step: '2fa' },
        JWT_SECRET,
        { expiresIn: '5m' }
      );

      return res.json({
        requiresTwoFactor: true,
        tempToken,
        message: user.email ? 'Verification code sent to your email' : 'Two-factor authentication is enabled but no email is set'
      });
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
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'An error occurred during login' });
  }
});

app.post('/api/auth/request-otp', authLimiter, async (req, res) => {
  try {
    const { tempToken } = req.body;
    if (!tempToken) {
      return res.status(400).json({ error: 'tempToken is required' });
    }

    const decoded = decodeToken(tempToken);
    if (!decoded || decoded.step !== '2fa') {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE id = ?', [decoded.userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const otp = generateOtp();
    const otpHash = await hashOtp(otp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO two_factor_codes (user_id, code_hash, expires_at) VALUES (?, ?, ?)',
        [user.id, otpHash, expiresAt],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    try {
      await sendOtpEmail(user.email, otp);
    } catch (mailErr) {
      console.error('Failed to send OTP email:', mailErr.message);
    }

    res.json({ success: true, message: 'Verification code resent' });
  } catch (error) {
    console.error('Request OTP error:', error.message);
    res.status(500).json({ error: 'An error occurred while requesting OTP' });
  }
});

app.post('/api/auth/verify-otp', authLimiter, async (req, res) => {
  try {
    const { tempToken, otp } = req.body;
    if (!tempToken || !otp) {
      return res.status(400).json({ error: 'tempToken and otp are required' });
    }

    const decoded = decodeToken(tempToken);
    if (!decoded || decoded.step !== '2fa') {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE id = ?', [decoded.userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const codeRow = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM two_factor_codes WHERE user_id = ? AND used = 0 ORDER BY id DESC LIMIT 1',
        [user.id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!codeRow) {
      return res.status(400).json({ error: 'No active verification code. Please request a new one.' });
    }

    if (new Date(codeRow.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Verification code expired. Please request a new one.' });
    }

    const isValid = await verifyOtp(otp, codeRow.code_hash);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    await new Promise((resolve, reject) => {
      db.run('UPDATE two_factor_codes SET used = 1 WHERE id = ?', [codeRow.id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const token = generateToken(user);
    res.json({
      success: true,
      token,
      user: {
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Verify OTP error:', error.message);
    res.status(500).json({ error: 'An error occurred while verifying OTP' });
  }
});

// Settings Management
app.get('/api/settings', authenticate, (req, res) => {
  db.all('SELECT key, value FROM settings', (err, rows) => {
    if (err) {
      console.error('Error fetching settings:', err.message);
      return res.status(500).json({ error: 'Failed to load settings' });
    }
    const settingsObj = {};
    rows.forEach(row => {
      settingsObj[row.key] = row.value;
    });
    res.json(settingsObj);
  });
});

app.post('/api/settings', authenticate, apiLimiter, (req, res) => {
  const settings = req.body;
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    for (const key in settings) {
      if (Object.prototype.hasOwnProperty.call(settings, key)) {
        stmt.run(key, String(settings[key]));
      }
    }
    db.run('COMMIT', (err) => {
      stmt.finalize();
      if (err) {
        db.run('ROLLBACK');
        console.error('Error saving settings:', err.message);
        return res.status(500).json({ error: 'Failed to save settings' });
      }
      res.json({ success: true, message: 'Settings updated successfully' });
    });
  });
});

// User Management (Admin only)
app.get('/api/users', authenticate, requireAdmin, (req, res) => {
  db.all('SELECT id, username, role, email, two_factor_enabled FROM users', (err, rows) => {
    if (err) {
      console.error('Error fetching users:', err.message);
      return res.status(500).json({ error: 'Failed to load users' });
    }
    res.json(rows);
  });
});

app.post('/api/users', authenticate, requireAdmin, apiLimiter, async (req, res) => {
  try {
    const { username, password, role, email, two_factor_enabled } = req.body;
    if (!username || !role) {
      return res.status(400).json({ error: 'Username and role are required' });
    }

    const existingUser = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existingUser) {
      if (password) {
        const hash = await hashPassword(password);
        await new Promise((resolve, reject) => {
          db.run(
            'UPDATE users SET password_hash = ?, role = ?, email = ?, two_factor_enabled = ? WHERE username = ?',
            [hash, role, email || '', two_factor_enabled ? 1 : 0, username],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
        res.json({ success: true, message: `User ${username} updated successfully` });
      } else {
        await new Promise((resolve, reject) => {
          db.run(
            'UPDATE users SET role = ?, email = ?, two_factor_enabled = ? WHERE username = ?',
            [role, email || '', two_factor_enabled ? 1 : 0, username],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
        res.json({ success: true, message: `User ${username} updated successfully` });
      }
    } else {
      if (!password) {
        return res.status(400).json({ error: 'Password is required for new users' });
      }
      const hash = await hashPassword(password);
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO users (username, password_hash, role, email, two_factor_enabled) VALUES (?, ?, ?, ?, ?)',
          [username, hash, role, email || '', two_factor_enabled ? 1 : 0],
          (err) => {
            if (err) {
              if (err.message.includes('UNIQUE')) {
                return res.status(400).json({ error: 'Username already exists' });
              }
              reject(err);
            } else {
              resolve();
            }
          }
        );
      });
      res.json({ success: true, message: `User ${username} created successfully` });
    }
  } catch (error) {
    console.error('Error saving user:', error.message);
    res.status(500).json({ error: 'Failed to save user' });
  }
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
    if (err) {
      console.error('Error deleting user:', err.message);
      return res.status(500).json({ error: 'Failed to delete user' });
    }
    res.json({ success: true, message: `User ${targetUsername} deleted` });
  });
});

// Invoices Management
app.post('/api/invoices', authenticate, apiLimiter, (req, res) => {
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

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

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
              return res.status(500).json({ error: 'Failed to record invoice' });
            }

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
    query += ' AND (grand_total = ? OR balance_due = ?)';
    params.push(parseFloat(amount), parseFloat(amount));
  }

  query += ' ORDER BY created_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error searching invoices:', err.message);
      return res.status(500).json({ error: 'Failed to retrieve invoices' });
    }
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
      return res.status(500).json({ error: 'Failed to load customers' });
    }
    res.json(rows);
  });
});

app.post('/api/customers', authenticate, apiLimiter, async (req, res) => {
  try {
    const { id, company_name, contact_person, address_1, address_2, address_3, city, country, vat_number } = req.body;
    if (!company_name) {
      return res.status(400).json({ error: 'Company Name is required' });
    }

    if (id) {
      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE customers SET company_name = ?, contact_person = ?, address_1 = ?, address_2 = ?, address_3 = ?, city = ?, country = ?, vat_number = ? WHERE id = ?`,
          [company_name, contact_person || '', address_1 || '', address_2 || '', address_3 || '', city || '', country || '', vat_number || '', id],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
      res.json({ success: true, message: 'Customer updated successfully' });
    } else {
      await new Promise((resolve, reject) => {
        db.serialize(() => {
          db.run('BEGIN TRANSACTION');
          db.get("SELECT value FROM settings WHERE key = 'next_customer_serial'", (err, rowSerial) => {
            if (err) {
              db.run('ROLLBACK');
              return reject(err);
            }
            
            const serialNum = parseInt(rowSerial ? rowSerial.value : '1001');
            const customer_number = `CUST-${serialNum}`;
            
            db.run(
              `INSERT INTO customers (customer_number, company_name, contact_person, address_1, address_2, address_3, city, country, vat_number)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [customer_number, company_name, contact_person || '', address_1 || '', address_2 || '', address_3 || '', city || '', country || '', vat_number || ''],
              (err) => {
                if (err) {
                  db.run('ROLLBACK');
                  return reject(err);
                }
                
                const nextSerial = String(serialNum + 1);
                db.run("UPDATE settings SET value = ? WHERE key = 'next_customer_serial'", [nextSerial], (err) => {
                  if (err) {
                    db.run('ROLLBACK');
                    return reject(err);
                  }
                  
                  db.run('COMMIT', (err) => {
                    if (err) {
                      db.run('ROLLBACK');
                      return reject(err);
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
      });
    }
  } catch (error) {
    console.error('Error saving customer:', error.message);
    res.status(500).json({ error: 'Failed to save customer' });
  }
});

app.delete('/api/customers/:id', authenticate, (req, res) => {
  const customerId = req.params.id;
  db.run('DELETE FROM customers WHERE id = ?', [customerId], function(err) {
    if (err) {
      console.error('Error deleting customer:', err.message);
      return res.status(500).json({ error: 'Failed to delete customer' });
    }
    res.json({ success: true, message: 'Customer deleted successfully' });
  });
});

// Serve frontend routing fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : err.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start the server
const startServer = () => {
  app.listen(PORT, () => {
    console.log(`Server is running locally at http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('WARNING: Running in development mode. Set NODE_ENV=production for deployment.');
      console.log('Default admin credentials: admin / admin123');
      console.log('IMPORTANT: Change the default password immediately after first login!');
    }
  });
};

startServer();
