import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { authenticatedFetch } from '@hakika/auth';
import { Config } from '@hakika/config';
import NavigationMap from '../components/NavigationMap';
import StopActionPanel from '../components/StopActionPanel';
import TripStopInfoCard from '../components/TripStopInfoCard';
import { getRoute, getMultiStopRoute } from '../services/directions';
import type { RouteData } from '../services/directions';
import { Order } from '../types/order';
import type { DeliveryTrip } from '../services/tripBuilder';
import { reconcileTripWithActiveOrders, advanceTripAfterStopCompleted } from '../services/tripBuilder';
import { useOrders } from '../hooks/useOrders';
import { loadActiveTrip, saveActiveTrip, clearActiveTrip } from '../services/navigationPersistence';
import { getDarkMode, setDarkMode } from '../mapbox/init';
import { sendTrackingMessage } from '../websocket';
import MapModeToggle from '../components/MapModeToggle';
import { PhoneIcon, CameraIcon, CheckCircleIcon, GpsIcon, PinIcon, ClockIcon } from '../components/icons';
import { calculateRouteProgress, type RouteProgress } from '../services/routeProgress';
import { orderToDestination, stopToDestination, type NavigationDestination } from '../services/navigationDestination';
import { color, font, space, radius, shadow } from '../styles/tokens';

