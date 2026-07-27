import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';

const EMPTY = { email: '', password: '', role: 'user' };

export default function UserManager() {
  const { api, user: currentUser } = useAuth();
  const [users,   setUsers]   = useState([]);
  const [form,    setForm]    = useState(EMPTY);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users');
      setUsers(data);
    } catch { /* handled */ }
    finally { setLoading(false); }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const set = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }));
  const reset = () => { setForm(EMPTY); setEditing(false); setError(''); setSuccess(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setSaving(true);
    try {
      await api.post('/users', form);
      setSuccess(editing ? `${form.email} updated.` : `${form.email} created.`);
      reset();
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save user.');
    } finally {
      setSaving(false);
    }
  };

  const editUser = (u) => {
    setForm({ email: u.email, password: '', role: u.role });
    setEditing(true);
    setError(''); setSuccess('');
  };

  const deleteUser = async (id, email) => {
    if (!confirm(`Delete account "${email}"?`)) return;
    try { await api.delete(`/users/${id}`); load(); }
    catch (err) { alert(err.response?.data?.error || 'Delete failed.'); }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">User Management</h1>
        <p className="text-slate-400 text-sm mt-0.5">Create accounts and manage access roles.</p>
      </div>

      <div className="grid md:grid-cols-5 gap-6">
        {/* Form */}
        <div className="md:col-span-2">
          <div className="card">
            <h2 className="text-sm font-semibold text-white mb-4">{editing ? `Edit: ${form.email}` : 'Add User'}</h2>
            {error   && <div className="alert-error mb-3 text-xs">{error}</div>}
            {success && <div className="alert-success mb-3 text-xs">{success}</div>}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="label text-xs">Email Address *</label>
                <input type="email" required className="input text-sm" value={form.email}
                  onChange={set('email')} disabled={editing} placeholder="user@example.com" />
              </div>
              <div>
                <label className="label text-xs">
                  Password {editing && <span className="text-slate-500 font-normal">(leave blank to keep)</span>}
                </label>
                <input type="password" className="input text-sm" value={form.password}
                  onChange={set('password')} placeholder={editing ? 'New password (optional)' : 'Min. 8 characters'}
                  minLength={editing ? 0 : 8} required={!editing} />
              </div>
              <div>
                <label className="label text-xs">Role *</label>
                <select className="input text-sm" value={form.role} onChange={set('role')}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={saving} className="btn-primary flex-1 text-sm">
                  {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
                </button>
                {editing && (
                  <button type="button" onClick={reset} className="btn-secondary text-sm">Cancel</button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* User list */}
        <div className="md:col-span-3">
          <div className="card p-0 overflow-hidden">
            {loading ? (
              <div className="p-6 text-center text-slate-400 text-sm">Loading…</div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {users.map(u => (
                  <div key={u.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-700/30 transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">{u.email}</p>
                        {u.email === currentUser?.email && (
                          <span className="badge badge-blue text-xs">you</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`badge ${u.role === 'admin' ? 'badge-blue' : 'badge-slate'}`}>
                          {u.role}
                        </span>
                        {u.is_2fa_enabled && (
                          <span className="badge badge-green">2FA on</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-3 flex-shrink-0">
                      <button onClick={() => editUser(u)} className="btn-secondary px-2 py-1 text-xs">Edit</button>
                      <button
                        onClick={() => deleteUser(u.id, u.email)}
                        disabled={u.email === currentUser?.email}
                        className="btn-danger px-2 py-1 text-xs disabled:opacity-30"
                      >Del</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
