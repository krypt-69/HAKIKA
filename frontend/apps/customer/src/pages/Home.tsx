import React, { useEffect, useState } from 'react';
import { api } from '../api';

interface BusinessCard {
    id: string;
    name: string;
    category_name: string;
    description: string | null;
    trust_score: number;
    logo_url: string | null;
    slug: string | null;
    distance_meters: number;
    location: { lat: number; lon: number } | null;
    address_text: string | null;
    cover_url: string;
    operating_hours: { day_of_week: number; opens_at: string | null; closes_at: string | null; is_closed: boolean }[];
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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
    const [gpsEnabled, setGpsEnabled] = useState(false);

    useEffect(() => {
        api.categories().then(setCategories).catch(() => {});
    }, []);

    const fetchBusinesses = async (lat: number, lon: number, catId?: number) => {
        setLoading(true);
        setError('');
        try {
            const data = await api.discover(lat, lon, 5000, catId);
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
                setGpsEnabled(true);
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
        setGpsEnabled(false);
        fetchBusinesses(lat, lon, selectedCategory);
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
                    <a key={biz.id} href={`/b/${biz.slug ? biz.slug : biz.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div style={{ border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden', cursor: 'pointer' }}>
                            {/* Cover image */}
                            <img
                                src={`http://localhost:8000${biz.cover_url}`}
                                style={{ width: '100%', height: 120, objectFit: 'cover' }}
                                onError={e => { e.currentTarget.style.display = 'none'; }}
                            />
                            <div style={{ padding: 12 }}>
                                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                                    <img
                                        src={`http://localhost:8000/api/v1/businesses/${biz.id}/logo`}
                                        style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4, border: '1px solid #ddd' }}
                                        onError={e => { e.currentTarget.style.display = 'none'; }}
                                    />
                                    <div>
                                        <h3 style={{ margin: 0 }}>{biz.name}</h3>
                                        <p style={{ margin: 0, fontSize: '0.9em', color: '#666' }}>{biz.category_name}</p>
                                    </div>
                                </div>
                                {biz.description && <p style={{ fontSize: '0.9em', margin: '0 0 8px 0' }}>{biz.description}</p>}
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9em' }}>
                                    <span>⭐ {biz.trust_score?.toFixed(0)}%</span>
                                    {biz.address_text && <span>📍 {biz.address_text}</span>}
                                    {gpsEnabled && biz.distance_meters ? (
                                        <span>{(biz.distance_meters / 1000).toFixed(1)} km</span>
                                    ) : null}
                                </div>
                                {biz.operating_hours?.length > 0 && (
                                    <div style={{ marginTop: 8, fontSize: '0.8em', color: '#888' }}>
                                        {biz.operating_hours.slice(0, 3).map(h => (
                                            <span key={h.day_of_week} style={{ marginRight: 8 }}>
                                                {DAYS[h.day_of_week]}: {h.is_closed ? 'Closed' : `${h.opens_at?.slice(0,5)}-${h.closes_at?.slice(0,5)}`}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </a>
                ))}
                {!loading && filtered.length === 0 && <p>No businesses found.</p>}
            </div>
        </div>
    );
};

export default Home;
