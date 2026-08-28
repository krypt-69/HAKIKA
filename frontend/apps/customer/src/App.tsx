import { Config } from "@hakika/config";
import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate, useParams } from 'react-router-dom';
import Home from './pages/Home';
import { api } from './api';
import { CustomerFeedProvider } from './CustomerFeedContext';
import { OrdersProvider } from './OrdersContext';
import BusinessProfile from './pages/BusinessProfile';
import OrderPage from './pages/OrderPage';
import OrderTracking from './pages/OrderTracking';
import MyOrders from './pages/MyOrders';
import Notifications from './pages/Notifications';
import Receipt from './pages/Receipt';

const HomeIcon: React.FC = () => (
    React.createElement('svg', {
        width: 18, height: 18,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2.5,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
    },
        React.createElement('path', { d: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' }),
        React.createElement('polyline', { points: '9 22 9 12 15 12 15 22' })
    )
);

const OrdersIcon: React.FC = () => (
    React.createElement('svg', {
        width: 18, height: 18,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2.5,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
    },
        React.createElement('path', { d: 'M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z' }),
        React.createElement('path', { d: 'M3 6h18' }),
        React.createElement('path', { d: 'M16 10a4 4 0 0 1-8 0' })
    )
);

const BellIcon: React.FC = () => (
    React.createElement('svg', {
        width: 18, height: 18,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2.5,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
    },
        React.createElement('path', { d: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9' }),
        React.createElement('path', { d: 'M13.73 21a2 2 0 0 1-3.46 0' })
    )
);

/* ── Notification bell with dynamic badge ────────────── */
/* Count always comes from the API — never hardcoded. Badge simply
   doesn't render when there's nothing unread. */
const NotificationBell: React.FC = () => {
    const [count, setCount] = React.useState<number | null>(null);

    const refreshCount = React.useCallback(async () => {
        const phone = sessionStorage.getItem('hakika_customer_phone');
        if (!phone) { setCount(0); return; }
        try {
            const data = await api.getUnreadNotificationCount(phone);
            setCount(data.count || 0);
        } catch {
            setCount(0);
        }
    }, []);

    React.useEffect(() => {
        refreshCount();
        const onFocus = () => refreshCount();
        const onReconnect = () => refreshCount();
        const onUnreadUpdated = (e: Event) => {
          const custom = e as CustomEvent<{ count?: number }>;
          if (custom.detail?.count !== undefined) {
            setCount(custom.detail.count);
          } else {
            refreshCount();
          }
        };
        window.addEventListener('focus', onFocus);
        window.addEventListener('online', onReconnect);
        window.addEventListener('hakika:unread-updated', onUnreadUpdated);

        // Conservative reconciliation interval
        const interval = setInterval(refreshCount, 30000);

        return () => {
            window.removeEventListener('focus', onFocus);
            window.removeEventListener('online', onReconnect);
            window.removeEventListener('hakika:unread-updated', onUnreadUpdated);
            clearInterval(interval);
        };
    }, [refreshCount]);

    return (
        <span style={{ position: 'relative', display: 'inline-flex' }}>
            <BellIcon />
            {!!count && count > 0 && (
                <span style={{
                    position: 'absolute',
                    top: -4,
                    right: -7,
                    background: '#16a34a',
                    color: '#fff',
                    borderRadius: '50%',
                    minWidth: 14,
                    height: 14,
                    padding: '0 3px',
                    fontSize: 8.5,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #fff',
                    lineHeight: 1,
                }}>
                    {count > 99 ? '99+' : count}
                </span>
            )}
        </span>
    );
};

/* ── Single nav item: pill highlight + dot + underline when active ──
   Icons are always green; the active state adds a soft pill
   background, a dot, and an underline. */
const NavItem: React.FC<{ to: string; icon: React.ReactNode; label: string; active: boolean }> = ({ to, icon, label, active }) => (
    <Link
        to={to}
        className="hk-nav-item"
        style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            textDecoration: 'none',
            padding: '4px 2px 3px',
            fontFamily: 'inherit',
        }}
    >
        <div style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            padding: active ? '4px 12px' : '4px 5px',
            borderRadius: 12,
            background: active ? '#ECFDF5' : 'transparent',
            color: '#16a34a',
            transform: active ? 'scale(1.03)' : 'scale(1)',
            transition: 'background 0.18s ease, color 0.18s ease, transform 0.18s ease',
        }}>
            {active && (
                <span style={{
                    position: 'absolute', top: -2, left: '50%', transform: 'translateX(-50%)',
                    width: 3.5, height: 3.5, borderRadius: '50%', background: '#16a34a',
                }} />
            )}
            {icon}
            <span style={{ fontSize: 9.5, fontWeight: active ? 800 : 700, whiteSpace: 'nowrap' }}>
                {label}
            </span>
        </div>

        {/* Underline — only takes width when active */}
        <span style={{
            marginTop: 2,
            width: active ? 16 : 0,
            height: 2,
            borderRadius: 2,
            background: '#16a34a',
            transition: 'width 0.18s ease',
        }} />
    </Link>
);

