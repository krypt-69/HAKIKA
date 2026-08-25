import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { api } from '../api';
import { Card, Button, LoadingSpinner, ErrorState } from '../components';
import { authenticatedFetch } from '@hakika/auth';
import { Config } from '@hakika/config';
import {
  ArrowLeft,
  Clock,
  MapPin,
  Phone,
  Package,
  Receipt,
  CheckCircle2,
  Bike,
  X as XIcon,
  Hash,
} from 'lucide-react';

interface OrderItem {
  id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  thumbnail_url: string | null;
}

interface OrderDetail {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  subtotal: number;
  delivery_fee: number;
  distance_km: number | null;
  customer_phone: string | null;
  customer_id: string;
  business_id: string;
  items: OrderItem[];
  created_at: string;
}

const RED = '#dc2626';
const RED_LIGHT = '#fee2e2';
const ORANGE = '#ea580c';
const ORANGE_LIGHT = '#ffedd5';
const GREEN = '#16a34a';
const GREEN_LIGHT = '#dcfce7';
const GREY = '#6b7280';
const GREY_LIGHT = '#f3f4f6';
const BLACK = '#111111';

const STATUS_BUCKET: Record<string, 'waiting' | 'progress' | 'done' | 'dead'> = {
  waiting_acceptance: 'waiting',
  accepted: 'progress',
  preparing: 'progress',
  ready_for_delivery: 'progress',
  out_for_delivery: 'progress',
  arrived: 'progress',
  payment_pending: 'progress',
  paid: 'done',
  completed: 'done',
  cancelled: 'dead',
  delivery_failed: 'dead',
};

const BUCKET_STYLE: Record<string, { bg: string; text: string }> = {
  waiting: { bg: RED_LIGHT, text: RED },
  progress: { bg: ORANGE_LIGHT, text: ORANGE },
  done: { bg: GREEN_LIGHT, text: GREEN },
  dead: { bg: GREY_LIGHT, text: GREY },
};

const OrderDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { businessId, collectPaymentBeforeDelivery } = useAuth();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [riders, setRiders] = useState<any[]>([]);
  const [selectedRider, setSelectedRider] = useState('');
  const [assigning, setAssigning] = useState(false);

  const fetchOrder = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await api.request<any>(`/orders/${id}`);
      setOrder(data);
      setError('');
    } catch (e: any) {
      setError(e.message || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const fetchRiders = async () => {
    if (!businessId) return;
    try {
      const resp = await authenticatedFetch(`${Config.API_BASE}/riders/${businessId}`, undefined, 'hakika_business');
      if (!resp.ok) throw new Error('Failed to load riders');
      const data = await resp.json();
      setRiders(data || []);
    } catch (e: any) {}
  };

  useEffect(() => {
    fetchOrder();
    if (businessId) fetchRiders();
  }, [id, businessId]);

  const handleAccept = async () => {
    if (!order) return;
    setActionLoading(true);
    try {
      await api.orders.accept(order.id);
      await fetchOrder();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!order || !selectedRider) return;
    setActionLoading(true);
    try {
      const resp = await authenticatedFetch(
        `${Config.API_BASE}/delivery/orders/${order.id}/assign?rider_id=${selectedRider}`,
        { method: 'PUT' },
        'hakika_business'
      );
      if (!resp.ok) throw new Error('Assignment failed');
      await fetchOrder();
      setAssigning(false);
      setSelectedRider('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      waiting_acceptance: 'Waiting',
      accepted: 'Accepted',
      preparing: 'Preparing',
      ready_for_delivery: 'Ready',
      out_for_delivery: 'Delivering',
      arrived: 'Arrived',
      payment_pending: 'Payment Pending',
      paid: 'Paid',
      completed: 'Completed',
      cancelled: 'Cancelled',
      delivery_failed: 'Delivery Failed',
    };
    return map[status] || status;
  };

  const isAwaitingPayment = (status: string) =>
    collectPaymentBeforeDelivery &&
    ['accepted', 'payment_pending'].includes(status);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const showPhone = (status: string) =>
    ['accepted', 'preparing', 'ready_for_delivery', 'out_for_delivery', 'arrived', 'payment_pending', 'paid', 'completed'].includes(status);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !order) {
    return <ErrorState message={error || 'Order not found'} onRetry={() => navigate('/orders')} />;
  }

  const bucket = STATUS_BUCKET[order.status] || 'progress';
  const badge = isAwaitingPayment(order.status)
    ? { bg: ORANGE_LIGHT, text: ORANGE, label: 'Awaiting Payment' }
    : { ...BUCKET_STYLE[bucket], label: getStatusLabel(order.status) };

  return (
    <div className="details-page">
      {/* Header */}
      <div className="details-header">
        <button className="back-btn" onClick={() => navigate('/orders')}>
          <ArrowLeft size={16} /> Back
        </button>
        <div className="header-title-row">
          <h1 className="header-title">Order {order.order_number}</h1>
          <span className="status-badge" style={{ background: badge.bg, color: badge.text }}>
            {badge.label}
          </span>
        </div>
      </div>

      {/* Summary strip */}
      <div className="summary-strip">
        <div className="summary-item">
          <Clock size={15} color={GREY} />
          <span>{formatDate(order.created_at)}</span>
        </div>
        {order.distance_km !== null && (
          <div className="summary-item">
            <MapPin size={15} color={GREEN} />
            <span style={{ color: GREEN, fontWeight: 600 }}>{order.distance_km.toFixed(1)} km</span>
          </div>
        )}
        {showPhone(order.status) && order.customer_phone && (
          <div className="summary-item phone-pill">
            <Phone size={15} color={GREEN} />
            <span>{order.customer_phone}</span>
          </div>
        )}
      </div>

      {/* Content grid */}
      <div className="details-grid">
        {/* Left: Order info */}
        <div className="info-card">
          <h3 className="card-heading"><Hash size={16} /> Order Details</h3>
          <div className="info-list">
            <div className="info-row">
              <span className="info-label">Order Number</span>
              <span className="info-value">{order.order_number}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Status</span>
              <span className="info-value" style={{ color: badge.text, fontWeight: 700 }}>{badge.label}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Created</span>
              <span className="info-value">{formatDate(order.created_at)}</span>
            </div>
            {order.distance_km !== null && (
              <div className="info-row">
                <span className="info-label">Distance</span>
                <span className="info-value" style={{ color: GREEN, fontWeight: 600 }}>{order.distance_km.toFixed(1)} km</span>
              </div>
            )}
            {showPhone(order.status) && order.customer_phone && (
              <div className="info-row">
                <span className="info-label">Customer Phone</span>
                <span className="info-value">{order.customer_phone}</span>
              </div>
            )}
          </div>

          <div className="totals-block">
            <div className="totals-row">
              <span>Subtotal</span>
              <span>KES {order.subtotal?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="totals-row">
              <span>Delivery Fee</span>
              <span>KES {order.delivery_fee?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="totals-row totals-final">
              <span>Total</span>
              <span>KES {order.total_amount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Right: Items */}
        <div className="info-card">
          <h3 className="card-heading"><Package size={16} /> Items</h3>
          {order.items.length === 0 ? (
            <p style={{ color: GREY, fontSize: '0.875rem' }}>No items</p>
          ) : (
            <ul className="items-list">
              {order.items.map((item) => (
                <li key={item.id} className="items-row">
                  <div className="items-name-qty">
                    {item.thumbnail_url ? (
                      <img
                        src={item.thumbnail_url}
                        alt={item.product_name}
                        style={{
                          width: 36,
                          height: 36,
                          objectFit: 'cover',
                          borderRadius: 6,
                          marginRight: 10,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          background: '#f3f4f6',
                          borderRadius: 6,
                          marginRight: 10,
                        }}
                      />
                    )}
                    <span className="items-name" style={{ color: ORANGE }}>{item.product_name}</span>
                    <span className="items-qty">×{item.quantity}</span>
                  </div>
                  <span className="items-price">KES {(item.unit_price * item.quantity).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="actions-bar">
        {order.status === 'waiting_acceptance' && (
          <Button
            variant="primary"
            onClick={handleAccept}
            isLoading={actionLoading}
            disabled={actionLoading}
          >
            <span className="btn-inline"><CheckCircle2 size={16} /> Accept Order</span>
          </Button>
        )}

        {['accepted', 'preparing', 'ready_for_delivery'].includes(order.status) && (
          <>
            {assigning ? (
              <div className="assign-row">
                <select
                  value={selectedRider}
                  onChange={e => setSelectedRider(e.target.value)}
                  className="rider-select"
                >
                  <option value="">Select rider</option>
                  {riders.map(r => (
                    <option key={r.id} value={r.id}>{r.name} ({r.phone})</option>
                  ))}
                </select>
                <Button
                  variant="success"
                  size="sm"
                  onClick={handleAssign}
                  isLoading={actionLoading}
                  disabled={!selectedRider || actionLoading}
                >
                  Assign
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setAssigning(false); setSelectedRider(''); }}>
                  <XIcon size={14} />
                </Button>
              </div>
            ) : (
              <Button variant="secondary" onClick={() => setAssigning(true)}>
                <span className="btn-inline"><Bike size={16} /> Assign Rider</span>
              </Button>
            )}
          </>
        )}

        <Button variant="outline" onClick={() => navigate('/orders')}>
          Back to Orders
        </Button>
      </div>

      <style>{`
        .details-page {
          max-width: 1100px;
        }

        .details-header {
          margin-bottom: 16px;
        }

        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 7px 14px;
          font-size: 0.85rem;
          font-weight: 600;
          color: ${BLACK};
          cursor: pointer;
          margin-bottom: 12px;
          transition: background 0.15s;
        }
        .back-btn:hover { background: ${GREY_LIGHT}; }

        .header-title-row {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .header-title {
          font-size: 1.4rem;
          font-weight: 800;
          color: ${BLACK};
          margin: 0;
        }
        .status-badge {
          font-size: 0.72rem;
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 20px;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }

        .summary-strip {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin: 14px 0 20px 0;
        }
        .summary-item {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 20px;
          padding: 6px 14px;
          font-size: 0.82rem;
          color: #374151;
          font-weight: 500;
        }
        .phone-pill {
          border-color: ${GREEN_LIGHT};
          background: ${GREEN_LIGHT};
          color: ${GREEN};
          font-weight: 700;
        }

        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .info-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 18px;
        }

        .card-heading {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.95rem;
          font-weight: 700;
          color: ${BLACK};
          margin: 0 0 14px 0;
        }

        .info-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.85rem;
          padding-bottom: 8px;
          border-bottom: 1px dashed #f0f0f0;
        }
        .info-label {
          color: ${GREY};
        }
        .info-value {
          color: ${BLACK};
          font-weight: 500;
          text-align: right;
        }

        .totals-block {
          margin-top: 16px;
          padding-top: 14px;
          border-top: 1px solid #e5e7eb;
        }
        .totals-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
          color: #4b5563;
          padding: 4px 0;
        }
        .totals-final {
          margin-top: 6px;
          padding-top: 10px;
          border-top: 1px solid #e5e7eb;
          font-size: 1.1rem;
          font-weight: 800;
          color: ${BLACK};
        }

        .items-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
        }
        .items-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid #f1f5f9;
        }
        .items-row:last-child { border-bottom: none; }
        .items-name-qty {
          display: flex;
          align-items: baseline;
          gap: 6px;
        }
        .items-name {
          font-weight: 600;
          font-size: 0.88rem;
        }
        .items-qty {
          font-size: 0.78rem;
          color: ${GREY};
        }
        .items-price {
          font-weight: 700;
          font-size: 0.88rem;
          color: ${BLACK};
        }

        .actions-bar {
          margin-top: 20px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .btn-inline {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .assign-row {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }
        .rider-select {
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid #d1d5db;
          font-size: 0.85rem;
          background: #fff;
          color: ${BLACK};
        }

        @media (max-width: 760px) {
          .details-grid {
            grid-template-columns: 1fr;
          }
          .header-title {
            font-size: 1.2rem;
          }
          .actions-bar {
            flex-direction: column;
            align-items: stretch;
          }
          .actions-bar > * {
            width: 100%;
          }
          .assign-row {
            flex-direction: column;
            align-items: stretch;
          }
          .rider-select {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default OrderDetails;