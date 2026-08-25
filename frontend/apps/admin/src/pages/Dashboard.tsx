import React, { useEffect, useState } from 'react'
import { api } from '../api'

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.admin.stats()
      .then(setStats)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  const cards = [
    { label: 'Businesses', value: stats?.businesses ?? 0 },
    { label: 'Orders', value: stats?.orders ?? 0 },
    { label: 'Pending Settlements', value: stats?.pending_settlements ?? 0 },
    { label: 'Open Disputes', value: stats?.open_disputes ?? 0 },
  ];

  return (
    <div>
      <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: 24 }}>Dashboard</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {cards.map(card => (
          <div key={card.label} style={{ background: '#fff', padding: 20, borderRadius: 8, border: '1px solid #e5e7eb' }}>
            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>{card.label}</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
