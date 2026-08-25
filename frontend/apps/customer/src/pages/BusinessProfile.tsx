import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from "react-router-dom";
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { Config } from '@hakika/config';

interface Product {
    id: string;
    name: string;
    description: string | null;
    original_price: number;
    discount_price: number | null;
    images: { id: string; position: number; url: string }[];
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/* ── Open/closed helpers (same logic used on Home) ──────── */
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

/* ── Fade the lightbox/quick-view content in after a short delay ── */
const useDelayedVisible = (delay = 120) => {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const t = setTimeout(() => setVisible(true), delay);
        return () => clearTimeout(t);
    }, []);
    return visible;
};

/* ── Icons ────────────────────────────────────────────── */
const BackArrowSvg = () =>
    React.createElement('svg', { width: 19, height: 19, viewBox: '0 0 24 24', fill: 'none', stroke: '#fff', strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round' },
        React.createElement('line', { x1: 19, y1: 12, x2: 5, y2: 12 }),
        React.createElement('polyline', { points: '12 19 5 12 12 5' })
    );

const CloseSvg = ({ color = '#fff', size = 18 }: { color?: string; size?: number }) =>
    React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' },
        React.createElement('line', { x1: 6, y1: 6, x2: 18, y2: 18 }),
        React.createElement('line', { x1: 18, y1: 6, x2: 6, y2: 18 })
    );

const SearchSvg = ({ color = '#9ca3af', size = 15 }: { color?: string; size?: number }) =>
    React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' },
        React.createElement('circle', { cx: 11, cy: 11, r: 8 }),
        React.createElement('line', { x1: 21, y1: 21, x2: 16.65, y2: 16.65 })
    );

const StarSvg = ({ color = '#16a34a', size = 13 }: { color?: string; size?: number }) =>
    React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: color, stroke: 'none' },
        React.createElement('path', { d: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' })
    );

const LocationSvg = ({ color = '#6b7280', size = 12 }: { color?: string; size?: number }) =>
    React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
        React.createElement('path', { d: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z' }),
        React.createElement('circle', { cx: 12, cy: 10, r: 3 })
    );

const CheckCircleSvg = ({ color = '#16a34a', size = 14 }: { color?: string; size?: number }) =>
    React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
        React.createElement('circle', { cx: 12, cy: 12, r: 10 }),
        React.createElement('polyline', { points: '9 12 11 14 15 10' })
    );

const XCircleSvg = ({ color = '#ef4444', size = 14 }: { color?: string; size?: number }) =>
    React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
        React.createElement('circle', { cx: 12, cy: 12, r: 10 }),
        React.createElement('line', { x1: 9, y1: 9, x2: 15, y2: 15 }),
        React.createElement('line', { x1: 15, y1: 9, x2: 9, y2: 15 })
    );

const ClockSvg = ({ color = '#6b7280', size = 12 }: { color?: string; size?: number }) =>
    React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
        React.createElement('circle', { cx: 12, cy: 12, r: 10 }),
        React.createElement('polyline', { points: '12 6 12 12 16 14' })
    );

const ChevronDownSvg = ({ style, color = '#6b7280' }: { style?: React.CSSProperties; color?: string }) =>
    React.createElement('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round', style },
        React.createElement('polyline', { points: '6 9 12 15 18 9' })
    );

const UserSvg = ({ color = '#4b5563', size = 13 }: { color?: string; size?: number }) =>
    React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
        React.createElement('path', { d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' }),
        React.createElement('circle', { cx: 12, cy: 7, r: 4 })
    );

const BoxSvg = ({ color = '#6b7280', size = 13 }: { color?: string; size?: number }) =>
    React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
        React.createElement('path', { d: 'M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z' }),
        React.createElement('polyline', { points: '3.27 6.96 12 12.01 20.73 6.96' }),
        React.createElement('line', { x1: 12, y1: 22.08, x2: 12, y2: 12 })
    );

const CardSvg = ({ color = '#6b7280', size = 13 }: { color?: string; size?: number }) =>
    React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
        React.createElement('rect', { x: 2, y: 5, width: 20, height: 14, rx: 2 }),
        React.createElement('line', { x1: 2, y1: 10, x2: 22, y2: 10 })
    );

