import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

const Businesses: React.FC = () => {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchBusinesses = () => {
    setLoading(true);
    api.admin.businesses()
      .then(setBusinesses)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchBusinesses(); }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  return (
    <div>
      <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: 24 }}>Businesses</h1>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
            <th style={{ padding: 12 }}>Name</th>
            <th style={{ padding: 12 }}>Model</th>
            <th style={{ padding: 12 }}>Credit Balance</th>
            <th style={{ padding: 12 }}>Active</th>
            <th style={{ padding: 12 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {businesses.map(b => (
            <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: 12 }}>{b.name}</td>
              <td style={{ padding: 12 }}>{b.payment_model}</td>
              <td style={{ padding: 12 }}>KES {b.credit_balance?.toFixed(2)}</td>
              <td style={{ padding: 12 }}>{b.is_active ? 'Yes' : 'No'}</td>
              <td style={{ padding: 12 }}>
                <Link to={`/businesses/${b.id}`} style={{ color: '#2563eb' }}>View</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Businesses;
