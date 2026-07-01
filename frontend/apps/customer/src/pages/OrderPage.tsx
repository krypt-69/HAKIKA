import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCustomerAuth } from '../auth/CustomerAuthContext';

interface CartItem {
  product: { id: string; name: string; original_price: number; discount_price: number | null };
  quantity: number;
}

const OrderPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const businessId = searchParams.get('business') || '';
  const { session } = useCustomerAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [phone, setPhone] = useState(session?.phone || '');
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
        if (parsed.businessId === businessId) {
          setCart(parsed.items || []);
        }
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
    if (!businessId) return setError('No business selected');
    if (cart.length === 0) return setError('Cart is empty');
    setError('');
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          business_id: businessId,
          items: cart.map(item => ({
            product_id: item.product.id,
            quantity: item.quantity,
          })),
          delivery_lat: parseFloat(deliveryLat),
          delivery_lon: parseFloat(deliveryLon),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Order failed');
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
        <p>Your order number is <strong>{orderId}</strong></p>
        <p>The business will review your order shortly.</p>
        <button onClick={() => navigate(`/order/${orderId}`)} style={{ marginTop: 20, padding: '10px 20px', marginRight: 10 }}>
          Track Your Order
        </button>
        <button onClick={() => navigate('/')} style={{ marginTop: 20, padding: '10px 20px' }}>
          Back to Discovery
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: 20 }}>← Back</button>
      <h1>Place Your Order</h1>

      {cart.length === 0 ? (
        <p>Your cart is empty. <a href="/">Find businesses</a></p>
      ) : (
        <>
          <div style={{ marginBottom: 20 }}>
            {cart.map(item => (
              <div key={item.product.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                <span>{item.product.name} × {item.quantity}</span>
                <span>KES {(item.product.discount_price ?? item.product.original_price) * item.quantity}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontWeight: 'bold', fontSize: '1.2em' }}>
              <span>Total</span>
              <span>KES {totalAmount}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ maxWidth: 400 }}>
            <div style={{ marginBottom: 12 }}>
              <label>Phone Number</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="0712345678" required
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
              style={{ width: '100%', padding: 12, fontSize: '1em', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
              {loading ? 'Placing Order...' : `Confirm Order - KES ${totalAmount}`}
            </button>
          </form>
        </>
      )}
    </div>
  );
};

export default OrderPage;