/* ── Nav bar ──────────────────────────────────────────
   White background on both mobile and desktop, with a
   subtle top border/shadow. Icons are green throughout. */
const BottomNav: React.FC = () => {
    const location = useLocation();
    const isActive = (path: string) => location.pathname === path;

    return (
        <div className="hk-navbar">
            <div className="hk-navbar-inner">
                <NavItem to="/" icon={<HomeIcon />} label="Home" active={isActive('/')} />
                <NavItem to="/my-orders" icon={<OrdersIcon />} label="My Orders" active={isActive('/my-orders')} />
                <NavItem to="/notifications" icon={<NotificationBell />} label="Notifications" active={isActive('/notifications')} />
            </div>
        </div>
    );
};

/* ── App ─────────────────────────────────────────────── */
const LegacyBusinessRedirect = () => {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={`/business/${slug}`} replace />;
};

const App: React.FC = () => (
    <BrowserRouter basename="/customer">
      <CustomerFeedProvider>
        <OrdersProvider>
        <style>{`
            .hk-app-shell { padding-bottom: 56px; }

            .hk-navbar {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                padding: 4px 8px calc(4px + env(safe-area-inset-bottom));
                background: #ffffff;
                border-top: 1px solid #f3f4f6;
                box-shadow: 0 -1px 6px rgba(0,0,0,0.04);
                z-index: 1000;
            }
            .hk-navbar-inner {
                display: flex;
            }

            @media (min-width: 860px) {
                .hk-app-shell { padding-bottom: 0; padding-top: 52px; }

                .hk-navbar {
                    position: fixed;
                    top: 0;
                    bottom: auto;
                    left: 0;
                    right: 0;
                    padding: 6px 24px;
                    background: #ffffff;
                    border-top: none;
                    border-bottom: 1px solid #f3f4f6;
                    box-shadow: 0 1px 6px rgba(0,0,0,0.04);
                }
                .hk-navbar-inner {
                    max-width: 560px;
                    margin: 0 auto;
                    justify-content: center;
                    gap: 40px;
                }
                .hk-nav-item {
                    flex: none !important;
                    min-width: 72px;
                }
            }
        `}</style>
        <div className="hk-app-shell">
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/b/:slug" element={<LegacyBusinessRedirect />} />
                <Route path="/business/:slug" element={<BusinessProfile />} />
                <Route path="/order" element={<OrderPage />} />
                <Route path="/order/:id" element={<OrderTracking />} />
                <Route path="/my-orders" element={<MyOrders />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/receipt/:id" element={<Receipt />} />
            </Routes>
            <BottomNav />
        </div>
        </OrdersProvider>
      </CustomerFeedProvider>
    </BrowserRouter>
);

export default App;