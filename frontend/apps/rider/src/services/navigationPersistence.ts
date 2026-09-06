import type { DeliveryTrip } from './tripBuilder';

const TRIP_KEY = 'hakika-rider-active-trip';
const TRIP_SELECTION_KEY = 'hakika-rider-trip-selection';

export function saveActiveTrip(trip: DeliveryTrip | null) {
  try {
    if (trip) sessionStorage.setItem(TRIP_KEY, JSON.stringify(trip));
    else sessionStorage.removeItem(TRIP_KEY);
  } catch {}
}

export function loadActiveTrip(): DeliveryTrip | null {
  try {
    const raw = sessionStorage.getItem(TRIP_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearActiveTrip() {
  try { sessionStorage.removeItem(TRIP_KEY); } catch {}
}

export function saveTripSelection(orderIds: string[], isSelecting: boolean) {
  try {
    sessionStorage.setItem(TRIP_SELECTION_KEY, JSON.stringify({ orderIds, isSelecting }));
  } catch {}
}

export function loadTripSelection(): { orderIds: string[]; isSelecting: boolean } {
  try {
    const raw = sessionStorage.getItem(TRIP_SELECTION_KEY);
    return raw ? JSON.parse(raw) : { orderIds: [], isSelecting: false };
  } catch {
    return { orderIds: [], isSelecting: false };
  }
}

export function clearTripSelection() {
  try { sessionStorage.removeItem(TRIP_SELECTION_KEY); } catch {}
}
