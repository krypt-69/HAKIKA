import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useOrdersContext } from '../OrdersContext';

/* ---------- inline SVG icons (shared style with MyOrders/OrderTracking) ---------- */

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

const IconBellOff = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        <path d="M18.63 13A17.89 17.89 0 0 1 18 8" />
        <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" />
        <path d="M18 8a6 6 0 0 0-9.33-5" />
        <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
);

const IconChevronRight = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
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
                    {orders.map(order => {
                        const meta = STATUS_META[order.status] || { label: order.status, icon: IconClock, tone: 'neutral' };
                        const StatusIcon = meta.icon;
                        const isUrgent = meta.tone === 'urgent';
                        return (
                            <div
                                key={order.id}
                                onClick={() => navigate(`/order/${order.id}`)}
                                className={`nt-card tone-${meta.tone} ${isUrgent ? 'nt-card-pulse' : ''}`}
                            >
                                <div className={`nt-status-icon tone-${meta.tone}`}>
                                    <StatusIcon />
                                </div>
                                <div className="nt-card-body">
                                    <div className="nt-card-top">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <strong className="nt-order-no">Order {order.order_number}</strong>
                                            {notifications.find(n => n.order_id === order.id)?.unread_count > 0 && (
                                                <span style={{
                                                    background: '#16a34a',
                                                    color: '#fff',
                                                    borderRadius: '50%',
                                                    minWidth: 18,
                                                    height: 18,
                                                    padding: '0 5px',
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}>
                                                    {notifications.find(n => n.order_id === order.id)?.unread_count}
                                                </span>
                                            )}
                                        </div>
                                        <span className={`nt-status-pill tone-${meta.tone}`}>{meta.label}</span>
                                    </div>
                                    <p className="nt-business">{order.business_name}</p>
                                    <p className="nt-date">{new Date(order.created_at).toLocaleString()}</p>
                                </div>
                                <IconChevronRight />
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
    background: #f7f8fa;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    padding: 16px;
}

.nt-container {
    max-width: 720px;
    margin: 0 auto;
}

.nt-back-btn {
    background: none;
    border: none;
    color: #2563eb;
    font-size: 15px;
    cursor: pointer;
    padding: 8px 0;
}

.nt-title {
    font-size: 26px;
    margin: 4px 0 20px;
    color: #111827;
}

.nt-phone-card {
    background: #fff;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    margin-bottom: 20px;
}

.nt-label {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: #374151;
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
    border: 1px solid #d1d5db;
    border-radius: 8px;
    background: #fff;
    color: #111827;
}

.nt-input:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
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
    background: #2563eb;
    color: #fff;
}

.nt-error {
    color: #dc2626;
    font-size: 13px;
    margin: 10px 0 0;
}

.nt-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 0;
    color: #6b7280;
    gap: 12px;
}

.nt-spinner {
    width: 28px;
    height: 28px;
    border: 3px solid #e5e7eb;
    border-top-color: #2563eb;
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
    color: #9ca3af;
    text-align: center;
    gap: 12px;
}

.nt-empty p {
    font-size: 14px;
    margin: 0;
}

.nt-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.nt-card {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    background: #fff;
    border-radius: 12px;
    padding: 14px 16px;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    border-left: 4px solid transparent;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.nt-card:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.nt-card > svg {
    color: #d1d5db;
    flex-shrink: 0;
    margin-top: 6px;
}

/* Left accent border colored per stage */
.nt-card.tone-neutral { border-left-color: #9ca3af; }
.nt-card.tone-info { border-left-color: #4f46e5; }
.nt-card.tone-accent { border-left-color: #0284c7; }
.nt-card.tone-urgent { border-left-color: #f59e0b; background: #fffbeb; }
.nt-card.tone-success { border-left-color: #16a34a; }
.nt-card.tone-warn { border-left-color: #d97706; }
.nt-card.tone-danger { border-left-color: #dc2626; }

.nt-card-pulse {
    animation: nt-pulse 2s ease-in-out infinite;
}

@keyframes nt-pulse {
    0%, 100% { box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
    50% { box-shadow: 0 0 0 4px rgba(245,158,11,0.15); }
}

.nt-status-icon {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.nt-status-icon.tone-neutral { background: #f3f4f6; color: #6b7280; }
.nt-status-icon.tone-info { background: #eef2ff; color: #4f46e5; }
.nt-status-icon.tone-accent { background: #e0f2fe; color: #0284c7; }
.nt-status-icon.tone-urgent { background: #fef3c7; color: #d97706; }
.nt-status-icon.tone-success { background: #f0fdf4; color: #16a34a; }
.nt-status-icon.tone-warn { background: #fef9e7; color: #b45309; }
.nt-status-icon.tone-danger { background: #fef2f2; color: #dc2626; }

.nt-card-body {
    flex: 1;
    min-width: 0;
}

.nt-card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 4px;
}

.nt-order-no {
    font-size: 14px;
    color: #111827;
}

.nt-status-pill {
    font-size: 11px;
    font-weight: 700;
    padding: 3px 9px;
    border-radius: 999px;
    white-space: nowrap;
}

.nt-status-pill.tone-neutral { background: #f3f4f6; color: #6b7280; }
.nt-status-pill.tone-info { background: #eef2ff; color: #4f46e5; }
.nt-status-pill.tone-accent { background: #e0f2fe; color: #0284c7; }
.nt-status-pill.tone-urgent { background: #fef3c7; color: #b45309; }
.nt-status-pill.tone-success { background: #f0fdf4; color: #16a34a; }
.nt-status-pill.tone-warn { background: #fef9e7; color: #b45309; }
.nt-status-pill.tone-danger { background: #fef2f2; color: #dc2626; }

.nt-business {
    font-size: 13px;
    color: #4b5563;
    margin: 2px 0;
}

.nt-date {
    font-size: 11.5px;
    color: #9ca3af;
    margin: 2px 0 0;
}
`;

export default Notifications;