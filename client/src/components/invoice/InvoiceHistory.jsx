import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import InvoicePreviewModal from './InvoicePreviewModal';

const TYPE_LABELS = { room: 'Room Stay', event: 'Event', misc: 'Misc' };
const TYPE_COLORS = { room: 'badge-green', event: 'badge-blue', misc: 'badge-slate' };

export default function InvoiceHistory() {
  const { api } = useAuth();
  const [invoices,        setInvoices]        = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [filters,         setFilters]         = useState({ search: '', type: '', date: '', amount: '' });
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showPdfReport,   setShowPdfReport]   = useState(false);
  const [settings,        setSettings]        = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.type)   params.set('type',   filters.type);
      if (filters.date)   params.set('date',   filters.date);
      if (filters.amount) params.set('amount', filters.amount);
      const { data } = await api.get(`/invoices?${params}`);
      setInvoices(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [api, filters]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.get('/settings').then(({ data }) => setSettings(data)).catch(() => {});
  }, [api]);

  const setF = (field) => (e) => setFilters(f => ({ ...f, [field]: e.target.value }));
  const reset = () => setFilters({ search: '', type: '', date: '', amount: '' });

  // ── CSV Export Function ──
  const handleExportCSV = () => {
    if (!invoices || invoices.length === 0) {
      alert('No invoices available to export.');
      return;
    }

    const headers = [
      'Invoice #',
      'Type',
      'Company Name',
      'Contact Person',
      'City',
      'Country',
      'Customer VAT',
      'Invoice Date',
      'Subtotal (SAR)',
      'Discount %',
      'Discount (SAR)',
      'Municipality Fee 5% (SAR)',
      'VAT Total 15% (SAR)',
      'Grand Total (SAR)',
      'Advance Payment (SAR)',
      'Balance Due (SAR)',
      'Created By',
      'Created At'
    ];

    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvRows = invoices.map(inv => [
      escapeCSV(inv.invoice_number),
      escapeCSV(TYPE_LABELS[inv.invoice_type] || inv.invoice_type),
      escapeCSV(inv.company_name),
      escapeCSV(inv.contact_person || ''),
      escapeCSV(inv.city || ''),
      escapeCSV(inv.country || ''),
      escapeCSV(inv.customer_vat || ''),
      escapeCSV(inv.invoice_date),
      escapeCSV(parseFloat(inv.subtotal || 0).toFixed(2)),
      escapeCSV(parseFloat(inv.discount_percent || 0).toFixed(2)),
      escapeCSV(parseFloat(inv.discount_amount || 0).toFixed(2)),
      escapeCSV(parseFloat(inv.municipality_fee || 0).toFixed(2)),
      escapeCSV(parseFloat(inv.vat_total || 0).toFixed(2)),
      escapeCSV(parseFloat(inv.grand_total || 0).toFixed(2)),
      escapeCSV(parseFloat(inv.advance_payment || 0).toFixed(2)),
      escapeCSV(parseFloat(inv.balance_due || 0).toFixed(2)),
      escapeCSV(inv.created_by || ''),
      escapeCSV(inv.created_at ? new Date(inv.created_at).toLocaleString() : '')
    ]);

    const csvString = '\uFEFF' + [headers.join(','), ...csvRows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const typeLabel = filters.type ? `_${TYPE_LABELS[filters.type] || filters.type}` : '';
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `Invoice_History${typeLabel}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate totals of currently filtered result set
  const totalGrand   = invoices.reduce((sum, inv) => sum + (parseFloat(inv.grand_total) || 0), 0);
  const totalBalance = invoices.reduce((sum, inv) => sum + (parseFloat(inv.balance_due) || 0), 0);

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      
      {/* Top Header & Export Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Invoice History</h1>
          <p className="text-slate-400 text-sm mt-0.5">Search, review, export, and print saved invoices.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            disabled={loading || invoices.length === 0}
            className="btn-secondary px-3.5 py-2 text-xs flex items-center gap-2 border-slate-700 hover:bg-slate-700 text-slate-200 disabled:opacity-40"
          >
            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV ({invoices.length})
          </button>

          <button
            onClick={() => setShowPdfReport(true)}
            disabled={loading || invoices.length === 0}
            className="btn-primary px-3.5 py-2 text-xs flex items-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-40"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Export / Print PDF ({invoices.length})
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card grid grid-cols-2 md:grid-cols-4 gap-3">
        <input className="input col-span-2 md:col-span-1" placeholder="Search company / invoice #"
          value={filters.search} onChange={setF('search')} />
        <select className="input" value={filters.type} onChange={setF('type')}>
          <option value="">All types</option>
          <option value="room">Room Stay</option>
          <option value="event">Event</option>
          <option value="misc">Miscellaneous</option>
        </select>
        <input type="date" className="input" value={filters.date} onChange={setF('date')} />
        <div className="flex gap-2">
          <input type="number" className="input" placeholder="Amount" value={filters.amount} onChange={setF('amount')} />
          <button onClick={reset} className="btn-ghost px-3 text-xs whitespace-nowrap">Clear</button>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>
        ) : invoices.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No invoices found matching active filters.</div>
        ) : (
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-700">
                {['Invoice #','Type','Company','Date','Total (SAR)','Balance (SAR)','By','Action'].map(h => (
                  <th key={h} className={`px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider ${h === 'Action' ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-slate-700/30 transition-colors group">
                  <td className="px-4 py-3 font-mono text-xs">
                    <button
                      onClick={() => setSelectedInvoice(inv)}
                      className="text-blue-400 hover:text-blue-300 hover:underline font-semibold text-left"
                    >
                      {inv.invoice_number}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className={TYPE_COLORS[inv.invoice_type] || 'badge-slate'}>
                      {TYPE_LABELS[inv.invoice_type] || inv.invoice_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300 truncate max-w-[160px]">{inv.company_name}</td>
                  <td className="px-4 py-3 text-slate-400">{inv.invoice_date}</td>
                  <td className="px-4 py-3 font-semibold text-white">{parseFloat(inv.grand_total).toFixed(2)}</td>
                  <td className={`px-4 py-3 font-semibold ${parseFloat(inv.balance_due) > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                    {parseFloat(inv.balance_due).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs truncate max-w-[120px]">{inv.created_by}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelectedInvoice(inv)}
                      className="btn-secondary py-1 px-2.5 text-xs text-blue-400 border-blue-500/30 hover:bg-blue-600 hover:text-white transition-all"
                    >
                      Preview / Print
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Single Invoice Preview & Print Modal */}
      {selectedInvoice && (
        <InvoicePreviewModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

      {/* Filtered History PDF Report Modal */}
      {showPdfReport && (
        <FilteredHistoryReportModal
          invoices={invoices}
          filters={filters}
          settings={settings}
          totalGrand={totalGrand}
          totalBalance={totalBalance}
          onClose={() => setShowPdfReport(false)}
        />
      )}

    </div>
  );
}

// ── Printable PDF Report Modal for Filtered History ──
function FilteredHistoryReportModal({ invoices, filters, settings, totalGrand, totalBalance, onClose }) {
  const hotelName  = settings?.hotel_name  || 'Lotus Palace Hotel';
  const hotelCity  = settings?.city        || 'Riyadh';
  const vatNumber  = settings?.vat_number  || '310123456700003';
  const hotelLogo  = settings?.hotel_logo  || '';

  const printTimestamp = new Date().toLocaleString('en-US', {
    month: 'numeric', day: 'numeric', year: '2-digit', hour: 'numeric', minute: '2-digit', hour12: true
  });

  const activeFilterBadges = [
    filters.type ? `Type: ${TYPE_LABELS[filters.type] || filters.type}` : null,
    filters.search ? `Search: "${filters.search}"` : null,
    filters.date ? `Date: ${filters.date}` : null,
    filters.amount ? `Min Amount: ${filters.amount} SAR` : null
  ].filter(Boolean);

  const handlePrint = () => {
    window.print();
  };

  return createPortal(
    <div className="printable-modal-overlay fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 print:p-0 print:bg-white print:static print:inset-auto">
      <div className="printable-modal-card bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden print:border-none print:shadow-none print:max-w-none print:max-h-none print:w-full print:bg-white print:rounded-none">
        
        {/* Top Controls */}
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <span className="text-white font-bold text-sm">Invoice History Report</span>
            <span className="badge badge-blue text-xs font-mono">{invoices.length} Record(s)</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="btn-primary px-4 py-2 text-sm flex items-center gap-2 shadow-lg shadow-blue-500/20"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print / Save PDF
            </button>
            <button onClick={onClose} className="btn-ghost px-3 py-2 text-slate-400 hover:text-white">✕</button>
          </div>
        </div>

        {/* Printable Summary Report Sheet (A4 Landscape by Default) */}
        <div className="printable-invoice print-landscape overflow-y-auto p-8 sm:p-12 bg-white text-slate-900 print:p-0 print:overflow-visible flex-1">
          
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-6">
            <div>
              {hotelLogo ? (
                <img src={hotelLogo} alt={hotelName} className="h-14 object-contain mb-2" />
              ) : (
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{hotelName}</h1>
              )}
              <p className="text-xs text-slate-600">{hotelCity}, Saudi Arabia | VAT: <span className="font-mono">{vatNumber}</span></p>
            </div>
            <div className="text-right">
              <div className="inline-block bg-slate-900 text-white font-bold px-4 py-1.5 rounded text-xs uppercase tracking-wider mb-1">
                PROFORMA INVOICE SUMMARY REPORT
              </div>
              <p className="text-xs text-slate-500 font-bold">تقرير ملخص الفواتير الشكلية</p>
              <p className="text-[11px] text-slate-600 mt-2">Generated: <span className="font-mono">{printTimestamp}</span></p>
            </div>
          </div>

          {/* Active Filters & Summary Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6 text-xs flex flex-wrap justify-between items-center gap-4">
            <div>
              <p className="font-bold text-slate-700 uppercase tracking-wider mb-1">Applied Filters / الفلاتر المطبقة:</p>
              {activeFilterBadges.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {activeFilterBadges.map((b, i) => (
                    <span key={i} className="bg-slate-200 text-slate-800 font-medium px-2.5 py-0.5 rounded text-[11px]">{b}</span>
                  ))}
                </div>
              ) : (
                <span className="text-slate-500 italic">All Invoices (No filter applied)</span>
              )}
            </div>

            <div className="flex gap-6 text-right">
              <div>
                <p className="text-slate-500 text-[10px] uppercase font-bold">Total Invoices</p>
                <p className="text-sm font-bold text-slate-900 font-mono">{invoices.length}</p>
              </div>
              <div>
                <p className="text-slate-500 text-[10px] uppercase font-bold">Total Revenue</p>
                <p className="text-sm font-bold text-slate-900 font-mono">{totalGrand.toFixed(2)} SAR</p>
              </div>
              <div>
                <p className="text-slate-500 text-[10px] uppercase font-bold">Total Balance Due</p>
                <p className="text-sm font-bold text-red-700 font-mono">{totalBalance.toFixed(2)} SAR</p>
              </div>
            </div>
          </div>

          {/* Report Table */}
          <table className="w-full text-xs text-left border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-900 text-white font-semibold uppercase tracking-wider">
                <th className="p-2.5 border border-slate-700">Invoice #</th>
                <th className="p-2.5 border border-slate-700">Type</th>
                <th className="p-2.5 border border-slate-700">Company Name</th>
                <th className="p-2.5 border border-slate-700">Date</th>
                <th className="p-2.5 border border-slate-700 text-right">Subtotal</th>
                <th className="p-2.5 border border-slate-700 text-right">VAT (15%)</th>
                <th className="p-2.5 border border-slate-700 text-right">Grand Total (SAR)</th>
                <th className="p-2.5 border border-slate-700 text-right">Balance Due (SAR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {invoices.map((inv, idx) => (
                <tr key={inv.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                  <td className="p-2.5 border border-slate-200 font-mono font-bold">{inv.invoice_number}</td>
                  <td className="p-2.5 border border-slate-200 capitalize">{TYPE_LABELS[inv.invoice_type] || inv.invoice_type}</td>
                  <td className="p-2.5 border border-slate-200 font-medium">{inv.company_name}</td>
                  <td className="p-2.5 border border-slate-200">{inv.invoice_date}</td>
                  <td className="p-2.5 border border-slate-200 text-right font-mono">{parseFloat(inv.subtotal).toFixed(2)}</td>
                  <td className="p-2.5 border border-slate-200 text-right font-mono">{parseFloat(inv.vat_total).toFixed(2)}</td>
                  <td className="p-2.5 border border-slate-200 text-right font-mono font-bold text-slate-900">{parseFloat(inv.grand_total).toFixed(2)}</td>
                  <td className={`p-2.5 border border-slate-200 text-right font-mono font-bold ${parseFloat(inv.balance_due) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {parseFloat(inv.balance_due).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-900">
                <td colSpan={6} className="p-2.5 text-right uppercase tracking-wider">Summary Totals / الإجمالي:</td>
                <td className="p-2.5 text-right font-mono text-blue-950">{totalGrand.toFixed(2)} SAR</td>
                <td className="p-2.5 text-right font-mono text-red-700">{totalBalance.toFixed(2)} SAR</td>
              </tr>
            </tfoot>
          </table>

          {/* Footer Note */}
          <div className="print-footer border-t border-slate-200 pt-3 mt-6 flex justify-between items-center text-[10px] text-slate-500">
            <div>This is an official summary report generated from {hotelName}.</div>
            <div className="font-mono text-slate-600">{printTimestamp}</div>
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
}
