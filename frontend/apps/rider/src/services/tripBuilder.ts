import { getMultiStopRoute } from './directions';
import type { Order } from '../types/order';

export interface TripStop {
  id: string;
  type: 'pickup' | 'delivery';
  orderIds: string[];
  businessId?: string;
  customerId?: string;
  location: { lat: number; lon: number };
  label: string;
}

export interface DeliveryTrip {
  id: string;
  orderIds: string[];
  stops: TripStop[];
  completedStopIds: string[];
  currentStopIndex: number;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  pendingNewOrderIds: string[];
  pendingRemovedOrderIds: string[];
  estimatedDistanceMeters?: number;
  estimatedDurationSeconds?: number;
}

function parseCoord(val: any): number | null {
  if (val === null || val === undefined) return null;
  const n = parseFloat(String(val).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function groupByBusiness(orders: Order[]): Map<string, Order[]> {
  const map = new Map<string, Order[]>();
  for (const order of orders) {
    const arr = map.get(order.business_id) || [];
    arr.push(order);
    map.set(order.business_id, arr);
  }
  return map;
}

export async function buildTrip(
  selectedOrders: Order[],
  riderLocation: { lat: number; lon: number }
): Promise<DeliveryTrip> {
  if (selectedOrders.length === 0) {
    throw new Error('No orders selected for trip');
  }

  if (selectedOrders.length > 5) {
    throw new Error('A maximum of 5 orders is allowed for a trip');
  }

  // Resolve valid orders
  const validOrders = selectedOrders.filter(order => {
    const pickupLat = parseCoord(order.pickup_location?.lat);
    const pickupLon = parseCoord(order.pickup_location?.lon);
    const deliveryLat = parseCoord(order.delivery_location?.lat);
    const deliveryLon = parseCoord(order.delivery_location?.lon);
    return pickupLat !== null && pickupLon !== null && deliveryLat !== null && deliveryLon !== null;
  });

  if (validOrders.length === 0) {
    throw new Error('No valid orders with complete pickup/delivery locations');
  }

  // Build stops with same-business pickup grouping
  const stops: TripStop[] = [];
  const grouped = groupByBusiness(validOrders);

  for (const [businessId, orders] of grouped.entries()) {
    const first = orders[0];
    const lat = parseCoord(first.pickup_location?.lat)!;
    const lon = parseCoord(first.pickup_location?.lon)!;

    stops.push({
      id: `pickup-${businessId}`,
      type: 'pickup',
      orderIds: orders.map(o => o.id),
      businessId,
      location: { lat, lon },
      label: first.business_name || 'Pickup',
    });
  }

  for (const order of validOrders) {
    const lat = parseCoord(order.delivery_location?.lat)!;
    const lon = parseCoord(order.delivery_location?.lon)!;
    stops.push({
      id: `delivery-${order.id}`,
      type: 'delivery',
      orderIds: [order.id],
      businessId: order.business_id,
      customerId: order.customer_id,
      location: { lat, lon },
      label: order.customer_name || order.order_number || 'Delivery',
    });
  }

  // Generate candidate sequences
  // Simplified V1: keep pickups first, then deliveries, using road-network scoring later.
  const candidateStops = [...stops];

  // We'll create one candidate for MVP: pickups first, then deliveries.
  // In B4/B5, we can refine with Mapbox scoring and valid-sequence generation.
  const waypoints: [number, number][] = [
    [riderLocation.lon, riderLocation.lat],
    ...candidateStops.map(stop => [stop.location.lon, stop.location.lat] as [number, number]),
  ];

  let estimatedDistanceMeters: number | undefined;
  let estimatedDurationSeconds: number | undefined;

  try {
    const multiRoute = await getMultiStopRoute(waypoints);
    estimatedDistanceMeters = multiRoute.distance;
    estimatedDurationSeconds = multiRoute.duration;
  } catch {
    // Leave estimates undefined if Mapbox fails
  }

  const trip: DeliveryTrip = {
    id: `trip-${Date.now()}`,
    orderIds: validOrders.map(o => o.id),
    stops: candidateStops,
    completedStopIds: [],
    currentStopIndex: 0,
    status: 'draft',
    pendingNewOrderIds: [],
    pendingRemovedOrderIds: [],
    estimatedDistanceMeters,
    estimatedDurationSeconds,
  };

  return trip;
}


export interface TripReconciliationResult {
  trip: DeliveryTrip;
  changes: string[];
  currentStopInvalidated: boolean;
}

export function reconcileTripWithActiveOrders(
  trip: DeliveryTrip,
  activeOrders: Order[]
): TripReconciliationResult {
  const activeIds = new Set(activeOrders.map(o => o.id));
  const changes: string[] = [];

  let currentStopInvalidated = false;
  const remainingStops = trip.stops.filter(stop => {
    const stillValid = stop.orderIds.some(orderId => activeIds.has(orderId));
    if (!stillValid && stop.id === trip.stops[trip.currentStopIndex]?.id) {
      currentStopInvalidated = true;
    }
    return stillValid;
  });

  const validOrderIds = trip.orderIds.filter(id => activeIds.has(id));

  const completedStopIds = trip.completedStopIds.filter(stopId =>
    trip.stops.some(s => s.id === stopId && s.orderIds.some(oid => activeIds.has(oid)))
  );

  let currentStopIndex = trip.currentStopIndex;
  if (remainingStops.length === 0) {
    currentStopIndex = 0;
  } else {
    currentStopIndex = Math.min(currentStopIndex, remainingStops.length - 1);
  }

  if (remainingStops.length !== trip.stops.length) {
    changes.push(`Removed ${trip.stops.length - remainingStops.length} unavailable stop(s)`);
  }

  const newOrderIds = activeOrders
    .filter(o => !trip.orderIds.includes(o.id))
    .map(o => o.id);

  const updatedTrip: DeliveryTrip = {
    ...trip,
    orderIds: validOrderIds,
    stops: remainingStops,
    completedStopIds,
    currentStopIndex,
    pendingNewOrderIds: newOrderIds,
    pendingRemovedOrderIds: trip.pendingRemovedOrderIds,
  };

  return {
    trip: updatedTrip,
    changes,
    currentStopInvalidated,
  };
}


export function advanceTripAfterStopCompleted(
  trip: DeliveryTrip,
  completedStopId: string
): DeliveryTrip {
  const completedStopIds = trip.completedStopIds.includes(completedStopId)
    ? trip.completedStopIds
    : [...trip.completedStopIds, completedStopId];

  const currentIndex = trip.stops.findIndex(stop => stop.id === completedStopId);
  const nextIndex = currentIndex >= 0 && currentIndex < trip.stops.length - 1
    ? currentIndex + 1
    : trip.currentStopIndex;

  return {
    ...trip,
    completedStopIds,
    currentStopIndex: nextIndex,
  };
}

