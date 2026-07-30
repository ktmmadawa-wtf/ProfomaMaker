import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function LiveClock({ className = '' }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekday = dayNames[now.getDay()];
  const day = String(now.getDate()).padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[now.getMonth()];
  const year = now.getFullYear();

  let hours = now.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const formattedHours = String(hours).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return (
    <div className={`w-full flex items-center justify-between gap-1.5 whitespace-nowrap select-none ${className}`}>
      {/* Modern Date Pill - Justified Left */}
      <div className="flex-1 flex items-center justify-center px-1.5 py-1 bg-slate-800/90 border border-slate-700/70 rounded-lg text-slate-300 font-mono text-[10.5px] font-medium shadow-sm text-center">
        <span>{weekday} {day} {month} {year}</span>
      </div>

      {/* Modern Time Pill with Seconds - Justified Right */}
      <div className="flex-1 flex items-center justify-center gap-0.5 px-1.5 py-1 bg-slate-800/90 border border-slate-700/70 rounded-lg text-slate-300 font-mono text-[10.5px] font-medium shadow-sm text-center">
        <span>{formattedHours}</span>
        <span className="opacity-60 animate-pulse">:</span>
        <span>{minutes}</span>
        <span className="opacity-60 animate-pulse">:</span>
        <span>{seconds}</span>
        <span className="ml-1 text-[9.5px] font-semibold uppercase tracking-wider">{ampm}</span>
      </div>
    </div>
  );
}

const navItems = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    )
  },
  {
    to: '/invoices',
    label: 'New Invoice',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 4v16m8-8H4" />
    )
  },
  {
    to: '/history',
    label: 'History',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    )
  },
  {
    to: '/customers',
    label: 'Customers',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    )
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    )
  }
];

const adminNavItems = [
  {
    to: '/users',
    label: 'Users',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    )
  }
];

function NavItem({ to, label, icon, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
         ${isActive
           ? 'bg-blue-600 text-white'
           : 'text-slate-400 hover:text-white hover:bg-slate-700'}`
      }
    >
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {icon}
      </svg>
      {label}
    </NavLink>
  );
}

export default function AppLayout() {
  const { user, isAdmin, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo & Live Clock Header */}
      <div className="px-4 py-3.5 border-b space-y-2" style={{ borderColor: 'var(--sidebar-border)' }}>
        <div className="flex items-center gap-3">
          <img
            src="/icons/icon-192.png"
            alt="Proforma by Madawa"
            className="w-9 h-9 rounded-lg object-contain flex-shrink-0"
          />
          <div className="min-w-0">
            <p className="font-bold text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>PROFORMA</p>
            <p className="text-xs leading-tight" style={{ color: 'var(--text-muted)' }}>by Madawa</p>
          </div>
        </div>
        <div className="pt-1.5 border-t border-slate-700/40 flex items-center justify-between">
          <LiveClock />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(item => (
          <NavItem key={item.to} {...item} onClick={() => setSidebarOpen(false)} />
        ))}

        {isAdmin && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Admin</p>
            </div>
            {adminNavItems.map(item => (
              <NavItem key={item.to} {...item} onClick={() => setSidebarOpen(false)} />
            ))}
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="border-t border-slate-700 p-3">
        <div className="flex items-center gap-3 px-2 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white font-medium truncate">{user?.email}</p>
            <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
          </div>
        </div>
        <NavLink
          to="/setup-2fa"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Manage 2FA
        </NavLink>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign out
        </button>

        {/* Copyright */}
        <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--sidebar-border)' }}>
          <p className="text-center" style={{ color: 'var(--text-muted)', fontSize: '10px', lineHeight: '1.5' }}>
            © July 2026 Proforma by Madawa
          </p>
          <a
            href="mailto:madawa.mm@gmail.com"
            className="block text-center transition-colors"
            style={{ color: 'var(--text-muted)', fontSize: '10px' }}
          >
            madawa.mm@gmail.com
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-56 flex-shrink-0 sidebar-themed">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative flex flex-col w-56 h-full sidebar-themed z-50">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden" style={{ background: 'var(--bg-base)' }}>
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between gap-3 px-4 py-3 sidebar-themed">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <img src="/icons/icon-192.png" alt="Proforma by Madawa" className="w-5 h-5 object-contain" />
            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>PROFORMA</span>
          </div>
          <LiveClock />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

