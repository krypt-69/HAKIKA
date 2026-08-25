import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import TripPreviewMap from '../components/TripPreviewMap';
import type { DeliveryTrip } from '../services/tripBuilder';
import type { Order } from '../types/order';
import { getMultiStopRoute } from '../services/directions';

const TripPreview: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const trip = (location.state as any)?.trip as DeliveryTrip | undefined;
  const selectedOrders = (location.state as any)?.orders as Order[] | undefined;

  const riderLocation = React.useMemo(() => {
    try {
      const raw = localStorage.getItem('hakika-rider-last-location');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.lat === 'number' && typeof parsed.lon === 'number') {
          return { lat: parsed.lat, lon: parsed.lon };
        }
      }
    } catch {}
    return { lat: -1.286, lon: 36.817 };
  }, []);

  const [gpsWarning, setGpsWarning] = useState('');
  const [previewRoute, setPreviewRoute] = useState<GeoJSON.LineString | null>(null);
  const [previewLegs, setPreviewLegs] = useState<{ distance: number; duration: number }[]>([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState('');

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      pos => {
        const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        localStorage.setItem('hakika-rider-last-location', JSON.stringify(loc));
        // Force re-render by setting route dependencies; for simplicity, we use a location state if we had one.
        setGpsWarning('');
        window.dispatchEvent(new Event('rider-location-updated'));
      },
      () => {
        setGpsWarning('Using last known location. Enable GPS for accurate routing.');
      },
      { enableHighAccuracy: true }
    );
  }, []);

  useEffect(() => {
    if (!trip || trip.stops.length < 2) return;

    let cancelled = false;
    setRouteLoading(true);
    setRouteError('');

    const waypoints: [number, number][] = [
      [riderLocation.lon, riderLocation.lat],
      ...trip.stops.map(stop => [stop.location.lon, stop.location.lat] as [number, number]),
    ];

    getMultiStopRoute(waypoints)
      .then(route => {
        if (!cancelled) {
          setPreviewRoute(route.geometry);
          setPreviewLegs(route.legs || []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRouteError('Unable to load trip route. Stops are still visible.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setRouteLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [trip, riderLocation]);



  if (!trip) {
    return (
      <div style={{ padding: 24 }}>
        <button onClick={() => navigate('/')}>← Back</button>
        <p>No trip found. Please build a trip from Home.</p>
      </div>
    );
  }

  const stops = trip.stops;

  const ordersForStop = (stopId: string) => {
    if (!selectedOrders || !trip) return [];
    const stop = trip.stops.find(s => s.id === stopId);
    if (!stop) return [];
    return selectedOrders.filter(o => stop.orderIds.includes(o.id));
  };

  const phoneForStop = (stopId: string) => {
    const orders = ordersForStop(stopId);
    if (orders.length === 0) return null;
    const first = orders[0];
    return stopId.startsWith('pickup') ? (orders[0].business_name || null) : first.customer_phone || first.customer_name || null;
  };
  const distanceKm = trip.estimatedDistanceMeters
    ? (trip.estimatedDistanceMeters / 1000).toFixed(1) + ' km'
    : '--';

  const durationMin = trip.estimatedDurationSeconds
    ? Math.round(trip.estimatedDurationSeconds / 60) + ' min'
    : '--';

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 16, minHeight: '100vh', background: '#f9fafb' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={() => navigate('/')} style={{ padding: '8px 16px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, fontWeight: 600 }}>← Back</button>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0 }}>Trip Preview</h1>
      </div>

      <div style={{ background: '#fff', padding: 16, borderRadius: 12, marginBottom: 16 }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>
          {trip.orderIds.length} order{trip.orderIds.length !== 1 ? 's' : ''} · {stops.length} stops
        </h2>
        <p style={{ margin: 0, fontSize: 15, color: '#4b5563' }}>{distanceKm} · {durationMin}</p>
      </div>

      <div style={{ height: '40vh', marginBottom: 16 }}>
        {gpsWarning && <p style={{ textAlign: 'center', color: '#b45309', fontSize: 13 }}>{gpsWarning}</p>}
        {routeLoading && <p style={{ textAlign: 'center', color: '#6b7280', fontSize: 14 }}>Calculating trip route…</p>}
        {routeError && <p style={{ textAlign: 'center', color: '#b91c1c', fontSize: 14 }}>{routeError}</p>}
        <TripPreviewMap
          riderLocation={riderLocation}
          stops={stops}
          routeGeometry={previewRoute}
        />
      </div>

      <div style={{ marginBottom: 24 }}>
        {stops.map((stop, index) => {
          const leg = previewLegs[index];
          return (
            <div key={stop.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: stop.type === 'pickup' ? '#16a34a' : '#ef4444', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                  {index + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: 14 }}>{stop.type === 'pickup' ? 'PICK UP' : 'DELIVER'}</strong>
                  <div style={{ fontSize: 13, color: '#4b5563' }}>{stop.label}</div>

                  {(() => {
                    const stopOrders = ordersForStop(stop.id);
                    return (
                      <div style={{ marginTop: 6 }}>
                        {stopOrders.map((order) => (
                          <div key={order.id} style={{ marginBottom: 8 }}>
                            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                              Order {order.order_number}
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                              {order.items.slice(0, 2).map(item => (
                                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  {item.thumbnail_url ? (
                                    <img src={item.thumbnail_url} alt={item.product_name} style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover' }} />
                                  ) : (
                                    <div style={{ width: 28, height: 28, borderRadius: 4, background: '#e5e7eb' }} />
                                  )}
                                  <span style={{ fontSize: 12 }}>{item.product_name} ×{item.quantity}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                        {stopOrders.length === 0 && <p style={{ fontSize: 12, color: '#9ca3af' }}>No order details</p>}
                      </div>
                    );
                  })()}

                  {(() => {
                    const phone = stop.type === 'delivery' ? (selectedOrders?.find(o => stop.orderIds.includes(o.id))?.customer_phone || null) : null;
                    if (!phone) return null;
                    return (
                      <a
                        href={`tel:${phone}`}
                        style={{
                          display: 'inline-block',
                          marginTop: 6,
                          padding: '6px 12px',
                          backgroundColor: '#2563eb',
                          color: '#fff',
                          borderRadius: 6,
                          fontWeight: 700,
                          fontSize: 12,
                          textDecoration: 'none',
                        }}
                      >
                        Call {phone}
                      </a>
                    );
                  })()}
                </div>
                {leg && (
                  <div style={{ textAlign: 'right', fontSize: 12, color: '#4b5563' }}>
                    <div>{(leg.distance / 1000).toFixed(1)} km</div>
                    <div>{Math.round(leg.duration / 60)} min</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => navigate('/navigate-trip', { state: { trip } })}
        style={{
          width: '100%',
          padding: 16,
          backgroundColor: '#16a34a',
          color: '#fff',
          border: 'none',
          borderRadius: 10,
          fontWeight: 800,
          fontSize: 16,
          cursor: 'pointer',
        }}
      >
        START TRIP
      </button>
    </div>
  );
};

export default TripPreview;
