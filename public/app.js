// ================= CONSTANTS & APP STATE =================
const API_URL = ''; // Relative since served by same server
const FIREBASE_CONFIG = window.FIREBASE_CONFIG || null;

let token = localStorage.getItem('token') || '';
let currentUser = null;
let currentInvoiceType = 'room'; // 'room', 'event', 'misc'
let hotelSettings = {};
let firebaseDb = null;
let firebaseReady = false;

// Arabic Translations Dictionary for Invoice Headers and Labels
const ARABIC_DICT = {
  // Common
  'Description': 'الوصف',
  'Total Charge': 'الإجمالي',
  'Subtotal': 'المجموع الفرعي',
  'Discount': 'الخصم',
  'VAT (15%)': 'ضريبة القيمة المضافة (١٥٪)',
  'Grand Total': 'الإجمالي الكلي',
  'Advance Payment': 'الدفعة المقدمة',
  'Balance Due': 'المبلغ المتبقي',
  
  // Room Stay Specific
  'Room Description': 'وصف الغرفة',
  'Arrival Date': 'تاريخ الوصول',
  'Departure Date': 'تاريخ المغادرة',
  'Nights': 'عدد الليالي',
  'Room Rate Net': 'سعر الغرفة الصافي',
  
  // Meeting & Events Specific
  'Event Description': 'وصف الفعالية',
  'Start Date': 'تاريخ البدء',
  'End Date': 'تاريخ الانتهاء',
  'No. of Pax': 'عدد الأشخاص',
  'Per Pax Charge': 'تكلفة الشخص الصافية',
  'Rental Value': 'قيمة إيجار القاعة',

  // Miscellaneous Specific
  'Item Description': 'وصف البند',
  'Quantity': 'الكمية',
  'Unit Price Net': 'سعر الوحدة الصافي',
  
  // Extras
  'Municipality Fee (5%)': 'رسوم البلدية (٥٪)',
};

// ================= SELECTORS =================
const elements = {
  loginOverlay: document.getElementById('login-overlay'),
  loginForm: document.getElementById('login-form'),
  loginUsername: document.getElementById('login-username'),
  loginPassword: document.getElementById('login-password'),
  loginError: document.getElementById('login-error'),
  
  appWrapper: document.getElementById('app-wrapper'),
  currentUsername: document.getElementById('current-username'),
  currentUserRole: document.getElementById('current-user-role'),
  logoutBtn: document.getElementById('logout-btn'),
  navUsers: document.getElementById('nav-users'),
  viewTitle: document.getElementById('view-title'),
  viewSubtitle: document.getElementById('view-subtitle'),
  firebaseStatus: document.getElementById('firebase-status'),
  
  // Tabs
  navItems: document.querySelectorAll('.nav-item'),
  viewPanels: document.querySelectorAll('.view-panel'),
  
  // Creator view elements
  invoiceForm: document.getElementById('invoice-form'),
  typeTabs: document.querySelectorAll('.type-tab'),
  tableHeaders: document.getElementById('table-headers'),
  tableRows: document.getElementById('table-rows'),
  addRowBtn: document.getElementById('add-row-btn'),
  invCompanyName: document.getElementById('inv-company-name'),
  invDate: document.getElementById('inv-date'),
  invDiscountPercent: document.getElementById('inv-discount-percent'),
  invAdvance: document.getElementById('inv-advance'),
  
  // Calculation fields
  sumSubtotal: document.getElementById('sum-subtotal'),
  sumDiscount: document.getElementById('sum-discount'),
  sumMunicipality: document.getElementById('sum-municipality'),
  sumVat: document.getElementById('sum-vat'),
  sumGrand: document.getElementById('sum-grand'),
  sumAdvance: document.getElementById('sum-advance'),
  sumBalance: document.getElementById('sum-balance'),
  discountRow: document.getElementById('discount-row'),
  municipalityRow: document.getElementById('municipality-row'),
  
  printEnBtn: document.getElementById('print-en-btn'),
  printArBtn: document.getElementById('print-ar-btn'),
  themeToggleBtn: document.getElementById('theme-toggle-btn'),
  themeToggleIcon: document.getElementById('theme-toggle-icon'),
  
  // History view elements
  searchQuery: document.getElementById('search-query'),
  searchType: document.getElementById('search-type'),
  searchDate: document.getElementById('search-date'),
  searchAmount: document.getElementById('search-amount'),
  searchBtn: document.getElementById('search-btn'),
  searchResetBtn: document.getElementById('search-reset-btn'),
  historyRows: document.getElementById('history-rows'),

  // Settings view elements
  settingsForm: document.getElementById('settings-form'),
  setHotelName: document.getElementById('set-hotel-name'),
  setVatNumber: document.getElementById('set-vat-number'),
  setAddress1: document.getElementById('set-address-1'),
  setAddress2: document.getElementById('set-address-2'),
  setAddress3: document.getElementById('set-address-3'),
  setCity: document.getElementById('set-city'),
  setCountry: document.getElementById('set-country'),
  setPhone: document.getElementById('set-phone'),
  setEmail: document.getElementById('set-email'),
  setWebsite: document.getElementById('set-website'),
  setAccountName: document.getElementById('set-account-name'),
  setAccountNumber: document.getElementById('set-account-number'),
  setIbanNumber: document.getElementById('set-iban-number'),
  setBankName: document.getElementById('set-bank-name'),
  setBranchName: document.getElementById('set-branch-name'),
  setSwiftCode: document.getElementById('set-swift-code'),
  setPaymentTerms: document.getElementById('set-payment-terms'),
  setSerialPrefix: document.getElementById('set-serial-prefix'),
  setNextSerial: document.getElementById('set-next-serial'),
  uploadLogo: document.getElementById('upload-logo'),
  logoPreviewImg: document.getElementById('logo-preview-img'),
  logoPreviewBox: document.getElementById('logo-preview-box'),
  removeLogoBtn: document.getElementById('remove-logo-btn'),
  uploadStamp: document.getElementById('upload-stamp'),
  stampPreviewImg: document.getElementById('stamp-preview-img'),
  stampPreviewBox: document.getElementById('stamp-preview-box'),
  removeStampBtn: document.getElementById('remove-stamp-btn'),
  settingsStatus: document.getElementById('settings-status'),
  
  // Users view elements
  userForm: document.getElementById('user-form'),
  userFormTitle: document.getElementById('user-form-title'),
  userUsername: document.getElementById('user-username'),
  userPassword: document.getElementById('user-password'),
  userPasswordLabel: document.getElementById('user-password-label'),
  userPassHelp: document.getElementById('user-pass-help'),
  userRole: document.getElementById('user-role'),
  saveUserBtn: document.getElementById('save-user-btn'),
  cancelUserEditBtn: document.getElementById('cancel-user-edit-btn'),
  usersListRows: document.getElementById('users-list-rows'),
  userError: document.getElementById('user-error'),

  // Creator customer fields
  invCustSearch: document.getElementById('inv-cust-search'),
  custSearchSuggestions: document.getElementById('cust-search-suggestions'),
  invContactPerson: document.getElementById('inv-contact-person'),
  invAddress1: document.getElementById('inv-address-1'),
  invAddress2: document.getElementById('inv-address-2'),
  invAddress3: document.getElementById('inv-address-3'),
  invCity: document.getElementById('inv-city'),
  invCountry: document.getElementById('inv-country'),
  invCustVat: document.getElementById('inv-cust-vat'),
  saveAsNewCustBtn: document.getElementById('save-as-new-cust-btn'),

  // Customer Management View
  customerForm: document.getElementById('customer-form'),
  custFormTitle: document.getElementById('cust-form-title'),
  custId: document.getElementById('cust-id'),
  custCompanyName: document.getElementById('cust-company-name'),
  custContactPerson: document.getElementById('cust-contact-person'),
  custVatNumber: document.getElementById('cust-vat-number'),
  custAddress1: document.getElementById('cust-address-1'),
  custAddress2: document.getElementById('cust-address-2'),
  custAddress3: document.getElementById('cust-address-3'),
  custCity: document.getElementById('cust-city'),
  custCountry: document.getElementById('cust-country'),
  saveCustBtn: document.getElementById('save-cust-btn'),
  cancelCustEditBtn: document.getElementById('cancel-cust-edit-btn'),
  custFormError: document.getElementById('cust-form-error'),
  custListSearch: document.getElementById('cust-list-search'),
  customersListRows: document.getElementById('customers-list-rows')
};

