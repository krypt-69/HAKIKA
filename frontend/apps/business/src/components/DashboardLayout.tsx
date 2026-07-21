import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@hakika/auth';

const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: 240, background: '#f5f5f5', padding: 20 }}>
        <h2>Hakika</h2>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 30 }}>
          <Link to="/products">Products</Link>
          <Link to="/orders">Orders</Link>
          <Link to="/riders">Riders</Link>
          <Link to="/settlements">Settlements</Link>
          <Link to="/businesses">Profile</Link>
        </nav>
        <div style={{ position: 'absolute', bottom: 20, width: 200 }}>
          <p>{user?.email}</p>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </aside>
      <main style={{ flex: 1, padding: 20 }}>
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
