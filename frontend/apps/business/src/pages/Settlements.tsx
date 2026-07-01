import React, { useEffect, useState } from 'react';
import { useAuth } from '@hakika/auth';

interface Settlement {
  id: string;
  amount: number;
  status: string;
  business_id: string;
  created_at: string;
}

const Settlements: React.FC = () => {
  const { businessId, getClient } = useAuth();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');

  const fetchSettlements = async () => {
    if (!businessId) return;
    try {
      const resp = await fetch('http://localhost:8000/api/v1/settlements', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!resp.ok) throw new Error('Failed to load settlements');
      const data = await resp.json();
      setSettlements(data || []);
    } catch (err: any) { setError(err.message); }
  };

  useEffect(() => { fetchSettlements(); }, [businessId]);

  return (
    <div>
      <h1>Settlements</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {settlements.length === 0 ? (
        <p>No settlements yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
              <th>Amount</th><th>Status</th><th>Date</th>
            </tr>
          </thead>
          <tbody>
            {settlements.map(s => (
              <tr key={s.id} style={{ borderBottom: '1px solid #eee' }}>
                <td>KES {s.amount?.toFixed(2)}</td>
                <td>{s.status}</td>
                <td>{s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Settlements;
