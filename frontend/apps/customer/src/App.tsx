import { Config } from "@hakika/config";
import { registerSW } from 'virtual:pwa-register'
import UpdatePrompt from './components/UpdatePrompt';
import React, { lazy, Suspense } from 'react';
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
const LiveTrack = lazy(() => import('./pages/LiveTrack'));

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
   doesn't render when there's nothing unread. Badge is red so a new
   notification clearly stands out against the green nav icons. */
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
                <span className="hk-notif-badge" style={{
                    position: 'absolute',
                    top: -4,
                    right: -7,
                    background: '#ef4444',
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
        <div className="hk-nav-pill" style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            padding: active ? '3px 10px' : '3px 5px',
            borderRadius: 12,
            background: active ? '#e5e7eb' : 'transparent',
            color: '#6b7280',
            transform: active ? 'scale(1.03)' : 'scale(1)',
            transition: 'background 0.18s ease, color 0.18s ease, transform 0.18s ease',
        }}>
            {active && (
                <span className="hk-nav-dot" style={{
                    position: 'absolute', top: -2, left: '50%', transform: 'translateX(-50%)',
                    width: 3.5, height: 3.5, borderRadius: '50%', background: '#6b7280',
                }} />
            )}
            {icon}
            <span className="hk-nav-label" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                {label}
            </span>
        </div>

        {/* Underline — only takes width when active */}
        <span className="hk-nav-underline" style={{
            marginTop: 2,
            width: active ? 16 : 0,
            height: 2,
            borderRadius: 2,
            background: '#6b7280',
            transition: 'width 0.18s ease',
        }} />
    </Link>
);

/* ── Nav bar ──────────────────────────────────────────
   White background on both mobile and desktop, with a
   subtle top border/shadow. Icons are green throughout.
   Hides smoothly when scrolling down, reappears when
   scrolling up — like most modern mobile app chrome. */
