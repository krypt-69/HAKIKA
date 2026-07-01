import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@hakika/auth';

const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (user?.role !== 'admin') {
    return <div style={{ padding: 40, textAlign: 'center' }}>Access denied. Admin only.</div>;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: 240, background: '#1e1b4b', color: '#fff', padding: 20 }}>
        <h2 style={{ marginBottom: 30 }}>Hakika Admin</h2>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Link to="/" style={{ color: '#c7d2fe', textDecoration: 'none' }}>Dashboard</Link>
          <Link to="/businesses" style={{ color: '#c7d2fe', textDecoration: 'none' }}>Businesses</Link>
          <Link to="/disputes" style={{ color: '#c7d2fe', textDecoration: 'none' }}>Disputes</Link>
          <Link to="/settlements" style={{ color: '#c7d2fe', textDecoration: 'none' }}>Settlements</Link>
          <Link to="/payments" style={{ color: '#c7d2fe', textDecoration: 'none' }}>Payments</Link>
          <Link to="/trust" style={{ color: '#c7d2fe', textDecoration: 'none' }}>Trust</Link>
          <Link to="/health" style={{ color: '#c7d2fe', textDecoration: 'none' }}>Health</Link>
        </nav>
        <div style={{ position: 'absolute', bottom: 20, width: 200 }}>
          <p style={{ fontSize: 14 }}>{user?.email}</p>
          <button onClick={handleLogout} style={{ padding: '6px 12px', marginTop: 8 }}>Logout</button>
        </div>
      </aside>
      <main style={{ flex: 1, padding: 20, background: '#f8fafc' }}>
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
