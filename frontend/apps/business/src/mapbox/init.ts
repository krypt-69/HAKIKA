import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

export function createBusinessMap(
  container: HTMLElement,
  center: [number, number],
  zoom = 12,
  pitch = 0
): mapboxgl.Map {
  const map = new mapboxgl.Map({
    container,
    style: 'mapbox://styles/mapbox/streets-v12',
    center,
    zoom,
    pitch,
    attributionControl: false,
  });

  map.on('load', () => {
    const layers = map.getStyle().layers || [];
    const hiddenIds: string[] = [];

    layers.forEach((layer) => {
      if (layer.type === 'symbol') {
        hiddenIds.push(layer.id || '');
      }
    });

    hiddenIds.forEach((id) => {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', 'none');
      }
    });
  });

  return map;
}
