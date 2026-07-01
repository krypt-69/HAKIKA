import React from 'react';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => (
  <div>
    <h1>Admin Dashboard</h1>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginTop: 20 }}>
      <Link to="/businesses" style={{ padding: 20, background: '#fff', borderRadius: 8, textDecoration: 'none', color: '#1e1b4b', border: '1px solid #e2e8f0' }}>
        <h3>Businesses</h3>
        <p style={{ color: '#64748b' }}>Manage & suspend</p>
      </Link>
      <Link to="/disputes" style={{ padding: 20, background: '#fff', borderRadius: 8, textDecoration: 'none', color: '#1e1b4b', border: '1px solid #e2e8f0' }}>
        <h3>Disputes</h3>
        <p style={{ color: '#64748b' }}>Resolve issues</p>
      </Link>
      <Link to="/settlements" style={{ padding: 20, background: '#fff', borderRadius: 8, textDecoration: 'none', color: '#1e1b4b', border: '1px solid #e2e8f0' }}>
        <h3>Settlements</h3>
        <p style={{ color: '#64748b' }}>Process payouts</p>
      </Link>
      <Link to="/payments" style={{ padding: 20, background: '#fff', borderRadius: 8, textDecoration: 'none', color: '#1e1b4b', border: '1px solid #e2e8f0' }}>
        <h3>Payments</h3>
        <p style={{ color: '#64748b' }}>Monitor transactions</p>
      </Link>
      <Link to="/trust" style={{ padding: 20, background: '#fff', borderRadius: 8, textDecoration: 'none', color: '#1e1b4b', border: '1px solid #e2e8f0' }}>
        <h3>Trust Scores</h3>
        <p style={{ color: '#64748b' }}>Monitor reputation</p>
      </Link>
      <Link to="/health" style={{ padding: 20, background: '#fff', borderRadius: 8, textDecoration: 'none', color: '#1e1b4b', border: '1px solid #e2e8f0' }}>
        <h3>System Health</h3>
        <p style={{ color: '#64748b' }}>API, DB, Redis</p>
      </Link>
    </div>
  </div>
);

export default Dashboard;
