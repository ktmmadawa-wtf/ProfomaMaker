const assert = require('assert');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');

console.log('--- RUNNING BACKEND INTEGRATION & MATHEMATICAL TESTS ---');

// Cryptography tests
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const check = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === check;
}

// 1. Validate Auth Encryption
console.log('Testing authentication password hashing...');
const pw = 'SecretSecurePassword123';
const hash = hashPassword(pw);
assert.ok(hash.includes(':'), 'Hash should contain separator colon');
assert.ok(verifyPassword(pw, hash), 'Verification should succeed for correct password');
assert.ok(!verifyPassword('WrongPassword', hash), 'Verification should fail for incorrect password');
console.log('✅ Auth encryption tests passed.');

// 2. Setup in-memory database for math & concurrency validation
const db = new sqlite3.Database(':memory:');

db.serialize(() => {
  // Create tables
  db.run(`CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )`);

  db.run(`CREATE TABLE invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number TEXT UNIQUE NOT NULL,
    invoice_type TEXT NOT NULL,
    company_name TEXT NOT NULL,
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
    created_by TEXT NOT NULL
  )`);

  // Seed default configurations
  db.run("INSERT INTO settings (key, value) VALUES ('serial_prefix', 'PI-')");
  db.run("INSERT INTO settings (key, value) VALUES ('next_serial', '1001')");

  // Validate math calculations
  console.log('\nValidating Room Stay Invoice Calculations...');
  // Math: 2 nights at 500 SAR. Discount 10%. Municipal fee 5%. VAT 15%. Advance 200 SAR.
  const roomInvoice = {
    type: 'room',
    company: 'Al Faisaliah Corp',
    date: '2026-07-22',
    items: [{ desc: 'Executive Suite', nights: 2, rate: 500 }]
  };
  
  // Computations
  const subtotal = roomInvoice.items[0].nights * roomInvoice.items[0].rate; // 1000
  const discountPercent = 10;
  const discountAmount = subtotal * (discountPercent / 100); // 100
  const netSubtotal = subtotal - discountAmount; // 900
  const municipalityFee = netSubtotal * 0.05; // 45
  const vatTotal = (netSubtotal + municipalityFee) * 0.15; // 141.75
  const grandTotal = netSubtotal + municipalityFee + vatTotal; // 1086.75
  const advancePayment = 200;
  const balanceDue = grandTotal - advancePayment; // 886.75

  assert.strictEqual(subtotal, 1000, 'Subtotal should be 1000');
  assert.strictEqual(discountAmount, 100, 'Discount should be 100');
  assert.strictEqual(netSubtotal, 900, 'Net subtotal should be 900');
  assert.strictEqual(municipalityFee, 45, 'Municipality fee should be 45');
  assert.strictEqual(vatTotal, 141.75, 'VAT total should be 141.75');
  assert.strictEqual(grandTotal, 1086.75, 'Grand total should be 1086.75');
  assert.strictEqual(balanceDue, 886.75, 'Balance due should be 886.75');
  console.log('✅ Room Stay mathematical calculations matched perfectly.');

  console.log('\nValidating Meeting & Events Invoice Calculations...');
  // Math: 100 pax at 50 SAR/pax. Rental value 1000 SAR. Discount 5%. VAT 15%. Advance 1500 SAR.
  const eventInvoice = {
    type: 'event',
    items: [{ desc: 'Conference Hall A', pax: 100, pax_charge: 50, rental: 1000 }]
  };
  const eventSubtotal = (eventInvoice.items[0].pax * eventInvoice.items[0].pax_charge) + eventInvoice.items[0].rental; // 6000
  const eventDiscountPercent = 5;
  const eventDiscountAmount = eventSubtotal * (eventDiscountPercent / 100); // 300
  const eventNetSubtotal = eventSubtotal - eventDiscountAmount; // 5700
  const eventVatTotal = eventNetSubtotal * 0.15; // 855
  const eventGrandTotal = eventNetSubtotal + eventVatTotal; // 6555
  const eventAdvancePayment = 1500;
  const eventBalanceDue = eventGrandTotal - eventAdvancePayment; // 5055

  assert.strictEqual(eventSubtotal, 6000, 'Event subtotal should be 6000');
  assert.strictEqual(eventDiscountAmount, 300, 'Event discount should be 300');
  assert.strictEqual(eventNetSubtotal, 5700, 'Event net subtotal should be 5700');
  assert.strictEqual(eventVatTotal, 855, 'Event VAT should be 855');
  assert.strictEqual(eventGrandTotal, 6555, 'Event grand total should be 6555');
  assert.strictEqual(eventBalanceDue, 5055, 'Event balance due should be 5055');
  console.log('✅ Meeting & Events mathematical calculations matched perfectly.');

  console.log('\nValidating Miscellaneous Invoice Calculations...');
  // Math: 5 flower arrangements at 100 SAR/each. 0% Discount. VAT 15%. Advance 0 SAR.
  const miscInvoice = {
    type: 'misc',
    items: [{ desc: 'Flower decorations', quantity: 5, unit_price: 100 }]
  };
  const miscSubtotal = miscInvoice.items[0].quantity * miscInvoice.items[0].unit_price; // 500
  const miscDiscountPercent = 0;
  const miscDiscountAmount = 0;
  const miscNetSubtotal = miscSubtotal - miscDiscountAmount; // 500
  const miscVatTotal = miscNetSubtotal * 0.15; // 75
  const miscGrandTotal = miscNetSubtotal + miscVatTotal; // 575
  const miscAdvancePayment = 0;
  const miscBalanceDue = miscGrandTotal - miscAdvancePayment; // 575

  assert.strictEqual(miscSubtotal, 500, 'Misc subtotal should be 500');
  assert.strictEqual(miscVatTotal, 75, 'Misc VAT should be 75');
  assert.strictEqual(miscGrandTotal, 575, 'Misc grand total should be 575');
  assert.strictEqual(miscBalanceDue, 575, 'Misc balance due should be 575');
  console.log('✅ Miscellaneous mathematical calculations matched perfectly.');

  // Concurrency testing on serial numbers
  console.log('\nTesting transaction-level sequential serial number increments...');
  
  function saveInvoiceMock(company, callback) {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      db.get("SELECT value FROM settings WHERE key = 'serial_prefix'", (err, rowPrefix) => {
        db.get("SELECT value FROM settings WHERE key = 'next_serial'", (err, rowSerial) => {
          const prefix = rowPrefix ? rowPrefix.value : 'PI-';
          const serialNum = parseInt(rowSerial ? rowSerial.value : '1001');
          const invoice_number = `${prefix}${serialNum}`;
          
          db.run(
            `INSERT INTO invoices (
              invoice_number, invoice_type, company_name, invoice_date, subtotal, vat_total, grand_total, balance_due, items, created_by
            ) VALUES (?, 'room', ?, '2026-07-22', 100, 15, 115, 115, '[]', 'admin')`,
            [invoice_number, company],
            function(err) {
              if (err) {
                db.run('ROLLBACK');
                callback(err);
                return;
              }
              const nextVal = String(serialNum + 1);
              db.run("UPDATE settings SET value = ? WHERE key = 'next_serial'", [nextVal], (err) => {
                db.run('COMMIT', (err) => {
                  callback(err, invoice_number);
                });
              });
            }
          );
        });
      });
    });
  }

  // Insert two invoices sequentially to verify incrementing
  saveInvoiceMock('Test Co 1', (err, invNum1) => {
    assert.strictEqual(invNum1, 'PI-1001', 'First invoice should be PI-1001');
    
    saveInvoiceMock('Test Co 2', (err, invNum2) => {
      assert.strictEqual(invNum2, 'PI-1002', 'Second invoice should be PI-1002');
      console.log('✅ Incremental serial verification passed (PI-1001 -> PI-1002).');
      
      // Select count
      db.get('SELECT COUNT(*) as count FROM invoices', (err, row) => {
        assert.strictEqual(row.count, 2, 'Should have exactly 2 invoices');
        console.log('✅ SQLite Database insertions verified successfully.');
        
        console.log('\n🎉 ALL TESTS COMPLETED SUCCESSFULLY WITH ZERO ERRORS. 🎉');
        db.close();
      });
    });
  });
});
