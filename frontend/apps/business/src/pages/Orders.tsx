import React, { useEffect, useState } from 'react';
import { useAuth } from '@hakika/auth';

interface OrderItem {
  id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  subtotal: number;
  delivery_fee: number;
  total_amount: number;
  customer_id: string;
  business_id: string;
  items: OrderItem[];
  created_at: string;
}

interface Rider {
  id: string;
  name: string;
  status: string;
}

const STATUS_FLOW = [
  'waiting_acceptance',
  'accepted',
  'preparing',
  'ready_for_delivery',
  'out_for_delivery',
  'arrived',
  'customer_confirmed_delivery',
  'payment_pending',
  'paid',
  'completed',
];

const Orders: React.FC = () => {
  const { getClient } = useAuth();
  const client = getClient();
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedBusiness, setSelectedBusiness] = useState<string>('');
  const [riders, setRiders] = useState<Rider[]>([]);
  const [assigningOrder, setAssigningOrder] = useState<string | null>(null);
  const [selectedRider, setSelectedRider] = useState<string>('');

  const fetchOrders = async () => {
    try {
      const data = await client.orders.listBusiness() as any[];
      setOrders(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleAccept = async (orderId: string) => {
    setError('');
    setSuccess('');
    try {
      await client.orders.accept(orderId);
      setSuccess(`Order accepted`);
      fetchOrders();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCancel = async (orderId: string) => {
    setError('');
    setSuccess('');
    try {
      await client.orders.cancel(orderId);
      setSuccess(`Order cancelled`);
      fetchOrders();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAssignRider = async (orderId: string) => {
    if (!selectedRider) return;
    setError('');
    setSuccess('');
    try {
      await client.delivery.assignRider(orderId, selectedRider);
      setSuccess(`Rider assigned`);
      setAssigningOrder(null);
      setSelectedRider('');
      fetchOrders();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadRiders = async (businessId: string) => {
    try {
      const data = await client.riders.listByBusiness(businessId) as any[];
      setRiders(data || []);
    } catch {
      setRiders([]);
    }
  };

  const openAssign = (businessId: string, orderId: string) => {
    loadRiders(businessId);
    setAssigningOrder(orderId);
    setSelectedRider('');
  };

  const statusColor = (status: string) => {
    if (['paid', 'completed'].includes(status)) return 'green';
    if (['cancelled', 'delivery_failed'].includes(status)) return 'red';
    if (['out_for_delivery', 'arrived'].includes(status)) return 'blue';
    return 'orange';
  };

  // Group orders by status
  const grouped: Record<string, Order[]> = {};
  for (const order of orders) {
    const s = order.status;
    if (!grouped[s]) grouped[s] = [];
    grouped[s].push(order);
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Orders</h1>
        <button onClick={fetchOrders}>Refresh</button>
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}

      {Object.keys(grouped).length === 0 ? (
        <p>No orders yet.</p>
      ) : (
        STATUS_FLOW.filter(s => grouped[s]).map(status => (
          <div key={status} style={{ marginBottom: 30 }}>
            <h3 style={{ color: statusColor(status) }}>{status.replace(/_/g, ' ').toUpperCase()} ({grouped[status].length})</h3>
            {grouped[status].map(order => (
              <div key={order.id} style={{ border: '1px solid #ddd', padding: 12, marginBottom: 10, borderRadius: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{order.order_number}</strong>
                  <span>KES {order.total_amount}</span>
                </div>
                <div style={{ marginTop: 8 }}>
                  {order.items.map(item => (
                    <span key={item.id}>{item.product_name} × {item.quantity} (@ KES {item.unit_price}) </span>
                  ))}
                </div>
                <div style={{ marginTop: 8, fontSize: '0.9em', color: '#666' }}>
                  Created: {new Date(order.created_at).toLocaleString()}
                </div>
                {status === 'waiting_acceptance' && (
                  <div style={{ marginTop: 8 }}>
                    <button onClick={() => handleAccept(order.id)} style={{ marginRight: 8 }}>Accept</button>
                    <button onClick={() => handleCancel(order.id)} style={{ color: 'red' }}>Reject</button>
                  </div>
                )}
                {(status === 'accepted' || status === 'preparing' || status === 'ready_for_delivery') && (
                  <div style={{ marginTop: 8 }}>
                    {assigningOrder === order.id ? (
                      <div>
                        <select value={selectedRider} onChange={e => setSelectedRider(e.target.value)}>
                          <option value="">Select rider</option>
                          {riders.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                        <button onClick={() => handleAssignRider(order.id)} style={{ marginLeft: 8 }}>Assign</button>
                        <button onClick={() => setAssigningOrder(null)} style={{ marginLeft: 8, color: 'red' }}>Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => openAssign(order.business_id, order.id)}>Assign Rider</button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
};

export default Orders;
