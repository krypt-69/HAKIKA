import { get, set } from 'idb-keyval';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
const DIRECTIONS_URL = 'https://api.mapbox.com/directions/v5/mapbox/driving';

export interface RouteData {
  geometry: GeoJSON.LineString;
  distance: number;
  duration: number;
  steps: any[];
}

async function fetchRoute(origin: [number, number], destination: [number, number]): Promise<RouteData> {
  const url = `${DIRECTIONS_URL}/${origin[0]},${origin[1]};${destination[0]},${destination[1]}?geometries=geojson&steps=true&access_token=${MAPBOX_TOKEN}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('Mapbox Directions request failed');
  const data = await resp.json();
  const route = data.routes[0];
  if (!route) throw new Error('No route found');
  return {
    geometry: route.geometry,
    distance: route.distance,
    duration: route.duration,
    steps: route.legs[0]?.steps || [],
  };
}

export async function getRoute(
  cacheKey: string,
  origin: [number, number],
  destination: [number, number],
  useCache: boolean = true
): Promise<RouteData> {
  if (useCache) {
    const cached = await get(cacheKey);
    if (cached) return cached as RouteData;
  }

  const route = await fetchRoute(origin, destination);

  if (useCache) {
    await set(cacheKey, route);
  }
  return route;
}


export interface RouteLeg {
  distance: number;
  duration: number;
}

export interface MultiStopRouteData {
  geometry: GeoJSON.LineString;
  distance: number;
  duration: number;
  legs: RouteLeg[];
}

export async function getMultiStopRoute(
  waypoints: [number, number][]
): Promise<MultiStopRouteData> {
  if (waypoints.length < 2) {
    throw new Error('At least two waypoints are required for a route');
  }

  const coords = waypoints
    .map(coord => `${coord[0]},${coord[1]}`)
    .join(';');

  const url = `${DIRECTIONS_URL}/${coords}?geometries=geojson&steps=false&access_token=${MAPBOX_TOKEN}`;

  const resp = await fetch(url);
  if (!resp.ok) throw new Error('Mapbox Directions multi-stop request failed');
  const data = await resp.json();
  const route = data.routes?.[0];
  if (!route) throw new Error('No route found for multi-stop trip');

  return {
    geometry: route.geometry,
    distance: route.distance,
    duration: route.duration,
    legs: route.legs?.map((leg: any) => ({
      distance: leg.distance,
      duration: leg.duration,
    })) || [],
  };
}

