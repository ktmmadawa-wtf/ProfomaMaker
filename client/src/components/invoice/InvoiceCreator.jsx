import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';

const EMPTY_ROOM_ROW  = () => ({ desc: '', arrival: '', departure: '', nights: '', rate: '',  total: 0 });
const EMPTY_EVENT_ROW = () => ({ desc: '', start: '',   end: '',       pax: '',   paxCharge: '', rental: '', total: 0 });
const EMPTY_MISC_ROW  = () => ({ desc: '', qty: '',     unitPrice: '', total: 0 });

function calcRow(type, row) {
  if (type === 'room')  return (parseFloat(row.nights) || 0) * (parseFloat(row.rate) || 0);
  if (type === 'event') return (parseFloat(row.pax) || 0) * (parseFloat(row.paxCharge) || 0) + (parseFloat(row.rental) || 0);
  if (type === 'misc')  return (parseFloat(row.qty) || 0) * (parseFloat(row.unitPrice) || 0);
  return 0;
}

export default function InvoiceCreator() {
  const { api } = useAuth();
  const [type,      setType]      = useState('room');
  const [rows,      setRows]      = useState([EMPTY_ROOM_ROW()]);
  const [meta,      setMeta]      = useState({
    company: '',
    contact_person: '',
    address_1: '',
    address_2: '',
    address_3: '',
    city: '',
    country: '',
    customer_vat: '',
    date: new Date().toISOString().split('T')[0],
    discount: '',
    advance: ''
  });
  const [status,    setStatus]    = useState('');  // '' | 'saving' | 'success' | 'error'
  const [message,   setMessage]   = useState('');
  const [customers, setCustomers] = useState([]);
  const [presets,   setPresets]   = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/customers').then(({ data }) => setCustomers(data)).catch(() => {}),
      api.get('/presets').then(({ data }) => setPresets(data)).catch(() => {})
    ]);
  }, [api]);

  // Compute active presets memoized
  const activePresets = useMemo(() => {
    return presets.filter(p => p.category === type);
  }, [presets, type]);

  // Synchronously compute totals on every render (no useEffect state lag)
  const subtotal       = rows.reduce((s, r) => s + calcRow(type, r), 0);
  const discountPct    = parseFloat(meta.discount) || 0;
  const discountAmt    = subtotal * discountPct / 100;
  const net            = subtotal - discountAmt;
  const municipality   = type === 'room' ? net * 0.05 : 0;
  const vat            = (net + municipality) * 0.15;
  const grand          = net + municipality + vat;
  const advance        = parseFloat(meta.advance) || 0;
  const balance        = grand - advance;
  const totals         = { subtotal, discount: discountAmt, municipality, vat, grand, balance };

  const switchType = (t) => {
    setType(t);
    setRows([t === 'room' ? EMPTY_ROOM_ROW() : t === 'event' ? EMPTY_EVENT_ROW() : EMPTY_MISC_ROW()]);
  };

  const updateRow = (idx, field, value) => {
    setRows(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      // Auto-calc nights for room type
      if (field === 'arrival' || field === 'departure') {
        const a = field === 'arrival'    ? value : next[idx].arrival;
        const d = field === 'departure'  ? value : next[idx].departure;
        if (a && d) {
          const diff = Math.ceil((new Date(d) - new Date(a)) / 86400000);
          if (diff > 0) next[idx].nights = String(diff);
        }
      }
      return next;
    });
  };

  const applyPresetToRow = (idx, presetId) => {
    const preset = activePresets.find(p => p.id === parseInt(presetId));
    if (!preset) return;

    setRows(prev => {
      const next = [...prev];
      const pPrice = parseFloat(preset.default_price) || 0;
      next[idx] = {
        ...next[idx],
        desc: preset.description
      };

      if (pPrice > 0) {
        if (type === 'room') {
          next[idx].rate = String(pPrice);
        } else if (type === 'event') {
          if (preset.description.toLowerCase().includes('rental') || preset.description.toLowerCase().includes('hall') || preset.description.toLowerCase().includes('stage')) {
            next[idx].rental = String(pPrice);
          } else {
            next[idx].paxCharge = String(pPrice);
          }
        } else if (type === 'misc') {
          next[idx].unitPrice = String(pPrice);
          if (!next[idx].qty || next[idx].qty === '0') next[idx].qty = '1';
        }
      }
      return next;
    });
  };

  const addRow = () => setRows(r => [...r, type === 'room' ? EMPTY_ROOM_ROW() : type === 'event' ? EMPTY_EVENT_ROW() : EMPTY_MISC_ROW()]);
  const removeRow = (idx) => { if (rows.length > 1) setRows(r => r.filter((_, i) => i !== idx)); };

  const buildItems = () => rows.map(r => {
    const total = calcRow(type, r);
    if (type === 'room')  return { description: r.desc, arrival: r.arrival, departure: r.departure, nights: +r.nights, rate: +r.rate, total };
    if (type === 'event') return { description: r.desc, start_date: r.start, end_date: r.end, pax: +r.pax, pax_charge: +r.paxCharge, rental: +r.rental, total };
    return { description: r.desc, quantity: +r.qty, unit_price: +r.unitPrice, total };
  });

  const handleCustomerSelect = (cust) => {
    if (!cust) return;
    setMeta(m => ({
      ...m,
      company:        cust.company_name    || '',
      contact_person: cust.contact_person || '',
      address_1:      cust.address_1      || '',
      address_2:      cust.address_2      || '',
      address_3:      cust.address_3      || '',
      city:           cust.city           || '',
      country:        cust.country        || '',
      customer_vat:   cust.vat_number     || ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!meta.company.trim()) return setMessage('Company name is required.');
    setStatus('saving'); setMessage('');
    try {
      const { data } = await api.post('/invoices', {
        invoice_type:     type,
        company_name:     meta.company.trim(),
        contact_person:   meta.contact_person,
        address_1:        meta.address_1,
        address_2:        meta.address_2,
        address_3:        meta.address_3,
        city:             meta.city,
        country:          meta.country,
        customer_vat:     meta.customer_vat,
        invoice_date:     meta.date,
        subtotal:         totals.subtotal,
        discount_percent: parseFloat(meta.discount) || 0,
        discount_amount:  totals.discount,
        municipality_fee: totals.municipality,
        vat_total:        totals.vat,
        advance_payment:  parseFloat(meta.advance) || 0,
        grand_total:      totals.grand,
        balance_due:      totals.balance,
        items:            buildItems()
      });
      setStatus('success');
      setMessage(`Invoice ${data.invoice_number} saved successfully!`);
      setRows([type === 'room' ? EMPTY_ROOM_ROW() : type === 'event' ? EMPTY_EVENT_ROW() : EMPTY_MISC_ROW()]);
      setMeta({
        company: '', contact_person: '', address_1: '', address_2: '', address_3: '',
        city: '', country: '', customer_vat: '', date: new Date().toISOString().split('T')[0], discount: '', advance: ''
      });
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.error || 'Failed to save invoice.');
    }
  };

  const inputCls = 'bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-white text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-500';

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Create Invoice</h1>
        <p className="text-slate-400 text-sm mt-0.5">Fill in the details to generate a proforma invoice.</p>
      </div>

      {/* Type tabs */}
      <div className="flex gap-2">
        {[
          ['room',  'Room Stay'],
          ['event', 'Event'],
          ['misc',  'Miscellaneous']
        ].map(([t, label]) => (
          <button key={t} type="button" onClick={() => switchType(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${type === t ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Meta */}
        <div className="card grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <div className="flex justify-between items-center mb-1">
              <label className="label mb-0">Company / Guest Name *</label>
              {customers.length > 0 && (
                <select
                  className="text-xs bg-slate-800 border border-slate-700 text-slate-300 rounded px-2 py-0.5 focus:outline-none"
                  onChange={e => {
                    if (e.target.value) {
                      const cust = customers.find(c => c.id === parseInt(e.target.value));
                      if (cust) handleCustomerSelect(cust);
                    }
                  }}
                  defaultValue=""
                >
                  <option value="">-- Select saved customer --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.company_name}</option>
                  ))}
                </select>
              )}
            </div>
            <input className={inputCls} placeholder="Al Faisaliah Corp" required
              value={meta.company} onChange={e => setMeta(m => ({ ...m, company: e.target.value }))} />
          </div>
          <div>
            <label className="label">Invoice Date *</label>
            <input type="date" className={inputCls} required
              value={meta.date} onChange={e => setMeta(m => ({ ...m, date: e.target.value }))} />
          </div>
          <div>
            <label className="label">Discount %</label>
            <input type="number" min="0" max="100" step="0.01" className={inputCls} placeholder="0"
              value={meta.discount} onChange={e => setMeta(m => ({ ...m, discount: e.target.value }))} />
          </div>
          <div>
            <label className="label">Advance Payment (SAR)</label>
            <input type="number" min="0" step="0.01" className={inputCls} placeholder="0.00"
              value={meta.advance} onChange={e => setMeta(m => ({ ...m, advance: e.target.value }))} />
          </div>
        </div>

        {/* Line items */}
        <div className="card p-0 overflow-x-auto">
          <div className="p-4 border-b border-slate-700">
            <p className="text-sm font-semibold text-white">Line Items</p>
          </div>
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-700 text-left">
                <th className="px-3 py-2 text-xs text-slate-400 font-semibold w-80">Description</th>
                {type === 'room'  && <><th className="px-3 py-2 text-xs text-slate-400 font-semibold">Arrival</th><th className="px-3 py-2 text-xs text-slate-400 font-semibold">Departure</th><th className="px-3 py-2 text-xs text-slate-400 font-semibold">Nights</th><th className="px-3 py-2 text-xs text-slate-400 font-semibold">Rate</th></>}
                {type === 'event' && <><th className="px-3 py-2 text-xs text-slate-400 font-semibold">Start</th><th className="px-3 py-2 text-xs text-slate-400 font-semibold">End</th><th className="px-3 py-2 text-xs text-slate-400 font-semibold">Pax</th><th className="px-3 py-2 text-xs text-slate-400 font-semibold">Per Pax</th><th className="px-3 py-2 text-xs text-slate-400 font-semibold">Rental</th></>}
                {type === 'misc'  && <><th className="px-3 py-2 text-xs text-slate-400 font-semibold">Qty</th><th className="px-3 py-2 text-xs text-slate-400 font-semibold">Unit Price</th></>}
                <th className="px-3 py-2 text-xs text-slate-400 font-semibold text-right">Total</th>
                <th className="px-3 py-2 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {rows.map((row, idx) => (
                <tr key={idx}>
                  <td className="px-3 py-2 w-80">
                    <div className="space-y-1">
                      {activePresets.length > 0 && (
                        <select
                          className="text-[11px] bg-slate-800 border border-slate-700 text-slate-300 rounded px-1.5 py-0.5 w-full focus:outline-none"
                          onChange={e => applyPresetToRow(idx, e.target.value)}
                          value=""
                        >
                          <option value="">-- Select preset --</option>
                          {activePresets.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.description} {parseFloat(p.default_price) > 0 ? `(${parseFloat(p.default_price).toFixed(2)} SAR)` : ''}
                            </option>
                          ))}
                        </select>
                      )}
                      <input
                        className={inputCls}
                        placeholder="Description"
                        value={row.desc}
                        onChange={e => updateRow(idx, 'desc', e.target.value)}
                      />
                    </div>
                  </td>
                  {type === 'room' && <>
                    <td className="px-3 py-2"><input type="date" className={inputCls} value={row.arrival}   onChange={e => updateRow(idx, 'arrival',   e.target.value)} /></td>
                    <td className="px-3 py-2"><input type="date" className={inputCls} value={row.departure} onChange={e => updateRow(idx, 'departure', e.target.value)} /></td>
                    <td className="px-3 py-2"><input type="number" min="1" className={inputCls} placeholder="0" value={row.nights} onChange={e => updateRow(idx, 'nights', e.target.value)} /></td>
                    <td className="px-3 py-2"><input type="number" min="0" step="0.01" className={inputCls} placeholder="0.00" value={row.rate} onChange={e => updateRow(idx, 'rate', e.target.value)} /></td>
                  </>}
                  {type === 'event' && <>
                    <td className="px-3 py-2"><input type="date" className={inputCls} value={row.start} onChange={e => updateRow(idx, 'start', e.target.value)} /></td>
                    <td className="px-3 py-2"><input type="date" className={inputCls} value={row.end}   onChange={e => updateRow(idx, 'end',   e.target.value)} /></td>
                    <td className="px-3 py-2"><input type="number" min="0" className={inputCls} placeholder="0" value={row.pax}       onChange={e => updateRow(idx, 'pax',       e.target.value)} /></td>
                    <td className="px-3 py-2"><input type="number" min="0" step="0.01" className={inputCls} placeholder="0.00" value={row.paxCharge} onChange={e => updateRow(idx, 'paxCharge', e.target.value)} /></td>
                    <td className="px-3 py-2"><input type="number" min="0" step="0.01" className={inputCls} placeholder="0.00" value={row.rental}    onChange={e => updateRow(idx, 'rental',    e.target.value)} /></td>
                  </>}
                  {type === 'misc' && <>
                    <td className="px-3 py-2"><input type="number" min="1" className={inputCls} placeholder="1" value={row.qty}       onChange={e => updateRow(idx, 'qty',       e.target.value)} /></td>
                    <td className="px-3 py-2"><input type="number" min="0" step="0.01" className={inputCls} placeholder="0.00" value={row.unitPrice} onChange={e => updateRow(idx, 'unitPrice', e.target.value)} /></td>
                  </>}
                  <td className="px-3 py-2 text-right text-white font-medium whitespace-nowrap">{calcRow(type, row).toFixed(2)}</td>
                  <td className="px-3 py-2">
                    <button type="button" onClick={() => removeRow(idx)} disabled={rows.length === 1}
                      className="text-slate-500 hover:text-red-400 disabled:opacity-30 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-3 border-t border-slate-700">
            <button type="button" onClick={addRow} className="btn-ghost text-xs">+ Add row</button>
          </div>
        </div>

        {/* Totals */}
        <div className="card">
          <div className="max-w-xs ml-auto space-y-2 text-sm">
            {[
              ['Subtotal', totals.subtotal],
              totals.discount  > 0 ? [`Discount (${meta.discount}%)`, -totals.discount]           : null,
              type === 'room'       ? ['Municipality Fee (5%)', totals.municipality]                : null,
              ['VAT (15%)', totals.vat],
              ['Grand Total', totals.grand, true],
              parseFloat(meta.advance) > 0 ? [`Advance Payment`, -parseFloat(meta.advance)]         : null,
              parseFloat(meta.advance) > 0 ? ['Balance Due', totals.balance, true]                  : null,
            ].filter(Boolean).map(([label, amount, bold]) => (
              <div key={label} className={`flex justify-between ${bold ? 'font-semibold text-white border-t border-slate-600 pt-2 mt-2 text-base' : 'text-slate-300'}`}>
                <span>{label}</span>
                <span>{parseFloat(amount).toFixed(2)} SAR</span>
              </div>
            ))}
          </div>
        </div>

        {message && (
          <div className={status === 'success' ? 'alert-success' : 'alert-error'}>{message}</div>
        )}

        <button type="submit" disabled={status === 'saving'} className="btn-primary">
          {status === 'saving' ? 'Saving…' : 'Save Invoice'}
        </button>
      </form>
    </div>
  );
}
