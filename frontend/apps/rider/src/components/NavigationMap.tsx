import React, { useEffect, useRef, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import { createCleanMap } from '../mapbox/init';
import { createRiderMarker, createBusinessMarker, createCustomerMarker, createRiderArrowMarker } from '../mapbox/markers';
import { haversineKm } from '../utils/distance';
import { Order } from '../types/order';

interface Props {
  riderLocation: [number, number];
  riderHeading?: number | null;
  riderSpeed?: number | null;
  businessLocation: [number, number];
  customerLocation: [number, number];
  activeRoute: GeoJSON.LineString | null;
  referenceRoute: GeoJSON.LineString | null;
  tripRouteGeometry?: GeoJSON.LineString | null;
  isNavigating: boolean;
  navigationPhase?: 'overview' | 'starting' | 'active';
  onArrived: () => void;
  order?: Order | null;
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

const NICE_RADIUS_VALUES = [
  0.1, 0.2, 0.25, 0.5, 0.75, 1, 2, 3, 5, 10, 15, 20, 30, 50, 75, 100, 150, 200, 300, 500
];

function generateRadiusOptions(actualDistanceKm: number): number[] {
  if (actualDistanceKm <= 0) return [0.1];
  if (actualDistanceKm < 1) {
    const step = actualDistanceKm / 4;
    return [step, step * 2, step * 3, actualDistanceKm];
  }
  let options = NICE_RADIUS_VALUES.filter((v) => v <= actualDistanceKm);
  if (options[options.length - 1] !== actualDistanceKm) {
    options.push(actualDistanceKm);
  }
  options = Array.from(new Set(options)).sort((a, b) => a - b);
  if (options.length > 5) options = options.slice(-5);
  return options;
}

const NavigationMap: React.FC<Props> = ({
  riderLocation,
  businessLocation,
  customerLocation,
  activeRoute,
  referenceRoute,
  tripRouteGeometry = null,
  isNavigating,
  riderHeading = null,
  riderSpeed = null,
  navigationPhase = 'overview',
  onArrived,
  order,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const businessMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const customerMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const riderMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const riderEdgeMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const radiusSourceIdsRef = useRef<string[]>([]);
  const radiusLayerIdsRef = useRef<string[]>([]);
  const routeSourceIdsRef = useRef<string[]>([]);
  const routeLayerIdsRef = useRef<string[]>([]);
  const mapReadyRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const forceFitRef = useRef(false);
  const hadRouteRef = useRef(false);
  const activeRouteRef = useRef<GeoJSON.LineString | null>(null);
  const referenceRouteRef = useRef<GeoJSON.LineString | null>(null);
  const [isFollowing, setIsFollowing] = useState(true);
  const cameraBearingRef = useRef<number | null>(null);
  const programmaticMoveRef = useRef(false);

  function lerpAngle(from: number, to: number, alpha: number): number {
    const diff = ((to - from + 540) % 360) - 180;
    return (from + diff * alpha + 360) % 360;
  }
  const [showArriveButton, setShowArriveButton] = useState(false);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; html: string } | null>(null);
  const [tooltipKey, setTooltipKey] = useState<string | null>(null);
  const tooltipKeyRef = useRef<string | null>(null);
  const [expandedForRider, setExpandedForRider] = useState(false);

  const businessToCustomerKm = useMemo(() => {
    return haversineKm(
      { lat: businessLocation[1], lon: businessLocation[0] },
      { lat: customerLocation[1], lon: customerLocation[0] }
    );
  }, [businessLocation, customerLocation]);

  const radiusOptions = useMemo(
    () => generateRadiusOptions(businessToCustomerKm),
    [businessToCustomerKm]
  );

  const [selectedRadius, setSelectedRadius] = useState<number>(
    radiusOptions.length >= 2 ? radiusOptions[radiusOptions.length - 2] : radiusOptions[0]
  );

  useEffect(() => {
    if (selectedRadius > businessToCustomerKm) {
      setSelectedRadius(businessToCustomerKm);
    }
  }, [businessToCustomerKm]);

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = createCleanMap(
      mapContainer.current,
      [businessLocation[0], businessLocation[1]],
      11,
      0
    );

    const handleMapReady = () => {
      if (map.current && !map.current.isStyleLoaded()) {
        // Wait until style is truly loaded
        map.current.once('idle', handleMapReady);
    map.current.on('movestart', (e: any) => {
      if (!programmaticMoveRef.current && e.originalEvent) {
        setIsFollowing(false);
      }
    });
        return;
      }
      mapReadyRef.current = true;
      setMapReady(true);
      forceFitRef.current = true;
      renderMap();
    };

    map.current.once('idle', handleMapReady);
    map.current.on('load', () => {
      if (!mapReadyRef.current) {
        mapReadyRef.current = true;
        renderMap();
      }
    });
    setTimeout(() => {
      if (!mapReadyRef.current && map.current?.isStyleLoaded()) {
        handleMapReady();
      }
    }, 1500);

    return () => {
      map.current?.remove();
      map.current = null;
      mapReadyRef.current = false;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    if (mapReady && activeRoute) {
        renderMap();
    }
  }, [mapReady, activeRoute]);

  useEffect(() => {
    activeRouteRef.current = activeRoute;
    referenceRouteRef.current = referenceRoute;
    if (activeRoute && !hadRouteRef.current) {
      forceFitRef.current = true;
    }
    hadRouteRef.current = !!activeRoute;
    if (mapReadyRef.current) renderMap();
  }, [
    businessLocation,
    customerLocation,
    selectedRadius,
    activeRoute,
    referenceRoute,
    riderLocation,
    isNavigating,
    expandedForRider,
  ]);

  function clearRadius() {
    const m = map.current;
    if (!m) return;
    radiusLayerIdsRef.current.forEach((id) => {
      if (m.getLayer(id)) m.removeLayer(id);
    });
    radiusSourceIdsRef.current.forEach((id) => {
      if (m.getSource(id)) m.removeSource(id);
    });
    radiusLayerIdsRef.current = [];
    radiusSourceIdsRef.current = [];
  }

  function clearRoutes() {
    const m = map.current;
    if (!m) return;
    routeLayerIdsRef.current.forEach((id) => {
      if (m.getLayer(id)) m.removeLayer(id);
    });
    routeSourceIdsRef.current.forEach((id) => {
      if (m.getSource(id)) m.removeSource(id);
    });
    routeLayerIdsRef.current = [];
    routeSourceIdsRef.current = [];
  }

  function clearMarkers() {
    businessMarkerRef.current?.remove();
    businessMarkerRef.current = null;
    customerMarkerRef.current?.remove();
    customerMarkerRef.current = null;
    riderMarkerRef.current?.remove();
    riderMarkerRef.current = null;
    riderEdgeMarkerRef.current?.remove();
    riderEdgeMarkerRef.current = null;
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

  function buildBusinessTooltip() {
    const name = order?.business_name || 'Business';
    return `<div style="font-size:13px;line-height:1.4"><strong>${name}</strong></div>`;
  }

  function buildOrderTooltip() {
    const phone = order?.customer_phone || 'No phone';
    const items = order?.items || [];
    const itemRows = items
      .slice(0, 4)
      .map((item) => `<div>${item.product_name} × ${item.quantity}</div>`)
      .join('');
    const more = items.length > 4 ? `<div>+ ${items.length - 4} more</div>` : '';
    return `<div style="font-size:13px;line-height:1.4">
      <strong>${order?.order_number || ''}</strong><br/>
      📞 ${phone}<br/>
      ${itemRows}${more}<br/>
      <strong>Total: KSh ${order?.total_amount ?? ''}</strong>
    </div>`;
  }

  function buildRiderTooltip() {
    return `<div style="font-size:13px;line-height:1.4"><strong>Me</strong></div>`;
  }

  function renderMap() {
    const m = map.current;
    if (!m || !mapReadyRef.current || !m.isStyleLoaded()) return;

    clearRadius();
    clearRoutes();
    clearMarkers();

    // Business marker
    businessMarkerRef.current = createBusinessMarker()
      .setLngLat(businessLocation)
      .addTo(m);
    businessMarkerRef.current.getElement().addEventListener('click', () => {
      showTooltipAt(businessLocation, buildBusinessTooltip(), 'business');
    });

    // Customer marker
    customerMarkerRef.current = createCustomerMarker()
      .setLngLat(customerLocation)
      .addTo(m);
    customerMarkerRef.current.getElement().addEventListener('click', () => {
      showTooltipAt(customerLocation, buildOrderTooltip(), 'customer');
    });

    // Rider marker or edge indicator
    const riderDistanceFromBusiness = haversineKm(
      { lat: businessLocation[1], lon: businessLocation[0] },
      { lat: riderLocation[1], lon: riderLocation[0] }
    );

    const shouldShowRealRider = riderDistanceFromBusiness <= selectedRadius || expandedForRider;
    const effectiveRadius = expandedForRider ? riderDistanceFromBusiness : selectedRadius;

    if (shouldShowRealRider) {
      riderMarkerRef.current =
        navigationPhase === 'active'
          ? createRiderArrowMarker(riderHeading)
          : createRiderMarker();
      riderMarkerRef.current
        .setLngLat(riderLocation)
        .addTo(m);
      riderMarkerRef.current.getElement().addEventListener('click', () => {
        showTooltipAt(riderLocation, buildRiderTooltip(), 'rider');
      });
    } else {
      const bearing = bearingTo(
        { lat: businessLocation[1], lon: businessLocation[0] },
        { lat: riderLocation[1], lon: riderLocation[0] }
      );
      const edge = offsetPoint(
        businessLocation[1],
        businessLocation[0],
        selectedRadius,
        bearing
      );
      const el = document.createElement('div');
      el.style.width = '14px';
      el.style.height = '14px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = '#2563eb';
      el.style.border = '2px solid #fff';
      el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.3)';
      riderEdgeMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([edge.lon, edge.lat])
        .addTo(m);
      riderEdgeMarkerRef.current.getElement().addEventListener('click', () => {
        setExpandedForRider(true);
        forceFitRef.current = true;
        showTooltipAt([edge.lon, edge.lat], buildRiderTooltip(), 'rider-edge');
      });
    }

    // Radius circle (only show in overview/pre-start; hide during active navigation)
    if (navigationPhase !== 'active') {
      const sourceId = `delivery-radius`;
      const fillId = `${sourceId}-fill`;
      const lineId = `${sourceId}-line`;

      m.addSource(sourceId, {
        type: 'geojson',
        data: makeRadiusPolygon(businessLocation[1], businessLocation[0], effectiveRadius),
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
      radiusSourceIdsRef.current.push(sourceId);
      radiusLayerIdsRef.current.push(fillId, lineId);
    }

    if (tripRouteGeometry) {
      const sourceId = 'trip-full-route';
      const layerId = 'trip-full-route-layer';
      m.addSource(sourceId, { type: 'geojson', data: tripRouteGeometry });
      m.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': '#9ca3af',
          'line-width': 3,
          'line-opacity': 0.45,
          'line-dasharray': [2, 2],
        },
      });
      routeSourceIdsRef.current.push(sourceId);
      routeLayerIdsRef.current.push(layerId);
    }

    const currentActiveRoute = activeRouteRef.current;
    const currentReferenceRoute = referenceRouteRef.current;

    // Active route
    if (currentActiveRoute) {
      const sourceId = 'active-route';
      const layerId = 'active-route-layer';
      m.addSource(sourceId, { type: 'geojson', data: currentActiveRoute });
      m.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': '#2563eb',
          'line-width': navigationPhase === 'active' ? 6 : 5,
          'line-opacity': navigationPhase === 'active' ? 1 : 0.9,
        },
      });
      routeSourceIdsRef.current.push(sourceId);
      routeLayerIdsRef.current.push(layerId);
    }

    // Reference route
    if (currentReferenceRoute) {
      const sourceId = 'reference-route';
      const layerId = 'reference-route-layer';
      m.addSource(sourceId, { type: 'geojson', data: currentReferenceRoute });
      m.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': '#f97316',
          'line-width': navigationPhase === 'active' ? 1.5 : 3,
          'line-dasharray': [2, 2],
          'line-opacity': navigationPhase === 'active' ? 0.15 : 0.7,
        },
      });
      routeSourceIdsRef.current.push(sourceId);
      routeLayerIdsRef.current.push(layerId);
    }

    // Fit bounds only when explicitly required to avoid jumps on GPS updates
    if (forceFitRef.current) {
      forceFitRef.current = false;
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend(businessLocation);
      bounds.extend(customerLocation);
      if (shouldShowRealRider) bounds.extend(riderLocation);
      if (!bounds.isEmpty()) {
        m.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 0 });
      }
    }
  }

  // Camera behavior during active navigation
  useEffect(() => {
    if (navigationPhase === 'active' && map.current) {
      // Determine if heading should drive bearing
      if (!isFollowing) return;

      let nextBearing: number | null = null;

      if (riderSpeed === null) {
        // speed unavailable: use heading if available
        if (typeof riderHeading === 'number' && !Number.isNaN(riderHeading)) {
          nextBearing = riderHeading;
        }
      } else if (riderSpeed >= 1.5) {
        // speed sufficient: trust heading
        if (typeof riderHeading === 'number' && !Number.isNaN(riderHeading)) {
          nextBearing = riderHeading;
        }
      } else {
        // slow/stationary: retain previous bearing
        nextBearing = cameraBearingRef.current;
      }

            if (nextBearing !== null) {
        cameraBearingRef.current =
          cameraBearingRef.current === null
            ? nextBearing
            : lerpAngle(cameraBearingRef.current, nextBearing, 0.3);
      }

      programmaticMoveRef.current = true;
      map.current.easeTo({
        center: riderLocation,
        zoom: 15.5,
        bearing: cameraBearingRef.current ?? 0,
        pitch: 0,
        offset: [0, 120],
        duration: 400,
      });
      programmaticMoveRef.current = false;
    }
  }, [navigationPhase, riderLocation, riderHeading, riderSpeed, isFollowing]);

  useEffect(() => {
    if (navigationPhase === 'overview' || navigationPhase === 'starting') {
      setIsFollowing(true);
      cameraBearingRef.current = null;
    }
  }, [navigationPhase]);
  const handleRecenter = () => {
    if (!map.current || isFollowing) return;
    setIsFollowing(true);
    cameraBearingRef.current = riderHeading ?? cameraBearingRef.current;
    programmaticMoveRef.current = true;
    map.current.easeTo({
      center: riderLocation,
      zoom: 15.5,
      bearing: cameraBearingRef.current ?? 0,
      pitch: 0,
      offset: [0, 120],
      duration: 600,
    });
    programmaticMoveRef.current = false;
  };

  useEffect(() => {
    const dist = Math.sqrt(
      Math.pow(riderLocation[0] - customerLocation[0], 2) +
      Math.pow(riderLocation[1] - customerLocation[1], 2)
    );
    setShowArriveButton(dist < 0.001);
  }, [riderLocation, customerLocation]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

      {navigationPhase === 'active' && !isFollowing && (
        <button
          onClick={handleRecenter}
          style={{
            position: 'absolute',
            bottom: 24,
            right: 16,
            padding: '10px 16px',
            backgroundColor: '#1e40af',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontWeight: 700,
            zIndex: 10,
            cursor: 'pointer',
          }}
        >
          Re-center
        </button>
      )}

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

      {navigationPhase !== 'active' && (
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
        {radiusOptions.map((r) => (
          <button
            key={r}
            onClick={() => {
              setSelectedRadius(r);
              setExpandedForRider(false);
              forceFitRef.current = true;
            }}
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
      )}

      {showArriveButton && (
        <button
          onClick={onArrived}
          style={{
            position: 'absolute',
            bottom: 32,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '16px 32px',
            backgroundColor: '#10b981',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 16,
            zIndex: 10,
            cursor: 'pointer',
          }}
        >
          Arrived at Customer
        </button>
      )}
    </div>
  );
};

export default NavigationMap;
