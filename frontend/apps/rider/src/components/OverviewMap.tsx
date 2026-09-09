import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { createCleanMap, getDarkMode, setDarkMode } from '../mapbox/init';
import {
  createRiderMarker,
  createBusinessMarker,
  createCustomerMarker,
  createEdgeMarker,
} from '../mapbox/markers';
import MapModeToggle from './MapModeToggle';
import { color, radius, shadow } from '../styles/tokens';
import { Order } from '../types/order';

interface OverviewMapProps {
  orders: Order[];
  riderLocation: { lat: number; lon: number } | null;
  radiusKm?: number;
  selectedOrderId?: string | null;
  onOrderSelect?: (orderId: string) => void;
}

function num(value: any): number | null {
  if (value === null || value === undefined) return null;
  const n = parseFloat(String(value).replace(/[^\d.-]/g, ''));
  return isNaN(n) ? null : n;
}

function offsetPoint(lat: number, lon: number, km: number, bearingDeg: number) {
  const R = 6371;
  const d = km / R;
  const brng = (bearingDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lon * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) +
    Math.cos(lat1) * Math.sin(d) * Math.cos(brng)
  );

  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    );

  return {
    lat: (lat2 * 180) / Math.PI,
    lon: (lon2 * 180) / Math.PI,
  };
}

function bearingTo(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  return (Math.atan2(y, x) * 180) / Math.PI;
}

function makeRadiusPolygon(lat: number, lon: number, radiusKm: number): any {
  const coords: number[][] = [];
  for (let i = 0; i <= 360; i += 15) {
    const p = offsetPoint(lat, lon, radiusKm, i);
    coords.push([p.lon, p.lat]);
  }
  coords.push(coords[0]);

  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [coords],
    },
  };
}

