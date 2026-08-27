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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <SectionHeader title="Riders" subtitle={`${associated.length} associated rider${associated.length !== 1 ? 's' : ''}`} />

      {success && <div style={{ background: '#dcfce7', color: '#16a34a', padding: '10px 16px', borderRadius: '6px', marginBottom: '16px' }}>{success}</div>}
      {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 16px', borderRadius: '6px', marginBottom: '16px' }}>{error}</div>}

      <Card style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '12px' }}>Find Rider</h3>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search by username, name, or email"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            required
            style={{ flex: '1 1 240px', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '1rem' }}
          />
          <Button type="submit" variant="primary" isLoading={searchLoading} disabled={searchLoading}>Search</Button>
        </form>

        {searchResults.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <p style={{ fontWeight: 600, marginBottom: '8px' }}>Search Results</p>
            {searchResults.map(rider => (
              <div key={rider.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {rider.profile_picture_url ? (
                    <img src={rider.profile_picture_url} alt={rider.name || rider.username || 'Rider'} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 700, color: '#111111' }}>
                      {(rider.name || rider.username || 'R').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p style={{ fontWeight: 600, color: '#111111' }}>{rider.name || rider.username || rider.email}</p>
                    <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>@{rider.username || 'no-username'} · {rider.email}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button variant="outline" size="sm" onClick={() => setSelectedProfile(rider)}>View</Button>
                  <Button variant="primary" size="sm" onClick={() => handleInvite(rider.id)}>Invite</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '12px' }}>My Riders ({associated.length})</h3>
        {associated.length === 0 ? (
          <EmptyState title="No riders yet" description="Search and invite riders to make them available for order assignment" />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {associated.map(rider => (
              <Card key={rider.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  {rider.profile_picture_url ? (
                    <img src={rider.profile_picture_url} alt={rider.name || rider.username || 'Rider'} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 700, color: '#111111' }}>
                      {(rider.name || rider.username || 'R').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p style={{ fontWeight: 600, color: '#111111' }}>{rider.name || rider.username || rider.email}</p>
                    <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>@{rider.username || 'no-username'} · {getStatusLabel(rider.status)}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setSelectedProfile(rider)}>View</Button>
                <Button variant="outline" size="sm" onClick={() => handleRemove(rider.id)} style={{ marginLeft: '8px' }}>Remove</Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Rider Profile Modal */}
      {selectedProfile && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 12, maxWidth: 420, width: '90%', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h3 style={{ margin: 0 }}>Rider Profile</h3>
              <button onClick={() => setSelectedProfile(null)} style={{ border: 'none', background: 'transparent', fontSize: 24, cursor: 'pointer', color: '#6b7280' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 16 }}>
              {selectedProfile.profile_picture_url ? (
                <img src={selectedProfile.profile_picture_url} alt={selectedProfile.name || selectedProfile.username || 'Rider'} style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', marginBottom: 12 }} />
              ) : (
                <div style={{ width: 100, height: 100, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 700, color: '#111111', marginBottom: 12 }}>
                  {(selectedProfile.name || selectedProfile.username || 'R').charAt(0).toUpperCase()}
                </div>
              )}
              <p style={{ fontSize: '1.25rem', fontWeight: 700 }}>{selectedProfile.name || selectedProfile.username || selectedProfile.email}</p>
              <p style={{ color: '#6b7280' }}>@{selectedProfile.username || 'no-username'}</p>
              <p style={{ color: '#6b7280' }}>{selectedProfile.email}</p>
              <p style={{ color: '#6b7280' }}>{selectedProfile.phone || 'No phone'}</p>
              <p style={{ color: '#16a34a', fontWeight: 600 }}>{getStatusLabel(selectedProfile.status)}</p>
              <Button variant="primary" size="sm" onClick={() => handleInvite(selectedProfile.id)}>Invite</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Riders;
