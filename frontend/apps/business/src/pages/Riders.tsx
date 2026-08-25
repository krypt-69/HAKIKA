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
  name: string;
  phone: string;
  email: string;
  status: string; // 'pending' | 'active' | 'busy'
  business_id: string;
  profile_picture_url?: string | null;
}

const Riders: React.FC = () => {
  const { businessId } = useAuth();
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRiders = async () => {
    if (!businessId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await api.riders.listByBusiness(businessId);
      setRiders(data || []);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load riders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiders();
  }, [businessId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;
    if (!name.trim() || !phone.trim()) {
      setError('Name and phone are required');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    // Auto-generate email from name
    const email = `${name.toLowerCase().replace(/\s/g, '.')}@rider.hakika`;

    try {
      await api.riders.create(businessId, {
        name: name.trim(),
        phone: phone.trim(),
        email,
      });
      setSuccess('Rider added successfully!');
      setName('');
      setPhone('');
      await fetchRiders();
    } catch (err: any) {
      setError(err.message || 'Failed to add rider');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      pending: '#000000',
      active: '#16a34a',
      busy: '#6b7280', // gray, since we don't have orange in palette
    };
    return map[status] || '#6b7280';
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      pending: 'Pending',
      active: 'Active',
      busy: 'Busy',
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

  if (error && !riders.length) {
    return <ErrorState message={error} onRetry={fetchRiders} />;
  }

  const activeCount = riders.filter(r => r.status === 'active' || r.status === 'busy').length;

  return (
    <div>
      <SectionHeader
        title="Riders"
        subtitle={`${riders.length} total · ${activeCount} active`}
      />

      {success && (
        <div style={{ background: '#dcfce7', color: '#16a34a', padding: '10px 16px', borderRadius: '6px', marginBottom: '16px' }}>
          {success}
        </div>
      )}
      {error && (
        <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 16px', borderRadius: '6px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Add Rider Form */}
      <Card style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111111', marginBottom: '12px' }}>
          Add New Rider
        </h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{
              flex: '1 1 200px',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '1rem',
            }}
          />
          <input
            type="tel"
            placeholder="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            style={{
              flex: '1 1 200px',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '1rem',
            }}
          />
          <Button
            type="submit"
            variant="primary"
            isLoading={submitting}
            disabled={submitting}
            style={{ flexShrink: 0 }}
          >
            Add Rider
          </Button>
        </form>
        <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '8px' }}>
          An email will be auto-generated for rider activation.
        </p>
      </Card>

      {/* Rider List */}
      {riders.length === 0 ? (
        <EmptyState
          title="No riders yet"
          description="Add a rider to start assigning deliveries"
          action={
            <Button variant="primary" onClick={() => document.querySelector('input')?.focus()}>
              Add Your First Rider
            </Button>
          }
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {riders.map((rider) => (
            <Card key={rider.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                {rider.profile_picture_url ? (
                  <img
                    src={rider.profile_picture_url}
                    alt={rider.name}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: '#111111',
                    }}
                  >
                    {rider.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, color: '#111111' }}>{rider.name}</p>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{rider.phone}</p>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 12px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: getStatusColor(rider.status),
                    color: '#ffffff',
                  }}
                >
                  {getStatusLabel(rider.status)}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  {rider.email}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Riders;