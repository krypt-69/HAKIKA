import { Config } from "@hakika/config";
import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../AuthContext';
import { authenticatedFetch } from '@hakika/auth';
import { api } from '../api';
import { Card, Button, LoadingSpinner, ErrorState, EmptyState, SectionHeader, Modal } from '../components';
import { Link, useNavigate } from 'react-router-dom';
import BusinessOrdersMap from '../components/BusinessOrdersMap';
import {
  MapPin,
  Phone,
  Clock,
  Package,
  CheckCircle2,
  Bike,
  ChevronRight,
  X as XIcon,
  AlertCircle,
  Search,
} from 'lucide-react';

interface OrderItem {
  id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  thumbnail_url: string | null;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  distance_km: number | null;
  customer_phone: string | null;
  items: OrderItem[];
  created_at: string;
  delivery_location?: { lat: number | string; lon: number | string } | null;
}

interface Rider {
  id: string;
  name: string;
  phone: string;
  status: string;
}

const RED = '#dc2626';
const RED_LIGHT = '#fee2e2';
const ORANGE = '#ea580c';
const ORANGE_LIGHT = '#ffedd5';
const GREEN = '#16a34a';
const GREEN_LIGHT = '#dcfce7';
const GREY = '#6b7280';
const GREY_LIGHT = '#f3f4f6';

// Every status maps to one of 4 buckets: waiting | progress | done | dead
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

const BUCKET_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  waiting: { bg: RED_LIGHT, text: RED, label: 'Waiting Acceptance' },
  progress: { bg: ORANGE_LIGHT, text: ORANGE, label: 'In Progress' },
  done: { bg: GREEN_LIGHT, text: GREEN, label: 'Completed' },
  dead: { bg: GREY_LIGHT, text: GREY, label: 'Cancelled' },
};

const FILTERS: { key: 'waiting' | 'progress' | 'done' | 'dead' | 'all'; label: string }[] = [
  { key: 'waiting', label: 'Waiting Acceptance' },
  { key: 'progress', label: 'In Progress' },
  { key: 'done', label: 'Completed' },
  { key: 'dead', label: 'Cancelled' },
  { key: 'all', label: 'All' },
];

