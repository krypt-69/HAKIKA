import React, { useEffect, useState } from 'react';
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
    const { businessId } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [business, setBusiness] = useState<any>(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [address, setAddress] = useState('');
    const [lat, setLat] = useState('');
    const [lon, setLon] = useState('');
    const [paymentType, setPaymentType] = useState<'till' | 'paybill'>('till');
    const [accountNumber, setAccountNumber] = useState('');
    const [operatingHours, setOperatingHours] = useState<OperatingHour[]>([]);

    useEffect(() => {
        if (!businessId) return;
        api.businesses.get(businessId)
            .then(data => {
                setBusiness(data);
                // Populate form fields
                setName(data.name || '');
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
                // Operating hours: map response to state
                const hours = data.operating_hours || [];
                const defaultHours = DAYS.map((_, idx) => {
                    const found = hours.find(h => h.day_of_week === idx);
                    if (found) {
                        return {
                            day_of_week: idx,
                            opens_at: found.opens_at ? found.opens_at.slice(0, 5) : null,
                            closes_at: found.closes_at ? found.closes_at.slice(0, 5) : null,
                            is_closed: found.is_closed,
                        };
                    }
                    return {
                        day_of_week: idx,
                        opens_at: '08:00',
                        closes_at: '20:00',
                        is_closed: false,
                    };
                });
                setOperatingHours(defaultHours);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, [businessId]);

    const handleHourChange = (index: number, field: keyof OperatingHour, value: any) => {
        const updated = [...operatingHours];
        updated[index] = { ...updated[index], [field]: value };
        setOperatingHours(updated);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);
        try {
            const hoursToSend = operatingHours.map(h => ({
                day_of_week: h.day_of_week,
                opens_at: h.is_closed ? null : h.opens_at,
                closes_at: h.is_closed ? null : h.closes_at,
                is_closed: h.is_closed,
            }));
            await api.businesses.update(businessId!, {
                name,
                description,
                location: { lat: Number(lat), lon: Number(lon), address_text: address },
                operating_hours: hoursToSend,
                payment_method: { type: paymentType, account_number: accountNumber },
            });
            setSuccess('Profile updated successfully!');
            // Refresh business data to reflect changes
            const updated = await api.businesses.get(businessId!);
            setBusiness(updated);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Loading profile...</div>;
    if (error && !business) return <div style={{ color: 'red' }}>{error}</div>;

    return (
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <h1>Business Profile</h1>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {success && <p style={{ color: 'green' }}>{success}</p>}
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 10 }}>
                    <label>Business Name</label>
                    <input value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', padding: 8 }} />
                </div>
                <div style={{ marginBottom: 10 }}>
                    <label>Description</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} style={{ width: '100%', padding: 8 }} />
                </div>
                <div style={{ marginBottom: 10 }}>
                    <label>Address</label>
                    <input value={address} onChange={e => setAddress(e.target.value)} style={{ width: '100%', padding: 8 }} />
                </div>
                <div style={{ marginBottom: 10 }}>
                    <label>Latitude</label>
                    <input value={lat} onChange={e => setLat(e.target.value)} style={{ width: '100%', padding: 8 }} />
                </div>
                <div style={{ marginBottom: 10 }}>
                    <label>Longitude</label>
                    <input value={lon} onChange={e => setLon(e.target.value)} style={{ width: '100%', padding: 8 }} />
                </div>

                <h3>Operating Hours</h3>
                {DAYS.map((day, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                        <span style={{ width: 100 }}>{day}</span>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <input
                                type="checkbox"
                                checked={operatingHours[index]?.is_closed || false}
                                onChange={e => handleHourChange(index, 'is_closed', e.target.checked)}
                            />
                            Closed
                        </label>
                        {!operatingHours[index]?.is_closed && (
                            <>
                                <input
                                    type="time"
                                    value={operatingHours[index]?.opens_at || '08:00'}
                                    onChange={e => handleHourChange(index, 'opens_at', e.target.value)}
                                    style={{ padding: 4, width: 100 }}
                                />
                                <span>to</span>
                                <input
                                    type="time"
                                    value={operatingHours[index]?.closes_at || '20:00'}
                                    onChange={e => handleHourChange(index, 'closes_at', e.target.value)}
                                    style={{ padding: 4, width: 100 }}
                                />
                            </>
                        )}
                    </div>
                ))}

                <h3>Payment Method</h3>
                <div style={{ marginBottom: 10 }}>
                    <label>Payment Type</label>
                    <select value={paymentType} onChange={e => setPaymentType(e.target.value as 'till' | 'paybill')} style={{ width: '100%', padding: 8 }}>
                        <option value="till">Till Number</option>
                        <option value="paybill">PayBill</option>
                    </select>
                </div>
                <div style={{ marginBottom: 10 }}>
                    <label>Account Number</label>
                    <input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="e.g. 123456" style={{ width: '100%', padding: 8 }} />
                </div>

                <button type="submit" disabled={loading} style={{ padding: '10px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4 }}>
                    {loading ? 'Saving...' : 'Save Changes'}
                </button>
            </form>
        </div>
    );
};

export default Profile;
