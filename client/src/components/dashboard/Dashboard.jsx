import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import InvoicePreviewModal from '../invoice/InvoicePreviewModal';

function StatCard({ label, value, sub, color = 'blue' }) {
  const colors = {
    blue:   'bg-blue-900/30 border-blue-700/40 text-blue-400',
    green:  'bg-green-900/30 border-green-700/40 text-green-400',
    yellow: 'bg-yellow-900/30 border-yellow-700/40 text-yellow-400',
    slate:  'bg-slate-700/40 border-slate-600/40 text-slate-300'
  };
  return (
    <div className={`rounded-xl border p-5 ${colors[color]}`}>
      <p className="text-xs font-medium uppercase tracking-wider opacity-70">{label}</p>
      <p className="text-3xl font-bold text-white mt-1">{value ?? '—'}</p>
      {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
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

  const totalRevenue = invoices.reduce((s, i) => s + parseFloat(i.grand_total || 0), 0);
  const outstanding  = invoices.reduce((s, i) => s + parseFloat(i.balance_due  || 0), 0);
  const recent       = invoices.slice(0, 5);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}
        </h1>
        <p className="text-slate-400 text-sm mt-0.5">Here's what's happening with your invoices.</p>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-700 bg-slate-800 p-5 animate-pulse h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Invoices"  value={invoices.length}           color="blue" />
          <StatCard label="Customers"       value={customers.length}          color="slate" />
          <StatCard label="Total Revenue"   value={`${totalRevenue.toFixed(0)} SAR`} color="green" />
          <StatCard label="Outstanding"     value={`${outstanding.toFixed(0)} SAR`}  color="yellow" />
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
