import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useOrdersContext } from '../OrdersContext';

/* ---------- inline SVG icons ---------- */

const IconClock = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 7 12 12 15.5 14" />
    </svg>
);

const IconBox = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <polyline points="3.29 7 12 12 20.71 7" />
        <line x1="12" y1="22" x2="12" y2="12" />
    </svg>
);

const IconBike = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="5.5" cy="17.5" r="3.5" />
        <circle cx="18.5" cy="17.5" r="3.5" />
        <circle cx="15" cy="5" r="1" />
        <path d="M12 17.5V14l-3-3 4-3 2 3h2" />
    </svg>
);

const IconPin = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
    </svg>
);

const IconThumbsUp = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 10v12" />
        <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
    </svg>
);

const IconWallet = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
        <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
);

const IconCash = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="12" cy="12" r="2" />
        <path d="M6 12h.01M18 12h.01" />
    </svg>
);

const IconFlag = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
);

const IconX = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

const IconAlertTriangle = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
);

const IconPackageSearch = () => (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l1-.55" />
        <polyline points="3.29 7 12 12 20.71 7" />
        <line x1="12" y1="22" x2="12" y2="12" />
        <circle cx="18.5" cy="17.5" r="3.5" />
        <line x1="21" y1="20" x2="22.5" y2="21.5" />
    </svg>
);

const IconChevronRight = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
    </svg>
);

const IconSearch = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7.5" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);

const IconZoomIn = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7.5" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
        <line x1="11" y1="8" x2="11" y2="14" />
        <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
);

const IconStorefront = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 9V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v4" />
        <path d="M3 9h18l-1 4a2 2 0 0 1-2 1.5H6A2 2 0 0 1 4 13z" />
        <path d="M5 14.5V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-4.5" />
        <path d="M10 20v-4h4v4" />
    </svg>
);

/* ---------- status configuration ---------- */

const STATUS_META: Record<string, { label: string; icon: React.FC; tone: string }> = {
    waiting_acceptance: { label: 'Waiting for business', icon: IconClock, tone: 'neutral' },
    accepted: { label: 'Accepted', icon: IconThumbsUp, tone: 'info' },
    preparing: { label: 'Preparing', icon: IconBox, tone: 'info' },
    ready_for_delivery: { label: 'Ready for delivery', icon: IconBox, tone: 'info' },
    out_for_delivery: { label: 'On the way', icon: IconBike, tone: 'accent' },
    arrived: { label: 'Arrived', icon: IconPin, tone: 'accent' },
    customer_confirmed_delivery: { label: 'Delivery confirmed', icon: IconThumbsUp, tone: 'success' },
    payment_pending: { label: 'Payment pending', icon: IconWallet, tone: 'warn' },
    paid: { label: 'Paid', icon: IconCash, tone: 'success' },
    completed: { label: 'Completed', icon: IconFlag, tone: 'success' },
    cancelled: { label: 'Cancelled', icon: IconX, tone: 'danger' },
    delivery_failed: { label: 'Delivery failed', icon: IconAlertTriangle, tone: 'danger' },
    dispute_review: { label: 'Under review', icon: IconAlertTriangle, tone: 'warn' },
};

/* Groups orders into broad stage tabs */
type StageKey = 'all' | 'in_progress' | 'out_for_delivery' | 'payment' | 'completed' | 'cancelled';

const STAGE_TABS: { key: StageKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'out_for_delivery', label: 'Delivery' },
    { key: 'payment', label: 'Payment' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
];

const statusToStage = (status: string): StageKey => {
    switch (status) {
        case 'waiting_acceptance':
        case 'accepted':
        case 'preparing':
        case 'ready_for_delivery':
            return 'in_progress';
        case 'out_for_delivery':
        case 'arrived':
        case 'customer_confirmed_delivery':
            return 'out_for_delivery';
        case 'payment_pending':
            return 'payment';
        case 'paid':
        case 'completed':
            return 'completed';
        case 'cancelled':
        case 'delivery_failed':
        case 'dispute_review':
            return 'cancelled';
        default:
            return 'in_progress';
    }
};

