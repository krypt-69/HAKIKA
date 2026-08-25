import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useOrdersContext } from '../OrdersContext';

/* ---------- inline SVG icons ---------- */

const IconClock = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);

const IconBox = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <polyline points="3.29 7 12 12 20.71 7" />
        <line x1="12" y1="22" x2="12" y2="12" />
    </svg>
);

const IconBike = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="5.5" cy="17.5" r="3.5" />
        <circle cx="18.5" cy="17.5" r="3.5" />
        <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm-3 11.5V14l-3-3 4-3 2 3h2" />
    </svg>
);

const IconPin = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
    </svg>
);

const IconThumbsUp = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 10v12" />
        <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
    </svg>
);

const IconWallet = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
        <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
);

const IconCash = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="12" cy="12" r="2" />
        <path d="M6 12h.01M18 12h.01" />
    </svg>
);

const IconFlag = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
);

const IconX = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

const IconAlertTriangle = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
);

const IconPackageSearch = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l1-.55" />
        <polyline points="3.29 7 12 12 20.71 7" />
        <line x1="12" y1="22" x2="12" y2="12" />
        <circle cx="18.5" cy="17.5" r="3.5" />
        <line x1="21" y1="20" x2="22.5" y2="21.5" />
    </svg>
);

const IconChevronRight = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
    </svg>
);

const IconSearch = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);

const IconZoomIn = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
        <line x1="11" y1="8" x2="11" y2="14" />
        <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
);

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
    const { orders, loading, refreshing, error, setError, phone, fetchOrders, activeStage, setActiveStage, searchQuery, setSearchQuery } = useOrdersContext();
    const [inputPhone, setInputPhone] = useState('');
    const [zoomedLogo, setZoomedLogo] = useState<{ url: string; name: string } | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const stored = sessionStorage.getItem('hakika_customer_phone');
        if (stored) {
            setInputPhone(stored);
            fetchOrders(stored);
        }
    }, [fetchOrders]);


    const handleSwitchNumber = () => {
        sessionStorage.removeItem('hakika_customer_phone');
        setInputPhone('');
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
                <button className="mo-back-btn" onClick={() => navigate('/')}>← Back</button>
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
                            {loading ? 'Loading...' : 'View Orders'}
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
                                            <img src={order.business_logo_url} alt="Business logo" className="mo-order-logo" />
                                            <span className="mo-logo-zoom-hint"><IconZoomIn /></span>
                                        </button>
                                    ) : (
                                        <div className="mo-order-logo placeholder" />
                                    )}
                                    <div className="mo-order-header-text">
                                        <div className="mo-order-business">{order.business_name || 'Business'}</div>
                                        <div className="mo-order-number">{order.order_number}</div>
                                    </div>
                                    <IconChevronRight />
                                </div>

                                <div className={`mo-status-badge tone-${meta.tone}`}>
                                    <StatusIcon />
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
                    <img
                        src={zoomedLogo.url}
                        alt={zoomedLogo.name}
                        className="mo-zoom-image"
                        onClick={e => e.stopPropagation()}
                    />
                    <p className="mo-zoom-caption">{zoomedLogo.name}</p>
                </div>
            )}
        </div>
    );
};

