import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { api } from '../api';

const CreateBusiness: React.FC = () => {
  const { businessId, refreshBusiness } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState(1);
  const [lat, setLat] = useState('-1.286');
  const [lon, setLon] = useState('36.817');
  const [address, setAddress] = useState('');
  const [paymentType, setPaymentType] = useState<'till' | 'paybill'>('till');
  const [accountNumber, setAccountNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  if (businessId) {
    navigate('/products', { replace: true });
    return null;
  }

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLon(pos.coords.longitude.toFixed(6));
        setGpsLoading(false);
        setError('');
      },
      (err) => {
        setError('Unable to retrieve your location. Please enter coordinates manually.');
        setGpsLoading(false);
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountNumber.trim()) {
      setError('Account number is required');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.businesses.create({
        name,
        category_id: Number(categoryId),
        location: { lat: Number(lat), lon: Number(lon), address_text: address },
        operating_hours: [{ day_of_week: 0, opens_at: '08:00', closes_at: '20:00', is_closed: false }],
        payment_method: { type: paymentType, account_number: accountNumber.trim() }
      });

      await refreshBusiness();
      navigate('/products', { replace: true });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: '40px auto', padding: 20 }}>
      <h1>Create Your Business</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <div><input value={name} onChange={e => setName(e.target.value)} placeholder="Business Name" required style={{ width: '100%', padding: 8, marginBottom: 10 }} /></div>
        <div><input type="number" value={categoryId} onChange={e => setCategoryId(Number(e.target.value))} placeholder="Category ID" style={{ width: '100%', padding: 8, marginBottom: 10 }} /></div>
        
        <div style={{ marginBottom: 10 }}>
          <label>Latitude</label>
          <input value={lat} onChange={e => setLat(e.target.value)} placeholder="Latitude" style={{ width: '100%', padding: 8, marginTop: 4 }} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label>Longitude</label>
          <input value={lon} onChange={e => setLon(e.target.value)} placeholder="Longitude" style={{ width: '100%', padding: 8, marginTop: 4 }} />
        </div>
        <button type="button" onClick={handleUseLocation} disabled={gpsLoading} style={{ padding: '8px 16px', marginBottom: 10 }}>
          {gpsLoading ? 'Locating...' : '📍 Use My Location'}
        </button>

        <div><input value={address} onChange={e => setAddress(e.target.value)} placeholder="Address" style={{ width: '100%', padding: 8, marginBottom: 10 }} /></div>
        
        <h3 style={{ marginTop: 20 }}>Payment Details</h3>
        <div style={{ marginBottom: 10 }}>
          <label>Payment Type</label>
          <select value={paymentType} onChange={e => setPaymentType(e.target.value as 'till' | 'paybill')} style={{ width: '100%', padding: 8, marginTop: 4 }}>
            <option value="till">Till Number</option>
            <option value="paybill">PayBill</option>
          </select>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label>Account Number</label>
          <input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="e.g. 123456" required style={{ width: '100%', padding: 8, marginTop: 4 }} />
        </div>

        <button type="submit" disabled={loading} style={{ width: '100%', padding: 10, marginTop: 20 }}>{loading ? 'Creating...' : 'Create Business'}</button>
      </form>
    </div>
  );
};

export default CreateBusiness;
