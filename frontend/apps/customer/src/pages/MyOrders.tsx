import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

const MyOrders: React.FC = () => {
    const [phone, setPhone] = useState('');
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [inputPhone, setInputPhone] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const stored = sessionStorage.getItem('hakika_customer_phone');
        if (stored) {
            setPhone(stored);
            setInputPhone(stored);
            fetchOrders(stored);
        }
    }, []);

    const fetchOrders = async (phoneNum: string) => {
        setLoading(true);
        setError('');
        try {
            const data = await api.getMyOrders(phoneNum);
            setOrders(data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputPhone.trim()) {
            setError('Please enter your phone number');
            return;
        }
        const normalized = inputPhone.trim();
        setPhone(normalized);
        sessionStorage.setItem('hakika_customer_phone', normalized);
        fetchOrders(normalized);
    };

    const statusLabels: Record<string, string> = {
        waiting_acceptance: 'Waiting for business',
        accepted: 'Accepted',
        preparing: 'Preparing',
        ready_for_delivery: 'Ready for delivery',
        out_for_delivery: 'On the way',
        arrived: 'Arrived',
        customer_confirmed_delivery: 'Delivery confirmed',
        payment_pending: 'Payment pending',
        paid: 'Paid',
        completed: 'Completed',
        cancelled: 'Cancelled',
        delivery_failed: 'Delivery failed',
        dispute_review: 'Under review',
    };

    return (
        <div style={{ padding: 20, maxWidth: 600, margin: '0 auto' }}>
            <button onClick={() => navigate('/')}>← Back</button>
            <h1>My Orders</h1>
            {!phone ? (
                <form onSubmit={handleSubmit} style={{ marginBottom: 20 }}>
                    <div style={{ marginBottom: 12 }}>
                        <label>Enter your phone number to view orders</label>
                        <input
                            type="tel"
                            value={inputPhone}
                            onChange={e => setInputPhone(e.target.value)}
                            placeholder="0712345678"
                            style={{ width: '100%', padding: 10, fontSize: 16, marginTop: 4 }}
                            required
                        />
                    </div>
                    <button type="submit" disabled={loading} style={{ padding: '10px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4 }}>
                        View Orders
                    </button>
                </form>
            ) : (
                <p style={{ color: '#666' }}>Phone: {phone}</p>
            )}
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {loading && <p>Loading...</p>}
            {!loading && orders.length === 0 && <p>No orders found.</p>}
            {orders.map(order => (
                <div
                    key={order.id}
                    style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, marginBottom: 12, cursor: 'pointer' }}
                    onClick={() => navigate(`/order/${order.id}`)}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong>{order.order_number}</strong>
                        <span style={{ color: '#2563eb' }}>{statusLabels[order.status] || order.status}</span>
                    </div>
                    <p style={{ margin: '4px 0' }}>{order.business_name}</p>
                    <p style={{ margin: '4px 0' }}>Total: KES {order.total_amount}</p>
                    <p style={{ fontSize: '0.8em', color: '#666' }}>{new Date(order.created_at).toLocaleString()}</p>
                </div>
            ))}
        </div>
    );
};

export default MyOrders;
