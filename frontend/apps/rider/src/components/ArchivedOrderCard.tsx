import React from 'react';
import { Order } from '../types/order';

interface Props {
  order: Order;
}

const ArchivedOrderCard: React.FC<Props> = ({ order }) => {
  return (
    <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280' }}>Invoice Ref</div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#111827' }}>{order.order_number}</h3>
        </div>
        <span style={{
          backgroundColor: order.status === 'paid' ? '#d1fae5' : '#f3f4f6',
          color: order.status === 'paid' ? '#065f46' : '#374151',
          padding: '4px 10px', borderRadius: 9999, fontSize: 12, fontWeight: 700, textTransform: 'capitalize'
        }}>
          {order.status.replace(/_/g, ' ')}
        </span>
      </div>

      {order.business_name && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px solid #f3f4f6' }}>
          {order.business_logo && (
            <img src={order.business_logo} alt="Business Logo" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6 }} />
          )}
          <div>
            <span style={{ fontSize: 11, color: '#9ca3af', display: 'block' }}>Pickup Point</span>
            <span style={{ fontWeight: 700, color: '#1f2937', fontSize: 14 }}>{order.business_name}</span>
          </div>
        </div>
      )}

      <div style={{ backgroundColor: '#f9fafb', padding: 12, borderRadius: 8, margin: '12px 0' }}>
        {order.items.map((item) => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
            {item.thumbnail_url && (
              <img src={item.thumbnail_url} alt="Item" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4 }} />
            )}
            <span style={{ fontSize: 14, color: '#4b5563', fontWeight: 500 }}>
              {item.product_name} <strong style={{ color: '#111827' }}>×{item.quantity}</strong>
            </span>
            <span style={{ marginLeft: 'auto', fontWeight: 700, color: '#111827' }}>
              KES {item.unit_price * item.quantity}
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: 11, color: '#9ca3af', display: 'block' }}>Customer</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>{order.customer_name || 'Anonymous'}</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: 11, color: '#9ca3af', display: 'block' }}>Total</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#065f46' }}>KES {order.total_amount}</span>
        </div>
      </div>
    </div>
  );
};

export default ArchivedOrderCard;
