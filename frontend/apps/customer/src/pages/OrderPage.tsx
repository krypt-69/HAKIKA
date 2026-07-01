import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api';

interface CartItem {
    product: { id: string; name: string; original_price: number; discount_price: number | null };
    quantity: number;
}

const OrderPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const businessId = searchParams.get('business') || '';
    const [cart, setCart] = useState<CartItem[]>([]);
    const [phone, setPhone] = useState('');
    const [deliveryLat, setDeliveryLat] = useState('-1.286');
    const [deliveryLon, setDeliveryLon] = useState('36.817');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [orderId, setOrderId] = useState('');

    useEffect(() => {
        const stored = sessionStorage.getItem('hakika_cart');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (parsed.businessId === businessId) setCart(parsed.items || []);
            } catch {}
        }
    }, [businessId]);

    const totalAmount = cart.reduce((sum, item) => {
        const price = item.product.discount_price ?? item.product.original_price;
        return sum + price * item.quantity;
    }, 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!phone) return setError('Phone number is required');
        setError('');
        setLoading(true);
        try {
            const data = await api.createOrder({
                phone,
                business_id: businessId,
                items: cart.map(item => ({ product_id: item.product.id, quantity: item.quantity })),
                delivery_lat: parseFloat(deliveryLat),
                delivery_lon: parseFloat(deliveryLon),
            });
            setOrderId(data.id);
            setSuccess(true);
            sessionStorage.removeItem('hakika_cart');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div style={{ padding: 20, textAlign: 'center' }}>
                <h1>Order Placed!</h1>
                <p>Order number: <strong>{orderId}</strong></p>
                <button onClick={() => navigate(`/order/${orderId}`)} style={{ marginRight: 10 }}>Track Order</button>
                <button onClick={() => navigate('/')}>Back to Discovery</button>
            </div>
        );
    }

    return (
        <div style={{ padding: 20 }}>
            <button onClick={() => navigate(-1)}>← Back</button>
            <h1>Checkout</h1>
            <div style={{ marginBottom: 20 }}>
                {cart.map(item => (
                    <div key={item.product.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                        <span>{item.product.name} × {item.quantity}</span>
                        <span>KES {(item.product.discount_price ?? item.product.original_price) * item.quantity}</span>
                    </div>
                ))}
                <div style={{ fontWeight: 'bold', textAlign: 'right', marginTop: 8 }}>Total: KES {totalAmount}</div>
            </div>
            <form onSubmit={handleSubmit} style={{ maxWidth: 400 }}>
                <div style={{ marginBottom: 12 }}>
                    <label>Phone Number (for M-Pesa payment)</label>
                    <input value={phone} onChange={e => setPhone(e.target.value)} required placeholder="0712345678"
                        style={{ width: '100%', padding: 8, marginTop: 4 }} />
                </div>
                <div style={{ marginBottom: 12 }}>
                    <label>Delivery Latitude</label>
                    <input value={deliveryLat} onChange={e => setDeliveryLat(e.target.value)}
                        style={{ width: '100%', padding: 8, marginTop: 4 }} />
                </div>
                <div style={{ marginBottom: 12 }}>
                    <label>Delivery Longitude</label>
                    <input value={deliveryLon} onChange={e => setDeliveryLon(e.target.value)}
                        style={{ width: '100%', padding: 8, marginTop: 4 }} />
                </div>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                <button type="submit" disabled={loading}
                    style={{ width: '100%', padding: 12, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4 }}>
                    {loading ? 'Placing Order...' : `Confirm Order – KES ${totalAmount}`}
                </button>
            </form>
        </div>
    );
};

export default OrderPage;