// State Variables for Uploads
let logoBase64 = '';
let stampBase64 = '';
let editingUserUsername = null;
let editingCustomerId = null;

// ================= FIREBASE INTEGRATION =================
function updateFirebaseStatus(message) {
  if (elements.firebaseStatus) {
    elements.firebaseStatus.textContent = message;
  }
}

function initializeFirebase() {
  if (!window.firebase) {
    updateFirebaseStatus('Firebase: SDK missing');
    console.warn('Firebase SDK is not available. Add your project credentials and load the Firebase scripts.');
    return false;
  }

  const hasPlaceholderConfig = !FIREBASE_CONFIG.projectId || FIREBASE_CONFIG.projectId.includes('YOUR_PROJECT_ID');
  if (hasPlaceholderConfig) {
    updateFirebaseStatus('Firebase: not configured');
    console.warn('Firebase config is still using placeholder values. Replace the values in app.js before syncing data.');
    return false;
  }

  try {
    firebase.initializeApp(FIREBASE_CONFIG);
    firebaseDb = firebase.firestore();
    firebaseReady = true;
    updateFirebaseStatus('Firebase: connected');
    console.log('Firebase ready for Firestore sync.');
    return true;
  } catch (error) {
    updateFirebaseStatus('Firebase: init failed');
    console.error('Failed to initialize Firebase:', error);
    return false;
  }
}

async function syncInvoiceToFirebase(payload, invoiceNumber) {
  if (!firebaseReady || !firebaseDb) {
    updateFirebaseStatus('Firebase: not ready');
    return;
  }

  try {
    await firebaseDb.collection('invoices').doc(invoiceNumber).set({
      ...payload,
      invoice_number: invoiceNumber,
      syncedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    updateFirebaseStatus(`Firebase: synced ${invoiceNumber}`);
    console.log(`Invoice ${invoiceNumber} synced to Firebase.`);
  } catch (error) {
    updateFirebaseStatus('Firebase: sync failed');
    console.error('Firebase sync failed:', error);
  }
}

initializeFirebase();

// ================= AUTHENTICATION ACTIONS =================

async function performLogin(username, password) {
  elements.loginError.textContent = '';
  try {
    const response = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }
    
    token = data.token;
    currentUser = data.user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(currentUser));
    
    showApp();
    await loadSettings();
    loadInvoices();
    loadCustomers();
    if (currentUser.role === 'admin') {
      elements.navUsers.classList.remove('hidden');
      loadUsers();
    } else {
      elements.navUsers.classList.add('hidden');
    }
  } catch (error) {
    elements.loginError.textContent = error.message || 'Unable to sign in right now.';
    elements.loginPassword.focus();
  }
}

async function checkLoginState() {
  const cachedUser = localStorage.getItem('user');
  if (token && cachedUser) {
    currentUser = JSON.parse(cachedUser);
    showApp();
    await loadSettings();
    loadInvoices();
    loadCustomers();
    if (currentUser.role === 'admin') {
      elements.navUsers.classList.remove('hidden');
      loadUsers();
    } else {
      elements.navUsers.classList.add('hidden');
    }
  } else {
    showLogin();
  }
}

function showLogin() {
  elements.loginOverlay.classList.add('active');
  elements.appWrapper.classList.add('hidden');
  setTimeout(() => elements.loginUsername.focus(), 50);
}

function showApp() {
  elements.loginOverlay.classList.remove('active');
  elements.appWrapper.classList.remove('hidden');
  elements.currentUsername.textContent = currentUser.username;
  elements.currentUserRole.textContent = currentUser.role;
  document.querySelector('.nav-item.active')?.focus();
}

function performLogout() {
  token = '';
  currentUser = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  showLogin();
}

// Helper to construct headers with Auth
function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

// ================= SYSTEM ROUTING =================
elements.navItems.forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const target = item.getAttribute('data-target');
    
    // Toggle active classes on nav link
    elements.navItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    
    // Toggle active view panel
    elements.viewPanels.forEach(panel => panel.classList.remove('active'));
    document.getElementById(target).classList.add('active');
    
    // Update top header titles
    if (target === 'creator-view') {
      elements.viewTitle.textContent = 'Create Proforma Invoice';
      elements.viewSubtitle.textContent = 'Enter invoice details to calculate fees and generate files';
    } else if (target === 'history-view') {
      elements.viewTitle.textContent = 'Invoice History';
      elements.viewSubtitle.textContent = 'Search, preview, and download previously recorded invoices';
      loadInvoices();
    } else if (target === 'customers-view') {
      elements.viewTitle.textContent = 'Customer Database';
      elements.viewSubtitle.textContent = 'Manage contact profiles, addresses, and VAT numbers for invoicing';
      loadCustomers();
    } else if (target === 'settings-view') {
      elements.viewTitle.textContent = 'System & Hotel settings';
      elements.viewSubtitle.textContent = 'Modify brand information, upload logo/stamp, and adjust numbering';
    } else if (target === 'users-view') {
      elements.viewTitle.textContent = 'User Accounts';
      elements.viewSubtitle.textContent = 'Manage access rights, add new staff accounts, or reset credentials';
      loadUsers();
    }
  });
});


// ================= SETTINGS MANAGEMENT =================
async function loadSettings() {
  try {
    const res = await fetch(`${API_URL}/api/settings`, { headers: getHeaders() });
    if (res.status === 401) return performLogout();
    if (!res.ok) throw new Error('Failed to load settings');
    
    hotelSettings = await res.json();
    
    // Fill Settings inputs
    elements.setHotelName.value = hotelSettings.hotel_name || '';
    elements.setVatNumber.value = hotelSettings.vat_number || '';
    elements.setAddress1.value = hotelSettings.address_1 || '';
    elements.setAddress2.value = hotelSettings.address_2 || '';
    elements.setAddress3.value = hotelSettings.address_3 || '';
    elements.setCity.value = hotelSettings.city || '';
    elements.setCountry.value = hotelSettings.country || '';
    elements.setPhone.value = hotelSettings.phone || '';
    elements.setEmail.value = hotelSettings.email || '';
    elements.setWebsite.value = hotelSettings.website || '';
    elements.setAccountName.value = hotelSettings.account_name || '';
    elements.setAccountNumber.value = hotelSettings.account_number || '';
    elements.setIbanNumber.value = hotelSettings.iban_number || '';
    elements.setBankName.value = hotelSettings.bank_name || '';
    elements.setBranchName.value = hotelSettings.branch_name || '';
    elements.setSwiftCode.value = hotelSettings.swift_code || '';
    elements.setPaymentTerms.value = hotelSettings.payment_terms || '';
    elements.setSerialPrefix.value = hotelSettings.serial_prefix || '';
    elements.setNextSerial.value = hotelSettings.next_serial || '';
    
    // Previews
    if (hotelSettings.hotel_logo) {
      logoBase64 = hotelSettings.hotel_logo;
      elements.logoPreviewImg.src = logoBase64;
      elements.logoPreviewImg.classList.remove('hidden');
      elements.logoPreviewBox.querySelector('.preview-placeholder').classList.add('hidden');
      elements.removeLogoBtn.classList.remove('hidden');
    }
    if (hotelSettings.hotel_stamp) {
      stampBase64 = hotelSettings.hotel_stamp;
      elements.stampPreviewImg.src = stampBase64;
      elements.stampPreviewImg.classList.remove('hidden');
      elements.stampPreviewBox.querySelector('.preview-placeholder').classList.add('hidden');
      elements.removeStampBtn.classList.remove('hidden');
    }
  } catch (error) {
    console.error(error);
  }
}