const styles = `
* { box-sizing: border-box; }

.mo-page {
    min-height: 100vh;
    background: #f7f8fa;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    padding: 16px;
}

.mo-container {
    max-width: 900px;
    margin: 0 auto;
}

.mo-back-btn {
    background: none;
    border: none;
    color: #2563eb;
    font-size: 15px;
    cursor: pointer;
    padding: 8px 0;
}

.mo-title {
    font-size: 26px;
    margin: 4px 0 20px;
    color: #111827;
}

.mo-phone-card {
    background: #fff;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    max-width: 420px;
    margin-bottom: 20px;
}

.mo-label {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: #374151;
    margin-bottom: 6px;
}

.mo-input {
    width: 100%;
    padding: 10px 12px;
    font-size: 15px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    background: #fff;
    color: #111827;
    margin-bottom: 14px;
}

.mo-input:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
}

.mo-btn {
    border: none;
    border-radius: 8px;
    padding: 11px 20px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
}

.mo-btn-primary {
    background: #2563eb;
    color: #fff;
    width: 100%;
}

.mo-btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.mo-phone-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
    background: #fff;
    padding: 12px 16px;
    border-radius: 10px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    margin-bottom: 20px;
}

.mo-phone-label {
    font-size: 14px;
    color: #374151;
}

.mo-link-btn {
    background: none;
    border: none;
    color: #dc2626;
    cursor: pointer;
    text-decoration: underline;
    font-size: 13px;
    padding: 0;
}

.mo-error {
    color: #dc2626;
    font-size: 14px;
    margin-bottom: 12px;
}

.mo-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 0;
    color: #6b7280;
    gap: 12px;
}

.mo-spinner {
    width: 28px;
    height: 28px;
    border: 3px solid #e5e7eb;
    border-top-color: #2563eb;
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
    padding: 60px 20px;
    color: #9ca3af;
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
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 10px 14px;
    margin-bottom: 14px;
    color: #9ca3af;
}

.mo-search-bar:focus-within {
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
}

.mo-search-input {
    flex: 1;
    border: none;
    outline: none;
    font-size: 14px;
    color: #111827;
    background: transparent;
}

.mo-search-clear {
    background: none;
    border: none;
    color: #9ca3af;
    cursor: pointer;
    display: flex;
    padding: 2px;
}

.mo-search-clear:hover {
    color: #6b7280;
}

.mo-tabs {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 6px;
    margin-bottom: 18px;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
}

.mo-tabs::-webkit-scrollbar {
    display: none;
}

.mo-tab {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
    border: 1px solid #e5e7eb;
    background: #fff;
    color: #4b5563;
    padding: 8px 14px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s ease;
}

.mo-tab:hover {
    border-color: #c7d2fe;
}

.mo-tab.active {
    background: #2563eb;
    border-color: #2563eb;
    color: #fff;
}

.mo-tab-count {
    background: rgba(0,0,0,0.08);
    color: inherit;
    border-radius: 999px;
    padding: 1px 7px;
    font-size: 11px;
}

.mo-tab.active .mo-tab-count {
    background: rgba(255,255,255,0.25);
}

.mo-orders-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 14px;
}

@media (min-width: 640px) {
    .mo-orders-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (min-width: 1000px) {
    .mo-orders-grid {
        grid-template-columns: repeat(3, 1fr);
    }
}

.mo-order-card {
    background: #fff;
    border-radius: 12px;
    padding: 16px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
    border: 1px solid transparent;
}

.mo-order-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    border-color: #e5e7eb;
}

.mo-order-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
}

.mo-logo-btn {
    position: relative;
    width: 40px;
    height: 40px;
    padding: 0;
    border: none;
    background: none;
    cursor: zoom-in;
    flex-shrink: 0;
    border-radius: 8px;
    overflow: hidden;
}

.mo-order-logo {
    width: 40px;
    height: 40px;
    object-fit: cover;
    border-radius: 8px;
    flex-shrink: 0;
    display: block;
    transition: transform 0.2s ease;
}

.mo-logo-btn:hover .mo-order-logo,
.mo-logo-btn:active .mo-order-logo {
    transform: scale(1.15);
}

.mo-logo-zoom-hint {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0);
    color: #fff;
    opacity: 0;
    transition: all 0.2s ease;
}

.mo-logo-btn:hover .mo-logo-zoom-hint,
.mo-logo-btn:active .mo-logo-zoom-hint {
    background: rgba(0,0,0,0.35);
    opacity: 1;
}

.mo-order-logo.placeholder {
    background: #f3f4f6;
}

.mo-order-header-text {
    flex: 1;
    min-width: 0;
}

.mo-order-business {
    font-weight: 600;
    font-size: 15px;
    color: #111827;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.mo-order-number {
    font-size: 12px;
    color: #9ca3af;
}

.mo-order-header svg {
    color: #d1d5db;
    flex-shrink: 0;
}

.mo-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 10px;
}

.tone-neutral { background: #f3f4f6; color: #6b7280; }
.tone-info { background: #eef2ff; color: #4f46e5; }
.tone-accent { background: #e0f2fe; color: #0284c7; }
.tone-success { background: #f0fdf4; color: #16a34a; }
.tone-warn { background: #fef9e7; color: #b45309; }
.tone-danger { background: #fef2f2; color: #dc2626; }

.mo-order-items {
    font-size: 13px;
    color: #4b5563;
    margin: 0 0 12px;
    line-height: 1.4;
}

.mo-order-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 10px;
    border-top: 1px solid #f1f5f9;
}

.mo-order-total {
    font-weight: 700;
    font-size: 14px;
    color: #111827;
}

.mo-order-date {
    font-size: 11px;
    color: #9ca3af;
}

/* Logo zoom modal */
.mo-zoom-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.75);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 24px;
    z-index: 1100;
    animation: mo-fade-in 0.15s ease;
}

@keyframes mo-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
}

.mo-zoom-image {
    width: min(280px, 70vw);
    height: min(280px, 70vw);
    object-fit: cover;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    animation: mo-zoom-in 0.2s ease;
}

@keyframes mo-zoom-in {
    from { transform: scale(0.85); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
}

.mo-zoom-caption {
    color: #fff;
    font-size: 15px;
    font-weight: 600;
    margin: 0;
}

.mo-zoom-close {
    position: absolute;
    top: 20px;
    right: 20px;
    background: rgba(255,255,255,0.15);
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

.mo-zoom-close:hover {
    background: rgba(255,255,255,0.25);
}
`;

export default MyOrders;