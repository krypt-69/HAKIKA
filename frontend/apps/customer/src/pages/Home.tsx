import React, { useEffect, useLayoutEffect, useMemo, useState, useRef } from 'react';
import { Link } from "react-router-dom";
import { api } from '../api';
import { useFeedContext, BusinessCard } from '../CustomerFeedContext';
import { Config } from '@hakika/config';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const isOpenNow = (hours: any[]): boolean => {
    if (!hours || hours.length === 0) return true;
    const now = new Date();
    const dayMap = [6, 0, 1, 2, 3, 4, 5];
    const backendDay = dayMap[now.getDay()];
    const currentTime = now.getHours() * 60 + now.getMinutes();
    for (const h of hours) {
        if (h.day_of_week === backendDay) {
            if (h.is_closed) return false;
            const opens = h.opens_at ? parseInt(h.opens_at.slice(0,2))*60 + parseInt(h.opens_at.slice(3,5)) : 0;
            const closes = h.closes_at ? parseInt(h.closes_at.slice(0,2))*60 + parseInt(h.closes_at.slice(3,5)) : 1440;
            return currentTime >= opens && currentTime <= closes;
        }
    }
    return true;
};

const formatTime = (t: string): string => {
    const [hStr, mStr] = t.split(':');
    let h = parseInt(hStr, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${String(h).padStart(2, '0')}:${mStr} ${ampm}`;
};

const getStatusInfo = (hours: any[]): { open: boolean; label: string } => {
    if (!hours || hours.length === 0) return { open: true, label: '' };
    const now = new Date();
    const dayMap = [6, 0, 1, 2, 3, 4, 5];
    const backendDay = dayMap[now.getDay()];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const today = hours.find(h => h.day_of_week === backendDay);
    if (today && !today.is_closed && today.opens_at && today.closes_at) {
        const opens = parseInt(today.opens_at.slice(0,2))*60 + parseInt(today.opens_at.slice(3,5));
        const closes = parseInt(today.closes_at.slice(0,2))*60 + parseInt(today.closes_at.slice(3,5));
        if (currentMinutes >= opens && currentMinutes <= closes) {
            return { open: true, label: `Closes at ${formatTime(today.closes_at)}` };
        }
        if (currentMinutes < opens) {
            return { open: false, label: `Opens at ${formatTime(today.opens_at)}` };
        }
    }
    for (let i = 1; i <= 7; i++) {
        const idx = (backendDay + i) % 7;
        const dayHours = hours.find(h => h.day_of_week === idx);
        if (dayHours && !dayHours.is_closed && dayHours.opens_at) {
            const dayLabel = i === 1 ? 'Tomorrow' : DAYS[idx];
            return { open: false, label: `Opens at ${formatTime(dayHours.opens_at)} ${dayLabel}` };
        }
    }
    return { open: false, label: 'Closed' };
};

/* ── Design tokens ──────────────────────────────────── */
type CatColor = { name: string; ring: string; light: string; strong: string };

const CATEGORY_COLORS: CatColor[] = [
    { name: 'orange', ring: '#fb923c', light: '#ffedd5', strong: '#c2410c' },
    { name: 'green',  ring: '#22c55e', light: '#dcfce7', strong: '#15803d' },
    { name: 'pink',   ring: '#f472b6', light: '#fce7f3', strong: '#be185d' },
    { name: 'grey',   ring: '#9ca3af', light: '#f3f4f6', strong: '#4b5563' },
    { name: 'purple', ring: '#a78bfa', light: '#ede9fe', strong: '#6d28d9' },
    { name: 'maroon', ring: '#9f1239', light: '#ffe4e6', strong: '#881337' },
    { name: 'red',    ring: '#ef4444', light: '#fee2e2', strong: '#b91c1c' },
];

const DEFAULT_CAT_COLOR: CatColor = { name: 'grey', ring: '#9ca3af', light: '#f3f4f6', strong: '#4b5563' };

const RADIUS_OPTIONS = [
    { value: 1000, label: '1 km', light: '#dbeafe', strong: '#1d4ed8' },
    { value: 5000, label: '5 km', light: '#dcfce7', strong: '#15803d' },
    { value: 12000, label: '12 km', light: '#fae8ff', strong: '#a21caf' },
    { value: 20000, label: '20 km', light: '#ffedd5', strong: '#c2410c' },
];

const hexToRgba = (hex: string, alpha: number): string => {
    const clean = hex.replace('#', '');
    const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
    const bigint = parseInt(full, 16);
    const r = (bigint >> 16) & 255, g = (bigint >> 8) & 255, b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/* ── SVGs ───────────────────────────────────────────── */
const SearchSvg = ({ color = '#9ca3af', size = 15 }: { color?: string; size?: number }) =>
    React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' },
        React.createElement('circle', { cx: 11, cy: 11, r: 8 }),
        React.createElement('line', { x1: 21, y1: 21, x2: 16.65, y2: 16.65 })
    );

const LocationSvg = ({ color = '#16a34a', size = 12 }: { color?: string; size?: number }) =>
    React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
        React.createElement('path', { d: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z' }),
        React.createElement('circle', { cx: 12, cy: 10, r: 3 })
    );

const StarSvg = ({ color = '#facc15', size = 13 }: { color?: string; size?: number }) =>
    React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: color, stroke: 'none' },
        React.createElement('path', { d: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' })
    );

const CheckCircleSvg = ({ color = '#16a34a', size = 15 }: { color?: string; size?: number }) =>
    React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
        React.createElement('circle', { cx: 12, cy: 12, r: 10 }),
        React.createElement('polyline', { points: '9 12 11 14 15 10' })
    );

const XSvg = ({ color = '#374151', size = 18 }: { color?: string; size?: number }) =>
    React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' },
        React.createElement('line', { x1: 18, y1: 6, x2: 6, y2: 18 }),
        React.createElement('line', { x1: 6, y1: 6, x2: 18, y2: 18 })
    );

const CheckCircleSvgBig = CheckCircleSvg;

const SpinnerSvg = () =>
    React.createElement('svg', { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: '#16a34a', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round', style: { animation: 'spin 1s linear infinite' } },
        React.createElement('path', { d: 'M21 12a9 9 0 1 1-6.219-8.56' })
    );

const CategorySpinner: React.FC<{ size?: number; color?: string }> = ({ size = 40, color = '#16a34a' }) => {
    return (
        <div style={{
            width: size,
            height: size,
            borderRadius: '50%',
            background: `conic-gradient(from 0deg, ${color}, ${color}88, ${color})`,
            animation: 'spin 0.8s linear infinite',
            mask: 'radial-gradient(circle at 50% 50%, transparent 60%, black 61%)',
            WebkitMask: 'radial-gradient(circle at 50% 50%, transparent 60%, black 61%)',
        }} />
    );
};

const ChevronLeftSvg = () =>
    React.createElement('svg', { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' },
        React.createElement('polyline', { points: '15 18 9 12 15 6' })
    );

const ChevronRightSvg = () =>
    React.createElement('svg', { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' },
        React.createElement('polyline', { points: '9 18 15 12 9 6' })
    );

const ShopSvg = ({ size = 28 }: { size?: number }) =>
    React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: '#16a34a', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' },
        React.createElement('path', { d: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' }),
        React.createElement('polyline', { points: '9 22 9 12 15 12 15 22' })
    );

const BikeSvg = ({ size = 28 }: { size?: number }) =>
    React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: '#16a34a', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' },
        React.createElement('circle', { cx: 5.5, cy: 17.5, r: 3.5 }),
        React.createElement('circle', { cx: 18.5, cy: 17.5, r: 3.5 }),
        React.createElement('path', { d: 'M15 6h-5l-1.5 6.5M10 6l2.5 5.5' }),
        React.createElement('path', { d: 'M8.5 17.5h10l-2-8H5.5l3 8z' })
    );

const SunSvg = ({ size = 20, color = '#fff' }) =>
    React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
        React.createElement('circle', { cx: 12, cy: 12, r: 5 }),
        React.createElement('line', { x1: 12, y1: 1, x2: 12, y2: 3 }),
        React.createElement('line', { x1: 12, y1: 21, x2: 12, y2: 23 }),
        React.createElement('line', { x1: 4.22, y1: 4.22, x2: 5.64, y2: 5.64 }),
        React.createElement('line', { x1: 18.36, y1: 18.36, x2: 19.78, y2: 19.78 }),
        React.createElement('line', { x1: 1, y1: 12, x2: 3, y2: 12 }),
        React.createElement('line', { x1: 21, y1: 12, x2: 23, y2: 12 }),
        React.createElement('line', { x1: 4.22, y1: 19.78, x2: 5.64, y2: 18.36 }),
        React.createElement('line', { x1: 18.36, y1: 5.64, x2: 19.78, y2: 4.22 })
    );

const MoonSvg = ({ size = 20, color = '#fff' }) =>
    React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
        React.createElement('path', { d: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z' })
    );

/* ── Image helpers ───────────────────────────────────── */
const CoverImage: React.FC<{ src: string; alt: string; style?: React.CSSProperties }> = ({ src, alt, style }) => {
    const [failed, setFailed] = useState(false);
    if (failed || !src) return (
        <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff' }}>
            <ShopSvg />
        </div>
    );
    return <img src={src} alt={alt} style={style} onError={() => setFailed(true)} />;
};

const LogoImage: React.FC<{ id: string; logoUrl?: string | null; alt: string; style?: React.CSSProperties }> = ({ id, logoUrl, alt, style }) => {
    const [failed, setFailed] = useState(false);
    if (failed || !logoUrl) return (
        <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e5e7eb' }}>
            <ShopSvg size={20} />
        </div>
    );
    return (
        <img
            src={logoUrl}
            alt={alt}
            style={style}
            onError={() => setFailed(true)}
        />
    );
};

/* ── Zoom overlay (logo click) ───────────────────────────────────
   Mobile: centered modal, as before.
   Desktop (see .hk-zoom-box media query): the box becomes 50% of the
   viewport width, anchored to the very top so it touches the nav, and
   the logo inside grows to fill three-quarters of the box. */
const BizZoomOverlay: React.FC<{ biz: BusinessCard; open: boolean; statusLabel: string; catColor: CatColor; onClose: () => void }> = ({ biz, open, statusLabel, catColor, onClose }) => {
    return (
        <div
            onClick={onClose}
            className="hk-zoom-overlay"
        >
            <div onClick={e => e.stopPropagation()} className="hk-zoom-box" style={{ background: catColor.light }}>
                <button onClick={onClose} style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.08)', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 }}>
                    <XSvg color={catColor.strong} size={15} />
                </button>
                <LogoImage id={biz.id} logoUrl={biz.logo_url} alt={biz.name} style={{ width: '75%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: '50%', border: `4px solid ${catColor.ring}`, margin: '0 auto 14px', display: 'block' }} />
                <div style={{ fontSize: 20, fontWeight: 800, color: catColor.strong, fontFamily: 'Georgia, serif', marginBottom: 4, textAlign: 'center' }}>{biz.name}</div>
                <div style={{ fontSize: 13, color: catColor.strong, marginBottom: 10, opacity: 0.8, textAlign: 'center' }}>{biz.category_name}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 12 }}>
                    <StarSvg color="#facc15" size={15} /><StarSvg color="#facc15" size={15} /><StarSvg color="#facc15" size={15} />
                    <span style={{ fontSize: 13, color: catColor.strong, fontWeight: 700 }}>{biz.trust_score?.toFixed(0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: open ? '#052e16' : '#450a0a', borderRadius: 20, padding: '5px 14px', marginBottom: biz.address_text ? 10 : 0 }}>
                        {open && <CheckCircleSvgBig color="#4ade80" size={13} />}
                        <span style={{ fontSize: 12, fontWeight: 700, color: open ? '#4ade80' : '#f87171' }}>{open ? 'Open now' : 'Closed'}</span>
                        {statusLabel && <span style={{ fontSize: 11, color: '#9ca3af' }}>· {statusLabel}</span>}
                    </div>
                </div>
                {biz.address_text && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <LocationSvg color={catColor.strong} size={12} />
                        <span style={{ fontSize: 12, color: catColor.strong }}>{biz.address_text}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

/* ── Business card ──────────────────────────────────────────────
   One unified card style used everywhere — mobile belts and the
   desktop grid alike (previously there were two separate designs;
   now there's only this one, just laid out differently by CSS). */
const BELT_LOGO_D = 76;

const BizCard: React.FC<{ biz: BusinessCard; gpsEnabled: boolean; catColor: CatColor; darkMode: boolean }> = ({ biz, gpsEnabled, catColor, darkMode }) => {
    const [zoomed, setZoomed] = useState(false);
    const open = isOpenNow(biz.operating_hours);
    const status = getStatusInfo(biz.operating_hours);
    const bizPath = `/business/${biz.slug ?? biz.id}`;

    const pageBg = darkMode ? '#0a0a0a' : '#f9fafb';
    const cardBg = pageBg;

    return (
        <>
            <Link to={bizPath} data-business-id={biz.id} className="hk-biz-card-link">
                <div style={{ borderRadius: 12, overflow: 'visible', boxShadow: darkMode ? '0 1px 6px rgba(0,0,0,0.6)' : '0 1px 6px rgba(0,0,0,0.07)' }}>
                    <div style={{ width: '100%', aspectRatio: '1 / 1', position: 'relative', background: cardBg, overflow: 'hidden', borderRadius: '12px 12px 0 0' }}>
                        <CoverImage src={biz.cover_url} alt={biz.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        {open && <span style={{ position: 'absolute', top: 6, right: 6, background: '#16a34a', color: '#fff', fontSize: 9, fontWeight: 700, borderRadius: 4, padding: '2px 6px' }}>Open</span>}
                    </div>

                    <div style={{
                        position: 'relative',
                        background: darkMode ? pageBg : catColor.light,
                        borderRadius: '0 0 12px 12px',
                        paddingTop: 8, paddingBottom: 8, paddingLeft: BELT_LOGO_D + 16, paddingRight: 10,
                        minHeight: BELT_LOGO_D / 2
                    }}>
                        <div
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setZoomed(true); }}
                            role="button"
                            aria-label={`View ${biz.name} details`}
                            style={{ position: 'absolute', left: 10, top: -(BELT_LOGO_D / 2), width: BELT_LOGO_D, height: BELT_LOGO_D, borderRadius: '50%', border: `3px solid ${catColor.ring}`, boxShadow: '0 2px 6px rgba(0,0,0,0.15)', overflow: 'hidden', background: '#fff', cursor: 'zoom-in' }}
                        >
                            <LogoImage id={biz.id} logoUrl={biz.logo_url} alt={biz.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div className="hk-biz-name" style={{ fontWeight: 800, color: catColor.strong, fontFamily: 'Georgia, serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{biz.name}</div>
                        <div className="hk-biz-cat" style={{ fontWeight: 700, color: catColor.strong, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 3 }}>{biz.category_name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <StarSvg color="#facc15" size={11} /><StarSvg color="#facc15" size={11} /><StarSvg color="#facc15" size={11} />
                                <span className="hk-biz-trust" style={{ color: darkMode ? '#d1d5db' : '#374151', fontWeight: 800, marginLeft: 2 }}>{biz.trust_score?.toFixed(0)}</span>
                            </span>
                            {biz.address_text && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 3, minWidth: 0 }}>
                                    <LocationSvg color="#16a34a" size={10} />
                                    <span className="hk-biz-addr" style={{ fontWeight: 700, color: '#16a34a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{biz.address_text}</span>
                                </span>
                            )}
                            {gpsEnabled && biz.distance_meters ? (
                                <span className="hk-biz-dist" style={{ color: '#16a34a', fontWeight: 700, whiteSpace: 'nowrap' }}>{(biz.distance_meters / 1000).toFixed(1)}km</span>
                            ) : null}
                        </div>
                    </div>
                </div>
            </Link>
            {zoomed && <BizZoomOverlay biz={biz} open={open} statusLabel={status.label} catColor={catColor} onClose={() => setZoomed(false)} />}
        </>
    );
};

/* ── Business shelf ───────────────────────────────────────────────
   The SAME markup renders two different layouts purely via CSS:
     - Mobile: a horizontally-scrolling belt where each card is sized
       so one full card plus a quarter of the next is visible at once.
     - Desktop (≥860px): the track switches to a wrapping grid, so
       businesses fill the page like a proper storefront instead of
       a single scrolling strip. */
const BizShelf: React.FC<{ items: BusinessCard[]; gpsEnabled: boolean; label: string; categoryColorMap: Record<string, CatColor>; darkMode: boolean }> = ({ items, gpsEnabled, label, categoryColorMap, darkMode }) => {
    if (items.length === 0) return null;
    return (
        <div style={{ marginBottom: 24 }}>
            <div style={{ padding: '0 16px', marginBottom: 12 }}>
                <span style={{ fontFamily: '"Caveat", cursive', fontWeight: 700, fontSize: 24, lineHeight: 1, color: '#D4AF37', background: darkMode ? '#333' : '#6b7280', padding: '4px 16px 6px', borderRadius: 8, display: 'inline-block' }}>{label}</span>
            </div>
            <div className="hk-belt-track">
                {items.map(biz => (
                    <div key={biz.id} className="hk-belt-item">
                        <BizCard biz={biz} gpsEnabled={gpsEnabled} catColor={categoryColorMap[biz.category_name] || DEFAULT_CAT_COLOR} darkMode={darkMode} />
                    </div>
                ))}
            </div>
        </div>
    );
};

/* ── Category stories (Instagram-style, squircle + colored ring) ──
   Each avatar is a rounded-square ("squircle") rather than a plain
   circle, wrapped in a ring whose color is unique per category.
   Selecting a category zooms its avatar up and spreads the whole
   row out with extra breathing room. */
const CategoryStory: React.FC<{ label: string; active: boolean; colors: CatColor; onClick: () => void; imageUrl?: string | null; size: number }> = ({ label, active, colors, onClick, imageUrl, size }) => (
    <button onClick={onClick} className="hk-cat-story" style={{ width: size + 10 }}>
        <div className="hk-cat-ring" style={{
            width: size, height: size, borderRadius: '30%', padding: 3,
            background: active ? `linear-gradient(135deg, ${colors.ring}, ${colors.strong})` : colors.ring,
            transform: active ? 'scale(1.18)' : 'scale(1)',
        }}>
            <div style={{ width: '100%', height: '100%', borderRadius: '26%', background: colors.light, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff', overflow: 'hidden' }}>
                {imageUrl ? (
                    <img src={imageUrl} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    <span style={{ fontSize: size * 0.34, fontWeight: 800, color: colors.strong, fontFamily: 'Georgia, serif' }}>{label.charAt(0).toUpperCase()}</span>
                )}
            </div>
        </div>
        <span className="hk-cat-label" style={{ fontWeight: 700, color: colors.strong, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: size + 10 }}>{label}</span>
    </button>
);

/* ── Home ────────────────────────────────────────────── */
type BarMode = 'none' | 'search' | 'location';

const Home: React.FC = () => {
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [loadingMore, setLoadingMore] = useState(false);
    const [barMode, setBarMode] = useState<BarMode>('none');
    const [gpsLoading, setGpsLoading] = useState(false);
    const [darkMode, setDarkMode] = useState(false); // default light
    const sentinelRef = useRef<HTMLDivElement>(null);
    const catScrollRef = useRef<HTMLDivElement>(null);
    const requestIdRef = useRef(0);
    // Guards against re-running the restore-scroll effect more than once per mount
    // (e.g. if allBusinesses updates again later from pagination).
    const restoredRef = useRef(false);

    const {
        businesses: allBusinesses, nextCursor,
        searchText, selectedCategory,
        location, gpsEnabled, locationEnabled, radiusMeters,
        scrollAnchorId,
        setAllBusinesses, appendBusinesses, setNextCursor,
        setSearchText, setSelectedCategory,
        setLocation, setGpsEnabled, setLocationEnabled, setRadiusMeters,
        saveScrollAnchor, resetFeed,
    } = useFeedContext();

    const categoryColorMap = useMemo(() => {
        const map: Record<string, CatColor> = {};
        categories.forEach((c, idx) => { map[c.name] = CATEGORY_COLORS[idx % CATEGORY_COLORS.length]; });
        return map;
    }, [categories]);

    const fetchBusinesses = async (lat?: number, lon?: number, catId?: number, radius?: number, search?: string, cursor?: string) => {
        const reqId = ++requestIdRef.current;
        if (cursor) { setLoadingMore(true); }
        else { setLoading(true); setError(''); }
        try {
            const resp = await api.discover({ lat, lon, radius: radius || 5000, categoryId: catId, search, cursor });
            if (reqId !== requestIdRef.current) return;
            const incoming = resp.businesses || [];
            if (cursor) { appendBusinesses(incoming); }
            else { resetFeed(); setAllBusinesses(incoming); }
            setNextCursor(resp.next_cursor || null);
        } catch (err: any) { setError(err.message); }
        finally { setLoading(false); setLoadingMore(false); }
    };

    /** Finds whichever business card is currently nearest the top of the viewport.
     *  Uses the smallest absolute distance to the top edge, which is stable regardless
     *  of exact scroll offset — unlike a raw pixel value, this survives layout changes
     *  (spacing tweaks, image loads, different screen sizes) between visits. */
    const findTopmostVisibleBusinessId = (): string | null => {
        const cards = Array.from(
            document.querySelectorAll<HTMLElement>('[data-business-id]')
        );

        let bestId: string | null = null;
        let bestDistance = Infinity;

        for (const el of cards) {
            const rect = el.getBoundingClientRect();
            const distance = Math.abs(rect.top);
            if (distance < bestDistance) {
                bestDistance = distance;
                bestId = el.getAttribute('data-business-id');
            }
        }

        return bestId;
    };

    useEffect(() => {
        api.categories().then(setCategories).catch(() => {});
        if (allBusinesses.length === 0) { fetchBusinesses(); }
        else { restoredRef.current = false; setLoading(false); }
    }, []);

    // Continuously track which business card is nearest the top of the viewport
    // and save it as we go. This must happen WHILE the page is still visible —
    // saving it in an unmount cleanup is too late, because by the time a useEffect
    // cleanup runs, React has already removed the DOM nodes, so querying
    // [data-business-id] there finds nothing and silently resets the anchor to null.
    useEffect(() => {
        let rafId: number | null = null;
        const onScroll = () => {
            if (rafId !== null) return;
            rafId = requestAnimationFrame(() => {
                rafId = null;
                const id = findTopmostVisibleBusinessId();
                if (id) saveScrollAnchor(id);
            });
        };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', onScroll);
            if (rafId !== null) cancelAnimationFrame(rafId);
        };
    }, [allBusinesses]);

    // Restore scroll by finding the previously-saved anchor card and scrolling it
    // back into view, once businesses are loaded and rendered.
    useLayoutEffect(() => {
        if (allBusinesses.length > 0 && !loading && !restoredRef.current && scrollAnchorId) {
            const el = document.querySelector<HTMLElement>(`[data-business-id="${scrollAnchorId}"]`);
            if (el) {
                restoredRef.current = true;
                el.scrollIntoView({ block: 'start' });
            }
        }
    }, [allBusinesses, loading, scrollAnchorId]);

    useEffect(() => {
        if (!sentinelRef.current) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && nextCursor && !loadingMore && !loading) {
                    fetchBusinesses(location?.lat, location?.lon, selectedCategory, radiusMeters, searchText, nextCursor);
                }
            },
            { threshold: 0.1 }
        );
        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [nextCursor, loadingMore, loading, location, selectedCategory, radiusMeters, searchText]);

    const handleUseGPS = () => {
        if (!navigator.geolocation) { setError('Geolocation not supported.'); return; }
        setGpsLoading(true);
        navigator.geolocation.getCurrentPosition(
            pos => {
                const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
                setLocation(loc); setGpsEnabled(true); setLocationEnabled(true); setGpsLoading(false);
                fetchBusinesses(loc.lat, loc.lon, selectedCategory, radiusMeters, searchText);
            },
            () => { setError('Location access denied.'); setGpsLoading(false); }
        );
    };

    const openLocationMode = () => {
        if (!locationEnabled) { handleUseGPS(); }
        setBarMode('location');
    };

    const clearLocation = () => {
        setLocationEnabled(false); setGpsEnabled(false); setLocation(null);
        setBarMode('none');
        fetchBusinesses(undefined, undefined, selectedCategory, undefined, searchText);
    };

    const runSearch = () => {
        fetchBusinesses(location?.lat, location?.lon, selectedCategory, radiusMeters, searchText);
    };

    const handleCategoryChange = (categoryId: number | undefined) => {
        setSelectedCategory(categoryId);
        fetchBusinesses(location?.lat, location?.lon, categoryId, radiusMeters, searchText);
    };

    const hasSearch = searchText.trim().length > 0;

    const toggleDarkMode = () => setDarkMode(prev => !prev);

    const mainBg = darkMode ? '#0a0a0a' : '#f9fafb';
    // Semi-transparent so the page-wide watermark logo shows faintly through
    // the header too, exactly as before, instead of the header hiding it.
    const headerBg = darkMode ? 'rgba(18,18,18,0.94)' : 'rgba(255,255,255,0.94)';
    const headerBorder = darkMode ? '#0a0a0a' : '#f3f4f6';
    const textColor = darkMode ? '#e5e7eb' : '#111827';
    const mutedText = darkMode ? '#9ca3af' : '#6b7280';
    const inputBg = darkMode ? '#1a1a1a' : '#f9fafb';
    const inputBorder = darkMode ? '#333' : '#e5e7eb';
    const inputText = darkMode ? '#e5e7eb' : '#111827';
    const placeholderColor = darkMode ? '#6b7280' : '#9ca3af';
    const categoriesBg = darkMode ? '#1a1a1a' : '#fff';

    const buildDefaultLayout = () => {
        const sections: JSX.Element[] = [];
        let i = 0, groupIndex = 0;
        while (i < allBusinesses.length) {
            const vertSlice = allBusinesses.slice(i, i + 3);
            sections.push(
                <div key={`v-${groupIndex}`} className="hk-vgroup-track">
                    {vertSlice.map(biz => (
                        <div key={biz.id} className="hk-vgroup-item">
                            <BizCard biz={biz} gpsEnabled={gpsEnabled} catColor={categoryColorMap[biz.category_name] || DEFAULT_CAT_COLOR} darkMode={darkMode} />
                        </div>
                    ))}
                </div>
            );
            i += 3;
            const beltSlice = allBusinesses.slice(i, i + 4);
            if (beltSlice.length > 0) {
                sections.push(<BizShelf key={`b-${groupIndex}`} items={beltSlice} gpsEnabled={gpsEnabled} label="Nearby shops" categoryColorMap={categoryColorMap} darkMode={darkMode} />);
                i += 4;
            }
            groupIndex++;
        }
        return sections;
    };

    const buildSearchLayout = () => {
        if (allBusinesses.length === 0) return null;
        const exactMatch = allBusinesses[0], others = allBusinesses.slice(1);
        return (
            <>
                <div style={{ padding: '0 16px', marginBottom: 8 }}><span style={{ fontSize: 13, fontWeight: 700, color: textColor }}>Exact match</span></div>
                <div className="hk-vgroup-track" style={{ marginBottom: 24 }}>
                    <div className="hk-vgroup-item">
                        <BizCard biz={exactMatch} gpsEnabled={gpsEnabled} catColor={categoryColorMap[exactMatch.category_name] || DEFAULT_CAT_COLOR} darkMode={darkMode} />
                    </div>
                </div>
                {others.length > 0 && <BizShelf items={others} gpsEnabled={gpsEnabled} label="Other shops near you" categoryColorMap={categoryColorMap} darkMode={darkMode} />}
            </>
        );
    };

    const iconBtnStyle: React.CSSProperties = { width: 38, height: 38, background: '#16a34a', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
    const locationBtnStyle = (activeFilled: boolean): React.CSSProperties => ({
        display: 'flex', alignItems: 'center', gap: 5,
        background: gpsLoading ? '#e5e7eb' : activeFilled ? '#16a34a' : darkMode ? '#2a2a2a' : '#f0fdf4',
        border: gpsLoading ? '1px solid #d1d5db' : activeFilled ? '1px solid #16a34a' : darkMode ? '1px solid #444' : '1px solid #bbf7d0',
        borderRadius: 8, padding: '9px 12px', cursor: gpsLoading ? 'default' : 'pointer', fontSize: 12, fontWeight: 700,
        color: gpsLoading ? '#9ca3af' : activeFilled ? '#fff' : darkMode ? '#e5e7eb' : '#16a34a',
        whiteSpace: 'nowrap', fontFamily: 'inherit', flexShrink: 0,
    });

    // Category row spreads out and gets extra breathing room once something is selected.
    const catRowActive = selectedCategory !== undefined;

    return (
        <div style={{ background: mainBg, minHeight: '100vh', color: textColor, position: 'relative' }}>
            {/* Page-wide faint watermark — mobile only; hidden on desktop entirely
                (see .hk-watermark media query below). */}
            <div className="hk-watermark" style={{
                position: 'fixed', inset: 0, backgroundImage: 'url(/customer/logo.png)',
                backgroundSize: 'cover', backgroundPosition: 'center',
                opacity: darkMode ? 0.05 : 0.1, zIndex: 0, pointerEvents: 'none',
            }} />

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@700&display=swap');
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes zoomIn { from { transform: scale(0.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                input::placeholder { color: ${placeholderColor}; }
                ::-webkit-scrollbar { display: none; }
                .hk-container { max-width: 1100px; margin: 0 auto; padding: 0 16px; }
                .hk-radius-scroll { -webkit-overflow-scrolling: touch; scroll-snap-type: x proximity; }
                .hk-radius-scroll > button { scroll-snap-align: start; }

                /* ── Category avatars: squircle + unique ring, zoom + spread when active ── */
                .hk-cat-scroll { display: flex; align-items: flex-start; overflow-x: auto; padding: 14px 16px; scrollbar-width: none; transition: gap 0.25s ease, justify-content 0.25s ease; scroll-behavior: smooth; }
                .hk-cat-story { display: flex; flex-direction: column; align-items: center; gap: 6px; background: transparent; border: none; cursor: pointer; flex-shrink: 0; font-family: inherit; padding: 0; }
                .hk-cat-ring { display: flex; align-items: center; justify-content: center; transition: transform 0.25s ease, background 0.25s ease; }
                .hk-cat-label { font-size: 11px; }

                .hk-cat-nav-btn {
                    width: 30px; height: 30px; border-radius: 50%; border: none; cursor: pointer;
                    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
                    background: rgba(0,0,0,0.06); color: inherit; margin: 18px 4px 0;
                }
                .hk-cat-nav-btn:hover { background: rgba(0,0,0,0.12); }
                .hk-cat-bar-row { display: flex; align-items: stretch; }
                /* Scroll-nav chevrons are desktop-only — on mobile the row scrolls
                   fine via native touch swipe, and the buttons would just crowd it. */
                .hk-cat-nav-desktop-only { display: none; }

                /* Sticky category bar. top:0 on mobile (nav is at the bottom there).
                   On desktop the app's top nav bar sits at the very top of the
                   viewport, so this needs to sit below it instead of underneath it —
                   see the desktop override further down. */
                .hk-cat-sticky { position: sticky; top: 0; z-index: 20; }

                /* ── Business card shelf: mobile = horizontal belt, desktop = grid ── */
                .hk-biz-card-link { text-decoration: none; color: inherit; display: block; }
                .hk-biz-name { font-size: 13px; margin-bottom: 1px; }
                .hk-biz-cat { font-size: 10px; }
                .hk-biz-trust { font-size: 10px; }
                .hk-biz-addr, .hk-biz-dist { font-size: 10px; }

                .hk-belt-track {
                    display: flex; gap: 14px; overflow-x: auto;
                    padding: ${BELT_LOGO_D / 2 + 4}px 16px 8px 16px;
                    scrollbar-width: none; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch;
                }
                /* start (not center) alignment so the first card sits flush under the
                   section label, and the last card lands fully visible at the end of
                   the scroll instead of being force-centered with odd overhang. */
                .hk-belt-item { flex-shrink: 0; width: min(82vw, 360px); scroll-snap-align: start; }

                /* ── Vertical group: stacked list on mobile, no gap above the very first
                   group (sits right under the sticky category bar), bigger spacing
                   between cards. On desktop this becomes the same edge-to-edge grid
                   as belts (see media query). ── */
                .hk-vgroup-track { display: flex; flex-direction: column; gap: 36px; padding: ${BELT_LOGO_D / 2 + 4}px 16px 8px 16px; }
                .hk-vgroup-track:first-of-type { padding-top: ${BELT_LOGO_D / 2 + 4}px; margin-top: 0; }
                .hk-vgroup-item { width: 100%; }

                /* ── Zoom overlay — z-index above the app's bottom nav bar (App.tsx uses
                   z-index:1000 for .hk-navbar), so the modal isn't hidden underneath it. ── */
                .hk-zoom-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.72); z-index: 1100; display: flex; align-items: center; justify-content: center; padding: 24px; }
                .hk-zoom-box { border-radius: 18px; padding: 28px 24px 22px; width: 100%; max-width: 320px; text-align: center; position: relative; box-shadow: 0 20px 60px rgba(0,0,0,0.4); animation: zoomIn 0.18s ease-out; }

                @media (min-width: 860px) {
                    /* Watermark is mobile-only */
                    .hk-watermark { display: none; }

                    /* App.tsx's top nav (.hk-navbar) is ~64px tall at desktop widths and
                       sits fixed at the very top of the viewport — push the sticky
                       category bar down so the nav doesn't cover it. */
                    .hk-cat-sticky { position: static; top: auto; }

                    .hk-cat-nav-desktop-only { display: flex; }

                    .hk-cat-scroll { padding: 30px 40px !important; gap: 40px !important; }
                    .hk-cat-ring { width: 92px !important; height: 92px !important; }
                    .hk-cat-story { width: 104px !important; }
                    .hk-cat-label { font-size: 13px !important; max-width: 104px !important; }

                    /* Uniform 3-per-row on desktop for BOTH group types, matching the
                       vertical group's sizing — belts (4 on mobile) collapse to the
                       same 3-column grid here instead of a mismatched 4-column one. */
                    .hk-belt-track, .hk-vgroup-track {
                        display: grid; grid-template-columns: repeat(3, 1fr);
                        gap: 32px; overflow-x: visible; padding: 32px 32px 8px; max-width: 1500px; margin: 0 auto;
                    }
                    .hk-belt-item { width: auto; scroll-snap-align: none; }
                    .hk-vgroup-item { width: auto; }
                    .hk-biz-name { font-size: 16px; }
                    .hk-biz-cat { font-size: 12px; }
                    .hk-biz-trust { font-size: 12px; }
                    .hk-biz-addr, .hk-biz-dist { font-size: 12px; }

                    /* Logo-zoom box: 50% of viewport width, top edge touches the nav */
                    .hk-zoom-overlay { align-items: flex-start; }
                    .hk-zoom-box { width: 50vw; max-width: 640px; margin-top: 0; }
                }
            `}</style>

            <div style={{ position: 'relative', zIndex: 1 }}>
                {/* ── Header ── */}
                <div style={{ borderBottom: `1px solid ${headerBorder}`, background: headerBg }}>
                    <div className="hk-container" style={{ paddingTop: 8, paddingBottom: 8 }}>
                        {/* First row: buttons at the very top */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <button onClick={() => window.open(Config.RIDER_BASE, '_blank', 'noopener,noreferrer')} style={{ display: 'flex', alignItems: 'center', gap: 5, background: darkMode ? '#2a2a2a' : '#f0fdf4', border: darkMode ? 'none' : '1.5px solid #bbf7d0', borderRadius: 8, padding: '6px 11px', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#16a34a', fontFamily: 'inherit' }}>
                                <BikeSvg size={14} />Rider App
                            </button>

                            <button onClick={() => window.open(Config.BUSINESS_BASE, '_blank', 'noopener,noreferrer')} style={{ display: 'flex', alignItems: 'center', gap: 5, background: darkMode ? '#2a2a2a' : '#f0fdf4', border: darkMode ? 'none' : '1.5px solid #bbf7d0', borderRadius: 8, padding: '6px 11px', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#16a34a', fontFamily: 'inherit' }}>
                                <ShopSvg size={14} />Dashboard
                            </button>

                            <button onClick={toggleDarkMode} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: darkMode ? '#2a2a2a' : '#f0fdf4', border: darkMode ? 'none' : '1.5px solid #bbf7d0', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', fontFamily: 'inherit' }}>
                                {darkMode ? <SunSvg size={18} color="#16a34a" /> : <MoonSvg size={18} color="#16a34a" />}
                            </button>
                        </div>

                        {/* row 2: location / search toggle */}
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            {barMode === 'search' ? (
                                <>
                                    <div style={{ flex: 1, background: inputBg, borderRadius: 8, display: 'flex', alignItems: 'center', paddingLeft: 12, border: `1px solid ${inputBorder}` }}>
                                        <SearchSvg color={darkMode ? '#6b7280' : '#9ca3af'} />
                                        <input
                                            autoFocus
                                            value={searchText}
                                            onChange={e => setSearchText(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') runSearch(); }}
                                            placeholder="Search businesses..."
                                            style={{ flex: 1, border: 'none', outline: 'none', padding: '10px 10px', fontSize: 13, background: 'transparent', color: inputText }}
                                        />
                                    </div>
                                    <button onClick={runSearch} style={iconBtnStyle}><SearchSvg color="#fff" size={15} /></button>
                                </>
                            ) : barMode === 'location' ? (
                                <>
                                    <button onClick={() => setBarMode('none')} style={locationBtnStyle(true)}>
                                        {gpsLoading ? <SpinnerSvg /> : <LocationSvg size={12} color="#fff" />}{gpsLoading ? 'Locating...' : 'Location'}
                                    </button>
                                    <div className="hk-radius-scroll" style={{ flex: 1, display: 'flex', gap: 6, overflowX: 'auto' }}>
                                        {RADIUS_OPTIONS.map(r => (
                                            <button
                                                key={r.value}
                                                onClick={() => { setRadiusMeters(r.value); if (location) fetchBusinesses(location.lat, location.lon, selectedCategory, r.value, searchText); }}
                                                style={{
                                                    flexShrink: 0, padding: '9px 13px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11.5, fontWeight: 800, whiteSpace: 'nowrap', fontFamily: 'inherit',
                                                    background: radiusMeters === r.value ? r.strong : (darkMode ? '#2a2a2a' : r.light),
                                                    color: radiusMeters === r.value ? '#fff' : (darkMode ? '#e5e7eb' : r.strong),
                                                }}
                                            >{r.label}</button>
                                        ))}
                                        <button onClick={clearLocation} style={{ flexShrink: 0, background: 'transparent', border: darkMode ? '1px solid #444' : '1px solid #d1d5db', borderRadius: 8, padding: '9px 10px', fontSize: 11, fontWeight: 600, color: darkMode ? '#9ca3af' : '#6b7280', cursor: 'pointer', fontFamily: 'inherit' }}>Clear</button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <button onClick={openLocationMode} disabled={gpsLoading} style={locationBtnStyle(false)}>
                                        {gpsLoading ? <SpinnerSvg /> : <LocationSvg size={12} color={darkMode ? '#e5e7eb' : '#16a34a'} />}{gpsLoading ? 'Locating...' : 'Location'}
                                    </button>
                                    <div style={{ flex: 1 }} />
                                    <button onClick={() => setBarMode('search')} style={iconBtnStyle}><SearchSvg color="#fff" size={15} /></button>
                                </>
                            )}
                        </div>

                        {/* row 3: the button that "went down" */}
                        {barMode === 'search' && (
                            <div style={{ marginTop: 8 }}>
                                <button onClick={openLocationMode} disabled={gpsLoading} style={locationBtnStyle(false)}>
                                    {gpsLoading ? <SpinnerSvg /> : <LocationSvg size={12} color={darkMode ? '#e5e7eb' : '#16a34a'} />}{gpsLoading ? 'Locating...' : 'Location'}
                                </button>
                            </div>
                        )}
                        {barMode === 'location' && (
                            <div style={{ marginTop: 8 }}>
                                <button onClick={() => setBarMode('search')} style={iconBtnStyle}><SearchSvg color="#fff" size={15} /></button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Categories — sticky so it stays put while the business list scrolls ── */}
                {categories.length > 0 && (
                    <div className="hk-cat-sticky" style={{
                        background: categoriesBg, borderBottom: `1px solid ${darkMode ? '#0a0a0a' : '#f3f4f6'}`,
                    }}>
                        <div className="hk-cat-bar-row">
                            <button
                                className="hk-cat-nav-btn hk-cat-nav-desktop-only"
                                onClick={() => catScrollRef.current?.scrollBy({ left: -240, behavior: 'smooth' })}
                                aria-label="Scroll categories left"
                            >
                                <ChevronLeftSvg />
                            </button>

                            <div
                                ref={catScrollRef}
                                className="hk-cat-scroll"
                                style={{
                                    gap: catRowActive ? 28 : 14,
                                }}
                            >
                                <CategoryStory
                                    label="All"
                                    active={selectedCategory === undefined}
                                    colors={DEFAULT_CAT_COLOR}
                                    onClick={() => handleCategoryChange(undefined)}
                                    size={selectedCategory === undefined ? 78 : 70}
                                />
                                {categories.map((c, idx) => (
                                    <CategoryStory
                                        key={c.id}
                                        label={c.name}
                                        active={selectedCategory === c.id}
                                        colors={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]}
                                        onClick={() => handleCategoryChange(c.id)}
                                        imageUrl={c.image_url || null}
                                        size={selectedCategory === c.id ? 78 : 70}
                                    />
                                ))}
                            </div>

                            <button
                                className="hk-cat-nav-btn hk-cat-nav-desktop-only"
                                onClick={() => catScrollRef.current?.scrollBy({ left: 240, behavior: 'smooth' })}
                                aria-label="Scroll categories right"
                            >
                                <ChevronRightSvg />
                            </button>
                        </div>
                    </div>
                )}

                {error && <div className="hk-container" style={{ marginTop: 10, padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 12 }}>{error}</div>}
                {loading && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', gap: 8, color: mutedText, fontSize: 13 }}><SpinnerSvg />Finding shops near you…</div>}

                {!loading && (
                    <div style={{ paddingBottom: 24 }}>
                        {allBusinesses.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '48px 20px', color: mutedText }}><div style={{ fontSize: 15, fontWeight: 600, color: textColor, marginBottom: 6 }}>No businesses found</div><div style={{ fontSize: 12 }}>Try adjusting your location or search terms</div></div>
                        ) : hasSearch ? buildSearchLayout() : buildDefaultLayout()}
                        <div ref={sentinelRef} style={{ height: 1 }} />
                        {loadingMore && (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
                                <CategorySpinner size={36} color="#16a34a" />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Home;