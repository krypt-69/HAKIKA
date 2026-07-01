import React, { useEffect, useState } from 'react';
import { useAuth } from '@hakika/auth';

interface BusinessProfile {
  id: string;
  name: string;
  description: string | null;
  category_id: number;
  trust_score: number;
  locations: { address_text: string | null; lat: number; lon: number }[];
  operating_hours: { day_of_week: number; opens_at: string | null; closes_at: string | null; is_closed: boolean }[];
  payment_methods: { type: string; last_four_digits: string | null }[];
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const BusinessProfilePage: React.FC = () => {
  const { businessId, getClient } = useAuth();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!businessId) return;
    const client = getClient();
    client.businesses.get(businessId)
      .then((data: any) => {
        setProfile(data);
        setName(data.name);
        setDescription(data.description || '');
      })
      .catch((err: any) => setError(err.message));
  }, [businessId]);

  const handleSave = async () => {
    if (!businessId) return;
    setError('');
    setSuccess('');
    try {
      const client = getClient();
      await client.businesses.update(businessId, { name, description: description || null });
      setSuccess('Profile updated!');
      setEditMode(false);
      // refresh
      const data: any = await client.businesses.get(businessId);
      setProfile(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!businessId) return <p>No business found.</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (!profile) return <p>Loading...</p>;

  return (
    <div>
      <h1>Business Profile</h1>
      {success && <p style={{ color: 'green' }}>{success}</p>}

      {editMode ? (
        <div style={{ maxWidth: 400, marginTop: 20 }}>
          <div><label>Business Name</label>
            <input value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', padding: 8, marginTop: 4 }} />
          </div>
          <div><label>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} style={{ width: '100%', padding: 8, marginTop: 4 }} />
          </div>
          <div style={{ marginTop: 12 }}>
            <button onClick={handleSave} style={{ padding: '8px 16px', marginRight: 8 }}>Save</button>
            <button onClick={() => setEditMode(false)} style={{ padding: '8px 16px' }}>Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ marginTop: 20 }}>
            <p><strong>Name:</strong> {profile.name}</p>
            <p><strong>Description:</strong> {profile.description || 'No description'}</p>
            <p><strong>Category ID:</strong> {profile.category_id}</p>
            <p><strong>Trust Score:</strong> {profile.trust_score}%</p>
          </div>

          <h3 style={{ marginTop: 20 }}>Location</h3>
          {profile.locations.length > 0 ? (
            profile.locations.map((loc, i) => (
              <div key={i}>
                <p>{loc.address_text || 'No address'}</p>
                <p>Lat: {loc.lat}, Lon: {loc.lon}</p>
              </div>
            ))
          ) : <p>No location set</p>}

          <h3 style={{ marginTop: 20 }}>Operating Hours</h3>
          {profile.operating_hours.length > 0 ? (
            profile.operating_hours.map(h => (
              <div key={h.day_of_week} style={{ display: 'flex', gap: 20 }}>
                <span>{DAYS[h.day_of_week]}</span>
                <span>{h.is_closed ? 'Closed' : `${h.opens_at?.slice(0,5)} - ${h.closes_at?.slice(0,5)}`}</span>
              </div>
            ))
          ) : <p>No hours set</p>}

          <h3 style={{ marginTop: 20 }}>Payment Method</h3>
          {profile.payment_methods.length > 0 ? (
            profile.payment_methods.map((pm, i) => (
              <div key={i}>
                <p><strong>Type:</strong> {pm.type}</p>
                <p><strong>Last 4 digits:</strong> {pm.last_four_digits || 'N/A'}</p>
              </div>
            ))
          ) : <p>No payment method</p>}

          <button onClick={() => setEditMode(true)} style={{ marginTop: 20, padding: '8px 16px' }}>Edit Profile</button>
        </>
      )}
    </div>
  );
};

export default BusinessProfilePage;
