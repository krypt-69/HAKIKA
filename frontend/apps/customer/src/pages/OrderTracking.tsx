import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useCustomerWebSocket } from '../hooks/useCustomerWebSocket';
import Toast from '../components/Toast';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api';

const STATUS_LABELS: Record<string, string> = {
    waiting_acceptance: 'Waiting for business to accept',
    accepted: 'Accepted',
    preparing: 'Preparing your order',
    ready_for_delivery: 'Ready for delivery',
    out_for_delivery: 'Rider is on the way',
    arrived: 'Rider has arrived',
    customer_confirmed_delivery: 'Delivery confirmed',
    payment_pending: 'Payment pending',
    paid: 'Paid',
    completed: 'Completed',
    cancelled: 'Cancelled',
    delivery_failed: 'Delivery failed',
    dispute_review: 'Under review',
};

const REJECT_REASONS = [
    'Wrong items',
    'Damaged items',
    'Rider never arrived',
    'Missing products',
    'Other'
];

const ACTIVE_STEPS = [
    'waiting_acceptance', 'accepted', 'preparing', 'ready_for_delivery',
    'out_for_delivery', 'arrived', 'customer_confirmed_delivery',
    'payment_pending', 'paid', 'completed'
];

/* ---------- inline SVG icon set (no extra deps) ---------- */

const IconCheck = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const IconClock = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);

const IconBox = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <polyline points="3.29 7 12 12 20.71 7" />
        <line x1="12" y1="22" x2="12" y2="12" />
    </svg>
);

const IconBike = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="5.5" cy="17.5" r="3.5" />
        <circle cx="18.5" cy="17.5" r="3.5" />
        <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm-3 11.5V14l-3-3 4-3 2 3h2" />
    </svg>
);

const IconPin = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
    </svg>
);

const IconThumbsUp = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 10v12" />
        <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
    </svg>
);

const IconWallet = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
        <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
);

const IconCash = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="12" cy="12" r="2" />
        <path d="M6 12h.01M18 12h.01" />
    </svg>
);

const IconFlag = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
);

const STEP_ICONS: Record<string, React.FC> = {
    waiting_acceptance: IconClock,
    accepted: IconThumbsUp,
    preparing: IconBox,
    ready_for_delivery: IconBox,
    out_for_delivery: IconBike,
    arrived: IconPin,
    customer_confirmed_delivery: IconThumbsUp,
    payment_pending: IconWallet,
    paid: IconCash,
    completed: IconFlag,
};

const IconAlertTriangle = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
);

const IconPhoneCall = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" />
    </svg>
);

/* ---------- component ---------- */

