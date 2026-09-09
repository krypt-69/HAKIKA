import React from 'react';
import { Link } from 'react-router-dom';
import { BusinessCard } from '../CustomerFeedContext';

interface Props {
  businesses: BusinessCard[];
  searchText: string;
  setSearchText: (s: string) => void;
  onSearch: () => void;
  onUseLocation: () => void;
  onOpenMyOrders: () => void;
  onOpenNotifications: () => void;
  nextCursor: string | null;
  loadingMore: boolean;
  loadMore: () => void;
  gpsLoading: boolean;
  error: string;
}

const DesktopHome: React.FC<Props> = ({
  businesses,
  searchText,
  setSearchText,
  onSearch,
  onUseLocation,
  onOpenMyOrders,
  onOpenNotifications,
  nextCursor,
  loadingMore,
  loadMore,
  gpsLoading,
  error,
}) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const sentinelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && nextCursor && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [nextCursor, loadingMore, loadMore]);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#111111', fontFamily: 'system-ui, -apple-system, sans-serif', paddingTop: 32 }}>
      <style>{`@media (min-width: 860px){ .hk-navbar { display: none !important; } }`}</style>

      {/* Corner menu */}
      <div style={{ position: 'fixed', top: 20, right: 24, zIndex: 1300 }}>
        <button onClick={() => setMenuOpen(v => !v)} style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 10, width: 42, height: 42, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Menu">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111111" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        {menuOpen && (
          <div style={{ position: 'absolute', top: 48, right: 0, background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 1400 }}>
            <button onClick={onOpenMyOrders} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '10px 14px', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#111111', borderRadius: 8 }}>My Orders</button>
            <button onClick={onOpenNotifications} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '10px 14px', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#111111', borderRadius: 8 }}>Notifications</button>
          </div>
        )}
      </div>

      {/* Search hero */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 32px 48px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 44, fontWeight: 800, marginBottom: 8 }}>Find a shop near you</h1>
        <p style={{ fontSize: 18, color: '#4b5563', marginBottom: 28 }}>Search for shops, products or businesses around your location.</p>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, maxWidth: 620, background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') onSearch(); }}
              placeholder="Search for a shop or product..."
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 16, color: '#111111' }}
            />
            <button onClick={onSearch} style={{ background: '#16a34a', border: 'none', color: '#ffffff', borderRadius: 10, padding: '10px 20px', fontWeight: 700, cursor: 'pointer' }}>
              Search
            </button>
          </div>
        </div>
        <button onClick={onUseLocation} disabled={gpsLoading} style={{ marginTop: 24, background: gpsLoading ? '#e5e7eb' : '#ffffff', border: `1px solid ${gpsLoading ? '#9ca3af' : '#16a34a'}`, color: gpsLoading ? '#9ca3af' : '#16a34a', borderRadius: 999, padding: '10px 20px', fontWeight: 700, cursor: gpsLoading ? 'not-allowed' : 'pointer' }}>
          {gpsLoading ? 'Locating…' : 'Use my location'}
        </button>
        {error && (
          <p style={{ marginTop: 12, color: '#dc2626', fontSize: 14 }}>{error}</p>
        )}
      </div>

      {/* Nearby Shops */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px 48px' }}>
        <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 800, marginBottom: 32 }}>Nearby Shops</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 48 }}>
          {businesses.map(biz => (
            <Link to={`/business/${biz.slug || biz.id}`} key={biz.id} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 18, padding: 20, textAlign: 'left', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
                <div style={{ position: 'relative', width: '100%', height: 160, marginBottom: 14 }}>
                  {biz.cover_url ? (
                    <img src={biz.cover_url} alt={biz.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: '#e5e7eb', borderRadius: 12 }} />
                  )}
                  {biz.logo_url && (
                    <img src={biz.logo_url} alt={`${biz.name} logo`} style={{ position: 'absolute', left: 12, bottom: -18, width: 64, height: 64, objectFit: 'cover', borderRadius: '50%', border: '3px solid #ffffff' }} />
                  )}
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{biz.name}</div>
                <div style={{ fontSize: 13, color: '#4b5563' }}>{biz.category_name}</div>
                <div style={{ fontSize: 12, color: '#16a34a', marginTop: 8 }}>{biz.address_text}</div>
                {biz.distance_meters ? (
                  <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 700, marginTop: 6 }}>{(biz.distance_meters / 1000).toFixed(1)} km</div>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
        <div ref={sentinelRef} style={{ height: 1 }} />
        {loadingMore && (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <span style={{ fontSize: 14, color: '#16a34a' }}>Loading more…</span>
          </div>
        )}
      </div>

      {/* Product preview belt */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px 80px' }}>
        {businesses.some(biz => (biz.snippet_products || []).length > 0) && (
          <>
            <h2 style={{ textAlign: 'center', fontSize: 22, fontWeight: 800, marginBottom: 28 }}>Product Preview</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, justifyContent: 'center' }}>
              {businesses.flatMap(biz => (biz.snippet_products || []).slice(0, 4).map(p => ({ p, biz }))).slice(0, 12).map(({ p, biz }, idx) => (
                <Link to={`/business/${biz.slug || biz.id}`} key={idx} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ width: 140, background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 10, textAlign: 'center' }}>
                    {p.image_url && <img src={p.image_url} alt={p.name} style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} />}
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{p.name}</div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DesktopHome;
