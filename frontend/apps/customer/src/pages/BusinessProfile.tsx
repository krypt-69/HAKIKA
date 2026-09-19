import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from "react-router-dom";
import { useParams } from 'react-router-dom';
import { api, CustomerProductInfo } from '../api';
import { Config } from '@hakika/config';
import Toast from '../components/Toast';

type Product = CustomerProductInfo;

/* Per-slug cache so that navigating back into the same business within the
   current app session reuses already-loaded data instead of refetching.
   Short TTL ensures we don't serve stale product data indefinitely. */
const PROFILE_CACHE_TTL_MS = 30_000;
const profileCache = new Map<string, { business: any; products: Product[]; ts: number }>();

const GOLD = '#b8860b';
const GOLD_BRIGHT = '#f4c430';

/* Full-page views reserve 44px at the bottom on mobile (bottom nav bar)
   and 64px at the top on desktop (top nav bar) — see .fp-shell in the
   stylesheet below. Adjust those numbers to match your real nav sizes. */

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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

/* Half-a-second "anticipation" beat before any full-page view reveals
   its content — matches the request for a deliberate, felt loading
   moment rather than an instant swap. */
const usePageTransition = (loadDelay = 500) => {
    const [ready, setReady] = useState(false);
    useEffect(() => {
        const t = setTimeout(() => setReady(true), loadDelay);
        return () => clearTimeout(t);
    }, []);
    return ready;
};

const BackArrowSvg = ({ color = '#fff', size = 22 }: { color?: string; size?: number }) =>
    React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2.6, strokeLinecap: 'round', strokeLinejoin: 'round', style: { filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' } },
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

const ProfileBadgeSvg = ({ color = '#2563eb', size = 15 }: { color?: string; size?: number }) =>
    React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
        React.createElement('path', { d: 'M12 2l2.4 1.6 2.83.2 1.2 2.53 2.2 1.6-.6 2.77.6 2.77-2.2 1.6-1.2 2.53-2.83.2L12 19.2l-2.4-1.6-2.83-.2-1.2-2.53-2.2-1.6.6-2.77-.6-2.77 2.2-1.6 1.2-2.53 2.83-.2z' }),
        React.createElement('path', { d: 'M9 12l2 2 4-4' })
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

const CartAddSvg = ({ size = 15, color = '#16a34a' }: { size?: number; color?: string }) =>
    React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' },
        React.createElement('circle', { cx: 9, cy: 21, r: 1 }),
        React.createElement('circle', { cx: 20, cy: 21, r: 1 }),
        React.createElement('path', { d: 'M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6' })
    );

/* ── Gmail-style spinner: a single golden arc chasing around the ring,
   smooth and continuous — used everywhere a full-page view "loads". ── */
const GoldSpinner: React.FC<{ size?: number }> = ({ size = 52 }) => (
    <svg width={size} height={size} viewBox="0 0 50 50" style={{ animation: 'gold-spin 0.9s linear infinite' }}>
        <circle
            cx="25" cy="25" r="20" fill="none"
            stroke={GOLD_BRIGHT} strokeWidth="4" strokeLinecap="round"
            strokeDasharray="90 150"
        />
    </svg>
);

const CoverImage: React.FC<{ src: string; alt: string; style?: React.CSSProperties }> = ({ src, alt, style }) => {
    const [failed, setFailed] = useState(false);
    if (failed || !src) return (
        <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0fdf4' }}>
            <ShopSvg size={40} />
        </div>
    );
    return <img src={src} alt={alt} style={style} onError={() => setFailed(true)} />;
};

const LogoImg: React.FC<{ src: string; alt: string; className?: string }> = ({ src, alt, className }) => {
    const [failed, setFailed] = useState(false);
    if (failed) return (
        <div className={className} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e5e7eb' }}>
            <ShopSvg size={24} />
        </div>
    );
    return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
};

/* ── Shared shell for every full-page view. The bar and the page share
   the exact same background so there is no seam/gap of a different
   colour showing at the top edge, and the back control is a bare gold
   arrow (no circle) sitting flush in the corner. ── */
const FullPageShell: React.FC<{ onClose: () => void; dark?: boolean; children: React.ReactNode; ready: boolean }> = ({ onClose, dark, children, ready }) => (
    <div className="fp-shell" style={{ background: dark ? '#0f172a' : '#fdfaf3' }}>
        <div className="fp-topbar" style={{ background: dark ? 'linear-gradient(rgba(15,23,42,0.55), transparent)' : 'transparent' }}>
            <button onClick={onClose} className="fp-back-btn" aria-label="Back">
                <BackArrowSvg color={GOLD_BRIGHT} />
            </button>
        </div>
        <div className="fp-scroll-area">
            {!ready ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '70vh' }}>
                    <GoldSpinner />
                </div>
            ) : (
                <div className="fp-content">{children}</div>
            )}
        </div>
    </div>
);

