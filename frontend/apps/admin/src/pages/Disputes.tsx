import React, { useEffect, useState } from 'react';
import { useAuth } from '@hakika/auth';

const Disputes: React.FC = () => {
  const { getClient } = useAuth();
  const [disputes, setDisputes] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const fetchDisputes = async () => {
    try {
      const resp = await fetch('http://localhost:8000/api/v1/admin/disputes', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await resp.json();
      setDisputes(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => { fetchDisputes(); }, []);

  const handleResolve = async (id: string, resolution: string) => {
    try {
      const resp = await fetch(`http://localhost:8000/api/v1/admin/disputes/${id}/resolve?resolution=${resolution}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!resp.ok) throw new Error('Failed to resolve');
      setMessage(`Dispute resolved (${resolution})`);
      fetchDisputes();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h1>Disputes</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {message && <p style={{ color: 'green' }}>{message}</p>}
      {disputes.length === 0 ? <p>No disputes</p> : (
        disputes.map((d: any) => (
          <div key={d.id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 12, background: '#fff' }}>
            <p><strong>Order:</strong> {d.order_id}</p>
            <p><strong>Reason:</strong> {d.reason}</p>
            <p><strong>Status:</strong> {d.status}</p>
            {d.status === 'pending' && (
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <button onClick={() => handleResolve(d.id, 'resolved_customer')} style={{ padding: '6px 12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4 }}>
                  Resolve (Customer)
                </button>
                <button onClick={() => handleResolve(d.id, 'resolved_business')} style={{ padding: '6px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4 }}>
                  Resolve (Business)
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default Disputes;
