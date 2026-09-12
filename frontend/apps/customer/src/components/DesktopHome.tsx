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

// ---- Design tokens -------------------------------------------------------
const PAPER = '#F6F2E9';     // page background — warm parchment
const INK = '#221F1A';       // primary text, warm near-black
const MUTED = '#7A7261';     // secondary text
const LINE = '#E3DAC7';      // hairline borders / dividers
const CARD = '#FFFEFB';      // card surface — warm off-white, one notch up from PAPER
const MOSS = '#3E6C4C';      // primary accent — produce green
const MOSS_DARK = '#2E5138'; // primary accent, pressed/hover
const MOSS_SOFT = '#EAF0E7'; // primary accent, tint (badges, focus)
const CLAY = '#B5502E';      // secondary accent — used sparingly, for the distance stub
const CLAY_SOFT = '#F5E4DB'; // secondary accent, tint


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
  const [zoomedLogo, setZoomedLogo] = React.useState<{ url: string; name: string } | null>(null);
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

  React.useEffect(() => {
    if (!zoomedLogo) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setZoomedLogo(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoomedLogo]);

  const hasLocation = businesses.some(
    b => typeof b.distance_meters === 'number' && b.distance_meters !== null
  );

  return (
    <div style={{ minHeight: '100vh', background: PAPER, color: INK, fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,440;9..144,560;9..144,680&family=Inter:wght@400;500;600;700&display=swap');

        @media (min-width: 860px){ .hk-navbar { display: none !important; } }

        .hk-shop-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 40px;
        }
        @media (max-width: 1400px){
          .hk-shop-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 860px){
          .hk-shop-grid { grid-template-columns: 1fr; }
        }

        .hk-shop-card {
          transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
        }
        .hk-shop-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 22px 40px rgba(34, 31, 26, 0.11);
          border-color: #D8CDB4;
        }

        .hk-search-btn:hover { background: ${MOSS_DARK}; }
        .hk-locate-btn:hover { background: ${MOSS_SOFT}; }

        .hk-product-link { transition: opacity 140ms ease; }
        .hk-product-link:hover { opacity: 0.82; }

        .hk-logo-btn {
          transition: transform 160ms ease, box-shadow 160ms ease;
          cursor: zoom-in;
        }
        .hk-logo-btn:hover {
          transform: scale(1.06);
          box-shadow: 0 6px 16px rgba(34,31,26,0.28);
        }

        .hk-icon-btn:focus-visible,
        .hk-search-input:focus-visible,
        .hk-search-btn:focus-visible,
        .hk-locate-btn:focus-visible,
        .hk-shop-card:focus-visible,
        .hk-menu-item:focus-visible,
        .hk-logo-btn:focus-visible,
        .hk-product-link:focus-visible {
          outline: 2px solid ${MOSS};
          outline-offset: 2px;
        }

        @keyframes hk-spin {
          to { transform: rotate(360deg); }
        }

        @keyframes hk-zoom-out {
          from { opacity: 0; transform: scale(0.55); }
          to { opacity: 1; transform: scale(1); }
        }

        @keyframes hk-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .hk-spinner {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 3px solid ${LINE};
          border-top-color: ${MOSS};
          border-right-color: ${CLAY};
          animation: hk-spin 0.75s linear infinite;
        }

        .hk-logo-overlay {
          animation: hk-fade-in 160ms ease;
        }

        .hk-logo-zoom-img {
          animation: hk-zoom-out 220ms cubic-bezier(0.2, 0.8, 0.3, 1);
        }

        @media (prefers-reduced-motion: reduce) {
          .hk-shop-card, .hk-logo-btn { transition: none !important; }
          .hk-shop-card:hover, .hk-logo-btn:hover { transform: none !important; }
          .hk-spinner, .hk-logo-overlay, .hk-logo-zoom-img { animation: none !important; }
        }
      `}</style>

      {/* Corner menu */}
      <div style={{ position: 'fixed', top: 20, right: 24, zIndex: 1300 }}>
        <button
          className="hk-icon-btn"
          onClick={() => setMenuOpen(v => !v)}
          style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 10, width: 42, height: 42, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          aria-label="Menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        {menuOpen && (
          <div style={{ position: 'absolute', top: 48, right: 0, background: CARD, border: `1px solid ${LINE}`, borderRadius: 12, padding: 6, minWidth: 168, boxShadow: '0 12px 28px rgba(34,31,26,0.14)', zIndex: 1400 }}>
            <button className="hk-menu-item" onClick={onOpenMyOrders} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '10px 12px', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: INK, borderRadius: 8 }}>My orders</button>
            <button className="hk-menu-item" onClick={onOpenNotifications} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '10px 12px', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: INK, borderRadius: 8 }}>Notifications</button>
          </div>
        )}
      </div>

      {/* Hero / search */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '68px 32px 56px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 620, fontSize: 46, lineHeight: 1.08, letterSpacing: '-0.01em', margin: 0, marginBottom: 14 }}>
          What&rsquo;s open, what&rsquo;s fresh, what&rsquo;s close
        </h1>
        <p style={{ fontSize: 17, color: MUTED, maxWidth: 520, margin: '0 auto 32px', lineHeight: 1.55 }}>
          Search the shops around you, browse what they carry, and see how far it is to walk there.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 600, background: CARD, border: `1px solid ${LINE}`, borderRadius: 14, padding: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, padding: '8px 12px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={MOSS} strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                className="hk-search-input"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') onSearch(); }}
                placeholder="Search shops or products…"
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 15, color: INK, fontFamily: "'Inter', sans-serif" }}
              />
            </div>
            <button
              className="hk-search-btn"
              onClick={onSearch}
              style={{ background: MOSS, border: 'none', color: '#FFFFFF', borderRadius: 10, padding: '12px 22px', fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'background 150ms ease' }}
            >
              Search
            </button>
          </div>
        </div>

        <div style={{ marginTop: 18, display: 'flex', justifyContent: 'center' }}>
          {hasLocation ? (
            <button
              className="hk-locate-btn"
              onClick={onUseLocation}
              disabled={gpsLoading}
              style={{ background: 'transparent', border: `1px solid ${MOSS}`, color: MOSS, borderRadius: 999, padding: '9px 18px', fontWeight: 600, fontSize: 13, cursor: gpsLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'background 150ms ease' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={MOSS} strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" /></svg>
              {gpsLoading ? 'Locating…' : 'Distances are on'}
            </button>
          ) : (
            <button
              className="hk-locate-btn"
              onClick={onUseLocation}
              disabled={gpsLoading}
              style={{ background: gpsLoading ? '#EDE7D8' : CLAY_SOFT, border: `1px solid ${gpsLoading ? LINE : '#E3C3AD'}`, color: gpsLoading ? MUTED : CLAY, borderRadius: 999, padding: '9px 18px', fontWeight: 600, fontSize: 13, cursor: gpsLoading ? 'not-allowed' : 'pointer', transition: 'background 150ms ease' }}
            >
              {gpsLoading ? 'Locating…' : 'Turn on location to see distances'}
            </button>
          )}
        </div>
        {error && (
          <p style={{ marginTop: 12, color: '#B3401F', fontSize: 13 }}>{error}</p>
        )}
      </div>

      {/* Shop grid */}
      <div style={{ maxWidth: 2240, margin: '0 auto', padding: '0 32px 88px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 26, borderBottom: `1px solid ${LINE}`, paddingBottom: 16 }}>
          <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 600, fontSize: 24, margin: 0 }}>Shops near you</h2>
          <span style={{ fontSize: 13, color: MUTED }}>{businesses.length} {businesses.length === 1 ? 'shop' : 'shops'}</span>
        </div>

        {(() => {
          const rows: BusinessCard[][] = [];
          for (let i = 0; i < businesses.length; i += 3) rows.push(businesses.slice(i, i + 3));

          return rows.map((row, rowIdx) => (
            <div key={rowIdx} style={{ marginBottom: 48 }}>
              {/* Cards */}
              <div className="hk-shop-grid" style={{ marginBottom: 26 }}>
                {row.map(biz => {
                  const km = biz.distance_meters ? (biz.distance_meters / 1000).toFixed(1) : null;
                  return (
                    <Link
                      to={`/business/${biz.slug || biz.id}`}
                      key={biz.id}
                      className="hk-shop-card"
                      style={{ textDecoration: 'none', color: 'inherit', display: 'block', background: CARD, border: `1px solid ${LINE}`, borderRadius: 18, overflow: 'hidden' }}
                    >
                      {/* Cover — shown in full, nothing overlapping it */}
                      <div style={{ position: 'relative', width: '100%', height: 368, background: '#EDE6D5' }}>
                        {biz.cover_url ? (
                          <img src={biz.cover_url} alt={biz.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', background: 'repeating-linear-gradient(135deg, #EDE6D5, #EDE6D5 10px, #E6DDC7 10px, #E6DDC7 20px)' }} />
                        )}

                        {biz.category_name && (
                          <span style={{ position: 'absolute', top: 14, left: 14, background: 'rgba(34,31,26,0.72)', color: '#FFFFFF', fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 999 }}>
                            <span style={{ fontFamily: "'Fraunces', serif" }}>{biz.category_name}</span>
                          </span>
                        )}

                        {km && (
                          <span style={{ position: 'absolute', top: 14, right: 14, background: CLAY, color: '#FFFFFF', fontSize: 13, fontWeight: 700, padding: '6px 12px', borderRadius: 999, boxShadow: '0 4px 10px rgba(181,80,46,0.35)' }}>
                            {km} km
                          </span>
                        )}
                      </div>

                      {/* Details — logo now lives in here, beside the name */}
                      <div style={{ padding: '24px 24px 28px', display: 'flex', alignItems: 'center', gap: 16 }}>
                        {biz.logo_url && (
                          <button
                            type="button"
                            className="hk-logo-btn"
                            onClick={e => { e.preventDefault(); e.stopPropagation(); setZoomedLogo({ url: biz.logo_url as string, name: biz.name }); }}
                            aria-label={`View ${biz.name}'s logo larger`}
                            style={{ flexShrink: 0, width: 76, height: 76, padding: 0, border: `1px solid ${LINE}`, borderRadius: '50%', background: CARD }}
                          >
                            <img
                              src={biz.logo_url}
                              alt={`${biz.name} logo`}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', display: 'block' }}
                            />
                          </button>
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 600, fontSize: 23, lineHeight: 1.25, marginBottom: 8 }}>
                            <span style={{ fontFamily: "'Fraunces', serif" }}>{biz.name}</span>
                          </div>
                          {biz.address_text && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, color: MUTED }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" style={{ flexShrink: 0 }}>
                                <path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11z" />
                                <circle cx="12" cy="10" r="2.5" />
                              </svg>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{biz.address_text}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Belt — one continuous shelf holding every shop's products in this row */}
              <div
                className="hk-shop-grid"
                style={{ gap: 0, background: CARD, border: `1px solid ${LINE}`, borderRadius: 18, overflow: 'hidden', boxShadow: '0 16px 30px rgba(34,31,26,0.10)' }}
              >
                {row.map((biz, idx) => {
                  return (
                    <div
                      key={biz.id}
                      style={{ padding: '22px 22px 0', borderRight: idx < row.length - 1 ? `1px solid ${LINE}` : 'none' }}
                    >
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: MUTED, marginBottom: 14 }}>On the shelf</div>

                      <div style={{ borderRadius: 0, border: `1px dashed #D8CDB4`, padding: '28px 12px', marginBottom: 22, textAlign: 'center', fontSize: 12.5, color: '#B8AD91' }}>
                        Nothing on the shelf yet
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ));
        })()}

        <div ref={sentinelRef} style={{ height: 1 }} />
        {loadingMore && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '36px 0' }}>
            <div className="hk-spinner" role="status" aria-label="Loading more shops" />
            <span style={{ fontSize: 13, color: MUTED, fontWeight: 600 }}>Bringing in more shops nearby…</span>
          </div>
        )}
      </div>

      {/* Logo zoom */}
      {zoomedLogo && (
        <div
          className="hk-logo-overlay"
          onClick={() => setZoomedLogo(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`${zoomedLogo.name} logo, enlarged`}
          style={{ position: 'fixed', inset: 0, background: 'rgba(24,22,18,0.72)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1500, cursor: 'zoom-out' }}
        >
          <img
            src={zoomedLogo.url}
            alt={`${zoomedLogo.name} logo, enlarged`}
            className="hk-logo-zoom-img"
            style={{ width: 280, height: 280, objectFit: 'cover', borderRadius: '50%', border: `6px solid ${CARD}`, boxShadow: '0 24px 60px rgba(0,0,0,0.4)' }}
          />
          <div style={{ marginTop: 20, color: '#FFFFFF', fontFamily: "'Fraunces', Georgia, serif", fontSize: 18, fontWeight: 600 }}>
            {zoomedLogo.name}
          </div>
          <button
            type="button"
            onClick={() => setZoomedLogo(null)}
            aria-label="Close"
            style={{ position: 'absolute', top: 24, right: 28, background: 'rgba(255,255,255,0.12)', border: 'none', color: '#FFFFFF', width: 38, height: 38, borderRadius: '50%', fontSize: 18, cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default DesktopHome;