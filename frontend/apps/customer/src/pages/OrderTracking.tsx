import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '../auth/CustomerAuthContext';

interface OrderItem {
  id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  subtotal: number;
  delivery_fee: number;
  total_amount: number;
  items: OrderItem[];
  created_at: string;
}

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
  'waiting_acceptance',
  'accepted',
  'preparing',
  'ready_for_delivery',
  'out_for_delivery',
  'arrived',
  'customer_confirmed_delivery',
  'payment_pending',
  'paid',
  'completed',
];

const OrderTracking: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useCustomerAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [paymentResult, setPaymentResult] = useState<string | null>(null);

  const fetchOrder = async () => {
    try {
      const resp = await fetch(`http://localhost:8000/api/v1/orders/${id}`);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error?.message || 'Failed to load order');
      setOrder(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrder(); }, [id]);

  // Poll every 10s for status updates
  useEffect(() => {
    const interval = setInterval(fetchOrder, 10000);
    return () => clearInterval(interval);
  }, [id]);

  const handleConfirmDelivery = async () => {
    setConfirming(true);
    setError('');
    try {
      const resp = await fetch(`http://localhost:8000/api/v1/orders/${id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: session?.phone }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error?.message || 'Confirmation failed');
      setPaymentResult(data?.payment?.status || 'Payment initiated');
      fetchOrder();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setConfirming(false);
    }
  };

  if (loading) return <div style={{ padding: 20 }}>Loading order...</div>;
  if (error) return <div style={{ padding: 20, color: 'red' }}>{error}</div>;
  if (!order) return <div style={{ padding: 20 }}>Order not found</div>;

  const currentStepIndex = ACTIVE_STEPS.indexOf(order.status);
  const isCancelled = order.status === 'cancelled' || order.status === 'delivery_failed';

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: '0 auto' }}>
      <button onClick={() => navigate('/')} style={{ marginBottom: 20 }}>← Back to Discovery</button>

      <h1>Order {order.order_number}</h1>
      <p style={{ color: '#666' }}>Placed on {new Date(order.created_at).toLocaleString()}</p>

      {/* Status steps */}
      <div style={{ margin: '30px 0' }}>
        {ACTIVE_STEPS.map((step, index) => {
          const isPast = currentStepIndex >= 0 && index <= currentStepIndex && !isCancelled;
          const isCurrent = step === order.status;
          return (
            <div key={step} style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: isPast ? '#16a34a' : '#ddd',
                color: isPast ? '#fff' : '#999',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 'bold', marginRight: 12
              }}>
                {isPast ? '✓' : index + 1}
              </div>
              <span style={{ color: isCurrent ? '#000' : '#999', fontWeight: isCurrent ? 'bold' : 'normal' }}>
                {STATUS_LABELS[step] || step}
              </span>
            </div>
          );
        })}
      </div>

      {/* Cancelled state */}
      {isCancelled && (
        <div style={{ background: '#fee', padding: 12, borderRadius: 8, marginBottom: 20 }}>
          <p style={{ color: '#c00', fontWeight: 'bold' }}>
            {STATUS_LABELS[order.status] || order.status}
          </p>
        </div>
      )}

      {/* Items */}
      <div style={{ marginBottom: 20 }}>
        <h3>Items</h3>
        {order.items.map(item => (
          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
            <span>{item.product_name} × {item.quantity}</span>
            <span>KES {item.unit_price * item.quantity}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginTop: 8 }}>
          <span>Total</span>
          <span>KES {order.total_amount}</span>
        </div>
      </div>

      {/* Confirm delivery button */}
      {order.status === 'arrived' && (
        <div style={{ marginBottom: 20 }}>
          <button
            onClick={handleConfirmDelivery}
            disabled={confirming}
            style={{
              width: '100%', padding: 14, fontSize: '1.1em', background: '#2563eb', color: '#fff',
              border: 'none', borderRadius: 8, cursor: 'pointer'
            }}
          >
            {confirming ? 'Confirming...' : 'Confirm Delivery & Pay'}
          </button>
        </div>
      )}

      {/* Payment result */}
      {paymentResult && (
        <div style={{ background: '#e6ffe6', padding: 12, borderRadius: 8, marginBottom: 20 }}>
          <p style={{ color: '#16a34a', fontWeight: 'bold' }}>✓ {paymentResult}</p>
        </div>
      )}

      {/* Payment pending – STK Push info */}
      {order.status === 'payment_pending' && (
        <div style={{ background: '#fff3cd', padding: 12, borderRadius: 8, marginBottom: 20 }}>
          <p>📱 An M-Pesa payment request has been sent to your phone. Please check and enter your PIN to complete the payment.</p>
        </div>
      )}

      {/* Paid */}
      {order.status === 'paid' && (
        <div style={{ background: '#e6ffe6', padding: 12, borderRadius: 8, marginBottom: 20 }}>
          <p style={{ color: '#16a34a', fontWeight: 'bold' }}>✓ Payment received! Your order is complete.</p>
        </div>
      )}

      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};

export default OrderTracking;