// Convert files to base64
function handleImageUpload(inputEl, previewImg, previewBox, removeBtn, setterCallback) {
  const file = inputEl.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const base64 = e.target.result;
    previewImg.src = base64;
    previewImg.classList.remove('hidden');
    previewBox.querySelector('.preview-placeholder').classList.add('hidden');
    removeBtn.classList.remove('hidden');
    setterCallback(base64);
  };
  reader.readAsDataURL(file);
}

elements.uploadLogo.addEventListener('change', () => {
  handleImageUpload(elements.uploadLogo, elements.logoPreviewImg, elements.logoPreviewBox, elements.removeLogoBtn, (val) => logoBase64 = val);
});

elements.uploadStamp.addEventListener('change', () => {
  handleImageUpload(elements.uploadStamp, elements.stampPreviewImg, elements.stampPreviewBox, elements.removeStampBtn, (val) => stampBase64 = val);
});

elements.removeLogoBtn.addEventListener('click', () => {
  logoBase64 = '';
  elements.logoPreviewImg.src = '';
  elements.logoPreviewImg.classList.add('hidden');
  elements.logoPreviewBox.querySelector('.preview-placeholder').classList.remove('hidden');
  elements.removeLogoBtn.classList.add('hidden');
  elements.uploadLogo.value = '';
});

elements.removeStampBtn.addEventListener('click', () => {
  stampBase64 = '';
  elements.stampPreviewImg.src = '';
  elements.stampPreviewImg.classList.add('hidden');
  elements.stampPreviewBox.querySelector('.preview-placeholder').classList.remove('hidden');
  elements.removeStampBtn.classList.add('hidden');
  elements.uploadStamp.value = '';
});

elements.settingsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const payload = {
    hotel_name: elements.setHotelName.value,
    vat_number: elements.setVatNumber.value,
    address_1: elements.setAddress1.value,
    address_2: elements.setAddress2.value,
    address_3: elements.setAddress3.value,
    city: elements.setCity.value,
    country: elements.setCountry.value,
    phone: elements.setPhone.value,
    email: elements.setEmail.value,
    website: elements.setWebsite.value,
    account_name: elements.setAccountName.value,
    account_number: elements.setAccountNumber.value,
    iban_number: elements.setIbanNumber.value,
    bank_name: elements.setBankName.value,
    branch_name: elements.setBranchName.value,
    swift_code: elements.setSwiftCode.value,
    payment_terms: elements.setPaymentTerms.value,
    serial_prefix: elements.setSerialPrefix.value,
    next_serial: elements.setNextSerial.value,
    hotel_logo: logoBase64,
    hotel_stamp: stampBase64
  };
  
  try {
    const res = await fetch(`${API_URL}/api/settings`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save settings');
    
    showSettingsAlert('Configuration saved successfully!', 'success');
    loadSettings(); // Reload
  } catch (error) {
    showSettingsAlert(error.message, 'error');
  }
});

function showSettingsAlert(msg, type) {
  elements.settingsStatus.textContent = msg;
  elements.settingsStatus.className = `alert-box text-center ${type}`;
  elements.settingsStatus.classList.remove('hidden');
  setTimeout(() => elements.settingsStatus.classList.add('hidden'), 5000);
}


// ================= USER ACCOUNT MANAGEMENT =================
async function loadUsers() {
  try {
    const res = await fetch(`${API_URL}/api/users`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to load users');
    const users = await res.json();
    
    elements.usersListRows.innerHTML = '';
    users.forEach(u => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${u.username}</strong></td>
        <td><span class="badge ${u.role === 'admin' ? 'btn-primary' : 'btn-secondary'}" style="font-size: 0.75rem; padding: 2px 6px;">${u.role}</span></td>
        <td class="cell-actions">
          <button class="btn btn-secondary btn-sm edit-user-btn" data-username="${u.username}" data-role="${u.role}">
            <i class="fa-solid fa-edit"></i> Edit
          </button>
          <button class="btn btn-outline-danger btn-sm delete-user-btn" data-username="${u.username}">
            <i class="fa-solid fa-trash"></i> Delete
          </button>
        </td>
      `;
      elements.usersListRows.appendChild(tr);
    });
    
    // Bind actions
    document.querySelectorAll('.edit-user-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const username = btn.getAttribute('data-username');
        const role = btn.getAttribute('data-role');
        
        editingUserUsername = username;
        elements.userFormTitle.textContent = `Edit User: ${username}`;
        elements.userUsername.value = username;
        elements.userUsername.setAttribute('disabled', 'true');
        elements.userRole.value = role;
        
        elements.userPassword.removeAttribute('required');
        elements.userPasswordLabel.innerHTML = 'New Password <span class="text-muted">(Optional)</span>';
        elements.userPassHelp.textContent = 'Leave blank to keep existing password';
        elements.saveUserBtn.textContent = 'Update Account';
        elements.cancelUserEditBtn.classList.remove('hidden');
      });
    });
    
    document.querySelectorAll('.delete-user-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const username = btn.getAttribute('data-username');
        if (!confirm(`Are you sure you want to delete account "${username}"?`)) return;
        
        try {
          const res = await fetch(`${API_URL}/api/users/${username}`, {
            method: 'DELETE',
            headers: getHeaders()
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to delete user');
          loadUsers();
        } catch (error) {
          alert(error.message);
        }
      });
    });
  } catch (error) {
    console.error(error);
  }
}

elements.cancelUserEditBtn.addEventListener('click', resetUserForm);

function resetUserForm() {
  editingUserUsername = null;
  elements.userFormTitle.textContent = 'Add New User';
  elements.userForm.reset();
  elements.userUsername.removeAttribute('disabled');
  elements.userPassword.setAttribute('required', 'true');
  elements.userPasswordLabel.textContent = 'Password';
  elements.userPassHelp.textContent = 'Required for new accounts';
  elements.saveUserBtn.textContent = 'Create Account';
  elements.cancelUserEditBtn.classList.add('hidden');
  elements.userError.textContent = '';
}

elements.userForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const payload = {
    username: elements.userUsername.value,
    password: elements.userPassword.value,
    role: elements.userRole.value
  };
  
  try {
    const res = await fetch(`${API_URL}/api/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save user');
    
    resetUserForm();
    loadUsers();
  } catch (error) {
    elements.userError.textContent = error.message;
  }
});


// ================= INVOICE CREATOR TAB LOGIC =================

// Dynamic Headers based on Invoice type
const HEADERS = {
  room: ['Room Description', 'Arrival Date', 'Departure Date', 'Nights', 'Room Rate Net (SAR)', 'Total Charge (SAR)', 'Action'],
  event: ['Event Description', 'Start Date', 'End Date', 'No. of Pax', 'Per Pax Charge Net (SAR)', 'Rental Value (SAR)', 'Total Charge (SAR)', 'Action'],
  misc: ['Item Description', 'Quantity', 'Unit Price Net (SAR)', 'Total Charge (SAR)', 'Action']
};

elements.typeTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    elements.typeTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    currentInvoiceType = tab.getAttribute('data-type');
    renderTableHeaders();
    elements.tableRows.innerHTML = '';
    addNewRow();
    recalculateInvoice();
  });
});

