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
  Copy,
  Check,
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
  username?: string | null;
  profile_picture_url?: string | null;
}

const RED = '#dc2626';
const RED_LIGHT = '#fee2e2';
const ORANGE = '#ea580c';
const ORANGE_LIGHT = '#ffedd5';
const GREEN = '#16a34a';
const GREEN_LIGHT = '#dcfce7';
const GREY = '#6b7280';
const GREY_LIGHT = '#f3f4f6';

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
  { key: 'all', label: 'All' },
  { key: 'waiting', label: 'Waiting Acceptance' },
  { key: 'progress', label: 'In Progress' },
  { key: 'done', label: 'Completed' },
  { key: 'dead', label: 'Cancelled' },
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
  const [businessLocation, setBusinessLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  // Default to 'all' so every order stays visible as it moves through stages.
  // Filters narrow the view; they never hide orders by default.
  const [activeFilter, setActiveFilter] = useState<'waiting' | 'progress' | 'done' | 'dead' | 'all'>('all');

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
      const resp = await authenticatedFetch(`${Config.API_BASE}/businesses/${businessId}/riders?active_only=true`, undefined, 'hakika_business');
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

  const handleAccept = async (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
    setActionLoading(orderId);
    setError('');
    setSuccess('');
    try {
      await api.orders.accept(orderId);
      setSuccess('Order accepted!');
      await fetchOrders();
    } catch (err: any) {
      const msg = err.message || '';
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

  const handleAssign = async (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCopyPhone = async (e: React.MouseEvent, phone: string) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(phone);
      setCopiedPhone(phone);
      setTimeout(() => setCopiedPhone(null), 1500);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = phone;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); setCopiedPhone(phone); setTimeout(() => setCopiedPhone(null), 1500); } catch {}
      document.body.removeChild(ta);
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

  const acceptedOrders = useMemo(
    () => orders.filter(o => ['accepted', 'preparing', 'ready_for_delivery', 'out_for_delivery', 'arrived', 'payment_pending', 'paid'].includes(o.status)),
    [orders]
  );

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

    const itemsText = order.items.map(i => `${i.product_name} \u00d7${i.quantity}`).join(', ');
    const phoneVisible = showPhone(order.status) && order.customer_phone;
    const copied = phoneVisible && copiedPhone === order.customer_phone;

    return (
      <div
        key={order.id}
        className="order-card"
        onClick={() => navigate(`/orders/${order.id}`)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/orders/${order.id}`); }}
      >
        {/* Row 1: order number · stage badge · amount */}
        <div className="order-row1">
          <span className="order-number">{order.order_number}</span>
          <span
            className="order-status-badge"
            style={{ background: style.bg, color: style.text }}
          >
            {style.label}
          </span>
          <span className="order-amount">KES {order.total_amount.toFixed(0)}</span>
        </div>

        {/* Row 2: distance (prominent) · phone (copyable) · time */}
        <div className="order-row2">
          {order.distance_km !== null && (
            <span className="distance-chip" title="Distance from your business">
              <MapPin size={14} color={GREEN} />
              <span>{order.distance_km.toFixed(1)} km</span>
            </span>
          )}
          {phoneVisible && (
            <button
              type="button"
              className={`phone-chip ${copied ? 'phone-chip--copied' : ''}`}
              onClick={(e) => handleCopyPhone(e, order.customer_phone!)}
              title="Click to copy"
            >
              <Phone size={13} />
              <span>{order.customer_phone}</span>
              {copied ? <Check size={13} /> : <Copy size={12} />}
            </button>
          )}
          <span className="meta-item">
            <Clock size={12} /> {formatTimeAgo(order.created_at)}
          </span>
        </div>

        {/* Row 3: product summary */}
        <div className="order-row3" title={itemsText}>
          {order.items[0]?.thumbnail_url && (
            <img
              src={order.items[0].thumbnail_url}
              alt={order.items[0].product_name}
              className="order-thumb"
            />
          )}
          <Package size={12} />
          <span className="order-items-text">{itemsText}</span>
        </div>

        {/* Row 4: actions (only when needed) */}
        {(isWaiting || (isActive && canAssign(order.status)) || assigningOrder === order.id) && (
          <div className="order-row4" onClick={(e) => e.stopPropagation()}>
            {isWaiting && (
              <Button
                variant="primary"
                size="sm"
                onClick={(e) => handleAccept(e, order.id)}
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
                onClick={(e) => { e.stopPropagation(); setAssigningOrder(order.id); }}
                disabled={isAwaitingPayment(order)}
              >
                <span className="btn-inline"><Bike size={13} /> Assign Rider</span>
              </Button>
            )}

            {assigningOrder === order.id && (
              <div className="assign-row">
                <select
                  value={selectedRider}
                  onChange={e => setSelectedRider(e.target.value)}
                  className="rider-select"
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="">Select rider</option>
                  {riders.map(r => (
                    <option key={r.id} value={r.id}>{r.username ? `@${r.username}` : r.name}</option>
                  ))}
                </select>
                <Button
                  variant="success"
                  size="sm"
                  onClick={(e) => handleAssign(e, order.id)}
                  isLoading={actionLoading === order.id}
                  disabled={!selectedRider || actionLoading === order.id}
                >
                  Assign
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); setAssigningOrder(null); setSelectedRider(''); }}
                >
                  <XIcon size={13} />
                </Button>
              </div>
            )}
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
        <div className="order-list">
          {filteredOrders.map(renderOrderCard)}
        </div>
      )}

      <style>{`
        .orders-page { max-width: 100%; }

        .alert {
          display: flex; align-items: center; gap: 8px;
          padding: 12px 16px; border-radius: 10px;
          margin-bottom: 16px; font-size: 0.875rem; font-weight: 500;
        }
        .alert-success { background: ${GREEN_LIGHT}; color: ${GREEN}; }
        .alert-error { background: ${RED_LIGHT}; color: ${RED}; }

        .search-bar {
          display: flex; align-items: center; gap: 8px;
          background: #ffffff; border: 1px solid #e5e7eb;
          border-radius: 10px; padding: 10px 14px; margin-bottom: 14px;
        }
        .search-input {
          border: none; outline: none; flex: 1;
          font-size: 0.9rem; color: #111111;
        }
        .search-clear {
          border: none; background: transparent; cursor: pointer;
          color: ${GREY}; display: flex; align-items: center;
        }

        .filter-row {
          display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px;
        }
        .filter-btn {
          display: inline-flex; align-items: center; gap: 6px;
          border: none; padding: 8px 14px; border-radius: 20px;
          font-size: 0.8rem; font-weight: 600; cursor: pointer;
          transition: transform 0.1s, filter 0.15s; white-space: nowrap;
        }
        .filter-btn:hover { filter: brightness(0.97); }
        .filter-btn:active { transform: scale(0.97); }
        .filter-count {
          font-size: 0.7rem; font-weight: 700;
          padding: 1px 6px; border-radius: 10px;
        }

        /* Single-column list — cards stack cleanly and stay visible */
        .order-list {
          display: flex; flex-direction: column; gap: 10px;
        }

        .order-card {
          background: #ffffff;
          border-radius: 12px;
          padding: 12px 14px;
          border: 1px solid rgba(0,0,0,0.06);
          cursor: pointer;
          transition: border-color 0.15s, box-shadow 0.15s, transform 0.1s;
          display: flex; flex-direction: column; gap: 6px;
        }
        .order-card:hover {
          border-color: rgba(22,163,74,0.35);
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        .order-card:active { transform: scale(0.995); }
        .order-card:focus { outline: 2px solid rgba(22,163,74,0.4); outline-offset: 2px; }

        /* Row 1 — order number · stage · amount */
        .order-row1 {
          display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
        }
        .order-number {
          font-weight: 800; font-size: 0.88rem; color: #111111;
        }
        .order-status-badge {
          font-size: 0.7rem; font-weight: 700;
          padding: 3px 8px; border-radius: 10px;
          text-transform: uppercase; letter-spacing: 0.02em;
          white-space: nowrap;
        }
        .order-amount {
          margin-left: auto; font-weight: 800; font-size: 0.92rem; color: #111111;
        }

        /* Row 2 — distance (prominent) · phone · time */
        .order-row2 {
          display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
        }
        .distance-chip {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 0.82rem; font-weight: 800; color: ${GREEN};
          background: ${GREEN_LIGHT};
          padding: 3px 9px; border-radius: 12px;
        }
        .phone-chip {
          display: inline-flex; align-items: center; gap: 5px;
          background: #f9fafb; border: 1px solid #e5e7eb;
          border-radius: 12px; padding: 3px 9px;
          font-size: 0.78rem; font-weight: 600; color: #374151;
          cursor: pointer; font-family: inherit;
          transition: background 0.15s, border-color 0.15s;
        }
        .phone-chip:hover { background: #f3f4f6; border-color: #d1d5db; }
        .phone-chip--copied {
          background: ${GREEN_LIGHT}; border-color: ${GREEN}; color: ${GREEN};
        }
        .meta-item {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 0.72rem; color: #6b7280; font-weight: 500;
        }

        /* Row 3 — products */
        .order-row3 {
          display: flex; align-items: center; gap: 6px;
          font-size: 0.78rem; color: ${ORANGE}; font-weight: 600;
          min-width: 0;
        }
        .order-thumb {
          width: 20px; height: 20px; object-fit: cover; border-radius: 4px;
          flex-shrink: 0;
        }
        .order-items-text {
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          min-width: 0;
        }

        /* Row 4 — actions */
        .order-row4 {
          display: flex; gap: 6px; margin-top: 2px;
        }
        .assign-row {
          display: flex; gap: 6px; align-items: center; width: 100%;
        }
        .rider-select {
          flex: 1; padding: 6px 8px; border-radius: 8px;
          border: 1px solid #d1d5db; font-size: 0.78rem;
          background: #fff; color: #111111;
        }
        .btn-inline { display: inline-flex; align-items: center; gap: 4px; }

        /* ── Mobile: compact cards (~50% shorter than before) ── */
        @media (max-width: 640px) {
          .order-card {
            padding: 8px 10px;
            gap: 4px;
            border-radius: 10px;
          }
          .order-row1 { gap: 6px; }
          .order-number { font-size: 0.82rem; }
          .order-status-badge {
            font-size: 0.62rem; padding: 2px 6px;
          }
          .order-amount { font-size: 0.84rem; }
          .order-row2 { gap: 8px; }
          .distance-chip {
            font-size: 0.76rem; padding: 2px 7px;
          }
          .phone-chip {
            font-size: 0.72rem; padding: 2px 7px;
          }
          .meta-item { font-size: 0.66rem; }
          .order-row3 { font-size: 0.72rem; gap: 4px; }
          .order-thumb { width: 16px; height: 16px; }
          .order-row4 { gap: 4px; }
        }
      `}</style>
    </div>
  );
};

export default Orders;
