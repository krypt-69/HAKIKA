import React from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../AuthContext'

const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Dashboard' },
    { path: '/businesses', label: 'Businesses' },
    { path: '/commercial', label: 'Commercial' },
    { path: '/disputes', label: 'Disputes' },
    { path: '/settlements', label: 'Settlements' },
    { path: '/categories', label: 'Categories' },
  ];

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{
        width: 260,
        background: '#111111',
        padding: '24px 20px',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        zIndex: 100,
      }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ color: '#ffffff', fontSize: '1.5rem', fontWeight: 700 }}>Hakika Admin</h1>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: '8px',
                color: isActive(item.path) ? '#ffffff' : '#9ca3af',
                background: isActive(item.path) ? '#1f2937' : 'transparent',
                textDecoration: 'none', fontSize: '0.875rem',
                fontWeight: isActive(item.path) ? 600 : 400,
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div style={{ borderTop: '1px solid #1f2937', paddingTop: 16, marginTop: 'auto' }}>
          <p style={{ color: '#ffffff', fontSize: '0.875rem' }}>{user?.email}</p>
          <button onClick={handleLogout} style={{
            width: '100%', padding: '8px 12px', background: 'transparent',
            border: '1px solid #dc2626', borderRadius: '6px', color: '#dc2626',
            fontSize: '0.875rem', cursor: 'pointer', marginTop: 8,
          }}>
            Logout
          </button>
        </div>
      </aside>
      <main style={{ flex: 1, marginLeft: 260, padding: 24, background: '#f8fafc', minHeight: '100vh' }}>
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
