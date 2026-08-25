import type { Order } from '../types/order';
import type { TripStop } from './tripBuilder';

export interface NavigationDestination {
  type: 'pickup' | 'delivery';
  orderIds: string[];
  location: { lat: number; lon: number };
  label: string;
}

export function orderToDestination(order: Order): NavigationDestination {
  return {
    type: 'delivery',
    orderIds: [order.id],
    location: {
      lat: parseFloat(String(order.delivery_location?.lat)),
      lon: parseFloat(String(order.delivery_location?.lon)),
    },
    label: order.customer_name || order.order_number || 'Delivery',
  };
}

export function stopToDestination(stop: TripStop): NavigationDestination {
  return {
    type: stop.type,
    orderIds: stop.orderIds,
    location: {
      lat: stop.location.lat,
      lon: stop.location.lon,
    },
    label: stop.label,
  };
}