const ImageFullPage: React.FC<{ src: string; alt: string; onClose: () => void }> = ({ src, alt, onClose }) => {
    const ready = usePageTransition();
    return (
        <FullPageShell onClose={onClose} dark ready={ready}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 200px)', padding: 24 }}>
                <img src={src} alt={alt} style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 12, objectFit: 'contain', animation: 'fadeIn 260ms ease' }} />
            </div>
        </FullPageShell>
    );
};

/* ── Profile: a warmer, "boutique" styled page — gold hairline dividers,
   soft cream panels, and section headers set in the same script/gold
   language as the rest of the brand instead of flat grey blocks. ── */
const ProfileFullPage: React.FC<{ business: any; hours: any[]; open: boolean; status: { open: boolean; label: string }; productCount: number; onClose: () => void }> = ({ business, hours, open, status, productCount, onClose }) => {
    const ready = usePageTransition();
    return (
        <FullPageShell onClose={onClose} ready={ready}>
            <div className="profile-page-inner">
                <div className="profile-hero">
                    <div className="profile-script">{business.name}</div>
                    {business.description && <p className="profile-desc">{business.description}</p>}
                    <div className={`profile-open-pill ${open ? 'is-open' : 'is-closed'}`}>
                        {open ? <CheckCircleSvg color="#fff" size={13} /> : <XCircleSvg color="#fff" size={13} />}
                        <span>{open ? 'Open now' : 'Closed now'}{status.label ? ` · ${status.label}` : ''}</span>
                    </div>
                </div>

                <div className="profile-panel">
                    <div className="profile-row">
                        <StarSvg />
                        <span>Rating: <b>{business.trust_score?.toFixed(0)}%</b> trust score</span>
                    </div>
                    {business.location?.address_text && (
                        <div className="profile-row">
                            <LocationSvg />
                            <span style={{ color: '#6b7280' }}>{business.location.address_text}</span>
                        </div>
                    )}
                    <div className="profile-row">
                        <BoxSvg />
                        <span><b>{productCount}</b> product{productCount === 1 ? '' : 's'} listed</span>
                    </div>
                </div>

                <div className="profile-section-title">Payment methods</div>
                <div className="profile-panel">
                    <div className={`profile-pay-row ${business.collect_payment_before_delivery ? 'active-blue' : ''}`}>
                        <CardSvg color={business.collect_payment_before_delivery ? '#1d4ed8' : '#9ca3af'} />
                        <span>Pay before delivery {business.collect_payment_before_delivery && '· active'}</span>
                    </div>
                    <div className={`profile-pay-row ${!business.collect_payment_before_delivery ? 'active-green' : ''}`}>
                        <CardSvg color={!business.collect_payment_before_delivery ? '#16a34a' : '#9ca3af'} />
                        <span>Pay after delivery {!business.collect_payment_before_delivery && '· active'}</span>
                    </div>
                    <div className="profile-pay-note">
                        {business.collect_payment_before_delivery
                            ? "This business requires payment before delivery. You'll be asked to pay after your order is accepted."
                            : "This business collects payment after delivery. You'll be prompted to pay when your order is delivered."}
                    </div>
                </div>

                {hours.length > 0 && (
                    <>
                        <div className="profile-section-title">Opening hours</div>
                        <div className="profile-panel">
                            {hours.map((h: any) => (
                                <div key={h.day_of_week} className="profile-hours-row">
                                    <span><ClockSvg color={GOLD} /> {DAYS[h.day_of_week]}</span>
                                    <span style={{ color: h.is_closed ? '#ef4444' : '#16a34a', fontWeight: 700 }}>
                                        {h.is_closed ? 'Closed' : `${h.opens_at?.slice(0,5)} - ${h.closes_at?.slice(0,5)}`}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </FullPageShell>
    );
};

/* ── Product page: bigger hero image, script name, price treatment,
   and the add-to-cart control now lives under the details instead of
   floating on the photo. ── */
const ProductFullPage: React.FC<{
    product: Product;
    quantity: number;
    purchasable: boolean;
    categoryNames: Record<number, string>;
    onAdd: () => void;
    onInc: () => void;
    onDec: () => void;
    onClose: () => void;
}> = ({ product, quantity, purchasable, categoryNames, onAdd, onInc, onDec, onClose }) => {
    const ready = usePageTransition();
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
        <FullPageShell onClose={onClose} ready={ready}>
            <div className="pfp-body">
                <div className="pfp-media">
                    {images.length > 0 ? (
                        <div ref={scrollerRef} onScroll={handleScroll} className="pfp-scroller">
                            {images.map(img => (
                                <img key={img.id} src={img.url} alt={product.name} className="pfp-img" />
                            ))}
                        </div>
                    ) : (
                        <div className="pfp-img" style={{ background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ShopSvg size={48} />
                        </div>
                    )}
                    {images.length > 1 && (
                        <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 5 }}>
                            {images.map((_, i) => (
                                <span key={i} style={{
                                    width: i === activeIndex ? 16 : 6, height: 6, borderRadius: 3,
                                    background: i === activeIndex ? GOLD_BRIGHT : 'rgba(255,255,255,0.55)',
                                    boxShadow: '0 0 4px rgba(0,0,0,0.4)', transition: 'width 0.15s ease',
                                }} />
                            ))}
                        </div>
                    )}
                </div>

                <div className="pfp-details">
                    <div className="pfp-name">{product.name}</div>

                    <div className="pfp-price-row">
                        {hasDiscount && <span className="price-strike" style={{ fontSize: 15 }}>KES {product.original_price}</span>}
                        <span className="pfp-price">KES {finalPrice}</span>
                        {product.selling_unit ? <span className="pfp-unit">/ {product.selling_unit}</span> : null}
                        {hasDiscount && (
                            <span className="pfp-save-badge">
                                Save {Math.round(100 - (finalPrice / product.original_price) * 100)}%
                            </span>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                        {product.min_order_quantity > 1 && (
                            <span className="pfp-meta-pill">Min {product.min_order_quantity}</span>
                        )}
                        {product.track_inventory && product.stock_quantity !== null && product.stock_quantity > 0 && product.stock_quantity <= 5 && (
                            <span className="pfp-meta-pill pfp-meta-pill--low">Only {product.stock_quantity} left</span>
                        )}
                        {product.track_inventory && (product.stock_quantity === null || product.stock_quantity <= 0) && (
                            <span className="pfp-meta-pill pfp-meta-pill--out">Out of stock</span>
                        )}
                        {product.category_id && categoryNames[product.category_id] && (
                            <span className="pfp-meta-pill">{categoryNames[product.category_id]}</span>
                        )}
                    </div>

                    <div className="pfp-divider" />

                    <div className="pfp-desc-title">Description</div>
                    <p className="pfp-desc-text">
                        {product.description || 'No description provided for this product.'}
                    </p>

                    <div className="pfp-cart-zone">
                        {quantity > 0 ? (
                            <div className="pfp-qty-row">
                                <button onClick={onDec} className="pfp-qty-btn"><MinusSvg size={14} /></button>
                                <span className="pfp-qty-num">{quantity} in cart</span>
                                <button onClick={onInc} className="pfp-qty-btn"><PlusSvg size={14} /></button>
                            </div>
                        ) : purchasable ? (
                            <button onClick={onAdd} className="pfp-add-btn">
                                <CartAddSvg size={16} color="#fff" /> Add to Cart
                            </button>
                        ) : (
                            <button disabled className="pfp-add-btn pfp-add-btn--disabled">
                                Out of stock
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </FullPageShell>
    );
};

const ProductCard: React.FC<{
    product: Product;
    quantity: number;
    purchasable: boolean;
    onOpen: () => void;
    onAdd: () => void;
    onInc: () => void;
    onDec: () => void;
}> = ({ product, quantity, purchasable, onOpen, onAdd, onInc, onDec }) => {
    const [imgFailed, setImgFailed] = useState(false);
    const finalPrice = product.discount_price ?? product.original_price;
    const hasDiscount = !!product.discount_price && product.discount_price < product.original_price;
    const img = product.images?.[0]?.url;

    return (
        <div className="pc-card">
            <div onClick={onOpen} className="pc-img-wrap">
                {img && !imgFailed ? (
                    <img src={img} alt={product.name} onError={() => setImgFailed(true)} className="pc-img" />
                ) : (
                    <div className="pc-img" style={{ background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ShopSvg size={30} />
                    </div>
                )}
            </div>

            <div onClick={onOpen} className="pc-name-chip">{product.name}</div>
            <div className="pc-info">
                <div className="pc-price-row">
                    {hasDiscount && <span className="price-strike pc-price-strike">KES {product.original_price}</span>}
                    <span className="pc-price">KES {finalPrice}</span>
                    {product.selling_unit ? <span className="pc-price-unit">/ {product.selling_unit}</span> : null}
                </div>

                {(product.min_order_quantity > 1 || (product.track_inventory && product.stock_quantity !== null && product.stock_quantity > 0 && product.stock_quantity <= 5)) && (
                    <div className="pc-meta-row">
                        {product.min_order_quantity > 1 && (
                            <span className="pc-meta-pill">Min {product.min_order_quantity}</span>
                        )}
                        {product.track_inventory && product.stock_quantity !== null && product.stock_quantity > 0 && product.stock_quantity <= 5 && (
                            <span className="pc-meta-pill pc-meta-pill--low">Only {product.stock_quantity} left</span>
                        )}
                    </div>
                )}

                {/* Cart control now sits under the details, not floating on the image */}
                <div className="pc-cart-zone" onClick={e => e.stopPropagation()}>
                    {quantity > 0 ? (
                        <div className="pc-qty-pill">
                            <button onClick={onDec} className="pc-qty-btn"><MinusSvg size={11} /></button>
                            <span className="pc-qty-num">{quantity}</span>
                            <button onClick={onInc} className="pc-qty-btn"><PlusSvg size={11} /></button>
                        </div>
                    ) : purchasable ? (
                        <button onClick={onAdd} className="pc-cart-btn" aria-label="Add to cart">
                            <CartAddSvg size={13} /> <span>Add</span>
                        </button>
                    ) : (
                        <button disabled className="pc-cart-btn pc-cart-btn--disabled">
                            Out of stock
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const BusinessProfile: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const [business, setBusiness] = useState<any>(null);
    const navigate = useNavigate();
    const location = useLocation();
    const handleBack = () => {
        // If this page is the very first entry in this browser session
        // (direct URL, bookmark, refresh), React Router sets location.key
        // to 'default'. In that case there is no in-app route behind us,
        // so go to Customer Home with replace (avoids Back returning to
        // the browser's prior unrelated page).
        if ((location as any).key === 'default') {
            navigate('/', { replace: true });
        } else {
            navigate(-1);
        }
    };
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
    const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const handleCopyLink = async () => {
        const url = `https://hakika.co.ke/customer/business/${slug}`;
        try {
            await navigator.clipboard.writeText(url);
            setToastMessage('Link copied');
        } catch {
            // Fallback for browsers without the async clipboard API
            try {
                const ta = document.createElement('textarea');
                ta.value = url;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                setToastMessage('Link copied');
            } catch {
                setToastMessage('Could not copy link');
            }
        }
    };
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [cartMini, setCartMini] = useState(true);
    const [itemsListOpen, setItemsListOpen] = useState(false);
    const [categoryNames, setCategoryNames] = useState<Record<number, string>>({});
    const productsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!slug) return;

        // Reuse cached data if returning to the same business within TTL
        const cached = profileCache.get(slug);
        if (cached && Date.now() - cached.ts < PROFILE_CACHE_TTL_MS) {
            setBusiness(cached.business);
            setProducts(cached.products);
            setLoading(false);
            setError('');
            return;
        }

        setLoading(true);
        Promise.all([
            api.businessById(slug),
            api.customerProducts.listByBusiness(slug),
        ])
            .then(([biz, prodList]) => {
                setBusiness(biz);
                setProducts(prodList || []);
                profileCache.set(slug, {
                    business: biz,
                    products: prodList || [],
                    ts: Date.now(),
                });
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [slug]);

    // Best-effort category name lookup; failure must not affect product loading.
    useEffect(() => {
        api.categories()
            .then((cats: any[]) => {
                const map: Record<number, string> = {};
                (cats || []).forEach(c => { if (c && typeof c.id === 'number') map[c.id] = c.name; });
                setCategoryNames(map);
            })
            .catch(() => { /* non-fatal */ });
    }, []);

    // Land straight on the products, not the header — the person can
    // still scroll up a bit to see the cover, logo, and welcome belt.
    useEffect(() => {
        if (!loading && business && productsRef.current) {
            productsRef.current.scrollIntoView({ block: 'start' });
        }
    }, [loading, business]);

    // Effective maximum the customer may select for a product (client-side UX cap only).
    const effectiveMaxFor = (p: Product): number | null => {
        const stockCap = p.track_inventory && p.stock_quantity !== null ? p.stock_quantity : null;
        const orderCap = p.max_order_quantity;
        const candidates: number[] = [];
        if (stockCap !== null) candidates.push(stockCap);
        if (orderCap !== null && orderCap !== undefined) candidates.push(orderCap);
        if (candidates.length === 0) return null;
        return Math.min(...candidates);
    };

    const isOutOfStock = (p: Product): boolean =>
        p.track_inventory && (p.stock_quantity === null || p.stock_quantity <= 0);

    const isPurchasable = (p: Product): boolean => {
        if (isOutOfStock(p)) return false;
        const max = effectiveMaxFor(p);
        if (max !== null && max < p.min_order_quantity) return false;
        return true;
    };

    const addToCart = (product: Product) => {
        if (!isPurchasable(product)) return;
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                const max = effectiveMaxFor(product);
                const next = existing.quantity + 1;
                const capped = max !== null ? Math.min(next, max) : next;
                return prev.map(item =>
                    item.product.id === product.id ? { ...item, quantity: capped } : item
                );
            }
            return [...prev, { product, quantity: product.min_order_quantity }];
        });
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.product.id !== productId));
    };

    const updateQuantity = (productId: string, quantity: number) => {
        const entry = cart.find(i => i.product.id === productId);
        if (!entry) return;
        const min = entry.product.min_order_quantity;
        if (quantity < min) { removeFromCart(productId); return; }
        const max = effectiveMaxFor(entry.product);
        const next = max !== null ? Math.min(quantity, max) : quantity;
        setCart(prev => prev.map(item =>
            item.product.id === productId ? { ...item, quantity: next } : item
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
            <style>{`@keyframes gold-spin { to { transform: rotate(360deg); } }`}</style>
            <GoldSpinner />
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

    const bottomPadding = totalItems === 0 ? 24 : cartMini ? 96 : (itemsListOpen ? 420 : 210);


    return (
        <div style={{ background: '#f9fafb', minHeight: '100vh', paddingBottom: bottomPadding }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&display=swap');

                .profile-back-btn {
                    position: fixed;
                    top: 12px;
                    left: 12px;
                    z-index: 1100;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: rgba(15,23,42,0.55);
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    backdrop-filter: blur(4px);
                }
                @media (min-width: 860px) {
                    .profile-back-btn { top: 124px; }
                }

                @keyframes gold-spin { to { transform: rotate(360deg); } }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

                .page-wrap { max-width: 900px; margin: 0 auto; width: 100%; }

                .price-strike { position: relative; color: #9ca3af; font-size: 10.5px; white-space: nowrap; }
                .price-strike::after {
                    content: ''; position: absolute; left: -2px; right: -2px; top: 52%;
                    height: 2px; background: #ef4444; transform: rotate(-7deg);
                }

                /* ── Full-page chrome ─────────────────────────── */
                .fp-shell { position: fixed; top: 0; left: 0; right: 0; bottom: 56px; z-index: 2500; overflow: hidden; }
                .fp-topbar { position: absolute; top: 0; left: 0; right: 0; z-index: 20; display: flex; padding: 10px 12px; pointer-events: none; }
                .fp-topbar .fp-back-btn { pointer-events: auto; }
                .fp-back-btn {
                    width: 40px; height: 40px; border-radius: 50%;
                    background: rgba(15,23,42,0.55);
                    border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
                }
                .fp-scroll-area { position: absolute; inset: 0; overflow-y: auto; padding-top: 46px; }
                .fp-content { animation: fadeIn 260ms ease; }

                /* ── Profile page styling ─────────────────────── */
                .profile-page-inner { max-width: 640px; margin: 0 auto; padding: 0 18px 40px; }
                .profile-hero { text-align: center; padding: 6px 0 20px; border-bottom: 1px solid #eee0c0; margin-bottom: 18px; }
                .profile-script { font-family: system-ui, -apple-system, sans-serif; font-weight: 700; font-size: 34px; color: ${GOLD}; }
                .profile-desc { font-size: 13px; color: #6b7280; margin: 4px 0 12px; line-height: 1.6; }
                .profile-open-pill {
                    display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 20px;
                    font-size: 12.5px; font-weight: 700; color: #fff;
                }
                .profile-open-pill.is-open { background: #16a34a; }
                .profile-open-pill.is-closed { background: #ef4444; }
                .profile-panel { background: #fffdf7; border: 1px solid #f1e5c3; border-radius: 14px; padding: 14px 16px; margin-bottom: 8px; }
                .profile-row { display: flex; align-items: center; gap: 8px; font-size: 13.5px; color: #374151; padding: 7px 0; }
                .profile-section-title { font-size: 13px; font-weight: 700; color: ${GOLD}; margin: 20px 2px 8px; letter-spacing: 0.3px; }
                .profile-pay-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #6b7280; padding: 8px 0; }
                .profile-pay-row.active-blue { color: #1d4ed8; font-weight: 700; }
                .profile-pay-row.active-green { color: #16a34a; font-weight: 700; }
                .profile-pay-note { margin-top: 8px; padding-top: 10px; border-top: 1px dashed #f1e5c3; font-size: 12px; color: #92794a; line-height: 1.6; }
                .profile-hours-row { display: flex; align-items: center; justify-content: space-between; font-size: 13px; color: #374151; padding: 7px 0; border-bottom: 1px solid #f7f0dd; }
                .profile-hours-row:last-child { border-bottom: none; }
                .profile-hours-row span:first-child { display: flex; align-items: center; gap: 6px; }

                /* ── New product meta pills (Phase 3) ─────────── */
                .pfp-unit { font-size: 12.5px; font-weight: 600; color: #6b7280; margin-left: 2px; }
                .pfp-meta-pill { font-size: 11px; font-weight: 700; color: #374151; background: #f3f4f6; border: 1px solid #e5e7eb; padding: 3px 8px; border-radius: 20px; }
                .pfp-meta-pill--low { color: #b45309; background: #fef3c7; border-color: #fde68a; }
                .pfp-meta-pill--out { color: #b91c1c; background: #fee2e2; border-color: #fecaca; }
                .pfp-add-btn--disabled { background: #9ca3af; box-shadow: none; cursor: not-allowed; }

                .pc-price-unit { font-size: 10px; font-weight: 600; color: #6b7280; }
                .pc-meta-row { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 6px; }
                .pc-meta-pill { font-size: 9.5px; font-weight: 700; color: #374151; background: #f3f4f6; border: 1px solid #e5e7eb; padding: 1px 6px; border-radius: 20px; }
                .pc-meta-pill--low { color: #b45309; background: #fef3c7; border-color: #fde68a; }
                .pc-cart-btn--disabled { background: #f3f4f6; border-color: #e5e7eb; color: #9ca3af; cursor: not-allowed; }

                /* ── Product page styling ─────────────────────── */
                .pfp-body { max-width: 900px; margin: 0 auto; padding: 0 0 40px; }
                .pfp-media { position: relative; }
                .pfp-scroller { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; }
                .pfp-img { width: 100%; aspect-ratio: 4 / 5; object-fit: cover; flex-shrink: 0; scroll-snap-align: center; display: block; }
                .pfp-details { padding: 20px 18px 16px; }
                .pfp-name { font-family: 'Caveat', cursive; font-weight: 700; font-size: 32px; color: ${GOLD}; line-height: 1.15; }
                .pfp-price-row { display: flex; align-items: baseline; gap: 10px; margin: 10px 0 4px; flex-wrap: wrap; }
                .pfp-price { font-size: 24px; font-weight: 800; color: #16a34a; }
                .pfp-save-badge { background: #fef2f2; color: #ef4444; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px; }
                .pfp-divider { height: 1px; background: linear-gradient(90deg, transparent, #eddca0, transparent); margin: 16px 0; }
                .pfp-desc-title { font-size: 13px; font-weight: 700; color: #111827; margin-bottom: 4px; }
                .pfp-desc-text { font-size: 13.5px; color: #4b5563; line-height: 1.7; margin-bottom: 22px; }
                .pfp-cart-zone { }
                .pfp-add-btn {
                    width: 100%; padding: 14px; background: linear-gradient(135deg, #16a34a, #15803d); color: #fff; border: none;
                    border-radius: 14px; font-size: 14.5px; font-weight: 700; cursor: pointer; font-family: inherit;
                    display: flex; align-items: center; justify-content: center; gap: 8px;
                    box-shadow: 0 6px 16px rgba(22,163,74,0.3);
                }
                .pfp-qty-row { display: flex; align-items: center; justify-content: space-between; background: #ECFDF5; border-radius: 14px; padding: 10px 16px; }
                .pfp-qty-btn { width: 34px; height: 34px; border-radius: 50%; border: none; background: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.15); }
                .pfp-qty-num { font-size: 15px; font-weight: 700; color: #16a34a; }

                /* ── Product grid ─────────────────────────────── */
                .product-grid { display: grid; grid-template-columns: repeat(2, 1fr); column-gap: 16px; row-gap: 40px; padding: 0 4px; }

                .pc-card { background: #fff; overflow: hidden; border-radius: 10px; }
                .pc-img-wrap { width: 100%; cursor: pointer; }
                .pc-img { width: 100%; aspect-ratio: 3 / 4; object-fit: cover; display: block; }
                .pc-name-chip {
                    font-family: 'Caveat', cursive; font-weight: 700; font-size: 18px; color: ${GOLD}; background: #f3f4f6;
                    padding: 3px 8px 0; cursor: pointer; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                }
                .pc-info { padding: 0 8px 8px; background: #f3f4f6; }
                .pc-price-row { display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap; margin-bottom: 6px; }
                .pc-price { font-size: 13px; font-weight: 800; color: #111827; }
                .pc-cart-zone { }
                .pc-cart-btn {
                    display: flex; align-items: center; gap: 5px; border-radius: 8px; padding: 5px 10px;
                    background: #fff; border: 1px solid #bbf7d0; cursor: pointer; font-size: 11.5px; font-weight: 700; color: #16a34a;
                }
                .pc-qty-pill { display: flex; align-items: center; justify-content: space-between; gap: 4px; background: #fff; border: 1px solid #bbf7d0; border-radius: 8px; padding: 4px 8px; }
                .pc-qty-btn { width: 20px; height: 20px; border-radius: 50%; border: none; background: #ECFDF5; display: flex; align-items: center; justify-content: center; cursor: pointer; }
                .pc-qty-num { font-size: 12px; font-weight: 700; color: #16a34a; min-width: 12px; text-align: center; }

                /* ── Header: logo sits on the lower-left corner of the cover ── */
                .top-header { padding: 18px 12px 0; }
                .cover-logo-wrap { position: relative; max-width: 480px; margin: 0 auto; }
                .logo-ring {
                    cursor: pointer; padding: 4px; border-radius: 50%; flex-shrink: 0;
                    background: ${GOLD};
                    position: absolute; left: 18px; bottom: -34px; z-index: 3;
                    box-shadow: 0 4px 14px rgba(0,0,0,0.25);
                }
                .logo-ring-inner { padding: 3px; border-radius: 50%; background: #f9fafb; }
                .logo-img { width: 76px; height: 76px; object-fit: cover; border-radius: 50%; display: block; }

                .cover-wrap {
                    position: relative; width: 100%; aspect-ratio: 2 / 1; max-width: 480px; margin: 0 auto;
                    background: #f3f4f6; overflow: hidden; cursor: pointer; border-radius: 18px;
                }

                .header-name { text-align: center; margin: 46px 0 0; font-family: system-ui, -apple-system, sans-serif; font-weight: 800; font-size: 32px; color: #111827; letter-spacing: 0.2px; }

                .header-controls-row { display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 12px; flex-wrap: wrap; }
                .side-btn {
                    display: flex; align-items: center; gap: 6px; background: #f3f4f6; border: none;
                    border-radius: 8px; padding: 8px 12px; cursor: pointer; font-family: inherit; flex-shrink: 0;
                }
                .side-btn.search-btn { background: #f0fdf4; border: 1px solid #bbf7d0; }
                .status-pill { display: flex; align-items: center; gap: 5px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 12px; }

                .search-row { display: flex; align-items: center; gap: 7px; padding: 12px 4px 4px; }

                /* ── Desktop ───────────────────────────────────── */
                @media (min-width: 900px) {
                    .fp-shell { top: 76px; bottom: 0; }
                    .page-wrap { max-width: 1600px; padding: 0 32px; }
                    .top-header { padding-top: 4px; }
                    .logo-ring { left: 32px; bottom: -55px; padding: 5px; }
                    .logo-img { width: 120px; height: 120px; }
                    .side-btn, .status-pill { padding: 10px 18px; font-size: 13.5px; }
                    .cover-wrap { max-width: 620px; border-radius: 22px; }
                    .cover-logo-wrap { max-width: 620px; }
                    .header-name { font-size: 48px; margin-top: 70px; }
                    .welcome-belt-text { font-size: 21px; }

                    .product-grid { grid-template-columns: repeat(4, 300px); justify-content: space-between; row-gap: 56px; padding: 0; }
                    .pc-card { border-radius: 10px; }
                    .pc-name-chip { font-size: 20px; padding: 6px 12px 0; }
                    .pc-info { padding: 0 12px 12px; }
                    .pc-price { font-size: 16px; }
                    .price-strike { font-size: 13px; }
                    .pc-cart-btn, .pc-qty-pill { font-size: 13px; padding: 7px 14px; }

                    .pfp-body { display: flex; gap: 48px; align-items: flex-start; padding-top: 8px; }
                    .pfp-media { flex: 1.1; }
                    .pfp-img { aspect-ratio: 4 / 5; border-radius: 14px; }
                    .pfp-details { flex: 1; padding: 8px 0 0; }
                    .pfp-name { font-size: 40px; }
                    .pfp-price { font-size: 30px; }
                }
            `}</style>

            {lightbox && <ImageFullPage src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}

            {quickViewProduct && (
                <ProductFullPage
                    product={quickViewProduct}
                    quantity={cartQuantityFor(quickViewProduct.id)}
                    purchasable={isPurchasable(quickViewProduct)}
                    categoryNames={categoryNames}
                    onAdd={() => addToCart(quickViewProduct)}
                    onInc={() => updateQuantity(quickViewProduct.id, cartQuantityFor(quickViewProduct.id) + 1)}
                    onDec={() => updateQuantity(quickViewProduct.id, cartQuantityFor(quickViewProduct.id) - 1)}
                    onClose={() => setQuickViewProduct(null)}
                />
            )}

            {detailsOpen && (
                <ProfileFullPage
                    business={business}
                    hours={hours}
                    open={open}
                    status={status}
                    productCount={products.length}
                    onClose={() => setDetailsOpen(false)}
                />
            )}

            <button
                type="button"
                onClick={handleBack}
                className="profile-back-btn"
                aria-label="Back"
            >
                <BackArrowSvg color={GOLD_BRIGHT} />
            </button>

            <div className="page-wrap">
                {/* ── Logo overlapping the top edge of the square cover ── */}
                <div className="top-header">
                    <div className="cover-logo-wrap">
                        <div className="cover-wrap" onClick={() => setLightbox({ src: coverSrc, alt: business.name })}>
                            <CoverImage src={coverSrc} alt={business.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        </div>

                        <div onClick={() => setLightbox({ src: logoSrc, alt: business.name })} className="logo-ring">
                            <div className="logo-ring-inner">
                                <LogoImg src={logoSrc} alt={business.name} className="logo-img" />
                            </div>
                        </div>
                    </div>

                    <h1 className="header-name">{business.name}</h1>

                    {/* ── Search / Profile / Open-Closed — below the cover ── */}
                    <div className="header-controls-row">
                        <button className="side-btn search-btn" onClick={() => setSearchOpen(v => !v)}>
                            <SearchSvg color="#16a34a" size={13} />
                            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#16a34a' }}>Search</span>
                        </button>

                        <button className="side-btn" onClick={() => setDetailsOpen(true)}>
                            <ProfileBadgeSvg />
                            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#2563eb' }}>Profile</span>
                        </button>

                        <div className="status-pill">
                            {open ? <CheckCircleSvg size={13} /> : <XCircleSvg size={13} />}
                            <span style={{ fontSize: 12.5, fontWeight: 700, color: open ? '#16a34a' : '#ef4444' }}>
                                {open ? 'Open' : 'Closed'}
                            </span>
                        </div>

                        <button className="side-btn" onClick={handleCopyLink} type="button">
                            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#4b5563' }}>Copy link</span>
                        </button>
                    </div>

                    {toastMessage && (
                        <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
                    )}

                    {searchOpen && (
                        <div className="search-row">
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

                {/* ── Products masonry grid ───────────────────────────── */}
                <div ref={productsRef} style={{ padding: '12px 4px 16px', scrollMarginTop: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 10, padding: '0 4px' }}>
                        Products {products.length > 0 && <span style={{ color: '#9ca3af', fontWeight: 500 }}>({products.length})</span>}
                    </div>

                    {products.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af', fontSize: 12.5 }}>No products listed yet</div>
                    ) : filteredProducts.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af', fontSize: 12.5 }}>No products match "{searchQuery}"</div>
                    ) : (
                        <div className="product-grid">
                            {filteredProducts.map((product, i) => {
                                // Seeded pseudo-random offset so cards feel randomly staggered
                                // (sometimes the left one is lower, sometimes the right one is)
                                // rather than a repeating up/down/up/down column pattern.
                                const seed = Math.sin(i * 12.9898) * 43758.5453;
                                const frac = seed - Math.floor(seed);
                                const offset = Math.round((frac - 0.5) * 2 * 18); // -18px .. 18px
                                return (
                                    <div key={product.id} style={{ transform: `translateY(${offset}px)` }}>
                                        <ProductCard
                                            product={product}
                                            quantity={cartQuantityFor(product.id)}
                                            purchasable={isPurchasable(product)}
                                            onOpen={() => setQuickViewProduct(product)}
                                            onAdd={() => addToCart(product)}
                                            onInc={() => updateQuantity(product.id, cartQuantityFor(product.id) + 1)}
                                            onDec={() => updateQuantity(product.id, cartQuantityFor(product.id) - 1)}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

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