const MyOrders: React.FC = () => {
    const { orders, loading, refreshing, error, setError, phone, fetchOrders, clearOrders, activeStage, setActiveStage, searchQuery, setSearchQuery } = useOrdersContext();
    const [inputPhone, setInputPhone] = useState('');
    const [zoomedLogo, setZoomedLogo] = useState<{ url: string; name: string } | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const stored = sessionStorage.getItem('hakika_customer_phone');
        if (stored) {
            setInputPhone(stored);
            fetchOrders(stored);
        }
    }, [fetchOrders, phone]);


    const handleSwitchNumber = () => {
        sessionStorage.removeItem('hakika_customer_phone');
        setInputPhone('');
        clearOrders();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputPhone.trim()) {
            setError('Please enter your phone number');
            return;
        }
        const normalized = inputPhone.trim();
        sessionStorage.setItem('hakika_customer_phone', normalized);
        fetchOrders(normalized);
    };

    const stageCounts: Record<StageKey, number> = {
        all: orders.length,
        in_progress: 0,
        out_for_delivery: 0,
        payment: 0,
        completed: 0,
        cancelled: 0,
    };
    orders.forEach(o => {
        const stage = statusToStage(o.status);
        stageCounts[stage] = (stageCounts[stage] || 0) + 1;
    });

    const searchedOrders = orders.filter(o => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.trim().toLowerCase();
        const businessMatch = (o.business_name || '').toLowerCase().includes(q);
        const orderNoMatch = (o.order_number || '').toLowerCase().includes(q);
        const itemMatch = (o.items || []).some((i: any) => (i.product_name || '').toLowerCase().includes(q));
        return businessMatch || orderNoMatch || itemMatch;
    });

    const visibleOrders = searchedOrders.filter(o => activeStage === 'all' || statusToStage(o.status) === activeStage);

    return (
        <div className="mo-page">
            <style>{styles}</style>
            <div className="mo-container">
                <button className="mo-back-btn" onClick={() => navigate('/')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                    Back
                </button>
                <h1 className="mo-title">My Orders</h1>

                {!phone ? (
                    <form onSubmit={handleSubmit} className="mo-phone-card">
                        <label htmlFor="mo-phone" className="mo-label">Enter your phone number to view orders</label>
                        <input
                            id="mo-phone"
                            type="tel"
                            value={inputPhone}
                            onChange={e => setInputPhone(e.target.value)}
                            placeholder="0712345678"
                            className="mo-input"
                            required
                        />
                        <button type="submit" disabled={loading} className="mo-btn mo-btn-primary">
                            {loading ? 'Loading…' : 'View orders'}
                        </button>
                    </form>
                ) : (
                    <div className="mo-phone-bar">
                        <span className="mo-phone-label">Phone: <strong>{phone}</strong></span>
                        <button onClick={handleSwitchNumber} className="mo-link-btn">
                            Enter a different number
                        </button>
                    </div>
                )}

                {error && <p className="mo-error">{error}</p>}

                {loading && (
                    <div className="mo-loading">
                        <div className="mo-spinner" />
                        <p>Loading your orders…</p>
                    </div>
                )}

                {!loading && phone && orders.length === 0 && !error && (
                    <div className="mo-empty">
                        <IconPackageSearch />
                        <p>No orders found for this number.</p>
                    </div>
                )}

                {!loading && phone && orders.length > 0 && (
                    <>
                        <div className="mo-search-bar">
                            <IconSearch />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search by business, order number, or item"
                                className="mo-search-input"
                            />
                            {searchQuery && (
                                <button className="mo-search-clear" onClick={() => setSearchQuery('')} aria-label="Clear search">
                                    <IconX />
                                </button>
                            )}
                        </div>

                        <div className="mo-tabs">
                            {STAGE_TABS.map(tab => (
                                <button
                                    key={tab.key}
                                    className={`mo-tab ${activeStage === tab.key ? 'active' : ''}`}
                                    onClick={() => setActiveStage(tab.key)}
                                >
                                    {tab.label}
                                    <span className="mo-tab-count">{stageCounts[tab.key] || 0}</span>
                                </button>
                            ))}
                        </div>

                        {visibleOrders.length === 0 && (
                            <div className="mo-empty">
                                <IconPackageSearch />
                                <p>No orders match your search or filter.</p>
                            </div>
                        )}
                    </>
                )}

                <div className="mo-orders-grid">
                    {visibleOrders.map(order => {
                        const meta = STATUS_META[order.status] || { label: order.status, icon: IconClock, tone: 'neutral' };
                        const StatusIcon = meta.icon;
                        return (
                            <div
                                key={order.id}
                                className="mo-order-card"
                                onClick={() => navigate(`/order/${order.id}`)}
                                role="button"
                                tabIndex={0}
                            >
                                <div className="mo-order-header">
                                    {order.business_logo_url ? (
                                        <button
                                            type="button"
                                            className="mo-logo-btn"
                                            onClick={e => {
                                                e.stopPropagation();
                                                setZoomedLogo({ url: order.business_logo_url, name: order.business_name || 'Business' });
                                            }}
                                            aria-label="Zoom business logo"
                                        >
                                            <span className="mo-logo-ring">
                                                <img src={order.business_logo_url} alt="Business logo" className="mo-order-logo" />
                                            </span>
                                            <span className="mo-logo-zoom-hint"><IconZoomIn /></span>
                                        </button>
                                    ) : (
                                        <span className="mo-logo-ring">
                                            <span className="mo-order-logo placeholder"><IconStorefront /></span>
                                        </span>
                                    )}
                                    <div className="mo-order-header-text">
                                        <div className="mo-order-business">{order.business_name || 'Business'}</div>
                                        <div className="mo-order-number">{order.order_number}</div>
                                    </div>
                                    <span className="mo-chevron"><IconChevronRight /></span>
                                </div>

                                <div className={`mo-status-badge tone-${meta.tone}`}>
                                    <span className="mo-status-icon"><StatusIcon /></span>
                                    <span>{meta.label}</span>
                                </div>

                                {order.items && order.items.length > 0 && (
                                    <p className="mo-order-items">
                                        {order.items.slice(0, 2).map((i: any) => `${i.product_name} ×${i.quantity}`).join(', ')}
                                        {order.items.length > 2 ? ` +${order.items.length - 2} more` : ''}
                                    </p>
                                )}

                                <div className="mo-order-footer">
                                    <span className="mo-order-total">KES {order.total_amount}</span>
                                    <span className="mo-order-date">{new Date(order.created_at).toLocaleString()}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {zoomedLogo && (
                <div className="mo-zoom-overlay" onClick={() => setZoomedLogo(null)}>
                    <button className="mo-zoom-close" onClick={() => setZoomedLogo(null)} aria-label="Close">
                        <IconX />
                    </button>
                    <span className="mo-zoom-ring">
                        <img
                            src={zoomedLogo.url}
                            alt={zoomedLogo.name}
                            className="mo-zoom-image"
                            onClick={e => e.stopPropagation()}
                        />
                    </span>
                    <p className="mo-zoom-caption">{zoomedLogo.name}</p>
                </div>
            )}
        </div>
    );
};

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');

* { box-sizing: border-box; }

.mo-page {
    --ink: #16233F;
    --ink-soft: #48557A;
    --gold: #C79A3D;
    --gold-deep: #96721E;
    --gold-light: #F0D48A;
    --ring-light: #FBF0D2;
    --ring-mid: #EFD397;
    --ring-deep: #DCB669;
    --paper: #FAF7F1;
    --card: #FFFFFF;
    --line: #EAE3D4;
    --muted: #8B8474;

    min-height: 100vh;
    background: var(--paper);
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    color: var(--ink);
    padding: 16px;
}

.mo-container {
    max-width: 900px;
    margin: 0 auto;
}

.mo-back-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: none;
    border: none;
    color: var(--ink-soft);
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    padding: 8px 0;
}

.mo-back-btn:hover { color: var(--ink); }

.mo-title {
    font-family: 'Space Grotesk', 'Inter', sans-serif;
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.01em;
    margin: 2px 0 20px;
    color: var(--ink);
}

.mo-phone-card {
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 20px;
    box-shadow: 0 1px 2px rgba(22,35,63,0.04);
    max-width: 420px;
    margin-bottom: 20px;
}

.mo-label {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: var(--ink-soft);
    margin-bottom: 8px;
}

.mo-input {
    width: 100%;
    padding: 11px 13px;
    font-size: 15px;
    font-family: 'Inter', sans-serif;
    border: 1px solid var(--line);
    border-radius: 9px;
    background: var(--paper);
    color: var(--ink);
    margin-bottom: 14px;
}

.mo-input:focus {
    outline: none;
    border-color: var(--gold);
    background: #fff;
    box-shadow: 0 0 0 3px rgba(199,154,61,0.16);
}

.mo-btn {
    border: none;
    border-radius: 9px;
    padding: 12px 20px;
    font-size: 14px;
    font-weight: 600;
    font-family: 'Inter', sans-serif;
    cursor: pointer;
    transition: filter 0.15s ease;
}

.mo-btn-primary {
    background: var(--ink);
    color: #fff;
    width: 100%;
}

.mo-btn-primary:hover:not(:disabled) { filter: brightness(1.15); }

.mo-btn-primary:disabled {
    opacity: 0.55;
    cursor: not-allowed;
}

.mo-phone-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
    background: var(--card);
    border: 1px solid var(--line);
    padding: 12px 16px;
    border-radius: 12px;
    margin-bottom: 20px;
}

.mo-phone-label {
    font-size: 14px;
    color: var(--ink-soft);
}

.mo-link-btn {
    background: none;
    border: none;
    color: var(--gold-deep);
    cursor: pointer;
    text-decoration: underline;
    font-size: 13px;
    font-weight: 600;
    padding: 0;
}

.mo-error {
    color: #B23A2E;
    font-size: 14px;
    margin-bottom: 12px;
    font-weight: 500;
}

.mo-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 0;
    color: var(--muted);
    gap: 14px;
    font-size: 14px;
}

.mo-spinner {
    width: 30px;
    height: 30px;
    border: 3px solid var(--line);
    border-top-color: var(--gold);
    border-radius: 50%;
    animation: mo-spin 0.8s linear infinite;
}

@keyframes mo-spin {
    to { transform: rotate(360deg); }
}

.mo-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 56px 20px;
    color: var(--muted);
    text-align: center;
    gap: 12px;
}

