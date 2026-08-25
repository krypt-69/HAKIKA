import type { RouteData } from './directions';

export interface RouteProgress {
  distanceTravelledMeters: number;
  remainingDistanceMeters: number;
  remainingDurationSeconds: number;
  progress: number;
  nearestPoint: [number, number];
  distanceFromRouteMeters: number;
}

const EARTH_RADIUS_M = 6371000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// Geographic haversine distance between two coordinates
function haversineMeters(a: [number, number], b: [number, number]): number {
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

function projectPointOnSegment(
  p: [number, number],
  a: [number, number],
  b: [number, number]
): { nearest: [number, number]; t: number; distanceMeters: number } {
  const ax = a[0], ay = a[1];
  const bx = b[0], by = b[1];

  // Convert to local planar approximation for projection
  const latRad = toRad(ay);
  const earthLatM = EARTH_RADIUS_M * Math.cos(latRad);
  const axM = ax * earthLatM;
  const ayM = ay * EARTH_RADIUS_M;
  const bxM = bx * earthLatM;
  const byM = by * EARTH_RADIUS_M;
  const pxM = p[0] * earthLatM;
  const pyM = p[1] * EARTH_RADIUS_M;

  const dx = bxM - axM;
  const dy = byM - ayM;
  const lenSq = dx * dx + dy * dy;

  let t = 0;
  if (lenSq > 0) {
    t = ((pxM - axM) * dx + (pyM - ayM) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
  }

  const nearestM: [number, number] = [
    ax + (bx - ax) * t,
    ay + (by - ay) * t,
  ];

  const distanceMeters = haversineMeters(p, nearestM);

  return { nearest: nearestM, t, distanceMeters };
}

export function calculateRouteProgress(
  riderPosition: [number, number],
  activeRoute: GeoJSON.LineString,
  routeDistanceMeters: number,
  routeDurationSeconds: number
): RouteProgress {
  const coords = activeRoute.coordinates;

  if (coords.length < 2) {
    return {
      distanceTravelledMeters: 0,
      remainingDistanceMeters: routeDistanceMeters,
      remainingDurationSeconds: routeDurationSeconds,
      progress: 0,
      nearestPoint: coords[0] ? (coords[0] as [number, number]) : riderPosition,
      distanceFromRouteMeters: 0,
    };
  }

  let bestDistance = Infinity;
  let bestNearest: [number, number] = coords[0] as [number, number];
  let bestAccum = 0;
  let bestT = 0;

  let accum = 0;

  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i] as [number, number];
    const b = coords[i + 1] as [number, number];
    const segLen = haversineMeters(a, b);

    const projection = projectPointOnSegment(riderPosition, a, b);
    const combinedDistance = Math.sqrt(
      projection.distanceMeters ** 2 + 1 // small penalty to avoid over‑snapping
    );

    if (combinedDistance < bestDistance) {
      bestDistance = projection.distanceMeters;
      bestNearest = projection.nearest;
      bestAccum = accum + segLen * projection.t;
      bestT = projection.t;
    }

    accum += segLen;
  }

  const progress = routeDistanceMeters > 0
    ? Math.max(0, Math.min(1, bestAccum / routeDistanceMeters))
    : 0;

  const remainingDistanceMeters = routeDistanceMeters * (1 - progress);

  const remainingDurationSeconds = routeDurationSeconds * (1 - progress);

  return {
    distanceTravelledMeters: bestAccum,
    remainingDistanceMeters,
    remainingDurationSeconds,
    progress,
    nearestPoint: bestNearest,
    distanceFromRouteMeters: bestDistance,
  };
}


export interface RouteStep {
  maneuver: {
    type?: string;
    modifier?: string;
  };
  distance: number;
  duration: number;
  geometry: any;
}

export interface ManeuverProgress {
  currentStepIndex: number;
  currentStep: RouteStep | null;
  nextStepIndex: number | null;
  nextStep: RouteStep | null;
  distanceToManeuverMeters: number;
  isArriving: boolean;
}

const ARRIVAL_THRESHOLD_METERS = 30;

function isNavigationManeuver(type?: string): boolean {
  if (!type) return false;
  const t = type.toLowerCase();
  return (
    t.includes('turn') ||
    t.includes('sharp') ||
    t.includes('u-turn') ||
    t === 'uturn' ||
    t.includes('roundabout') ||
    t.includes('merge') ||
    t.includes('fork') ||
    t.includes('ramp') ||
    t.includes('arrive')
  );
}

export function calculateManeuverProgress(
  routeData: RouteData,
  routeProgress: RouteProgress
): ManeuverProgress {
  const steps = (routeData.steps || []) as RouteStep[];
  const distanceAlongRoute = routeProgress.distanceTravelledMeters;

  if (steps.length === 0) {
    return {
      currentStepIndex: 0,
      currentStep: null,
      nextStepIndex: null,
      nextStep: null,
      distanceToManeuverMeters: 0,
      isArriving: routeProgress.remainingDistanceMeters <= ARRIVAL_THRESHOLD_METERS,
    };
  }

  // Build cumulative step positions
  let cumulative = 0;
  const stepPositions: { index: number; start: number; end: number }[] = [];

  for (let i = 0; i < steps.length; i++) {
    const start = cumulative;
    const end = cumulative + (steps[i]?.distance || 0);
    stepPositions.push({ index: i, start, end });
    cumulative = end;
  }

  // Find current step based on distance along route
  let currentStepIndex = 0;
  for (let i = 0; i < stepPositions.length; i++) {
    const { start, end } = stepPositions[i];
    if (distanceAlongRoute >= start && distanceAlongRoute < end) {
      currentStepIndex = i;
      break;
    }
    if (i === stepPositions.length - 1 && distanceAlongRoute >= end) {
      currentStepIndex = i;
    }
  }

  const currentStep = steps[currentStepIndex] || null;

  // Find next navigation maneuver
  let nextStepIndex: number | null = null;
  let nextStep: RouteStep | null = null;

  for (let i = currentStepIndex; i < steps.length; i++) {
    const step = steps[i];
    if (isNavigationManeuver(step?.maneuver?.type)) {
      nextStepIndex = i;
      nextStep = step;
      break;
    }
  }

  // If no navigation maneuver found, look from 0
  if (nextStep === null) {
    for (let i = 0; i < currentStepIndex; i++) {
      const step = steps[i];
      if (isNavigationManeuver(step?.maneuver?.type)) {
        nextStepIndex = i;
        nextStep = step;
        break;
      }
    }
  }

  // Distance to maneuver = position of next maneuver's start - current route position
  let distanceToManeuverMeters = 0;
  if (nextStepIndex !== null && stepPositions[nextStepIndex]) {
    const maneuverStart = stepPositions[nextStepIndex].start;
    distanceToManeuverMeters = Math.max(0, maneuverStart - distanceAlongRoute);
  }

  const isArriving =
    routeProgress.remainingDistanceMeters <= ARRIVAL_THRESHOLD_METERS;

  return {
    currentStepIndex,
    currentStep,
    nextStepIndex,
    nextStep,
    distanceToManeuverMeters,
    isArriving,
  };
}

