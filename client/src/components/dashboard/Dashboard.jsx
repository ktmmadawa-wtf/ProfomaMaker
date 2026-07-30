import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import InvoicePreviewModal from '../invoice/InvoicePreviewModal';

function StatCard({ label, value, sub, color = 'blue', icon }) {
  const colors = {
    blue:   'bg-[#132247] border-[#1d3570] text-[#4d82f3]',
    indigo: 'bg-[#1a233b] border-[#29385c] text-[#7189bf]',
    emerald:'bg-[#0d2a22] border-[#144738] text-[#34d399]',
    purple: 'bg-[#27183e] border-[#43266b] text-[#c084fc]',
    amber:  'bg-[#2c2014] border-[#4f381f] text-[#fbbf24]'
  };
  return (
    <div className={`rounded-2xl border p-5 transition-all hover:scale-[1.02] shadow-lg flex flex-col justify-between ${colors[color] || colors.blue}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider opacity-90 text-slate-300">{label}</p>
        {icon && <div className="p-2 rounded-xl bg-white/10 text-current flex-shrink-0">{icon}</div>}
      </div>
      <div className="mt-3">
        <p className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight font-sans">{value ?? '—'}</p>
        {sub && <p className="text-xs mt-1.5 opacity-75 font-medium">{sub}</p>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { api, user, isAdmin } = useAuth();
  const [invoices,        setInvoices]        = useState([]);
  const [customers,       setCustomers]       = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/invoices'),
      api.get('/customers')
    ]).then(([inv, cust]) => {
      setInvoices(inv.data);
      setCustomers(cust.data);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [api]);

  const roomInvoices  = invoices.filter(i => i.invoice_type === 'room');
  const eventInvoices = invoices.filter(i => i.invoice_type === 'event');
  const miscInvoices  = invoices.filter(i => i.invoice_type === 'misc');

  const roomTotal  = roomInvoices.reduce((s, i) => s + parseFloat(i.grand_total || 0), 0);
  const eventTotal = eventInvoices.reduce((s, i) => s + parseFloat(i.grand_total || 0), 0);
  const miscTotal  = miscInvoices.reduce((s, i) => s + parseFloat(i.grand_total || 0), 0);
  const recent     = invoices.slice(0, 5);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}
        </h1>
        <p className="text-slate-400 text-sm mt-0.5">Overview of total invoices, active customers, and proformas by category.</p>
      </div>

      {/* Stats - 5 Stat Blocks with Line Icons */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-700 bg-slate-800 p-5 animate-pulse h-32" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Total Invoices */}
          <StatCard
            label="Total Invoices"
            value={invoices.length}
            sub="All Proformas"
            color="blue"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          />

          {/* Total Customers */}
          <StatCard
            label="Customers"
            value={customers.length}
            sub="Active Clients"
            color="indigo"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          />

          {/* Room Proformas */}
          <StatCard
            label="Room Stays"
            value={`${roomTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} SAR`}
            sub={`${roomInvoices.length} Proformas`}
            color="emerald"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0h4" />
              </svg>
            }
          />

          {/* Event Proformas */}
          <StatCard
            label="Event & Halls"
            value={`${eventTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} SAR`}
            sub={`${eventInvoices.length} Proformas`}
            color="purple"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
          />

          {/* Misc Proformas */}
          <StatCard
            label="Miscellaneous"
            value={`${miscTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} SAR`}
            sub={`${miscInvoices.length} Proformas`}
            color="amber"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5h2M7 9h10M7 13h10M7 17h6M3 3h18v18H3V3z" />
              </svg>
            }
          />
        </div>
      )}

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { to: '/invoices',  label: 'New Invoice',    bg: 'bg-blue-600 hover:bg-blue-700' },
            { to: '/history',   label: 'View History',   bg: 'bg-slate-700 hover:bg-slate-600' },
            { to: '/customers', label: 'Customers',      bg: 'bg-slate-700 hover:bg-slate-600' },
            { to: '/setup-2fa', label: 'Manage 2FA',     bg: 'bg-slate-700 hover:bg-slate-600' },
          ].map(({ to, label, bg }) => (
            <Link key={to} to={to}
              className={`${bg} text-white text-sm font-medium rounded-xl px-4 py-3 text-center transition-colors`}>
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Recent invoices */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Recent Invoices</h2>
          <Link to="/history" className="text-xs text-blue-400 hover:text-blue-300 font-medium">View all →</Link>
        </div>

        {loading ? (
          <div className="card animate-pulse h-40" />
        ) : recent.length === 0 ? (
          <div className="card text-center py-10">
            <p className="text-slate-400 text-sm">No invoices yet.</p>
            <Link to="/invoices" className="btn-primary mt-3 inline-flex">Create your first invoice</Link>
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Invoice #</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Company</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Date</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Total</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {recent.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-700/30 transition-colors group">
                    <td className="px-4 py-3 font-mono text-xs">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="text-blue-400 hover:text-blue-300 hover:underline font-semibold text-left"
                      >
                        {inv.invoice_number}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-300 hidden sm:table-cell truncate max-w-[180px]">{inv.company_name}</td>
                    <td className="px-4 py-3 text-slate-400 hidden md:table-cell">{inv.invoice_date}</td>
                    <td className="px-4 py-3 text-right font-semibold text-white">
                      {parseFloat(inv.grand_total).toFixed(2)} <span className="text-slate-500 font-normal text-xs">SAR</span>
                    </td>
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
          </div>
        )}
      </div>

      {/* Invoice Preview & Print Modal */}
      {selectedInvoice && (
        <InvoicePreviewModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
}