function renderTableHeaders() {
  const headers = HEADERS[currentInvoiceType];
  elements.tableHeaders.innerHTML = '';
  headers.forEach(h => {
    const th = document.createElement('th');
    th.textContent = h;
    if (h === 'Action') th.className = 'actions-col';
    elements.tableHeaders.appendChild(th);
  });
}

function addNewRow() {
  const tr = document.createElement('tr');
  tr.className = 'invoice-item-row';
  
  let inputsHtml = '';
  
  if (currentInvoiceType === 'room') {
    inputsHtml = `
      <td class="invoice-desc-cell"><input type="text" class="row-desc" placeholder="e.g. Deluxe Room" required></td>
      <td class="invoice-date-cell">
        <div class="date-input-wrap">
          <input type="date" class="row-arrival" lang="en-GB" placeholder="dd/mm/yyyy" required>
          <span class="date-input-hint">DD/MM/YYYY</span>
        </div>
      </td>
      <td class="invoice-date-cell">
        <div class="date-input-wrap">
          <input type="date" class="row-departure" lang="en-GB" placeholder="dd/mm/yyyy" required>
          <span class="date-input-hint">DD/MM/YYYY</span>
        </div>
      </td>
      <td class="invoice-number-cell"><input type="number" class="row-nights" min="1" placeholder="Nights" required></td>
      <td class="invoice-number-cell"><input type="number" class="row-rate" min="0" step="0.01" placeholder="0.00" required></td>
      <td class="invoice-number-cell"><input type="number" class="row-total" placeholder="0.00" disabled></td>
    `;
  } else if (currentInvoiceType === 'event') {
    inputsHtml = `
      <td class="invoice-desc-cell"><input type="text" class="row-desc" placeholder="e.g. Wedding Hall Setup" required></td>
      <td class="invoice-date-cell">
        <div class="date-input-wrap">
          <input type="date" class="row-start" lang="en-GB" placeholder="dd/mm/yyyy" required>
          <span class="date-input-hint">DD/MM/YYYY</span>
        </div>
      </td>
      <td class="invoice-date-cell">
        <div class="date-input-wrap">
          <input type="date" class="row-end" lang="en-GB" placeholder="dd/mm/yyyy" required>
          <span class="date-input-hint">DD/MM/YYYY</span>
        </div>
      </td>
      <td class="invoice-number-cell"><input type="number" class="row-pax" min="0" placeholder="Pax" required></td>
      <td class="invoice-number-cell"><input type="number" class="row-pax-charge" min="0" step="0.01" placeholder="0.00" required></td>
      <td class="invoice-number-cell"><input type="number" class="row-rental" min="0" step="0.01" placeholder="0.00" required></td>
      <td class="invoice-number-cell"><input type="number" class="row-total" placeholder="0.00" disabled></td>
    `;
  } else if (currentInvoiceType === 'misc') {
    inputsHtml = `
      <td class="invoice-desc-cell"><input type="text" class="row-desc" placeholder="e.g. Florist Cover Fee" required></td>
      <td class="invoice-number-cell"><input type="number" class="row-qty" min="1" placeholder="Qty" required></td>
      <td class="invoice-number-cell"><input type="number" class="row-unit-price" min="0" step="0.01" placeholder="0.00" required></td>
      <td class="invoice-number-cell"><input type="number" class="row-total" placeholder="0.00" disabled></td>
    `;
  }
  
  inputsHtml += `
    <td class="cell-actions invoice-actions-cell">
      <button type="button" class="btn-icon-only remove-row-btn" title="Delete Row">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    </td>
  `;
  
  tr.innerHTML = inputsHtml;
  elements.tableRows.appendChild(tr);
  
  // Attach Change Listeners
  attachRowListeners(tr);
}

function attachRowListeners(row) {
  // Nights auto calculations for Rooms
  if (currentInvoiceType === 'room') {
    const arrival = row.querySelector('.row-arrival');
    const departure = row.querySelector('.row-departure');
    const nights = row.querySelector('.row-nights');
    const rate = row.querySelector('.row-rate');
    
    const computeNights = () => {
      if (arrival.value && departure.value) {
        const d1 = new Date(arrival.value);
        const d2 = new Date(departure.value);
        if (!isNaN(d1) && !isNaN(d2) && d2 > d1) {
          const diff = Math.abs(d2 - d1);
          const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
          nights.value = days;
        }
      }
      calculateRowTotal(row);
    };
    
    arrival.addEventListener('change', computeNights);
    departure.addEventListener('change', computeNights);
    nights.addEventListener('input', () => calculateRowTotal(row));
    rate.addEventListener('input', () => calculateRowTotal(row));
  }
  
  // Events Calculations
  else if (currentInvoiceType === 'event') {
    const pax = row.querySelector('.row-pax');
    const paxCharge = row.querySelector('.row-pax-charge');
    const rental = row.querySelector('.row-rental');
    
    const triggerRecalc = () => calculateRowTotal(row);
    pax.addEventListener('input', triggerRecalc);
    paxCharge.addEventListener('input', triggerRecalc);
    rental.addEventListener('input', triggerRecalc);
  }
  
  // Misc Calculations
  else if (currentInvoiceType === 'misc') {
    const qty = row.querySelector('.row-qty');
    const unitPrice = row.querySelector('.row-unit-price');
    
    const triggerRecalc = () => calculateRowTotal(row);
    qty.addEventListener('input', triggerRecalc);
    unitPrice.addEventListener('input', triggerRecalc);
  }
  
  // Remove button
  row.querySelector('.remove-row-btn').addEventListener('click', () => {
    if (elements.tableRows.children.length > 1) {
      row.remove();
      recalculateInvoice();
    } else {
      alert("At least one row is required in the invoice!");
    }
  });
}

function calculateRowTotal(row) {
  let total = 0;
  
  if (currentInvoiceType === 'room') {
    const nights = parseFloat(row.querySelector('.row-nights').value) || 0;
    const rate = parseFloat(row.querySelector('.row-rate').value) || 0;
    total = nights * rate;
  } else if (currentInvoiceType === 'event') {
    const pax = parseFloat(row.querySelector('.row-pax').value) || 0;
    const paxCharge = parseFloat(row.querySelector('.row-pax-charge').value) || 0;
    const rental = parseFloat(row.querySelector('.row-rental').value) || 0;
    total = (pax * paxCharge) + rental;
  } else if (currentInvoiceType === 'misc') {
    const qty = parseFloat(row.querySelector('.row-qty').value) || 0;
    const unitPrice = parseFloat(row.querySelector('.row-unit-price').value) || 0;
    total = qty * unitPrice;
  }
  
  row.querySelector('.row-total').value = total.toFixed(2);
  recalculateInvoice();
}

