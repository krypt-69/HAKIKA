import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { usePendingOrders } from '../PendingOrdersContext';
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  Bike,
  CreditCard,
  User,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

const DashboardLayout: React.FC = () => {
  const { user, logout, businessName } = useAuth();
  const { pendingCount } = usePendingOrders();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/orders', label: 'Orders', icon: ClipboardList },
    { path: '/products', label: 'Products', icon: Package },
    { path: '/riders', label: 'Riders', icon: Bike },
    { path: '/settlements', label: 'Payments', icon: CreditCard },
    { path: '/businesses', label: 'Profile', icon: User },
  ];

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const GREEN = '#16a34a';
  const BLACK = '#111111';

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Top Navbar */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            padding: '0 20px',
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img
              src="/business/logo.png"
              alt="Hakika"
              style={{
                width: 52,
                height: 52,
                display: 'block',
                objectFit: 'contain',
              }}
            />
            <div>
              <h1 style={{ color: BLACK, fontSize: '1.05rem', fontWeight: 700, lineHeight: 1 }}>
                Hakika
              </h1>
              <p style={{ color: '#9ca3af', fontSize: '0.7rem', marginTop: 2 }}>Business</p>
            </div>
          </div>

          {/* Desktop nav */}
          <nav
            className="desktop-nav"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 12px',
                    borderRadius: 8,
                    textDecoration: 'none',
                    fontSize: '0.85rem',
                    fontWeight: active ? 600 : 500,
                    color: active ? GREEN : '#4b5563',
                    background: active ? '#f0fdf4' : 'transparent',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = '#f3f4f6';
                      e.currentTarget.style.color = BLACK;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#4b5563';
                    }
                  }}
                >
                  <Icon size={17} strokeWidth={2} />
                  {item.label}
                  {item.path === '/orders' && pendingCount > 0 && (
                    <span
                      aria-label={`${pendingCount} orders awaiting acceptance`}
                      style={{
                        position: 'absolute',
                        top: -4,
                        right: -4,
                        minWidth: 18,
                        height: 18,
                        padding: '0 5px',
                        borderRadius: 9,
                        background: '#dc2626',
                        color: '#ffffff',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        lineHeight: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 0 0 2px #ffffff',
                      }}
                    >
                      {pendingCount > 99 ? '99+' : pendingCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User / Logout (desktop) */}
          <div className="desktop-user" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: BLACK,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: GREEN,
                  fontSize: '0.8rem',
                  fontWeight: 700,
                }}
              >
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <p style={{ color: BLACK, fontSize: '0.8rem', fontWeight: 600, lineHeight: 1.2 }}>
                  {businessName || 'Business'}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              style={{
                width: 34,
                height: 34,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                color: '#dc2626',
                cursor: 'pointer',
                transition: 'background 0.15s, border-color 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#fef2f2';
                e.currentTarget.style.borderColor = '#dc2626';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = '#e5e7eb';
              }}
            >
              <LogOut size={16} />
            </button>
          </div>

          {/* Mobile menu toggle */}
          <button
            className="mobile-toggle"
            onClick={() => setMenuOpen((o) => !o)}
            style={{
              display: 'none',
              width: 36,
              height: 36,
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              color: BLACK,
              cursor: 'pointer',
            }}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile nav panel */}
        {menuOpen && (
          <div
            className="mobile-panel"
            style={{
              display: 'none',
              borderTop: '1px solid #e5e7eb',
              background: '#ffffff',
              padding: '8px 12px 12px',
            }}
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 8,
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                    fontWeight: active ? 600 : 500,
                    color: active ? GREEN : '#374151',
                    background: active ? '#f0fdf4' : 'transparent',
                  }}
                >
                  <Icon size={18} strokeWidth={2} />
                  {item.label}
                  {item.path === '/orders' && pendingCount > 0 && (
                    <span
                      aria-label={`${pendingCount} orders awaiting acceptance`}
                      style={{
                        marginLeft: 'auto',
                        minWidth: 20,
                        height: 20,
                        padding: '0 6px',
                        borderRadius: 10,
                        background: '#dc2626',
                        color: '#ffffff',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        lineHeight: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {pendingCount > 99 ? '99+' : pendingCount}
                    </span>
                  )}
                </Link>
              );
            })}
            <div style={{ borderTop: '1px solid #f3f4f6', marginTop: 8, paddingTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px' }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: BLACK,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: GREEN,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <p style={{ color: BLACK, fontSize: '0.85rem', fontWeight: 600 }}>
                  {businessName || 'Business'}
                </p>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  width: '100%',
                  marginTop: 6,
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 8,
                  color: '#dc2626',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <LogOut size={17} />
                Logout
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main
        style={{
          paddingTop: 64,
          minHeight: '100vh',
        }}
      >
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: 24 }}>
          <Outlet />
        </div>
      </main>

      {/* Responsive rules */}
      <style>{`
        @media (max-width: 860px) {
          .desktop-nav, .desktop-user {
            display: none !important;
          }
          .mobile-toggle {
            display: flex !important;
          }
          .mobile-panel {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
};

export default DashboardLayout;