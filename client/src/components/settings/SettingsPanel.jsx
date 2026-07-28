import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import ThemeSelector from '../ui/ThemeSelector';
import FontSelector from '../ui/FontSelector';

const inputCls = 'input text-sm';

// Move helper components to top-level module scope to prevent React unmounting on keystrokes
function Section({ title, children }) {
  return (
    <div className="card space-y-4">
      <h2 className="text-sm font-semibold border-b pb-3" style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div>
      <label className="label text-xs">{label}</label>
      <input
        type={type}
        className={inputCls}
        placeholder={placeholder}
        value={value || ''}
        onChange={onChange}
      />
    </div>
  );
}

function Grid({ cols = 2, children }) {
  const colClasses = {
    1: 'sm:grid-cols-1',
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-3',
    4: 'sm:grid-cols-4'
  };
  return (
    <div className={`grid grid-cols-1 ${colClasses[cols] || 'sm:grid-cols-2'} gap-4`}>
      {children}
    </div>
  );
}

function ImageUpload({ label, preview, onFileChange, onClear, inputRef, hint }) {
  return (
    <div>
      <label className="label text-xs">{label}</label>
      <div className="flex items-start gap-4">
        {/* Preview box */}
        <div
          className="w-28 h-20 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
          style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}
        >
          {preview ? (
            <img src={preview} alt={label} className="max-w-full max-h-full object-contain p-1" />
          ) : (
            <svg className="w-8 h-8 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-2 flex-1">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFileChange}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="btn-secondary text-xs px-3 py-1.5 w-fit"
          >
            {preview ? 'Change Image' : 'Browse…'}
          </button>
          {preview && (
            <button
              type="button"
              onClick={onClear}
              className="btn-danger text-xs px-3 py-1.5 w-fit"
            >
              Remove
            </button>
          )}
          {hint && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
        </div>
      </div>
    </div>
  );
}

export default function SettingsPanel() {
  const { api, isAdmin } = useAuth();
  const [settings,  setSettings]  = useState({});
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [status,    setStatus]    = useState('');

  // Logo / stamp state
  const [logoPreview,  setLogoPreview]  = useState('');
  const [stampPreview, setStampPreview] = useState('');
  const logoRef  = useRef();
  const stampRef = useRef();

  useEffect(() => {
    api.get('/settings').then(({ data }) => {
      setSettings(data || {});
      if (data?.hotel_logo)  setLogoPreview(data.hotel_logo);
      if (data?.hotel_stamp) setStampPreview(data.hotel_stamp);
    }).catch(console.error).finally(() => setLoading(false));
  }, [api]);

  const setField = (k) => (e) => setSettings(s => ({ ...s, [k]: e.target.value }));

  // Convert file to base64 and store in settings
  const handleImageFile = (file, settingKey, setPreview) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const b64 = e.target.result;
      setPreview(b64);
      setSettings(s => ({ ...s, [settingKey]: b64 }));
    };
    reader.readAsDataURL(file);
  };

  const clearImage = (settingKey, setPreview, inputRef) => {
    setPreview('');
    setSettings(s => ({ ...s, [settingKey]: '' }));
    if (inputRef.current) inputRef.current.value = '';
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true); setStatus('');
    try {
      await api.post('/settings', settings);
      setStatus('success');
      setTimeout(() => setStatus(''), 3000);
    } catch {
      setStatus('error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>Loading settings…</div>
  );

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Settings</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {isAdmin
            ? 'Configure hotel details, appearance, line item presets, and invoice branding.'
            : 'Customize application theme and typography font preferences.'}
        </p>
      </div>

      {status === 'success' && <div className="alert-success">Settings saved successfully.</div>}
      {status === 'error'   && <div className="alert-error">Failed to save settings.</div>}

      <form onSubmit={save} className="space-y-6">

        {/* ── Appearance — Theme (Available to all users) ── */}
        <Section title="Appearance — Theme">
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            Choose a colour theme for the application. Your preference is saved locally.
          </p>
          <ThemeSelector />
        </Section>

        {/* ── Appearance — Typography & Font (Available to all users) ── */}
        <Section title="Appearance — Typography & Font">
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            Choose a font family for the application interface.
          </p>
          <FontSelector />
        </Section>

        {/* Admin-only sections */}
        {isAdmin && (
          <>
            {/* ── Branding / Images ── */}
            <Section title="Invoice Branding">
              <Grid cols={2}>
                <ImageUpload
                  label="Company Logo"
                  preview={logoPreview}
                  onFileChange={e => handleImageFile(e.target.files[0], 'hotel_logo', setLogoPreview)}
                  onClear={() => clearImage('hotel_logo', setLogoPreview, logoRef)}
                  inputRef={logoRef}
                  hint="Appears at the top of every printed invoice. PNG or SVG recommended."
                />
                <ImageUpload
                  label="Company Stamp / Seal"
                  preview={stampPreview}
                  onFileChange={e => handleImageFile(e.target.files[0], 'hotel_stamp', setStampPreview)}
                  onClear={() => clearImage('hotel_stamp', setStampPreview, stampRef)}
                  inputRef={stampRef}
                  hint="Appears at the bottom of every printed invoice. Use a transparent PNG."
                />
              </Grid>
            </Section>

            {/* ── Hotel Info ── */}
            <Section title="Hotel Information">
              <Grid>
                <Field label="Hotel Name"  value={settings.hotel_name} onChange={setField('hotel_name')} />
                <Field label="VAT Number"  value={settings.vat_number} onChange={setField('vat_number')} />
                <Field label="Address 1"   value={settings.address_1}  onChange={setField('address_1')} />
                <Field label="Address 2"   value={settings.address_2}  onChange={setField('address_2')} />
                <Field label="Address 3"   value={settings.address_3}  onChange={setField('address_3')} />
                <Field label="City"        value={settings.city}       onChange={setField('city')} />
                <Field label="Country"     value={settings.country}    onChange={setField('country')} />
                <Field label="Phone"       value={settings.phone}      onChange={setField('phone')} />
                <Field label="Email"       type="email" value={settings.email} onChange={setField('email')} />
                <Field label="Website"     value={settings.website}    onChange={setField('website')} />
              </Grid>
            </Section>

            {/* ── Bank Details ── */}
            <Section title="Bank Details">
              <Grid>
                <Field label="Account Name"   value={settings.account_name}   onChange={setField('account_name')} />
                <Field label="Account Number" value={settings.account_number} onChange={setField('account_number')} />
                <Field label="IBAN"           value={settings.iban_number}    onChange={setField('iban_number')} />
                <Field label="Bank Name"      value={settings.bank_name}      onChange={setField('bank_name')} />
                <Field label="Branch"         value={settings.branch_name}    onChange={setField('branch_name')} />
                <Field label="SWIFT Code"     value={settings.swift_code}     onChange={setField('swift_code')} />
              </Grid>
              <div>
                <label className="label text-xs">Payment Terms</label>
                <textarea rows={2} className={`${inputCls} resize-none`}
                  value={settings.payment_terms || ''} onChange={setField('payment_terms')} />
              </div>
            </Section>

            {/* ── Invoice Numbering ── */}
            <Section title="Invoice Numbering">
              <Grid>
                <Field label="Serial Prefix"   value={settings.serial_prefix}        onChange={setField('serial_prefix')}        placeholder="PI-" />
                <Field label="Next Invoice #"  value={settings.next_serial}          onChange={setField('next_serial')}          placeholder="1001" />
                <Field label="Next Customer #" value={settings.next_customer_serial} onChange={setField('next_customer_serial')} placeholder="1001" />
              </Grid>
            </Section>

            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
          </>
        )}
      </form>

      {/* ── Line Item Presets Section (Admin only) ── */}
      {isAdmin && <PresetManagerSection api={api} />}
    </div>
  );
}

