import { Config } from "@hakika/config";
import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { api } from '../api';
import {
  MapPin,
  CreditCard,
  Clock,
  Camera,
  Edit3,
  Save,
  X as XIcon,
  Building2,
  Navigation,
} from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface OperatingHour {
    day_of_week: number;
    opens_at: string | null;
    closes_at: string | null;
    is_closed: boolean;
}

const BLACK = '#111111';
const GREEN = '#16a34a';
const GREEN_LIGHT = '#dcfce7';
const GREY = '#6b7280';
const GREY_LIGHT = '#f3f4f6';
const RED = '#dc2626';

const Profile: React.FC = () => {
    const { businessId, refreshBusiness, paymentModel } = useAuth();
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
    const [paybillShortCode, setPaybillShortCode] = useState('');
    const [operatingHours, setOperatingHours] = useState<OperatingHour[]>([]);
    const [saving, setSaving] = useState(false);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);
    const [collectPaymentBeforeDelivery, setCollectPaymentBeforeDelivery] = useState(false);

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
          setPaybillShortCode(pm.paybill_short_code || '');
                }
                const hours = data.operating_hours || [];
                const fullHours = DAYS.map((_, idx) => {
                    const existing = hours.find((h: any) => h.day_of_week === idx);
                    return existing || { day_of_week: idx, opens_at: null, closes_at: null, is_closed: true };
                });
                setOperatingHours(fullHours);
                setCollectPaymentBeforeDelivery(data.collect_payment_before_delivery || false);
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
            headers: { 'Authorization': `Bearer ${localStorage.getItem('hakika_business_token')}` },
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
                payment_method: { type: paymentType, account_number: accountNumber, paybill_short_code: paymentType === 'paybill' ? paybillShortCode : undefined },
                collect_payment_before_delivery: collectPaymentBeforeDelivery,
            });
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

    if (loading) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px', color: GREY }}>
          Loading...
        </div>
      );
    }
    if (error) {
      return (
        <div style={{ background: '#fef2f2', color: RED, padding: '12px 16px', borderRadius: 10, fontWeight: 500 }}>
          {error}
        </div>
      );
    }
    if (!business) return <div style={{ color: GREY }}>Business not found.</div>;

    const logoSrc = `${Config.API_BASE}/businesses/${business.id}/logo?t=${Date.now()}`;
    const coverSrc = `${Config.API_BASE}/businesses/${business.id}/cover?t=${Date.now()}`;

    return (
        <div className="profile-page">
            <h1 className="page-title">Business Profile</h1>

            {!editMode ? (
                <div className="view-mode">
                    {/* Hero: cover + logo + name */}
                    <div className="hero-card">
                        <div
                          className="cover-img"
                          style={{ backgroundImage: `url(${coverSrc})` }}
                        />
                        <div className="hero-content">
                            <img
                              src={logoSrc}
                              className="logo-img"
                              onError={e => { e.currentTarget.style.visibility = 'hidden'; }}
                            />
                            <div className="hero-text">
                                <h2 className="business-name">{business.name}</h2>
                                <p className="business-desc">{business.description || 'No description yet'}</p>
                            </div>
                            <button className="edit-btn" onClick={() => setEditMode(true)}>
                                <Edit3 size={15} /> Edit Profile
                            </button>
                        </div>
                    </div>

                    {/* Info cards grid */}
                    <div className="info-grid">
                        <div className="info-card">
                            <h3 className="card-heading"><MapPin size={16} color={GREEN} /> Location</h3>
                            <p className="info-main">{business.locations?.[0]?.address_text || 'N/A'}</p>
                            <p className="info-sub">
                              <Navigation size={12} /> {business.locations?.[0]?.lat}, {business.locations?.[0]?.lon}
                            </p>
                        </div>

                        <div className="info-card">
                            <h3 className="card-heading"><CreditCard size={16} color={GREEN} /> Payments</h3>
                            <p className="info-sub-row">
                              <span>Model</span>
                              <span className="pill">{business.payment_model === 'credit' ? 'Credit' : business.payment_model === 'pay_as_you_go' ? 'Pay-As-You-Go' : 'Unknown'}</span>
                            </p>
                            <p className="info-sub-row">
                              <span>Collection</span>
                              <span className="pill">{business.collect_payment_before_delivery ? 'Before delivery' : 'After delivery'}</span>
                            </p>
                            {business.payment_methods?.map((pm: any) => (
                                <p key={pm.id} className="info-sub" style={{ marginTop: 8 }}>
                                    {pm.type === 'paybill' ? 'PayBill' : 'Till'}
                                    {pm.paybill_short_code ? ` · ${pm.paybill_short_code}` : ''} · ****{pm.last_four_digits}
                                </p>
                            ))}
                        </div>

                        <div className="info-card info-card-wide">
                            <h3 className="card-heading"><Clock size={16} color={GREEN} /> Operating Hours</h3>
                            <div className="hours-grid">
                                {business.operating_hours?.map((h: any) => (
                                    <div key={h.day_of_week} className="hours-row">
                                        <span className="hours-day">{DAYS_SHORT[h.day_of_week]}</span>
                                        {h.is_closed ? (
                                          <span className="hours-closed">Closed</span>
                                        ) : (
                                          <span className="hours-open">{h.opens_at?.slice(0,5)} – {h.closes_at?.slice(0,5)}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSave} className="edit-form">
                    <div className="form-card">
                        <h3 className="card-heading"><Building2 size={16} color={GREEN} /> Basic Info</h3>
                        <input
                          className="text-input"
                          value={name}
                          onChange={e => setName(e.target.value)}
                          placeholder="Business Name"
                          required
                        />
                        <textarea
                          className="text-input textarea"
                          value={description}
                          onChange={e => setDescription(e.target.value)}
                          placeholder="Description"
                        />
                    </div>

                    <div className="form-card">
                        <h3 className="card-heading"><Camera size={16} color={GREEN} /> Images</h3>
                        <div className="image-upload-row">
                            <div className="image-upload-block">
                                <label className="upload-label">Logo</label>
                                <div
                                  className="upload-dropzone upload-dropzone-square"
                                  onClick={() => logoInputRef.current?.click()}
                                  style={{
                                    backgroundImage: `url(${logoPreview || (business.logo_url ? logoSrc : '')})`,
                                  }}
                                >
                                    {!logoPreview && !business.logo_url && <Camera size={22} color={GREY} />}
                                </div>
                                <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} />
                            </div>
                            <div className="image-upload-block image-upload-block-wide">
                                <label className="upload-label">Cover Image</label>
                                <div
                                  className="upload-dropzone upload-dropzone-wide"
                                  onClick={() => coverInputRef.current?.click()}
                                  style={{
                                    backgroundImage: `url(${coverPreview || (business.cover_url ? coverSrc : '')})`,
                                  }}
                                >
                                    {!coverPreview && !business.cover_url && <Camera size={22} color={GREY} />}
                                </div>
                                <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverChange} style={{ display: 'none' }} />
                            </div>
                        </div>
                    </div>

                    <div className="form-card">
                        <h3 className="card-heading"><MapPin size={16} color={GREEN} /> Location</h3>
                        <input
                          className="text-input"
                          value={address}
                          onChange={e => setAddress(e.target.value)}
                          placeholder="Address"
                        />
                        <div className="input-row">
                            <input className="text-input" value={lat} onChange={e => setLat(e.target.value)} placeholder="Latitude" />
                            <input className="text-input" value={lon} onChange={e => setLon(e.target.value)} placeholder="Longitude" />
                        </div>
                    </div>

                    <div className="form-card">
                        <h3 className="card-heading"><CreditCard size={16} color={GREEN} /> Payment Details</h3>
                        {paymentModel !== 'credit' && (
                            <>
                                <select
                                  className="text-input"
                                  value={paymentType}
                                  onChange={e => setPaymentType(e.target.value as 'till' | 'paybill')}
                                >
                                    <option value="till">Till Number</option>
                                    <option value="paybill">PayBill</option>
                                </select>
                                {paymentType === 'paybill' && (
                                    <input
                                        className="text-input"
                                        value={paybillShortCode}
                                        onChange={e => setPaybillShortCode(e.target.value)}
                                        placeholder="PayBill Number (Short Code)"
                                    />
                                )}
                                <input
                                  className="text-input"
                                  value={accountNumber}
                                  onChange={e => setAccountNumber(e.target.value)}
                                  placeholder="Account Number"
                                />
                            </>
                        )}

                        {business.payment_model === 'credit' && (
                            <label className="checkbox-row">
                                <input
                                    type="checkbox"
                                    checked={collectPaymentBeforeDelivery}
                                    onChange={e => setCollectPaymentBeforeDelivery(e.target.checked)}
                                />
                                Collect payment before delivery
                            </label>
                        )}
                    </div>

                    <div className="form-card">
                        <h3 className="card-heading"><Clock size={16} color={GREEN} /> Operating Hours</h3>
                        {DAYS.map((day, index) => (
                            <div key={index} className="hours-edit-row">
                                <span className="hours-edit-day">{day}</span>
                                <label className="checkbox-row checkbox-row-inline">
                                    <input
                                        type="checkbox"
                                        checked={operatingHours[index].is_closed}
                                        onChange={e => handleHourChange(index, 'is_closed', e.target.checked)}
                                    />
                                    Closed
                                </label>
                                {!operatingHours[index].is_closed && (
                                    <div className="hours-edit-times">
                                        <input
                                            type="time"
                                            value={operatingHours[index].opens_at || ''}
                                            onChange={e => handleHourChange(index, 'opens_at', e.target.value)}
                                            className="time-input"
                                        />
                                        <span className="hours-edit-to">to</span>
                                        <input
                                            type="time"
                                            value={operatingHours[index].closes_at || ''}
                                            onChange={e => handleHourChange(index, 'closes_at', e.target.value)}
                                            className="time-input"
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {error && (
                      <div className="alert-error">{error}</div>
                    )}

                    <div className="form-actions">
                        <button type="submit" disabled={saving} className="save-btn">
                            <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button type="button" onClick={() => { setEditMode(false); window.location.reload(); }} className="cancel-btn">
                            <XIcon size={16} /> Cancel
                        </button>
                    </div>
                </form>
            )}

            <style>{`
                .profile-page {
                    max-width: 900px;
                    margin: 0 auto;
                }

                .page-title {
                    font-size: 1.4rem;
                    font-weight: 800;
                    color: ${BLACK};
                    margin-bottom: 18px;
                }

                /* ---- Hero ---- */
                .hero-card {
                    background: #ffffff;
                    border: 1px solid #e5e7eb;
                    border-radius: 16px;
                    overflow: hidden;
                    margin-bottom: 18px;
                }
                .cover-img {
                    width: 100%;
                    height: 180px;
                    background-color: ${GREY_LIGHT};
                    background-size: cover;
                    background-position: center;
                }
                .hero-content {
                    display: flex;
                    align-items: flex-end;
                    gap: 16px;
                    padding: 0 20px 20px 20px;
                    margin-top: -40px;
                    flex-wrap: wrap;
                }
                .logo-img {
                    width: 88px;
                    height: 88px;
                    object-fit: cover;
                    border-radius: 14px;
                    border: 4px solid #ffffff;
                    background: ${GREY_LIGHT};
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                .hero-text {
                    flex: 1;
                    min-width: 180px;
                    padding-bottom: 4px;
                }
                .business-name {
                    font-size: 1.25rem;
                    font-weight: 800;
                    color: ${BLACK};
                    margin: 0;
                }
                .business-desc {
                    font-size: 0.85rem;
                    color: ${GREY};
                    margin-top: 4px;
                }
                .edit-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    background: ${BLACK};
                    color: #ffffff;
                    border: none;
                    padding: 9px 16px;
                    border-radius: 10px;
                    font-size: 0.85rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: background 0.15s;
                }
                .edit-btn:hover { background: ${GREEN}; }

                /* ---- Info grid ---- */
                .info-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 14px;
                }
                .info-card {
                    background: #ffffff;
                    border: 1px solid #e5e7eb;
                    border-radius: 14px;
                    padding: 18px;
                }
                .info-card-wide {
                    grid-column: 1 / -1;
                }
                .card-heading {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.9rem;
                    font-weight: 700;
                    color: ${BLACK};
                    margin: 0 0 12px 0;
                }
                .info-main {
                    font-size: 0.9rem;
                    color: ${BLACK};
                    font-weight: 500;
                    margin: 0 0 6px 0;
                }
                .info-sub {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    font-size: 0.78rem;
                    color: ${GREY};
                }
                .info-sub-row {
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.82rem;
                    color: ${GREY};
                    padding: 5px 0;
                }
                .pill {
                    background: ${GREEN_LIGHT};
                    color: ${GREEN};
                    font-weight: 700;
                    font-size: 0.72rem;
                    padding: 2px 10px;
                    border-radius: 12px;
                }

                .hours-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
                    gap: 8px;
                }
                .hours-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: ${GREY_LIGHT};
                    border-radius: 8px;
                    padding: 8px 12px;
                    font-size: 0.8rem;
                }
                .hours-day {
                    font-weight: 700;
                    color: ${BLACK};
                }
                .hours-open {
                    color: ${GREEN};
                    font-weight: 600;
                }
                .hours-closed {
                    color: ${GREY};
                }

                /* ---- Edit form ---- */
                .edit-form {
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                }
                .form-card {
                    background: #ffffff;
                    border: 1px solid #e5e7eb;
                    border-radius: 14px;
                    padding: 18px;
                }
                .text-input {
                    width: 100%;
                    padding: 10px 12px;
                    border: 1px solid #d1d5db;
                    border-radius: 8px;
                    font-size: 0.88rem;
                    color: ${BLACK};
                    margin-bottom: 10px;
                    box-sizing: border-box;
                }
                .text-input:focus {
                    outline: none;
                    border-color: ${GREEN};
                }
                .textarea {
                    min-height: 70px;
                    resize: vertical;
                    font-family: inherit;
                }
                .input-row {
                    display: flex;
                    gap: 10px;
                }
                .input-row .text-input { margin-bottom: 0; }

                .image-upload-row {
                    display: flex;
                    gap: 16px;
                    flex-wrap: wrap;
                }
                .image-upload-block { display: flex; flex-direction: column; }
                .image-upload-block-wide { flex: 1; min-width: 200px; }
                .upload-label {
                    font-size: 0.78rem;
                    color: ${GREY};
                    font-weight: 600;
                    margin-bottom: 6px;
                }
                .upload-dropzone {
                    background-color: ${GREY_LIGHT};
                    background-size: cover;
                    background-position: center;
                    border: 1.5px dashed #d1d5db;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: border-color 0.15s;
                }
                .upload-dropzone:hover { border-color: ${GREEN}; }
                .upload-dropzone-square { width: 100px; height: 100px; }
                .upload-dropzone-wide { width: 100%; height: 100px; min-width: 180px; }

                .checkbox-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.85rem;
                    color: ${BLACK};
                    cursor: pointer;
                }
                .checkbox-row-inline {
                    white-space: nowrap;
                }

                .hours-edit-row {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 8px 0;
                    border-bottom: 1px solid #f3f4f6;
                    flex-wrap: wrap;
                }
                .hours-edit-row:last-child { border-bottom: none; }
                .hours-edit-day {
                    width: 90px;
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: ${BLACK};
                }
                .hours-edit-times {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .hours-edit-to {
                    font-size: 0.8rem;
                    color: ${GREY};
                }
                .time-input {
                    padding: 6px 8px;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    font-size: 0.82rem;
                }

                .alert-error {
                    background: #fef2f2;
                    color: ${RED};
                    padding: 10px 14px;
                    border-radius: 8px;
                    font-size: 0.85rem;
                    font-weight: 500;
                }

                .form-actions {
                    display: flex;
                    gap: 10px;
                }
                .save-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    background: ${GREEN};
                    color: #ffffff;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 10px;
                    font-size: 0.88rem;
                    font-weight: 700;
                    cursor: pointer;
                }
                .save-btn:disabled { opacity: 0.6; cursor: not-allowed; }
                .cancel-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    background: ${GREY_LIGHT};
                    color: ${BLACK};
                    border: none;
                    padding: 10px 20px;
                    border-radius: 10px;
                    font-size: 0.88rem;
                    font-weight: 600;
                    cursor: pointer;
                }

                @media (max-width: 700px) {
                    .info-grid {
                        grid-template-columns: 1fr;
                    }
                    .hero-content {
                        margin-top: -32px;
                    }
                    .logo-img {
                        width: 72px;
                        height: 72px;
                    }
                    .edit-btn {
                        width: 100%;
                        justify-content: center;
                    }
                    .input-row {
                        flex-direction: column;
                    }
                    .form-actions {
                        flex-direction: column;
                    }
                    .form-actions > * {
                        width: 100%;
                        justify-content: center;
                    }
                    .hours-edit-row {
                        flex-direction: column;
                        align-items: flex-start;
                    }
                }
            `}</style>
        </div>
    );
};

export default Profile;