import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { api } from '../api';

const CreateBusiness: React.FC = () => {
  const { businessId } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState(1);
  const [lat, setLat] = useState('-1.286');
  const [lon, setLon] = useState('36.817');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (businessId) { navigate('/products', { replace: true }); return null; }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.businesses.create({
        name, category_id: Number(categoryId),
        location: { lat: Number(lat), lon: Number(lon), address_text: address },
        operating_hours: [{ day_of_week: 0, opens_at: '08:00', closes_at: '20:00', is_closed: false }],
        payment_method: { type: 'till', account_number: '000000' }
      });
      navigate('/products', { replace: true });
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: 500, margin: '40px auto', padding: 20 }}>
      <h1>Create Your Business</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <div><input value={name} onChange={e => setName(e.target.value)} placeholder="Business Name" required style={{ width: '100%', padding: 8, marginBottom: 10 }} /></div>
        <div><input type="number" value={categoryId} onChange={e => setCategoryId(Number(e.target.value))} placeholder="Category ID" style={{ width: '100%', padding: 8, marginBottom: 10 }} /></div>
        <div><input value={lat} onChange={e => setLat(e.target.value)} placeholder="Latitude" style={{ width: '100%', padding: 8, marginBottom: 10 }} /></div>
        <div><input value={lon} onChange={e => setLon(e.target.value)} placeholder="Longitude" style={{ width: '100%', padding: 8, marginBottom: 10 }} /></div>
        <div><input value={address} onChange={e => setAddress(e.target.value)} placeholder="Address" style={{ width: '100%', padding: 8, marginBottom: 10 }} /></div>
        <button type="submit" disabled={loading} style={{ width: '100%', padding: 10 }}>{loading ? 'Creating...' : 'Create Business'}</button>
      </form>
    </div>
  );
};

export default CreateBusiness;
