import React, { useEffect, useState } from 'react';
import { useAuth } from '@hakika/auth';

const Settlements: React.FC = () => {
  const { getClient } = useAuth();
  const [settlements, setSettlements] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const fetchSettlements = async () => {
    try {
      const resp = await fetch('http://localhost:8000/api/v1/admin/settlements', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await resp.json();
      setSettlements(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => { fetchSettlements(); }, []);

  const handleProcess = async (id: string) => {
    try {
      const resp = await fetch(`http://localhost:8000/api/v1/admin/settlements/${id}/process`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!resp.ok) throw new Error('Failed to process');
      setMessage('Settlement processed');
      fetchSettlements();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h1>Settlements</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {message && <p style={{ color: 'green' }}>{message}</p>}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 20 }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
            <th>Amount</th>
            <th>Status</th>
            <th>Retries</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {settlements.map((s: any) => (
            <tr key={s.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td>KES {s.amount}</td>
              <td>{s.status}</td>
              <td>{s.retry_count}</td>
              <td>
                {s.status === 'pending' && (
                  <button onClick={() => handleProcess(s.id)} style={{ padding: '4px 12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4 }}>
                    Process
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Settlements;