const OrderTracking: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    const handleBack = () => {
        if (location.key !== 'default') {
            navigate(-1);
        } else {
            navigate('/my-orders');
        }
    };

    const [order, setOrder] = useState<any>(null);
    const [business, setBusiness] = useState<any>(null);
    const [error, setError] = useState('');
    const [confirming, setConfirming] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState<any>(null);
    const [retrying, setRetrying] = useState(false);
    const [checkoutId, setCheckoutId] = useState<string | null>(null);
    const [simulating, setSimulating] = useState(false);
    const [paymentPolling, setPaymentPolling] = useState<NodeJS.Timeout | null>(null);
  const paymentPollingStartRef = useRef<number | null>(null);
  const [paymentTimedOut, setPaymentTimedOut] = useState(false);
  const lastStatusRef = useRef<string | null>(null);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [rejecting, setRejecting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pollInterval, setPollInterval] = useState(10000);
  const [showPhonePrompt, setShowPhonePrompt] = useState(false);
  const [phoneInput, setPhoneInput] = useState(
    sessionStorage.getItem('hakika_customer_phone') || ''
  );
  const [phonePromptAction, setPhonePromptAction] = useState<'pay' | 'confirm' | 'reject' | null>(null);

    const fetchOrder = () => {
        if (!id) return;
        api.getOrder(id)
            .then(data => {
                setOrder(data);
                if (data.status === 'payment_pending') {
                    startPaymentPolling();
                } else {
                    stopPaymentPolling();
                }
            })
            .catch(e => setError(e.message));
    };

    const handleSocketEvent = useCallback(() => {
      fetchOrder();
      const phone = sessionStorage.getItem('hakika_customer_phone');
      if (phone) {
        api.getUnreadNotificationCount(phone).then(data => {
          window.dispatchEvent(new CustomEvent('hakika:unread-updated', { detail: { count: data.count || 0 } }));
        }).catch(() => {});
      }
    }, [id]);

    const handleSocketReconnect = useCallback(() => {
      const phone = sessionStorage.getItem('hakika_customer_phone');
      if (phone) {
        api.getUnreadNotificationCount(phone).then(data => {
          window.dispatchEvent(new CustomEvent('hakika:unread-updated', { detail: { count: data.count || 0 } }));
        }).catch(() => {});
      }
    }, []);

    useCustomerWebSocket(id, sessionStorage.getItem('hakika_customer_phone'), handleSocketEvent, handleSocketReconnect);

    const fetchPaymentStatus = async () => {
        if (!id) return;
        try {
            const status = await api.getPaymentStatus(id);
            setPaymentStatus(status);
            if (status.status === 'verified') {
                fetchOrder();
                stopPaymentPolling();
                setCheckoutId(null);
            }
        } catch (e) {
            // ignore
        }
    };

    const startPaymentPolling = () => {
        // Clear any existing interval to prevent leaks
        if (paymentPolling) {
            clearInterval(paymentPolling);
        }
        paymentPollingStartRef.current = Date.now();
        setPaymentTimedOut(false);
        const id = setInterval(() => {
            // Stop after 2 minutes
            if (paymentPollingStartRef.current && Date.now() - paymentPollingStartRef.current > 120_000) {
                stopPaymentPolling();
                setPaymentTimedOut(true);
                return;
            }
            fetchPaymentStatus();
        }, 5000);
        setPaymentPolling(id);
    };

    const stopPaymentPolling = () => {
        if (paymentPolling) {
            clearInterval(paymentPolling);
            setPaymentPolling(null);
        }
    };

    useEffect(() => {
        fetchOrder();
        const interval = setInterval(fetchOrder, pollInterval);
        return () => {
            clearInterval(interval);
            stopPaymentPolling();
        };
    }, [id]);

    useEffect(() => {
        if (order?.business_id) {
            api.businessById(order.business_id).then(setBusiness).catch(() => {});
        }
    }, [order?.business_id]);

    useEffect(() => {
        const phone = sessionStorage.getItem('hakika_customer_phone');
        if (id && phone) {
            api.markNotificationRead(id, phone)
                .catch(() => {});
        }
    }, [id]);

    const handleConfirm = async () => {
        const storedPhone = sessionStorage.getItem(`hakika_order_phone_${id}`);
        if (!storedPhone) {
            setPhonePromptAction('pay');
            setShowPhonePrompt(true);
            return;
        }
        setConfirming(true);
        setError('');
        try {
            const result = await api.confirmDelivery(id!, storedPhone);
            const paymentResult = result.payment || {};
            setPaymentStatus(paymentResult);
            if (paymentResult.checkout_id) {
                setCheckoutId(paymentResult.checkout_id);
                if (paymentResult.checkout_id.startsWith('mock-')) {
                    setTimeout(() => {
                        if (paymentResult.checkout_id) {
                            simulatePayment(paymentResult.checkout_id);
                        }
                    }, 10000);
                }
            }
            fetchOrder();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setConfirming(false);
        }
    };

    const handleRetryPayment = async () => {
        setRetrying(true);
        setError('');
        try {
            const result = await api.initiatePayment(id!);
            setPaymentStatus(result);
            if (result.checkout_id) {
                setCheckoutId(result.checkout_id);
            }
            setRetrying(false);
            fetchOrder();
        } catch (e: any) {
            setError(e.message);
            setRetrying(false);
        }
    };

    const handlePayNow = async () => {
        const storedPhone = sessionStorage.getItem(`hakika_order_phone_${id}`);
        if (!storedPhone) {
            setPhonePromptAction('pay');
            setShowPhonePrompt(true);
            return;
        }
        setError('');
        setRetrying(true);
        try {
            const result = await api.payOrder(id!, storedPhone);
            setPaymentStatus(result);
            if (result.checkout_id) {
                setCheckoutId(result.checkout_id);
                startPaymentPolling();
            }
            fetchOrder();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setRetrying(false);
        }
    };

    const simulatePayment = async (cid: string) => {
        if (simulating) return;
        setSimulating(true);
        try {
            await api.mockCallback(cid);
            fetchOrder();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSimulating(false);
        }
    };

    const handleReject = async () => {
        if (!rejectReason) {
            setError('Please select a reason');
            return;
        }
        const storedPhone = sessionStorage.getItem(`hakika_order_phone_${id}`);
        if (!storedPhone) {
            setPhonePromptAction('reject');
            setShowPhonePrompt(true);
            return;
        }
        setRejecting(true);
        setError('');
        try {
            await api.reportProblem(id!, storedPhone, rejectReason);
            fetchOrder();
            setShowRejectModal(false);
            setRejectReason('');
        } catch (e: any) {
            setError(e.message);
        } finally {
            setRejecting(false);
        }
    };

    const handlePhonePromptContinue = () => {
        const trimmed = phoneInput.trim();
        if (!trimmed) {
            setError('Please enter your phone number.');
            return;
        }
        sessionStorage.setItem(`hakika_order_phone_${id}`, trimmed);
        sessionStorage.setItem('hakika_customer_phone', trimmed);
        setShowPhonePrompt(false);
        setError('');
        if (phonePromptAction === 'pay') {
            handlePayNow();
        } else if (phonePromptAction === 'confirm') {
            handleConfirm();
        } else if (phonePromptAction === 'reject') {
            handleReject();
        }
    };

    const isPaymentPending = order?.status === 'payment_pending';
    const isPaid = order?.status === 'paid';
    const isArrived = order?.status === 'arrived';
    const orderCreated = order?.created_at ? new Date(order.created_at) : null;

    if (!order) {
        return (
            <div className="ot-page">
                <style>{styles}</style>
                <div className="ot-loading">
                    <div className="ot-spinner" />
                    <p>Loading your order…</p>
                </div>
            </div>
        );
    }

    const currentStepIdx = ACTIVE_STEPS.indexOf(order.status);
    const progressPct = order.status === 'cancelled'
        ? 0
        : Math.max(0, Math.min(100, (currentStepIdx / (ACTIVE_STEPS.length - 1)) * 100));

    return (
        <div className="ot-page">
            <style>{styles}</style>
            <div className="ot-container">
                <button className="ot-back-btn" onClick={handleBack}>← Back</button>

                <div className="ot-header">
                    <h1 className="ot-title">Order {order.order_number}</h1>
                    <p className="ot-subtitle">Placed {orderCreated?.toLocaleString()}</p>
                </div>

                <div className="ot-grid">
                    <div className="ot-left-col">
                        {(order.business_name || order.business_logo_url || order.business_cover_url) && (
                            <div className="ot-business-card">
                                <div className="ot-business-header">
                                    {order.business_logo_url ? (
                                        <img
                                            src={order.business_logo_url}
                                            alt="Business logo"
                                            className="ot-business-logo"
                                            onError={e => { e.currentTarget.style.display = 'none'; }}
                                        />
                                    ) : null}
                                    <div>
                                        <div className="ot-business-name">{order.business_name || 'Business'}</div>
                                        <div className="ot-business-order-no">{order.order_number}</div>
                                    </div>
                                </div>
                                {order.business_cover_url && (
                                    <img
                                        src={order.business_cover_url}
                                        alt="Business cover"
                                        className="ot-business-cover"
                                        onError={e => { e.currentTarget.style.display = 'none'; }}
                                    />
                                )}
                            </div>
                        )}

                        {/* Progress tracker */}
                        <div className="ot-progress-card">
                            <h2 className="ot-section-title">Order Progress</h2>

                            {order.status === 'cancelled' ? (
                                <div className="ot-cancelled-banner">
                                    <IconAlertTriangle />
                                    <span>This order was cancelled</span>
                                </div>
                            ) : (
                                <>
                                    <div className="ot-progress-track">
                                        <div className="ot-progress-track-bg" />
                                        <div className="ot-progress-track-fill" style={{ width: `${progressPct}%` }} />
                                    </div>

                                    <div className="ot-steps">
                                        {ACTIVE_STEPS.map((step, idx) => {
                                            const passed = currentStepIdx >= idx;
                                            const isCurrent = step === order.status;
                                            const StepIcon = STEP_ICONS[step] || IconClock;
                                            const stepTime = orderCreated ? new Date(orderCreated.getTime() + idx * 60000) : null;
                                            return (
                                                <div key={step} className={`ot-step ${passed ? 'passed' : ''} ${isCurrent ? 'current' : ''}`}>
                                                    <div className="ot-step-dot">
                                                        {passed && !isCurrent ? <IconCheck /> : <StepIcon />}
                                                    </div>
                                                    <div className="ot-step-info">
                                                        <span className="ot-step-label">{STATUS_LABELS[step] || step}</span>
                                                        {isCurrent && stepTime && (
                                                            <span className="ot-step-time">{stepTime.toLocaleTimeString()}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="ot-right-col">
                        <div className="ot-items-card">
                            <h2 className="ot-section-title">Items</h2>
                            {order.items?.map((item: any) => (
                                <div key={item.id} className="ot-item-row">
                                    {item.thumbnail_url ? (
                                        <img src={item.thumbnail_url} alt={item.product_name} className="ot-item-thumb" />
                                    ) : (
                                        <div className="ot-item-thumb placeholder" />
                                    )}
                                    <span className="ot-item-name">{item.product_name} × {item.quantity}</span>
                                    <span className="ot-item-price">KES {item.unit_price * item.quantity}</span>
                                </div>
                            ))}
                            <div className="ot-item-total">
                                <span>Total</span>
                                <span>KES {order.total_amount}</span>
                            </div>
                        </div>

                        {order.status === 'accepted' && business?.collect_payment_before_delivery && (
                            <div className="ot-callout ot-callout-info">
                                <p className="ot-callout-title">Payment required</p>
                                <p className="ot-callout-text">
                                    Pay now to allow dispatch. Your order has been accepted. The business will begin preparing and dispatching your order after payment is confirmed.
                                </p>
                                <button onClick={handlePayNow} disabled={retrying} className="ot-btn ot-btn-primary">
                                    <IconWallet /> {retrying ? 'Initiating Payment...' : 'Pay Now'}
                                </button>
                                <button onClick={() => setShowRejectModal(true)} className="ot-btn ot-btn-danger ot-btn-block">
                                    Cancel Order
                                </button>
                            </div>
                        )}

                        {error && <p className="ot-error">{error}</p>}

                        {isArrived && !isPaid && !isPaymentPending && (
                            <div className="ot-action-row">
                                <button onClick={handleConfirm} disabled={confirming} className="ot-btn ot-btn-accent ot-btn-flex">
                                    <IconThumbsUp /> {confirming ? 'Confirming...' : 'Confirm Delivery & Pay'}
                                </button>
                                <button onClick={() => setShowRejectModal(true)} disabled={rejecting} className="ot-btn ot-btn-danger">
                                    Reject
                                </button>
                            </div>
                        )}

                        {isPaymentPending && (
                            <div className="ot-callout ot-callout-warn">
                                {paymentTimedOut ? (
                                    <>
                                        <p className="ot-callout-title"><IconClock /> Payment is taking longer than expected.</p>
                                        <p className="ot-callout-text">You can check back later or contact the business.</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="ot-callout-title"><IconPhoneCall /> M-Pesa prompt sent to your phone.</p>
                                        <p className="ot-callout-text">Check your phone and enter PIN to complete payment.</p>
                                    </>
                                )}
                                {paymentStatus?.status === 'initiation_failed' && (
                                    <p className="ot-error">Payment initiation failed. Please try again.</p>
                                )}
                                <div className="ot-callout-actions">
                                    <button onClick={handleRetryPayment} disabled={retrying} className="ot-btn ot-btn-accent">
                                        {retrying ? 'Retrying...' : 'Resend STK Push'}
                                    </button>
                                    {checkoutId && checkoutId.startsWith('mock-') && (
                                        <button onClick={() => simulatePayment(checkoutId)} disabled={simulating} className="ot-btn ot-btn-purple">
                                            🔧 {simulating ? 'Simulating...' : 'Simulate Payment (Mock)'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {isPaid && (
                            <div className="ot-callout ot-callout-success">
                                <p className="ot-callout-title"><IconCheck /> Payment received!</p>
                                <button onClick={() => navigate(`/receipt/${id}`)} className="ot-btn ot-btn-primary">
                                    View Receipt
                                </button>
                            </div>
                        )}

                        {order.status === 'payment_pending' && paymentStatus?.status === 'verified' && (
                            <p className="ot-inline-success"><IconCheck /> Payment confirmed!</p>
                        )}

                        {order.status === 'dispute_review' && (
                            <div className="ot-callout ot-callout-warn">
                                <p className="ot-callout-title"><IconAlertTriangle /> Order is under review. We'll contact you shortly.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="ot-modal-overlay">
                    <div className="ot-modal">
                        <h3>Why are you rejecting this delivery?</h3>
                        <select
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            className="ot-select"
                        >
                            <option value="">Select a reason...</option>
                            {REJECT_REASONS.map(r => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                        <div className="ot-modal-actions">
                            <button onClick={handleReject} disabled={rejecting} className="ot-btn ot-btn-danger ot-btn-flex">
                                {rejecting ? 'Submitting...' : 'Confirm Rejection'}
                            </button>
                            <button
                                onClick={() => { setShowRejectModal(false); setRejectReason(''); setError(''); }}
                                className="ot-btn ot-btn-muted"
                            >
                                Cancel
                            </button>
                        </div>
                        {error && <p className="ot-error">{error}</p>}
                    </div>
                </div>
            )}

            {showPhonePrompt && (
                <div className="ot-modal-overlay">
                    <div className="ot-modal">
                        <h3>Enter your phone number</h3>
                        <p className="ot-modal-hint">We need the phone number used for this order to continue.</p>
                        <input
                            type="tel"
                            value={phoneInput}
                            onChange={e => setPhoneInput(e.target.value)}
                            placeholder="0712345678"
                            className="ot-input"
                        />
                        <div className="ot-modal-actions">
                            <button onClick={handlePhonePromptContinue} className="ot-btn ot-btn-primary ot-btn-flex">
                                Continue
                            </button>
                            <button
                                onClick={() => { setShowPhonePrompt(false); setError(''); }}
                                className="ot-btn ot-btn-muted"
                            >
                                Cancel
                            </button>
                        </div>
                        {error && <p className="ot-error">{error}</p>}
                    </div>
                </div>
            )}

            <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
        </div>
    );
};

const styles = `
* { box-sizing: border-box; }

.ot-page {
    min-height: 100vh;
    background: #f7f8fa;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    padding: 16px;
}

.ot-container {
    max-width: 980px;
    margin: 0 auto;
}

.ot-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    color: #6b7280;
    gap: 12px;
}

.ot-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #e5e7eb;
    border-top-color: #2563eb;
    border-radius: 50%;
    animation: ot-spin 0.8s linear infinite;
}

@keyframes ot-spin {
    to { transform: rotate(360deg); }
}

.ot-back-btn {
    background: none;
    border: none;
    color: #2563eb;
    font-size: 15px;
    cursor: pointer;
    padding: 8px 0;
}

.ot-header {
    margin: 4px 0 20px;
}

.ot-title {
    font-size: 24px;
    margin: 0;
    color: #111827;
}

.ot-subtitle {
    color: #6b7280;
    font-size: 14px;
    margin: 4px 0 0;
}

.ot-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
}

@media (min-width: 800px) {
    .ot-grid {
        grid-template-columns: 1.05fr 1fr;
        align-items: start;
    }
}

.ot-left-col, .ot-right-col {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.ot-section-title {
    font-size: 16px;
    color: #374151;
    margin: 0 0 16px;
}

.ot-business-card, .ot-progress-card, .ot-items-card {
    background: #fff;
    border-radius: 12px;
    padding: 18px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.ot-business-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px;
    background: #f9fafb;
    border-radius: 8px;
}

.ot-business-logo {
    width: 48px;
    height: 48px;
    object-fit: cover;
    border-radius: 6px;
    flex-shrink: 0;
}

.ot-business-name {
    font-weight: 600;
    font-size: 16px;
    color: #111827;
}

.ot-business-order-no {
    font-size: 13px;
    color: #6b7280;
}

.ot-business-cover {
    width: 100%;
    height: 110px;
    object-fit: cover;
    border-radius: 8px;
    margin-top: 10px;
}

/* Progress bar */
.ot-progress-track {
    position: relative;
    height: 6px;
    border-radius: 3px;
    margin-bottom: 22px;
    overflow: hidden;
}

.ot-progress-track-bg {
    position: absolute;
    inset: 0;
    background: #e5e7eb;
}

.ot-progress-track-fill {
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, #16a34a, #22c55e);
    border-radius: 3px;
    transition: width 0.5s ease;
}

.ot-cancelled-banner {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px;
    background: #fef2f2;
    color: #dc2626;
    border-radius: 8px;
    font-weight: 600;
    font-size: 14px;
}

.ot-steps {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.ot-step {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 6px 0;
    position: relative;
}

.ot-step::before {
    content: '';
    position: absolute;
    left: 13px;
    top: 28px;
    bottom: -6px;
    width: 2px;
    background: #e5e7eb;
}

.ot-step:last-child::before {
    display: none;
}

.ot-step.passed::before {
    background: #16a34a;
}

.ot-step-dot {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #e5e7eb;
    color: #9ca3af;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    z-index: 1;
    transition: all 0.3s ease;
}

.ot-step.passed .ot-step-dot {
    background: #16a34a;
    color: #fff;
}

.ot-step.current .ot-step-dot {
    background: #2563eb;
    color: #fff;
    box-shadow: 0 0 0 4px rgba(37,99,235,0.15);
}

.ot-step-info {
    display: flex;
    flex-direction: column;
    padding-top: 4px;
    padding-bottom: 8px;
}

.ot-step-label {
    font-size: 14px;
    color: #9ca3af;
}

.ot-step.passed .ot-step-label {
    color: #374151;
}

.ot-step.current .ot-step-label {
    color: #111827;
    font-weight: 700;
}

.ot-step-time {
    font-size: 12px;
    color: #9ca3af;
    margin-top: 2px;
}

/* Items */
.ot-item-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 0;
    border-bottom: 1px solid #f1f5f9;
}

.ot-item-row:last-of-type {
    border-bottom: none;
}

.ot-item-thumb {
    width: 44px;
    height: 44px;
    object-fit: cover;
    border-radius: 6px;
    flex-shrink: 0;
}

.ot-item-thumb.placeholder {
    background: #f3f4f6;
}

.ot-item-name {
    flex: 1;
    font-size: 14px;
    color: #111827;
}

.ot-item-price {
    font-weight: 600;
    font-size: 14px;
    color: #111827;
    white-space: nowrap;
}

.ot-item-total {
    display: flex;
    justify-content: space-between;
    font-weight: 700;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 2px solid #e5e7eb;
    color: #111827;
    font-size: 16px;
}

/* Callouts */
.ot-callout {
    padding: 16px;
    border-radius: 10px;
}

.ot-callout-info {
    background: #eef2ff;
    border: 1px solid #c7d2fe;
}

.ot-callout-warn {
    background: #fef9e7;
    border: 1px solid #fde68a;
}

.ot-callout-success {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
}

.ot-callout-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
    margin: 0;
    color: #111827;
    font-size: 14px;
}

.ot-callout-text {
    font-size: 13px;
    color: #4b5563;
    margin: 8px 0 0;
    line-height: 1.5;
}

.ot-callout-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 12px;
}

/* Buttons */
.ot-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: none;
    border-radius: 8px;
    padding: 12px 18px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
}

.ot-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.ot-btn-primary { background: #2563eb; color: #fff; }
.ot-btn-accent { background: #16a34a; color: #fff; }
.ot-btn-danger { background: #dc2626; color: #fff; }
.ot-btn-purple { background: #8b5cf6; color: #fff; }
.ot-btn-muted { background: #e5e7eb; color: #111827; }

.ot-btn-block {
    display: flex;
    width: 100%;
    margin-top: 10px;
}

.ot-btn-flex {
    flex: 1;
}

.ot-action-row {
    display: flex;
    gap: 10px;
}

.ot-inline-success {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #16a34a;
    font-weight: 600;
    font-size: 14px;
}

.ot-error {
    color: #dc2626;
    font-size: 14px;
    margin: 8px 0 0;
}

/* Modals */
.ot-modal-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    z-index: 1000;
}

.ot-modal {
    background: #fff;
    padding: 24px;
    border-radius: 12px;
    max-width: 400px;
    width: 100%;
}

.ot-modal h3 {
    margin: 0 0 8px;
    font-size: 17px;
    color: #111827;
}

.ot-modal-hint {
    font-size: 13px;
    color: #6b7280;
    margin: 0 0 12px;
}

.ot-select, .ot-input {
    width: 100%;
    padding: 10px 12px;
    font-size: 15px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    margin-top: 4px;
    background: #fff;
    color: #111827;
}

.ot-modal-actions {
    display: flex;
    gap: 10px;
    margin-top: 20px;
}
`;

export default OrderTracking;