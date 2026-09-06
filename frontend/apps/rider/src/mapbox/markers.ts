import mapboxgl from 'mapbox-gl';
import { getDarkMode } from './init';

export function createRiderMarker(): mapboxgl.Marker {
  return new mapboxgl.Marker({ color: '#2563eb' });
}

export function createBusinessMarker(): mapboxgl.Marker {
  const el = document.createElement('div');
  el.style.width = '22px';
  el.style.height = '22px';
  el.style.borderRadius = '50%';
  el.style.backgroundColor = '#16a34a';
  el.style.border = '3px solid #ffffff';
  el.style.boxShadow = '0 0 0 3px #16a34a';
  el.style.zIndex = '100';
  return new mapboxgl.Marker({ element: el, anchor: 'center' });
}

export function createCustomerMarker(selected: boolean = false): mapboxgl.Marker {
  if (selected) {
    const el = document.createElement('div');
    el.style.width = '18px';
    el.style.height = '18px';
    el.style.borderRadius = '50%';
    el.style.backgroundColor = '#ef4444';
    el.style.border = '3px solid #fff';
    el.style.boxShadow = '0 0 0 3px #ef4444';
    return new mapboxgl.Marker({ element: el, anchor: 'center' });
  }
  return new mapboxgl.Marker({ color: '#ef4444' });
}

export function createEdgeMarker(selected: boolean = false): mapboxgl.Marker {
  const el = document.createElement('div');
  el.style.width = '14px';
  el.style.height = '14px';
  el.style.borderRadius = '50%';
  el.style.backgroundColor = '#f97316';
  el.style.border = selected ? '3px solid #fff' : '2px solid #fff';
  el.style.boxShadow = selected ? '0 0 0 3px #f97316' : '0 1px 4px rgba(0,0,0,0.3)';
  return new mapboxgl.Marker({ element: el, anchor: 'center' });
}

export function createRiderArrowMarker(heading?: number | null): mapboxgl.Marker {
  const NS = 'http://www.w3.org/2000/svg';

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('width', '42');
  svg.setAttribute('height', '42');
  svg.setAttribute('viewBox', '0 0 24 24');

  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', 'M12 2 L22 20 L12 16 L2 20 Z');
  const dark = getDarkMode();
  path.setAttribute('fill', dark ? '#16a34a' : '#b45309');
  path.setAttribute('stroke', '#ffffff');
  path.setAttribute('stroke-width', '1.5');
  path.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(path);

  const el = document.createElement('div');
  el.appendChild(svg);

  const safeHeading = typeof heading === 'number' && !Number.isNaN(heading)
    ? heading
    : 0;

  return new mapboxgl.Marker({
    element: el,
    anchor: 'center',
    rotation: safeHeading,
  });
}

