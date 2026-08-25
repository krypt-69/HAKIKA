import mapboxgl from 'mapbox-gl';

export function createBusinessMarker(selected: boolean = false): mapboxgl.Marker {
  if (selected) {
    const el = document.createElement('div');
    el.style.width = '18px';
    el.style.height = '18px';
    el.style.borderRadius = '50%';
    el.style.backgroundColor = '#16a34a';
    el.style.border = '3px solid #fff';
    el.style.boxShadow = '0 0 0 3px #16a34a';
    return new mapboxgl.Marker({ element: el, anchor: 'center' });
  }
  return new mapboxgl.Marker({ color: '#16a34a' });
}

export function createOrderMarker(selected: boolean = false): mapboxgl.Marker {
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
  el.style.width = selected ? '18px' : '14px';
  el.style.height = selected ? '18px' : '14px';
  el.style.borderRadius = '50%';
  el.style.backgroundColor = '#f97316';
  el.style.border = selected ? '3px solid #fff' : '2px solid #fff';
  el.style.boxShadow = selected
    ? '0 0 0 3px #f97316'
    : '0 1px 4px rgba(0,0,0,0.3)';
  return new mapboxgl.Marker({ element: el, anchor: 'center' });
}
