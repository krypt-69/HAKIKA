import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

const HIDDEN_LAYER_PREFIXES = [
  'poi',
  'transit',
  'aerialway',
  'building',
  'landuse',
  'water-label',
  'place-label'
];

const KEEP_LAYER_ID_SUBSTRINGS = [
  'road',
  'bridge',
  'tunnel',
  'water',
  'land',
  'road-label',
  'admin'
];

export function createCleanMap(
  container: HTMLElement,
  center: [number, number],
  zoom = 15,
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
      const id = layer.id || '';
      // Show only road names, place/town labels, and boundary/admin names.
      // Hide all other symbol layers (POI, transit, etc.).
      if (layer.type === 'symbol') {
        const show =
          id.includes('road-label') ||
          id.includes('place-label') ||
          id.includes('boundary') ||
          id.includes('admin');

        if (!show) {
          hiddenIds.push(id);
        }
      }
    });

    hiddenIds.forEach(id => {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', 'none');
      }
    });
  });

  return map;
}