function formatDistance(meters: number): string {
  if (meters == null) return '--';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds: number): string {
  if (seconds == null) return '--';
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)} hr ${mins % 60} min`;
}

function getManeuverIcon(type?: string, modifier?: string): string {
  const t = type?.toLowerCase() || '';
  const m = modifier?.toLowerCase() || '';
  if (t.includes('turn') || t.includes('fork')) {
    if (m.includes('right')) return '↱';
    if (m.includes('left')) return '↰';
  }
  if (t.includes('arrive')) return '✓';
  if (t.includes('depart')) return '↑';
  if (t.includes('uturn')) return '↶';
  if (t.includes('roundabout')) return '↻';
  if (t.includes('merge')) return '⇥';
  if (t.includes('continue') || t.includes('straight')) return '↑';
  return '↱';
}

function getManeuverText(type?: string, modifier?: string): string {
  const t = type?.toLowerCase() || '';
  const m = modifier?.toLowerCase() || '';
  if (t.includes('turn') || t.includes('fork')) {
    return m.includes('right') ? 'Turn right' : m.includes('left') ? 'Turn left' : 'Turn';
  }
  if (t.includes('arrive')) return 'Arrive';
  if (t.includes('depart')) return 'Depart';
  if (t.includes('uturn')) return 'Make a U-turn';
  if (t.includes('roundabout')) return 'Take roundabout';
  if (t.includes('merge')) return 'Merge';
  if (t.includes('continue') || t.includes('straight')) return 'Continue straight';
  return 'Continue';
}

function getNextManeuver(routeData?: RouteData | null) {
  if (!routeData?.steps?.length) return null;
  const step =
    routeData.steps.find((step: any) => {
      const t = step?.maneuver?.type?.toLowerCase?.() || '';
      return t && t !== 'depart' && t !== 'arrive';
    }) || routeData.steps[0];
  if (!step) return null;
  const type = step.maneuver?.type;
  const modifier = step.maneuver?.modifier;
  return {
    text: getManeuverText(type, modifier),
    icon: getManeuverIcon(type, modifier),
    distance: step.distance,
  };
}

const NavigationScreen: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { refetch: refetchOrders } = useOrders();
  const stateOrder = (location.state as any)?.order as Order | undefined;
  const stateTrip = (location.state as any)?.trip as DeliveryTrip | undefined;

  const { data: currentOrders = [], isLoading: ordersLoading } = useOrders();

  // Fallback for single-order nav: recover from URL param + orders cache after refresh
  const order = stateOrder ?? (orderId ? currentOrders.find((o: any) => o.id === orderId) : undefined);

  // Fallback for trip nav: recover from sessionStorage after refresh
  const [rehydratedTrip, setRehydratedTrip] = useState<DeliveryTrip | null>(null);
  useEffect(() => {
    if (!stateTrip && !orderId) {
      setRehydratedTrip(loadActiveTrip());
    }
  }, [stateTrip, orderId]);
  const trip = stateTrip ?? rehydratedTrip ?? undefined;

  const [currentStopIndex, setCurrentStopIndex] = useState(0);

  const [reconciledTrip, setReconciledTrip] = useState<DeliveryTrip | null>(null);
  const [currentStopInvalidated, setCurrentStopInvalidated] = useState(false);

  useEffect(() => {
    if (!trip || currentOrders.length === 0) return;
    const result = reconcileTripWithActiveOrders(trip, currentOrders);
    setReconciledTrip(result.trip);
    setCurrentStopInvalidated(result.currentStopInvalidated);
  }, [trip, currentOrders]);

  const effectiveTrip = reconciledTrip || trip;

  useEffect(() => {
    if (effectiveTrip) saveActiveTrip(effectiveTrip);
  }, [effectiveTrip]);
  const [navigationTarget, setNavigationTarget] = useState<NavigationDestination | null>(null);
  const trackingOrderIdRef = useRef<string | null>(null);
  const [hasArrived, setHasArrived] = useState(false);
  useEffect(() => { setNavigationTarget(null); setHasArrived(false); }, [order?.id, effectiveTrip?.id]);

  const destination: NavigationDestination | null = useMemo(() => {
    if (navigationTarget) return navigationTarget;
    if (effectiveTrip) {
      const stop = effectiveTrip.stops?.[effectiveTrip.currentStopIndex];
      return stop ? stopToDestination(stop) : null;
    }
    if (order) {
      return orderToDestination(order);
    }
    return null;
  }, [order, effectiveTrip, navigationTarget]);

  const currentTripStop = effectiveTrip?.stops?.[effectiveTrip.currentStopIndex];
  const display = useMemo(() => {
    if (order) {
      return {
        logo: order.business_logo,
        title: order.business_name || 'Business',
        subtitle: `Order ${order.order_number} · KES ${order.total_amount}`,
        items: order.items || [],
        phone: order.customer_phone || null,
        deliveryNote: order.delivery_note || null,
      };
    }
    if (currentTripStop) {
      return {
        logo: null,
        title: currentTripStop.label || 'Stop',
        subtitle: `${currentTripStop.type === 'pickup' ? 'Pickup' : 'Delivery'} · ${currentTripStop.orderIds.length} order(s)`,
        items: [],
        phone: null,
        deliveryNote: null,
      };
    }
    return null;
  }, [order, currentTripStop]);

  const canMarkArrived = order ? order.status === 'out_for_delivery' : true;

  const [riderLocation, setRiderLocation] = useState<[number, number] | null>(null);
  const [riderHeading, setRiderHeading] = useState<number | null>(null);
  const [riderSpeed, setRiderSpeed] = useState<number | null>(null);
  const [activeRoute, setActiveRoute] = useState<GeoJSON.LineString | null>(null);
  const [activeRouteData, setActiveRouteData] = useState<RouteData | null>(null);
  const [referenceRoute, setReferenceRoute] = useState<GeoJSON.LineString | null>(null);
  const [tripRouteGeometry, setTripRouteGeometry] = useState<GeoJSON.LineString | null>(null);
  const [routeProgress, setRouteProgress] = useState<RouteProgress | null>(null);
  const [recalculating, setRecalculating] = useState(false);
  const lastProgressRef = useRef<number | null>(null);
  const latestRiderLocationRef = useRef<[number, number] | null>(null);
  const offRouteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRerouteAtRef = useRef<number>(0);
  const isReroutingRef = useRef(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigationPhase, setNavigationPhase] = useState<'overview' | 'starting' | 'active'>('overview');
  const hasAutoStartedRef = useRef(false);
  const [navigationError, setNavigationError] = useState('');
  const navigationStartRef = useRef(false);
  const hasRealLocationRef = useRef(false);
  const routeRequestIdRef = useRef(0);
  const [routeFetchNonce, setRouteFetchNonce] = useState(0);
  const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleStartNavigationRef = useRef<() => void>(() => {});
  const navigationTargetRef = useRef<NavigationDestination | null>(null);
  const lastSmoothedHeadingRef = useRef<number | null>(null);

  const [darkMode, setDarkModeState] = useState(() => getDarkMode());
  const handleToggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    setDarkModeState(next);
  };

  function normalizeHeading(deg: number): number {
    return ((deg % 360) + 360) % 360;
  }

  function shortestAngleDiff(from: number, to: number): number {
    const a = normalizeHeading(to - from);
    return a > 180 ? a - 360 : a;
  }

  const OFF_ROUTE_DISTANCE_M = 40;
  const OFF_ROUTE_CONFIRM_MS = 8000;
  const REROUTE_COOLDOWN_MS = 20000;
  const ARRIVAL_SUPPRESS_M = 35;
  const STOP_ARRIVAL_THRESHOLD_M = 30;

  function lerpAngle(from: number, to: number, alpha: number): number {
    const diff = shortestAngleDiff(from, to);
    return normalizeHeading(from + diff * alpha);
  }

  function updateSmoothedHeading(rawHeading: number | null) {
    if (rawHeading === null || Number.isNaN(rawHeading) || !Number.isFinite(rawHeading)) {
      return;
    }

    const normalized = normalizeHeading(rawHeading);
    const prev = lastSmoothedHeadingRef.current;
    const SMOOTHING_ALPHA = 0.35;

    const next = prev === null
      ? normalized
      : lerpAngle(prev, normalized, SMOOTHING_ALPHA);

    lastSmoothedHeadingRef.current = next;

    // Use ref inside GPS callback; threshold avoids tiny React updates
    if (prev === null || Math.abs(shortestAngleDiff(prev, next)) >= 0.5) {
      setRiderHeading(next);
    }
  }
  const nextManeuver = getNextManeuver(activeRouteData);

  // Live route progress calculation + off-route detection
  useEffect(() => {
    if (
      navigationPhase !== 'active' ||
      !riderLocation ||
      !activeRoute ||
      !activeRouteData
    ) {
      return;
    }

    const progress = calculateRouteProgress(
      riderLocation,
      activeRoute,
      activeRouteData.distance,
      activeRouteData.duration
    );

    // Only update state when progress meaningfully changes
    const prevProgress = lastProgressRef.current;
    if (prevProgress === null || Math.abs(progress.progress - prevProgress) >= 0.002) {
      lastProgressRef.current = progress.progress;
      setRouteProgress(progress);
    }

    // Arrival detection with hysteresis
    if (progress.remainingDistanceMeters <= STOP_ARRIVAL_THRESHOLD_M) {
      setHasArrived(true);
    }

    // Off-route detection
    if (progress.remainingDistanceMeters <= ARRIVAL_SUPPRESS_M) {
      if (offRouteTimerRef.current) {
        clearTimeout(offRouteTimerRef.current);
        offRouteTimerRef.current = null;
      }
      return;
    }

    if (progress.distanceFromRouteMeters > OFF_ROUTE_DISTANCE_M) {
      if (!offRouteTimerRef.current) {
        offRouteTimerRef.current = setTimeout(() => {
          offRouteTimerRef.current = null;
          const now = Date.now();
          if (now - lastRerouteAtRef.current < REROUTE_COOLDOWN_MS) return;
          recalculateRoute();
        }, OFF_ROUTE_CONFIRM_MS);
      }
    } else {
      if (offRouteTimerRef.current) {
        clearTimeout(offRouteTimerRef.current);
        offRouteTimerRef.current = null;
      }
    }
  }, [navigationPhase, riderLocation, activeRoute, activeRouteData]);

  async function recalculateRoute() {
    if (isReroutingRef.current) return;
    if (!destination || !latestRiderLocationRef.current) return;

    isReroutingRef.current = true;
    setRecalculating(true);

    const requestId = ++routeRequestIdRef.current;
    const customerLoc: [number, number] = [
      destination.location.lon,
      destination.location.lat,
    ];

    try {
      const fresh = await getRoute(
        `route-${orderId}-recalc-${Date.now()}`,
        latestRiderLocationRef.current,
        customerLoc,
        false
      );

      if (requestId !== routeRequestIdRef.current) return;

      setActiveRoute(fresh.geometry);
      setActiveRouteData(fresh);
      lastProgressRef.current = null;
      lastRerouteAtRef.current = Date.now();
    } catch {
      if (requestId !== routeRequestIdRef.current) return;
      // keep previous route on failure
    } finally {
      isReroutingRef.current = false;
      setRecalculating(false);
    }
  }


  // Start tracking when a valid order is active.
  // No dependency on mapReady — tracking is a GPS concern.
  useEffect(() => {
    console.log('NavigationScreen: start-tracking effect', { orderId });
    if (!orderId) return;
    if (trackingOrderIdRef.current === orderId) return;
    trackingOrderIdRef.current = orderId;
    console.log('NavigationScreen: sending start_tracking', { orderId });
    sendTrackingMessage('start_tracking', { order_id: orderId });
  }, [orderId]);

  // Request real GPS location on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setNavigationError('Geolocation not supported by this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const loc: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        latestRiderLocationRef.current = loc;
        setRiderLocation(loc);
        setRiderSpeed(typeof pos.coords.speed === 'number' ? pos.coords.speed : null);
        updateSmoothedHeading(
          typeof pos.coords.heading === 'number' ? pos.coords.heading : null
        );
      },
      () => {
        setNavigationError('Unable to get your location. Markers will be shown without a route.');
      },
      { enableHighAccuracy: true }
    );
  }, []);

  // Get real GPS location
  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      pos => {
        hasRealLocationRef.current = true;
        const loc: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        latestRiderLocationRef.current = loc;
        setRiderLocation(loc);
        setRiderSpeed(typeof pos.coords.speed === 'number' ? pos.coords.speed : null);
        updateSmoothedHeading(
          typeof pos.coords.heading === 'number' ? pos.coords.heading : null
        );

        // Publish to tracking only if a session is active for this order
        const activeOrderId = trackingOrderIdRef.current;
        if (activeOrderId) {
          sendTrackingMessage('location_update', {
            order_id: activeOrderId,
            latitude: loc[1],
            longitude: loc[0],
            heading: typeof pos.coords.heading === 'number' ? pos.coords.heading : null,
            speed: typeof pos.coords.speed === 'number' ? pos.coords.speed : null,
            timestamp: new Date().toISOString(),
          });
        }
      },
      () => {
        console.warn('Geolocation unavailable; using fallback location.');
      },
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Fetch full trip route for trip mode
  useEffect(() => {
    if (!effectiveTrip || effectiveTrip.stops.length < 2 || !riderLocation) return;
    const waypoints: [number, number][] = [
      [riderLocation[0], riderLocation[1]],
      ...effectiveTrip.stops.map(stop => [stop.location.lon, stop.location.lat] as [number, number]),
    ];
    let cancelled = false;
    getMultiStopRoute(waypoints)
      .then(route => {
        if (!cancelled) setTripRouteGeometry(route.geometry);
      })
      .catch(() => {
        if (!cancelled) setTripRouteGeometry(null);
      });
    return () => { cancelled = true; };
  }, [effectiveTrip, riderLocation]);

  // Fetch routes when order and location are available
  useEffect(() => {
    if (!destination || !riderLocation) return;

    const requestId = ++routeRequestIdRef.current;
    const businessLoc: [number, number] | null = order?.pickup_location
      ? [
          parseFloat(String(order.pickup_location.lon)),
          parseFloat(String(order.pickup_location.lat)),
        ]
      : null;
    const customerLoc: [number, number] = [
      destination.location.lon,
      destination.location.lat,
    ];

    (async () => {
      try {
        const active = await getRoute(
          `route-${orderId}-active`,
          riderLocation,
          customerLoc,
          false
        );
        if (requestId !== routeRequestIdRef.current) return;
        setActiveRoute(active.geometry);
        setActiveRouteData(active);
        lastProgressRef.current = null;
        setHasArrived(false);
        if (navigationStartRef.current) {
          navigationStartRef.current = false;
          setNavigationPhase('active');
          setIsNavigating(true);
        }
      } catch {
        if (requestId !== routeRequestIdRef.current) return;
        if (navigationStartRef.current) {
          navigationStartRef.current = false;
          setActiveRouteData(null);
          setNavigationPhase('overview');
          setNavigationError('Unable to calculate route. Please try again.');
          setActiveRoute(null);
        }
      }
      if (businessLoc) {
        try {
          const ref = await getRoute(
            `route-${orderId}-business`,
            businessLoc,
            customerLoc
          );
          setReferenceRoute(ref.geometry);
        } catch {}
      }
    })();
  }, [destination, riderLocation, routeFetchNonce]);

  const handleStartNavigation = (targetDestination?: NavigationDestination) => {
    lastSmoothedHeadingRef.current = null;
    setRiderHeading(null);
    setNavigationError('');
    setActiveRoute(null);
    setActiveRouteData(null);
    setReferenceRoute(null);
    setNavigationPhase('starting');
    navigationStartRef.current = true;
    if (targetDestination) {
      setNavigationTarget(targetDestination);
    }

    // Timeout fallback using latest known real location
    const timeout = setTimeout(() => {
      if (navigationStartRef.current) {
        if (!hasRealLocationRef.current) {
          navigationStartRef.current = false;
          setNavigationPhase('overview');
          setNavigationError('Unable to get your location. Turn on location to start navigation.');
        } else {
          setRouteFetchNonce(n => n + 1);
        }
      }
    }, 3000);
    navigationTimeoutRef.current = timeout;

    if (!navigator.geolocation) {
      navigationStartRef.current = false;
      setNavigationPhase('overview');
      setNavigationError('Geolocation not supported by this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        if (navigationTimeoutRef.current) { clearTimeout(navigationTimeoutRef.current); navigationTimeoutRef.current = null; }
        hasRealLocationRef.current = true;
        const loc: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        latestRiderLocationRef.current = loc;
        setRiderLocation(loc);
        setRouteFetchNonce(n => n + 1);
      },
      (err) => {
        if (navigationTimeoutRef.current) { clearTimeout(navigationTimeoutRef.current); navigationTimeoutRef.current = null; }
        navigationStartRef.current = false;
        setActiveRouteData(null);
        setNavigationPhase('overview');
        setNavigationError('Unable to get your location. Turn on location to start navigation.');
      },
      { enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    if (effectiveTrip && destination && navigationPhase === 'overview' && !hasAutoStartedRef.current) {
      hasAutoStartedRef.current = true;
      handleStartNavigation();
    }
  }, [effectiveTrip, destination, navigationPhase]);

  const handleConfirmStopAndAdvance = () => {
    if (!effectiveTrip || !currentTripStop) return;

    const currentIndex = effectiveTrip.currentStopIndex;
    const nextIndex = currentIndex + 1;
    const nextStop = effectiveTrip.stops?.[nextIndex];

    // Reset navigation target and arrival state
    setNavigationTarget(null);
    setHasArrived(false);
    lastProgressRef.current = null;

    if (nextStop) {
      const updated = advanceTripAfterStopCompleted(effectiveTrip, currentTripStop.id);
      setReconciledTrip(updated);

      const nextDestination = stopToDestination(nextStop);
      setNavigationPhase('starting');
      navigationStartRef.current = true;
      setActiveRoute(null);
      setActiveRouteData(null);
      setRouteProgress(null);

      handleStartNavigation(nextDestination);
    } else {
      // Final stop completed
      setReconciledTrip(prev => prev ? { ...prev, status: 'completed' } : prev);
      clearActiveTrip();
      setNavigationPhase('overview');
      setActiveRoute(null);
      setActiveRouteData(null);
      setRouteProgress(null);
    }
  };

  const handlePickupConfirmed = () => {
    handleConfirmStopAndAdvance();
  };

  const handleDeliveryConfirmed = () => {
    handleConfirmStopAndAdvance();
  };

  const handleRecordEvidence = () => {
    // Placeholder for B7 evidence capture
  };

  const handleBack = () => {
    const activeOrderId = trackingOrderIdRef.current;
    if (activeOrderId) {
      sendTrackingMessage('stop_tracking', { order_id: activeOrderId });
      trackingOrderIdRef.current = null;
    }
    navigate('/');
  };

  const handleArrived = async () => {
    if (!orderId || !riderLocation) return;
    const activeOrderId = trackingOrderIdRef.current;
    if (activeOrderId === orderId) {
      sendTrackingMessage('stop_tracking', { order_id: orderId });
      trackingOrderIdRef.current = null;
    }
    try {
      await authenticatedFetch(
        `${Config.API_BASE}/delivery/orders/${orderId}/arrive?gps_lat=${riderLocation[1]}&gps_lon=${riderLocation[0]}`,
        { method: 'PUT' },
        'hakika_rider'
      );
      refetchOrders();
      if (effectiveTrip) {
        handleConfirmStopAndAdvance();
      }
      // Stay on this screen after arrival — the rider remains in the
      // delivery context so the customer details stay visible and the
      // next action (delivery confirmation) is reachable without leaving.
    } catch (e) {
      console.error('Arrive failed', e);
    }
  };



  console.log('NAV DEBUG', { order, effectiveTrip, destination, riderLocation, navigationPhase });

  if (!order && !effectiveTrip) {
    return <div style={{ padding: 24 }}>No navigation destination found. Please go back and try again.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#ffffff' }}>
      <div style={{ flex: 3, minHeight: 0, position: 'relative' }}>
        {riderLocation && (order || effectiveTrip) && (
        <NavigationMap
          key={darkMode ? 'dark' : 'light'}
          riderLocation={riderLocation}
          riderHeading={riderHeading}
          riderSpeed={riderSpeed}
          businessLocation={[
            destination?.location.lon || 0,
            destination?.location.lat || 0,
          ]}
          customerLocation={[
            destination?.location.lon || 0,
            destination?.location.lat || 0,
          ]}
          activeRoute={activeRoute}
          referenceRoute={referenceRoute}
          tripRouteGeometry={tripRouteGeometry}
          isNavigating={isNavigating}
          navigationPhase={navigationPhase}
          onArrived={handleArrived}
          order={order}
        />

        )}
        <button
          onClick={handleBack}
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            padding: '8px 16px',
            backgroundColor: '#fff',
            border: '1px solid #d1d5db',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
            zIndex: 10,
          }}
        >
          ← Back
        </button>

        <MapModeToggle
          dark={darkMode}
          onToggle={handleToggleDarkMode}
          style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}
        />

        {navigationPhase === 'active' && activeRouteData && (
          <div
            style={{
              position: 'absolute',
              top: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: '#111827',
              color: '#ffffff',
              padding: '10px 16px',
              borderRadius: 10,
              zIndex: 10,
              minWidth: 160,
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 800 }}>
              {nextManeuver?.icon || '↱'}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>
              {nextManeuver?.text || 'Continue'}
            </div>
            {nextManeuver?.distance != null && (
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
                {formatDistance(nextManeuver.distance)}
              </div>
            )}
          </div>
        )}
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 200,
          borderTop: `1px solid ${color.border}`,
          background: color.surfaceMuted,
          overflowY: 'auto',
        }}
      >
        {/* Drag-handle pill — decorative, indicates this is a sheet */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: space(2), paddingBottom: space(1) }}>
          <div style={{ width: 36, height: 4, borderRadius: radius.pill, background: color.border }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: space(3), padding: `${space(3)}px ${space(5)}px ${space(5)}px` }}>
          {/* ── Customer contact row ────────────────── */}
          {display?.phone && (
            <div
              style={{
                background: color.surface,
                border: `1px solid ${color.border}`,
                borderRadius: radius.lg,
                padding: space(4),
                boxShadow: shadow.card,
                display: 'flex',
                alignItems: 'center',
                gap: space(3),
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: radius.pill,
                  background: color.amberSoft,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <PhoneIcon size={18} color={color.amberDark} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: font.size.caption,
                    fontWeight: font.weight.semibold,
                    color: color.inkFaint,
                    letterSpacing: 0.4,
                    textTransform: 'uppercase',
                    marginBottom: 2,
                  }}
                >
                  Customer
                </div>
                <div
                  style={{
                    fontFamily: font.family,
                    fontSize: font.size.body,
                    fontWeight: font.weight.semibold,
                    color: color.ink,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {display.phone}
                </div>
              </div>
              <a
                href={`tel:${display.phone}`}
                style={{
                  height: 36,
                  padding: `0 ${space(4)}px`,
                  background: color.amber,
                  color: color.ink,
                  borderRadius: radius.pill,
                  fontWeight: font.weight.semibold,
                  fontSize: font.size.small,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: space(1.5),
                  flexShrink: 0,
                  fontFamily: font.family,
                }}
              >
                <PhoneIcon size={14} color={color.ink} />
                Call
              </a>
            </div>
          )}


          {/* ── Delivery information card ───────────── */}
          {display?.deliveryNote && display.deliveryNote.trim() && (
            <div
              style={{
                background: color.amberSoft,
                border: `1px solid #F0C97A`,
                borderLeft: `3px solid ${color.amber}`,
                borderRadius: radius.lg,
                padding: space(4),
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: space(2),
                  marginBottom: space(1.5),
                }}
              >
                <PinIcon size={16} color={color.amberDark} />
                <span
                  style={{
                    fontSize: font.size.caption,
                    fontWeight: font.weight.semibold,
                    color: color.amberDark,
                    letterSpacing: 0.4,
                    textTransform: 'uppercase',
                    fontFamily: font.family,
                  }}
                >
                  Delivery information
                </span>
              </div>
              <div
                style={{
                  fontFamily: font.family,
                  fontSize: font.size.body,
                  color: color.amberDark,
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {display.deliveryNote}
              </div>
            </div>
          )}


          {/* ── Distance & ETA ──────────────────────── */}
          {activeRouteData && routeProgress && (
            <div
              style={{
                background: color.surface,
                border: `1px solid ${color.border}`,
                borderRadius: radius.lg,
                padding: space(4),
                boxShadow: shadow.card,
                display: 'flex',
                alignItems: 'stretch',
              }}
            >
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: space(3) }}>
                <GpsIcon size={20} color={color.inkMuted} />
                <div>
                  <div
                    style={{
                      fontSize: font.size.caption,
                      fontWeight: font.weight.semibold,
                      color: color.inkFaint,
                      letterSpacing: 0.4,
                      textTransform: 'uppercase',
                      fontFamily: font.family,
                    }}
                  >
                    Distance
                  </div>
                  <div
                    style={{
                      fontFamily: font.family,
                      fontSize: font.size.bodyLarge,
                      fontWeight: font.weight.bold,
                      color: color.ink,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {formatDistance(routeProgress.remainingDistanceMeters)}
                  </div>
                </div>
              </div>
              <div style={{ width: 1, background: color.border, margin: `0 ${space(3)}px` }} />
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: space(3) }}>
                <ClockIcon size={20} color={color.inkMuted} />
                <div>
                  <div
                    style={{
                      fontSize: font.size.caption,
                      fontWeight: font.weight.semibold,
                      color: color.inkFaint,
                      letterSpacing: 0.4,
                      textTransform: 'uppercase',
                      fontFamily: font.family,
                    }}
                  >
                    ETA
                  </div>
                  <div
                    style={{
                      fontFamily: font.family,
                      fontSize: font.size.bodyLarge,
                      fontWeight: font.weight.bold,
                      color: color.ink,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {formatDuration(routeProgress.remainingDurationSeconds)}
                  </div>
                </div>
              </div>
            </div>
          )}


          {/* ── Stop header ─────────────────────────── */}
          <div
            style={{
              background: color.surface,
              border: `1px solid ${color.border}`,
              borderRadius: radius.lg,
              padding: space(4),
              boxShadow: shadow.card,
              display: 'flex',
              alignItems: 'center',
              gap: space(3),
            }}
          >
            {display?.logo && (
              <img
                src={display.logo}
                alt="Business"
                style={{
                  width: 52,
                  height: 52,
                  objectFit: 'cover',
                  borderRadius: radius.md,
                  border: `1px solid ${color.border}`,
                  flexShrink: 0,
                }}
              />
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <h2
                style={{
                  margin: 0,
                  fontFamily: font.family,
                  fontSize: font.size.title,
                  fontWeight: font.weight.bold,
                  color: color.ink,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {display?.title || 'Navigation'}
              </h2>
              <p
                style={{
                  margin: `${space(1)}px 0 0`,
                  fontFamily: font.family,
                  fontSize: font.size.small,
                  fontWeight: font.weight.medium,
                  color: color.inkMuted,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {display?.subtitle || ''}
              </p>
            </div>
          </div>

          {/* ── Items ───────────────────────────────── */}
          {display && display.items.length > 0 && (
            <div
              style={{
                background: color.surface,
                border: `1px solid ${color.border}`,
                borderRadius: radius.lg,
                padding: space(4),
                boxShadow: shadow.card,
              }}
            >
              <div
                style={{
                  fontSize: font.size.caption,
                  fontWeight: font.weight.semibold,
                  color: color.inkFaint,
                  letterSpacing: 0.4,
                  textTransform: 'uppercase',
                  marginBottom: space(2),
                }}
              >
                Items
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: space(2) }}>
                {display.items.slice(0, 3).map((item: any) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: space(3),
                      background: color.surfaceMuted,
                      borderRadius: radius.md,
                      padding: space(2),
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: radius.sm,
                        backgroundColor: color.border,
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {item.thumbnail_url ? (
                        <img
                          src={item.thumbnail_url}
                          alt={item.product_name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{ width: '100%', height: '100%', backgroundColor: color.border }} />
                      )}
                    </div>
                    <span
                      style={{
                        flex: 1,
                        fontFamily: font.family,
                        fontSize: font.size.body,
                        color: color.ink,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.product_name}
                    </span>
                    <span
                      style={{
                        fontFamily: font.family,
                        fontSize: font.size.body,
                        fontWeight: font.weight.semibold,
                        color: color.inkMuted,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      × {item.quantity}
                    </span>
                  </div>
                ))}
                {display.items.length > 3 && (
                  <span
                    style={{
                      fontFamily: font.family,
                      fontSize: font.size.small,
                      color: color.inkMuted,
                      textAlign: 'right',
                    }}
                  >
                    +{display.items.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}



          {currentStopInvalidated && (
            <div
              style={{
                background: color.amberSoft,
                border: `1px solid #F0C97A`,
                color: color.amberDark,
                padding: `${space(3)}px ${space(4)}px`,
                borderRadius: radius.md,
                fontSize: font.size.small,
                fontFamily: font.family,
              }}
            >
              This stop is no longer available. Please review remaining stops.
            </div>
          )}

          {recalculating && (
            <div
              style={{
                background: color.infoSoft,
                border: `1px solid #B9D4DD`,
                color: color.info,
                padding: `${space(3)}px ${space(4)}px`,
                borderRadius: radius.md,
                fontSize: font.size.small,
                fontFamily: font.family,
              }}
            >
              Recalculating route…
            </div>
          )}

          {currentTripStop && navigationPhase === 'active' && (
            <TripStopInfoCard
              stop={currentTripStop}
              orders={currentOrders.filter((o: Order) => currentTripStop.orderIds.includes(o.id))}
              onCall={() => {}}
              onNavigate={() => handleStartNavigation(destination || undefined)}
            />
          )}

          {currentTripStop && navigationPhase === 'active' && hasArrived && (
            <StopActionPanel
              stop={currentTripStop}
              onConfirmPickup={handlePickupConfirmed}
              onConfirmDelivery={handleDeliveryConfirmed}
              onRecordEvidence={handleRecordEvidence}
              canSubmit={!isReroutingRef.current}
            />
          )}

          {navigationError && (
            <div
              style={{
                background: color.dangerSoft,
                border: `1px solid #EBC1B6`,
                color: color.danger,
                padding: `${space(3)}px ${space(4)}px`,
                borderRadius: radius.md,
                fontSize: font.size.small,
                fontFamily: font.family,
              }}
            >
              {navigationError}
            </div>
          )}


          {/* ── Actions ─────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: space(2) }}>
            {navigationPhase === 'overview' && (
              <button
                onClick={() => handleStartNavigation()}
                style={{
                  width: '100%',
                  minHeight: 50,
                  background: color.ink,
                  color: color.surface,
                  border: 'none',
                  borderRadius: radius.md,
                  fontFamily: font.family,
                  fontWeight: font.weight.bold,
                  fontSize: font.size.bodyLarge,
                  cursor: 'pointer',
                }}
              >
                Start Navigation
              </button>
            )}

            <button
              onClick={handleArrived}
              disabled={!canMarkArrived}
              style={{
                width: '100%',
                minHeight: 54,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: space(2),
                background: color.amber,
                color: color.ink,
                border: 'none',
                borderRadius: 14,
                fontFamily: font.family,
                fontWeight: font.weight.bold,
                fontSize: font.size.bodyLarge,
                cursor: canMarkArrived ? 'pointer' : 'not-allowed',
                opacity: canMarkArrived ? 1 : 0.6,
                boxShadow: canMarkArrived ? '0 4px 12px rgba(240,166,59,0.35)' : 'none',
              }}
            >
              <CheckCircleIcon size={20} color={color.ink} />
              Mark as Arrived
            </button>

            <button
              disabled
              style={{
                width: '100%',
                minHeight: 48,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: space(2),
                background: 'transparent',
                color: color.inkMuted,
                border: `1px solid ${color.border}`,
                borderRadius: radius.md,
                fontFamily: font.family,
                fontWeight: font.weight.semibold,
                fontSize: font.size.body,
                cursor: 'not-allowed',
                opacity: 0.6,
              }}
            >
              <CameraIcon size={18} color={color.inkMuted} />
              Submit Evidence
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NavigationScreen;
