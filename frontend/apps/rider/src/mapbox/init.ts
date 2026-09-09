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

const DARK_STYLE = 'mapbox://styles/mapbox/dark-v11';
const LIGHT_STYLE = 'mapbox://styles/mapbox/streets-v12';
const DARK_MODE_KEY = 'hakika-rider-dark-mode';

export function getDarkMode(): boolean {
  try {
    const raw = localStorage.getItem(DARK_MODE_KEY);
    return raw ? JSON.parse(raw) : false; // default dark
  } catch {
    return false;
  }
}

export function setDarkMode(enabled: boolean) {
  try {
    localStorage.setItem(DARK_MODE_KEY, JSON.stringify(enabled));
  } catch {}
}

export function createCleanMap(
  container: HTMLElement,
  center: [number, number],
  zoom = 15,
  pitch = 0
): mapboxgl.Map {
  const dark = getDarkMode();
  const map = new mapboxgl.Map({
    container,
    style: dark ? DARK_STYLE : LIGHT_STYLE,
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