.mo-empty p {
    font-size: 14px;
    margin: 0;
}

.mo-search-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 11px;
    padding: 10px 14px;
    margin-bottom: 14px;
    color: var(--muted);
}

.mo-search-bar:focus-within {
    border-color: var(--gold);
    box-shadow: 0 0 0 3px rgba(199,154,61,0.16);
}

.mo-search-input {
    flex: 1;
    border: none;
    outline: none;
    font-size: 14px;
    font-family: 'Inter', sans-serif;
    color: var(--ink);
    background: transparent;
}

.mo-search-clear {
    background: none;
    border: none;
    color: var(--muted);
    cursor: pointer;
    display: flex;
    padding: 2px;
}

.mo-search-clear:hover { color: var(--ink-soft); }

.mo-tabs {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 6px;
    margin-bottom: 18px;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
}

.mo-tabs::-webkit-scrollbar { display: none; }

.mo-tab {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
    border: 1px solid var(--line);
    background: var(--card);
    color: var(--ink-soft);
    font-family: 'Space Grotesk', sans-serif;
    padding: 8px 14px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s ease;
}

.mo-tab:hover { border-color: var(--gold-light); }

.mo-tab.active {
    background: var(--ink);
    border-color: var(--ink);
    color: #fff;
}

.mo-tab-count {
    background: rgba(22,35,63,0.07);
    color: inherit;
    border-radius: 999px;
    padding: 1px 7px;
    font-size: 11px;
}

