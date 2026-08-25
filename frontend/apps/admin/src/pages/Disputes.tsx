import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

interface Dispute {
  id: string;
  order_id: string;
  order_number: string;
  business_name: string;
  customer_phone: string;
  reason: string;
  status: string;
  resolution: string | null;
  created_at: string;
  resolved_at: string | null;
}

const Disputes: React.FC = () => {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState<{ id: string; resolution: string } | null>(null);

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      const data = await api.admin.disputes();
      setDisputes(data || []);
      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDisputes(); }, []);

  const handleResolve = async (id: string, resolution: string) => {
    setResolvingId(id);
    try {
      await api.admin.resolveDispute(id, resolution);
      setSuccess(`Dispute resolved in favor of ${resolution === 'resolved_customer' ? 'customer' : 'business'}.`);
      fetchDisputes();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setResolvingId(null);
      setShowConfirm(null);
    }
  };

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>;

  return (
    <div>
      <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: 24 }}>Disputes</h1>
      {success && <div style={{ background: '#dcfce7', color: '#16a34a', padding: '10px 16px', borderRadius: 6, marginBottom: 16 }}>{success}</div>}
      {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 16px', borderRadius: 6, marginBottom: 16 }}>{error}</div>}

      {disputes.length === 0 ? (
        <p>No disputes found.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
              <th style={{ padding: 12 }}>Order</th>
              <th style={{ padding: 12 }}>Business</th>
              <th style={{ padding: 12 }}>Customer</th>
              <th style={{ padding: 12 }}>Reason</th>
              <th style={{ padding: 12 }}>Status</th>
              <th style={{ padding: 12 }}>Date</th>
              <th style={{ padding: 12 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {disputes.map(d => (
              <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: 12 }}>
                  <Link to={`/orders/${d.order_id}`} style={{ color: '#2563eb' }}>{d.order_number}</Link>
                </td>
                <td style={{ padding: 12 }}>{d.business_name}</td>
                <td style={{ padding: 12 }}>{d.customer_phone}</td>
                <td style={{ padding: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.reason}</td>
                <td style={{ padding: 12 }}>{d.status}</td>
                <td style={{ padding: 12, fontSize: '0.875rem' }}>{new Date(d.created_at).toLocaleDateString()}</td>
                <td style={{ padding: 12 }}>
                  {d.status === 'pending' || d.status === 'under_review' ? (
                    <>
                      <button
                        onClick={() => setShowConfirm({ id: d.id, resolution: 'resolved_customer' })}
                        style={{ marginRight: 6, padding: '4px 10px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4 }}
                        disabled={resolvingId === d.id}
                      >
                        For Customer
                      </button>
                      <button
                        onClick={() => setShowConfirm({ id: d.id, resolution: 'resolved_business' })}
                        style={{ padding: '4px 10px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4 }}
                        disabled={resolvingId === d.id}
                      >
                        For Business
                      </button>
                    </>
                  ) : (
                    <span style={{ color: '#6b7280' }}>{d.resolution || 'Resolved'}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{ background: '#fff', padding: 24, borderRadius: 8, maxWidth: 400, width: '90%' }}>
            <h3>Confirm Resolution</h3>
            <p>Resolve this dispute in favor of the <strong>{showConfirm.resolution === 'resolved_customer' ? 'customer' : 'business'}</strong>?</p>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                onClick={() => handleResolve(showConfirm.id, showConfirm.resolution)}
                style={{ flex: 1, padding: 12, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6 }}
              >
                Confirm
              </button>
              <button
                onClick={() => setShowConfirm(null)}
                style={{ padding: '12px 20px', background: '#ddd', border: 'none', borderRadius: 6 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Disputes;
