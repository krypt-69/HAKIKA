import React from 'react';
import { Order, OrderItem } from '../types/order';

interface Props {
  order: Order;
}

const OrderPreviewCard: React.FC<Props> = ({ order }) => {
  return (
    <div
      style={{
        backgroundColor: '#fff',
        border: '1px solid #d1d5db',
        borderRadius: 12,
        padding: 12,
        marginTop: 12,
        boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <strong style={{ fontSize: 14 }}>{order.order_number}</strong>
        <span style={{ fontSize: 12, color: '#6b7280' }}>
          KES {order.total_amount}
        </span>
      </div>

      <div style={{ fontSize: 13, color: '#374151', marginBottom: 4 }}>
        <div><strong>Business:</strong> {order.business_name || 'N/A'}</div>
        <div><strong>Customer:</strong> {order.customer_name || order.customer_phone || 'N/A'}</div>
      </div>

      <div style={{ marginTop: 8 }}>
        {order.items.map((item: OrderItem) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 0',
            }}
          >
            {item.thumbnail_url && (
              <img
                src={item.thumbnail_url}
                alt={item.product_name}
                style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 4 }}
              />
            )}
            <span style={{ fontSize: 13, color: '#111827', flex: 1 }}>
              {item.product_name} ×{item.quantity}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderPreviewCard;
