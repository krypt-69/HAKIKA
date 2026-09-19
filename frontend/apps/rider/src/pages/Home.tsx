import React, { useEffect, useState, useRef, useMemo } from 'react';
import OrderCard from '../components/OrderCard';
import OrderPreviewCard from '../components/OrderPreviewCard';
import OverviewMap from '../components/OverviewMap';
import ArchivedOrdersDrawer from '../components/ArchivedOrdersDrawer';
import { haversineKm } from '../utils/distance';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useOrders } from '../hooks/useOrders';
import { buildTrip } from '../services/tripBuilder';
import { useWebSocket } from '../hooks/useWebSocket';
import { offlineQueue } from '../services/offlineQueue';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { saveTripSelection, clearTripSelection, saveActiveTrip } from '../services/navigationPersistence';
import SyncStatus from '../components/SyncStatus';
import { useAuth, authenticatedFetch } from '@hakika/auth';
import { Config } from '@hakika/config';
import {
  GpsIcon,
  RefreshIcon,
  MotorcycleIcon,
  CarIcon,
  ProfileIcon,
  LogoutIcon,
  ArchiveIcon,
  AlertIcon,
  CheckCircleIcon,
  MapIcon,
} from '../components/icons';
import { color, radius, shadow, font, space } from '../styles/tokens';

import { Order, OrderItem } from '../types/order';

function loadTripSelection() {
  try {
    const raw = sessionStorage.getItem('hakika-rider-trip-selection');
    return raw ? JSON.parse(raw) : { orderIds: [], isSelecting: false };
  } catch {
    return { orderIds: [], isSelecting: false };
  }
}

