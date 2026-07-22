import { Config } from "@hakika/config";
import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { authenticatedFetch } from '@hakika/auth';
import { api } from '../api';

interface OrderItem {
  id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  thumbnail_url: string | null;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  items: OrderItem[];
}

interface Rider {
  id: string;
  name: string;
  phone: string;
  status: string;
}

const Orders: React.FC = () => {
  const { businessId } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [error, setError] = useState('');
  const [assigningOrder, setAssigningOrder] = useState<string | null>(null);
  const [selectedRider, setSelectedRider] = useState('');
  const [success, setSuccess] = useState('');

  const fetchOrders = async () => {
    if (!businessId) return;
    try {
      const data = await api.orders.listBusiness();
      setOrders(data || []);
    } catch (e: any) { setError(e.message); }
  };

  const fetchRiders = async () => {
    if (!businessId) return;
    try {
      const resp = await authenticatedFetch(`${Config.API_BASE}/riders/${businessId}`);
      if (!resp.ok) throw new Error('Failed to load riders');
      const data = await resp.json();
      setRiders(data || []);
    } catch (e: any) {}
  };

  useEffect(() => {
    fetchOrders();
    fetchRiders();
  }, [businessId]);

  const handleAccept = async (orderId: string) => {
    try {
      await api.orders.accept(orderId);
      setSuccess('Order accepted');
      fetchOrders();
    } catch (e: any) { setError(e.message); }
  };

  const handleAssign = async (orderId: string) => {
    if (!selectedRider) return;
    setError('');
    setSuccess('');
    try {
      const resp = await authenticatedFetch(`${Config.API_BASE}/delivery/orders/${orderId}/assign?rider_id=${selectedRider}`, {
        method: 'PUT',
      });
      if (!resp.ok) throw new Error('Assignment failed');
      setSuccess('Rider assigned');
      setAssigningOrder(null);
      setSelectedRider('');
      fetchOrders();
    } catch (e: any) { setError(e.message); }
  };

  return (
    <div>
      <h1>Orders</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}
      {orders.length === 0 && <p>No orders yet.</p>}
      {orders.map(order => (
        <div key={order.id} style={{ border: '1px solid #ddd', padding: 12, marginBottom: 8 }}>
          <p><strong>{order.order_number}</strong> – {order.status} (KES {order.total_amount})</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {order.items.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {item.thumbnail_url && (
                  <img src={`${item.thumbnail_url}`} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} />
                )}
                <span>{item.product_name} × {item.quantity} (@ KES {item.unit_price})</span>
              </div>
            ))}
          </div>

          {order.status === 'waiting_acceptance' && (
            <button onClick={() => handleAccept(order.id)} style={{ padding: '6px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4 }}>
              Accept
            </button>
          )}

          {(order.status === 'accepted' || order.status === 'preparing' || order.status === 'ready_for_delivery') && (
            <div style={{ marginTop: 8 }}>
              {assigningOrder === order.id ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select value={selectedRider} onChange={e => setSelectedRider(e.target.value)} style={{ padding: 6 }}>
                    <option value="">Select rider</option>
                    {riders.map(r => (
                      <option key={r.id} value={r.id}>{r.name} ({r.phone})</option>
                    ))}
                  </select>
                  <button onClick={() => handleAssign(order.id)} style={{ padding: '6px 12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4 }}>
                    Assign
                  </button>
                  <button onClick={() => { setAssigningOrder(null); setSelectedRider(''); }} style={{ padding: '6px 12px', background: '#ccc', border: 'none', borderRadius: 4 }}>
                    Cancel
                  </button>
                </div>
              ) : (
                <button onClick={() => setAssigningOrder(order.id)} style={{ padding: '6px 12px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 4 }}>
                  Assign Rider
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default Orders;
