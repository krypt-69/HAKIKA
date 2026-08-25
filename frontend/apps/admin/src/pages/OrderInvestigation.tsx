import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';

const OrderInvestigation: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.admin.order(id)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;
  if (error) return <div style={{ padding: 24, color: '#dc2626' }}>{error}</div>;
  if (!data) return <div style={{ padding: 24 }}>Order not found.</div>;

  const { order, customer, business, rider, payment, settlement, evidence, timeline, dispute } = data;

  // Build a map of evidence photos keyed by delivery attempt ID for inline display
  const evidenceByEvent: Record<string, any[]> = {};
  if (evidence) {
    evidence.forEach((ev: any) => {
      const key = ev.delivery_attempt_id || 'unknown';
      if (!evidenceByEvent[key]) evidenceByEvent[key] = [];
      evidenceByEvent[key].push(ev);
    });
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Sticky Header */}
      <div style={{
        position: 'sticky', top: 0, background: '#f8fafc', padding: '16px 0',
        borderBottom: '1px solid #e5e7eb', marginBottom: 24, zIndex: 10
      }}>
        <Link to="/businesses" style={{ color: '#2563eb', fontSize: '0.875rem' }}>← Back</Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{order?.order_number}</h1>
          <span style={{
            background: '#111', color: '#fff', padding: '4px 14px', borderRadius: 12,
            fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase'
          }}>
            {order?.status}
          </span>
        </div>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: 4 }}>
          Created {order?.created_at ? new Date(order.created_at).toLocaleString() : '—'} · KES {order?.total_amount?.toFixed(2)}
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        <ActorCard title="Customer">
          <p>{customer?.phone_original || 'No phone'}</p>
          <p style={{ color: '#6b7280', fontSize: '0.8rem' }}>Trust {customer?.trust_score?.toFixed(0)}%</p>
        </ActorCard>
        <ActorCard title="Business">
          <p>{business?.name || 'Unknown'}</p>
          <p style={{ color: '#6b7280', fontSize: '0.8rem' }}>
            {business?.payment_model === 'credit' ? 'Credit' : 'PAYG'}
            {business?.collect_payment_before_delivery ? ' · Prepaid' : ''}
          </p>
        </ActorCard>
        <ActorCard title="Rider">
          {rider ? <><p>{rider.name}</p><p style={{ color: '#6b7280', fontSize: '0.8rem' }}>{rider.phone} · {rider.status}</p></> : <p style={{ color: '#6b7280' }}>No rider assigned</p>}
        </ActorCard>
        <ActorCard title="Payment">
          {payment ? <><p>{payment.provider} · {payment.status}</p><p style={{ color: '#6b7280', fontSize: '0.8rem' }}>KES {payment.amount?.toFixed(2)}</p></> : <p style={{ color: '#6b7280' }}>Not paid</p>}
        </ActorCard>
      </div>

      {/* Settlement */}
      {settlement && (
        <ActorCard title="Settlement" style={{ marginBottom: 24 }}>
          <p>{settlement.status} · KES {settlement.amount?.toFixed(2)} · {settlement.retry_count} retries</p>
        </ActorCard>
      )}

      {/* Dispute */}
      {dispute && (
        <ActorCard title="Dispute" style={{ marginBottom: 24, borderColor: '#dc2626' }}>
          <p style={{ fontWeight: 600 }}>Status: {dispute.status}</p>
          <p style={{ fontSize: '0.9rem', marginTop: 4 }}>{dispute.reason}</p>
          {dispute.resolution && <p style={{ fontSize: '0.9rem', color: '#6b7280', marginTop: 4 }}>Resolution: {dispute.resolution}</p>}
        </ActorCard>
      )}

      {/* Timeline with inline evidence */}
      <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 16 }}>Timeline</h2>
      {(!timeline || timeline.length === 0) ? <p style={{ color: '#6b7280' }}>No events recorded.</p> : (
        <div style={{ borderLeft: '2px solid #e5e7eb', paddingLeft: 20 }}>
          {timeline.map((ev: any, i: number) => {
            const evPhotos = evidence?.filter((e: any) => e.delivery_attempt_id && ev.event?.toLowerCase().includes('arrived') || ev.event?.toLowerCase().includes('evidence')) || [];
            return (
              <div key={i} style={{ marginBottom: 20 }}>
                <p style={{ fontWeight: 600 }}>{ev.event}</p>
                <p style={{ color: '#6b7280', fontSize: '0.8rem' }}>{ev.at ? new Date(ev.at).toLocaleString() : '—'}</p>
                {/* Show evidence photos attached to this event */}
                {evPhotos.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                    {evPhotos.map((photo: any) => (
                      <div key={photo.id} style={{ width: 120 }}>
                        <img src={photo.url} alt="Evidence" style={{ width: '100%', borderRadius: 4, border: '1px solid #e5e7eb' }} />
                        <p style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{new Date(photo.created_at).toLocaleTimeString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Reusable card for actors
const ActorCard: React.FC<{ title: string; children: React.ReactNode; style?: React.CSSProperties }> = ({ title, children, style }) => (
  <div style={{
    background: '#fff', padding: 16, borderRadius: 8,
    border: '1px solid #e5e7eb', ...style
  }}>
    <h3 style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4 }}>{title}</h3>
    {children}
  </div>
);

export default OrderInvestigation;
