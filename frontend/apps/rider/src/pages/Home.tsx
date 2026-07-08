import React, { useEffect, useState, useRef } from 'react';
import { useAuth, authenticatedFetch } from '@hakika/auth';

const API_BASE = "http://localhost:8000/api/v1";

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
  subtotal: number;
  delivery_fee: number;
  total_amount: number;
  customer_id: string;
  business_id: string;
  customer_phone: string | null;
  customer_name: string | null;
  business_name: string | null;
  business_logo: string | null;
  pickup_location?: { lat: any; lon: any } | null;
  delivery_location?: { lat: any; lon: any } | null;
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
  const [travelMode, setTravelMode] = useState<'driving' | 'two_wheeled'>('driving');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await authenticatedFetch(`${API_BASE}/delivery/my-orders`);
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
          await authenticatedFetch(action.url, action.options);
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
      setError('Geolocation not supported by this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGpsLat(String(pos.coords.latitude));
        setGpsLon(String(pos.coords.longitude));
        setError('');
      },
      () => setError('Location access denied. Tracking with fallback coordinates.')
    );
  };

  // Helper to strip out text annotations like "(Mama Jane Supermarket)" from coordinate strings
  const cleanCoordinate = (val: any): string => {
    if (val === null || val === undefined) return '';
    const match = String(val).match(/[-0-9.]+/);
    return match ? match[0] : '';
  };

  const openNavigation = (order: Order) => {
    setError(null); // ✅ Clear previous errors before attempting navigation

    const pickup = order.pickup_location;
    const delivery = order.delivery_location;
    
    if (!pickup || !delivery) {
      setError('Missing location properties. Cannot generate route map.');
      return;
    }

    const pLat = cleanCoordinate(pickup.lat);
    const pLon = cleanCoordinate(pickup.lon);
    const dLat = cleanCoordinate(delivery.lat);
    const dLon = cleanCoordinate(delivery.lon);

    if (!pLat || !pLon || !dLat || !dLon) {
      setError('Invalid numeric coordinates. Clean map points could not be parsed.');
      return;
    }

    const mode = travelMode === 'two_wheeled' ? 'bicycling' : 'driving';
    
    // Official Google Maps Directions API gateway format
    const url = `https://www.google.com/maps/dir/?api=1&origin=${pLat},${pLon}&destination=${dLat},${dLon}&travelmode=${mode}`;
    
    window.open(url, '_blank');
  };

  const toggleTravelMode = () => {
    setTravelMode(prev => prev === 'driving' ? 'two_wheeled' : 'driving');
    const modeName = travelMode === 'driving' ? 'Motorcycle (Boda Boda)' : 'Car / Vehicle';
    setMessage(`Switched transit profile to: ${modeName}`);
    setTimeout(() => setMessage(''), 3000);
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
    const options = { method: 'PUT' };
    try {
      if (!navigator.onLine) {
        queueAction(url, options);
        setMessage('Arrival marked offline. Syncing automatically upon connection reconnect.');
        return;
      }
      const resp = await authenticatedFetch(url, options);
      if (!resp.ok) throw new Error('Failed to update system arrival status.');
      setMessage('Arrival checkpoint recorded successfully.');
      fetchOrders();
    } catch (err: any) {
      setError(err.message);
      queueAction(url, options);
      setMessage('Network failure. Saved update checkpoint locally.');
    }
  };

  const handleTakePhoto = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>, orderId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setMessage('Uploading delivery verification signature image...');
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadResp = await authenticatedFetch(`${API_BASE}/delivery/orders/${orderId}/evidence`, {
        method: 'POST',
        body: formData,
      });
      if (!uploadResp.ok) throw new Error('File upload pipeline rejected image content.');
      const uploadResult = await uploadResp.json();

      const params = new URLSearchParams({
        status: 'successful',
        gps_lat: gpsLat,
        gps_lon: gpsLon,
        photo_url: uploadResult.url,
      });
      
      const attemptResp = await authenticatedFetch(`${API_BASE}/delivery/orders/${orderId}/attempt?${params}`, {
        method: 'PUT',
      });
      if (!attemptResp.ok) throw new Error('Failed to commit operational drop-off status updates.');
      setMessage('Dropoff verification complete. Order successfully cleared!');
      fetchOrders();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const activeOrders = orders.filter(o => ['out_for_delivery', 'arrived'].includes(o.status));
  const pastOrders = orders.filter(o => !['out_for_delivery', 'arrived'].includes(o.status));

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 16, fontFamily: 'system-ui, sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      {/* Header Context */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid #e5e7eb' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#111827' }}>Hakika Rider</h1>
          <span style={{ fontSize: 13, color: '#6b7280' }}>{user?.email}</span>
        </div>
        <button onClick={logout} style={{ padding: '6px 14px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>
          Logout
        </button>
      </div>

      {/* Dynamic Notification Banners */}
      {error && <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 14, fontWeight: 500 }}>⚠️ {error}</div>}
      {message && <div style={{ backgroundColor: '#ecfdf5', color: '#047857', padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 14, fontWeight: 500 }}>✅ {message}</div>}

      {/* Telemetry Control Panel */}
      <div style={{ backgroundColor: '#fff', padding: 16, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={getRealGPS} style={{ padding: '8px 12px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
            📍 Refresh GPS
          </button>
          <div style={{ fontSize: 12, color: '#4b5563' }}>
            <strong>Lat:</strong> {parseFloat(gpsLat).toFixed(4)} <br/>
            <strong>Lon:</strong> {parseFloat(gpsLon).toFixed(4)}
          </div>
        </div>
        <button onClick={toggleTravelMode} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: travelMode === 'driving' ? '#4f46e5' : '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
          {travelMode === 'driving' ? '🚗 Car Mode' : '🛵 Boda Mode'}
        </button>
      </div>

      {loading && <p style={{ textAlign: 'center', color: '#6b7280', fontSize: 14 }}>Refreshing active manifests...</p>}

      {/* Operational Active Manifest */}
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#374151', marginBottom: 12 }}>Active Drop-offs ({activeOrders.length})</h2>
      {activeOrders.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '32px 16px', backgroundColor: '#fff', borderRadius: 12, border: '1px dashed #d1d5db', color: '#9ca3af', fontSize: 14 }}>
          No pending items assigned out for delivery.
        </div>
      )}

      {activeOrders.map(order => (
        <div key={order.id} style={{ backgroundColor: '#fff', borderRadius: 12, border: '2px solid #2563eb', padding: 16, marginBottom: 16, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>Invoice Ref</span>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#111827' }}>{order.order_number}</h3>
            </div>
            <span style={{ backgroundColor: order.status === 'arrived' ? '#d1fae5' : '#dbeafe', color: order.status === 'arrived' ? '#065f46' : '#1e40af', padding: '4px 10px', borderRadius: 9999, fontSize: 12, fontWeight: 700, textTransform: 'capitalize' }}>
              {order.status.replace(/_/g, ' ')}
            </span>
          </div>

          {order.business_name && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px solid #f3f4f6' }}>
              {order.business_logo && (
                <img src={`http://localhost:8000${order.business_logo}`} alt="Logo" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6 }} />
              )}
              <div>
                <span style={{ fontSize: 11, color: '#9ca3af', display: 'block' }}>Pickup Point</span>
                <span style={{ fontWeight: 700, color: '#1f2937', fontSize: 14 }}>{order.business_name}</span>
              </div>
            </div>
          )}

          <div style={{ backgroundColor: '#f9fafb', padding: 12, borderRadius: 8, margin: '8px 0' }}>
            {order.items.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
                {item.thumbnail_url && (
                  <img src={`http://localhost:8000${item.thumbnail_url}`} alt="Item" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4 }} />
                )}
                <span style={{ fontSize: 14, color: '#4b5563', fontWeight: 500 }}>{item.product_name} <strong style={{ color: '#111827' }}>×{item.quantity}</strong></span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 12 }}>
            <div>
              <span style={{ fontSize: 11, color: '#9ca3af', display: 'block' }}>Recipient</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>👤 {order.customer_name || 'Anonymous Recipient'}</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 11, color: '#9ca3af', display: 'block' }}>Total Payout Amount</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#111827' }}>KES {order.total_amount}</span>
            </div>
          </div>

          {order.customer_phone && (
            <p style={{ margin: '0 0 16px 0', fontSize: 13, color: '#4b5563' }}>📞 <strong>Contact:</strong> {order.customer_phone}</p>
          )}

          {/* Workflow Actions Section */}
          <div style={{ display: 'flex', gap: 8, flexDirection: 'column', marginTop: 12 }}>
            <button onClick={() => openNavigation(order)} style={{ width: '100%', padding: '12px', backgroundColor: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              🧭 Launch Interactive Google Map Route
            </button>
            
            {order.status === 'out_for_delivery' && (
              <button onClick={() => handleArrive(order.id)} style={{ width: '100%', padding: '14px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 15, boxShadow: '0 2px 4px rgba(16,185,129,0.2)' }}>
                Mark as Arrived at Target Destination
              </button>
            )}

            {order.status === 'arrived' && (
              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 12, marginTop: 4 }}>
                <p style={{ color: '#059669', fontSize: 13, fontWeight: 600, margin: '0 0 8px 0', textAlign: 'center' }}>🎉 Standing by for Drop-off Verification Photo...</p>
                <button onClick={handleTakePhoto} style={{ width: '100%', padding: '12px', backgroundColor: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                  📷 Capture Proof of Delivery Photo
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={(e) => handlePhotoCapture(e, order.id)} style={{ display: 'none' }} />
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Archive Logs Section */}
      {pastOrders.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#6b7280', marginBottom: 12 }}>Archived Manifest History ({pastOrders.length})</h2>
          {pastOrders.map(order => (
            <div key={order.id} style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.65 }}>
              <div>
                <strong style={{ fontSize: 14, color: '#374151' }}>{order.order_number}</strong>
                <span style={{ fontSize: 12, color: '#6b7280', display: 'block' }}>KES {order.total_amount}</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#374151', backgroundColor: '#f3f4f6', padding: '2px 8px', borderRadius: 4, textTransform: 'capitalize' }}>
                {order.status.replace(/_/g, ' ')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;
