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
  Sparkles,
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

/* ---------------------------------------------------------------
   Palette — warm paper background with complementary, muted accents.
   Nothing is pure white/black; everything sits on the same warm
   undertone as PAPER so the page reads as one cohesive material.
------------------------------------------------------------------*/
const PAPER = '#F6F2E9';        // page background — warm parchment
const CARD = '#FFFFFF';         // card surface
const INK = '#26211B';          // warm near-black for text
const INK_SOFT = '#7A7266';     // muted warm grey for secondary text
const BORDER = '#E7DFCE';       // warm hairline border

const RUST = '#B4502F';         // waiting / urgent — terracotta
const RUST_LIGHT = '#F3DDD0';

const AMBER = '#B4791D';        // active — muted mustard
const AMBER_LIGHT = '#F2E3C2';

const FOREST = '#3C6B4C';       // riders / positive — deep forest
const FOREST_LIGHT = '#DEE8DD';

const TEAL = '#2E5F5E';         // total orders — deep teal
const TEAL_LIGHT = '#DCE8E6';

const PLUM = '#6B3F52';         // credit / capacity — dusty plum
const PLUM_LIGHT = '#E9DEE2';

const formatNumber = (n: number) =>
  n.toLocaleString('en-KE', { maximumFractionDigits: 0 });

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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px', background: PAPER }}>
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
        {paymentModel === 'credit' && (
          <div className="stat-card stat-card--capacity">
            <div className="stat-icon" style={{ background: lowCredit ? RUST_LIGHT : PLUM_LIGHT }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2.5" y="6" width="19" height="13" rx="2.5" stroke={lowCredit ? RUST : PLUM} strokeWidth="1.8" />
                <path d="M2.5 10.5H21.5" stroke={lowCredit ? RUST : PLUM} strokeWidth="1.8" />
                <circle cx="17" cy="15" r="1.5" fill={lowCredit ? RUST : PLUM} />
              </svg>
            </div>
            <div>
              <p className="stat-label">Remaining Capacity</p>
              <p className="stat-value" style={{ color: lowCredit ? RUST : PLUM }}>
                KES {formatNumber(remainingCreditVolume || 0)}
              </p>
            </div>
          </div>
        )}

        <div className="stat-card">
          <div className="stat-icon" style={{ background: TEAL_LIGHT }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3.5 8.2L12 3.5L20.5 8.2V16.8L12 21.5L3.5 16.8V8.2Z" stroke={TEAL} strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M3.7 8.4L12 13L20.3 8.4" stroke={TEAL} strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M12 13V21.3" stroke={TEAL} strokeWidth="1.8" />
            </svg>
          </div>
          <div>
            <p className="stat-label">Total Orders</p>
            <p className="stat-value">{formatNumber(orders.length)}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: RUST_LIGHT }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2.5L22.5 21H1.5L12 2.5Z" stroke={RUST} strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M12 9.5V14" stroke={RUST} strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="12" cy="17.3" r="1.05" fill={RUST} />
            </svg>
          </div>
          <div>
            <p className="stat-label">Waiting</p>
            <p className="stat-value" style={{ color: waitingOrders.length > 0 ? RUST : INK }}>
              {formatNumber(waitingOrders.length)}
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: AMBER_LIGHT }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 2.5L4 14H11.2L10.5 21.5L20 10H12.6L13 2.5Z" stroke={AMBER} strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <p className="stat-label">Active</p>
            <p className="stat-value" style={{ color: AMBER }}>{formatNumber(acceptedOrders.length)}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: FOREST_LIGHT }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="6" cy="18" r="3" stroke={FOREST} strokeWidth="1.8" />
              <circle cx="18" cy="18" r="3" stroke={FOREST} strokeWidth="1.8" />
              <path d="M6 18L10 9.5H14.5L18 18" stroke={FOREST} strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M9.2 9.5H14.5L13 6.5H10.5" stroke={FOREST} strokeWidth="1.8" strokeLinejoin="round" />
              <circle cx="13" cy="4.8" r="1.5" stroke={FOREST} strokeWidth="1.6" />
            </svg>
          </div>
          <div>
            <p className="stat-label">Riders</p>
            <p className="stat-value">{formatNumber(riders.length)}</p>
          </div>
        </div>
      </div>

      {/* Credit warning */}
      {paymentModel === 'credit' && lowCredit && (
        <div className="warning-banner">
          <AlertTriangle size={20} color={RUST} />
          <div className="warning-text">
            <p className="warning-title">Low Credit</p>
            <p className="warning-sub">
              You have KES {formatNumber(remainingCreditVolume || 0)} remaining. Top up to continue accepting orders.
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
                      <MapPin size={13} color={FOREST} /> {order.distance_km.toFixed(1)} km
                    </p>
                  )}
                  <p className="order-mini-amount">KES {formatNumber(order.total_amount)}</p>
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
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: `2px solid ${BORDER}`,
                  }}
                />
              ) : (
                <div className="rider-avatar">{(rider.name || 'R').charAt(0).toUpperCase()}</div>
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
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400..800&family=Inter:wght@400;500;600;700&display=swap');

        .dash-page {
          max-width: 100%;
          background: ${PAPER};
          padding: 20px 20px 48px;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .dash-page h1,
        .dash-page h2,
        .dash-page h3 {
          font-family: 'Fraunces', serif;
        }

        .welcome-block { margin-bottom: 24px; }
        .welcome-title {
          font-size: 1.9rem;
          font-weight: 700;
          color: ${INK};
          margin: 0;
          letter-spacing: -0.01em;
        }
        .welcome-sub {
          color: ${INK_SOFT};
          font-size: 0.92rem;
          margin-top: 6px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
          gap: 14px;
          margin-bottom: 22px;
        }
        .stat-card {
          background: ${CARD};
          border: 1px solid ${BORDER};
          border-radius: 16px;
          padding: 18px;
          display: flex;
          align-items: center;
          gap: 14px;
          box-shadow: 0 1px 2px rgba(38, 33, 27, 0.04);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .stat-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(38, 33, 27, 0.07);
        }
        .stat-card--capacity {
          border-color: ${PLUM_LIGHT};
        }
        .stat-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .stat-label {
          font-size: 0.76rem;
          color: ${INK_SOFT};
          font-weight: 600;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .stat-value {
          font-family: 'Fraunces', serif;
          font-size: 1.55rem;
          font-weight: 700;
          color: ${INK};
          margin: 3px 0 0 0;
        }

        .warning-banner {
          display: flex;
          align-items: center;
          gap: 14px;
          background: ${RUST_LIGHT};
          border: 1px solid ${RUST}33;
          border-radius: 16px;
          padding: 16px 20px;
          margin-bottom: 26px;
          flex-wrap: wrap;
        }
        .warning-text { flex: 1; min-width: 180px; }
        .warning-title {
          font-weight: 700;
          color: ${INK};
          margin: 0;
          font-size: 0.92rem;
        }
        .warning-sub {
          font-size: 0.82rem;
          color: #7A2E1B;
          margin-top: 3px;
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
          background: ${RUST_LIGHT};
          border: 1px solid ${RUST}26;
          border-radius: 16px;
          padding: 16px 18px;
        }
        .order-mini-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
        }
        .order-mini-number {
          font-family: 'Fraunces', serif;
          font-weight: 700;
          color: ${INK};
          margin: 0;
          font-size: 0.98rem;
        }
        .order-mini-meta {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 0.76rem;
          color: #7A2E1B;
          margin: 5px 0 0 0;
        }
        .dot { margin: 0 2px; }
        .waiting-badge {
          background: ${RUST};
          color: #FFFFFF;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 4px 11px;
          border-radius: 20px;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          white-space: nowrap;
        }
        .order-mini-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 14px;
        }
        .order-mini-distance {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.8rem;
          color: ${FOREST};
          font-weight: 600;
          margin: 0;
        }
        .order-mini-amount {
          font-family: 'Fraunces', serif;
          font-size: 1.12rem;
          font-weight: 700;
          color: ${INK};
          margin: 3px 0 0 0;
        }

        .riders-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 12px;
        }
        .rider-mini-card {
          background: ${CARD};
          border: 1px solid ${BORDER};
          border-radius: 16px;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .rider-avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: ${FOREST_LIGHT};
          color: ${FOREST};
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Fraunces', serif;
          font-weight: 700;
          font-size: 0.95rem;
          flex-shrink: 0;
        }
        .rider-name {
          font-weight: 600;
          color: ${INK};
          margin: 0;
          font-size: 0.9rem;
        }
        .rider-status {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 0.76rem;
          color: ${FOREST};
          font-weight: 600;
          margin: 2px 0 0 0;
          text-transform: capitalize;
        }
        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: ${FOREST};
          display: inline-block;
        }

        @media (max-width: 640px) {
          .dash-page { padding: 16px 14px 40px; }
          .welcome-title { font-size: 1.5rem; }
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .stat-card--capacity { grid-column: 1 / -1; order: -1; }
          .orders-grid, .riders-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;