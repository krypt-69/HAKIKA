import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { api } from '../api';
import { Card, Button, LoadingSpinner, ErrorState, EmptyState, SectionHeader } from '../components';
import { X as XIcon, ZoomIn } from 'lucide-react';

interface Rider {
  id: string;
  username: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  profile_picture_url?: string | null;
}

const STATUS_STYLES: Record<string, { bg: string; fg: string; dot: string }> = {
  pending: { bg: '#F2E3C2', fg: '#8A5A12', dot: '#B4791D' },
  active: { bg: '#DEE8DD', fg: '#2E5138', dot: '#3C6B4C' },
  busy: { bg: '#DCE8E6', fg: '#1F4645', dot: '#2E5F5E' },
  inactive: { bg: '#EFE8D8', fg: '#7A7266', dot: '#B7AF9E' },
};

const Riders: React.FC = () => {
  const { businessId } = useAuth();
  const [associated, setAssociated] = useState<Rider[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Rider[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Rider | null>(null);
  const [zoomedRider, setZoomedRider] = useState<Rider | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchAssociated = async () => {
    if (!businessId) return;
    try {
      setLoading(true);
      const data = await api.riders.listByBusiness(businessId);
      setAssociated(data || []);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load riders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssociated();
  }, [businessId]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !searchQuery.trim()) return;
    setSearchLoading(true);
    setError('');
    setSuccess('');
    try {
      const results = await api.riders.search(businessId, searchQuery.trim());
      setSearchResults(results || []);
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleInvite = async (riderId: string) => {
    if (!businessId) return;
    setError('');
    setSuccess('');
    try {
      await api.riders.invite(businessId, riderId);
      setSuccess('Rider invited successfully.');
      await fetchAssociated();
      setSearchResults(prev => prev.filter(r => r.id !== riderId));
      setSelectedProfile(null);
    } catch (err: any) {
      setError(err.message || 'Failed to invite rider');
    }
  };

  const handleRemove = async (riderId: string) => {
    if (!businessId) return;
    setError('');
    setSuccess('');
    try {
      await api.riders.remove(businessId, riderId);
      setSuccess('Rider removed.');
      await fetchAssociated();
    } catch (err: any) {
      setError(err.message || 'Failed to remove rider');
    }
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      pending: 'Pending',
      active: 'Active',
      busy: 'Busy',
      inactive: 'Inactive',
    };
    return map[status] || status;
  };

  const initial = (r: Rider) => (r.name || r.username || 'R').charAt(0).toUpperCase();

  const StatusPill: React.FC<{ status: string }> = ({ status }) => {
    const s = STATUS_STYLES[status] || STATUS_STYLES.inactive;
    return (
      <span className="hkr-pill" style={{ background: s.bg, color: s.fg }}>
        <span className="hkr-pill-dot" style={{ background: s.dot }} />
        {getStatusLabel(status)}
      </span>
    );
  };

  // Avatar is clickable whenever a real photo exists — opens the zoom lightbox.
  const Avatar: React.FC<{ rider: Rider; size: number; zoomable?: boolean }> = ({ rider, size, zoomable = true }) => {
    const hasPhoto = !!rider.profile_picture_url;
    const clickable = zoomable && hasPhoto;

    return hasPhoto ? (
      <div
        className={`hkr-avatar-wrap ${clickable ? 'hkr-avatar-wrap--clickable' : ''}`}
        style={{ width: size, height: size }}
        onClick={clickable ? (e) => { e.stopPropagation(); setZoomedRider(rider); } : undefined}
      >
        <img
          src={rider.profile_picture_url as string}
          alt={rider.name || rider.username || 'Rider'}
          className="hkr-avatar-img"
        />
        {clickable && (
          <span className="hkr-avatar-zoom-hint">
            <ZoomIn size={Math.max(11, size * 0.24)} />
          </span>
        )}
      </div>
    ) : (
      <div className="hkr-avatar-fallback" style={{ width: size, height: size, fontSize: size * 0.4 }}>
        {initial(rider)}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="hkr-loading">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="hkr-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400..800&family=Inter:wght@400;500;600;700&display=swap');

        .hkr-page {
          --paper: #F6F2E9;
          --card: #FFFFFF;
          --ink: #26211B;
          --ink-soft: #7A7266;
          --line: #E7DFCE;
          --forest: #3C6B4C;
          --forest-light: #DEE8DD;
          --rust: #B4502F;
          --rust-light: #F3DDD0;
          background: var(--paper);
          min-height: 100vh;
          padding: 20px 20px 48px;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          color: var(--ink);
        }

        .hkr-page h1, .hkr-page h2, .hkr-page h3 {
          font-family: 'Fraunces', serif;
        }

        .hkr-loading {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 400px;
          background: var(--paper);
        }

        .hkr-banner {
          padding: 11px 16px;
          border-radius: 12px;
          font-size: 13.5px;
          font-weight: 500;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .hkr-banner--success {
          background: var(--forest-light);
          color: var(--forest);
          border: 1px solid ${'rgba(60,107,76,0.15)'};
        }

        .hkr-banner--error {
          background: var(--rust-light);
          color: var(--rust);
          border: 1px solid ${'rgba(180,80,47,0.15)'};
        }

        .hkr-search-card {
          margin-bottom: 24px;
          background: var(--card) !important;
          border: 1px solid var(--line) !important;
          border-radius: 16px !important;
        }

        .hkr-search-title {
          font-size: 1rem;
          font-weight: 700;
          margin: 0 0 12px;
          color: var(--ink);
          font-family: 'Fraunces', serif;
        }

        .hkr-search-form {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .hkr-search-input {
          flex: 1 1 240px;
          padding: 10px 14px;
          border: 1.5px solid var(--line);
          border-radius: 10px;
          font-size: 15px;
          font-family: inherit;
          background: var(--paper);
          color: var(--ink);
          transition: border-color 0.15s ease;
        }

        .hkr-search-input::placeholder { color: #B7AF9E; }

        .hkr-search-input:focus {
          outline: none;
          border-color: var(--forest);
          background: #fff;
          box-shadow: 0 0 0 3px rgba(60, 107, 76, 0.14);
        }

        .hkr-results {
          margin-top: 18px;
        }

        .hkr-results-label {
          font-weight: 600;
          font-size: 13px;
          color: var(--ink-soft);
          text-transform: none;
          margin-bottom: 8px;
        }

        .hkr-result-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid var(--line);
          flex-wrap: wrap;
        }

        .hkr-person {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .hkr-avatar-wrap {
          position: relative;
          border-radius: 50%;
          overflow: hidden;
          flex: none;
          border: 2px solid var(--line);
        }
        .hkr-avatar-wrap--clickable {
          cursor: zoom-in;
        }
        .hkr-avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .hkr-avatar-zoom-hint {
          position: absolute;
          inset: 0;
          background: rgba(38,33,27,0);
          color: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s, color 0.15s;
        }
        .hkr-avatar-wrap--clickable:hover .hkr-avatar-zoom-hint {
          background: rgba(38,33,27,0.45);
          color: #ffffff;
        }

        .hkr-avatar-fallback {
          border-radius: 50%;
          background: var(--forest-light);
          color: var(--forest);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-family: 'Fraunces', serif;
          flex: none;
        }

        .hkr-person-name {
          font-weight: 600;
          font-size: 14.5px;
          color: var(--ink);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .hkr-person-meta {
          font-size: 12.5px;
          color: var(--ink-soft);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .hkr-row-actions {
          display: flex;
          gap: 8px;
          flex: none;
        }

        .hkr-section-title {
          font-size: 1rem;
          font-weight: 700;
          margin: 0 0 14px;
          font-family: 'Fraunces', serif;
        }

        .hkr-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 14px;
        }

        .hkr-grid :global(.card),
        .hkr-grid > div {
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: 16px;
        }

        .hkr-rider-card-top {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .hkr-rider-card-actions {
          display: flex;
          gap: 8px;
        }

        .hkr-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          font-weight: 700;
          padding: 3px 9px 3px 7px;
          border-radius: 999px;
          text-transform: capitalize;
        }

        .hkr-pill-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        /* ---------- Rider profile modal ---------- */
        .hkr-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(38, 33, 27, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
        }

        .hkr-modal {
          background: var(--card);
          border-radius: 18px;
          max-width: 420px;
          width: 100%;
          padding: 24px;
          max-height: 90vh;
          overflow-y: auto;
          border: 1px solid var(--line);
        }

        .hkr-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .hkr-modal-header h3 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 700;
        }

        .hkr-modal-close {
          border: none;
          background: transparent;
          font-size: 22px;
          line-height: 1;
          cursor: pointer;
          color: var(--ink-soft);
          padding: 4px;
        }

        .hkr-modal-close:hover {
          color: var(--ink);
        }

        .hkr-modal-body {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: 14px;
          text-align: center;
        }

        .hkr-modal-name {
          font-family: 'Fraunces', serif;
          font-size: 1.25rem;
          font-weight: 700;
          margin: 8px 0 2px;
        }

        .hkr-modal-meta {
          color: var(--ink-soft);
          font-size: 13.5px;
          margin: 2px 0;
        }

        .hkr-modal-status {
          margin: 10px 0 16px;
        }

        /* ---------- Photo zoom lightbox ---------- */
        .hkr-lightbox-overlay {
          position: fixed;
          inset: 0;
          background: rgba(20, 17, 13, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1100;
          padding: 24px;
        }
        .hkr-lightbox-image {
          max-width: 90vw;
          max-height: 80vh;
          width: 360px;
          aspect-ratio: 1 / 1;
          object-fit: cover;
          border-radius: 16px;
          cursor: default;
          box-shadow: 0 20px 60px rgba(0,0,0,0.4);
        }
        .hkr-lightbox-caption {
          position: absolute;
          bottom: 28px;
          left: 50%;
          transform: translateX(-50%);
          color: #ffffff;
          text-align: center;
        }
        .hkr-lightbox-caption-name {
          font-family: 'Fraunces', serif;
          font-weight: 700;
          font-size: 1.05rem;
          margin: 0;
        }
        .hkr-lightbox-caption-meta {
          font-size: 0.8rem;
          color: rgba(255,255,255,0.7);
          margin: 2px 0 0 0;
        }
        .hkr-lightbox-close {
          position: absolute;
          top: 18px;
          right: 18px;
          background: rgba(255,255,255,0.12);
          border: none;
          color: #ffffff;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .hkr-lightbox-close:hover { background: rgba(255,255,255,0.22); }

        @media (max-width: 640px) {
          .hkr-page { padding: 16px 14px 40px; }

          .hkr-search-form {
            flex-direction: column;
          }

          .hkr-search-form button {
            width: 100%;
          }

          .hkr-result-row {
            align-items: flex-start;
          }

          .hkr-grid {
            grid-template-columns: 1fr;
          }

          .hkr-modal-overlay {
            align-items: flex-end;
            padding: 0;
          }

          .hkr-modal {
            max-width: none;
            width: 100%;
            border-radius: 18px 18px 0 0;
            max-height: 85vh;
          }

          .hkr-lightbox-image { width: 82vw; }
        }
      `}</style>

      <SectionHeader title="Riders" subtitle={`${associated.length} associated rider${associated.length !== 1 ? 's' : ''}`} />

      {success && <div className="hkr-banner hkr-banner--success">{success}</div>}
      {error && <div className="hkr-banner hkr-banner--error">{error}</div>}

      <Card className="hkr-search-card">
        <h3 className="hkr-search-title">Find rider</h3>
        <form onSubmit={handleSearch} className="hkr-search-form">
          <input
            type="text"
            placeholder="Search by username, name, or email"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            required
            className="hkr-search-input"
          />
          <Button type="submit" variant="primary" isLoading={searchLoading} disabled={searchLoading}>
            Search
          </Button>
        </form>

        {searchResults.length > 0 && (
          <div className="hkr-results">
            <p className="hkr-results-label">Search results</p>
            {searchResults.map(rider => (
              <div key={rider.id} className="hkr-result-row">
                <div className="hkr-person">
                  <Avatar rider={rider} size={40} />
                  <div style={{ minWidth: 0 }}>
                    <p className="hkr-person-name">{rider.name || rider.username || rider.email}</p>
                    <p className="hkr-person-meta">@{rider.username || 'no-username'} · {rider.email}</p>
                  </div>
                </div>
                <div className="hkr-row-actions">
                  <Button variant="outline" size="sm" onClick={() => setSelectedProfile(rider)}>View</Button>
                  <Button variant="primary" size="sm" onClick={() => handleInvite(rider.id)}>Invite</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div>
        <h3 className="hkr-section-title">My riders ({associated.length})</h3>
        {associated.length === 0 ? (
          <EmptyState title="No riders yet" description="Search and invite riders to make them available for order assignment" />
        ) : (
          <div className="hkr-grid">
            {associated.map(rider => (
              <Card key={rider.id}>
                <div className="hkr-rider-card-top">
                  <Avatar rider={rider} size={48} />
                  <div style={{ minWidth: 0 }}>
                    <p className="hkr-person-name">{rider.name || rider.username || rider.email}</p>
                    <p className="hkr-person-meta">@{rider.username || 'no-username'}</p>
                  </div>
                </div>
                <StatusPill status={rider.status} />
                <div className="hkr-rider-card-actions" style={{ marginTop: 12 }}>
                  <Button variant="outline" size="sm" onClick={() => setSelectedProfile(rider)}>View</Button>
                  <Button variant="outline" size="sm" onClick={() => handleRemove(rider.id)}>Remove</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Rider Profile Modal */}
      {selectedProfile && (
        <div className="hkr-modal-overlay" onClick={() => setSelectedProfile(null)}>
          <div className="hkr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hkr-modal-header">
              <h3>Rider profile</h3>
              <button className="hkr-modal-close" onClick={() => setSelectedProfile(null)} aria-label="Close">×</button>
            </div>
            <div className="hkr-modal-body">
              <div style={{ marginBottom: 4 }}>
                <Avatar rider={selectedProfile} size={92} />
              </div>
              <p className="hkr-modal-name">{selectedProfile.name || selectedProfile.username || selectedProfile.email}</p>
              <p className="hkr-modal-meta">@{selectedProfile.username || 'no-username'}</p>
              <p className="hkr-modal-meta">{selectedProfile.email}</p>
              <p className="hkr-modal-meta">{selectedProfile.phone || 'No phone'}</p>
              <div className="hkr-modal-status">
                <StatusPill status={selectedProfile.status} />
              </div>
              <Button variant="primary" size="sm" onClick={() => handleInvite(selectedProfile.id)}>Invite</Button>
            </div>
          </div>
        </div>
      )}

      {/* Photo zoom lightbox — opens from any avatar click, including the one inside the profile modal */}
      {zoomedRider && zoomedRider.profile_picture_url && (
        <div className="hkr-lightbox-overlay" onClick={() => setZoomedRider(null)}>
          <button className="hkr-lightbox-close" onClick={() => setZoomedRider(null)} aria-label="Close">
            <XIcon size={22} />
          </button>
          <img
            src={zoomedRider.profile_picture_url}
            alt={zoomedRider.name || zoomedRider.username || 'Rider'}
            className="hkr-lightbox-image"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="hkr-lightbox-caption">
            <p className="hkr-lightbox-caption-name">
              {zoomedRider.name || zoomedRider.username || zoomedRider.email}
            </p>
            {zoomedRider.username && (
              <p className="hkr-lightbox-caption-meta">@{zoomedRider.username}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Riders;