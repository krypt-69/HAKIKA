import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { api } from '../api';
import { useCustomerWebSocket, RiderLocationPayload } from '../hooks/useCustomerWebSocket';

type TrackState =
  | 'loading'
  | 'not_tracking'
  | 'awaiting_location'
  | 'ok'
  | 'stale'
  | 'ended';

const STALE_AFTER_MS = 30_000;
const ROUTE_SOURCE_ID = 'rider-to-customer';
const ROUTE_LAYER_ID = 'rider-to-customer-line';

function svgWrapper(svgMarkup: string, size: number): HTMLDivElement {
  const el = document.createElement('div');
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.pointerEvents = 'none';
  el.innerHTML = svgMarkup;
  return el;
}

function createRiderArrowElement(heading?: number | null): HTMLDivElement {
  const size = 46;
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 46 46" xmlns="http://www.w3.org/2000/svg">
      <circle cx="23" cy="23" r="21" fill="#2563eb" opacity="0.18"/>
      <circle cx="23" cy="23" r="15" fill="#ffffff"/>
      <path d="M23 8 L33 32 L23 26.5 L13 32 Z"
            fill="#1d4ed8" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round"/>
    </svg>`;
  const el = svgWrapper(svg, size);
  el.style.transition = 'transform 0.25s linear';
  el.style.transformOrigin = '50% 50%';
  const safeHeading = typeof heading === 'number' && !Number.isNaN(heading) ? heading : 0;
  el.style.transform = `rotate(${safeHeading}deg)`;
  return el;
}

function parseDestination(order: any): [number, number] | null {
  if (!order) return null;
  const coords = order.delivery_coordinates ?? order.delivery_location;
  if (!coords) return null;
  if (typeof coords === 'object' && coords.type === 'Point' && Array.isArray(coords.coordinates)) {
    return [coords.coordinates[0], coords.coordinates[1]];
  }
  // WKT like: SRID=4326;POINT(lng lat)
  if (typeof coords === 'string') {
    const m = coords.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/i);
    if (m) return [parseFloat(m[1]), parseFloat(m[2])];
  }
  return null;
}

const routeCache = { key: '', geometry: null as any };

async function fetchRoadRoute(
  rider: [number, number],
  dest: [number, number],
  token: string,
): Promise<any | null> {
  // Cache by rounded rider position so we do not refetch on every GPS tick.
  const key = `${rider[0].toFixed(4)},${rider[1].toFixed(4)}|${dest[0].toFixed(4)},${dest[1].toFixed(4)}`;
  if (routeCache.key === key && routeCache.geometry) return routeCache.geometry;

  const coords = `${rider[0]},${rider[1]};${dest[0]},${dest[1]}`;
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&overview=full&access_token=${token}`;
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const data = await r.json();
    const geom = data?.routes?.[0]?.geometry;
    if (!geom) return null;
    routeCache.key = key;
    routeCache.geometry = geom;
    return geom;
  } catch {
    return null;
  }
}

