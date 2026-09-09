import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none' as const,
});

export const GpsIcon: React.FC<IconProps> = ({ size = 18, color = 'currentColor', strokeWidth = 2 }) => (
  <svg {...base(size)} xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="3" stroke={color} strokeWidth={strokeWidth} />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </svg>
);

export const RefreshIcon: React.FC<IconProps> = ({ size = 18, color = 'currentColor', strokeWidth = 2 }) => (
  <svg {...base(size)} xmlns="http://www.w3.org/2000/svg">
    <path
      d="M3 12a9 9 0 0 1 15.4-6.4M21 12a9 9 0 0 1-15.4 6.4"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
    <path d="M18.5 3v4.5H14M5.5 21v-4.5H10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const MotorcycleIcon: React.FC<IconProps> = ({ size = 18, color = 'currentColor', strokeWidth = 1.8 }) => (
  <svg {...base(size)} xmlns="http://www.w3.org/2000/svg">
    <circle cx="5.5" cy="17.5" r="2.5" stroke={color} strokeWidth={strokeWidth} />
    <circle cx="18.5" cy="17.5" r="2.5" stroke={color} strokeWidth={strokeWidth} />
    <path
      d="M5.5 17.5h4l2-5h4.5l2.5 4.5M11.5 12.5H9l1.2-3h3.6L15 12.5"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M7.5 9.5h2.7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </svg>
);

export const CarIcon: React.FC<IconProps> = ({ size = 18, color = 'currentColor', strokeWidth = 1.8 }) => (
  <svg {...base(size)} xmlns="http://www.w3.org/2000/svg">
    <path
      d="M4 16.5V13l1.8-4.2A2 2 0 0 1 7.6 7.5h8.8a2 2 0 0 1 1.8 1.3L20 13v3.5"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
    <path d="M4 16.5h16" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <circle cx="7.5" cy="16.5" r="1.6" fill={color} />
    <circle cx="16.5" cy="16.5" r="1.6" fill={color} />
  </svg>
);

export const ProfileIcon: React.FC<IconProps> = ({ size = 18, color = 'currentColor', strokeWidth = 2 }) => (
  <svg {...base(size)} xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="8" r="3.4" stroke={color} strokeWidth={strokeWidth} />
    <path d="M5 20c1.2-3.8 4-5.6 7-5.6s5.8 1.8 7 5.6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </svg>
);

export const LogoutIcon: React.FC<IconProps> = ({ size = 18, color = 'currentColor', strokeWidth = 2 }) => (
  <svg {...base(size)} xmlns="http://www.w3.org/2000/svg">
    <path d="M9 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <path d="M13 8l4 4-4 4M9 12h8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ArchiveIcon: React.FC<IconProps> = ({ size = 18, color = 'currentColor', strokeWidth = 2 }) => (
  <svg {...base(size)} xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="4" width="18" height="4.2" rx="1" stroke={color} strokeWidth={strokeWidth} />
    <path d="M4.5 8.2V18a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8.2" stroke={color} strokeWidth={strokeWidth} />
    <path d="M9.8 12.5h4.4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </svg>
);

export const PhoneIcon: React.FC<IconProps> = ({ size = 16, color = 'currentColor', strokeWidth = 2 }) => (
  <svg {...base(size)} xmlns="http://www.w3.org/2000/svg">
    <path
      d="M6.6 3.5h2.3l1.4 3.6-1.7 1.5a11.6 11.6 0 0 0 5.3 5.3l1.5-1.7 3.6 1.4v2.3a1.6 1.6 0 0 1-1.7 1.6C11.6 17 4.5 9.9 4 4.2A1.6 1.6 0 0 1 6.6 3.5z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
  </svg>
);

export const CameraIcon: React.FC<IconProps> = ({ size = 18, color = 'currentColor', strokeWidth = 2 }) => (
  <svg {...base(size)} xmlns="http://www.w3.org/2000/svg">
    <path
      d="M4 8.5a1.5 1.5 0 0 1 1.5-1.5h1.7l1-1.6h7.6l1 1.6h1.7A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5v-9z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
    <circle cx="12" cy="13" r="3.3" stroke={color} strokeWidth={strokeWidth} />
  </svg>
);

export const CheckCircleIcon: React.FC<IconProps> = ({ size = 20, color = 'currentColor', strokeWidth = 2 }) => (
  <svg {...base(size)} xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" stroke={color} strokeWidth={strokeWidth} />
    <path d="M8 12.3l2.6 2.6L16 9.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const AlertIcon: React.FC<IconProps> = ({ size = 18, color = 'currentColor', strokeWidth = 2 }) => (
  <svg {...base(size)} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 3.5l9.3 16.1H2.7L12 3.5z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
    <path d="M12 9.5v4.2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <circle cx="12" cy="16.6" r="0.9" fill={color} />
  </svg>
);

export const NavigateIcon: React.FC<IconProps> = ({ size = 18, color = 'currentColor', strokeWidth = 1.8 }) => (
  <svg {...base(size)} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 3l7.5 17-7.5-4-7.5 4L12 3z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" fill={color} fillOpacity={0.12} />
  </svg>
);

export const ChevronRightIcon: React.FC<IconProps> = ({ size = 18, color = 'currentColor', strokeWidth = 2 }) => (
  <svg {...base(size)} xmlns="http://www.w3.org/2000/svg">
    <path d="M9 5l7 7-7 7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const CloseIcon: React.FC<IconProps> = ({ size = 20, color = 'currentColor', strokeWidth = 2 }) => (
  <svg {...base(size)} xmlns="http://www.w3.org/2000/svg">
    <path d="M6 6l12 12M18 6L6 18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </svg>
);