import React, { useEffect, useState } from 'react';
import { useAuth } from '@hakika/auth';

const Businesses: React.FC = () => {
  const { getClient } = useAuth();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const client = getClient();

  const fetchBusinesses = async () => {
    try {
      const resp = await fetch('http://localhost:8000/api/v1/businesses', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await resp.json();
      setBusinesses(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => { fetchBusinesses(); }, []);

  const handleSuspend = async (id: string) => {
    try {
      const resp = await fetch(`http://localhost:8000/api/v1/admin/businesses/${id}/suspend`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!resp.ok) throw new Error('Failed to suspend');
      setMessage('Business suspended');
      fetchBusinesses();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h1>Businesses</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {message && <p style={{ color: 'green' }}>{message}</p>}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 20 }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
            <th>Name</th>
            <th>Trust</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {businesses.map((b: any) => (
            <tr key={b.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td>{b.name}</td>
              <td>{b.trust_score?.toFixed(0)}%</td>
              <td>
                <button onClick={() => handleSuspend(b.id)} style={{ padding: '4px 12px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4 }}>
                  Suspend
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Businesses;
