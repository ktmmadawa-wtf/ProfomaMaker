import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';

const EMPTY = { id: null, company_name: '', contact_person: '', vat_number: '', address_1: '', address_2: '', address_3: '', city: '', country: '' };

export default function CustomerManager() {
  const { api, user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [form,      setForm]      = useState(EMPTY);
  const [search,    setSearch]    = useState('');
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [importing, setImporting] = useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');

  const fileInputRef = useRef(null);
  const isAdmin = user?.role === 'admin';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`);
      setCustomers(data);
    } catch { /* handled by interceptor */ }
    finally { setLoading(false); }
  }, [api, search]);

  useEffect(() => { load(); }, [load]);

  const set = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setSaving(true);
    try {
      await api.post('/customers', form);
      setSuccess(form.id ? 'Customer updated.' : 'Customer saved.');
      setForm(EMPTY);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save customer.');
    } finally {
      setSaving(false);
    }
  };

  const edit = (c) => setForm({
    id: c.id, company_name: c.company_name, contact_person: c.contact_person || '',
    vat_number: c.vat_number || '', address_1: c.address_1 || '', address_2: c.address_2 || '',
    address_3: c.address_3 || '', city: c.city || '', country: c.country || ''
  });

  const del = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try { await api.delete(`/customers/${id}`); load(); }
    catch (err) { alert(err.response?.data?.error || 'Delete failed.'); }
  };

  // ── CSV Export ──
  const handleExportCSV = () => {
    if (!customers || customers.length === 0) {
      alert('No customers available to export.');
      return;
    }
    const headers = ['Customer #', 'Company Name', 'Contact Person', 'Address 1', 'Address 2', 'Address 3', 'City', 'Country', 'VAT Number'];
    const escapeCSV = (val) => `"${String(val || '').replace(/"/g, '""')}"`;
    const escapeVatCSV = (val) => val ? `="""${String(val).replace(/"/g, '')}"""` : '""';

    const rows = customers.map(c => [
      escapeCSV(c.customer_number),
      escapeCSV(c.company_name),
      escapeCSV(c.contact_person),
      escapeCSV(c.address_1),
      escapeCSV(c.address_2),
      escapeCSV(c.address_3),
      escapeCSV(c.city),
      escapeCSV(c.country),
      escapeVatCSV(c.vat_number)
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `Customer_Database_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Pre-defined CSV Template Download ──
  const handleDownloadTemplate = () => {
    const headers = ['company_name', 'contact_person', 'address_1', 'address_2', 'address_3', 'city', 'country', 'vat_number'];
    const sampleRows = [
      ['"KTM Software Development Co Ltd."', '"John Doe"', '"King Fahd Road"', '"Olaya District"', '"Suite 401"', '"Riyadh"', '"Saudi Arabia"', '="""310998877600003"""'],
      ['"Al Faisaliah Hospitality"', '"Sara Ahmed"', '"King Abdullah Road"', '""', '""', '"Jeddah"', '"Saudi Arabia"', '="""310112233400003"""']
    ];
    const csvContent = '\uFEFF' + [headers.join(','), ...sampleRows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'customer_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── CSV Parsing & Bulk Import ──
  const handleFileImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError(''); setSuccess(''); setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const parsedRows = parseCSV(text);
        if (parsedRows.length === 0) {
          setError('No valid customer records found in the CSV file.');
          setImporting(false);
          return;
        }

        const { data } = await api.post('/customers/bulk-import', { customers: parsedRows });
        setSuccess(data.message || `Successfully imported ${data.count} customer(s).`);
        load();
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to import CSV file.');
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const inputCls = 'input text-sm';

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      
      {/* Top Header & Admin Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Customer Database</h1>
          <p className="text-slate-400 text-sm mt-0.5">Manage company profiles for fast invoice filling.</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Export CSV available for ALL users */}
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={loading || customers.length === 0}
            className="btn-secondary px-3 py-2 text-xs border-slate-700 hover:bg-slate-700 text-slate-200 disabled:opacity-40"
          >
            📥 Export CSV ({customers.length})
          </button>

          {/* Template Download & Bulk Import available for ADMIN ONLY */}
          {isAdmin && (
            <>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="btn-secondary px-3 py-2 text-xs border-slate-700 hover:bg-slate-700 text-slate-300"
              >
                📑 Download Template
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileImport}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="btn-primary px-3 py-2 text-xs flex items-center gap-1.5 shadow-lg shadow-blue-500/20"
              >
                📤 {importing ? 'Importing…' : 'Import CSV'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-5 gap-6">
        {/* Form */}
        <div className="md:col-span-2">
          <div className="card">
            <h2 className="text-sm font-semibold text-white mb-4">{form.id ? 'Edit Customer' : 'Add Customer'}</h2>
            {error   && <div className="alert-error mb-3 text-xs">{error}</div>}
            {success && <div className="alert-success mb-3 text-xs">{success}</div>}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div><label className="label text-xs">Company Name *</label><input required className={inputCls} value={form.company_name} onChange={set('company_name')} /></div>
              <div><label className="label text-xs">Contact Person</label><input className={inputCls} value={form.contact_person} onChange={set('contact_person')} /></div>
              <div><label className="label text-xs">VAT Number</label><input className={inputCls} value={form.vat_number} onChange={set('vat_number')} /></div>
              <div><label className="label text-xs">Address 1</label><input className={inputCls} value={form.address_1} onChange={set('address_1')} /></div>
              <div><label className="label text-xs">Address 2</label><input className={inputCls} value={form.address_2} onChange={set('address_2')} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="label text-xs">City</label><input className={inputCls} value={form.city} onChange={set('city')} /></div>
                <div><label className="label text-xs">Country</label><input className={inputCls} value={form.country} onChange={set('country')} /></div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={saving} className="btn-primary flex-1 text-sm">
                  {saving ? 'Saving…' : form.id ? 'Update' : 'Save'}
                </button>
                {form.id && (
                  <button type="button" onClick={() => { setForm(EMPTY); setError(''); setSuccess(''); }} className="btn-secondary text-sm">
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* List */}
        <div className="md:col-span-3 space-y-3">
          <input className="input text-sm" placeholder="Search customers…" value={search} onChange={e => setSearch(e.target.value)} />
          <div className="card p-0 overflow-hidden">
            {loading ? (
              <div className="p-6 text-center text-slate-400 text-sm">Loading…</div>
            ) : customers.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">No customers found.</div>
            ) : (
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/60 text-slate-300 font-semibold uppercase tracking-wider">
                    <th className="p-3">Customer #</th>
                    <th className="p-3">Company Name</th>
                    <th className="p-3">Contact</th>
                    <th className="p-3">VAT #</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {customers.map(c => (
                    <tr key={c.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="p-3 font-mono font-bold text-blue-400">{c.customer_number}</td>
                      <td className="p-3 font-medium text-white">{c.company_name}</td>
                      <td className="p-3 text-slate-300">{c.contact_person || '—'}</td>
                      <td className="p-3 font-mono text-slate-400">{c.vat_number || '—'}</td>
                      <td className="p-3 text-right space-x-2">
                        <button onClick={() => edit(c)} className="btn-secondary py-1 px-2.5 text-xs text-blue-400 border-blue-500/30 hover:bg-blue-600 hover:text-white">Edit</button>
                        <button onClick={() => del(c.id, c.company_name)} className="btn-danger py-1 px-2 text-xs">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Smart CSV Parser Helper ──
function parseCSV(text) {
  const lines = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === '\n' && !inQuotes) {
      lines.push(cur);
      cur = '';
    } else if (c === '\r' && !inQuotes) {
      // ignore
    } else {
      cur += c;
    }
  }
  if (cur) lines.push(cur);

  if (lines.length === 0) return [];

  const parseLine = (line) => {
    const fields = [];
    let field = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQ = !inQ;
        }
      } else if (ch === ',' && !inQ) {
        fields.push(field.trim());
        field = '';
      } else {
        field += ch;
      }
    }
    fields.push(field.trim());
    return fields;
  };

  const rawHeaders = parseLine(lines[0]);
  const headers = rawHeaders.map(h => h.toLowerCase().replace(/[^a-z0-9_]/g, ''));
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const row = parseLine(lines[i]);
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = row[idx] || '';
    });

    const company = obj.company_name || obj.companyname || obj.company || obj.company_name_ || '';
    const rawVat  = obj.vat_number || obj.vatnumber || obj.vat || '';

    if (company) {
      records.push({
        company_name: company,
        contact_person: obj.contact_person || obj.contactperson || obj.contact || '',
        address_1: obj.address_1 || obj.address1 || obj.address || '',
        address_2: obj.address_2 || obj.address2 || '',
        address_3: obj.address_3 || obj.address3 || '',
        city: obj.city || '',
        country: obj.country || '',
        vat_number: cleanVatNumber(rawVat)
      });
    }
  }

  return records;
}

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
