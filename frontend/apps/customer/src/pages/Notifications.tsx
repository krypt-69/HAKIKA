import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

const Notifications: React.FC = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [phone, setPhone] = useState('');

    const fetchOrders = async (phoneNumber: string) => {
        setLoading(true);
        setError('');
        try {
            const data = await api.getMyOrders(phoneNumber);
            setOrders(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!phone.trim()) {
            setError('Please enter your phone number');
            return;
        }
        sessionStorage.setItem('hakika_customer_phone', phone);
        fetchOrders(phone);
    };

    useEffect(() => {
        const storedPhone = sessionStorage.getItem('hakika_customer_phone');
        if (storedPhone) {
            setPhone(storedPhone);
            fetchOrders(storedPhone);
        } else {
            setLoading(false);
        }
    }, []);

    return (
        <div style={{ padding: 20 }}>
            <button onClick={() => navigate('/')}>← Back</button>
            <h1>Notifications</h1>
            {!sessionStorage.getItem('hakika_customer_phone') && (
                <form onSubmit={handleSubmit} style={{ marginBottom: 20 }}>
                    <p>Enter your phone number to see your orders:</p>
                    <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="0712345678"
                        style={{ padding: 10, fontSize: 16, width: '100%', maxWidth: 300 }}
                    />
                    <button type="submit" style={{ padding: '10px 20px', marginLeft: 10, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4 }}>
                        View Orders
                    </button>
                    {error && <p style={{ color: 'red', marginTop: 8 }}>{error}</p>}
                </form>
            )}
            {loading && <p>Loading...</p>}
            {orders.length === 0 && !loading && <p>No orders found.</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {orders.map(order => (
                    <div
                        key={order.id}
                        onClick={() => navigate(`/order/${order.id}`)}
                        style={{
                            padding: 16,
                            border: '1px solid #ddd',
                            borderRadius: 8,
                            cursor: 'pointer',
                            background: order.status === 'arrived' ? '#fef9e7' : '#fff'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <strong>Order {order.order_number}</strong>
                            <span>{STATUS_LABELS[order.status] || order.status}</span>
                        </div>
                        <p style={{ margin: '4px 0', fontSize: '0.9em' }}>{order.business_name}</p>
                        <p style={{ margin: '4px 0', fontSize: '0.8em', color: '#666' }}>
                            {new Date(order.created_at).toLocaleString()}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Helper labels (reuse from OrderTracking)
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

export default Notifications;
