// Simple Native IndexedDB Wrapper for Customer Offline Caching
const DB_NAME = 'ProfomaMakerDB';
const DB_VERSION = 1;
const STORE_CUSTOMERS = 'customers';

let dbPromise = null;

export function initDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      console.warn('IndexedDB is not supported in this environment.');
      return resolve(null);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_CUSTOMERS)) {
        const store = db.createObjectStore(STORE_CUSTOMERS, { keyPath: 'id' });
        store.createIndex('company_name', 'company_name', { unique: false });
        store.createIndex('contact_person', 'contact_person', { unique: false });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => {
      console.error('IndexedDB open error:', event.target.error);
      resolve(null); // Fallback gracefully if IDB fails
    };
  });

  return dbPromise;
}

export async function saveCustomersToIDB(customers) {
  try {
    const db = await initDB();
    if (!db) return;

    const tx = db.transaction(STORE_CUSTOMERS, 'readwrite');
    const store = tx.objectStore(STORE_CUSTOMERS);
    
    // Clear old data and put new list
    store.clear();
    customers.forEach(cust => {
      if (cust && cust.id) store.put(cust);
    });

    return new Promise((resolve) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    console.error('Failed to save customers to IndexedDB:', err);
    return false;
  }
}

export async function getCustomersFromIDB() {
  try {
    const db = await initDB();
    if (!db) return [];

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_CUSTOMERS, 'readonly');
      const store = tx.objectStore(STORE_CUSTOMERS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  } catch (err) {
    console.error('Failed to get customers from IndexedDB:', err);
    return [];
  }
}
