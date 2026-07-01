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
  customer_phone: string | null;
  items: OrderItem[];
}

const Home: React.FC = () => {
  const { getClient, user, logout } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [gpsLat, setGpsLat] = useState('-1.286');
  const [gpsLon, setGpsLon] = useState('36.817');
  const [photoUrl, setPhotoUrl] = useState('');
  const [message, setMessage] = useState('');

  const token = localStorage.getItem('token');

  const fetchOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('http://localhost:8000/api/v1/delivery/my-orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!resp.ok) throw new Error('Failed to load deliveries');
      const data = await resp.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 15000);
    return () => clearInterval(interval);
  }, [token]);

  const getRealGPS = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported on this device');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGpsLat(String(pos.coords.latitude));
        setGpsLon(String(pos.coords.longitude));
        setError('');
      },
      () => setError('Location access denied. Using manual coordinates.')
    );
  };

  const handleArrive = async (orderId: string) => {
    setError('');
    setMessage('');
    try {
      const resp = await fetch(`http://localhost:8000/api/v1/delivery/orders/${orderId}/arrive?gps_lat=${gpsLat}&gps_lon=${gpsLon}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!resp.ok) throw new Error('Failed to mark arrival');
      setMessage('Arrival recorded!');
      fetchOrders();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPhotoUrl(URL.createObjectURL(file));
  };

  const activeOrders = orders.filter(o => ['out_for_delivery', 'arrived'].includes(o.status));
  const pastOrders = orders.filter(o => !['out_for_delivery', 'arrived'].includes(o.status));

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>My Deliveries</h1>
        <div>
          <span style={{ fontSize: 14, color: '#666' }}>{user?.email}</span>
          <button onClick={logout} style={{ marginLeft: 12, padding: '6px 12px' }}>Logout</button>
        </div>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {message && <p style={{ color: 'green' }}>{message}</p>}

      <div style={{ marginBottom: 12 }}>
        <button onClick={getRealGPS} style={{ padding: '8px 16px', marginRight: 8 }}>📍 Get GPS</button>
        <span>Lat: {gpsLat} Lon: {gpsLon}</span>
      </div>

      {loading && <p>Loading...</p>}

      {/* Active deliveries */}
      <h2 style={{ marginTop: 20 }}>Active ({activeOrders.length})</h2>
      {activeOrders.length === 0 && !loading && <p style={{ color: '#999' }}>No active deliveries</p>}
      {activeOrders.map(order => (
        <div key={order.id} style={{ border: '1px solid #2563eb', borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <strong>{order.order_number}</strong>
            <span style={{ color: '#2563eb', fontWeight: 'bold' }}>{order.status.replace(/_/g, ' ')}</span>
          </div>
          <div style={{ marginTop: 8 }}>
            {order.items.map(item => (
              <div key={item.id}>{item.product_name} × {item.quantity}</div>
            ))}
          </div>
          <p style={{ fontWeight: 'bold' }}>KES {order.total_amount}</p>
          {order.customer_phone && <p style={{ color: '#666' }}>📞 {order.customer_phone}</p>}
          <div style={{ marginTop: 8 }}>
            {order.status === 'out_for_delivery' && (
              <button onClick={() => handleArrive(order.id)}
                style={{ width: '100%', padding: 12, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16 }}>
                Mark as Arrived
              </button>
            )}
            {order.status === 'arrived' && (
              <div>
                <p style={{ color: '#16a34a' }}>Waiting for customer confirmation...</p>
                <div style={{ marginTop: 8 }}>
                  <input type="file" accept="image/*" capture="environment" onChange={handlePhotoCapture} />
                  {photoUrl && <img src={photoUrl} alt="Evidence" style={{ width: 100, height: 100, marginTop: 8, borderRadius: 4 }} />}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Past deliveries */}
      {pastOrders.length > 0 && (
        <>
          <h2 style={{ marginTop: 30 }}>Past ({pastOrders.length})</h2>
          {pastOrders.map(order => (
            <div key={order.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, marginBottom: 8, opacity: 0.7 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>{order.order_number}</strong>
                <span>{order.status.replace(/_/g, ' ')}</span>
              </div>
              <p>KES {order.total_amount}</p>
            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default Home;
