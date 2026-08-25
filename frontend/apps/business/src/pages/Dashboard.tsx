import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { api } from '../api';
import { Card, Button, LoadingSpinner, ErrorState, EmptyState, SectionHeader } from '../components';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Bike,
  Zap,
  Wallet,
  MapPin,
  Clock,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
} from 'lucide-react';

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  distance_km: number | null;
  customer_phone: string | null;
  items: Array<{ product_name: string; quantity: number }>;
  created_at: string;
}

interface Rider {
  id: string;
  name: string;
  status: string;
  profile_picture_url?: string | null;
}

interface CreditTransaction {
  balance: number;
  amount: number;
  type: string;
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

const Dashboard: React.FC = () => {
  const { businessId, businessName, paymentModel } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [remainingCreditVolume, setRemainingCreditVolume] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const ordersData = await api.orders.listBusiness();
      setOrders(ordersData || []);

      const ridersData = await api.riders.listByBusiness(businessId);
      setRiders(ridersData || []);

      try {
        const biz = await api.businesses.get(businessId);
        setRemainingCreditVolume(biz.remaining_credit_volume ?? 0);
      } catch (creditErr) {
        console.error('Failed to fetch credit:', creditErr);
        setRemainingCreditVolume(0);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [businessId]);

  const waitingOrders = orders.filter((o) => o.status === 'waiting_acceptance');
  const acceptedOrders = orders.filter((o) => o.status === 'accepted' || o.status === 'preparing');
  const activeRiders = riders.filter((r) => r.status === 'active' || r.status === 'busy');

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const past = new Date(dateString);
    const diff = Math.floor((now.getTime() - past.getTime()) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff} min ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)} hr ago`;
    return `${Math.floor(diff / 1440)} days ago`;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchDashboardData} />;
  }

  const lowCredit = remainingCreditVolume !== null && remainingCreditVolume < 500;
  const greeting = new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening';

  return (
    <div className="dash-page">
      {/* Welcome */}
      <div className="welcome-block">
        <h1 className="welcome-title">
          Good {greeting}, {businessName || 'Merchant'}
        </h1>
        <p className="welcome-sub">Manage orders, riders, products, and payments</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: GREY_LIGHT }}>
            <Package size={18} color={BLACK} />
          </div>
          <div>
            <p className="stat-label">Total Orders</p>
            <p className="stat-value">{orders.length}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: RED_LIGHT }}>
            <AlertTriangle size={18} color={RED} />
          </div>
          <div>
            <p className="stat-label">Waiting</p>
            <p className="stat-value" style={{ color: waitingOrders.length > 0 ? RED : BLACK }}>{waitingOrders.length}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: ORANGE_LIGHT }}>
            <Zap size={18} color={ORANGE} />
          </div>
          <div>
            <p className="stat-label">Active</p>
            <p className="stat-value" style={{ color: ORANGE }}>{acceptedOrders.length}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: GREEN_LIGHT }}>
            <Bike size={18} color={GREEN} />
          </div>
          <div>
            <p className="stat-label">Riders</p>
            <p className="stat-value">{riders.length}</p>
          </div>
        </div>

        {paymentModel === 'credit' && (
          <div className="stat-card">
            <div className="stat-icon" style={{ background: lowCredit ? RED_LIGHT : GREEN_LIGHT }}>
              <Wallet size={18} color={lowCredit ? RED : GREEN} />
            </div>
            <div>
              <p className="stat-label">Remaining Order Capacity</p>
              <p className="stat-value" style={{ color: lowCredit ? RED : GREEN }}>
                KES {remainingCreditVolume?.toFixed(0) || '0'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Credit warning */}
      {paymentModel === 'credit' && lowCredit && (
        <div className="warning-banner">
          <AlertTriangle size={20} color={RED} />
          <div className="warning-text">
            <p className="warning-title">Low Credit</p>
            <p className="warning-sub">
              You have KES {remainingCreditVolume?.toFixed(0)} remaining. Top up to continue accepting orders.
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={() => navigate('/settlements')}>
            Top Up
          </Button>
        </div>
      )}

      {/* New orders */}
      <SectionHeader
        title="New Orders"
        subtitle="Latest orders waiting for action"
        action={
          <Button variant="outline" size="sm" onClick={() => navigate('/orders')}>
            <span className="btn-inline">View All <ArrowRight size={14} /></span>
          </Button>
        }
      />

      {waitingOrders.length === 0 ? (
        <EmptyState
          title="No new orders"
          description="Orders waiting for acceptance will appear here"
        />
      ) : (
        <div className="orders-grid">
          {waitingOrders.slice(0, 4).map((order) => (
            <div key={order.id} className="order-mini-card">
              <div className="order-mini-top">
                <div>
                  <p className="order-mini-number">{order.order_number}</p>
                  <p className="order-mini-meta">
                    <Package size={12} /> {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                    <span className="dot">•</span>
                    <Clock size={12} /> {formatTimeAgo(order.created_at)}
                  </p>
                </div>
                <span className="waiting-badge">Waiting</span>
              </div>

              <div className="order-mini-bottom">
                <div>
                  {order.distance_km !== null && (
                    <p className="order-mini-distance">
                      <MapPin size={13} color={GREEN} /> {order.distance_km.toFixed(1)} km
                    </p>
                  )}
                  <p className="order-mini-amount">KES {order.total_amount.toFixed(0)}</p>
                </div>
                <Button variant="primary" size="sm" onClick={() => navigate('/orders')}>
                  Accept
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active riders */}
      <SectionHeader
        title="Active Riders"
        subtitle={`${activeRiders.length} riders currently online`}
        action={
          <Button variant="outline" size="sm" onClick={() => navigate('/riders')}>
            Manage
          </Button>
        }
        style={{ marginTop: 32 }}
      />

      {activeRiders.length === 0 ? (
        <EmptyState
          title="No active riders"
          description="Add riders to start assigning deliveries"
          action={
            <Button variant="primary" size="sm" onClick={() => navigate('/riders')}>
              Add Rider
            </Button>
          }
        />
      ) : (
        <div className="riders-grid">
          {activeRiders.slice(0, 4).map((rider) => (
            <div key={rider.id} className="rider-mini-card">
              {rider.profile_picture_url ? (
                <img
                  src={rider.profile_picture_url}
                  alt={rider.name}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <div className="rider-avatar">{rider.name.charAt(0).toUpperCase()}</div>
              )}
              <div>
                <p className="rider-name">{rider.name}</p>
                <p className="rider-status">
                  <span className="status-dot" /> {rider.status}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .dash-page { max-width: 100%; }

        .welcome-block { margin-bottom: 28px; }
        .welcome-title {
          font-size: 1.6rem;
          font-weight: 800;
          color: ${BLACK};
          margin: 0;
        }
        .welcome-sub {
          color: ${GREY};
          font-size: 0.9rem;
          margin-top: 4px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
          gap: 12px;
          margin-bottom: 20px;
        }
        .stat-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .stat-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .stat-label {
          font-size: 0.75rem;
          color: ${GREY};
          font-weight: 500;
          margin: 0;
        }
        .stat-value {
          font-size: 1.35rem;
          font-weight: 800;
          color: ${BLACK};
          margin: 2px 0 0 0;
        }

        .warning-banner {
          display: flex;
          align-items: center;
          gap: 14px;
          background: ${RED_LIGHT};
          border: 1px solid #fecaca;
          border-radius: 14px;
          padding: 14px 18px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .warning-text { flex: 1; min-width: 180px; }
        .warning-title {
          font-weight: 700;
          color: ${BLACK};
          margin: 0;
          font-size: 0.9rem;
        }
        .warning-sub {
          font-size: 0.8rem;
          color: #7f1d1d;
          margin-top: 2px;
        }

        .btn-inline {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .orders-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 14px;
        }

        .order-mini-card {
          background: ${RED_LIGHT};
          border-radius: 14px;
          padding: 14px 16px;
        }
        .order-mini-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
        }
        .order-mini-number {
          font-weight: 800;
          color: ${BLACK};
          margin: 0;
          font-size: 0.92rem;
        }
        .order-mini-meta {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 0.75rem;
          color: #7f1d1d;
          margin: 4px 0 0 0;
        }
        .dot { margin: 0 2px; }
        .waiting-badge {
          background: ${RED};
          color: #ffffff;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 20px;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .order-mini-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 12px;
        }
        .order-mini-distance {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.78rem;
          color: ${GREEN};
          font-weight: 600;
          margin: 0;
        }
        .order-mini-amount {
          font-size: 1.05rem;
          font-weight: 800;
          color: ${BLACK};
          margin: 2px 0 0 0;
        }

        .riders-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 12px;
        }
        .rider-mini-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .rider-avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: ${GREEN_LIGHT};
          color: ${GREEN};
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.9rem;
          flex-shrink: 0;
        }
        .rider-name {
          font-weight: 700;
          color: ${BLACK};
          margin: 0;
          font-size: 0.88rem;
        }
        .rider-status {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 0.75rem;
          color: ${GREEN};
          font-weight: 600;
          margin: 2px 0 0 0;
          text-transform: capitalize;
        }
        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: ${GREEN};
          display: inline-block;
        }

        @media (max-width: 640px) {
          .welcome-title { font-size: 1.3rem; }
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .orders-grid, .riders-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;