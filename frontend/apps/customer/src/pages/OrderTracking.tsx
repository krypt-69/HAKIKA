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

    const fetchOrder = () => {
        if (!id) return;
        api.getOrder(id).then(setOrder).catch(e => setError(e.message));
    };

    useEffect(() => { fetchOrder(); const interval = setInterval(fetchOrder, 10000); return () => clearInterval(interval); }, [id]);

    const handleConfirm = async () => {
        setConfirming(true);
        try {
            await api.confirmDelivery(id!, prompt('Enter phone number:') || '');
            fetchOrder();
        } catch (e: any) { setError(e.message); } finally { setConfirming(false); }
    };

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

            {order.status === 'arrived' && (
                <button onClick={handleConfirm} disabled={confirming} style={{ width: '100%', marginTop: 20, padding: 14, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8 }}>
                    {confirming ? 'Confirming...' : 'Confirm Delivery & Pay'}
                </button>
            )}
            {order.status === 'payment_pending' && <p style={{ color: '#f59e0b' }}>📱 M-Pesa prompt sent. Check your phone.</p>}
            {order.status === 'paid' && <p style={{ color: '#16a34a' }}>✅ Payment received!</p>}
        </div>
    );
};

export default OrderTracking;