function recalculateInvoice() {
  let subtotal = 0;
  
  // Sum row totals
  document.querySelectorAll('.invoice-item-row').forEach(row => {
    const totalEl = row.querySelector('.row-total');
    if (totalEl) {
      subtotal += parseFloat(totalEl.value) || 0;
    }
  });
  
  const discountPercent = parseFloat(elements.invDiscountPercent.value) || 0;
  const advancePayment = parseFloat(elements.invAdvance.value) || 0;
  
  const discountAmount = subtotal * (discountPercent / 100);
  const netSubtotal = subtotal - discountAmount;
  
  let municipalityFee = 0;
  let vat = 0;
  
  if (currentInvoiceType === 'room') {
    municipalityFee = netSubtotal * 0.05;
    vat = (netSubtotal + municipalityFee) * 0.15;
    
    // Reveal rows in math panel
    elements.municipalityRow.classList.remove('hidden');
    elements.sumMunicipality.textContent = municipalityFee.toFixed(2);
  } else {
    vat = netSubtotal * 0.15;
    elements.municipalityRow.classList.add('hidden');
  }
  
  const grandTotal = netSubtotal + municipalityFee + vat;
  const balanceDue = grandTotal - advancePayment;
  
  // Update view fields
  elements.sumSubtotal.textContent = subtotal.toFixed(2);
  
  if (discountPercent > 0) {
    elements.discountRow.classList.remove('hidden');
    elements.sumDiscount.textContent = discountAmount.toFixed(2);
  } else {
    elements.discountRow.classList.add('hidden');
  }
  
  elements.sumVat.textContent = vat.toFixed(2);
  elements.sumGrand.textContent = grandTotal.toFixed(2);
  elements.sumAdvance.textContent = advancePayment.toFixed(2);
  elements.sumBalance.textContent = balanceDue.toFixed(2);
}

// Attach event listeners to math settings inputs
elements.invDiscountPercent.addEventListener('input', recalculateInvoice);
elements.invAdvance.addEventListener('input', recalculateInvoice);
elements.addRowBtn.addEventListener('click', addNewRow);

// Set default date to today
elements.invDate.value = new Date().toISOString().split('T')[0];


// ================= PRINT & GENERATE INVOICES =================

