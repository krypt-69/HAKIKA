import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';

interface Settlement {
  id: string;
  amount: number;
  status: string;
  business_id: string;
  created_at: string;
}

const Settlements: React.FC = () => {
  const { businessId } = useAuth();
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
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => { fetchSettlements(); }, [businessId]);

  return (
    <div>
      <h1>Settlements</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {settlements.length === 0 && !error && <p>No settlements yet.</p>}
      {settlements.map(s => (
        <div key={s.id} style={{ border: '1px solid #ddd', padding: 12, marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>KES {s.amount?.toFixed(2)}</span>
            <span style={{
              color: s.status === 'completed' ? 'green' : s.status === 'pending' ? 'orange' : 'red',
              fontWeight: 'bold'
            }}>{s.status}</span>
          </div>
          <p style={{ fontSize: '0.9em', color: '#666' }}>
            {s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}
          </p>
        </div>
      ))}
    </div>
  );
};

export default Settlements;
