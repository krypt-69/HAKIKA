// Design tokens for the rider app.
//
// Palette rationale: riders read this screen outdoors, often in direct sun,
// glancing at it for a second at a time. Warm off-white surfaces (instead of
// stark white or cool gray) reduce glare, a single saturated marigold carries
// every "do this now" action, and status colors are muted/grounded rather
// than bright SaaS mint-green or sky-blue so they stay legible in sunlight
// and don't compete with the marigold for attention.

export const color = {
  // Ink — warm near-black instead of pure #000 (softer on a bright screen)
  ink: '#1C1917',
  inkMuted: '#57534A',
  inkFaint: '#948E85',

  // Surfaces — warm off-white, not cool gray
  surface: '#FFFFFF',
  surfaceMuted: '#F6F3EE',
  border: '#E7E1D7',

  // Brand / primary action — marigold, tuned for AA contrast with `ink` text
  amber: '#F0A63B',
  amberDark: '#8A5A14',
  amberSoft: '#FBE9C9',

  // Status: in progress / informational — grounded teal, not generic SaaS blue
  info: '#2A6B85',
  infoSoft: '#DFEDF1',

  // Status: success / arrived — muted forest, not mint
  success: '#3E7D52',
  successSoft: '#E2EEE3',

  // Status: attention / cancelled — terracotta, not fire-engine red
  danger: '#B4482F',
  dangerSoft: '#F6E3DE',
} as const;

export const font = {
  // One family for the whole app; weight and size carry the hierarchy.
  family:
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  size: {
    caption: 11.5,
    small: 13,
    body: 14.5,
    bodyLarge: 16,
    title: 19,
  },
  weight: {
    regular: 450,
    medium: 550,
    semibold: 650,
    bold: 700,
  },
} as const;

export const space = (n: number) => n * 4; // 4px base unit

export const radius = {
  sm: 8,
  md: 10,
  lg: 16,
  pill: 999,
} as const;

export const shadow = {
  card: '0 1px 2px rgba(28, 25, 23, 0.06), 0 1px 1px rgba(28, 25, 23, 0.04)',
  raised: '0 4px 14px rgba(28, 25, 23, 0.10)',
} as const;

// Central status → color mapping so every screen renders status pills the
// same way, and it's easy to add a new status without hunting through JSX.
export const statusStyle: Record<string, { fg: string; bg: string; label: string }> = {
  pending: { fg: color.inkMuted, bg: color.surfaceMuted, label: 'Pending' },
  accepted: { fg: color.info, bg: color.infoSoft, label: 'Accepted' },
  picked_up: { fg: color.info, bg: color.infoSoft, label: 'Picked up' },
  out_for_delivery: { fg: color.info, bg: color.infoSoft, label: 'Out for delivery' },
  arrived: { fg: color.success, bg: color.successSoft, label: 'Arrived' },
  delivered: { fg: color.success, bg: color.successSoft, label: 'Delivered' },
  cancelled: { fg: color.danger, bg: color.dangerSoft, label: 'Cancelled' },
};

export function getStatusStyle(status: string) {
  return (
    statusStyle[status] ?? {
      fg: color.inkMuted,
      bg: color.surfaceMuted,
      label: status.replace(/_/g, ' '),
    }
  );
}