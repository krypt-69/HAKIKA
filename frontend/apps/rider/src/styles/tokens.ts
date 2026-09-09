// Design tokens — Hakika Rider
// Courier-first: high contrast, large touch targets, legible in sunlight.

export const color = {
  bg: '#F7F8FA',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F3F6',
  border: '#E4E7EC',
  borderStrong: '#D0D5DD',

  ink: '#0B1220',
  inkMuted: '#4B5568',
  inkFaint: '#8A93A6',

  amber: '#F5A623',
  amberDark: '#C9820E',
  amberSoft: '#FFF3DF',

  success: '#15803D',
  successSoft: '#E8F5EC',
  danger: '#DC2626',
  dangerSoft: '#FDECEC',
  info: '#2054C7',
  infoSoft: '#EAF0FD',
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  pill: 999,
};

export const shadow = {
  card: '0 1px 2px rgba(11,18,32,0.06), 0 1px 1px rgba(11,18,32,0.04)',
  raised: '0 8px 24px rgba(11,18,32,0.16)',
};

export const type = {
  family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  numeric: "'Inter', sans-serif",
};

export const spacing = (n: number) => `${n * 4}px`;