.mo-tab.active .mo-tab-count { background: rgba(199,154,61,0.5); }

.mo-orders-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
}

@media (min-width: 640px) {
    .mo-orders-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (min-width: 1000px) {
    .mo-orders-grid { grid-template-columns: repeat(3, 1fr); }
}

.mo-order-card {
    position: relative;
    background: var(--card);
    border-radius: 14px;
    padding: 12px 14px;
    box-shadow: 0 1px 2px rgba(22,35,63,0.05);
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
    border: 1px solid var(--line);
    overflow: hidden;
}

.mo-order-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 24px rgba(22,35,63,0.09);
    border-color: var(--gold-light);
}

.mo-order-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
}

/* --- logo: 2x size, circular, golden ring --- */

.mo-logo-btn {
    position: relative;
    width: 80px;
    height: 80px;
    padding: 0;
    border: none;
    background: none;
    cursor: zoom-in;
    flex-shrink: 0;
    border-radius: 50%;
}

.mo-logo-ring {
    display: block;
    width: 80px;
    height: 80px;
    border-radius: 50%;
    padding: 3px;
    background: linear-gradient(135deg, var(--ring-light), var(--ring-mid) 55%, var(--ring-deep));
    box-shadow: 0 3px 10px rgba(220,182,105,0.4);
    flex-shrink: 0;
    position: relative;
    overflow: hidden;
}

