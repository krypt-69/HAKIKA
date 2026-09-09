import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { api } from '../api';
import { Card, Button, LoadingSpinner, ErrorState, EmptyState, SectionHeader } from '../components';

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
  pending: { bg: '#fdf3e2', fg: '#a5690f', dot: '#f4a536' },
  active: { bg: '#e4f6ee', fg: '#1e8a5f', dot: '#2fa876' },
  busy: { bg: '#e8ecfb', fg: '#3c4aa8', dot: '#5568d6' },
  inactive: { bg: '#f1f1f5', fg: '#767c96', dot: '#a5a9c2' },
};

const Riders: React.FC = () => {
  const { businessId } = useAuth();
  const [associated, setAssociated] = useState<Rider[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Rider[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Rider | null>(null);
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

  const Avatar: React.FC<{ rider: Rider; size: number }> = ({ rider, size }) => (
    rider.profile_picture_url ? (
      <img
        src={rider.profile_picture_url}
        alt={rider.name || rider.username || 'Rider'}
        className="hkr-avatar-img"
        style={{ width: size, height: size }}
      />
    ) : (
      <div className="hkr-avatar-fallback" style={{ width: size, height: size, fontSize: size * 0.4 }}>
        {initial(rider)}
      </div>
    )
  );

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
        .hkr-page {
          --ink: #10142a;
          --amber: #f4a536;
          --amber-deep: #d98c1f;
          --text-dark: #171b2e;
          --text-muted: #767c96;
          --line: #e6e7f0;
          --surface: #fbfbfd;
          font-family: 'Inter', sans-serif;
          color: var(--text-dark);
        }

        .hkr-loading {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 400px;
        }

        .hkr-banner {
          padding: 11px 16px;
          border-radius: 8px;
          font-size: 13.5px;
          font-weight: 500;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .hkr-banner--success {
          background: #e4f6ee;
          color: #1e8a5f;
        }

        .hkr-banner--error {
          background: #fdecec;
          color: #c23b3b;
        }

        .hkr-search-card {
          margin-bottom: 24px;
        }

        .hkr-search-title {
          font-size: 1rem;
          font-weight: 600;
          margin: 0 0 12px;
          color: var(--text-dark);
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
          border-radius: 8px;
          font-size: 15px;
          font-family: inherit;
          background: var(--surface);
          transition: border-color 0.15s ease;
        }

        .hkr-search-input:focus {
          outline: none;
          border-color: var(--amber);
          background: #fff;
          box-shadow: 0 0 0 3px rgba(244, 165, 54, 0.16);
        }

        .hkr-results {
          margin-top: 18px;
        }

        .hkr-results-label {
          font-weight: 600;
          font-size: 13px;
          color: var(--text-muted);
          text-transform: none;
          margin-bottom: 8px;
        }

        .hkr-result-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid #f1f2f7;
          flex-wrap: wrap;
        }

        .hkr-person {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .hkr-avatar-img {
          border-radius: 50%;
          object-fit: cover;
          flex: none;
        }

        .hkr-avatar-fallback {
          border-radius: 50%;
          background: #eef0fb;
          color: var(--ink);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          flex: none;
        }

        .hkr-person-name {
          font-weight: 600;
          font-size: 14.5px;
          color: var(--text-dark);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .hkr-person-meta {
          font-size: 12.5px;
          color: var(--text-muted);
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
          font-weight: 600;
          margin: 0 0 14px;
        }

        .hkr-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 14px;
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
          font-weight: 600;
          padding: 3px 9px 3px 7px;
          border-radius: 999px;
        }

        .hkr-pill-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        /* ---------- Modal ---------- */
        .hkr-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(16, 20, 42, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
        }

        .hkr-modal {
          background: #fff;
          border-radius: 16px;
          max-width: 420px;
          width: 100%;
          padding: 24px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .hkr-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .hkr-modal-header h3 {
          margin: 0;
          font-size: 1.05rem;
          font-weight: 600;
        }

        .hkr-modal-close {
          border: none;
          background: transparent;
          font-size: 22px;
          line-height: 1;
          cursor: pointer;
          color: var(--text-muted);
          padding: 4px;
        }

        .hkr-modal-close:hover {
          color: var(--text-dark);
        }

        .hkr-modal-body {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: 14px;
          text-align: center;
        }

        .hkr-modal-name {
          font-size: 1.2rem;
          font-weight: 700;
          margin: 4px 0 2px;
        }

        .hkr-modal-meta {
          color: var(--text-muted);
          font-size: 13.5px;
          margin: 2px 0;
        }

        .hkr-modal-status {
          margin: 10px 0 16px;
        }

        @media (max-width: 640px) {
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
            border-radius: 16px 16px 0 0;
            max-height: 85vh;
          }
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
    </div>
  );
};

export default Riders;