const PlusSvg = ({ color = '#16a34a', size = 13 }: { color?: string; size?: number }) =>
    React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' },
        React.createElement('line', { x1: 12, y1: 5, x2: 12, y2: 19 }),
        React.createElement('line', { x1: 5, y1: 12, x2: 19, y2: 12 })
    );

const MinusSvg = ({ color = '#16a34a', size = 13 }: { color?: string; size?: number }) =>
    React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' },
        React.createElement('line', { x1: 5, y1: 12, x2: 19, y2: 12 })
    );

const TrashSvg = ({ color = '#ef4444', size = 14 }: { color?: string; size?: number }) =>
    React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
        React.createElement('polyline', { points: '3 6 5 6 21 6' }),
        React.createElement('path', { d: 'M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' })
    );

const ShopSvg = ({ size = 28 }: { size?: number }) =>
    React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: '#16a34a', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' },
        React.createElement('path', { d: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' }),
        React.createElement('polyline', { points: '9 22 9 12 15 12 15 22' })
    );

const BagSvg = ({ size = 24, color = '#fff' }: { size?: number; color?: string }) =>
    React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' },
        React.createElement('path', { d: 'M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z' }),
        React.createElement('path', { d: 'M3 6h18' }),
        React.createElement('path', { d: 'M16 10a4 4 0 0 1-8 0' })
    );

/* ── Story-ring spinner (same palette as the Home category rings) ── */
const StoryRingSpinner: React.FC<{ size?: number }> = ({ size = 60 }) => (
    <div style={{
        width: size, height: size, borderRadius: '50%', padding: 4,
        background: 'conic-gradient(from 0deg, #fb923c, #f472b6, #a78bfa, #4ade80, #fb923c)',
        animation: 'spin 1s linear infinite',
    }}>
        <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#f9fafb' }} />
    </div>
);

/* ── Image helpers with graceful fallback ────────────────── */
const CoverImage: React.FC<{ src: string; alt: string; style?: React.CSSProperties }> = ({ src, alt, style }) => {
    const [failed, setFailed] = useState(false);
    if (failed || !src) return (
        <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0fdf4' }}>
            <ShopSvg size={40} />
        </div>
    );
    return <img src={src} alt={alt} style={style} onError={() => setFailed(true)} />;
};

const LogoImg: React.FC<{ src: string; alt: string; style?: React.CSSProperties }> = ({ src, alt, style }) => {
    const [failed, setFailed] = useState(false);
    if (failed) return (
        <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e5e7eb' }}>
            <ShopSvg size={24} />
        </div>
    );
    return <img src={src} alt={alt} style={style} onError={() => setFailed(true)} />;
};

/* ── Fullscreen lightbox for tapping cover / logo — fades in after a short delay ── */
const ImageLightbox: React.FC<{ src: string; alt: string; onClose: () => void }> = ({ src, alt, onClose }) => {
    const visible = useDelayedVisible(120);
    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.94)', zIndex: 3000,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
            }}
        >
            <button
                onClick={onClose}
                style={{
                    position: 'absolute', top: 16, left: 16, width: 36, height: 36, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
            >
                <CloseSvg />
            </button>
            <img
                src={src}
                alt={alt}
                onClick={e => e.stopPropagation()}
                style={{
                    maxWidth: '100%', maxHeight: '100%', borderRadius: 12, objectFit: 'contain',
                    opacity: visible ? 1 : 0, transition: 'opacity 320ms ease',
                }}
            />
        </div>
    );
};