.mo-logo-ring::after {
    content: '';
    position: absolute;
    inset: -40% -10%;
    background: linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.55) 50%, transparent 60%);
    transform: translateX(-120%);
    transition: transform 0.6s ease;
}

.mo-order-card:hover .mo-logo-ring::after,
.mo-logo-btn:hover .mo-logo-ring::after {
    transform: translateX(120%);
}

.mo-order-logo {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
    display: block;
    border: 2.5px solid #fff;
    transition: transform 0.2s ease;
}

.mo-order-logo.placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--paper);
    color: var(--muted);
}

.mo-logo-btn:hover .mo-order-logo,
.mo-logo-btn:active .mo-order-logo {
    transform: scale(1.08);
}

.mo-logo-zoom-hint {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: rgba(22,35,63,0);
    color: #fff;
    opacity: 0;
    transition: all 0.2s ease;
}

.mo-logo-btn:hover .mo-logo-zoom-hint,
.mo-logo-btn:active .mo-logo-zoom-hint {
    background: rgba(22,35,63,0.35);
    opacity: 1;
}

.mo-order-header-text {
    flex: 1;
    min-width: 0;
}

.mo-order-business {
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 600;
    font-size: 16px;
    color: var(--ink);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.mo-order-number {
    font-size: 12px;
    color: var(--muted);
    margin-top: 2px;
}

.mo-chevron {
    color: var(--line);
    flex-shrink: 0;
    display: flex;
}

/* --- status badge with icon medallion --- */

.mo-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px 3px 3px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 8px;
}

.mo-status-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: rgba(255,255,255,0.6);
}

.tone-neutral { background: #F1EFE9; color: #6B6459; }
.tone-neutral .mo-status-icon { background: #E4E0D6; }

.tone-info { background: #EAF1FB; color: #2C5FA8; }
.tone-info .mo-status-icon { background: #D7E5F8; }

.tone-accent { background: #FCF1DC; color: #96721E; }
.tone-accent .mo-status-icon { background: #F5E1AE; }

.tone-success { background: #E9F6EE; color: #1F7A4C; }
.tone-success .mo-status-icon { background: #D3EEDD; }

.tone-warn { background: #FEF3E0; color: #B5590C; }
.tone-warn .mo-status-icon { background: #FBE4BC; }

.tone-danger { background: #FBEAEA; color: #B23A2E; }
.tone-danger .mo-status-icon { background: #F5D3D0; }

.mo-order-items {
    font-size: 12.5px;
    color: var(--ink-soft);
    margin: 0 0 10px;
    line-height: 1.4;
}

.mo-order-footer {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding-top: 8px;
    border-top: 1px dashed var(--line);
}

.mo-order-total {
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 700;
    font-size: 15px;
    color: var(--ink);
}

.mo-order-date {
    font-size: 10.5px;
    color: var(--muted);
}

/* --- logo zoom modal --- */

.mo-zoom-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(16,22,38,0.82);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 18px;
    padding: 24px;
    z-index: 1100;
    animation: mo-fade-in 0.15s ease;
}

@keyframes mo-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
}

.mo-zoom-ring {
    display: block;
    width: min(240px, 62vw);
    height: min(240px, 62vw);
    border-radius: 50%;
    padding: 5px;
    background: linear-gradient(135deg, var(--ring-light), var(--ring-mid) 55%, var(--ring-deep));
    box-shadow: 0 12px 40px rgba(0,0,0,0.45);
    animation: mo-zoom-in 0.2s ease;
}

.mo-zoom-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
    border: 3px solid #fff;
    display: block;
}

@keyframes mo-zoom-in {
    from { transform: scale(0.85); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
}

.mo-zoom-caption {
    color: #fff;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 16px;
    font-weight: 600;
    margin: 0;
}

.mo-zoom-close {
    position: absolute;
    top: 20px;
    right: 20px;
    background: rgba(255,255,255,0.12);
    border: none;
    color: #fff;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
}

.mo-zoom-close:hover { background: rgba(255,255,255,0.22); }
`;

export default MyOrders;