// Turns a timestamp into a short "how long ago" string for the status panel.
function relativeTime(timestamp?: string): string {
  if (!timestamp) return '';
  const ms = Date.now() - Date.parse(timestamp);
  if (ms < 0 || Number.isNaN(ms)) return '';
  const seconds = Math.round(ms / 1000);
  if (seconds < 5) return 'Updated just now';
  if (seconds < 60) return `Updated ${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `Updated ${minutes} min${minutes === 1 ? '' : 's'} ago`;
  return `Last seen at ${new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

const LiveTrack: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const phone = sessionStorage.getItem('hakika_customer_phone');

  const [order, setOrder] = useState<any>(null);
  const [state, setState] = useState<TrackState>('loading');
  const [lastPayload, setLastPayload] = useState<RiderLocationPayload | null>(null);
  const [mapReady, setMapReady] = useState(false);
  // Bumped every few seconds purely to force the "Updated Xs ago" text to refresh.
  const [, setClock] = useState(0);

  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const riderMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const destMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const staleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch the order once to obtain destination coordinates
  useEffect(() => {
    if (!id) return;
    api.getOrder(id).then(setOrder).catch(() => {});
  }, [id]);

  // Keep the "Updated Xs ago" text fresh even when no new location arrives.
  useEffect(() => {
    const t = setInterval(() => setClock(c => c + 1), 5000);
    return () => clearInterval(t);
  }, []);

  const applyState = useCallback((snap: any) => {
    if (!snap) return;
    if (snap.status === 'ok') {
      const ts = snap.timestamp ? Date.parse(snap.timestamp) : Date.now();
      const isStale = Date.now() - ts > STALE_AFTER_MS;
      setLastPayload({
        latitude: snap.latitude,
        longitude: snap.longitude,
        heading: snap.heading,
        speed: snap.speed,
        timestamp: snap.timestamp,
      });
      setState(isStale ? 'stale' : 'ok');
      if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
      staleTimerRef.current = setTimeout(() => {
        setState(s => (s === 'ok' ? 'stale' : s));
      }, STALE_AFTER_MS);
    } else if (snap.status === 'awaiting_location') {
      setState('awaiting_location');
    } else if (snap.status === 'not_tracking') {
      setState(prev => (prev === 'ok' || prev === 'stale' ? 'ended' : 'not_tracking'));
    }
  }, []);

  // Initial snapshot
  useEffect(() => {
    if (!id || !phone) return;
    api.getRiderLocation(id, phone)
      .then(applyState)
      .catch(() => setState('not_tracking'));
  }, [id, phone, applyState]);

  // Live events
  const handleRiderLocation = useCallback((payload: RiderLocationPayload) => {
    setLastPayload(payload);
    setState('ok');
    if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
    staleTimerRef.current = setTimeout(() => {
      setState(s => (s === 'ok' ? 'stale' : s));
    }, STALE_AFTER_MS);
  }, []);

  // Re-fetch snapshot on reconnect
  const handleReconnect = useCallback(() => {
    if (!id || !phone) return;
    api.getRiderLocation(id, phone).then(applyState).catch(() => {});
  }, [id, phone, applyState]);

  useCustomerWebSocket(id, phone, () => {}, handleReconnect, handleRiderLocation);

  // Map lifecycle
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;
    if (!order) return;

    const token = (import.meta as any).env?.VITE_MAPBOX_TOKEN;
    if (!token) {
      console.warn('LiveTrack: missing VITE_MAPBOX_TOKEN');
      return;
    }
    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [36.817, -1.286],
      zoom: 13,
    });

    map.on('load', () => {
      // Same approach as the rider app: keep only road, place, boundary,
      // and admin label layers. Hide every other symbol layer (POI,
      // transit, shops, churches, business names, etc.).
      const layers = map.getStyle().layers || [];
      const hiddenIds: string[] = [];
      layers.forEach((layer) => {
        if (layer.type !== 'symbol') return;
        const id = layer.id || '';
        const keep =
          id.includes('road-label') ||
          id.includes('place-label') ||
          id.includes('boundary') ||
          id.includes('admin');
        if (!keep) hiddenIds.push(id);
      });
      hiddenIds.forEach(id => {
        if (map.getLayer(id)) {
          try { map.setLayoutProperty(id, 'visibility', 'none'); } catch {}
        }
      });

      map.addSource(ROUTE_SOURCE_ID, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: [] },
        },
      });
      map.addLayer({
        id: ROUTE_LAYER_ID,
        type: 'line',
        source: ROUTE_SOURCE_ID,
        paint: {
          'line-color': '#3f3f46',
          'line-width': 4,
          'line-opacity': 0.85,
        },
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
      });
      setMapReady(true);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      riderMarkerRef.current = null;
      destMarkerRef.current = null;
      setMapReady(false);
    };
  }, [order]);

  // Destination marker + initial route
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !order) return;

    const dest = parseDestination(order);
    if (dest && !destMarkerRef.current) {
      // Red pin marker for the customer's destination
      const size = 32;
      const el = document.createElement('div');
      el.style.width = `${size}px`;
      el.style.height = `${size + 10}px`;
      el.style.pointerEvents = 'none';
      el.innerHTML = `
        <svg width="${size}" height="${size + 10}" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 0C7.163 0 0 7.163 0 16c0 11 16 26 16 26s16-15 16-26C32 7.163 24.837 0 16 0Z"
                fill="#ef4444" stroke="#ffffff" stroke-width="2"/>
          <circle cx="16" cy="16" r="6.5" fill="#ffffff"/>
        </svg>`;
      destMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat(dest)
        .addTo(map);
    }
  }, [order]);

  // Rider marker + route line updates
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !lastPayload) return;

    const riderLngLat: [number, number] = [lastPayload.longitude, lastPayload.latitude];

    // Create or update rider arrow
    if (!riderMarkerRef.current) {
      const el = createRiderArrowElement(lastPayload.heading);
      riderMarkerRef.current = new mapboxgl.Marker({
        element: el,
        anchor: 'center',
        rotationAlignment: 'map',
      })
        .setLngLat(riderLngLat)
        .addTo(map);
    } else {
      riderMarkerRef.current.setLngLat(riderLngLat);
      const el = riderMarkerRef.current.getElement();
      const h = typeof lastPayload.heading === 'number' && !Number.isNaN(lastPayload.heading)
        ? lastPayload.heading
        : 0;
      el.style.transform = `rotate(${h}deg)`;
    }

    // Road route via Mapbox Directions
    const dest = parseDestination(order);
    if (!dest) return;

    const token = (import.meta as any).env?.VITE_MAPBOX_TOKEN;
    if (!token) return;

    let cancelled = false;

    (async () => {
      const geom = await fetchRoadRoute(riderLngLat, dest, token);
      if (cancelled) return;
      const source = map.getSource(ROUTE_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
      if (!source) return;

      if (geom) {
        source.setData({
          type: 'Feature',
          properties: {},
          geometry: geom,
        });
      } else {
        // Fallback: straight line only if Directions fails
        source.setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [riderLngLat, dest],
          },
        });
      }

      // Fit bounds to include rider and destination once, or when very far.
      const bounds = new mapboxgl.LngLatBounds(riderLngLat, riderLngLat);
      bounds.extend(dest);
      const zoom = map.getZoom();
      if (zoom < 10) {
        map.fitBounds(bounds, { padding: 80, duration: 800 });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lastPayload, order, mapReady]);

  // Headline shown in the status panel — short and glanceable.
  const stateLabel = (() => {
    switch (state) {
      case 'loading': return 'Loading live tracking…';
      case 'not_tracking': return 'Tracking hasn’t started yet';
      case 'awaiting_location': return 'Rider hasn’t set off yet';
      case 'ok': return 'Rider is on the way';
      case 'stale': return 'Reconnecting…';
      case 'ended': return 'Tracking has ended';
    }
  })();

  // One short supporting line explaining what that headline means, in plain language.
  const stateNote = (() => {
    switch (state) {
      case 'loading':
        return null;
      case 'not_tracking':
        return 'You’ll see your rider here once they start navigating to you.';
      case 'awaiting_location':
        return 'Your rider hasn’t started navigating to you yet. As soon as they do, you’ll see their exact position here.';
      case 'ok':
        return 'Following your rider on the road as they head your way.';
      case 'stale':
        return 'We haven’t heard from your rider’s phone in a moment. Their marker may be a little behind.';
      case 'ended':
        return 'Your rider has arrived, or tracking was turned off for this order.';
    }
  })();

  const updatedLabel = lastPayload?.timestamp ? relativeTime(lastPayload.timestamp) : '';

  const statusColor = state === 'ok' ? '#16a34a' : state === 'stale' ? '#d97706' : '#52525b';

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          padding: '10px 12px',
          background: '#ffffff',
          borderBottom: '1px solid #eee',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          style={{
            background: 'none',
            border: 'none',
            fontSize: 20,
            cursor: 'pointer',
            lineHeight: 1,
            padding: 4,
          }}
        >
          ←
        </button>
        <strong>Live tracking</strong>
      </div>

      {/* Status panel sits right under the header, above the map, so the
          rider's status is visible at a glance without scrolling. */}
      <div
        style={{
          padding: '12px 16px',
          background: '#ffffff',
          borderBottom: '1px solid #eee',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
        }}
      >
        <span
          aria-hidden
          style={{
            marginTop: 6,
            width: 10,
            height: 10,
            borderRadius: '50%',
            flexShrink: 0,
            background: statusColor,
          }}
        />
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <p style={{ margin: 0, fontWeight: 600 }}>{stateLabel}</p>
            {updatedLabel && (
              <span style={{ fontSize: 12, color: '#71717a' }}>{updatedLabel}</span>
            )}
          </div>
          {stateNote && (
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#52525b', lineHeight: 1.4 }}>
              {stateNote}
            </p>
          )}
        </div>
      </div>

      <div ref={mapContainerRef} style={{ flex: 1 }} />
    </div>
  );
};

export default LiveTrack;