const Home: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { data: orders = [], isLoading, error: queryError, refetch: refetchOrders } = useOrders();
  const [error, setError] = useState('');
  const queryClient = useQueryClient();
  const [paymentPopupOrderId, setPaymentPopupOrderId] = useState<string | null>(null);
  const lastPaymentPopupOrderId = useRef<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isSelectingForTrip, setIsSelectingForTrip] = useState<boolean>(() => loadTripSelection().isSelecting);
  const [tripOrderIds, setTripOrderIds] = useState<string[]>(() => loadTripSelection().orderIds);
  const [tripMessage, setTripMessage] = useState('');
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [showMap, setShowMap] = useState(true);

  useEffect(() => {
    saveTripSelection(tripOrderIds, isSelectingForTrip);
  }, [tripOrderIds, isSelectingForTrip]);

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

  useEffect(() => {
    offlineQueue.getAll().then(queue => {
      setPendingSyncOrderIds(new Set(queue.map(a => a.orderId)));
    });
  }, []);

  useEffect(() => {
    if (gpsLat !== null && gpsLon !== null) {
      localStorage.setItem('hakika-rider-last-location', JSON.stringify({ lat: gpsLat, lon: gpsLon }));
    }
  }, [gpsLat, gpsLon]);

  useEffect(() => {
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
  }, []);

  const cleanCoordinate = (val: any): string => {
    if (val === null || val === undefined) return '';
    const match = String(val).match(/[-0-9.]+/);
    return match ? match[0] : '';
  };

  const toggleTripOrder = (orderId: string) => {
    setTripOrderIds(prev => (prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]));
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
      saveActiveTrip(trip);
      clearTripSelection();
      navigate('/trip-preview', { state: { trip, orders: selectedOrders } });
    } catch (err: any) {
      setTripMessage(err.message || 'Failed to build trip.');
    }
  };

  const handleCancelTripSelection = () => {
    setIsSelectingForTrip(false);
    setTripOrderIds([]);
    setTripMessage('');
    clearTripSelection();
  };

  const handleNavigateToOrder = (order: Order) => {
    navigate(`/navigate/${order.id}`, { state: { order } });
  };

  const toggleTravelMode = () => {
    setTravelMode(prev => (prev === 'driving' ? 'two_wheeled' : 'driving'));
    const modeName = travelMode === 'driving' ? 'Motorcycle' : 'Car';
    setMessage(`Switched to ${modeName} mode`);
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
        setMessage('Arrival saved offline. It will sync automatically once you\u2019re back online.');
        return;
      }
      const url = `${Config.API_BASE}/delivery/orders/${orderId}/arrive?gps_lat=${lat}&gps_lon=${lon}`;
      const resp = await authenticatedFetch(url, { method: 'PUT' }, 'hakika_rider');
      if (!resp.ok) throw new Error('Failed to update arrival status.');
      setMessage('Arrival recorded.');
      refetchOrders();
    } catch (err: any) {
      if (err.message?.includes('Network') || err.message?.includes('fetch')) {
        await offlineQueue.enqueue({ type: 'arrive', orderId, payload: { gps_lat: lat, gps_lon: lon } });
        setPendingSyncOrderIds(prev => new Set(prev).add(orderId));
        updatePendingCount();
        setMessage('No connection \u2014 saved locally, will sync soon.');
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
    setMessage('Uploading delivery photo\u2026');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadResp = await authenticatedFetch(`${Config.API_BASE}/delivery/orders/${orderId}/evidence`, {
        method: 'POST',
        body: formData,
      }, 'hakika_rider');
      if (!uploadResp.ok) throw new Error('Photo upload failed.');
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
      if (!attemptResp.ok) throw new Error('Could not confirm the delivery.');
      setMessage('Delivery confirmed.');
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
    <div style={{ background: color.surfaceMuted, minHeight: '100vh', fontFamily: font.family }}>
      {/* Sticky header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: color.surface,
          borderBottom: `1px solid ${color.border}`,
        }}
      >
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 20,
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                  color: color.ink,
                }}
              >
                Hakika Rider
              </h1>
              <span style={{ fontSize: 13, color: color.inkFaint }}>{user?.email}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                onClick={() => setArchiveOpen(true)}
                aria-label="Order history"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: radius.pill,
                  border: `1px solid ${color.border}`,
                  background: color.surface,
                  color: color.inkMuted,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                <ArchiveIcon size={17} />
                {pastOrders.length > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -4,
                      right: -4,
                      minWidth: 16,
                      height: 16,
                      padding: '0 4px',
                      borderRadius: radius.pill,
                      background: color.amber,
                      color: color.ink,
                      fontSize: 10,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {pastOrders.length > 99 ? '99+' : pastOrders.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => navigate('/profile')}
                aria-label="Profile"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: radius.pill,
                  border: `1px solid ${color.border}`,
                  background: color.surface,
                  color: color.inkMuted,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <ProfileIcon size={17} />
              </button>
              <button
                onClick={logout}
                aria-label="Log out"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: radius.pill,
                  border: `1px solid ${color.dangerSoft}`,
                  background: color.dangerSoft,
                  color: color.danger,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <LogoutIcon size={17} />
              </button>
            </div>
          </div>

          {activeOrders.length > 0 && (
            <button
              onClick={() => {
                setIsSelectingForTrip(prev => !prev);
                setTripOrderIds([]);
                setTripMessage('');
              }}
              style={{
                marginTop: 12,
                width: '100%',
                padding: '10px 14px',
                borderRadius: radius.md,
                border: isSelectingForTrip ? 'none' : `1px solid ${color.border}`,
                background: isSelectingForTrip ? color.ink : color.surfaceMuted,
                color: isSelectingForTrip ? color.surface : color.inkMuted,
                fontWeight: 600,
                fontSize: 13.5,
                cursor: 'pointer',
              }}
            >
              {isSelectingForTrip ? 'Exit trip selection' : 'Plan a multi-stop trip'}
            </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '16px 20px 32px' }}>
        {(error || queryError) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: color.dangerSoft,
              color: color.danger,
              padding: '12px 14px',
              borderRadius: radius.md,
              marginBottom: 12,
              fontSize: 13.5,
              fontWeight: 500,
            }}
          >
            <AlertIcon size={16} />
            {error || (queryError as any)?.message}
          </div>
        )}
        {message && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: color.successSoft,
              color: color.success,
              padding: '12px 14px',
              borderRadius: radius.md,
              marginBottom: 12,
              fontSize: 13.5,
              fontWeight: 500,
            }}
          >
            <CheckCircleIcon size={16} />
            {message}
          </div>
        )}

        <div
          style={{
            background: color.surface,
            border: `1px solid ${color.border}`,
            padding: 12,
            borderRadius: radius.lg,
            boxShadow: shadow.card,
            marginBottom: 16,
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={requestFreshGPS}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 12px',
                background: color.surfaceMuted,
                color: color.ink,
                border: 'none',
                borderRadius: radius.sm,
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              <RefreshIcon size={14} />
              Refresh GPS
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: color.inkFaint }}>
              <GpsIcon size={13} color={color.inkFaint} />
              {gpsLat !== null && gpsLon !== null ? (
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {gpsLat.toFixed(4)}, {gpsLon.toFixed(4)}
                </span>
              ) : (
                <span>Locating\u2026</span>
              )}
            </div>
          </div>
          <button
            onClick={toggleTravelMode}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '9px 14px',
              background: travelMode === 'driving' ? color.ink : color.amber,
              color: travelMode === 'driving' ? color.surface : color.ink,
              border: 'none',
              borderRadius: radius.sm,
              fontWeight: 650,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            {travelMode === 'driving' ? <CarIcon size={15} color={color.surface} /> : <MotorcycleIcon size={15} color={color.ink} />}
            {travelMode === 'driving' ? 'Car' : 'Motorcycle'}
          </button>
        </div>

        {memoizedRiderLocation || activeOrders.length > 0 ? (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <button
                onClick={() => setShowMap(v => !v)}
                style={{
                  background: color.danger,
                  border: 'none',
                  color: color.surface,
                  borderRadius: radius.pill,
                  padding: `${space(2.5)}px ${space(5)}px`,
                  fontWeight: font.weight.bold,
                  fontSize: font.size.body,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: space(2),
                  fontFamily: font.family,
                  boxShadow: '0 4px 12px rgba(180,72,47,0.35)',
                }}
              >
                <MapIcon size={16} color={color.surface} />
                {showMap ? 'Close Overview Map' : 'Open Overview Map'}
              </button>
            </div>
            {showMap && (
              <div style={{ height: '42vh', borderRadius: radius.lg, overflow: 'hidden', border: `1px solid ${color.border}` }}>
                <OverviewMap
                  orders={activeOrders}
                  riderLocation={memoizedRiderLocation}
                  radiusKm={30}
                  selectedOrderId={selectedOrderId}
                  onOrderSelect={(id) => setSelectedOrderId(prev => (prev === id ? null : id))}
                />
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              height: '42vh',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: color.inkFaint,
              background: color.surfaceMuted,
              borderRadius: radius.lg,
              fontSize: 13.5,
            }}
          >
            Acquiring location\u2026
          </div>
        )}

        {isSelectingForTrip && (
          <div
            style={{
              background: color.infoSoft,
              border: `1px solid ${color.info}22`,
              borderRadius: radius.md,
              padding: 14,
              marginBottom: 14,
            }}
          >
            <div style={{ fontWeight: 650, color: color.info, marginBottom: 10, fontSize: 14 }}>
              {tripOrderIds.length} order{tripOrderIds.length !== 1 ? 's' : ''} selected
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleBuildTrip}
                disabled={tripOrderIds.length === 0}
                style={{
                  padding: '9px 16px',
                  background: tripOrderIds.length === 0 ? color.border : color.ink,
                  color: color.surface,
                  border: 'none',
                  borderRadius: radius.sm,
                  fontWeight: 650,
                  fontSize: 13,
                  cursor: tripOrderIds.length === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                Build trip
              </button>
              <button
                onClick={handleCancelTripSelection}
                style={{
                  padding: '9px 16px',
                  background: 'transparent',
                  color: color.inkMuted,
                  border: `1px solid ${color.border}`,
                  borderRadius: radius.sm,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
            {tripMessage && <div style={{ marginTop: 8, color: color.inkMuted, fontSize: 12.5 }}>{tripMessage}</div>}
          </div>
        )}

        {!isSelectingForTrip && selectedOrderId && (() => {
          const selectedOrder = activeOrders.find((o: Order) => o.id === selectedOrderId);
          return selectedOrder ? <OrderPreviewCard order={selectedOrder} /> : null;
        })()}

        {isLoading && (
          <p style={{ textAlign: 'center', color: color.inkFaint, fontSize: 13.5 }}>Refreshing your deliveries\u2026</p>
        )}

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
          <h2 style={{ fontSize: 15.5, fontWeight: 650, color: color.ink, margin: 0 }}>Active deliveries</h2>
          <span style={{ fontSize: 13, color: color.inkFaint, fontVariantNumeric: 'tabular-nums' }}>{activeOrders.length}</span>
        </div>

        {activeOrders.length === 0 && !isLoading && (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 16px',
              background: color.surface,
              borderRadius: radius.lg,
              border: `1px dashed ${color.border}`,
              color: color.inkFaint,
              fontSize: 13.5,
            }}
          >
            No deliveries assigned right now.
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
                setSelectedOrderId(prev => (prev === id ? null : id));
              }
            }}
          />
        ))}
      </div>

      <ArchivedOrdersDrawer open={archiveOpen} orders={pastOrders} onClose={() => setArchiveOpen(false)} />

      {paymentPopupOrderId && (() => {
        const popupOrder = orders.find((o: Order) => o.id === paymentPopupOrderId);
        return (
          <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 300, maxWidth: 420, width: 'calc(100% - 32px)' }}>
            <div style={{ background: color.surface, border: `1px solid ${color.success}33`, borderRadius: radius.lg, boxShadow: shadow.raised, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircleIcon size={17} color={color.success} />
                  <span style={{ fontWeight: 700, color: color.success, fontSize: 15 }}>Payment confirmed</span>
                </div>
                <button
                  onClick={() => setPaymentPopupOrderId(null)}
                  aria-label="Dismiss"
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: color.inkFaint, padding: 2 }}
                >
                  <CloseIconInline />
                </button>
              </div>
              {popupOrder ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
                    {popupOrder.business_logo && (
                      <img src={popupOrder.business_logo} alt="Business" style={{ width: 40, height: 40, borderRadius: radius.sm, objectFit: 'cover' }} />
                    )}
                    <div>
                      <div style={{ fontWeight: 650, color: color.ink }}>{popupOrder.business_name}</div>
                      <div style={{ fontSize: 13, color: color.inkFaint }}>{popupOrder.order_number}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 12, padding: '10px 12px', background: color.successSoft, borderRadius: radius.sm }}>
                    {popupOrder.items?.map((item: OrderItem) => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
                        {item.thumbnail_url && <img src={item.thumbnail_url} alt="Item" style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover' }} />}
                        <span style={{ fontSize: 14, color: color.inkMuted }}>{item.product_name} \u00d7{item.quantity}</span>
                        <span style={{ marginLeft: 'auto', fontWeight: 650, color: color.ink, fontVariantNumeric: 'tabular-nums' }}>
                          KES {item.unit_price * item.quantity}
                        </span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                      <span style={{ fontSize: 13, color: color.inkMuted }}>Customer</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{popupOrder.customer_name || 'Anonymous'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                      <span style={{ fontSize: 13, color: color.inkMuted }}>Total</span>
                      <span style={{ fontSize: 15.5, fontWeight: 700, color: color.success, fontVariantNumeric: 'tabular-nums' }}>
                        KES {popupOrder.total_amount}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <p style={{ marginTop: 12, color: color.success, fontWeight: 600, fontSize: 13.5 }}>Updating order details\u2026</p>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

const CloseIconInline: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
  </svg>
);

export default Home;