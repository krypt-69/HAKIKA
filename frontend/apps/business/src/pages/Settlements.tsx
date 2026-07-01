import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { api } from '../api';

const Settlements: React.FC = () => {
  const { businessId } = useAuth();
  const [settlements, setSettlements] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!businessId) return;
    api.settlements.list().then(setSettlements).catch((e: any) => setError(e.message));
  }, [businessId]);

  return (
    <div>
      <h1>Settlements</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {settlements.length === 0 && <p>No settlements yet.</p>}
      {settlements.map(s => (
        <div key={s.id} style={{ border: '1px solid #ddd', padding: 8, marginBottom: 4 }}>
          KES {s.amount?.toFixed(2)} – {s.status}
        </div>
      ))}
    </div>
  );
};

export default Settlements;
