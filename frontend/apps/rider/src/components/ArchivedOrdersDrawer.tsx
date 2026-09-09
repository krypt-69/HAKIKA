import React from 'react';
import { Order } from '../types/order';
import ArchivedOrderCard from './ArchivedOrderCard';

interface Props {
  open: boolean;
  orders: Order[];
  onClose: () => void;
}

const ArchivedOrdersDrawer: React.FC<Props> = ({ open, orders, onClose }) => {
  if (!open) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width: 'min(420px, 90vw)',
      background: '#ffffff',
      boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
      zIndex: 1200,
      padding: '16px 20px',
      overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#111827' }}>Archived Orders</h2>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            fontSize: 24,
            cursor: 'pointer',
            color: '#6b7280',
          }}
        >
          ×
        </button>
      </div>
      {orders.length === 0 ? (
        <p style={{ color: '#9ca3af', textAlign: 'center', padding: '40px 0' }}>No archived orders.</p>
      ) : (
        orders.map(order => (
          <ArchivedOrderCard key={order.id} order={order} />
        ))
      )}
    </div>
  );
};

export default ArchivedOrdersDrawer;
