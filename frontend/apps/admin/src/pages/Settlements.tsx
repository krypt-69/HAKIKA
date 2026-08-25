import React, { useEffect, useState } from 'react';
import { api } from '../api';

interface Settlement {
  id: string;
  business_id: string;
  amount: number;
  status: string;
  retry_count: number;
  created_at: string;
}

const SettlementsPage: React.FC = () => {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchSettlements = async () => {
    try {
      setLoading(true);
      const data = await api.admin.settlements();
      setSettlements(data || []);
      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSettlements(); }, []);

  const handleProcess = async (id: string) => {
    setProcessingId(id);
    try {
      await api.admin.processSettlement(id);
      setSuccess('Settlement processed successfully.');
      fetchSettlements();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>;

  return (
    <div>
      <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: 24 }}>Settlements</h1>
      {success && <div style={{ background: '#dcfce7', color: '#16a34a', padding: '10px 16px', borderRadius: 6, marginBottom: 16 }}>{success}</div>}
      {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 16px', borderRadius: 6, marginBottom: 16 }}>{error}</div>}

      {settlements.length === 0 ? (
        <p>No pending settlements.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
              <th style={{ padding: 12 }}>Business</th>
              <th style={{ padding: 12 }}>Amount</th>
              <th style={{ padding: 12 }}>Status</th>
              <th style={{ padding: 12 }}>Retries</th>
              <th style={{ padding: 12 }}>Date</th>
              <th style={{ padding: 12 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {settlements.map(s => (
              <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: 12, fontSize: '0.875rem' }}>{s.business_id?.slice(0, 8)}…</td>
                <td style={{ padding: 12 }}>KES {s.amount?.toFixed(2)}</td>
                <td style={{ padding: 12 }}>{s.status}</td>
                <td style={{ padding: 12 }}>{s.retry_count}</td>
                <td style={{ padding: 12, fontSize: '0.875rem' }}>{s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}</td>
                <td style={{ padding: 12 }}>
                  <button
                    onClick={() => handleProcess(s.id)}
                    disabled={processingId === s.id}
                    style={{ padding: '4px 10px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4 }}
                  >
                    {processingId === s.id ? 'Processing...' : 'Process'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default SettlementsPage;
