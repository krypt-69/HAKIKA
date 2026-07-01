import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';

interface Product {
    id: string;
    name: string;
    description: string | null;
    original_price: number;
    discount_price: number | null;
    images: { id: string; position: number; url: string }[];
}

const BusinessProfile: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const [business, setBusiness] = useState<any>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!slug) return;
        api.businessById(slug!)
            .then(data => {
                setBusiness(data);
                setProducts(data.products || []);
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [slug]);

    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prev, { product, quantity: 1 }];
        });
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.product.id !== productId));
    };

    const updateQuantity = (productId: string, quantity: number) => {
        if (quantity <= 0) { removeFromCart(productId); return; }
        setCart(prev => prev.map(item =>
            item.product.id === productId ? { ...item, quantity } : item
        ));
    };

    const totalAmount = cart.reduce((sum, item) => {
        const price = item.product.discount_price ?? item.product.original_price;
        return sum + price * item.quantity;
    }, 0);

    const handleCheckout = () => {
        sessionStorage.setItem('hakika_cart', JSON.stringify({ businessId: business?.id, items: cart }));
        window.location.href = `/order?business=${business?.id}`;
    };

    if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
    if (error) return <div style={{ padding: 20, color: 'red' }}>{error}</div>;
    if (!business) return <div style={{ padding: 20 }}>Business not found</div>;

    return (
        <div style={{ padding: 20 }}>
            <button onClick={() => window.history.back()}>← Back</button>
            <div style={{ display: 'flex', gap: 20, marginTop: 20 }}>
                <img
                    src={`http://localhost:8000/api/v1/businesses/${business.id}/logo`}
                    style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8 }}
                    onError={e => (e.currentTarget.style.display = 'none')}
                />
                <div>
                    <h1>{business.name}</h1>
                    <p>⭐ {business.trust_score?.toFixed(0)}%</p>
                    <p>{business.description}</p>
                    <p>📍 {business.location?.address_text}</p>
                </div>
            </div>

            <h2 style={{ marginTop: 30 }}>Products</h2>
            <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
                {products.map(product => {
                    const finalPrice = product.discount_price ?? product.original_price;
                    const hasDiscount = product.discount_price && product.discount_price < product.original_price;
                    return (
                        <div key={product.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
                            {product.images?.[0] && (
                                <img
                                    src={`http://localhost:8000${product.images[0].url}`}
                                    style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 4 }}
                                />
                            )}
                            <h3>{product.name}</h3>
                            {hasDiscount && <span style={{ textDecoration: 'line-through', color: '#999', marginRight: 8 }}>KES {product.original_price}</span>}
                            <span style={{ fontWeight: 'bold' }}>KES {finalPrice}</span>
                            <button onClick={() => addToCart(product)} style={{ width: '100%', marginTop: 8, padding: 8 }}>Add to Cart</button>
                        </div>
                    );
                })}
            </div>

            {cart.length > 0 && (
                <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '2px solid #2563eb', padding: 16, boxShadow: '0 -4px 12px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <strong>{cart.length} items</strong>
                        <strong>KES {totalAmount}</strong>
                    </div>
                    {cart.map(item => (
                        <div key={item.product.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span>{item.product.name}</span>
                            <div>
                                <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)}>-</button>
                                <span style={{ margin: '0 8px' }}>{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)}>+</button>
                            </div>
                            <span>KES {(item.product.discount_price ?? item.product.original_price) * item.quantity}</span>
                        </div>
                    ))}
                    <button onClick={handleCheckout} style={{ width: '100%', padding: 12, marginTop: 12, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4 }}>
                        Proceed to Order (KES {totalAmount})
                    </button>
                </div>
            )}
        </div>
    );
};

export default BusinessProfile;
