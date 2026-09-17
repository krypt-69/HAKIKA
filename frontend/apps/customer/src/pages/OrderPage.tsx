import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Config } from '@hakika/config';

interface CartItem {
    product: {
        id: string;
        name: string;
        original_price: number;
        discount_price: number | null;
        selling_unit?: string;
        min_order_quantity?: number;
        max_order_quantity?: number | null;
        track_inventory?: boolean;
        stock_quantity?: number | null;
        images?: { id: string; position: number; url: string }[];
    };
    quantity: number;
}

const OrderPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const businessId = searchParams.get('business') || '';
    const [cart, setCart] = useState<CartItem[]>([]);
    const [business, setBusiness] = useState<any>(null);
    const [businessLoading, setBusinessLoading] = useState(true);
    const [phone, setPhone] = useState('');
    const [deliveryLat, setDeliveryLat] = useState('');
    const [deliveryLon, setDeliveryLon] = useState('');
    const [deliveryNote, setDeliveryNote] = useState('');
    const [locationSet, setLocationSet] = useState(false);
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

    useEffect(() => {
        if (!businessId) {
            setBusinessLoading(false);
            return;
        }
        setBusinessLoading(true);
        api.businessById(businessId)
            .then(data => {
                setBusiness(data);
                setBusinessLoading(false);
            })
            .catch(() => {
                setBusiness(null);
                setBusinessLoading(false);
            });
    }, [businessId]);

    const totalAmount = cart.reduce((sum, item) => {
        const price = item.product.discount_price ?? item.product.original_price;
        return sum + price * item.quantity;
    }, 0);

    const handleUseLocation = () => {
        if (!navigator.geolocation) {
            setError('Geolocation not supported by your browser. Please enter coordinates manually.');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            pos => {
                setDeliveryLat(String(pos.coords.latitude));
                setDeliveryLon(String(pos.coords.longitude));
                setLocationSet(true);
                setError('');
            },
            () => setError('Location access denied. Please enter coordinates manually.')
        );
    };

    const handleManualCoordChange = (which: 'lat' | 'lon', value: string) => {
        if (which === 'lat') setDeliveryLat(value);
        else setDeliveryLon(value);
        setLocationSet(false); // re-validate whenever coords are hand-edited
    };

    const isValidCoord = (lat: string, lon: string) => {
        if (lat.trim() === '' || lon.trim() === '') return false;
        const latNum = parseFloat(lat);
        const lonNum = parseFloat(lon);
        if (Number.isNaN(latNum) || Number.isNaN(lonNum)) return false;
        if (latNum < -90 || latNum > 90) return false;
        if (lonNum < -180 || lonNum > 180) return false;
        return true;
    };

    const locationReady = locationSet || isValidCoord(deliveryLat, deliveryLon);

    const cartIssue = (() => {
        for (const item of cart) {
            const p = item.product;
            const min = p.min_order_quantity ?? 1;
            const orderCap = p.max_order_quantity ?? null;
            const stockCap = p.track_inventory && p.stock_quantity != null ? p.stock_quantity : null;
            const caps: number[] = [];
            if (orderCap !== null) caps.push(orderCap);
            if (stockCap !== null) caps.push(stockCap);
            const max = caps.length ? Math.min(...caps) : null;

            if (p.track_inventory && (p.stock_quantity ?? 0) <= 0) return `${p.name} is out of stock.`;
            if (item.quantity < min) return `Quantity for ${p.name} is below the minimum of ${min}.`;
            if (max !== null && item.quantity > max) return `Quantity for ${p.name} exceeds the available maximum of ${max}.`;
        }
        return null;
    })();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!phone) return setError('Phone number is required');
        if (!locationReady) return setError('Please share your location or enter valid delivery coordinates before placing your order');
        if (cartIssue) return setError(cartIssue);
        setError('');
        setLoading(true);
        try {
            const data = await api.createOrder({
                phone,
                business_id: businessId,
                items: cart.map(item => ({ product_id: item.product.id, quantity: item.quantity })),
                delivery_lat: parseFloat(deliveryLat),
                delivery_lon: parseFloat(deliveryLon),
                delivery_note: deliveryNote.trim() || undefined,
            });
            setOrderId(data.id);
            sessionStorage.setItem(`hakika_order_phone_${data.id}`, phone);
            setSuccess(true);
            sessionStorage.setItem('hakika_customer_phone', phone);
            sessionStorage.removeItem('hakika_cart');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="order-page order-success">
                <style>{styles}</style>
                <div className="success-card">
                    <div className="success-icon">✓</div>
                    <h1>Order Placed!</h1>
                    <p className="order-number">Order number: <strong>{orderId}</strong></p>
                    <div className="success-actions">
                        <button className="btn btn-primary" onClick={() => navigate(`/order/${orderId}`)}>Track Order</button>
                        <button className="btn btn-secondary" onClick={() => navigate('/')}>Back to Discovery</button>
                    </div>
                </div>
            </div>
        );
    }

    const businessLogo = businessId ? `${Config.API_BASE}/businesses/${businessId}/logo?t=${Date.now()}` : '';
    const businessCover = businessId ? `${Config.API_BASE}/businesses/${businessId}/cover?t=${Date.now()}` : '';

    return (
        <div className="order-page">
            <style>{styles}</style>
            <div className="order-container">
                <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
                <h1 className="page-title">Checkout</h1>

                <div className="content-grid">
                    <div className="left-col">
                        {/* Business context */}
                        {businessLoading ? (
                            <div className="business-loading">Loading business…</div>
                        ) : business ? (
                            <div className="business-card">
                                <div className="business-header">
                                    <img
                                        src={businessLogo}
                                        alt="Business logo"
                                        className="business-logo"
                                        onError={e => { e.currentTarget.style.display = 'none'; }}
                                    />
                                    <div>
                                        <div className="business-name">{business.name}</div>
                                        <div className="business-subtitle">Your order from {business.name}</div>
                                    </div>
                                </div>
                                <img
                                    src={businessCover}
                                    alt="Business cover"
                                    className="business-cover"
                                    onError={e => { e.currentTarget.style.display = 'none'; }}
                                />
                            </div>
                        ) : null}

                        {/* Items with thumbnails */}
                        <div className="cart-summary">
                            <h2 className="section-title">Your Order</h2>
                            {cart.map(item => {
                                const img = item.product.images?.[0]?.url;
                                const unitPrice = item.product.discount_price ?? item.product.original_price;
                                return (
                                    <div key={item.product.id} className="cart-item">
                                        {img ? (
                                            <img src={img} alt={item.product.name} className="cart-item-img" />
                                        ) : (
                                            <div className="cart-item-img placeholder" />
                                        )}
                                        <div className="cart-item-info">
                                            <div className="cart-item-name">{item.product.name} × {item.quantity}</div>
                                            <div className="cart-item-price">
                                                KES {(unitPrice * item.quantity).toFixed(2)}
                                                {item.product.selling_unit ? ` / ${item.product.selling_unit}` : ''}
                                            </div>
                                        </div>
                                        <div className="cart-item-total">KES {(unitPrice * item.quantity).toFixed(2)}</div>
                                    </div>
                                );
                            })}
                            <div className="cart-total">
                                <span>Total</span>
                                <span>KES {totalAmount.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="checkout-form">
                        <h2 className="section-title">Delivery Details</h2>

                        <div className="form-group">
                            <label htmlFor="phone">Phone Number (for M-Pesa payment)</label>
                            <input
                                id="phone"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                required
                                placeholder="0712345678"
                                className="text-input"
                            />
                        </div>

                        <div className="form-group">
                            <label>Delivery Location</label>
                            <button type="button" onClick={handleUseLocation} className="location-btn">
                                📍 Use My Current Location
                            </button>

                            <div className="coord-divider">
                                <span>or enter coordinates manually</span>
                            </div>

                            <div className="coord-inputs">
                                <input
                                    value={deliveryLat}
                                    onChange={e => handleManualCoordChange('lat', e.target.value)}
                                    placeholder="Latitude"
                                    inputMode="decimal"
                                    className="text-input"
                                />
                                <input
                                    value={deliveryLon}
                                    onChange={e => handleManualCoordChange('lon', e.target.value)}
                                    placeholder="Longitude"
                                    inputMode="decimal"
                                    className="text-input"
                                />
                            </div>

                            {locationReady ? (
                                <p className="location-status ok">✓ Delivery location set</p>
                            ) : (
                                <p className="location-status pending">Location required to place an order</p>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="delivery-note">Additional info (optional)</label>
                            <textarea
                                id="delivery-note"
                                value={deliveryNote}
                                onChange={e => setDeliveryNote(e.target.value)}
                                maxLength={500}
                                rows={2}
                                placeholder="Any additional info useful for the rider like room etc."
                                className="text-input"
                                style={{ resize: 'vertical', minHeight: 60 }}
                            />
                        </div>

                        {error && <p className="error-msg">{error}</p>}

                        <button
                            type="submit"
                            disabled={loading || !locationReady || !phone}
                            className="btn btn-primary submit-btn"
                        >
                            {loading ? 'Placing Order...' : `Confirm Order – KES ${totalAmount.toFixed(2)}`}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

const styles = `
* { box-sizing: border-box; }

.order-page {
    min-height: 100vh;
    background: #f7f8fa;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    padding: 16px;
}

.order-container {
    max-width: 960px;
    margin: 0 auto;
}

.back-btn {
    background: none;
    border: none;
    color: #2563eb;
    font-size: 15px;
    cursor: pointer;
    padding: 8px 0;
    margin-bottom: 8px;
}

.page-title {
    font-size: 26px;
    margin: 4px 0 20px;
    color: #111827;
}

.content-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
}

@media (min-width: 768px) {
    .content-grid {
        grid-template-columns: 1.1fr 1fr;
        align-items: start;
    }
}

.left-col {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.section-title {
    font-size: 16px;
    color: #374151;
    margin: 0 0 12px;
}

.business-loading {
    color: #6b7280;
    padding: 12px 0;
    font-size: 14px;
}

.business-card {
    background: #fff;
    border-radius: 12px;
    padding: 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.business-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px;
    background: #f9fafb;
    border-radius: 8px;
}

.business-logo {
    width: 48px;
    height: 48px;
    object-fit: cover;
    border-radius: 6px;
    flex-shrink: 0;
}

.business-name {
    font-weight: 600;
    font-size: 16px;
    color: #111827;
}

.business-subtitle {
    font-size: 13px;
    color: #6b7280;
}

.business-cover {
    width: 100%;
    height: 140px;
    object-fit: cover;
    border-radius: 8px;
    margin-top: 10px;
}

.cart-summary, .checkout-form {
    background: #fff;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.cart-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid #f0f0f0;
}

.cart-item-img {
    width: 52px;
    height: 52px;
    object-fit: cover;
    border-radius: 6px;
    flex-shrink: 0;
}

.cart-item-img.placeholder {
    background: #f3f4f6;
}

.cart-item-info {
    flex: 1;
    min-width: 0;
}

.cart-item-name {
    font-weight: 500;
    font-size: 14px;
    color: #111827;
    overflow-wrap: break-word;
}

.cart-item-price {
    font-size: 13px;
    color: #6b7280;
}

.cart-item-total {
    font-weight: 600;
    font-size: 14px;
    color: #111827;
    white-space: nowrap;
}

.cart-total {
    display: flex;
    justify-content: space-between;
    font-weight: 700;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 2px solid #e5e7eb;
    color: #111827;
    font-size: 16px;
}

.form-group {
    margin-bottom: 18px;
}

.form-group label {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: #374151;
    margin-bottom: 6px;
}

.text-input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 15px;
    background: #fff;
    color: #111827;
}

.text-input:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
}

.location-btn {
    width: 100%;
    padding: 10px 12px;
    background: #2563eb;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    margin-top: 4px;
}

.location-btn:hover {
    background: #1d4ed8;
}

.coord-divider {
    display: flex;
    align-items: center;
    text-align: center;
    color: #9ca3af;
    font-size: 12px;
    margin: 14px 0 10px;
}

.coord-divider::before, .coord-divider::after {
    content: '';
    flex: 1;
    border-bottom: 1px solid #e5e7eb;
}

.coord-divider span {
    padding: 0 10px;
}

.coord-inputs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
}

.location-status {
    font-size: 13px;
    margin-top: 8px;
}

.location-status.ok {
    color: #16a34a;
    font-weight: 600;
}

.location-status.pending {
    color: #b45309;
}

.error-msg {
    color: #dc2626;
    font-size: 14px;
    margin: 8px 0;
}

.btn {
    border: none;
    border-radius: 8px;
    padding: 12px 20px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
}

.btn-primary {
    background: #16a34a;
    color: #fff;
}

.btn-primary:disabled {
    background: #9ca3af;
    cursor: not-allowed;
}

.btn-secondary {
    background: #e5e7eb;
    color: #111827;
}

.submit-btn {
    width: 100%;
    margin-top: 6px;
    font-size: 16px;
}

.order-success {
    display: flex;
    align-items: center;
    justify-content: center;
}

.success-card {
    background: #fff;
    border-radius: 16px;
    padding: 40px 30px;
    text-align: center;
    max-width: 420px;
    width: 100%;
    box-shadow: 0 4px 16px rgba(0,0,0,0.08);
}

.success-icon {
    width: 56px;
    height: 56px;
    background: #16a34a;
    color: #fff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    margin: 0 auto 16px;
}

.order-number {
    color: #374151;
    margin-bottom: 20px;
}

.success-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

@media (min-width: 480px) {
    .success-actions {
        flex-direction: row;
        justify-content: center;
    }
}
`;

export default OrderPage;