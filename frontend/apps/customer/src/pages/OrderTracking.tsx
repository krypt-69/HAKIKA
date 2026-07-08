import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

const ACTIVE_STEPS = [
    'waiting_acceptance', 'accepted', 'preparing', 'ready_for_delivery',
    'out_for_delivery', 'arrived', 'customer_confirmed_delivery',
    'payment_pending', 'paid', 'completed'
];

const OrderTracking: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [order, setOrder] = useState<any>(null);
    const [error, setError] = useState('');
    const [confirming, setConfirming] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState<any>(null);
    const [retrying, setRetrying] = useState(false);
    const [checkoutId, setCheckoutId] = useState<string | null>(null);
    const [simulating, setSimulating] = useState(false);
    const [paymentPolling, setPaymentPolling] = useState<NodeJS.Timeout | null>(null);

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
        if (paymentPolling) return;
        setPaymentPolling(setInterval(fetchPaymentStatus, 5000));
    };

    const stopPaymentPolling = () => {
        if (paymentPolling) {
            clearInterval(paymentPolling);
            setPaymentPolling(null);
        }
    };

    useEffect(() => {
        fetchOrder();
        const interval = setInterval(fetchOrder, 10000);
        return () => {
            clearInterval(interval);
            stopPaymentPolling();
        };
    }, [id]);

    const handleConfirm = async () => {
        // Retrieve stored phone from session
        const storedPhone = sessionStorage.getItem(`hakika_order_phone_${id}`);
        if (!storedPhone) {
            setError('Phone number not found. Please contact support.');
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

    const isPaymentPending = order?.status === 'payment_pending';
    const isPaid = order?.status === 'paid';
    const isArrived = order?.status === 'arrived';

    if (!order) return <div style={{ padding: 20 }}>Loading...</div>;

    return (
        <div style={{ padding: 20 }}>
            <button onClick={() => navigate('/')}>← Back</button>
            <h1>Order {order.order_number}</h1>
            <p style={{ color: '#666' }}>Placed: {new Date(order.created_at).toLocaleString()}</p>

            <div style={{ margin: '30px 0' }}>
                {ACTIVE_STEPS.map((step, idx) => {
                    const passed = ACTIVE_STEPS.indexOf(order.status) >= idx && order.status !== 'cancelled';
                    return (
                        <div key={step} style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                            <div style={{
                                width: 24, height: 24, borderRadius: '50%',
                                background: passed ? '#16a34a' : '#ddd', color: passed ? '#fff' : '#999',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 12, fontWeight: 'bold', marginRight: 12
                            }}>{passed ? '✓' : idx + 1}</div>
                            <span style={{ color: step === order.status ? '#000' : '#999', fontWeight: step === order.status ? 'bold' : 'normal' }}>
                                {STATUS_LABELS[step] || step}
                            </span>
                        </div>
                    );
                })}
            </div>

            <h3>Items</h3>
            {order.items?.map((item: any) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                    <span>{item.product_name} × {item.quantity}</span>
                    <span>KES {item.unit_price * item.quantity}</span>
                </div>
            ))}
            <div style={{ fontWeight: 'bold', textAlign: 'right' }}>Total: KES {order.total_amount}</div>

            {error && <p style={{ color: 'red', marginTop: 12 }}>{error}</p>}

            {isArrived && !isPaid && !isPaymentPending && (
                <div style={{ marginTop: 20 }}>
                    <button
                        onClick={handleConfirm}
                        disabled={confirming}
                        style={{ width: '100%', padding: 14, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8 }}
                    >
                        {confirming ? 'Confirming...' : 'Confirm Delivery & Pay'}
                    </button>
                </div>
            )}

            {isPaymentPending && (
                <div style={{ marginTop: 20, padding: 16, background: '#fef9e7', borderRadius: 8, border: '1px solid #f59e0b' }}>
                    <p style={{ color: '#f59e0b', margin: 0 }}>📱 M-Pesa prompt sent to your phone.</p>
                    <p style={{ fontSize: '0.9em', color: '#666' }}>Check your phone and enter PIN to complete payment.</p>
                    {paymentStatus?.status === 'initiation_failed' && (
                        <p style={{ color: 'red' }}>Payment initiation failed. Please try again.</p>
                    )}
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
                        <button
                            onClick={handleRetryPayment}
                            disabled={retrying}
                            style={{ padding: '10px 20px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6 }}
                        >
                            {retrying ? 'Retrying...' : 'Resend STK Push'}
                        </button>
                        {checkoutId && checkoutId.startsWith('mock-') && (
                            <button
                                onClick={() => simulatePayment(checkoutId)}
                                disabled={simulating}
                                style={{ padding: '10px 20px', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 6 }}
                            >
                                {simulating ? 'Simulating...' : '🔧 Simulate Payment (Mock)'}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {isPaid && (
                <p style={{ color: '#16a34a', marginTop: 20 }}>✅ Payment received!</p>
            )}

            {order.status === 'payment_pending' && paymentStatus?.status === 'verified' && (
                <p style={{ color: '#16a34a', marginTop: 20 }}>✅ Payment confirmed!</p>
            )}
        </div>
    );
};

export default OrderTracking;