const OverviewMap: React.FC<OverviewMapProps> = ({
  orders,
  riderLocation,
  radiusKm = 12,
  selectedOrderId = null,
  onOrderSelect,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const riderMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const businessMarkersMap = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const orderMarkersMap = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const dynamicSourceIdsRef = useRef<string[]>([]);
  const dynamicLayerIdsRef = useRef<string[]>([]);
  const mapReadyRef = useRef(false);

  const [selectedRadius, setSelectedRadius] = useState<number>(radiusKm);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; html: string } | null>(null);
  const [tooltipKey, setTooltipKey] = useState<string | null>(null);
  const tooltipKeyRef = useRef<string | null>(null);
  const [darkMode, setDarkModeState] = useState(() => getDarkMode());

  const handleToggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    setDarkModeState(next);
  };

  // Mount / remount the map. Depends on darkMode so toggling the style
  // (which Mapbox only reads at creation time) tears down and rebuilds
  // the map cleanly with the new style.
  useEffect(() => {
    if (!mapContainer.current) return;

    let initialCenter: [number, number] = [36.817, -1.286]; // Nairobi default only if no data
    if (riderLocation) {
      initialCenter = [riderLocation.lon, riderLocation.lat];
    } else if (orders.length > 0 && orders[0].pickup_location) {
      const loc = orders[0].pickup_location;
      initialCenter = [Number(loc.lon), Number(loc.lat)];
    }
    map.current = createCleanMap(
      mapContainer.current,
      initialCenter,
      10,
      0
    );

    mapReadyRef.current = false;

    // Use 'idle' instead of 'load' to ensure map style/source is ready.
    // Fallback timeout ensures initial render even if 'idle' doesn't fire.
    map.current.once('idle', () => {
      mapReadyRef.current = true;
      renderOverview();
    });

    const t = setTimeout(() => {
      if (!mapReadyRef.current && map.current?.isStyleLoaded()) {
        mapReadyRef.current = true;
        renderOverview();
      }
    }, 1500);

    return () => {
      clearTimeout(t);
      map.current?.remove();
      map.current = null;
      mapReadyRef.current = false;
      businessMarkersMap.current.clear();
      orderMarkersMap.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [darkMode]);

  useEffect(() => {
    if (mapReadyRef.current) renderOverview();
  }, [orders, riderLocation, selectedRadius]);

  useEffect(() => {
    updateSelectedMarker();
  }, [selectedOrderId]);

  function clearRadiusLayers() {
    const m = map.current;
    if (!m) return;

    dynamicLayerIdsRef.current.forEach((id) => {
      if (m.getLayer(id)) m.removeLayer(id);
    });
    dynamicSourceIdsRef.current.forEach((id) => {
      if (m.getSource(id)) m.removeSource(id);
    });
    dynamicLayerIdsRef.current = [];
    dynamicSourceIdsRef.current = [];
  }

  function clearMarkers() {
    businessMarkersMap.current.forEach((marker) => marker.remove());
    orderMarkersMap.current.forEach((marker) => marker.remove());
    businessMarkersMap.current.clear();
    orderMarkersMap.current.clear();
    if (riderMarkerRef.current) {
      riderMarkerRef.current.remove();
      riderMarkerRef.current = null;
    }
  }

  function updateSelectedMarker() {
    orderMarkersMap.current.forEach((marker, orderId) => {
      const el = marker.getElement();
      if (orderId === selectedOrderId) {
        el.style.width = '18px';
        el.style.height = '18px';
        el.style.borderRadius = '50%';
        el.style.boxShadow = '0 0 0 3px #ef4444';
      } else {
        el.style.width = '';
        el.style.height = '';
        el.style.boxShadow = '';
      }
    });
  }

  function showTooltipAt(lngLat: [number, number], html: string, key: string) {
    const m = map.current;
    if (!m) return;
    if (tooltipKeyRef.current === key) {
      setTooltip(null);
      setTooltipKey(null);
      tooltipKeyRef.current = null;
      return;
    }
    const p = m.project(lngLat);
    setTooltip({ x: p.x, y: p.y - 40, html });
    setTooltipKey(key);
    tooltipKeyRef.current = key;
  }

  function renderOverview() {
    const m = map.current;
    if (!m || !mapReadyRef.current || !m.isStyleLoaded()) return;

    clearRadiusLayers();
    clearMarkers();
    setTooltip(null);
    setTooltipKey(null);
    tooltipKeyRef.current = null;

    // Rider marker
    if (riderLocation) {
      riderMarkerRef.current = createRiderMarker()
        .setLngLat([riderLocation.lon, riderLocation.lat])
        .addTo(m);
      riderMarkerRef.current.getElement().addEventListener('click', () => {
        showTooltipAt([riderLocation.lon, riderLocation.lat], '<strong>Me</strong>', 'rider');
      });
    }

    const bounds = new mapboxgl.LngLatBounds();
    if (riderLocation) bounds.extend([riderLocation.lon, riderLocation.lat]);

    const businessCenters = new Map<
      string,
      { lat: number; lon: number }
    >();
    const businessNameMap = new Map<string, string>();

    for (const order of orders) {
      const bLat = num(order.pickup_location?.lat);
      const bLon = num(order.pickup_location?.lon);
      if (bLat === null || bLon === null) continue;

      // Use pickup coordinates as the business key so multiple orders
      // from the same location produce only one business marker.
      const key = `${bLat.toFixed(5)},${bLon.toFixed(5)}`;

      if (!businessCenters.has(key)) {
        businessCenters.set(key, { lat: bLat, lon: bLon });
        const name = order.business_name || 'Business';
        businessNameMap.set(key, name);

        const businessMarker = createBusinessMarker()
          .setLngLat([bLon, bLat])
          .addTo(m);
        businessMarker.getElement().addEventListener('click', () => {
          showTooltipAt(
            [bLon, bLat],
            `<strong>${businessNameMap.get(key) || 'Business'}</strong>`,
            `business-${key}`
          );
        });
        businessMarkersMap.current.set(key, businessMarker);

        const sourceId = `radius-${key}`;
        const fillId = `${sourceId}-fill`;
        const lineId = `${sourceId}-line`;

        m.addSource(sourceId, {
          type: 'geojson',
          data: makeRadiusPolygon(bLat, bLon, selectedRadius),
        });

        m.addLayer({
          id: fillId,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': '#2563eb',
            'fill-opacity': 0.04,
          },
        });

        m.addLayer({
          id: lineId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': '#2563eb',
            'line-width': 1,
            'line-opacity': 0.25,
            'line-dasharray': [1, 1],
          },
        });

        dynamicSourceIdsRef.current.push(sourceId);
        dynamicLayerIdsRef.current.push(fillId, lineId);

        bounds.extend([bLon, bLat]);
      }
    }

    for (const order of orders) {
      const bLat = num(order.pickup_location?.lat);
      const bLon = num(order.pickup_location?.lon);
      const dLat = num(order.delivery_location?.lat);
      const dLon = num(order.delivery_location?.lon);

      if (bLat === null || bLon === null || dLat === null || dLon === null) continue;

      const key = `${bLat.toFixed(5)},${bLon.toFixed(5)}`;
      const business = businessCenters.get(key);
      if (!business) continue;

      const R = 6371;
      const toRad = (v: number) => (v * Math.PI) / 180;
      const dLatRad = toRad(dLat - business.lat);
      const dLonRad = toRad(dLon - business.lon);
      const a =
        Math.sin(dLatRad / 2) ** 2 +
        Math.cos(toRad(business.lat)) *
          Math.cos(toRad(dLat)) *
          Math.sin(dLonRad / 2) ** 2;
      const distanceKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      if (distanceKm <= selectedRadius) {
        const marker = createCustomerMarker(order.id === selectedOrderId)
          .setLngLat([dLon, dLat])
          .addTo(m);

        marker.getElement().addEventListener('click', () => {
          onOrderSelect?.(order.id);
          showTooltipAt([dLon, dLat], `<div><strong>${order.order_number}</strong><br/>${order.business_name || 'Business'}<br/>${order.customer_phone || order.customer_name || 'No phone'}<br/>KES ${order.total_amount}</div>`, `order-${order.id}`);
        });

        orderMarkersMap.current.set(order.id, marker);
        bounds.extend([dLon, dLat]);
      } else {
        const bearing = bearingTo(business, { lat: dLat, lon: dLon });
        const edge = offsetPoint(business.lat, business.lon, selectedRadius, bearing);
        const marker = createEdgeMarker(order.id === selectedOrderId)
          .setLngLat([edge.lon, edge.lat])
          .addTo(m);

        marker.getElement().addEventListener('click', () => {
          onOrderSelect?.(order.id);
          showTooltipAt([edge.lon, edge.lat], `<div><strong>${order.order_number}</strong><br/>${order.business_name || 'Business'}<br/>${order.customer_phone || order.customer_name || 'No phone'}<br/>KES ${order.total_amount}</div>`, `edge-${order.id}`);
        });

        orderMarkersMap.current.set(order.id, marker);
      }
    }

    if (!bounds.isEmpty()) {
      m.fitBounds(bounds, { padding: 80, maxZoom: 13, duration: 0 });
    }
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        ref={mapContainer}
        style={{ width: '100%', height: '100%', borderRadius: 12 }}
      />

      {tooltip && (
        <div
          style={{
            position: 'absolute',
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
            backgroundColor: color.surface,
            padding: '6px 10px',
            borderRadius: radius.sm,
            boxShadow: shadow.raised,
            fontSize: 13,
            fontWeight: 600,
            zIndex: 1000,
            pointerEvents: 'none',
          }}
          dangerouslySetInnerHTML={{ __html: tooltip.html }}
        />
      )}

      <div
        style={{
          position: 'absolute',
          top: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 4,
          backgroundColor: color.surface,
          borderRadius: radius.sm,
          padding: 4,
          boxShadow: shadow.card,
          zIndex: 10,
        }}
      >
        {[3, 30, 55, 100, 180, 500].map((r) => (
          <button
            key={r}
            onClick={() => setSelectedRadius(r)}
            style={{
              padding: '6px 10px',
              border: 'none',
              borderRadius: 6,
              backgroundColor: selectedRadius === r ? color.ink : 'transparent',
              color: selectedRadius === r ? color.surface : color.inkMuted,
              fontWeight: 600,
              fontSize: 12,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {r} km
          </button>
        ))}
      </div>

      <MapModeToggle
        dark={darkMode}
        onToggle={handleToggleDarkMode}
        style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}
      />
    </div>
  );
};

export default OverviewMap;