async function saveAndPrintInvoice(lang) {
  // Validate Form
  if (!elements.invoiceForm.checkValidity()) {
    elements.invoiceForm.reportValidity();
    return;
  }
  
  // Compile Invoice Rows
  const items = [];
  document.querySelectorAll('.invoice-item-row').forEach(row => {
    const desc = row.querySelector('.row-desc').value;
    
    if (currentInvoiceType === 'room') {
      items.push({
        description: desc,
        arrival: row.querySelector('.row-arrival').value,
        departure: row.querySelector('.row-departure').value,
        nights: parseInt(row.querySelector('.row-nights').value) || 0,
        rate: parseFloat(row.querySelector('.row-rate').value) || 0,
        total: parseFloat(row.querySelector('.row-total').value) || 0
      });
    } else if (currentInvoiceType === 'event') {
      items.push({
        description: desc,
        start_date: row.querySelector('.row-start').value,
        end_date: row.querySelector('.row-end').value,
        pax: parseInt(row.querySelector('.row-pax').value) || 0,
        pax_charge: parseFloat(row.querySelector('.row-pax-charge').value) || 0,
        rental: parseFloat(row.querySelector('.row-rental').value) || 0,
        total: parseFloat(row.querySelector('.row-total').value) || 0
      });
    } else if (currentInvoiceType === 'misc') {
      items.push({
        description: desc,
        quantity: parseInt(row.querySelector('.row-qty').value) || 0,
        unit_price: parseFloat(row.querySelector('.row-unit-price').value) || 0,
        total: parseFloat(row.querySelector('.row-total').value) || 0
      });
    }
  });

  const subtotal = parseFloat(elements.sumSubtotal.textContent);
  const discountPercent = parseFloat(elements.invDiscountPercent.value) || 0;
  const discountAmount = parseFloat(elements.sumDiscount.textContent) || 0;
  const municipalityFee = parseFloat(elements.sumMunicipality.textContent) || 0;
  const vatTotal = parseFloat(elements.sumVat.textContent);
  const advancePayment = parseFloat(elements.invAdvance.value) || 0;
  const grandTotal = parseFloat(elements.sumGrand.textContent);
  const balanceDue = parseFloat(elements.sumBalance.textContent);
  
  const payload = {
    invoice_type: currentInvoiceType,
    company_name: elements.invCompanyName.value.trim(),
    contact_person: elements.invContactPerson.value.trim(),
    address_1: elements.invAddress1.value.trim(),
    address_2: elements.invAddress2.value.trim(),
    address_3: elements.invAddress3.value.trim(),
    city: elements.invCity.value.trim(),
    country: elements.invCountry.value.trim(),
    customer_vat: elements.invCustVat.value.trim(),
    invoice_date: elements.invDate.value,
    subtotal,
    discount_percent: discountPercent,
    discount_amount: discountAmount,
    municipality_fee: municipalityFee,
    vat_total: vatTotal,
    advance_payment: advancePayment,
    grand_total: grandTotal,
    balance_due: balanceDue,
    items
  };
  
  try {
    // 1. Save to Database
    const res = await fetch(`${API_URL}/api/invoices`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save invoice record');
    
    // Update serial fields dynamically from database response
    const invoiceNum = data.invoice_number;
    
    // 2. Sync to Firebase (optional, non-blocking)
    await syncInvoiceToFirebase(payload, invoiceNum);

    // 3. Trigger Client Print Layout Filling
    triggerPrintHTML(payload, invoiceNum, lang);
    
    // Reset Form on Successful creation
    elements.invoiceForm.reset();
    elements.invDate.value = new Date().toISOString().split('T')[0];
    elements.tableRows.innerHTML = '';
    addNewRow();
    recalculateInvoice();
    loadSettings(); // Reload next serial settings
  } catch (error) {
    alert('Error generating invoice: ' + error.message);
  }
}

function triggerPrintHTML(invoice, invoiceNum, lang) {
  const printEl = document.getElementById('print-container');
  const previewFrame = document.getElementById('print-preview-frame');
  if (previewFrame) {
    previewFrame.classList.remove('hidden');
    previewFrame.style.display = 'flex';
  }
  
  // Set translation direction LTR/RTL
  if (lang === 'ar') {
    printEl.classList.add('rtl-body');
    printEl.dir = 'rtl';
    
    // Setup Translations
    document.getElementById('print-main-title').classList.add('hidden');
    document.getElementById('print-main-title-ar').classList.remove('hidden');
    
    // Text replacements
    document.getElementById('print-hotel-name').textContent = hotelSettings.hotel_name;
    document.getElementById('print-hotel-address').textContent = `${hotelSettings.address_1}, ${hotelSettings.address_2}`;
    document.getElementById('print-hotel-address-city').textContent = `${hotelSettings.city}, ${hotelSettings.country}`;
  } else {
    printEl.classList.remove('rtl-body');
    printEl.dir = 'ltr';
    document.getElementById('print-main-title').classList.remove('hidden');
    document.getElementById('print-main-title-ar').classList.add('hidden');
  }

  // Bind Hotel metadata
  document.getElementById('print-hotel-name').textContent = hotelSettings.hotel_name || 'Lotus Palace Hotel';
  document.getElementById('print-hotel-address').textContent = hotelSettings.address_1 || '';
  document.getElementById('print-hotel-address-city').textContent = `${hotelSettings.city || ''}, ${hotelSettings.country || ''}`;
  document.getElementById('print-hotel-phone').textContent = hotelSettings.phone || '';
  document.getElementById('print-hotel-email').textContent = hotelSettings.email || '';
  document.getElementById('print-hotel-website').textContent = hotelSettings.website || '';
  document.getElementById('print-hotel-vat').textContent = hotelSettings.vat_number || '';
  document.getElementById('print-bank-account-name').textContent = hotelSettings.account_name ? `Account Name: ${hotelSettings.account_name}` : '';
  document.getElementById('print-bank-account-number').textContent = hotelSettings.account_number ? `Account Number: ${hotelSettings.account_number}` : '';
  document.getElementById('print-bank-iban').textContent = hotelSettings.iban_number ? `IBAN: ${hotelSettings.iban_number}` : '';
  document.getElementById('print-bank-name').textContent = hotelSettings.bank_name ? hotelSettings.bank_name : '';
  document.getElementById('print-branch-name').textContent = hotelSettings.branch_name ? hotelSettings.branch_name : '';
  document.getElementById('print-bank-swift').textContent = hotelSettings.swift_code ? `SWIFT: ${hotelSettings.swift_code}` : '';
  document.getElementById('print-payment-terms').textContent = hotelSettings.payment_terms || '';
  
  // Logo & Stamp binding
  const logoImg = document.getElementById('print-logo-img');
  if (hotelSettings.hotel_logo) {
    logoImg.src = hotelSettings.hotel_logo;
    logoImg.classList.remove('hidden');
  } else {
    logoImg.classList.add('hidden');
  }
  
  const stampImg = document.getElementById('print-stamp-img');
  if (hotelSettings.hotel_stamp) {
    stampImg.src = hotelSettings.hotel_stamp;
    stampImg.classList.remove('hidden');
  } else {
    stampImg.classList.add('hidden');
  }
  
  // Invoice Meta
  document.getElementById('print-invoice-num').textContent = invoiceNum;
  document.getElementById('print-invoice-date').textContent = invoice.invoice_date;
  document.getElementById('print-company-name').textContent = invoice.company_name;
  
  // Bind expanded customer details on print sheet
  const contactText = lang === 'en' ? 'Contact: ' : 'جهة الاتصال: ';
  document.getElementById('print-contact-person').textContent = invoice.contact_person ? `${contactText}${invoice.contact_person}` : '';
  document.getElementById('print-address-1').textContent = invoice.address_1 || '';
  document.getElementById('print-address-2').textContent = invoice.address_2 || '';
  document.getElementById('print-address-3').textContent = invoice.address_3 || '';
  
  if (invoice.city || invoice.country) {
    document.getElementById('print-city-country').textContent = `${invoice.city || ''}, ${invoice.country || ''}`;
  } else {
    document.getElementById('print-city-country').textContent = '';
  }
  
  const vatText = lang === 'en' ? 'Customer VAT: ' : 'الرقم الضريبي للعميل: ';
  document.getElementById('print-cust-vat').textContent = invoice.customer_vat ? `${vatText}${invoice.customer_vat}` : '';
  
  document.getElementById('print-operator').textContent = currentUser.username;
  
  // Print Table headers and cells
  const printHeaders = document.getElementById('print-headers');
  const printRows = document.getElementById('print-rows');
  printHeaders.innerHTML = '';
  printRows.innerHTML = '';
  
  // Define Headers based on type
  let headers = [];
  if (invoice.invoice_type === 'room') {
    headers = [
      lang === 'en' ? 'Room Description' : ARABIC_DICT['Room Description'],
      lang === 'en' ? 'Arrival Date' : ARABIC_DICT['Arrival Date'],
      lang === 'en' ? 'Departure Date' : ARABIC_DICT['Departure Date'],
      lang === 'en' ? 'Nights' : ARABIC_DICT['Nights'],
      lang === 'en' ? 'Room Rate Net' : ARABIC_DICT['Room Rate Net'],
      lang === 'en' ? 'Total Charge' : ARABIC_DICT['Total Charge']
    ];
  } else if (invoice.invoice_type === 'event') {
    headers = [
      lang === 'en' ? 'Event Description' : ARABIC_DICT['Event Description'],
      lang === 'en' ? 'Start Date' : ARABIC_DICT['Start Date'],
      lang === 'en' ? 'End Date' : ARABIC_DICT['End Date'],
      lang === 'en' ? 'No. of Pax' : ARABIC_DICT['No. of Pax'],
      lang === 'en' ? 'Per Pax Charge' : ARABIC_DICT['Per Pax Charge'],
      lang === 'en' ? 'Rental Value' : ARABIC_DICT['Rental Value'],
      lang === 'en' ? 'Total Charge' : ARABIC_DICT['Total Charge']
    ];
  } else if (invoice.invoice_type === 'misc') {
    headers = [
      lang === 'en' ? 'Item Description' : ARABIC_DICT['Item Description'],
      lang === 'en' ? 'Quantity' : ARABIC_DICT['Quantity'],
      lang === 'en' ? 'Unit Price Net' : ARABIC_DICT['Unit Price Net'],
      lang === 'en' ? 'Total Charge' : ARABIC_DICT['Total Charge']
    ];
  }
  
  headers.forEach(h => {
    const th = document.createElement('th');
    th.textContent = h;
    printHeaders.appendChild(th);
  });
  
  // Populate Rows
  invoice.items.forEach(row => {
    const tr = document.createElement('tr');
    
    if (invoice.invoice_type === 'room') {
      tr.innerHTML = `
        <td>${row.description}</td>
        <td>${row.arrival}</td>
        <td>${row.departure}</td>
        <td>${row.nights}</td>
        <td>${row.rate.toFixed(2)} SAR</td>
        <td>${row.total.toFixed(2)} SAR</td>
      `;
    } else if (invoice.invoice_type === 'event') {
      tr.innerHTML = `
        <td>${row.description}</td>
        <td>${row.start_date}</td>
        <td>${row.end_date}</td>
        <td>${row.pax}</td>
        <td>${row.pax_charge.toFixed(2)} SAR</td>
        <td>${row.rental.toFixed(2)} SAR</td>
        <td>${row.total.toFixed(2)} SAR</td>
      `;
    } else if (invoice.invoice_type === 'misc') {
      tr.innerHTML = `
        <td>${row.description}</td>
        <td>${row.quantity}</td>
        <td>${row.unit_price.toFixed(2)} SAR</td>
        <td>${row.total.toFixed(2)} SAR</td>
      `;
    }
    printRows.appendChild(tr);
  });
  
  // Math breakdowns translations
  const labelSubtotal = lang === 'en' ? 'Subtotal' : ARABIC_DICT['Subtotal'];
  const labelDiscount = lang === 'en' ? 'Discount' : ARABIC_DICT['Discount'];
  const labelMunicipality = lang === 'en' ? 'Municipality Fee (5%)' : ARABIC_DICT['Municipality Fee (5%)'];
  const labelVat = lang === 'en' ? 'VAT (15%)' : ARABIC_DICT['VAT (15%)'];
  const labelGrand = lang === 'en' ? 'Grand Total' : ARABIC_DICT['Grand Total'];
  const labelAdvance = lang === 'en' ? 'Advance Payment' : ARABIC_DICT['Advance Payment'];
  const labelBalance = lang === 'en' ? 'Balance Due' : ARABIC_DICT['Balance Due'];
  
  const discountP = invoice.discount_percent;
  
  // Set labels and sums
  document.getElementById('print-subtotal').textContent = invoice.subtotal.toFixed(2);
  
  const discRow = document.getElementById('print-discount-row');
  if (discountP > 0) {
    discRow.classList.remove('hidden');
    document.getElementById('print-discount-pct').textContent = discountP;
    document.getElementById('print-discount').textContent = invoice.discount_amount.toFixed(2);
  } else {
    discRow.classList.add('hidden');
  }
  
  const munRow = document.getElementById('print-municipality-row');
  if (invoice.invoice_type === 'room') {
    munRow.classList.remove('hidden');
    document.getElementById('print-municipality').textContent = invoice.municipality_fee.toFixed(2);
  } else {
    munRow.classList.add('hidden');
  }
  
  document.getElementById('print-vat').textContent = invoice.vat_total.toFixed(2);
  document.getElementById('print-grand').textContent = invoice.grand_total.toFixed(2);
  
  const advRow = document.getElementById('print-advance-row');
  if (invoice.advance_payment > 0) {
    advRow.classList.remove('hidden');
    document.getElementById('print-advance').textContent = invoice.advance_payment.toFixed(2);
  } else {
    advRow.classList.add('hidden');
  }
  
  document.getElementById('print-balance').textContent = invoice.balance_due.toFixed(2);
  
  // Show print preview area and trigger the browser print dialog after a short delay
  if (printEl) {
    printEl.classList.remove('hidden');
    printEl.style.display = 'block';
    printEl.style.background = '#fff';
    printEl.style.width = '210mm';
    printEl.style.maxWidth = '210mm';
    printEl.style.minHeight = '297mm';
    printEl.style.padding = '12mm 14mm 14mm 14mm';
    printEl.style.margin = '20px auto 0';
    printEl.style.boxSizing = 'border-box';
    printEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  setTimeout(() => {
    window.print();
  }, 150);
}

elements.printEnBtn.addEventListener('click', () => saveAndPrintInvoice('en'));
elements.printArBtn.addEventListener('click', () => saveAndPrintInvoice('ar'));

document.getElementById('close-preview-btn')?.addEventListener('click', () => {
  document.getElementById('print-preview-frame')?.classList.add('hidden');
});

window.addEventListener('afterprint', () => {
  document.getElementById('print-preview-frame')?.classList.add('hidden');
});


// ================= CUSTOMER DATABASE MANAGEMENT =================

async function loadCustomers() {
  const query = elements.custListSearch.value.trim();
  let url = `${API_URL}/api/customers`;
  if (query) url += `?search=${encodeURIComponent(query)}`;
  
  try {
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to load customer list');
    const customers = await res.json();
    
    elements.customersListRows.innerHTML = '';
    if (customers.length === 0) {
      elements.customersListRows.innerHTML = `<tr><td colspan="6" class="text-center">No customer profiles found.</td></tr>`;
      return;
    }
    
    customers.forEach(cust => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${cust.customer_number}</strong></td>
        <td><strong>${cust.company_name}</strong></td>
        <td>${cust.contact_person || '<span class="text-muted">N/A</span>'}</td>
        <td>${cust.city || ''}, ${cust.country || ''}</td>
        <td>${cust.vat_number || '<span class="text-muted">N/A</span>'}</td>
        <td class="cell-actions">
          <button class="btn btn-secondary btn-sm edit-cust-btn" data-id="${cust.id}">
            <i class="fa-solid fa-edit"></i> Edit
          </button>
          <button class="btn btn-outline-danger btn-sm delete-cust-btn" data-id="${cust.id}">
            <i class="fa-solid fa-trash"></i> Delete
          </button>
        </td>
      `;
      
      // Bind CRUD events
      tr.querySelector('.edit-cust-btn').addEventListener('click', () => {
        editingCustomerId = cust.id;
        elements.custFormTitle.textContent = 'Edit Customer Profile';
        elements.custId.value = cust.id;
        elements.custCompanyName.value = cust.company_name;
        elements.custContactPerson.value = cust.contact_person || '';
        elements.custVatNumber.value = cust.vat_number || '';
        elements.custAddress1.value = cust.address_1 || '';
        elements.custAddress2.value = cust.address_2 || '';
        elements.custAddress3.value = cust.address_3 || '';
        elements.custCity.value = cust.city || '';
        elements.custCountry.value = cust.country || '';
        
        elements.saveCustBtn.textContent = 'Update Profile';
        elements.cancelCustEditBtn.classList.remove('hidden');
      });
      
      tr.querySelector('.delete-cust-btn').addEventListener('click', async () => {
        if (!confirm(`Are you sure you want to delete profile for "${cust.company_name}"?`)) return;
        try {
          const res = await fetch(`${API_URL}/api/customers/${cust.id}`, {
            method: 'DELETE',
            headers: getHeaders()
          });
          if (!res.ok) throw new Error('Failed to delete customer');
          loadCustomers();
        } catch (e) {
          alert(e.message);
        }
      });
      
      elements.customersListRows.appendChild(tr);
    });
  } catch (error) {
    elements.customersListRows.innerHTML = `<tr><td colspan="6" class="text-danger text-center">Error: ${error.message}</td></tr>`;
  }
}

function resetCustomerForm() {
  editingCustomerId = null;
  elements.custFormTitle.textContent = 'Add New Customer';
  elements.customerForm.reset();
  elements.custId.value = '';
  elements.saveCustBtn.textContent = 'Save Profile';
  elements.cancelCustEditBtn.classList.add('hidden');
  elements.custFormError.textContent = '';
}

elements.customerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const payload = {
    id: editingCustomerId,
    company_name: elements.custCompanyName.value.trim(),
    contact_person: elements.custContactPerson.value.trim(),
    vat_number: elements.custVatNumber.value.trim(),
    address_1: elements.custAddress1.value.trim(),
    address_2: elements.custAddress2.value.trim(),
    address_3: elements.custAddress3.value.trim(),
    city: elements.custCity.value.trim(),
    country: elements.custCountry.value.trim()
  };
  
  try {
    const res = await fetch(`${API_URL}/api/customers`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save customer');
    
    resetCustomerForm();
    loadCustomers();
  } catch (error) {
    elements.custFormError.textContent = error.message;
  }
});

elements.cancelCustEditBtn.addEventListener('click', resetCustomerForm);
elements.custListSearch.addEventListener('input', loadCustomers);

// Creator Autocomplete Search logic
let autocompleteTimeout = null;
elements.invCustSearch.addEventListener('input', () => {
  clearTimeout(autocompleteTimeout);
  const val = elements.invCustSearch.value.trim();
  if (val.length < 1) {
    elements.custSearchSuggestions.classList.add('hidden');
    elements.custSearchSuggestions.innerHTML = '';
    return;
  }
  
  autocompleteTimeout = setTimeout(async () => {
    try {
      const res = await fetch(`${API_URL}/api/customers?search=${encodeURIComponent(val)}`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Search failed');
      const customers = await res.json();
      
      elements.custSearchSuggestions.innerHTML = '';
      if (customers.length === 0) {
        elements.custSearchSuggestions.classList.add('hidden');
        return;
      }
      
      customers.forEach(cust => {
        const item = document.createElement('div');
        item.className = 'autocomplete-suggestion-item';
        item.innerHTML = `
          <strong>${cust.company_name}</strong>
          <span>Contact: ${cust.contact_person || 'N/A'} | VAT: ${cust.vat_number || 'N/A'} | City: ${cust.city || ''}</span>
        `;
        item.addEventListener('click', () => {
          // Fill Invoice Client Form
          elements.invCompanyName.value = cust.company_name;
          elements.invContactPerson.value = cust.contact_person || '';
          elements.invAddress1.value = cust.address_1 || '';
          elements.invAddress2.value = cust.address_2 || '';
          elements.invAddress3.value = cust.address_3 || '';
          elements.invCity.value = cust.city || '';
          elements.invCountry.value = cust.country || '';
          elements.invCustVat.value = cust.vat_number || '';
          
          elements.invCustSearch.value = cust.company_name; // Set query as company name
          elements.custSearchSuggestions.classList.add('hidden');
          elements.custSearchSuggestions.innerHTML = '';
        });
        elements.custSearchSuggestions.appendChild(item);
      });
      elements.custSearchSuggestions.classList.remove('hidden');
    } catch (e) {
      console.error(e);
    }
  }, 200);
});

// Close suggestions on outside click
document.addEventListener('click', (e) => {
  if (e.target !== elements.invCustSearch && e.target !== elements.custSearchSuggestions) {
    elements.custSearchSuggestions.classList.add('hidden');
  }
});

// Creator Save Profile shortcut button
elements.saveAsNewCustBtn.addEventListener('click', async () => {
  const company_name = elements.invCompanyName.value.trim();
  if (!company_name) {
    alert('Please enter a Company Name / Guest Name first.');
    return;
  }
  
  const payload = {
    company_name,
    contact_person: elements.invContactPerson.value.trim(),
    address_1: elements.invAddress1.value.trim(),
    address_2: elements.invAddress2.value.trim(),
    address_3: elements.invAddress3.value.trim(),
    city: elements.invCity.value.trim(),
    country: elements.invCountry.value.trim(),
    vat_number: elements.invCustVat.value.trim()
  };
  
  try {
    const res = await fetch(`${API_URL}/api/customers`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save customer profile');
    
    alert(`Customer profile saved successfully as ${data.customer_number}!`);
    loadCustomers(); // Reload list
  } catch (error) {
    alert(error.message);
  }
});

// ================= HISTORY SEARCH TAB =================

async function loadInvoicesFromFirebase() {
  if (!firebaseReady || !firebaseDb) {
    return [];
  }

  try {
    const snapshot = await firebaseDb.collection('invoices').get();
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        invoice_number: data.invoice_number || doc.id,
        invoice_type: data.invoice_type || 'misc',
        company_name: data.company_name || '',
        invoice_date: data.invoice_date || '',
        grand_total: Number(data.grand_total || 0),
        balance_due: Number(data.balance_due || 0),
        created_by: data.created_by || 'Firebase',
        items: data.items || [],
        _source: 'firebase'
      };
    });
  } catch (error) {
    console.error('Failed to load invoices from Firebase:', error);
    return [];
  }
}

async function loadInvoices() {
  const query = elements.searchQuery.value;
  const type = elements.searchType.value;
  const date = elements.searchDate.value;
  const amount = elements.searchAmount.value;
  
  let url = `${API_URL}/api/invoices?`;
  if (query) url += `search=${encodeURIComponent(query)}&`;
  if (type) url += `type=${type}&`;
  if (date) url += `date=${date}&`;
  if (amount) url += `amount=${amount}&`;
  
  try {
    const [serverRes, firebaseInvoices] = await Promise.all([
      fetch(url, { headers: getHeaders() }),
      loadInvoicesFromFirebase()
    ]);

    if (!serverRes.ok) throw new Error('Failed to retrieve history');
    const serverInvoices = await serverRes.json();

    const mergedInvoices = [...serverInvoices];
    const seen = new Set(serverInvoices.map(inv => inv.invoice_number || inv.id));

    firebaseInvoices.forEach(inv => {
      const key = inv.invoice_number || inv.id;
      if (!seen.has(key)) {
        mergedInvoices.push(inv);
        seen.add(key);
      }
    });

    elements.historyRows.innerHTML = '';
    if (mergedInvoices.length === 0) {
      elements.historyRows.innerHTML = `<tr><td colspan="8" class="text-center">No invoices found.</td></tr>`;
      return;
    }
    
    mergedInvoices.forEach(inv => {
      const tr = document.createElement('tr');
      
      let typeBadge = '';
      if (inv.invoice_type === 'room') typeBadge = `<span class="badge btn-success" style="font-size:0.75rem; padding:2px 6px;">Room</span>`;
      else if (inv.invoice_type === 'event') typeBadge = `<span class="badge btn-primary" style="font-size:0.75rem; padding:2px 6px;">Event</span>`;
      else typeBadge = `<span class="badge btn-secondary" style="font-size:0.75rem; padding:2px 6px;">Misc</span>`;

      const grandTotal = Number(inv.grand_total || 0).toFixed(2);
      const balanceDue = Number(inv.balance_due || 0).toFixed(2);
      const originLabel = inv._source === 'firebase' ? '<span class="badge btn-outline-success" style="font-size:0.7rem; padding:1px 5px; margin-left:6px;">Cloud</span>' : '';
      
      tr.innerHTML = `
        <td><strong>${inv.invoice_number}</strong>${originLabel}</td>
        <td>${typeBadge}</td>
        <td>${inv.company_name}</td>
        <td>${inv.invoice_date}</td>
        <td><strong>${grandTotal}</strong></td>
        <td class="${Number(inv.balance_due || 0) > 0 ? 'text-danger' : 'text-success'}"><strong>${balanceDue}</strong></td>
        <td>${inv.created_by || (inv._source === 'firebase' ? 'Firebase' : '')}</td>
        <td class="cell-actions" style="width: auto;">
          <button class="btn btn-secondary btn-sm print-history-en" data-id="${inv.id}"><i class="fa-solid fa-print"></i> EN</button>
          <button class="btn btn-success btn-sm print-history-ar" data-id="${inv.id}"><i class="fa-solid fa-print"></i> AR</button>
        </td>
      `;
      
      // Bind inline prints
      tr.querySelector('.print-history-en').addEventListener('click', () => triggerPrintHTML(inv, inv.invoice_number, 'en'));
      tr.querySelector('.print-history-ar').addEventListener('click', () => triggerPrintHTML(inv, inv.invoice_number, 'ar'));
      
      elements.historyRows.appendChild(tr);
    });
  } catch (error) {
    elements.historyRows.innerHTML = `<tr><td colspan="8" class="text-danger text-center">Error: ${error.message}</td></tr>`;
  }
}

elements.searchBtn.addEventListener('click', loadInvoices);
elements.searchResetBtn.addEventListener('click', () => {
  elements.searchQuery.value = '';
  elements.searchType.value = '';
  elements.searchDate.value = '';
  elements.searchAmount.value = '';
  loadInvoices();
});


function applyTheme(theme) {
  const root = document.documentElement;
  const isLight = theme === 'light';
  root.setAttribute('data-theme', isLight ? 'light' : 'dark');
  if (elements.themeToggleIcon) {
    elements.themeToggleIcon.className = isLight ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  }
  localStorage.setItem('app-theme', theme);
}

function initTheme() {
  const savedTheme = localStorage.getItem('app-theme');
  const preferredTheme = savedTheme || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  applyTheme(preferredTheme);
}

// ================= SERVICE WORKER REGISTRATION =================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('Service Worker registered successfully.', reg.scope))
      .catch(err => console.error('Service Worker registration failed:', err));
  });
}

// ================= APP INITIALIZATION =================
elements.loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  performLogin(elements.loginUsername.value.trim(), elements.loginPassword.value);
});

elements.logoutBtn.addEventListener('click', performLogout);
elements.themeToggleBtn?.addEventListener('click', () => {
  const currentTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  applyTheme(currentTheme === 'light' ? 'dark' : 'light');
});

// Start
initTheme();
renderTableHeaders();
addNewRow();
checkLoginState();
recalculateInvoice();
