import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'

const BusinessDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [business, setBusiness] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [creditOrders, setCreditOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.admin.business(id),
      api.admin.businessOrders(id),
      api.admin.businessCreditOrders(id),
    ])
      .then(([biz, ords, creds]) => {
        setBusiness(biz);
        setOrders(ords || []);
        setCreditOrders(creds || []);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSuspend = async () => {
    if (!id) return;
    try {
      await api.admin.suspendBusiness(id);
      setBusiness({ ...business, is_active: false });
    } catch (e: any) { setError(e.message); }
  };

  const handleActivate = async () => {
    if (!id) return;
    try {
      await api.admin.activateBusiness(id);
      setBusiness({ ...business, is_active: true });
    } catch (e: any) { setError(e.message); }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;
  if (!business) return <div>Business not found.</div>;

  return (
    <div>
      <Link to="/businesses" style={{ color: '#2563eb' }}>← Back to Businesses</Link>
      <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginTop: 16 }}>{business.name}</h1>

      <div style={{ background: '#fff', padding: 20, borderRadius: 8, border: '1px solid #e5e7eb', marginTop: 16 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Details</h2>
        <p><strong>Payment Model:</strong> {business.payment_model}</p>
        <p><strong>Credit Balance:</strong> KES {business.credit_balance?.toFixed(2)}</p>
        <p><strong>Remaining Volume:</strong> KES {business.remaining_credit_volume?.toFixed(2)}</p>
        <p><strong>Prepaid Dispatch:</strong> {business.collect_payment_before_delivery ? 'Yes' : 'No'}</p>
        <p><strong>Channel ID:</strong> {business.channel_id || 'N/A'}</p>
        <p><strong>Active:</strong> {business.is_active ? 'Yes' : 'No'}</p>
        <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
          {business.is_active ? (
            <button onClick={handleSuspend} style={{ padding: '8px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4 }}>
              Suspend
            </button>
          ) : (
            <button onClick={handleActivate} style={{ padding: '8px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4 }}>
              Activate
            </button>
          )}
        </div>
      </div>

      <div style={{ background: '#fff', padding: 20, borderRadius: 8, border: '1px solid #e5e7eb', marginTop: 16 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 12 }}>Recent Orders</h2>
        {orders.length === 0 ? <p>No orders yet.</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: 8 }}>Order #</th>
                <th style={{ padding: 8 }}>Status</th>
                <th style={{ padding: 8 }}>Total</th>
                <th style={{ padding: 8 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 10).map(o => (
                <tr key={o.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 8 }}>{o.order_number}</td>
                  <td style={{ padding: 8 }}>{o.status}</td>
                  <td style={{ padding: 8 }}>KES {o.total_amount?.toFixed(2)}</td>
                  <td style={{ padding: 8 }}>
                    <Link to={`/orders/${o.id}`} style={{ color: '#2563eb' }}>Investigate</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ background: '#fff', padding: 20, borderRadius: 8, border: '1px solid #e5e7eb', marginTop: 16 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 12 }}>Credit Purchases</h2>
        {creditOrders.length === 0 ? <p>No purchases yet.</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: 8 }}>Date</th>
                <th style={{ padding: 8 }}>Amount Paid</th>
                <th style={{ padding: 8 }}>Credit Received</th>
                <th style={{ padding: 8 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {creditOrders.map(co => (
                <tr key={co.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 8 }}>{new Date(co.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: 8 }}>KES {co.amount_paid?.toFixed(2)}</td>
                  <td style={{ padding: 8 }}>KES {co.credit_received?.toFixed(2)}</td>
                  <td style={{ padding: 8 }}>{co.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default BusinessDetail;
