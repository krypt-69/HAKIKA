import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@hakika/auth';

const API_BASE = "http://localhost:8000/api/v1";

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

const QUEUE_KEY = 'hakika_offline_actions';

const Home: React.FC = () => {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [gpsLat, setGpsLat] = useState('-1.286');
  const [gpsLon, setGpsLon] = useState('36.817');
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const token = localStorage.getItem('token');

  const fetchOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch(`${API_BASE}/delivery/my-orders`, {
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
  }, []);

  useEffect(() => {
    const processQueue = async () => {
      const stored = localStorage.getItem(QUEUE_KEY);
      if (!stored) return;
      const actions = JSON.parse(stored);
      for (const action of actions) {
        try {
          await fetch(action.url, action.options);
        } catch {}
      }
      localStorage.removeItem(QUEUE_KEY);
      fetchOrders();
    };
    window.addEventListener('online', processQueue);
    return () => window.removeEventListener('online', processQueue);
  }, []);

  const getRealGPS = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
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

  const openNavigation = (lat: number, lon: number) => {
    window.open(`https://maps.google.com/maps?daddr=${lat},${lon}`, '_blank');
  };

  const queueAction = (url: string, options: RequestInit) => {
    const stored = localStorage.getItem(QUEUE_KEY);
    const queue = stored ? JSON.parse(stored) : [];
    queue.push({ url, options });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  };

  const handleArrive = async (orderId: string) => {
    setError('');
    setMessage('');
    const url = `${API_BASE}/delivery/orders/${orderId}/arrive?gps_lat=${gpsLat}&gps_lon=${gpsLon}`;
    const options = { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } };
    try {
      if (!navigator.onLine) {
        queueAction(url, options);
        setMessage('Arrival saved offline – will sync when online.');
        return;
      }
      const resp = await fetch(url, options);
      if (!resp.ok) throw new Error('Failed to mark arrival');
      setMessage('Arrival recorded!');
      fetchOrders();
    } catch (err: any) {
      setError(err.message);
      queueAction(url, options);
      setMessage('Arrival saved offline – will sync later.');
    }
  };

  const handleTakePhoto = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>, orderId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setMessage('Uploading evidence...');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadResp = await fetch(`${API_BASE}/delivery/orders/${orderId}/evidence`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      if (!uploadResp.ok) throw new Error('Upload failed');
      const uploadResult = await uploadResp.json();

      // Call attempt endpoint with query parameters
      const params = new URLSearchParams({
        status: 'successful',
        gps_lat: gpsLat,
        gps_lon: gpsLon,
        photo_url: uploadResult.url,
      });
      const attemptResp = await fetch(`${API_BASE}/delivery/orders/${orderId}/attempt?${params}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
      });
            console.error("Attempt error:", await attemptResp.text());
      if (!attemptResp.ok) throw new Error('Attempt update failed');
      setMessage('Evidence uploaded!');
      fetchOrders();
    } catch (err: any) {
      setError(err.message);
    }
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
      <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={getRealGPS} style={{ padding: '8px 16px' }}>📍 Get GPS</button>
        <span>Lat: {gpsLat} Lon: {gpsLon}</span>
      </div>
      {loading && <p>Loading...</p>}
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
          <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => openNavigation(-1.286, 36.817)} style={{ padding: '8px 12px', background: '#f59e0b', border: 'none', borderRadius: 6, color: '#fff' }}>
              🧭 Navigate
            </button>
            {order.status === 'out_for_delivery' && (
              <button onClick={() => handleArrive(order.id)}
                style={{ padding: '12px 20px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16 }}>
                Mark as Arrived
              </button>
            )}
            {order.status === 'arrived' && (
              <>
                <p style={{ color: '#16a34a' }}>Waiting for customer confirmation...</p>
                <button onClick={handleTakePhoto} style={{ padding: '8px 12px', background: '#8b5cf6', border: 'none', borderRadius: 6, color: '#fff' }}>
                  📷 Take Photo
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" capture="environment"
                  onChange={(e) => handlePhotoCapture(e, order.id)} style={{ display: 'none' }} />
              </>
            )}
          </div>
        </div>
      ))}
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