/* ── Business details modal: hours, rating, location, payment, product count ── */
const BusinessDetailsModal: React.FC<{ business: any; hours: any[]; open: boolean; status: { open: boolean; label: string }; productCount: number; onClose: () => void }> = ({ business, hours, open, status, productCount, onClose }) => {
    const visible = useDelayedVisible(120);
    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 2500,
                display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 0,
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    width: '100%', maxWidth: 480, maxHeight: '82vh', background: '#fff', borderRadius: '20px 20px 0 0',
                    overflow: 'hidden', display: 'flex', flexDirection: 'column',
                    opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(24px)',
                    transition: 'opacity 280ms ease, transform 280ms ease',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #f3f4f6' }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#111827', fontFamily: 'Georgia, serif' }}>Business Profile</span>
                    <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', background: '#f3f4f6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CloseSvg color="#4b5563" size={15} />
                    </button>
                </div>

                <div style={{ padding: '14px 16px 22px', overflowY: 'auto' }}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: '#111827', fontFamily: 'Georgia, serif', marginBottom: 2 }}>{business.name}</div>
                    {business.description && <p style={{ fontSize: 12.5, color: '#6b7280', margin: '2px 0 14px', lineHeight: 1.5 }}>{business.description}</p>}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                        {open ? <CheckCircleSvg /> : <XCircleSvg />}
                        <span style={{ fontSize: 13, fontWeight: 700, color: open ? '#16a34a' : '#ef4444' }}>{open ? 'Open now' : 'Closed now'}</span>
                        {status.label && <span style={{ fontSize: 12, color: '#6b7280' }}>· {status.label}</span>}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                        <StarSvg />
                        <span style={{ fontSize: 13, color: '#374151' }}>Rating: <b>{business.trust_score?.toFixed(0)}%</b> trust score</span>
                    </div>

                    {business.location?.address_text && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 10 }}>
                            <LocationSvg />
                            <span style={{ fontSize: 13, color: '#374151' }}>{business.location.address_text}</span>
                        </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                        <BoxSvg />
                        <span style={{ fontSize: 13, color: '#374151' }}><b>{productCount}</b> product{productCount === 1 ? '' : 's'} listed</span>
                    </div>

                    <div style={{ fontSize: 12.5, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Payment methods</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 10, background: business.collect_payment_before_delivery ? '#eff6ff' : '#f9fafb', border: `1px solid ${business.collect_payment_before_delivery ? '#bfdbfe' : '#e5e7eb'}` }}>
                            <CardSvg color={business.collect_payment_before_delivery ? '#1d4ed8' : '#9ca3af'} />
                            <span style={{ fontSize: 12.5, color: business.collect_payment_before_delivery ? '#1d4ed8' : '#9ca3af', fontWeight: business.collect_payment_before_delivery ? 700 : 500 }}>
                                Pay before delivery {business.collect_payment_before_delivery && '· active'}
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 10, background: !business.collect_payment_before_delivery ? '#ECFDF5' : '#f9fafb', border: `1px solid ${!business.collect_payment_before_delivery ? '#bbf7d0' : '#e5e7eb'}` }}>
                            <CardSvg color={!business.collect_payment_before_delivery ? '#16a34a' : '#9ca3af'} />
                            <span style={{ fontSize: 12.5, color: !business.collect_payment_before_delivery ? '#16a34a' : '#9ca3af', fontWeight: !business.collect_payment_before_delivery ? 700 : 500 }}>
                                Pay after delivery {!business.collect_payment_before_delivery && '· active'}
                            </span>
                        </div>
                    </div>

                    {hours.length > 0 && (
                        <>
                            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#111827', margin: '16px 0 8px' }}>Opening hours</div>
                            {hours.map((h: any) => (
                                <div key={h.day_of_week} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: '#374151' }}>
                                        <ClockSvg color="#9ca3af" />
                                        {DAYS[h.day_of_week]}
                                    </span>
                                    <span style={{ fontSize: 12.5, fontWeight: 600, color: h.is_closed ? '#ef4444' : '#16a34a' }}>
                                        {h.is_closed ? 'Closed' : `${h.opens_at?.slice(0,5)} - ${h.closes_at?.slice(0,5)}`}
                                    </span>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

/* ── Product quick-view: image carousel (scrollable when several photos) + description + add to cart ── */
const ProductQuickView: React.FC<{
    product: Product;
    quantity: number;
    onAdd: () => void;
    onInc: () => void;
    onDec: () => void;
    onClose: () => void;
}> = ({ product, quantity, onAdd, onInc, onDec, onClose }) => {
    const visible = useDelayedVisible(120);
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollerRef = useRef<HTMLDivElement>(null);
    const images = product.images ?? [];
    const finalPrice = product.discount_price ?? product.original_price;
    const hasDiscount = !!product.discount_price && product.discount_price < product.original_price;

    const handleScroll = () => {
        const el = scrollerRef.current;
        if (!el) return;
        const idx = Math.round(el.scrollLeft / el.clientWidth);
        setActiveIndex(idx);
    };

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.94)', zIndex: 3000,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    width: '100%', maxWidth: 420, maxHeight: '86vh', display: 'flex', flexDirection: 'column',
                    background: '#fff', borderRadius: 18, overflow: 'hidden',
                    opacity: visible ? 1 : 0, transform: visible ? 'scale(1)' : 'scale(0.97)',
                    transition: 'opacity 320ms ease, transform 320ms ease',
                }}
            >
                {/* Image carousel */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                    <button
                        onClick={onClose}
                        style={{
                            position: 'absolute', top: 10, left: 10, width: 34, height: 34, borderRadius: '50%',
                            background: 'rgba(15,23,42,0.55)', border: 'none', cursor: 'pointer', zIndex: 2,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        <CloseSvg />
                    </button>

                    {images.length > 0 ? (
                        <div
                            ref={scrollerRef}
                            onScroll={handleScroll}
                            style={{
                                display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory',
                                scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' as any,
                            }}
                        >
                            {images.map(img => (
                                <img
                                    key={img.id}
                                    src={img.url}
                                    alt={product.name}
                                    style={{ width: '100%', height: 260, objectFit: 'cover', flexShrink: 0, scrollSnapAlign: 'center', display: 'block' }}
                                />
                            ))}
                        </div>
                    ) : (
                        <div style={{ width: '100%', height: 260, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ShopSvg size={40} />
                        </div>
                    )}

                    {images.length > 1 && (
                        <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 5 }}>
                            {images.map((_, i) => (
                                <span key={i} style={{
                                    width: i === activeIndex ? 16 : 6, height: 6, borderRadius: 3,
                                    background: i === activeIndex ? '#fff' : 'rgba(255,255,255,0.5)',
                                    transition: 'width 0.15s ease',
                                }} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Details */}
                <div style={{ padding: '14px 16px 16px', overflowY: 'auto' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', fontFamily: 'Georgia, serif', marginBottom: 4 }}>
                        {product.name}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
                        {hasDiscount && (
                            <span style={{ fontSize: 13, color: '#9ca3af', textDecoration: 'line-through' }}>
                                KES {product.original_price}
                            </span>
                        )}
                        <span style={{ fontSize: 17, fontWeight: 800, color: '#16a34a' }}>KES {finalPrice}</span>
                    </div>

                    <div style={{ fontSize: 12.5, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Description</div>
                    <p style={{ fontSize: 12.5, color: product.description ? '#374151' : '#9ca3af', lineHeight: 1.5, marginBottom: 16 }}>
                        {product.description || 'No description provided for this product.'}
                    </p>

                    {quantity > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ECFDF5', borderRadius: 12, padding: '8px 12px' }}>
                            <button onClick={onDec} style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }}>
                                <MinusSvg size={14} />
                            </button>
                            <span style={{ fontSize: 15, fontWeight: 700, color: '#16a34a' }}>{quantity} in cart</span>
                            <button onClick={onInc} style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }}>
                                <PlusSvg size={14} />
                            </button>
                        </div>
                    ) : (
                        <button onClick={onAdd} style={{ width: '100%', padding: 12, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                            Add to Cart
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

/* ── Product card ─────────────────────────────────────────── */
const ProductCard: React.FC<{
    product: Product;
    quantity: number;
    onOpen: () => void;
    onAdd: () => void;
    onInc: () => void;
    onDec: () => void;
}> = ({ product, quantity, onOpen, onAdd, onInc, onDec }) => {
    const [imgFailed, setImgFailed] = useState(false);
    const finalPrice = product.discount_price ?? product.original_price;
    const hasDiscount = !!product.discount_price && product.discount_price < product.original_price;
    const img = product.images?.[0]?.url;

    return (
        <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', border: '1px solid #f3f4f6', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column' }}>
            <div onClick={onOpen} style={{ width: '100%', height: 120, background: '#f3f4f6', position: 'relative', cursor: 'pointer' }}>
                {img && !imgFailed ? (
                    <img src={img} alt={product.name} onError={() => setImgFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ShopSvg size={30} />
                    </div>
                )}
                {(product.images?.length ?? 0) > 1 && (
                    <span style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(15,23,42,0.55)', color: '#fff', fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 4 }}>
                        {product.images.length} photos
                    </span>
                )}
            </div>

            <div style={{ padding: '9px 10px 10px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div onClick={onOpen} style={{
                    fontSize: 13, fontWeight: 700, color: '#111827', fontFamily: 'Georgia, serif', marginBottom: 6, lineHeight: 1.3, cursor: 'pointer',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '2.5em',
                }}>
                    {product.name}
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#16a34a' }}>KES {finalPrice}</span>
                    {hasDiscount && (
                        <span style={{ fontSize: 11, color: '#9ca3af', textDecoration: 'line-through' }}>
                            KES {product.original_price}
                        </span>
                    )}
                </div>

                <div style={{ marginTop: 'auto' }}>
                    {quantity > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ECFDF5', borderRadius: 10, padding: '5px 6px' }}>
                            <button onClick={e => { e.stopPropagation(); onDec(); }} style={{ width: 24, height: 24, borderRadius: '50%', border: 'none', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }}>
                                <MinusSvg size={12} />
                            </button>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>{quantity}</span>
                            <button onClick={e => { e.stopPropagation(); onInc(); }} style={{ width: 24, height: 24, borderRadius: '50%', border: 'none', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }}>
                                <PlusSvg size={12} />
                            </button>
                        </div>
                    ) : (
                        <button onClick={e => { e.stopPropagation(); onAdd(); }} style={{ width: '100%', padding: '8px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                            Add to Cart
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

/* ── Business profile page ───────────────────────────────── */
const BusinessProfile: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const [business, setBusiness] = useState<any>(null);
    const navigate = useNavigate();
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
    const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Cart: mini bubble on the right by default so it never covers a product;
    // tapping it restores the full drawer.
    const [cartMini, setCartMini] = useState(true);
    const [itemsListOpen, setItemsListOpen] = useState(false);

    useEffect(() => {
        if (!slug) return;
        api.businessById(slug)
            .then(data => {
                setBusiness(data);
                setProducts(data.products || []);
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [slug]);

    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prev, { product, quantity: 1 }];
        });
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.product.id !== productId));
    };

    const updateQuantity = (productId: string, quantity: number) => {
        if (quantity <= 0) { removeFromCart(productId); return; }
        setCart(prev => prev.map(item =>
            item.product.id === productId ? { ...item, quantity } : item
        ));
    };

    const cartQuantityFor = (productId: string) => cart.find(i => i.product.id === productId)?.quantity ?? 0;

    const totalAmount = cart.reduce((sum, item) => {
        const price = item.product.discount_price ?? item.product.original_price;
        return sum + price * item.quantity;
    }, 0);
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    const handleCheckout = () => {
        sessionStorage.setItem('hakika_cart', JSON.stringify({ businessId: business?.id, items: cart }));
        navigate(`/order?business=${business?.id}`);
    };

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <StoryRingSpinner />
        </div>
    );
    if (error) return <div style={{ padding: 20, color: '#ef4444', fontSize: 13 }}>{error}</div>;
    if (!business) return <div style={{ padding: 20, color: '#6b7280', fontSize: 13 }}>Business not found</div>;

    const logoSrc = `${Config.API_BASE}/businesses/${business.id}/logo`;
    const coverSrc = `${Config.API_BASE}/businesses/${business.id}/cover`;
    const hours = business.operating_hours ?? [];
    const open = isOpenNow(hours);
    const status = getStatusInfo(hours);

    const q = searchQuery.trim().toLowerCase();
    const filteredProducts = q
        ? products.filter(p => {
            const price = String(p.discount_price ?? p.original_price);
            const originalPrice = String(p.original_price);
            return p.name.toLowerCase().includes(q) || price.includes(q) || originalPrice.includes(q);
        })
        : products;

    // Extra bottom padding so the expanded cart drawer never hides the last product.
    const bottomPadding = totalItems === 0 ? 24 : cartMini ? 96 : (itemsListOpen ? 420 : 210);

    return (
        <div style={{ background: '#f9fafb', minHeight: '100vh', paddingBottom: bottomPadding }}>
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                .product-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
                .page-wrap { max-width: 900px; margin: 0 auto; width: 100%; }
                @media (min-width: 900px) {
                    .product-grid { grid-template-columns: repeat(4, 1fr); gap: 14px; }
                    .cover-wrap { border-radius: 16px; margin-top: 16px; height: 260px !important; }
                }
            `}</style>

            {lightbox && <ImageLightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}

            {quickViewProduct && (
                <ProductQuickView
                    product={quickViewProduct}
                    quantity={cartQuantityFor(quickViewProduct.id)}
                    onAdd={() => addToCart(quickViewProduct)}
                    onInc={() => updateQuantity(quickViewProduct.id, cartQuantityFor(quickViewProduct.id) + 1)}
                    onDec={() => updateQuantity(quickViewProduct.id, cartQuantityFor(quickViewProduct.id) - 1)}
                    onClose={() => setQuickViewProduct(null)}
                />
            )}

            {detailsOpen && (
                <BusinessDetailsModal
                    business={business}
                    hours={hours}
                    open={open}
                    status={status}
                    productCount={products.length}
                    onClose={() => setDetailsOpen(false)}
                />
            )}

            <div className="page-wrap">
                {/* ── Cover ─────────────────────────────────── */}
                <div className="cover-wrap" style={{ position: 'relative', width: '100%', height: 190, background: '#f3f4f6', overflow: 'hidden', cursor: 'pointer' }}
                     onClick={() => setLightbox({ src: coverSrc, alt: business.name })}>
                    <CoverImage src={coverSrc} alt={business.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />

                    <button
                        onClick={e => { e.stopPropagation(); window.history.back(); }}
                        style={{
                            position: 'absolute', top: 14, left: 14, width: 36, height: 36, borderRadius: '50%',
                            background: 'rgba(15,23,42,0.55)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', zIndex: 5,
                        }}
                    >
                        <BackArrowSvg />
                    </button>
                </div>

                {/* ── Instagram-style ring logo + name/status/actions on the right ── */}
                <div style={{ position: 'relative', marginTop: -44, padding: '0 16px', display: 'flex', alignItems: 'flex-end', gap: 14 }}>
                    <div
                        onClick={() => setLightbox({ src: logoSrc, alt: business.name })}
                        style={{
                            cursor: 'pointer', flexShrink: 0, padding: 3, borderRadius: '50%',
                            background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
                        }}
                    >
                        <div style={{ padding: 3, borderRadius: '50%', background: '#f9fafb' }}>
                            <LogoImg
                                src={logoSrc}
                                alt={business.name}
                                style={{ width: 82, height: 82, objectFit: 'cover', borderRadius: '50%', display: 'block' }}
                            />
                        </div>
                    </div>

                    <div style={{ flex: 1, minWidth: 0, paddingBottom: 6 }}>
                        <h1 style={{
                            margin: 0, fontSize: 20, fontWeight: 700, color: '#111827', fontFamily: 'Georgia, serif',
                            letterSpacing: 0.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                            {business.name}
                        </h1>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                            {open ? <CheckCircleSvg size={13} /> : <XCircleSvg size={13} />}
                            <span style={{ fontSize: 12.5, fontWeight: 700, color: open ? '#16a34a' : '#ef4444' }}>
                                {open ? 'Open' : 'Closed'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── Profile button + expandable search ── */}
                <div style={{ padding: '10px 16px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <button
                            onClick={() => setDetailsOpen(true)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6, background: '#f3f4f6', border: 'none',
                                borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontFamily: 'inherit',
                            }}
                        >
                            <UserSvg />
                            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#4b5563' }}>Profile</span>
                        </button>

                        {!searchOpen && (
                            <button
                                onClick={() => setSearchOpen(true)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 6, background: '#f0fdf4', border: '1px solid #bbf7d0',
                                    borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontFamily: 'inherit',
                                }}
                            >
                                <SearchSvg color="#16a34a" size={13} />
                                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#16a34a' }}>Search</span>
                            </button>
                        )}
                    </div>

                    {searchOpen && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: '#f9fafb', border: '1px solid #16a34a', borderRadius: 10, padding: '0 12px' }}>
                                <SearchSvg />
                                <input
                                    autoFocus
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Search products by name or price..."
                                    style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, padding: '9px 0', color: '#111827' }}
                                />
                            </div>
                            <button
                                onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                                style={{ width: 36, height: 36, background: '#f3f4f6', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                            >
                                <CloseSvg color="#4b5563" size={14} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Payment info banner */}
                <div style={{ padding: '0 16px' }}>
                    {business.collect_payment_before_delivery ? (
                        <div style={{ padding: '10px 12px', background: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe', color: '#1d4ed8', fontSize: 12, marginBottom: 16 }}>
                            This business requires payment before delivery. You'll be asked to pay after your order is accepted.
                        </div>
                    ) : (
                        <div style={{ padding: '10px 12px', background: '#ECFDF5', borderRadius: 10, border: '1px solid #bbf7d0', color: '#16a34a', fontSize: 12, marginBottom: 16 }}>
                            This business collects payment after delivery. You'll be prompted to pay when your order is delivered.
                        </div>
                    )}
                </div>

                {/* ── Products grid ───────────────────────────── */}
                <div style={{ padding: '0 16px 16px' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 10 }}>
                        Products {products.length > 0 && <span style={{ color: '#9ca3af', fontWeight: 500 }}>({products.length})</span>}
                    </div>

                    {products.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af', fontSize: 12.5 }}>No products listed yet</div>
                    ) : filteredProducts.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af', fontSize: 12.5 }}>No products match "{searchQuery}"</div>
                    ) : (
                        <div className="product-grid">
                            {filteredProducts.map(product => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    quantity={cartQuantityFor(product.id)}
                                    onOpen={() => setQuickViewProduct(product)}
                                    onAdd={() => addToCart(product)}
                                    onInc={() => updateQuantity(product.id, cartQuantityFor(product.id) + 1)}
                                    onDec={() => updateQuantity(product.id, cartQuantityFor(product.id) - 1)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Cart: mini bubble on the right, expands into the full drawer ── */}
            {totalItems > 0 && cartMini && (
                <button
                    onClick={() => setCartMini(false)}
                    style={{
                        position: 'fixed', right: 14, bottom: 78, zIndex: 900, width: 56, height: 56, borderRadius: '50%',
                        background: '#16a34a', border: 'none', cursor: 'pointer', boxShadow: '0 8px 20px rgba(22,163,74,0.45)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                >
                    <BagSvg size={22} />
                    <span style={{
                        position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, borderRadius: '50%',
                        background: '#ef4444', color: '#fff', fontSize: 10.5, fontWeight: 700, display: 'flex',
                        alignItems: 'center', justifyContent: 'center', border: '2px solid #f9fafb', padding: '0 4px',
                    }}>
                        {totalItems > 99 ? '99+' : totalItems}
                    </span>
                </button>
            )}

            {totalItems > 0 && !cartMini && (
                <div style={{ position: 'fixed', left: 8, right: 8, bottom: 78, zIndex: 900, maxWidth: 480, margin: '0 auto' }}>
                    <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #f3f4f6', boxShadow: '0 10px 28px rgba(0,0,0,0.14)', overflow: 'hidden' }}>

                        {/* Drag-handle style bar — tap to collapse back to the bubble */}
                        <button
                            onClick={() => setCartMini(true)}
                            style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '7px 0 2px', background: 'transparent', border: 'none', cursor: 'pointer' }}
                        >
                            <span style={{ width: 34, height: 4, borderRadius: 2, background: '#e5e7eb' }} />
                        </button>

                        {itemsListOpen && (
                            <div style={{ maxHeight: 220, overflowY: 'auto', padding: '6px 14px 2px' }}>
                                {cart.map(item => (
                                    <div key={item.product.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                                        <div style={{ minWidth: 0, flex: 1 }}>
                                            <div style={{ fontSize: 12.5, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {item.product.name}
                                            </div>
                                            <div style={{ fontSize: 11.5, color: '#16a34a', fontWeight: 700 }}>
                                                KES {(item.product.discount_price ?? item.product.original_price) * item.quantity}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                            <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid #e5e7eb', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                                <MinusSvg size={11} />
                                            </button>
                                            <span style={{ fontSize: 12.5, fontWeight: 700, minWidth: 14, textAlign: 'center' }}>{item.quantity}</span>
                                            <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid #e5e7eb', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                                <PlusSvg size={11} />
                                            </button>
                                            <button onClick={() => removeFromCart(item.product.id)} style={{ width: 24, height: 24, borderRadius: '50%', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                                <TrashSvg />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={() => setItemsListOpen(v => !v)}
                            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#ECFDF5', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#16a34a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                                    {totalItems}
                                </span>
                                <span style={{ fontSize: 13.5, fontWeight: 800, color: '#15803d' }}>Cart</span>
                                <ChevronDownSvg color="#15803d" style={{ transform: itemsListOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
                            </span>
                            <span style={{ fontSize: 14, fontWeight: 800, color: '#15803d' }}>KES {totalAmount}</span>
                        </button>

                        <div style={{ padding: '10px 12px 12px' }}>
                            <button
                                onClick={handleCheckout}
                                style={{ width: '100%', padding: 12, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 12, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                                Proceed to Order (KES {totalAmount})
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BusinessProfile;