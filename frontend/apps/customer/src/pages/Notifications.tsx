import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useOrdersContext } from '../OrdersContext';

/* ---------- design tokens ---------- */

const PAPER = '#F6F2E9';

/* ---------- inline SVG icons (shared style with MyOrders/OrderTracking) ---------- */

const IconClock = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);

const IconBox = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <polyline points="3.29 7 12 12 20.71 7" />
        <line x1="12" y1="22" x2="12" y2="12" />
    </svg>
);

const IconBike = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="5.5" cy="17.5" r="3.5" />
        <circle cx="18.5" cy="17.5" r="3.5" />
        <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm-3 11.5V14l-3-3 4-3 2 3h2" />
    </svg>
);

const IconPin = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
    </svg>
);

const IconThumbsUp = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 10v12" />
        <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
    </svg>
);

const IconWallet = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
        <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
);

const IconCash = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="12" cy="12" r="2" />
        <path d="M6 12h.01M18 12h.01" />
    </svg>
);

const IconFlag = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
);

const IconX = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

const IconAlertTriangle = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
);

const IconBellOff = () => (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        <path d="M18.63 13A17.89 17.89 0 0 1 18 8" />
        <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" />
        <path d="M18 8a6 6 0 0 0-9.33-5" />
        <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
);

/* Each stage gets its own icon + color "tone" — matching MyOrders */
const STATUS_META: Record<string, { label: string; icon: React.FC; tone: string }> = {
    waiting_acceptance: { label: 'Waiting for business to accept', icon: IconClock, tone: 'neutral' },
    accepted: { label: 'Accepted', icon: IconThumbsUp, tone: 'info' },
    preparing: { label: 'Preparing your order', icon: IconBox, tone: 'info' },
    ready_for_delivery: { label: 'Ready for delivery', icon: IconBox, tone: 'info' },
    out_for_delivery: { label: 'Rider is on the way', icon: IconBike, tone: 'accent' },
    arrived: { label: 'Rider has arrived', icon: IconPin, tone: 'urgent' },
    customer_confirmed_delivery: { label: 'Delivery confirmed', icon: IconThumbsUp, tone: 'success' },
    payment_pending: { label: 'Payment pending', icon: IconWallet, tone: 'warn' },
    paid: { label: 'Paid', icon: IconCash, tone: 'success' },
    completed: { label: 'Completed', icon: IconFlag, tone: 'success' },
    cancelled: { label: 'Cancelled', icon: IconX, tone: 'danger' },
    delivery_failed: { label: 'Delivery failed', icon: IconAlertTriangle, tone: 'danger' },
    dispute_review: { label: 'Under review', icon: IconAlertTriangle, tone: 'warn' },
};

/* ---------- time formatting, WhatsApp-style ---------- */

