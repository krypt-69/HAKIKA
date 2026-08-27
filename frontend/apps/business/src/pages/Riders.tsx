import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { api } from '../api';
import {
  Card,
  Button,
  LoadingSpinner,
  ErrorState,
  EmptyState,
  SectionHeader,
} from '../components';

interface Rider {
  id: string;
  username: string | null;
  name: string | null;
  email: string | null;
  status: string;
  business_id?: string | null;
  profile_picture_url?: string | null;
}

const Riders: React.FC = () => {
  const { businessId } = useAuth();
  const [associated, setAssociated] = useState<Rider[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Rider[]>([]);
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
    } catch (err: any) {
      setError(err.message || 'Failed to add rider');
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
      <SectionHeader
        title="Riders"
        subtitle={`${associated.length} associated rider${associated.length !== 1 ? 's' : ''}`}
      />

      {success && <div style={{ background: '#dcfce7', color: '#16a34a', padding: '10px 16px', borderRadius: '6px', marginBottom: '16px' }}>{success}</div>}
      {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 16px', borderRadius: '6px', marginBottom: '16px' }}>{error}</div>}

      {/* Search */}
      <Card style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '12px' }}>Find Rider</h3>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search by username, name, or email"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            required
            style={{
              flex: '1 1 240px',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '1rem',
            }}
          />
          <Button type="submit" variant="primary" isLoading={searchLoading} disabled={searchLoading}>
            Search
          </Button>
        </form>

        {searchResults.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <p style={{ fontWeight: 600, marginBottom: '8px' }}>Search Results</p>
            {searchResults.map(rider => (
              <div key={rider.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <p style={{ fontWeight: 600, color: '#111111' }}>
                    {rider.name || rider.username || rider.email}
                  </p>
                  <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                    @{rider.username || 'no-username'} · {rider.email}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button variant="primary" size="sm" onClick={() => handleInvite(rider.id)}>
                    Invite
                  </Button>
                  <Button variant="outline" size="sm" onClick={async () => {
                    const profile = await api.riders.getProfile(rider.id);
                    alert(JSON.stringify(profile, null, 2));
                  }}>
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Associated Riders */}
      <div>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '12px' }}>
          My Riders ({associated.length})
        </h3>
        {associated.length === 0 ? (
          <EmptyState
            title="No riders yet"
            description="Search and add riders to make them available for order assignment"
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {associated.map(rider => (
              <Card key={rider.id}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontWeight: 600, color: '#111111' }}>{rider.name || rider.username || rider.email}</p>
                    <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                      @{rider.username || 'no-username'} · {getStatusLabel(rider.status)}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleRemove(rider.id)}>
                    Remove
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Riders;