const BottomNav: React.FC = () => {
    const location = useLocation();
    const isActive = (path: string) => location.pathname === path;
    const [hidden, setHidden] = React.useState(false);
    const lastYRef = React.useRef(0);
    // Signed accumulator — see the category-bar comment in Home.tsx.
    // Same rule: symmetric thresholds for hide and reveal, so a short
    // page never loses the nav with no way to bring it back.
    const scrollUpRef = React.useRef(0);
    const hiddenRef = React.useRef(false);

    React.useEffect(() => {
        let ticking = false;
        const onScroll = () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                const y = window.scrollY;
                const diff = y - lastYRef.current;
                // Only react to a deliberate scroll (avoids jitter from tiny
                // wobbles) and never hide while still near the very top.
                if (Math.abs(diff) > 6) {
                    if (diff > 0 && y > 40) {
                        // Scrolling down — symmetric 660px threshold.
                        if (!hiddenRef.current) {
                            scrollUpRef.current += diff;
                            if (scrollUpRef.current > 660) {
                                hiddenRef.current = true;
                                setHidden(true);
                                scrollUpRef.current = 0;
                            }
                        } else {
                            scrollUpRef.current = 0;
                        }
                    } else if (diff < 0) {
                        // Scrolling up — mirror of the above.
                        if (hiddenRef.current) {
                            scrollUpRef.current += Math.abs(diff);
                            if (scrollUpRef.current > 660) {
                                hiddenRef.current = false;
                                setHidden(false);
                                scrollUpRef.current = 0;
                            }
                        } else {
                            scrollUpRef.current = 0;
                        }
                    }
                    lastYRef.current = y;
                }
                ticking = false;
            });
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <div className={`hk-navbar${hidden ? ' hk-navbar--hidden' : ''}`}>
            <div className="hk-navbar-inner">
                <div className="hk-nav-group-left">
                    <NavItem to="/" icon={<HomeIcon />} label="Home" active={isActive('/')} />
                    <NavItem to="/my-orders" icon={<OrdersIcon />} label="My Orders" active={isActive('/my-orders')} />
                </div>
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

const App: React.FC = () => {
  const [needRefresh, setNeedRefresh] = React.useState<(() => Promise<void>) | null>(null);

  React.useEffect(() => {
    const unregister = registerSW({
      onNeedRefresh: (updateSW) => {
        setNeedRefresh(() => updateSW);
      },
    });
    return () => unregister?.();
  }, []);

  return (
    <BrowserRouter basename="/customer">
      <CustomerFeedProvider>
        <OrdersProvider>
        <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,700;1,700&display=swap');

            .hk-app-shell { padding-bottom: 56px; background: #F4F1EA; min-height: 100vh; }

            .hk-navbar {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                padding: 3.6px 8px calc(3.6px + env(safe-area-inset-bottom));
                background: #ffffff;
                border-radius: 22px 22px 0 0;
                border-top: 1px solid #d1d5db;
                box-shadow: 0 -1px 6px rgba(0,0,0,0.04);
                z-index: 1000;
                transition: transform 0.7s cubic-bezier(0.22, 1, 0.36, 1);
                transform: translateY(0);
                will-change: transform;
            }
            /* Mobile: nav sits at the bottom, so hiding slides it straight down. */
            .hk-navbar--hidden { transform: translateY(100%); }
            .hk-navbar-inner {
                display: flex;
            }
            .hk-nav-group-left {
                display: contents;
            }

            /* Handwriting-style label: strong gold text (matching the
               top line) on a soft grey chip, mobile and desktop. */
            .hk-nav-label {
                font-family: 'Fraunces', serif !important;
                font-style: italic !important;
                font-weight: 700 !important;
                font-size: 11px !important;
                color: #6b7280 !important;
                background: transparent;
                padding: 0;
                border-radius: 0;
                margin-top: 1px;
                letter-spacing: -0.005em;
            }

            /* ── Desktop: noticeably bigger nav, scaled to the
               wider screen — bigger icons, bigger text, taller bar,
               more breathing room between items. ── */
            @media (min-width: 860px) {
                /* padding-top must cover the navbar's real rendered height:
                   .hk-navbar padding (14+14=28) + .hk-nav-pill padding (8+8=16)
                   + icon (26) + pill gap (5) + label (~24 incl. its own
                   padding/line-height) + underline row (4) + border (2)
                   ≈ 105px. The previous 76px under-reserved this, which is
                   why content (search/location on the Home page) rendered
                   too high and got covered by the fixed nav. */
                .hk-app-shell { padding-bottom: 0; padding-top: 101px; background: #F4F1EA; min-height: 100vh; }

                /* Desktop: nav sits at the top, so hiding slides it up instead. */
                .hk-navbar--hidden { transform: translateY(-100%); }

                .hk-navbar {
                    position: fixed;
                    top: 0;
                    bottom: auto;
                    left: 0;
                    right: 0;
                    padding: 12.6px 56px;
                    background: #ffffff;
                    border-top: none;
                    border-bottom: 1px solid #d1d5db;
                    border-radius: 0 0 22px 22px;
                    box-shadow: 0 1px 8px rgba(0,0,0,0.05);
                }
                .hk-navbar-inner {
                    width: 100%;
                    justify-content: space-between;
                    align-items: center;
                }
                .hk-nav-group-left {
                    display: flex;
                    align-items: center;
                    gap: 96px;
                }
                .hk-nav-item {
                    flex: none !important;
                    min-width: 100px;
                }
                .hk-nav-pill { padding: 7.2px 20px !important; gap: 5px !important; border-radius: 16px !important; color: #6b7280 !important; }
                .hk-nav-pill svg { width: 26px !important; height: 26px !important; }
                .hk-nav-label { font-size: 12px !important; padding: 0 !important; }
                .hk-nav-dot { background: #6b7280 !important; }
                .hk-nav-underline { background: #6b7280 !important; }
                .hk-notif-badge {
                    min-width: 20px !important; height: 20px !important; font-size: 12px !important;
                    top: -6px !important; right: -10px !important; border-width: 2.5px !important;
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
                <Route
                    path="/order/:id/live-track"
                    element={
                        <Suspense fallback={<div style={{ padding: 20 }}>Loading live tracking…</div>}>
                            <LiveTrack />
                        </Suspense>
                    }
                />
            </Routes>
            <UpdatePrompt needRefresh={needRefresh} setNeedRefresh={setNeedRefresh} />
            <BottomNav />
        </div>
        </OrdersProvider>
      </CustomerFeedProvider>
    </BrowserRouter>
  );
};

export default App;