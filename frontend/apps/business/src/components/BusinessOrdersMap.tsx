import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { createBusinessMap } from '../mapbox/init';
import {
  createBusinessMarker,
  createOrderMarker,
  createEdgeMarker,
} from '../mapbox/markers';

interface BusinessOrder {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  customer_phone?: string | null;
  delivery_location?: { lat: number | string; lon: number | string } | null;
  items?: Array<{
    id: string;
    product_name: string;
    unit_price: number;
    quantity: number;
    thumbnail_url?: string | null;
  }>;
}

interface BusinessOrdersMapProps {
  businessLocation: { lat: number; lon: number };
  acceptedOrders: BusinessOrder[];
  radiusKm?: number;
}

function toNum(value: any): number | null {
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
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng)
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    );
  return { lat: (lat2 * 180) / Math.PI, lon: (lon2 * 180) / Math.PI };
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
    geometry: { type: 'Polygon', coordinates: [coords] },
  };
}

const BusinessOrdersMap: React.FC<BusinessOrdersMapProps> = ({
  businessLocation,
  acceptedOrders,
  radiusKm = 30,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const businessMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const orderMarkersMapRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const dynamicSourceIdsRef = useRef<string[]>([]);
  const dynamicLayerIdsRef = useRef<string[]>([]);
  const mapReadyRef = useRef(false);

  const [selectedRadius, setSelectedRadius] = useState<number>(radiusKm);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; html: string } | null>(null);
  const [tooltipKey, setTooltipKey] = useState<string | null>(null);
  const tooltipKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = createBusinessMap(
      mapContainer.current,
      [businessLocation.lon, businessLocation.lat],
      10,
      0
    );

    // Use 'idle' instead of 'load' to ensure the map has fully rendered
    // all style/tile data before we add markers, radius, and fitBounds.
    map.current.once('idle', () => {
      mapReadyRef.current = true;
      renderMap();
    });

    // Fallback in case 'idle' is never fired
    setTimeout(() => {
      if (!mapReadyRef.current && map.current?.isStyleLoaded()) {
        mapReadyRef.current = true;
        renderMap();
      }
    }, 1500);

    return () => {
      map.current?.remove();
      map.current = null;
      mapReadyRef.current = false;
      orderMarkersMapRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (mapReadyRef.current) {
      renderMap();
    }
  }, [acceptedOrders, businessLocation, selectedRadius]);

  useEffect(() => {
    updateSelectedMarker();
  }, [selectedOrderId]);

  function clearDynamic() {
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

    orderMarkersMapRef.current.forEach((marker) => marker.remove());
    orderMarkersMapRef.current.clear();

    setTooltip(null);
    setTooltipKey(null);
    tooltipKeyRef.current = null;
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

  function buildOrderTooltip(order: BusinessOrder): string {
    const phone = order.customer_phone || 'No phone';
    const itemRows = (order.items || [])
      .slice(0, 4)
      .map(
        (item) =>
          `<div>${item.product_name} × ${item.quantity}</div>`
      )
      .join('');
    const more = (order.items || []).length > 4
      ? `<div>+ ${(order.items || []).length - 4} more</div>`
      : '';
    return `<div style="font-size:13px;line-height:1.4">
      <strong>${order.order_number}</strong><br/>
      📞 ${phone}<br/>
      ${itemRows}${more}<br/>
      <strong>Total: KSh ${order.total_amount}</strong>
    </div>`;
  }

  function updateSelectedMarker() {
    if (!map.current) return;
    orderMarkersMapRef.current.forEach((marker, orderId) => {
      const el = marker.getElement() as HTMLElement;
      if (orderId === selectedOrderId) {
        el.style.width = '18px';
        el.style.height = '18px';
        el.style.borderRadius = '50%';
        el.style.boxShadow = '0 0 0 3px #ef4444';
        el.style.backgroundColor = '#ef4444';
        el.style.border = '3px solid #fff';
        el.style.zIndex = '60';
      } else {
        el.style.width = '';
        el.style.height = '';
        el.style.boxShadow = '';
        el.style.backgroundColor = '';
        el.style.border = '';
        el.style.zIndex = '50';
      }
    });
  }

  function renderMap() {
    const m = map.current;
    if (!m || !mapReadyRef.current || !m.isStyleLoaded()) return;

    clearDynamic();

    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([businessLocation.lon, businessLocation.lat]);

    // Business marker
    businessMarkerRef.current?.remove();
    businessMarkerRef.current = createBusinessMarker()
      .setLngLat([businessLocation.lon, businessLocation.lat])
      .addTo(m);
    const bizEl = businessMarkerRef.current.getElement() as HTMLElement;
    bizEl.style.zIndex = '100';
    bizEl.style.width = '22px';
    bizEl.style.height = '22px';
    bizEl.style.borderRadius = '50%';
    bizEl.style.backgroundColor = '#16a34a';
    bizEl.style.border = '3px solid #ffffff';
    bizEl.style.boxShadow = '0 0 0 3px #16a34a';
    bizEl.addEventListener('click', () => {
      showTooltipAt(
        [businessLocation.lon, businessLocation.lat],
        '<strong>Business</strong>',
        'business'
      );
    });

    // Radius polygon
    const sourceId = `business-radius`;
    const fillId = `${sourceId}-fill`;
    const lineId = `${sourceId}-line`;

    m.addSource(sourceId, {
      type: 'geojson',
      data: makeRadiusPolygon(businessLocation.lat, businessLocation.lon, selectedRadius),
    });
    m.addLayer({
      id: fillId,
      type: 'fill',
      source: sourceId,
      paint: { 'fill-color': '#2563eb', 'fill-opacity': 0.04 },
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

    const R = 6371;
    const toRad = (v: number) => (v * Math.PI) / 180;

    for (const order of acceptedOrders) {
      const dLat = toNum(order.delivery_location?.lat);
      const dLon = toNum(order.delivery_location?.lon);
      if (dLat === null || dLon === null) continue;

      const dLatRad = toRad(dLat - businessLocation.lat);
      const dLonRad = toRad(dLon - businessLocation.lon);
      const a =
        Math.sin(dLatRad / 2) ** 2 +
        Math.cos(toRad(businessLocation.lat)) *
          Math.cos(toRad(dLat)) *
          Math.sin(dLonRad / 2) ** 2;
      const distanceKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      let marker: mapboxgl.Marker;
      let lngLat: [number, number];

      if (distanceKm <= selectedRadius) {
        marker = createOrderMarker(order.id === selectedOrderId);
        lngLat = [dLon, dLat];
      } else {
        const bearing = bearingTo(businessLocation, { lat: dLat, lon: dLon });
        const edge = offsetPoint(businessLocation.lat, businessLocation.lon, selectedRadius, bearing);
        marker = createEdgeMarker(order.id === selectedOrderId);
        lngLat = [edge.lon, edge.lat];
      }

      marker.setLngLat(lngLat).addTo(m);
      const orderEl = marker.getElement() as HTMLElement;
      orderEl.style.zIndex = '50';
      marker.getElement().addEventListener('click', () => {
        setSelectedOrderId(order.id);
        showTooltipAt(lngLat, buildOrderTooltip(order), `order-${order.id}`);
      });

      orderMarkersMapRef.current.set(order.id, marker);

      if (distanceKm <= selectedRadius) {
        bounds.extend(lngLat);
      }
    }

    if (!bounds.isEmpty()) {
      m.fitBounds(bounds, { padding: 80, maxZoom: 13, duration: 0 });
    }
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%', borderRadius: 12 }} />

      {tooltip && (
        <div
          style={{
            position: 'absolute',
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
            backgroundColor: '#ffffff',
            padding: '8px 12px',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
            fontSize: 13,
            fontWeight: 500,
            zIndex: 1000,
            pointerEvents: 'none',
            maxWidth: 220,
            opacity: 1,
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
          backgroundColor: '#ffffff',
          borderRadius: 8,
          padding: 4,
          boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
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
              backgroundColor: selectedRadius === r ? '#2563eb' : 'transparent',
              color: selectedRadius === r ? '#ffffff' : '#1f2937',
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
    </div>
  );
};

export default BusinessOrdersMap;
