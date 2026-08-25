import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { createCleanMap } from '../mapbox/init';
import type { TripStop } from '../services/tripBuilder';

interface Props {
  riderLocation: { lat: number; lon: number };
  stops: TripStop[];
  routeGeometry: GeoJSON.LineString | null;
}

const TripPreviewMap: React.FC<Props> = ({ riderLocation, stops, routeGeometry }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const routeReadyRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = createCleanMap(
      containerRef.current,
      [riderLocation.lon, riderLocation.lat],
      11,
      0
    );
    mapRef.current = map;
    routeReadyRef.current = false;

    const handleReady = () => {
      if (!map.isStyleLoaded()) {
        map.once('idle', handleReady);
        return;
      }

      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend([riderLocation.lon, riderLocation.lat]);

      const seenCoords = new Map<string, number>();

      stops.forEach((stop, index) => {
        const baseLngLat: [number, number] = [stop.location.lon, stop.location.lat];
        const key = `${stop.location.lat.toFixed(5)},${stop.location.lon.toFixed(5)}`;
        const count = (seenCoords.get(key) || 0) + 1;
        seenCoords.set(key, count);

        // Small offset for overlapping markers
        const offsetLat = (count - 1) * 0.00025;
        const offsetLon = (count - 1) * 0.00025;
        const markerLngLat: [number, number] = [
          baseLngLat[0] + offsetLon,
          baseLngLat[1] + offsetLat,
        ];

        const el = document.createElement('div');
        el.style.width = '24px';
        el.style.height = '24px';
        el.style.borderRadius = '50%';
        el.style.backgroundColor = stop.type === 'pickup' ? '#16a34a' : '#ef4444';
        el.style.color = '#fff';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.fontSize = '12px';
        el.style.fontWeight = '700';
        el.style.border = '2px solid #fff';
        el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.3)';
        el.textContent = String(index + 1);

        new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat(markerLngLat)
          .addTo(map);

        bounds.extend([stop.location.lon, stop.location.lat]);
      });

      if (routeGeometry) {
        if (map.getSource('trip-route')) {
          (map.getSource('trip-route') as mapboxgl.GeoJSONSource).setData(routeGeometry);
        } else {
          map.addSource('trip-route', {
            type: 'geojson',
            data: routeGeometry,
          });
        }

        if (!map.getLayer('trip-route-layer')) {
          map.addLayer({
            id: 'trip-route-layer',
            type: 'line',
            source: 'trip-route',
            paint: {
              'line-color': '#9ca3af',
              'line-width': 4,
              'line-opacity': 0.8,
            },
          });
        }
      }

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 0 });
      }
      routeReadyRef.current = true;
    };

    map.once('idle', handleReady);
    const timer = setTimeout(() => {
      if (!routeReadyRef.current) handleReady();
    }, 1500);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapRef.current = null;
    };
  }, [riderLocation, stops, routeGeometry]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%', borderRadius: 12 }} />;
};

export default TripPreviewMap;
