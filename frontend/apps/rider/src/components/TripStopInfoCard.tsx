import React from 'react';
import type { Order } from '../types/order';
import type { TripStop } from '../services/tripBuilder';

interface Props {
  stop: TripStop;
  orders: Order[];
  onCall: () => void;
  onNavigate: () => void;
}

const TripStopInfoCard: React.FC<Props> = ({ stop, orders, onCall, onNavigate }) => {
  const phone = stop.type === 'delivery'
    ? orders.find(o => stop.orderIds.includes(o.id))?.customer_phone || null
    : null;

  return (
    <div style={{ backgroundColor: '#fff', border: '1px solid #d1d5db', borderRadius: 12, padding: 16, marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <strong style={{ fontSize: 16, color: '#111827' }}>
          {stop.type === 'pickup' ? 'PICK UP' : 'DELIVERY'} — {stop.label}
        </strong>
        <span style={{ fontSize: 12, color: '#6b7280' }}>
          {stop.orderIds.length} order{stop.orderIds.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ marginTop: 8 }}>
        {orders.map(order => (
          <div key={order.id} style={{ padding: '8px 0', borderTop: '1px solid #f3f4f6' }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{order.order_number}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {order.items.slice(0, 2).map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {item.thumbnail_url ? (
                    <img src={item.thumbnail_url} alt={item.product_name} style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 28, height: 28, borderRadius: 4, background: '#e5e7eb' }} />
                  )}
                  <span style={{ fontSize: 12 }}>{item.product_name} ×{item.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {orders.length === 0 && <p style={{ fontSize: 12, color: '#9ca3af' }}>No order details</p>}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        {phone ? (
          <a
            href={`tel:${phone}`}
            onClick={onCall}
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '10px 14px',
              backgroundColor: '#2563eb',
              color: '#fff',
              borderRadius: 8,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Call
          </a>
        ) : (
          <button disabled style={{ flex: 1, padding: '10px 14px', backgroundColor: '#d1d5db', color: '#6b7280', border: 'none', borderRadius: 8, fontWeight: 700 }}>
            Phone unavailable
          </button>
        )}
        <button
          onClick={onNavigate}
          style={{
            flex: 1,
            padding: '10px 14px',
            backgroundColor: '#16a34a',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Navigate
        </button>
      </div>
    </div>
  );
};

export default TripStopInfoCard;
