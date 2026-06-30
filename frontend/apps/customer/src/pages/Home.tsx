import React, { useEffect, useState } from 'react';
import { useCustomerAuth } from '../auth/CustomerAuthContext';

interface BusinessCard {
  id: string;
  name: string;
  category_id: number;
  description: string | null;
  trust_score: number;
  logo_url: string | null;
  distance_meters: number;
  location: { lat: number; lon: number } | null;
}

const Home: React.FC = () => {
  const { session, logout } = useCustomerAuth();
  const [businesses, setBusinesses] = useState<BusinessCard[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [manualLat, setManualLat] = useState('-1.286');
  const [manualLon, setManualLon] = useState('36.817');

  useEffect(() => {
    fetch('http://localhost:8000/api/v1/categories')
      .then(r => r.json())
      .then(data => setCategories(data || []));
  }, []);

  const fetchBusinesses = async (lat: number, lon: number, catId?: number) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ lat: String(lat), lon: String(lon) });
      if (catId) params.set('category_id', String(catId));
      const resp = await fetch(`http://localhost:8000/api/v1/businesses/discover?${params.toString()}`);
      const data = await resp.json();
      if (!Array.isArray(data)) throw new Error('Invalid response');
      setBusinesses(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUseRealGPS = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setLocation(loc);
        fetchBusinesses(loc.lat, loc.lon, selectedCategory);
      },
      () => setError('Location denied. Use manual coordinates below.')
    );
  };

  const handleUseManual = () => {
    const lat = parseFloat(manualLat);
    const lon = parseFloat(manualLon);
    if (isNaN(lat) || isNaN(lon)) return setError('Invalid coordinates');
    const loc = { lat, lon };
    setLocation(loc);
    fetchBusinesses(lat, lon, selectedCategory);
  };

  const handleCategoryChange = (catId: number | undefined) => {
    setSelectedCategory(catId);
    if (location) fetchBusinesses(location.lat, location.lon, catId);
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Hakika</h1>
        <div>
          <span>{session?.phone}</span>
          <button onClick={logout} style={{ marginLeft: 12 }}>Logout</button>
        </div>
      </div>

      {/* Category filter */}
      <div style={{ margin: '20px 0' }}>
        <select onChange={e => handleCategoryChange(e.target.value ? Number(e.target.value) : undefined)} value={selectedCategory || ''}>
          <option value="">All Categories</option>
          {categories.map((cat: any) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Location controls */}
      <div style={{ marginBottom: 20, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={handleUseRealGPS}>Use My Real Location</button>
        <span>or enter coordinates:</span>
        <input value={manualLat} onChange={e => setManualLat(e.target.value)} placeholder="Lat" style={{ width: 80 }} />
        <input value={manualLon} onChange={e => setManualLon(e.target.value)} placeholder="Lon" style={{ width: 80 }} />
        <button onClick={handleUseManual}>Search</button>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {loading && <p>Loading...</p>}

      {location && !loading && businesses.length === 0 && (
        <p>No businesses found near ({location.lat.toFixed(4)}, {location.lon.toFixed(4)}). Try different coordinates.</p>
      )}

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {businesses.map((biz) => (
          <div key={biz.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, cursor: 'pointer' }}
               onClick={() => window.location.href = `/business/${biz.id}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>{biz.name}</h3>
              <span style={{ background: '#eee', padding: '4px 8px', borderRadius: 4, fontSize: '0.8em' }}>
                ⭐ {biz.trust_score?.toFixed(0)}%
              </span>
            </div>
            <p style={{ color: '#666', margin: '8px 0' }}>
              {biz.distance_meters ? `${(biz.distance_meters / 1000).toFixed(1)} km away` : ''}
            </p>
            {biz.description && <p style={{ fontSize: '0.9em' }}>{biz.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Home;
