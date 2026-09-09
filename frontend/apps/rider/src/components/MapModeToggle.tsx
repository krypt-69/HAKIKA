import React from 'react';
import { color, radius, shadow } from '../styles/tokens';

interface Props {
  dark: boolean;
  onToggle: () => void;
  style?: React.CSSProperties;
}

const SunIcon: React.FC<{ size?: number; color?: string }> = ({ size = 15, color: c = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="4.2" stroke={c} strokeWidth="2" />
    <path
      d="M12 2.5v2.3M12 19.2v2.3M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.3M19.2 12h2.3M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"
      stroke={c}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const MoonIcon: React.FC<{ size?: number; color?: string }> = ({ size = 15, color: c = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5z"
      stroke={c}
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Small pill button for toggling the map style between light and dark.
 * Because Mapbox reads the style once at map creation (see mapbox/init.ts),
 * the parent map component should remount when `dark` changes
 * (e.g. via a `key={dark ? 'dark' : 'light'}` on the map component).
 */
const MapModeToggle: React.FC<Props> = ({ dark, onToggle, style }) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onToggle();
    }}
    aria-label={dark ? 'Switch to light map' : 'Switch to dark map'}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '7px 11px',
      background: color.surface,
      border: `1px solid ${color.border}`,
      borderRadius: radius.pill,
      boxShadow: shadow.card,
      fontSize: 12,
      fontWeight: 650,
      color: color.inkMuted,
      cursor: 'pointer',
      ...style,
    }}
  >
    {dark ? <MoonIcon color={color.inkMuted} /> : <SunIcon color={color.amberDark} />}
    {dark ? 'Dark' : 'Light'}
  </button>
);

export default MapModeToggle;