function formatRowTime(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    if (isToday) {
        return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    if (isYesterday) {
        return 'Yesterday';
    }
    const withinWeek = now.getTime() - d.getTime() < 6 * 24 * 60 * 60 * 1000;
    if (withinWeek) {
        return d.toLocaleDateString([], { weekday: 'short' });
    }
    return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

const Notifications: React.FC = () => {
    const navigate = useNavigate();
    const { orders, loading, refreshing, error, setError, fetchOrders, clearOrders } = useOrdersContext();
    const [inputPhone, setInputPhone] = useState('');
    const [notifications, setNotifications] = useState<any[]>([]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputPhone.trim()) {
            setError('Please enter your phone number');
            return;
        }
        sessionStorage.setItem('hakika_customer_phone', inputPhone);
        fetchOrders(inputPhone);
    };

    useEffect(() => {
        const storedPhone = sessionStorage.getItem('hakika_customer_phone');
        if (storedPhone) {
            fetchOrders(storedPhone);
            api.getNotifications(storedPhone)
                .then(setNotifications)
                .catch(() => setNotifications([]));
        }
    }, [fetchOrders]);

    const hasStoredPhone = !!sessionStorage.getItem('hakika_customer_phone');

    // Newest activity first — same convention as a chat inbox.
    // Falls back to the order's created_at only if it has no notification yet.
    const lastActivityTime = (order: any): number => {
        const n = notifications.find(n => n.order_id === order.id);
        const notifTime = n?.updated_at || n?.last_notified_at || n?.created_at;
        return new Date(notifTime || order.created_at).getTime();
    };

    const sortedOrders = [...orders].sort(
        (a, b) => lastActivityTime(b) - lastActivityTime(a)
    );

    return (
        <div className="nt-page">
            <style>{styles}</style>
            <div className="nt-container">
                <button className="nt-back-btn" onClick={() => navigate('/')}>← Back</button>
                <h1 className="nt-title">Notifications</h1>

                {!hasStoredPhone && (
                    <form onSubmit={handleSubmit} className="nt-phone-card">
                        <label className="nt-label">Enter your phone number to see your orders</label>
                        <div className="nt-phone-row">
                            <input
                                type="tel"
                                value={inputPhone}
                                onChange={e => setInputPhone(e.target.value)}
                                placeholder="0712345678"
                                className="nt-input"
                            />
                            <button type="submit" className="nt-btn nt-btn-primary">
                                View Orders
                            </button>
                        </div>
                        {error && <p className="nt-error">{error}</p>}
                    </form>
                )}

                {loading && (
                    <div className="nt-loading">
                        <div className="nt-spinner" />
                        <p>Loading notifications…</p>
                    </div>
                )}

                {!loading && orders.length === 0 && (
                    <div className="nt-empty">
                        <IconBellOff />
                        <p>No orders found.</p>
                    </div>
                )}

                <div className="nt-list">
                    {sortedOrders.map(order => {
                        const meta = STATUS_META[order.status] || { label: order.status, icon: IconClock, tone: 'neutral' };
                        const StatusIcon = meta.icon;
                        const isUrgent = meta.tone === 'urgent';
                        const unread = notifications.find(n => n.order_id === order.id)?.unread_count || 0;

                        return (
                            <div
                                key={order.id}
                                onClick={() => navigate(`/order/${order.id}`)}
                                className={`nt-row ${isUrgent ? 'nt-row-urgent' : ''}`}
                            >
                                <div className={`nt-avatar tone-${meta.tone}`}>
                                    <StatusIcon />
                                </div>

                                <div className="nt-row-body">
                                    <div className="nt-row-top">
                                        <strong className="nt-business">{order.business_name}</strong>
                                        <span className="nt-time">{formatRowTime(order.created_at)}</span>
                                    </div>
                                    <div className="nt-row-bottom">
                                        <span className="nt-preview">
                                            <span className="nt-order-no">#{order.order_number}</span>
                                            {' · '}
                                            {meta.label}
                                        </span>
                                        {unread > 0 && (
                                            <span className="nt-badge">{unread}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const styles = `
* { box-sizing: border-box; }

.nt-page {
    min-height: 100vh;
    background: ${PAPER};
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    padding: 16px;
}

.nt-container {
    max-width: 640px;
    margin: 0 auto;
}

.nt-back-btn {
    background: none;
    border: none;
    color: #6b6154;
    font-size: 15px;
    cursor: pointer;
    padding: 8px 0;
}

.nt-back-btn:hover {
    color: #2b2621;
}

.nt-title {
    font-size: 26px;
    font-weight: 700;
    margin: 4px 0 20px;
    color: #2b2621;
}

.nt-phone-card {
    background: #fffdf9;
    border: 1px solid #e6dfd0;
    border-radius: 14px;
    padding: 20px;
    margin-bottom: 8px;
}

.nt-label {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: #4a4237;
    margin-bottom: 10px;
}

.nt-phone-row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.nt-input {
    flex: 1;
    min-width: 180px;
    padding: 10px 12px;
    font-size: 15px;
    border: 1px solid #d8cfba;
    border-radius: 8px;
    background: #fffdf9;
    color: #2b2621;
}

.nt-input:focus {
    outline: none;
    border-color: #b08d57;
    box-shadow: 0 0 0 3px rgba(176,141,87,0.15);
}

.nt-btn {
    border: none;
    border-radius: 8px;
    padding: 10px 20px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
}

.nt-btn-primary {
    background: #2b2621;
    color: #fdfbf6;
}

.nt-btn-primary:hover {
    background: #40382f;
}

.nt-error {
    color: #b3261e;
    font-size: 13px;
    margin: 10px 0 0;
}

.nt-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 0;
    color: #8a8072;
    gap: 12px;
}

.nt-spinner {
    width: 28px;
    height: 28px;
    border: 3px solid #e6dfd0;
    border-top-color: #2b2621;
    border-radius: 50%;
    animation: nt-spin 0.8s linear infinite;
}

@keyframes nt-spin {
    to { transform: rotate(360deg); }
}

.nt-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    color: #a89c87;
    text-align: center;
    gap: 12px;
}

.nt-empty p {
    font-size: 14px;
    margin: 0;
}

/* ---------- WhatsApp-style list: no boxed cards, no dividing lines ---------- */

.nt-list {
    display: flex;
    flex-direction: column;
}

.nt-row {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 12px 8px;
    border-radius: 12px;
    cursor: pointer;
    transition: background-color 0.12s ease;
}

.nt-row:hover {
    background: rgba(43, 38, 33, 0.045);
}

.nt-row:active {
    background: rgba(43, 38, 33, 0.08);
}

.nt-row-urgent {
    background: rgba(217, 119, 6, 0.08);
}

.nt-row-urgent:hover {
    background: rgba(217, 119, 6, 0.13);
}

.nt-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.nt-avatar.tone-neutral { background: #ece6d8; color: #7a705f; }
.nt-avatar.tone-info { background: #e2e0f7; color: #4f46e5; }
.nt-avatar.tone-accent { background: #dcefff; color: #0284c7; }
.nt-avatar.tone-urgent { background: #fbe6c2; color: #b45309; }
.nt-avatar.tone-success { background: #dcf2e3; color: #15803d; }
.nt-avatar.tone-warn { background: #fbecc2; color: #92610a; }
.nt-avatar.tone-danger { background: #f7dcdc; color: #b3261e; }

.nt-row-body {
    flex: 1;
    min-width: 0;
    /* thin hairline mimics a chat-list separator without boxing each row */
    border-bottom: 1px solid rgba(43, 38, 33, 0.07);
    padding-bottom: 12px;
}

.nt-row:last-child .nt-row-body {
    border-bottom: none;
}

.nt-row-top {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
}

.nt-business {
    font-size: 15.5px;
    font-weight: 600;
    color: #2b2621;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.nt-time {
    font-size: 12px;
    color: #a89c87;
    flex-shrink: 0;
}

.nt-row-bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-top: 3px;
}

.nt-preview {
    font-size: 13.5px;
    color: #8a8072;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.nt-order-no {
    color: #6b6154;
    font-weight: 500;
}

.nt-badge {
    background: #2e7d5b;
    color: #fff;
    border-radius: 999px;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    font-size: 11.5px;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

/* ---------- responsive: comfortable on phone, roomier on desktop ---------- */

@media (max-width: 480px) {
    .nt-page { padding: 12px; }
    .nt-title { font-size: 22px; }
    .nt-avatar { width: 42px; height: 42px; }
    .nt-business { font-size: 14.5px; }
    .nt-preview { font-size: 13px; }
    .nt-row { padding: 10px 4px; gap: 12px; }
}

@media (min-width: 900px) {
    .nt-container { max-width: 680px; }
    .nt-row { padding: 14px 10px; }
    .nt-row:hover { box-shadow: 0 1px 0 rgba(43,38,33,0.02); }
}
`;

export default Notifications;