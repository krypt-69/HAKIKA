import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '../auth/CustomerAuthContext';

interface Product {
  id: string;
  name: string;
  description: string | null;
  original_price: number;
  discount_price: number | null;
  image_url: string | null;
}

interface BusinessProfile {
  id: string;
  name: string;
  category_id: number;
  description: string | null;
  trust_score: number;
  logo_url: string | null;
  location: { lat: number; lon: number; address_text: string | null } | null;
  operating_hours: { day_of_week: number; opens_at: string | null; closes_at: string | null; is_closed: boolean }[];
  products: Product[];
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const BusinessProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useCustomerAuth();
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`http://localhost:8000/api/v1/businesses/${id}/profile`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error.message);
        setBusiness(data);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

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
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => prev.map(item =>
      item.product.id === productId ? { ...item, quantity } : item
    ));
  };

  const totalAmount = cart.reduce((sum, item) => {
    const price = item.product.discount_price ?? item.product.original_price;
    return sum + price * item.quantity;
  }, 0);

  const handleCheckout = () => {
    // Store cart in sessionStorage so the order page can retrieve it
    sessionStorage.setItem('hakika_cart', JSON.stringify({ businessId: id, items: cart }));
    navigate(`/order?business=${id}`);
  };

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (error) return <div style={{ padding: 20, color: 'red' }}>{error}</div>;
  if (!business) return <div style={{ padding: 20 }}>Business not found</div>;

  return (
    <div style={{ padding: 20 }}>
      {/* Back button */}
      <button onClick={() => navigate('/')} style={{ marginBottom: 20 }}>← Back to Discovery</button>

      {/* Business header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>{business.name}</h1>
          {business.description && <p>{business.description}</p>}
          {business.location?.address_text && (
            <p style={{ color: '#666' }}>📍 {business.location.address_text}</p>
          )}
        </div>
        <span style={{ background: '#eee', padding: '8px 12px', borderRadius: 8, fontSize: '1.2em' }}>
          ⭐ {business.trust_score?.toFixed(0)}%
        </span>
      </div>

      {/* Operating hours */}
      <div style={{ margin: '20px 0', padding: 12, background: '#f9f9f9', borderRadius: 8 }}>
        <h3>Opening Hours</h3>
        {business.operating_hours.length === 0 ? (
          <p>Hours not specified</p>
        ) : (
          business.operating_hours.map(h => (
            <div key={h.day_of_week} style={{ display: 'flex', justifyContent: 'space-between', maxWidth: 300 }}>
              <span>{DAYS[h.day_of_week]}</span>
              <span>{h.is_closed ? 'Closed' : `${h.opens_at?.slice(0,5) || '?'} - ${h.closes_at?.slice(0,5) || '?'}`}</span>
            </div>
          ))
        )}
      </div>

      {/* Products */}
      <h2>Products</h2>
      {business.products.length === 0 ? (
        <p>No products available</p>
      ) : (
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
          {business.products.map(product => {
            const finalPrice = product.discount_price ?? product.original_price;
            const hasDiscount = product.discount_price && product.discount_price < product.original_price;
            return (
              <div key={product.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
                <h3 style={{ margin: 0 }}>{product.name}</h3>
                {product.description && <p style={{ fontSize: '0.9em', color: '#666' }}>{product.description}</p>}
                <div style={{ margin: '8px 0' }}>
                  {hasDiscount && (
                    <span style={{ textDecoration: 'line-through', color: '#999', marginRight: 8 }}>
                      KES {product.original_price}
                    </span>
                  )}
                  <span style={{ fontWeight: 'bold', fontSize: '1.1em' }}>KES {finalPrice}</span>
                </div>
                <button
                  onClick={() => addToCart(product)}
                  style={{ width: '100%', padding: '8px 0', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                >
                  Add to Cart
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Cart sidebar (floating) */}
      {cart.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff',
          borderTop: '2px solid #2563eb', padding: 16, boxShadow: '0 -4px 12px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h3 style={{ margin: 0 }}>Your Cart ({cart.length} items)</h3>
            <span style={{ fontWeight: 'bold', fontSize: '1.2em' }}>KES {totalAmount}</span>
          </div>
          {cart.map(item => (
            <div key={item.product.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span>{item.product.name}</span>
              <div>
                <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} style={{ width: 28, height: 28 }}>-</button>
                <span style={{ margin: '0 8px' }}>{item.quantity}</span>
                <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} style={{ width: 28, height: 28 }}>+</button>
              </div>
              <span>KES {(item.product.discount_price ?? item.product.original_price) * item.quantity}</span>
            </div>
          ))}
          <button
            onClick={handleCheckout}
            style={{ width: '100%', padding: 12, marginTop: 12, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4, fontSize: '1em', cursor: 'pointer' }}
          >
            Proceed to Order (KES {totalAmount})
          </button>
        </div>
      )}
    </div>
  );
};

export default BusinessProfile;
