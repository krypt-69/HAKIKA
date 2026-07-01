import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { api } from '../api';

const Orders: React.FC = () => {
  const { businessId } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [error, setError] = useState('');

  const fetchOrders = () => {
    if (!businessId) return;
    api.orders.listBusiness().then(setOrders).catch((e: any) => setError(e.message));
  };

  useEffect(() => { fetchOrders(); }, [businessId]);

  const handleAccept = async (orderId: string) => {
    try {
      await api.orders.accept(orderId);
      fetchOrders();
    } catch (e: any) { setError(e.message); }
  };

  return (
    <div>
      <h1>Orders</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {orders.length === 0 && <p>No orders yet.</p>}
      {orders.map(order => (
        <div key={order.id} style={{ border: '1px solid #ddd', padding: 12, marginBottom: 8 }}>
          <p><strong>{order.order_number}</strong> – {order.status} (KES {order.total_amount})</p>
          <p>{order.items?.map((i: any) => `${i.product_name} x${i.quantity}`).join(', ')}</p>
          {order.status === 'waiting_acceptance' && (
            <button onClick={() => handleAccept(order.id)}>Accept</button>
          )}
        </div>
      ))}
    </div>
  );
};

export default Orders;
