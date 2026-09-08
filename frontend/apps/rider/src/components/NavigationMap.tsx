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

function makeRadiusPolygon(lat: number, lon: number, radiusKm: number): any {
  const R = 6371;
  const coords: number[][] = [];
  for (let i = 0; i <= 360; i += 15) {
    const d = radiusKm / R;
    const brng = (i * Math.PI) / 180;
    const lat1 = (lat * Math.PI) / 180;
    const lon1 = (lon * Math.PI) / 180;
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng));
    const lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
    coords.push([(lon2 * 180) / Math.PI, (lat2 * 180) / Math.PI]);
  }
  coords.push(coords[0]);
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [coords] } };
}

const NICE_RADIUS_VALUES = [0.1, 0.2, 0.25, 0.5, 0.75, 1, 2, 3, 5, 10, 15, 20, 30, 50, 75, 100, 150, 200, 300, 500];

function generateRadiusOptions(actualDistanceKm: number): number[] {
  if (actualDistanceKm <= 0) return [0.1];
  if (actualDistanceKm < 1) {
    const step = actualDistanceKm / 4;
    return [step, step * 2, step * 3, actualDistanceKm];
  }
  let options = NICE_RADIUS_VALUES.filter((v) => v <= actualDistanceKm);
  if (options[options.length - 1] !== actualDistanceKm) options.push(actualDistanceKm);
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
  const riderMarkerKindRef = useRef<'dot' | 'arrow' | null>(null);
  const radiusSourceIdsRef = useRef<string[]>([]);
  const radiusLayerIdsRef = useRef<string[]>([]);
  const routeSourceIdsRef = useRef<string[]>([]);
  const routeLayerIdsRef = useRef<string[]>([]);
  const mapReadyRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const forceFitRef = useRef(false);
  const hadRouteRef = useRef(false);
  const [isFollowing, setIsFollowing] = useState(true);
  const cameraBearingRef = useRef<number | null>(null);
  const programmaticMoveRef = useRef(false);

  // Always-current refs so effects that don't list riderLocation as a dep
  // (to avoid re-triggering on every GPS tick) can still read the latest value.
  const riderLocationRef = useRef(riderLocation);
  const riderHeadingRef = useRef(riderHeading);
  useEffect(() => {
    riderLocationRef.current = riderLocation;
    riderHeadingRef.current = riderHeading;
  }, [riderLocation, riderHeading]);

  function lerpAngle(from: number, to: number, alpha: number): number {
    const diff = ((to - from + 540) % 360) - 180;
    return (from + diff * alpha + 360) % 360;
  }

  const [showArriveButton, setShowArriveButton] = useState(false);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; html: string } | null>(null);
  const tooltipKeyRef = useRef<string | null>(null);
  const [tooltipKey, setTooltipKey] = useState<string | null>(null);

  // Use primitive numbers, not array references, so memoization/effects are stable
  const [bLon, bLat] = businessLocation;
  const [cLon, cLat] = customerLocation;
  const [rLon, rLat] = riderLocation;

  const businessToCustomerKm = useMemo(
    () => haversineKm({ lat: bLat, lon: bLon }, { lat: cLat, lon: cLon }),
    [bLat, bLon, cLat, cLon]
  );

  const riderToBusinessKm = useMemo(
    () => haversineKm({ lat: bLat, lon: bLon }, { lat: rLat, lon: rLon }),
    [bLat, bLon, rLat, rLon]
  );

  const radiusOptions = useMemo(() => generateRadiusOptions(businessToCustomerKm), [businessToCustomerKm]);
  const [selectedRadius, setSelectedRadius] = useState<number>(
    radiusOptions.length >= 2 ? radiusOptions[radiusOptions.length - 2] : radiusOptions[0]
  );

  useEffect(() => {
    if (selectedRadius > businessToCustomerKm && businessToCustomerKm > 0) {
      setSelectedRadius(businessToCustomerKm);
    }
  }, [businessToCustomerKm]);

  // ---- Map init (once) ----
  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = createCleanMap(mapContainer.current, [bLon, bLat], 11, 0);

    map.current.on('movestart', (e: any) => {
      if (!programmaticMoveRef.current && e.originalEvent) {
        setIsFollowing(false);
      }
    });

    const handleMapReady = () => {
      if (map.current && !map.current.isStyleLoaded()) {
        map.current.once('idle', handleMapReady);
        return;
      }
      mapReadyRef.current = true;
      setMapReady(true);
      forceFitRef.current = true;
    };

    map.current.once('idle', handleMapReady);
    map.current.on('load', () => {
      if (!mapReadyRef.current) {
        mapReadyRef.current = true;
        setMapReady(true);
        forceFitRef.current = true;
      }
    });
    const t = setTimeout(() => {
      if (!mapReadyRef.current && map.current?.isStyleLoaded()) handleMapReady();
    }, 1500);

    return () => {
      clearTimeout(t);
      map.current?.remove();
      map.current = null;
      mapReadyRef.current = false;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearRadius() {
    const m = map.current;
    if (!m) return;
    radiusLayerIdsRef.current.forEach((id) => { if (m.getLayer(id)) m.removeLayer(id); });
    radiusSourceIdsRef.current.forEach((id) => { if (m.getSource(id)) m.removeSource(id); });
    radiusLayerIdsRef.current = [];
    radiusSourceIdsRef.current = [];
  }

  function clearRoutes() {
    const m = map.current;
    if (!m) return;
    routeLayerIdsRef.current.forEach((id) => { if (m.getLayer(id)) m.removeLayer(id); });
    routeSourceIdsRef.current.forEach((id) => { if (m.getSource(id)) m.removeSource(id); });
    routeLayerIdsRef.current = [];
    routeSourceIdsRef.current = [];
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
    const itemRows = items.slice(0, 4).map((item) => `<div>${item.product_name} × ${item.quantity}</div>`).join('');
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

  // ---- STATIC layer: business/customer markers, radius circle, routes, bounds-fit.
  // Deliberately does NOT depend on riderLocation/riderHeading (only on the ref via forceFit),
  // so GPS ticks never trigger a full teardown/rebuild -> no more blinking.
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReadyRef.current || !m.isStyleLoaded()) return;

    clearRadius();
    clearRoutes();

    businessMarkerRef.current?.remove();
    businessMarkerRef.current = createBusinessMarker().setLngLat(businessLocation).addTo(m);
    businessMarkerRef.current.getElement().addEventListener('click', () => {
      showTooltipAt(businessLocation, buildBusinessTooltip(), 'business');
    });

    customerMarkerRef.current?.remove();
    customerMarkerRef.current = createCustomerMarker().setLngLat(customerLocation).addTo(m);
    customerMarkerRef.current.getElement().addEventListener('click', () => {
      showTooltipAt(customerLocation, buildOrderTooltip(), 'customer');
    });

    // Radius circle: informational only now, hidden during active nav
    if (navigationPhase !== 'active' && selectedRadius > 0) {
      const sourceId = 'delivery-radius';
      const fillId = `${sourceId}-fill`;
      const lineId = `${sourceId}-line`;
      m.addSource(sourceId, { type: 'geojson', data: makeRadiusPolygon(bLat, bLon, selectedRadius) });
      m.addLayer({ id: fillId, type: 'fill', source: sourceId, paint: { 'fill-color': '#2563eb', 'fill-opacity': 0.04 } });
      m.addLayer({
        id: lineId, type: 'line', source: sourceId,
        paint: { 'line-color': '#2563eb', 'line-width': 1, 'line-opacity': 0.25, 'line-dasharray': [1, 1] },
      });
      radiusSourceIdsRef.current.push(sourceId);
      radiusLayerIdsRef.current.push(fillId, lineId);
    }

    if (tripRouteGeometry) {
      const sourceId = 'trip-full-route';
      const layerId = 'trip-full-route-layer';
      m.addSource(sourceId, { type: 'geojson', data: tripRouteGeometry });
      m.addLayer({
        id: layerId, type: 'line', source: sourceId,
        paint: { 'line-color': '#9ca3af', 'line-width': 3, 'line-opacity': 0.45, 'line-dasharray': [2, 2] },
      });
      routeSourceIdsRef.current.push(sourceId);
      routeLayerIdsRef.current.push(layerId);
    }

    if (activeRoute) {
      const sourceId = 'active-route';
      const layerId = 'active-route-layer';
      m.addSource(sourceId, { type: 'geojson', data: activeRoute });
      m.addLayer({
        id: layerId, type: 'line', source: sourceId,
        paint: {
          'line-color': '#2563eb',
          'line-width': navigationPhase === 'active' ? 6 : 5,
          'line-opacity': navigationPhase === 'active' ? 1 : 0.9,
        },
      });
      routeSourceIdsRef.current.push(sourceId);
      routeLayerIdsRef.current.push(layerId);
      if (!hadRouteRef.current) forceFitRef.current = true;
      hadRouteRef.current = true;
    } else {
      hadRouteRef.current = false;
    }

    if (referenceRoute) {
      const sourceId = 'reference-route';
      const layerId = 'reference-route-layer';
      m.addSource(sourceId, { type: 'geojson', data: referenceRoute });
      m.addLayer({
        id: layerId, type: 'line', source: sourceId,
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

    // Bounds-fit: business+customer+rider together, unless the rider is far
    // outside the business<->customer pair, in which case fit business+rider only.
    if (forceFitRef.current && navigationPhase !== 'active') {
      forceFitRef.current = false;
      const rLoc = riderLocationRef.current;
      const riderIsFar = businessToCustomerKm > 0 && riderToBusinessKm > businessToCustomerKm * 2.5;

      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend(businessLocation);
      if (riderIsFar) {
        bounds.extend(rLoc);
      } else {
        bounds.extend(customerLocation);
        bounds.extend(rLoc);
      }
      if (!bounds.isEmpty()) {
        m.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 300 });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, bLat, bLon, cLat, cLon, selectedRadius, activeRoute, referenceRoute, tripRouteGeometry, navigationPhase, businessToCustomerKm, riderToBusinessKm]);

  // ---- Rider marker: created once, then just moved. This is what makes
  // movement smooth instead of snapping (markers.ts adds a CSS transition).
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReadyRef.current) return;
    const kind: 'dot' | 'arrow' = navigationPhase === 'active' ? 'arrow' : 'dot';
    if (riderMarkerKindRef.current !== kind) {
      riderMarkerRef.current?.remove();
      riderMarkerRef.current = kind === 'arrow' ? createRiderArrowMarker(riderHeadingRef.current) : createRiderMarker();
      riderMarkerRef.current.setLngLat(riderLocationRef.current).addTo(m);
      riderMarkerRef.current.getElement().addEventListener('click', () => {
        showTooltipAt(riderLocationRef.current, buildRiderTooltip(), 'rider');
      });
      riderMarkerKindRef.current = kind;
    }
  }, [mapReady, navigationPhase]);

  // Rider marker position/rotation update — fires every GPS tick, but only
  // calls setLngLat/setRotation on the existing marker (no recreate, no flicker).
  useEffect(() => {
    if (riderMarkerRef.current) {
      riderMarkerRef.current.setLngLat(riderLocation);
      if (navigationPhase === 'active' && typeof riderHeading === 'number' && !Number.isNaN(riderHeading)) {
        riderMarkerRef.current.setRotation(riderHeading);
      }
    }
  }, [riderLocation, riderHeading, navigationPhase]);

  // ---- Camera follow during active navigation ----
  useEffect(() => {
    if (navigationPhase === 'active' && map.current) {
      if (!isFollowing) return;

      let nextBearing: number | null = null;
      if (riderSpeed === null) {
        if (typeof riderHeading === 'number' && !Number.isNaN(riderHeading)) nextBearing = riderHeading;
      } else if (riderSpeed >= 1.5) {
        if (typeof riderHeading === 'number' && !Number.isNaN(riderHeading)) nextBearing = riderHeading;
      } else {
        nextBearing = cameraBearingRef.current;
      }

      if (nextBearing !== null) {
        cameraBearingRef.current =
          cameraBearingRef.current === null ? nextBearing : lerpAngle(cameraBearingRef.current, nextBearing, 0.3);
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
    const dist = Math.sqrt(Math.pow(rLon - cLon, 2) + Math.pow(rLat - cLat, 2));
    setShowArriveButton(dist < 0.001);
  }, [rLon, rLat, cLon, cLat]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

      {navigationPhase === 'active' && !isFollowing && (
        <button
          onClick={handleRecenter}
          style={{
            position: 'absolute', bottom: 24, right: 16, padding: '10px 16px',
            backgroundColor: '#1e40af', color: '#fff', border: 'none', borderRadius: 8,
            fontWeight: 700, zIndex: 10, cursor: 'pointer',
          }}
        >
          Re-center
        </button>
      )}

      {tooltip && (
        <div
          style={{
            position: 'absolute', left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)',
            backgroundColor: '#ffffff', padding: '8px 12px', borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.18)', fontSize: 13, fontWeight: 500,
            zIndex: 1000, pointerEvents: 'none', maxWidth: 220, opacity: 1,
          }}
          dangerouslySetInnerHTML={{ __html: tooltip.html }}
        />
      )}

      {navigationPhase !== 'active' && (
        <div
          style={{
            position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: 4, backgroundColor: '#ffffff', borderRadius: 8, padding: 4,
            boxShadow: '0 1px 4px rgba(0,0,0,0.2)', zIndex: 10,
          }}
        >
          {radiusOptions.map((r) => (
            <button
              key={r}
              onClick={() => setSelectedRadius(r)}
              style={{
                padding: '6px 10px', border: 'none', borderRadius: 6,
                backgroundColor: selectedRadius === r ? '#2563eb' : 'transparent',
                color: selectedRadius === r ? '#ffffff' : '#1f2937',
                fontWeight: 600, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
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
            position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
            padding: '16px 32px', backgroundColor: '#10b981', color: '#fff', border: 'none',
            borderRadius: 12, fontWeight: 700, fontSize: 16, zIndex: 10, cursor: 'pointer',
          }}
        >
          Arrived at Customer
        </button>
      )}
    </div>
  );
};

export default NavigationMap;