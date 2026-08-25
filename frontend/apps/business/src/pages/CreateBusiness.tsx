import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Config } from '@hakika/config';
import { useAuth } from '../AuthContext';
import { api } from '../api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface OperatingHour {
    day_of_week: number;
    opens_at: string;
    closes_at: string;
    is_closed: boolean;
}

const CreateBusiness: React.FC = () => {
  const navigate = useNavigate();
    const { businessId, refreshBusiness } = useAuth();
    const [paymentModel, setPaymentModel] = useState<'credit' | 'pay_as_you_go'>('credit');
    const [name, setName] = useState('');
    const [categoryId, setCategoryId] = useState(1);
    const [lat, setLat] = useState('-1.286');
    const [lon, setLon] = useState('36.817');
    const [address, setAddress] = useState('');
    const [paymentType, setPaymentType] = useState<'till' | 'paybill'>('till');
    const [accountNumber, setAccountNumber] = useState('');
    const [paybillShortCode, setPaybillShortCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [gpsLoading, setGpsLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
    const [success, setSuccess] = useState('');

    const [operatingHours, setOperatingHours] = useState<OperatingHour[]>(
        DAYS.map((_, index) => ({
            day_of_week: index,
            opens_at: '08:00',
            closes_at: '20:00',
            is_closed: false,
        }))
    );

    useEffect(() => {
        api.categories().then(data => {
            setCategories(data || []);
            if (data && data.length > 0 && categoryId === 1) {
                setCategoryId(data[0].id);
            }
        }).catch(() => {});
    }, []);

    if (businessId) {
        navigate('/', { replace: true });
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

    const handleHourChange = (index: number, field: keyof OperatingHour, value: any) => {
        const updated = [...operatingHours];
        updated[index] = { ...updated[index], [field]: value };
        setOperatingHours(updated);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accountNumber.trim()) {
            setError('Account number is required');
            return;
        }
        const hoursToSend = operatingHours.map(h => ({
            day_of_week: h.day_of_week,
            opens_at: h.is_closed ? null : h.opens_at,
            closes_at: h.is_closed ? null : h.closes_at,
            is_closed: h.is_closed,
        }));

        setError('');
        setLoading(true);
        try {
            await api.businesses.create({
                name,
                category_id: Number(categoryId),
                location: { lat: Number(lat), lon: Number(lon), address_text: address },
                operating_hours: hoursToSend,
                payment_method: { type: paymentType, account_number: accountNumber.trim(), paybill_short_code: paymentType === 'paybill' ? paybillShortCode.trim() : undefined },
                payment_model: paymentModel,
            });

            await refreshBusiness();
            setSuccess(paymentModel === 'credit'
                ? 'Business created successfully! Your payment channel has been registered and a free trial has been applied.'
                : 'Business created successfully!');
            setTimeout(() => {
                navigate('/', { replace: true });
            }, 2000);
        } catch (err: any) {
            const msg = err?.message || err?.response?.data?.error?.message || '';
            const code = err?.response?.data?.error?.code || err?.code;
            // If the user already has a business, refresh auth and redirect if a business now exists
            if (msg.includes('already have a business') || err?.response?.status === 400) {
                await refreshBusiness();
                // refreshBusiness updates the auth state; if a businessId is now present, navigate to dashboard
                // We need to check the updated auth state – we can call useAuth again, but we don't have access here.
                // Instead, we'll manually check /auth/me and redirect.
                try {
                    const token = localStorage.getItem('hakika_business_token');
                    const meResp = await fetch(`${Config.API_BASE}/auth/me`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (meResp.ok) {
                        const meData = await meResp.json();
                        if (meData.business_id) {
                            navigate('/', { replace: true });
                            return;
                        }
                    }
                } catch {}
                setError('You already have a business. Redirecting to your dashboard...');
                setTimeout(() => navigate('/', { replace: true }), 2000);
                return;
            }
            if (code === 'CHANNEL_REGISTRATION_FAILED') {
                setError('Unable to register your payment channel. Please check your payment details and try again.');
            } else {
                setError(msg || 'Registration failed');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 600, margin: '40px auto', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
    <h1 style={{ margin: 0 }}>Create Your Business</h1>
    <button
      type="button"
      onClick={() => navigate('/login')}
      style={{
        padding: '8px 16px',
        background: 'transparent',
        border: '1px solid #d1d5db',
        borderRadius: 6,
        color: '#6b7280',
        fontSize: 14,
        fontWeight: 500,
        cursor: 'pointer',
      }}
    >
      ← Back to Login
    </button>
  </div>
            {success && <p style={{ color: 'green', background: '#dcfce7', padding: 10, borderRadius: 4 }}>{success}</p>}
            {success && <p style={{ color: 'green', background: '#dcfce7', padding: 10, borderRadius: 4 }}>{success}</p>}

            <div style={{ marginBottom: 20 }}>
                <h3 style={{ marginBottom: 12 }}>How do you want to receive payments?</h3>
                <label style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 12, cursor: 'pointer' }}>
                    <input
                        type="radio"
                        name="paymentModel"
                        value="credit"
                        checked={paymentModel === 'credit'}
                        onChange={() => setPaymentModel('credit')}
                        style={{ marginTop: 3, marginRight: 8 }}
                    />
                    <div>
                        <strong>Receive payments directly to my Till/Paybill (Credit)</strong>
                        <p style={{ color: '#666', fontSize: '0.9rem', margin: '4px 0 0' }}>
                            PayHero will verify and register your payment channel. A free trial will be applied automatically.
                        </p>
                    </div>
                </label>
                <label style={{ display: 'flex', alignItems: 'flex-start', cursor: 'pointer' }}>
                    <input
                        type="radio"
                        name="paymentModel"
                        value="pay_as_you_go"
                        checked={paymentModel === 'pay_as_you_go'}
                        onChange={() => setPaymentModel('pay_as_you_go')}
                        style={{ marginTop: 3, marginRight: 8 }}
                    />
                    <div>
                        <strong>Hakika collects payments on my behalf (Pay-As-You-Go)</strong>
                        <p style={{ color: '#666', fontSize: '0.9rem', margin: '4px 0 0' }}>
                            Best for occasional sellers and businesses without a dedicated Till/Paybill setup.
                        </p>
                    </div>
                </label>
            </div>

            <form onSubmit={handleSubmit}>
                <div><input value={name} onChange={e => setName(e.target.value)} placeholder="Business Name" required style={{ width: '100%', padding: 8, marginBottom: 10 }} /></div>
                <div>
  <label>Category</label>
  <select value={categoryId} onChange={e => setCategoryId(Number(e.target.value))} style={{ width: '100%', padding: 8, marginTop: 4, marginBottom: 10 }}>
    {categories.map((cat: any) => (
      <option key={cat.id} value={cat.id}>{cat.name}</option>
    ))}
  </select>
</div>

                <div style={{ marginBottom: 10 }}>
                    <label>Latitude</label>
                    <input value={lat} onChange={e => setLat(e.target.value)} placeholder="Latitude" style={{ width: '100%', padding: 8, marginTop: 4 }} />
                </div>
                <div style={{ marginBottom: 10 }}>
                    <label>Longitude</label>
                    <input value={lon} onChange={e => setLon(e.target.value)} placeholder="Longitude" style={{ width: '100%', padding: 8, marginTop: 4 }} />
                </div>
                <button type="button" onClick={handleUseLocation} disabled={gpsLoading} style={{ padding: '8px 16px', marginBottom: 10 }}>
                    {gpsLoading ? 'Locating...' : 'Use My Location'}
                </button>

                <div><input value={address} onChange={e => setAddress(e.target.value)} placeholder="Address" style={{ width: '100%', padding: 8, marginBottom: 10 }} /></div>

                <h3 style={{ marginTop: 20 }}>Operating Hours</h3>
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
                                    value={operatingHours[index].opens_at}
                                    onChange={e => handleHourChange(index, 'opens_at', e.target.value)}
                                    style={{ padding: 4, width: 100 }}
                                />
                                <span>to</span>
                                <input
                                    type="time"
                                    value={operatingHours[index].closes_at}
                                    onChange={e => handleHourChange(index, 'closes_at', e.target.value)}
                                    style={{ padding: 4, width: 100 }}
                                />
                            </>
                        )}
                    </div>
                ))}

                <h3 style={{ marginTop: 20 }}>Payment Details</h3>
                <div style={{ marginBottom: 10 }}>
                    <label>Payment Type</label>
                    <select value={paymentType} onChange={e => setPaymentType(e.target.value as 'till' | 'paybill')} style={{ width: '100%', padding: 8, marginTop: 4 }}>
                        <option value="till">Till Number</option>
                        <option value="paybill">PayBill</option>
                    </select>
                </div>
                {paymentType === 'paybill' && (
                    <div style={{ marginBottom: 10 }}>
                        <label>PayBill Number (Short Code)</label>
                        <input
                            value={paybillShortCode}
                            onChange={e => setPaybillShortCode(e.target.value)}
                            placeholder="e.g. 522533"
                            required
                            style={{ width: '100%', padding: 8, marginTop: 4 }}
                        />
                    </div>
                )}
                <div style={{ marginBottom: 10 }}>
                    <label>Account Number</label>
                    <input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="e.g. 123456" required style={{ width: '100%', padding: 8, marginTop: 4 }} />
                </div>

                <button type="submit" disabled={loading} style={{ width: '100%', padding: 10, marginTop: 20 }}>
                    {loading ? 'Creating...' : 'Create Business'}
                </button>
            </form>
        </div>
    );
};

export default CreateBusiness;
