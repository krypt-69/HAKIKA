import mapboxgl from 'mapbox-gl';

function svgWrapper(svgMarkup: string, size: number): HTMLDivElement {
  const el = document.createElement('div');
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))';
  el.innerHTML = svgMarkup;
  return el;
}

/**
 * Customer marker — classic map pin (teardrop) with a location dot inside.
 * Anchor is 'bottom' so the tip of the pin points exactly at the coordinate.
 */
export function createCustomerMarker(selected: boolean = false): mapboxgl.Marker {
  const size = selected ? 46 : 40;
  const fill = '#ef4444';
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 11 16 26 16 26s16-15 16-26C32 7.163 24.837 0 16 0Z"
            fill="${fill}" stroke="#ffffff" stroke-width="2"/>
      <circle cx="16" cy="16" r="6.5" fill="#ffffff"/>
      <circle cx="16" cy="16" r="3.2" fill="${fill}"/>
    </svg>`;
  const el = svgWrapper(svg, size);
  el.style.cursor = 'pointer';
  return new mapboxgl.Marker({ element: el, anchor: 'bottom' });
}

/**
 * Business marker — circular badge with a storefront icon.
 */
export function createBusinessMarker(): mapboxgl.Marker {
  const size = 40;
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="18" fill="#16a34a" stroke="#ffffff" stroke-width="3"/>
      <g transform="translate(9,10)" fill="#ffffff">
        <path d="M0 3.5L2 0h18l2 3.5v2a2.5 2.5 0 0 1-2.5 2.5A2.5 2.5 0 0 1 17 5.5 2.5 2.5 0 0 1 14.5 8 2.5 2.5 0 0 1 12 5.5 2.5 2.5 0 0 1 9.5 8 2.5 2.5 0 0 1 7 5.5 2.5 2.5 0 0 1 4.5 8 2.5 2.5 0 0 1 2 5.5 2.5 2.5 0 0 1 0 5.5v-2Z"/>
        <path d="M1.5 8.6h19v9.4a1 1 0 0 1-1 1h-17a1 1 0 0 1-1-1V8.6Z" opacity="0.95"/>
        <rect x="8" y="12" width="5" height="7" fill="#16a34a"/>
      </g>
    </svg>`;
  const el = svgWrapper(svg, size);
  el.style.cursor = 'pointer';
  return new mapboxgl.Marker({ element: el, anchor: 'center' });
}

/**
 * Rider marker — used in overview / non-active phases.
 * Circular badge with a motorcycle/scooter icon.
 */
export function createRiderMarker(): mapboxgl.Marker {
  const size = 40;
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="18" fill="#2563eb" stroke="#ffffff" stroke-width="3"/>
      <g transform="translate(6,11)" fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="4" cy="15" r="3.4" fill="#ffffff" stroke="none"/>
        <circle cx="23" cy="15" r="3.4" fill="#ffffff" stroke="none"/>
        <path d="M4 15h6l3-6h5"/>
        <path d="M13 9h4l3 4.5"/>
        <path d="M20 13.5h3"/>
        <path d="M9 6.5h4l1.5 2.5"/>
        <circle cx="9" cy="6.5" r="1.6" fill="#ffffff" stroke="none"/>
      </g>
    </svg>`;
  const el = svgWrapper(svg, size);
  el.style.cursor = 'pointer';
  return new mapboxgl.Marker({ element: el, anchor: 'center' });
}

/**
 * Edge indicator — small dot used when a point is off-screen.
 * (Kept for compatibility; no longer used for the rider during active nav.)
 */
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

/**
 * Rider arrow marker — used during active navigation.
 * A rounded navigation chevron, easier to read at a glance than a sharp triangle.
 */
export function createRiderArrowMarker(heading?: number | null): mapboxgl.Marker {
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
  return new mapboxgl.Marker({
    element: el,
    anchor: 'center',
    rotation: safeHeading,
    rotationAlignment: 'map',
  });
}