const Orders: React.FC = () => {
  const { businessId } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assigningOrder, setAssigningOrder] = useState<string | null>(null);
  const [selectedRider, setSelectedRider] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [collectPaymentBeforeDelivery, setCollectPaymentBeforeDelivery] = useState(false);
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [creditModalMessage, setCreditModalMessage] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [businessLocation, setBusinessLocation] = useState<{lat:number;lon:number}|null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'waiting' | 'progress' | 'done' | 'dead' | 'all'>('waiting');

  const fetchOrders = async () => {
    if (!businessId) return;
    try {
      setLoading(true);
      const data = await api.orders.listBusiness();
      setOrders(data || []);
      setError('');
    } catch (e: any) {
      setError(e.message);
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
    if (businessId) {
      api.businesses.get(businessId).then(biz => {
        setCollectPaymentBeforeDelivery(biz.collect_payment_before_delivery || false);
        const loc = biz.locations?.[0];
        if (loc) setBusinessLocation({ lat: Number(loc.lat), lon: Number(loc.lon) });
      }).catch(() => {});
    }
    fetchOrders();
    fetchRiders();
  }, [businessId]);

  const handleAccept = async (orderId: string) => {
    setActionLoading(orderId);
    setError('');
    setSuccess('');
    try {
      await api.orders.accept(orderId);
      setSuccess('Order accepted!');
      await fetchOrders();
    } catch (e: any) {
      const msg = e.message || '';
      if (msg.toLowerCase().includes('credit') || msg.toLowerCase().includes('insufficient')) {
        setCreditModalMessage(msg);
        setCreditModalOpen(true);
      } else {
        setError(msg);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleAssign = async (orderId: string) => {
    if (!selectedRider) return;
    setActionLoading(orderId);
    setError('');
    setSuccess('');
    try {
      const resp = await authenticatedFetch(
        `${Config.API_BASE}/delivery/orders/${orderId}/assign?rider_id=${selectedRider}`,
        { method: 'PUT' },
        'hakika_business'
      );
      if (!resp.ok) throw new Error('Assignment failed');
      setSuccess('Rider assigned successfully!');
      setAssigningOrder(null);
      setSelectedRider('');
      await fetchOrders();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(null);
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

  const isAwaitingPayment = (order: Order) =>
    collectPaymentBeforeDelivery &&
    ['accepted', 'payment_pending'].includes(order.status);

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const past = new Date(dateString);
    const diff = Math.floor((now.getTime() - past.getTime()) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff} min ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)} hr ago`;
    return `${Math.floor(diff / 1440)} days ago`;
  };

  const canAssign = (status: string) =>
    ['accepted', 'preparing', 'ready_for_delivery'].includes(status);
  const showPhone = (status: string) =>
    ['accepted', 'preparing', 'ready_for_delivery', 'out_for_delivery', 'arrived', 'payment_pending', 'paid', 'completed'].includes(status);

  // Counts per bucket for filter badges
  const bucketCounts = useMemo(() => {
    const counts: Record<string, number> = { waiting: 0, progress: 0, done: 0, dead: 0, all: orders.length };
    orders.forEach(o => {
      const bucket = STATUS_BUCKET[o.status] || 'progress';
      counts[bucket] = (counts[bucket] || 0) + 1;
    });
    return counts;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let list = orders;
    if (activeFilter !== 'all') {
      list = list.filter(o => (STATUS_BUCKET[o.status] || 'progress') === activeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(o =>
        o.order_number.toLowerCase().includes(q) ||
        (o.customer_phone || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [orders, activeFilter, searchQuery]);

  const acceptedOrders = useMemo(() => orders.filter(o => ['accepted','preparing','ready_for_delivery','out_for_delivery','arrived','payment_pending','paid'].includes(o.status)), [orders]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchOrders} />;
  }

  const renderOrderCard = (order: Order) => {
    const isWaiting = order.status === 'waiting_acceptance';
    const isActive = !isWaiting && order.status !== 'completed' && order.status !== 'cancelled' && order.status !== 'delivery_failed';
    const bucket = STATUS_BUCKET[order.status] || 'progress';
    const style = isAwaitingPayment(order)
      ? { bg: ORANGE_LIGHT, text: ORANGE, label: 'Awaiting Payment' }
      : { ...BUCKET_STYLE[bucket], label: getStatusLabel(order.status) };

    const itemsText = order.items.map(i => `${i.product_name} ×${i.quantity}`).join(', ');

    return (
      <div key={order.id} className="order-card" style={{ background: style.bg }}>
        {/* Line 1 — order number, status, amount as one sentence */}
        <p className="order-line1">
          <span className="order-number">{order.order_number}</span>
          {' — '}
          <span className="order-status" style={{ color: style.text }}>{style.label}</span>
          {' — '}
          <span className="order-amount">KES {order.total_amount.toFixed(0)}</span>
        </p>

        {/* Line 2 — distance (green), items count, days ago */}
        <p className="order-line2">
          {order.distance_km !== null && (
            <span className="meta-item">
              <MapPin size={13} color={GREEN} /> <span style={{ color: GREEN }}>{order.distance_km.toFixed(1)} km</span>
            </span>
          )}
          <span className="meta-item">
            <Package size={13} /> {order.items.length} item{order.items.length !== 1 ? 's' : ''}
          </span>
          <span className="meta-item">
            <Clock size={13} /> {formatTimeAgo(order.created_at)}
          </span>
        </p>

        {/* Line 3 — what was ordered, orange */}
        <p className="order-line3" title={itemsText}>
          {order.items[0]?.thumbnail_url ? (
            <img
              src={order.items[0].thumbnail_url}
              alt={order.items[0].product_name}
              style={{
                width: 22,
                height: 22,
                objectFit: 'cover',
                borderRadius: 4,
                marginRight: 6,
                verticalAlign: 'middle',
                display: 'inline-block',
              }}
            />
          ) : null}
          {itemsText}
        </p>

        {/* Line 4 — customer phone + view details */}
        <div className="order-line4">
          {showPhone(order.status) && order.customer_phone ? (
            <span className="phone-text">
              <Phone size={13} /> {order.customer_phone}
            </span>
          ) : <span />}

          <div className="order-line4-actions">
            {isWaiting && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleAccept(order.id)}
                isLoading={actionLoading === order.id}
                disabled={actionLoading === order.id}
              >
                Accept
              </Button>
            )}

            {isActive && canAssign(order.status) && assigningOrder !== order.id && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setAssigningOrder(order.id)}
                disabled={isAwaitingPayment(order)}
              >
                <span className="btn-inline"><Bike size={14} /> Assign</span>
              </Button>
            )}

            <Button variant="outline" size="sm" onClick={() => navigate(`/orders/${order.id}`)}>
              <span className="btn-inline">View <ChevronRight size={13} /></span>
            </Button>
          </div>
        </div>

        {/* Inline rider-assign row when active */}
        {assigningOrder === order.id && (
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
              onClick={() => handleAssign(order.id)}
              isLoading={actionLoading === order.id}
              disabled={!selectedRider || actionLoading === order.id}
            >
              Assign
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setAssigningOrder(null); setSelectedRider(''); }}>
              <XIcon size={14} />
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="orders-page">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button
            onClick={() => setShowMap(!showMap)}
            style={{ padding: '8px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}
          >
            {showMap ? 'Hide Map' : 'Map'}
          </button>
        </div>
        {showMap && businessLocation && (
          <div style={{ height: '45vh', marginBottom: 16 }}>
            <BusinessOrdersMap
              businessLocation={businessLocation}
              acceptedOrders={acceptedOrders}
              radiusKm={30}
            />
          </div>
        )}

      <SectionHeader title="Orders" subtitle="Manage all your orders" />

      {success && (
        <div className="alert alert-success">
          <CheckCircle2 size={16} /> {success}
        </div>
      )}
      {error && (
        <div className="alert alert-error">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Search */}
      <div className="search-bar">
        <Search size={16} color={GREY} />
        <input
          className="search-input"
          type="text"
          placeholder="Search by order number or phone..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button className="search-clear" onClick={() => setSearchQuery('')}>
            <XIcon size={14} />
          </button>
        )}
      </div>

      {/* Filter buttons — Waiting Acceptance first */}
      <div className="filter-row">
        {FILTERS.map(f => {
          const isActiveTab = activeFilter === f.key;
          const tabStyle = f.key === 'all' ? { text: '#111111', bg: GREY_LIGHT } :
            { text: BUCKET_STYLE[f.key].text, bg: BUCKET_STYLE[f.key].bg };
          return (
            <button
              key={f.key}
              className="filter-btn"
              onClick={() => setActiveFilter(f.key)}
              style={{
                background: isActiveTab ? tabStyle.text : tabStyle.bg,
                color: isActiveTab ? '#ffffff' : tabStyle.text,
              }}
            >
              {f.label}
              <span className="filter-count" style={{
                background: isActiveTab ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.08)',
                color: isActiveTab ? '#ffffff' : tabStyle.text,
              }}>
                {bucketCounts[f.key] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      <Modal
        isOpen={creditModalOpen}
        onClose={() => setCreditModalOpen(false)}
        title="Insufficient Credit"
        size="sm"
      >
        <p style={{ marginBottom: '16px', color: '#333' }}>{creditModalMessage}</p>
        <p style={{ marginBottom: '20px', fontSize: '0.9rem', color: '#666' }}>
          Purchase additional credit to accept more orders.
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <Button variant="outline" size="sm" onClick={() => setCreditModalOpen(false)}>
            Close
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate('/settlements')}>
            Buy Credit
          </Button>
        </div>
      </Modal>

      {orders.length === 0 ? (
        <EmptyState
          title="No orders yet"
          description="When customers place orders, they will appear here"
        />
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          title="No matching orders"
          description="Try a different search term or filter"
        />
      ) : (
        <div className="order-grid">
          {filteredOrders.map(renderOrderCard)}
        </div>
      )}

      <style>{`
        .orders-page {
          max-width: 100%;
        }

        .alert {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          border-radius: 10px;
          margin-bottom: 16px;
          font-size: 0.875rem;
          font-weight: 500;
        }
        .alert-success { background: ${GREEN_LIGHT}; color: ${GREEN}; }
        .alert-error { background: ${RED_LIGHT}; color: ${RED}; }

        .search-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 10px 14px;
          margin-bottom: 14px;
        }
        .search-input {
          border: none;
          outline: none;
          flex: 1;
          font-size: 0.9rem;
          color: #111111;
        }
        .search-clear {
          border: none;
          background: transparent;
          cursor: pointer;
          color: ${GREY};
          display: flex;
          align-items: center;
        }

        .filter-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 20px;
        }
        .filter-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: none;
          padding: 8px 14px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.1s, filter 0.15s;
          white-space: nowrap;
        }
        .filter-btn:hover { filter: brightness(0.97); }
        .filter-btn:active { transform: scale(0.97); }
        .filter-count {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 10px;
        }

        .order-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
          gap: 14px;
        }

        .order-card {
          border-radius: 14px;
          padding: 14px 16px;
          aspect-ratio: 2 / 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
          border: 1px solid rgba(0,0,0,0.05);
        }

        .order-line1 {
          font-size: 0.9rem;
          color: #111111;
          margin: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .order-number {
          font-weight: 800;
        }
        .order-status {
          font-weight: 700;
        }
        .order-amount {
          font-weight: 800;
        }

        .order-line2 {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin: 6px 0 0 0;
        }
        .meta-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.75rem;
          color: #4b5563;
          font-weight: 500;
        }

        .order-line3 {
          margin: 6px 0 0 0;
          font-size: 0.8rem;
          font-weight: 600;
          color: ${ORANGE};
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .order-line4 {
          margin-top: 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .phone-text {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.78rem;
          color: #374151;
          font-weight: 600;
          white-space: nowrap;
        }
        .order-line4-actions {
          display: flex;
          gap: 6px;
          flex-shrink: 0;
        }
        .btn-inline {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .assign-row {
          margin-top: 8px;
          display: flex;
          gap: 6px;
          align-items: center;
        }
        .rider-select {
          flex: 1;
          padding: 6px 8px;
          border-radius: 8px;
          border: 1px solid #d1d5db;
          font-size: 0.78rem;
          background: #fff;
          color: #111111;
        }

        @media (max-width: 640px) {
          .order-grid {
            grid-template-columns: 1fr;
          }
          .order-card {
            aspect-ratio: unset;
            min-height: 150px;
          }
          .order-line1 {
            white-space: normal;
          }
          .order-line4 {
            flex-direction: column;
            align-items: flex-start;
          }
          .order-line4-actions {
            width: 100%;
          }
          .order-line4-actions > * {
            flex: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default Orders;