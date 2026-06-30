import React, { useEffect, useState } from 'react';
import { useAuth } from '@hakika/auth';

interface Business {
  id: string;
  name: string;
  category_id: number;
  trust_score: number;
}

const BusinessesList: React.FC = () => {
  const { getClient } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState(1);
  const [lat, setLat] = useState('-1.28');
  const [lon, setLon] = useState('36.82');
  const [address, setAddress] = useState('');
  const [success, setSuccess] = useState('');

  const client = getClient();

  const fetchBusinesses = async () => {
    try {
      const data = await client.businesses.list() as any[];
      setBusinesses(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await client.businesses.create({
        name,
        category_id: Number(categoryId),
        location: { lat: Number(lat), lon: Number(lon), address_text: address },
        operating_hours: [{ day_of_week: 0, opens_at: '08:00', closes_at: '20:00', is_closed: false }],
        payment_method: { type: 'till', account_number: '000000' }
      });
      setSuccess('Business created!');
      setName('');
      setShowForm(false);
      fetchBusinesses();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h1>My Businesses</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}
      <button onClick={() => setShowForm(!showForm)}>
        {showForm ? 'Cancel' : 'Create New Business'}
      </button>
      {showForm && (
        <form onSubmit={handleCreate} style={{ marginTop: 20, maxWidth: 400 }}>
          <div><label>Name:</label><input value={name} onChange={e => setName(e.target.value)} required style={{ width: '100%' }} /></div>
          <div><label>Category ID:</label><input type="number" value={categoryId} onChange={e => setCategoryId(Number(e.target.value))} style={{ width: '100%' }} /></div>
          <div><label>Latitude:</label><input value={lat} onChange={e => setLat(e.target.value)} style={{ width: '100%' }} /></div>
          <div><label>Longitude:</label><input value={lon} onChange={e => setLon(e.target.value)} style={{ width: '100%' }} /></div>
          <div><label>Address:</label><input value={address} onChange={e => setAddress(e.target.value)} style={{ width: '100%' }} /></div>
          <button type="submit" style={{ marginTop: 10 }}>Create</button>
        </form>
      )}
      <hr style={{ margin: '20px 0' }} />
      {businesses.length === 0 ? (
        <p>No businesses yet.</p>
      ) : (
        <ul>
          {businesses.map((b: any) => (
            <li key={b.id}>{b.name} (Trust: {b.trust_score})</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default BusinessesList;
