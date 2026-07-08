import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { api } from '../api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface OperatingHour {
    day_of_week: number;
    opens_at: string | null;
    closes_at: string | null;
    is_closed: boolean;
}

const Profile: React.FC = () => {
    const { businessId, refreshBusiness } = useAuth();
    const [business, setBusiness] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editMode, setEditMode] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [address, setAddress] = useState('');
    const [lat, setLat] = useState('');
    const [lon, setLon] = useState('');
    const [paymentType, setPaymentType] = useState<'till' | 'paybill'>('till');
    const [accountNumber, setAccountNumber] = useState('');
    const [operatingHours, setOperatingHours] = useState<OperatingHour[]>([]);
    const [saving, setSaving] = useState(false);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!businessId) return;
        api.businesses.get(businessId)
            .then(data => {
                setBusiness(data);
                setName(data.name);
                setDescription(data.description || '');
                const loc = data.locations?.[0];
                if (loc) {
                    setAddress(loc.address_text || '');
                    setLat(String(loc.lat));
                    setLon(String(loc.lon));
                }
                const pm = data.payment_methods?.[0];
                if (pm) {
                    setPaymentType(pm.type);
                    setAccountNumber(pm.last_four_digits || '');
                }
                const hours = data.operating_hours || [];
                const fullHours = DAYS.map((_, idx) => {
                    const existing = hours.find(h => h.day_of_week === idx);
                    return existing || { day_of_week: idx, opens_at: null, closes_at: null, is_closed: true };
                });
                setOperatingHours(fullHours);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, [businessId]);

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLogoFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setLogoPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setCoverFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setCoverPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const uploadImage = async (type: 'logo' | 'cover') => {
        if (!businessId) return;
        const file = type === 'logo' ? logoFile : coverFile;
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        const endpoint = type === 'logo' ? `/api/v1/businesses/${businessId}/logo` : `/api/v1/businesses/${businessId}/cover`;
        await fetch(endpoint, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: formData,
        });
    };

    const handleHourChange = (index: number, field: keyof OperatingHour, value: any) => {
        const updated = [...operatingHours];
        updated[index] = { ...updated[index], [field]: value };
        setOperatingHours(updated);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!businessId) return;
        setError('');
        setSaving(true);
        try {
            const hoursToSend = operatingHours.map(h => ({
                day_of_week: h.day_of_week,
                opens_at: h.is_closed ? null : h.opens_at,
                closes_at: h.is_closed ? null : h.closes_at,
                is_closed: h.is_closed,
            }));
            await api.businesses.update(businessId, {
                name,
                description,
                location: { lat: Number(lat), lon: Number(lon), address_text: address },
                operating_hours: hoursToSend,
                payment_method: { type: paymentType, account_number: accountNumber }
            });
            // Upload images if any
            if (logoFile) await uploadImage('logo');
            if (coverFile) await uploadImage('cover');
            await refreshBusiness();
            setEditMode(false);
            const data = await api.businesses.get(businessId);
            setBusiness(data);
            setLogoFile(null);
            setCoverFile(null);
            setLogoPreview(null);
            setCoverPreview(null);
            setLoading(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>Loading...</div>;
    if (error) return <div style={{ color: 'red' }}>{error}</div>;
    if (!business) return <div>Business not found.</div>;

    const logoSrc = `http://localhost:8000/api/v1/businesses/${business.id}/logo?t=${Date.now()}`;
    const coverSrc = `http://localhost:8000/api/v1/businesses/${business.id}/cover?t=${Date.now()}`;

    return (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <h1>Business Profile</h1>
            {!editMode ? (
                <div>
                    <div style={{ border: '1px solid #ddd', padding: 20, borderRadius: 8 }}>
                        <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 16 }}>
                            <img src={logoSrc} style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, border: '1px solid #ddd' }} 
                                 onError={e => { e.currentTarget.style.display = 'none'; }} />
                            <div>
                                <h2>{business.name}</h2>
                                <p><strong>Description:</strong> {business.description || 'N/A'}</p>
                            </div>
                        </div>
                        <img src={coverSrc} style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 8, marginBottom: 16 }}
                             onError={e => { e.currentTarget.style.display = 'none'; }} />
                        <p><strong>Location:</strong> {business.locations?.[0]?.address_text || 'N/A'}</p>
                        <p><strong>Coordinates:</strong> {business.locations?.[0]?.lat}, {business.locations?.[0]?.lon}</p>
                        <h3>Payment Methods</h3>
                        {business.payment_methods?.map((pm: any) => (
                            <div key={pm.id}>Type: {pm.type} - Last 4: {pm.last_four_digits}</div>
                        ))}
                        <h3>Operating Hours</h3>
                        {business.operating_hours?.map((h: any) => (
                            <div key={h.day_of_week}>
                                {DAYS[h.day_of_week]}: {h.is_closed ? 'Closed' : `${h.opens_at?.slice(0,5)} - ${h.closes_at?.slice(0,5)}`}
                            </div>
                        ))}
                    </div>
                    <button onClick={() => setEditMode(true)} style={{ marginTop: 20, padding: '10px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4 }}>
                        Edit Profile
                    </button>
                </div>
            ) : (
                <form onSubmit={handleSave}>
                    <div><input value={name} onChange={e => setName(e.target.value)} placeholder="Business Name" required style={{ width: '100%', padding: 8, marginBottom: 10 }} /></div>
                    <div><textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" style={{ width: '100%', padding: 8, marginBottom: 10 }} /></div>
                    
                    <h3>Images</h3>
                    <div style={{ display: 'flex', gap: 20, marginBottom: 10 }}>
                        <div>
                            <label>Logo</label>
                            <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'block', marginTop: 4 }} />
                            {logoPreview && <img src={logoPreview} style={{ width: 100, height: 100, objectFit: 'cover', marginTop: 8, border: '1px solid #ddd' }} />}
                            {business.logo_url && !logoPreview && (
                                <img src={logoSrc} style={{ width: 100, height: 100, objectFit: 'cover', marginTop: 8, border: '1px solid #ddd' }} />
                            )}
                        </div>
                        <div>
                            <label>Cover Image</label>
                            <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverChange} style={{ display: 'block', marginTop: 4 }} />
                            {coverPreview && <img src={coverPreview} style={{ width: 200, height: 100, objectFit: 'cover', marginTop: 8, border: '1px solid #ddd' }} />}
                            {business.cover_url && !coverPreview && (
                                <img src={coverSrc} style={{ width: 200, height: 100, objectFit: 'cover', marginTop: 8, border: '1px solid #ddd' }} />
                            )}
                        </div>
                    </div>

                    <div><input value={address} onChange={e => setAddress(e.target.value)} placeholder="Address" style={{ width: '100%', padding: 8, marginBottom: 10 }} /></div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <input value={lat} onChange={e => setLat(e.target.value)} placeholder="Latitude" style={{ flex: 1, padding: 8 }} />
                        <input value={lon} onChange={e => setLon(e.target.value)} placeholder="Longitude" style={{ flex: 1, padding: 8 }} />
                    </div>
                    <h3>Payment Details</h3>
                    <select value={paymentType} onChange={e => setPaymentType(e.target.value as 'till' | 'paybill')} style={{ width: '100%', padding: 8, marginBottom: 10 }}>
                        <option value="till">Till Number</option>
                        <option value="paybill">PayBill</option>
                    </select>
                    <input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="Account Number" style={{ width: '100%', padding: 8, marginBottom: 10 }} />
                    <h3>Operating Hours</h3>
                    {DAYS.map((day, index) => (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                            <span style={{ width: 100 }}>{day}</span>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <input
                                    type="checkbox"
                                    checked={operatingHours[index].is_closed}
                                    onChange={e => handleHourChange(index, 'is_closed', e.target.checked)}
                                />
                                Closed
                            </label>
                            {!operatingHours[index].is_closed && (
                                <>
                                    <input
                                        type="time"
                                        value={operatingHours[index].opens_at || ''}
                                        onChange={e => handleHourChange(index, 'opens_at', e.target.value)}
                                        style={{ padding: 4, width: 100 }}
                                    />
                                    <span>to</span>
                                    <input
                                        type="time"
                                        value={operatingHours[index].closes_at || ''}
                                        onChange={e => handleHourChange(index, 'closes_at', e.target.value)}
                                        style={{ padding: 4, width: 100 }}
                                    />
                                </>
                            )}
                        </div>
                    ))}
                    {error && <p style={{ color: 'red' }}>{error}</p>}
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button type="submit" disabled={saving} style={{ padding: '10px 20px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4 }}>
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button type="button" onClick={() => { setEditMode(false); window.location.reload(); }} style={{ padding: '10px 20px', background: '#ccc', border: 'none', borderRadius: 4 }}>
                            Cancel
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default Profile;
