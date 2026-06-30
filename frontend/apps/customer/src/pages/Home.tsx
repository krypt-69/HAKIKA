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

  const fetchDiscovery = async () => {
    const response = await fetch('http://localhost:8000/api/v1/categories');
    const cats = await response.json();
    setCategories(cats || []);
  };

  useEffect(() => { fetchDiscovery(); }, []);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        fetchBusinesses(pos.coords.latitude, pos.coords.longitude, selectedCategory);
      },
      (err) => setError('Location access denied. Enable GPS or search manually.')
    );
  };

  const fetchBusinesses = async (lat: number, lon: number, categoryId?: number) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ lat: String(lat), lon: String(lon) });
      if (categoryId) params.set('category_id', String(categoryId));
      const resp = await fetch(`http://localhost:8000/api/v1/businesses/discover?${params.toString()}`);
      const data = await resp.json();
      setBusinesses(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (catId: number | undefined) => {
    setSelectedCategory(catId);
    if (location) fetchBusinesses(location.lat, location.lon, catId);
  };

  return (
    <div style={{ padding: 20 }}>
      {/* Header */}
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

      {/* Location button */}
      {!location && (
        <button onClick={requestLocation} style={{ padding: '10px 20px', marginBottom: 20 }}>
          Find Businesses Near Me
        </button>
      )}
      {location && (
        <p style={{ color: '#666', marginBottom: 10 }}>
          Showing businesses near you
          <button onClick={requestLocation} style={{ marginLeft: 12 }}>Refresh</button>
        </p>
      )}

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* Business list */}
      {loading && <p>Loading...</p>}
      {!loading && businesses.length === 0 && location && <p>No businesses found nearby.</p>}

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
