import React, { useEffect, useState } from 'react';
import { api } from '../api';

interface BusinessCard {
    id: string;
    name: string;
    category_id: number;
    description: string | null;
    trust_score: number;
    logo_url: string | null;
    distance_meters: number;
    location: { lat: number; lon: number } | null;
    slug: string;   // ← REQUIRED
}

const Home: React.FC = () => {
    const [businesses, setBusinesses] = useState<BusinessCard[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<number | undefined>();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
    const [manualLat, setManualLat] = useState('-1.286');
    const [manualLon, setManualLon] = useState('36.817');
    const [searchText, setSearchText] = useState('');

    useEffect(() => {
        api.categories().then(setCategories).catch(() => {});
    }, []);

    const fetchBusinesses = async (lat: number, lon: number, catId?: number) => {
        setLoading(true);
        setError('');
        try {
            const data = await api.discover(lat, lon, 5000, catId);
            console.log('Discovery data:', data); // debug
            setBusinesses(data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUseGPS = () => {
        navigator.geolocation?.getCurrentPosition(
            pos => {
                const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
                setLocation(loc);
                fetchBusinesses(loc.lat, loc.lon, selectedCategory);
            },
            () => setError('Location access denied.')
        );
    };

    const handleManualSearch = () => {
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

    const filtered = businesses.filter(b =>
        b.name.toLowerCase().includes(searchText.toLowerCase()) ||
        (b.description || '').toLowerCase().includes(searchText.toLowerCase())
    );

    return (
        <div style={{ padding: 20 }}>
            <h1>Hakika</h1>

            <div style={{ margin: '20px 0' }}>
                <input
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    placeholder="Search businesses..."
                    style={{ width: '100%', padding: 12, fontSize: 16 }}
                />
            </div>

            <select onChange={e => handleCategoryChange(e.target.value ? Number(e.target.value) : undefined)}>
                <option value="">All Categories</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <div style={{ margin: '20px 0', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <button onClick={handleUseGPS}>📍 Use My Location</button>
                <span>or enter coordinates:</span>
                <input value={manualLat} onChange={e => setManualLat(e.target.value)} placeholder="Lat" style={{ width: 80 }} />
                <input value={manualLon} onChange={e => setManualLon(e.target.value)} placeholder="Lon" style={{ width: 80 }} />
                <button onClick={handleManualSearch}>Search</button>
            </div>

            {error && <p style={{ color: 'red' }}>{error}</p>}
            {loading && <p>Loading...</p>}

            <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                {filtered.map(biz => (
                    <a key={biz.id} href={`/b/${biz.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, cursor: 'pointer' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0 }}>{biz.name}</h3>
                                <span style={{ background: '#eee', padding: '4px 8px', borderRadius: 4, fontSize: '0.8em' }}>
                                    ⭐ {biz.trust_score?.toFixed(0)}%
                                </span>
                            </div>
                            {biz.distance_meters && <p style={{ color: '#666', margin: '8px 0' }}>{(biz.distance_meters / 1000).toFixed(1)} km away</p>}
                            {biz.description && <p style={{ fontSize: '0.9em' }}>{biz.description}</p>}
                        </div>
                    </a>
                ))}
                {!loading && filtered.length === 0 && <p>No businesses found. Try different coordinates or search terms.</p>}
            </div>
        </div>
    );
};

export default Home;