function PresetManagerSection({ api }) {
  const [category, setCategory] = useState('room');
  const [presets,  setPresets]  = useState([]);
  const [desc,     setDesc]     = useState('');
  const [price,    setPrice]    = useState('');
  const [loading,  setLoading]  = useState(true);
  const [adding,   setAdding]   = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/presets')
      .then(({ data }) => setPresets(data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!desc.trim()) return;
    setAdding(true);
    try {
      const { data } = await api.post('/presets', { category, description: desc.trim(), default_price: price });
      setDesc(''); setPrice('');
      setPresets(prev => [...prev, data]);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add preset.');
    } finally { setAdding(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this preset?')) return;
    try {
      await api.delete(`/presets/${id}`);
      setPresets(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Delete failed.');
    }
  };

  const filtered = presets.filter(p => p.category === category);

  return (
    <Section title="Line Item Description & Price Presets">
      <p className="text-xs text-slate-400">
        Pre-define common room rates, event services, or miscellaneous items so users can select them from a dropdown when creating proforma invoices.
      </p>

      {/* Category Tabs */}
      <div className="flex gap-2">
        {[
          ['room',  '🛏️ Room Stay'],
          ['event', '🎪 Event / Banquet'],
          ['misc',  '📦 Miscellaneous']
        ].map(([cat, label]) => (
          <button
            type="button"
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              category === cat ? 'bg-blue-600 text-white shadow' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Add New Preset Form */}
      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3 pt-1">
        <input
          type="text"
          required
          className="input text-sm flex-1"
          placeholder={`Add ${category} description (e.g. Executive Suite)`}
          value={desc}
          onChange={e => setDesc(e.target.value)}
        />
        <input
          type="number"
          min="0"
          step="0.01"
          className="input text-sm w-full sm:w-36"
          placeholder="Default Rate (SAR)"
          value={price}
          onChange={e => setPrice(e.target.value)}
        />
        <button type="submit" disabled={adding} className="btn-primary text-xs whitespace-nowrap px-4 py-2">
          {adding ? 'Adding…' : '+ Add Preset'}
        </button>
      </form>

      {/* Preset List */}
      <div className="border border-slate-700/60 rounded-xl overflow-hidden divide-y divide-slate-700/50 bg-slate-800/40">
        {loading ? (
          <div className="p-4 text-center text-xs text-slate-400">Loading presets…</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-400">No presets saved for this category yet.</div>
        ) : (
          filtered.map(p => (
            <div key={p.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-700/30 transition-colors">
              <div className="min-w-0 flex items-center gap-3">
                <span className="text-sm font-medium text-white">{p.description}</span>
                {parseFloat(p.default_price) > 0 && (
                  <span className="badge badge-green font-mono text-xs">
                    {parseFloat(p.default_price).toFixed(2)} SAR
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleDelete(p.id)}
                className="btn-danger py-1 px-2 text-xs opacity-70 hover:opacity-100"
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </Section>
  );
}
