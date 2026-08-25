import React, { useEffect, useState, useRef, useMemo } from 'react';
import OrderCard from '../components/OrderCard';
import OrderPreviewCard from '../components/OrderPreviewCard';
import OverviewMap from '../components/OverviewMap';
import ArchivedOrderCard from '../components/ArchivedOrderCard';
import { haversineKm } from '../utils/distance';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useOrders } from '../hooks/useOrders';
import { buildTrip } from '../services/tripBuilder';
import { useWebSocket } from '../hooks/useWebSocket';
import { offlineQueue } from '../services/offlineQueue';
import { useOfflineSync } from '../hooks/useOfflineSync';
import SyncStatus from '../components/SyncStatus';
import { useAuth, authenticatedFetch } from '@hakika/auth';
import { Config } from '@hakika/config';

import { Order, OrderItem } from '../types/order';

const Home: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { data: orders = [], isLoading, error: queryError, refetch: refetchOrders } = useOrders();
  const [error, setError] = useState('');
  const queryClient = useQueryClient();
  const [paymentPopupOrderId, setPaymentPopupOrderId] = useState<string | null>(null);
  const lastPaymentPopupOrderId = useRef<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isSelectingForTrip, setIsSelectingForTrip] = useState(false);
  const [tripOrderIds, setTripOrderIds] = useState<string[]>([]);
  const [tripMessage, setTripMessage] = useState('');

  useWebSocket((event: any) => {
    if (event.type === 'order_payment_confirmed') {
      const orderId = event.payload?.order_id;
      if (orderId && orderId !== lastPaymentPopupOrderId.current) {
        lastPaymentPopupOrderId.current = orderId;
        setPaymentPopupOrderId(orderId);
      }
    }
  });

  const [pendingSyncOrderIds, setPendingSyncOrderIds] = useState<Set<string>>(new Set());
  const { isOnline, pendingCount, lastSyncStatus, syncNow, updatePendingCount } = useOfflineSync(() => {
    refetchOrders();
    setPendingSyncOrderIds(new Set());
  });
  const [gpsLat, setGpsLat] = useState<number | null>(null);
  const [gpsLon, setGpsLon] = useState<number | null>(null);
  const memoizedRiderLocation = useMemo(
    () => (gpsLat !== null && gpsLon !== null ? { lat: gpsLat, lon: gpsLon } : null),
    [gpsLat, gpsLon]
  );
  const [message, setMessage] = useState('');

  const requestFreshGPS = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGpsLat(pos.coords.latitude);
        setGpsLon(pos.coords.longitude);
        setError('');
      },
      () => {
        setGpsLat(null);
        setGpsLon(null);
        setError('Location access denied. Enable location to see your position.');
      },
      { enableHighAccuracy: true }
    );
  };
  const [travelMode, setTravelMode] = useState<'driving' | 'two_wheeled'>('driving');
  const fileInputRef = useRef<HTMLInputElement>(null);





  // Load pending sync order IDs from the offline queue
  useEffect(() => {
    offlineQueue.getAll().then(queue => {
      setPendingSyncOrderIds(new Set(queue.map(a => a.orderId)));
    });
  }, []);

  // Store last known location in localStorage for offline startup
  useEffect(() => {
    if (gpsLat !== null && gpsLon !== null) {
      localStorage.setItem('hakika-rider-last-location', JSON.stringify({ lat: gpsLat, lon: gpsLon }));
    }
  }, [gpsLat, gpsLon]);


  // Request location on mount. Don't use fallback coordinates.
  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by this browser.');
      return;
    }

    let watchId: number | null = null;

    navigator.geolocation.getCurrentPosition(
      pos => {
        setGpsLat(pos.coords.latitude);
        setGpsLon(pos.coords.longitude);
        setError('');
      },
      () => {
        setGpsLat(null);
        setGpsLon(null);
        setError('Location access denied. Enable location to see your position.');
      },
      { enableHighAccuracy: true }
    );

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const cleanCoordinate = (val: any): string => {
    if (val === null || val === undefined) return '';
    const match = String(val).match(/[-0-9.]+/);
    return match ? match[0] : '';
  };

  const toggleTripOrder = (orderId: string) => {
    setTripOrderIds(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
    setTripMessage('');
  };

  const handleBuildTrip = async () => {
    if (tripOrderIds.length === 0) {
      setTripMessage('Select at least one order to build a trip.');
      return;
    }

    if (tripOrderIds.length > 5) {
      setTripMessage('A maximum of 5 orders can be selected for a trip.');
      return;
    }

    const selectedOrders = activeOrders.filter((o: Order) => tripOrderIds.includes(o.id));
    if (selectedOrders.length === 0) {
      setTripMessage('Selected orders are no longer active.');
      return;
    }

    if (!memoizedRiderLocation) {
      setTripMessage('Your location is unavailable. Enable GPS to plan a trip.');
      return;
    }

    try {
      const trip = await buildTrip(selectedOrders, memoizedRiderLocation);
      navigate('/trip-preview', { state: { trip, orders: selectedOrders } });
    } catch (err: any) {
      setTripMessage(err.message || 'Failed to build trip.');
    }
  };

  const handleCancelTripSelection = () => {
    setIsSelectingForTrip(false);
    setTripOrderIds([]);
    setTripMessage('');
  };

  const handleNavigateToOrder = (order: Order) => {
    navigate(`/navigate/${order.id}`, { state: { order } });
  };

  const openNavigation = (order: Order) => {
    setError("");
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
    const url = `https://www.google.com/maps/dir/?api=1&origin=${pLat},${pLon}&destination=${dLat},${dLon}&travelmode=${mode}`;
    window.open(url, '_blank');
  };

  const toggleTravelMode = () => {
    setTravelMode(prev => prev === 'driving' ? 'two_wheeled' : 'driving');
    const modeName = travelMode === 'driving' ? 'Motorcycle (Boda Boda)' : 'Car / Vehicle';
    setMessage(`Switched transit profile to: ${modeName}`);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleArrive = async (orderId: string) => {
    setError('');
    setMessage('');
    const lat = gpsLat ?? 0;
    const lon = gpsLon ?? 0;
    try {
      if (!navigator.onLine) {
        await offlineQueue.enqueue({ type: 'arrive', orderId, payload: { gps_lat: lat, gps_lon: lon } });
        setPendingSyncOrderIds(prev => new Set(prev).add(orderId));
        updatePendingCount();
        setMessage('Arrival marked offline. Syncing automatically when connection returns.');
        return;
      }
      const url = `${Config.API_BASE}/delivery/orders/${orderId}/arrive?gps_lat=${lat}&gps_lon=${lon}`;
      const resp = await authenticatedFetch(url, { method: 'PUT' }, 'hakika_rider');
      if (!resp.ok) throw new Error('Failed to update system arrival status.');
      setMessage('Arrival checkpoint recorded successfully.');
      refetchOrders();
    } catch (err: any) {
      // If network fails during online attempt, also queue it
      if (err.message?.includes('Network') || err.message?.includes('fetch')) {
        await offlineQueue.enqueue({ type: 'arrive', orderId, payload: { gps_lat: lat, gps_lon: lon } });
        setPendingSyncOrderIds(prev => new Set(prev).add(orderId));
        updatePendingCount();
        setMessage('Network failure. Saved update checkpoint locally.');
      } else {
        setError(err.message);
      }
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
      const uploadResp = await authenticatedFetch(`${Config.API_BASE}/delivery/orders/${orderId}/evidence`, {
        method: 'POST',
        body: formData,
      }, 'hakika_rider');
      if (!uploadResp.ok) throw new Error('File upload pipeline rejected image content.');
      const uploadResult = await uploadResp.json();
      const params = new URLSearchParams({
        status: 'successful',
        gps_lat: String(gpsLat ?? 0),
        gps_lon: String(gpsLon ?? 0),
        photo_url: uploadResult.url,
      });
      const attemptResp = await authenticatedFetch(`${Config.API_BASE}/delivery/orders/${orderId}/attempt?${params}`, {
        method: 'PUT',
      }, 'hakika_rider');
      if (!attemptResp.ok) throw new Error('Failed to commit operational drop-off status updates.');
      setMessage('Dropoff verification complete. Order successfully cleared!');
      refetchOrders();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const activeOrders = useMemo(
    () => orders.filter((o: Order) => ['out_for_delivery', 'arrived'].includes(o.status)),
    [orders]
  );
  const pastOrders = useMemo(
    () => orders.filter((o: Order) => !['out_for_delivery', 'arrived'].includes(o.status)),
    [orders]
  );

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 16, fontFamily: 'system-ui, sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid #e5e7eb' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#111827' }}>Hakika Rider</h1>
          <span style={{ fontSize: 13, color: '#6b7280' }}>{user?.email}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {activeOrders.length > 0 && (
            <button
              onClick={() => { setIsSelectingForTrip(prev => !prev); setTripOrderIds([]); setTripMessage(''); }}
              style={{
                padding: '6px 12px',
                backgroundColor: isSelectingForTrip ? '#f59e0b' : '#6b7280',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              {isSelectingForTrip ? 'Exit Trip Selection' : 'Select for Trip'}
            </button>
          )}
          <button onClick={() => navigate('/profile')} style={{ padding: '6px 14px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>
            Profile
          </button>
          <button onClick={logout} style={{ padding: '6px 14px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>
            Logout
          </button>
        </div>
      </div>

      {(error || queryError) && <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 14, fontWeight: 500 }}>⚠️ {error || (queryError as any)?.message}</div>}
      {message && <div style={{ backgroundColor: '#ecfdf5', color: '#047857', padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 14, fontWeight: 500 }}>✅ {message}</div>}

      <div style={{ backgroundColor: '#fff', padding: 16, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={requestFreshGPS}
            style={{
              padding: '8px 12px',
              backgroundColor: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            📍 Refresh GPS
          </button>
          <div style={{ fontSize: 12, color: '#4b5563' }}>
            {gpsLat !== null && gpsLon !== null ? (
              <>GPS: {gpsLat.toFixed(4)}, {gpsLon.toFixed(4)}</>
            ) : (
              <>Location unavailable</>
            )}
          </div>
        </div>
        <button onClick={toggleTravelMode} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: travelMode === 'driving' ? '#4f46e5' : '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
          {travelMode === 'driving' ? '🚗 Car Mode' : '🛵 Boda Mode'}
        </button>
      </div>

      {memoizedRiderLocation || activeOrders.length > 0 ? (
        <div style={{ height: '45vh', marginBottom: 16 }}>
          <OverviewMap
            orders={activeOrders}
            riderLocation={memoizedRiderLocation}
            radiusKm={30}
            selectedOrderId={selectedOrderId}
            onOrderSelect={(id) => setSelectedOrderId(prev => prev === id ? null : id)}
          />
        </div>
      ) : (
        <div style={{ height: '45vh', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
          Acquiring location…
        </div>
      )}

      {isSelectingForTrip && (
        <div style={{ backgroundColor: '#eff6ff', border: '1px solid #2563eb', borderRadius: 10, padding: 12, marginBottom: 12 }}>
          <div style={{ fontWeight: 700, color: '#1e40af', marginBottom: 8 }}>
            {tripOrderIds.length} order{tripOrderIds.length !== 1 ? 's' : ''} selected
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleBuildTrip}
              disabled={tripOrderIds.length === 0}
              style={{
                padding: '8px 14px',
                backgroundColor: tripOrderIds.length === 0 ? '#9ca3af' : '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                fontWeight: 700,
                cursor: tripOrderIds.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              Build Trip
            </button>
            <button
              onClick={handleCancelTripSelection}
              style={{
                padding: '8px 14px',
                backgroundColor: '#dc2626',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
          {tripMessage && <div style={{ marginTop: 8, color: '#047857', fontWeight: 600 }}>{tripMessage}</div>}
        </div>
      )}

      {!isSelectingForTrip && selectedOrderId && (() => {
        const selectedOrder = activeOrders.find((o: Order) => o.id === selectedOrderId);
        return selectedOrder ? <OrderPreviewCard order={selectedOrder} /> : null;
      })()}

      {isLoading && <p style={{ textAlign: 'center', color: '#6b7280', fontSize: 14 }}>Refreshing active manifests...</p>}

      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#374151', marginBottom: 12 }}>Active Drop-offs ({activeOrders.length})</h2>
      {activeOrders.length === 0 && !isLoading && (
        <div style={{ textAlign: 'center', padding: '32px 16px', backgroundColor: '#fff', borderRadius: 12, border: '1px dashed #d1d5db', color: '#9ca3af', fontSize: 14 }}>
          No pending items assigned out for delivery.
        </div>
      )}

      {activeOrders.map((order: Order) => (
        <OrderCard
          key={order.id}
          order={order}
          riderLocation={memoizedRiderLocation ?? { lat: 0, lon: 0 }}
          onNavigate={handleNavigateToOrder}
          isPendingSync={pendingSyncOrderIds.has(order.id)}
          onArrive={handleArrive}
          onTakePhoto={handleTakePhoto}
          onPhotoCapture={handlePhotoCapture}
          fileInputRef={fileInputRef}
          configBase={Config.API_BASE}
          isSelected={isSelectingForTrip ? tripOrderIds.includes(order.id) : order.id === selectedOrderId}
          onSelect={(id) => {
            if (isSelectingForTrip) {
              toggleTripOrder(id);
            } else {
              setSelectedOrderId(prev => prev === id ? null : id);
            }
          }}
        />
      ))}

      {pastOrders.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#6b7280', marginBottom: 12 }}>Archived Manifest History ({pastOrders.length})</h2>
          {pastOrders.map((order: Order) => (
            <ArchivedOrderCard key={order.id} order={order} />
          ))}
        </div>
      )}

      {paymentPopupOrderId && (() => {
        const popupOrder = orders.find((o: Order) => o.id === paymentPopupOrderId);
        return (
          <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, maxWidth: 420, width: 'calc(100% - 32px)' }}>
            <div style={{ backgroundColor: '#fff', border: '2px solid #10b981', borderRadius: 16, boxShadow: '0 10px 20px rgba(0,0,0,0.2)', padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontWeight: 800, color: '#047857', fontSize: 16 }}>✅ Payment Confirmed</span>
                <button onClick={() => setPaymentPopupOrderId(null)} style={{ border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>×</button>
              </div>
              {popupOrder ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
                    {popupOrder.business_logo && <img src={popupOrder.business_logo} alt="Business" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />}
                    <div>
                      <div style={{ fontWeight: 700, color: '#111827' }}>{popupOrder.business_name}</div>
                      <div style={{ fontSize: 13, color: '#6b7280' }}>{popupOrder.order_number}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 12, padding: '10px 12px', backgroundColor: '#f0fdf4', borderRadius: 8 }}>
                    {popupOrder.items?.map((item: OrderItem) => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
                        {item.thumbnail_url && <img src={item.thumbnail_url} alt="Item" style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover' }} />}
                        <span style={{ fontSize: 14, color: '#374151' }}>{item.product_name} ×{item.quantity}</span>
                        <span style={{ marginLeft: 'auto', fontWeight: 700, color: '#111827' }}>KES {item.unit_price * item.quantity}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                      <span style={{ fontSize: 13, color: '#4b5563' }}>Customer</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{popupOrder.customer_name || 'Anonymous'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                      <span style={{ fontSize: 13, color: '#4b5563' }}>Total</span>
                      <span style={{ fontSize: 15, fontWeight: 800, color: '#047857' }}>KES {popupOrder.total_amount}</span>
                    </div>
                  </div>
                </>
              ) : (
                <p style={{ marginTop: 12, color: '#047857', fontWeight: 600 }}>Payment confirmed ✓ — updating order details...</p>
              )}
            </div>
          </div>
        );
      })()}

    </div>
  );
};

export default Home;
