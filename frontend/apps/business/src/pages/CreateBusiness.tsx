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

const STEPS = ['Payment model', 'Business details', 'Location', 'Operating hours', 'Payment details'];

// ---------- Icons ----------
const IconPin = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const IconClock = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 3" />
  </svg>
);

const IconCard = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20" />
  </svg>
);

const IconWallet = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h15a2 2 0 0 1 2 2v3m0 0v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9" />
    <circle cx="17" cy="14" r="1" />
  </svg>
);

const IconStore = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l1.5-5h15L21 9" />
    <path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
    <path d="M5 9v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9" />
    <path d="M10 19v-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5" />
  </svg>
);

const IconCheck = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const IconArrowLeft = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

const IconArrowRight = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

const IconAlert = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 9v4M12 17h.01" />
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
  </svg>
);

const IconLoader = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="hb-spin">
    <path d="M21 12a9 9 0 1 1-9-9" />
  </svg>
);

// ---------- Colors ----------
const COLORS = {
  green: '#15803d',
  greenLight: '#dcfce7',
  greenDark: '#14532d',
  orange: '#c2410c',
  orangeLight: '#ffedd5',
  orangeDark: '#7c2d12',
  red: '#b91c1c',
  redLight: '#fee2e2',
  ink: '#1f2a24',
  inkSoft: '#5b665f',
  line: '#dbe3dc',
  paper: '#fbfaf7',
  card: '#ffffff',
};

const CreateBusiness: React.FC = () => {
  const navigate = useNavigate();
  const { businessId, refreshBusiness } = useAuth();

  const [step, setStep] = useState(0);
  const [paymentModel, setPaymentModel] = useState<'credit' | 'pay_as_you_go'>('credit');
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [locationSource, setLocationSource] = useState<'none' | 'gps' | 'manual'>('none');
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
      if (data && data.length > 0 && categoryId === '') {
        setCategoryId(data[0].id);
      }
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (businessId) {
    navigate('/', { replace: true });
    return null;
  }

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser. Enter coordinates manually instead.');
      return;
    }
    setGpsLoading(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLon(pos.coords.longitude.toFixed(6));
        setLocationSource('gps');
        setGpsLoading(false);
      },
      () => {
        setError('Unable to retrieve your location. Enter coordinates manually instead.');
        setGpsLoading(false);
      }
    );
  };

  const handleManualCoordChange = (which: 'lat' | 'lon', value: string) => {
    if (which === 'lat') setLat(value); else setLon(value);
    setLocationSource('manual');
  };

  const handleHourChange = (index: number, field: keyof OperatingHour, value: any) => {
    const updated = [...operatingHours];
    updated[index] = { ...updated[index], [field]: value };
    setOperatingHours(updated);
  };

  const hasValidCoordinates = () => {
    const latNum = Number(lat);
    const lonNum = Number(lon);
    return (
      lat.trim() !== '' &&
      lon.trim() !== '' &&
      !Number.isNaN(latNum) &&
      !Number.isNaN(lonNum) &&
      latNum >= -90 && latNum <= 90 &&
      lonNum >= -180 && lonNum <= 180
    );
  };

  const stepIsValid = (index: number): boolean => {
    switch (index) {
      case 0:
        return true;
      case 1:
        return name.trim() !== '' && categoryId !== '';
      case 2:
        return hasValidCoordinates();
      case 3:
        return true;
      case 4:
        return accountNumber.trim() !== '' && (paymentType !== 'paybill' || paybillShortCode.trim() !== '');
      default:
        return true;
    }
  };

  const goNext = () => {
    if (!stepIsValid(step)) {
      if (step === 2) setError('Set your business location using GPS or by entering both coordinates.');
      else if (step === 1) setError('Enter a business name and choose a category.');
      else setError('Fill in the required fields before continuing.');
      return;
    }
    setError('');
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setError('');
    setStep(s => Math.max(s - 1, 0));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stepIsValid(4)) {
      setError('Account number is required');
      return;
    }
    if (!hasValidCoordinates()) {
      setError('Set your business location before submitting.');
      setStep(2);
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
        payment_method: {
          type: paymentType,
          account_number: accountNumber.trim(),
          paybill_short_code: paymentType === 'paybill' ? paybillShortCode.trim() : undefined,
        },
        payment_model: paymentModel,
      });

      await refreshBusiness();
      setSuccess(
        paymentModel === 'credit'
          ? 'Business created. Your payment channel has been registered and a free trial has been applied.'
          : 'Business created.'
      );
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 2000);
    } catch (err: any) {
      const msg = err?.message || err?.response?.data?.error?.message || '';
      const code = err?.response?.data?.error?.code || err?.code;
      if (msg.includes('already have a business') || err?.response?.status === 400) {
        await refreshBusiness();
        try {
          const token = localStorage.getItem('hakika_business_token');
          const meResp = await fetch(`${Config.API_BASE}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
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
        setError('Unable to register your payment channel. Check your payment details and try again.');
      } else {
        setError(msg || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <style>{css}</style>
      <div style={styles.shell}>
        <div style={styles.header}>
          <div>
            <p style={styles.eyebrow}>New business</p>
            <h1 style={styles.h1}>Set up your shop</h1>
          </div>
        </div>

        {success ? (
          <div style={styles.successCard}>
            <div style={styles.successIcon}>
              <IconCheck size={22} />
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 600, color: COLORS.greenDark }}>Business created</p>
              <p style={{ margin: '4px 0 0', color: COLORS.inkSoft, fontSize: 14 }}>{success}</p>
            </div>
          </div>
        ) : (
          <>
            {/* Stepper */}
            <div style={styles.stepper} className="hb-stepper">
              {STEPS.map((label, i) => {
                const state = i < step ? 'done' : i === step ? 'active' : 'upcoming';
                return (
                  <div key={label} style={styles.stepItem} className="hb-step-item">
                    <div style={styles.stepIndicatorRow}>
                      <div
                        style={{
                          ...styles.stepDot,
                          background: state === 'done' ? COLORS.green : state === 'active' ? COLORS.orange : '#fff',
                          borderColor: state === 'upcoming' ? COLORS.line : state === 'done' ? COLORS.green : COLORS.orange,
                          color: state === 'upcoming' ? COLORS.inkSoft : '#fff',
                        }}
                      >
                        {state === 'done' ? <IconCheck /> : i + 1}
                      </div>
                      {i < STEPS.length - 1 && (
                        <div style={{ ...styles.stepLine, background: i < step ? COLORS.green : COLORS.line }} />
                      )}
                    </div>
                    <span
                      className="hb-step-label"
                      style={{
                        ...styles.stepLabel,
                        color: state === 'upcoming' ? COLORS.inkSoft : COLORS.ink,
                        fontWeight: state === 'active' ? 600 : 500,
                      }}
                    >
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>

            {error && (
              <div style={styles.errorBanner}>
                <IconAlert />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={styles.card}>
                {step === 0 && (
                  <div>
                    <h2 style={styles.sectionTitle}>How do you want to receive payments?</h2>
                    <p style={styles.sectionSub}>You can change this later from your business settings.</p>

                    <div style={styles.planGrid} className="hb-plan-grid">
                      <label
                        style={{
                          ...styles.planCard,
                          borderColor: paymentModel === 'credit' ? COLORS.green : COLORS.line,
                          background: paymentModel === 'credit' ? COLORS.greenLight : COLORS.card,
                          boxShadow: paymentModel === 'credit' ? `0 0 0 1px ${COLORS.green}` : 'none',
                        }}
                      >
                        <input
                          type="radio"
                          name="paymentModel"
                          value="credit"
                          checked={paymentModel === 'credit'}
                          onChange={() => setPaymentModel('credit')}
                          style={styles.radioHidden}
                        />
                        <div style={styles.planTop}>
                          <div style={{ ...styles.planIconBadge, background: COLORS.green }}>
                            <IconWallet size={20} />
                          </div>
                          {paymentModel === 'credit' && (
                            <div style={{ ...styles.planCheck, background: COLORS.green }}>
                              <IconCheck size={12} />
                            </div>
                          )}
                        </div>
                        <strong style={styles.planTitle}>Direct to my account</strong>
                        <p style={styles.planTag}>Credit</p>
                        <p style={styles.optionDesc}>
                          Payments land straight in your Till or PayBill. We verify your payment channel and apply a free trial automatically.
                        </p>
                      </label>

                      <label
                        style={{
                          ...styles.planCard,
                          borderColor: paymentModel === 'pay_as_you_go' ? COLORS.orange : COLORS.line,
                          background: paymentModel === 'pay_as_you_go' ? COLORS.orangeLight : COLORS.card,
                          boxShadow: paymentModel === 'pay_as_you_go' ? `0 0 0 1px ${COLORS.orange}` : 'none',
                        }}
                      >
                        <input
                          type="radio"
                          name="paymentModel"
                          value="pay_as_you_go"
                          checked={paymentModel === 'pay_as_you_go'}
                          onChange={() => setPaymentModel('pay_as_you_go')}
                          style={styles.radioHidden}
                        />
                        <div style={styles.planTop}>
                          <div style={{ ...styles.planIconBadge, background: COLORS.orange }}>
                            <IconCard size={20} />
                          </div>
                          {paymentModel === 'pay_as_you_go' && (
                            <div style={{ ...styles.planCheck, background: COLORS.orange }}>
                              <IconCheck size={12} />
                            </div>
                          )}
                        </div>
                        <strong style={styles.planTitle}>Hakika collects for me</strong>
                        <p style={styles.planTag}>Pay-as-you-go</p>
                        <p style={styles.optionDesc}>
                          For freelancers and occasional sellers who don't need a subscription — no Till or PayBill required.
                        </p>
                      </label>
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div>
                    <h2 style={styles.sectionTitle}>Tell us about your business</h2>
                    <p style={styles.sectionSub}>This is what customers will see first.</p>

                    <div style={styles.field}>
                      <label style={styles.label}>Business name</label>
                      <input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g. Mama Njeri's Grocers"
                        required
                        style={styles.input}
                      />
                    </div>

                    <div style={styles.field}>
                      <label style={styles.label}>Category</label>
                      <select
                        value={categoryId}
                        onChange={e => setCategoryId(Number(e.target.value))}
                        style={styles.input}
                      >
                        {categories.length === 0 && <option value="">Loading categories...</option>}
                        {categories.map((cat: any) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    <div style={styles.field}>
                      <label style={styles.label}>Address <span style={styles.optionalTag}>optional</span></label>
                      <input
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                        placeholder="e.g. Moi Avenue, Nairobi"
                        style={styles.input}
                      />
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div>
                    <h2 style={styles.sectionTitle}>Where is your business located?</h2>
                    <p style={styles.sectionSub}>Use your current location, or enter coordinates manually.</p>

                    <button
                      type="button"
                      onClick={handleUseLocation}
                      disabled={gpsLoading}
                      style={{ ...styles.primaryOutlineBtn, opacity: gpsLoading ? 0.7 : 1 }}
                    >
                      {gpsLoading ? <IconLoader /> : <IconPin />}
                      {gpsLoading ? 'Locating...' : 'Use my current location'}
                    </button>

                    {locationSource === 'gps' && hasValidCoordinates() && (
                      <div style={styles.locationConfirmed}>
                        <IconCheck />
                        <span>Location captured from GPS</span>
                      </div>
                    )}

                    <div style={styles.dividerRow}>
                      <div style={styles.dividerLine} />
                      <span style={styles.dividerText}>or enter manually</span>
                      <div style={styles.dividerLine} />
                    </div>

                    <div style={styles.coordRow}>
                      <div style={{ ...styles.field, flex: 1 }}>
                        <label style={styles.label}>Latitude</label>
                        <input
                          value={lat}
                          onChange={e => handleManualCoordChange('lat', e.target.value)}
                          placeholder="e.g. -1.286389"
                          inputMode="decimal"
                          style={styles.input}
                        />
                      </div>
                      <div style={{ ...styles.field, flex: 1 }}>
                        <label style={styles.label}>Longitude</label>
                        <input
                          value={lon}
                          onChange={e => handleManualCoordChange('lon', e.target.value)}
                          placeholder="e.g. 36.817223"
                          inputMode="decimal"
                          style={styles.input}
                        />
                      </div>
                    </div>

                    {!hasValidCoordinates() && (lat !== '' || lon !== '') && (
                      <p style={styles.fieldHint}>Enter a valid latitude (-90 to 90) and longitude (-180 to 180).</p>
                    )}
                  </div>
                )}

                {step === 3 && (
                  <div>
                    <h2 style={styles.sectionTitle}>Set your operating hours</h2>
                    <p style={styles.sectionSub}>Let customers know when you're open.</p>

                    <div style={styles.hoursList}>
                      {DAYS.map((day, index) => {
                        const h = operatingHours[index];
                        return (
                          <div key={day} style={{ ...styles.hourRow, borderColor: h.is_closed ? COLORS.line : COLORS.line }}>
                            <div style={styles.hourDay}>
                              <IconClock size={16} />
                              <span>{day}</span>
                            </div>
                            <div style={styles.hourControls}>
                              {!h.is_closed ? (
                                <>
                                  <input
                                    type="time"
                                    value={h.opens_at}
                                    onChange={e => handleHourChange(index, 'opens_at', e.target.value)}
                                    style={styles.timeInput}
                                  />
                                  <span style={{ color: COLORS.inkSoft, fontSize: 13 }}>to</span>
                                  <input
                                    type="time"
                                    value={h.closes_at}
                                    onChange={e => handleHourChange(index, 'closes_at', e.target.value)}
                                    style={styles.timeInput}
                                  />
                                </>
                              ) : (
                                <span style={styles.closedTag}>Closed</span>
                              )}
                              <label style={styles.closedToggle}>
                                <input
                                  type="checkbox"
                                  checked={h.is_closed}
                                  onChange={e => handleHourChange(index, 'is_closed', e.target.checked)}
                                  style={{ accentColor: COLORS.red }}
                                />
                                <span>Closed</span>
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div>
                    <h2 style={styles.sectionTitle}>Payment details</h2>
                    <p style={styles.sectionSub}>Where should payments be sent or reconciled?</p>

                    <div style={styles.field}>
                      <label style={styles.label}>Payment type</label>
                      <select
                        value={paymentType}
                        onChange={e => setPaymentType(e.target.value as 'till' | 'paybill')}
                        style={styles.input}
                      >
                        <option value="till">Till number</option>
                        <option value="paybill">PayBill</option>
                      </select>
                    </div>

                    {paymentType === 'paybill' && (
                      <div style={styles.field}>
                        <label style={styles.label}>PayBill number (short code)</label>
                        <input
                          value={paybillShortCode}
                          onChange={e => setPaybillShortCode(e.target.value)}
                          placeholder="e.g. 522533"
                          required
                          style={styles.input}
                        />
                      </div>
                    )}

                    <div style={styles.field}>
                      <label style={styles.label}>Account number</label>
                      <input
                        value={accountNumber}
                        onChange={e => setAccountNumber(e.target.value)}
                        placeholder="e.g. 123456"
                        required
                        style={styles.input}
                      />
                    </div>

                    <div style={styles.reviewBox}>
                      <div style={styles.reviewRow}>
                        <span style={styles.reviewLabel}><IconStore size={14} /> Business</span>
                        <span style={styles.reviewValue}>{name || '—'}</span>
                      </div>
                      <div style={styles.reviewRow}>
                        <span style={styles.reviewLabel}><IconPin size={14} /> Location</span>
                        <span style={styles.reviewValue}>
                          {hasValidCoordinates() ? `${lat}, ${lon}` : 'Not set'}
                        </span>
                      </div>
                      <div style={styles.reviewRow}>
                        <span style={styles.reviewLabel}><IconWallet size={14} /> Payment model</span>
                        <span style={styles.reviewValue}>{paymentModel === 'credit' ? 'Credit' : 'Pay-as-you-go'}</span>
                      </div>
                    </div>

                    <p style={styles.stuckNote}>
                      Page not responding or button stuck? Try opening this page in a private or incognito browser window and sign in again.
                    </p>
                  </div>
                )}
              </div>

              <div style={styles.navRow}>
                <button
                  type="button"
                  onClick={goBack}
                  disabled={step === 0}
                  style={{ ...styles.secondaryBtn, visibility: step === 0 ? 'hidden' : 'visible' }}
                >
                  <IconArrowLeft size={16} />
                  Back
                </button>

                {step < STEPS.length - 1 ? (
                  <button type="button" onClick={goNext} style={styles.primaryBtn}>
                    Continue
                    <IconArrowRight size={16} />
                  </button>
                ) : (
                  <button type="submit" disabled={loading} style={{ ...styles.primaryBtn, opacity: loading ? 0.8 : 1 }}>
                    {loading ? <IconLoader /> : <IconCheck size={16} />}
                    {loading ? 'Creating...' : 'Create business'}
                  </button>
                )}
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

const css = `
  .hb-spin { animation: hb-spin 0.8s linear infinite; }
  @keyframes hb-spin { to { transform: rotate(360deg); } }
  .hb-ghost-btn:hover { background: #f1f0ec; }
  input[type="time"]::-webkit-calendar-picker-indicator { opacity: 0.6; }

  @media (max-width: 620px) {
    .hb-stepper { overflow-x: auto; padding-bottom: 4px; }
    .hb-step-label { display: none; }
    .hb-step-item { min-width: 40px; }
    .hb-plan-grid { grid-template-columns: 1fr !important; }
  }
`;

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: COLORS.paper,
    padding: '32px 16px',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    color: COLORS.ink,
  },
  shell: {
    maxWidth: 640,
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
    gap: 12,
    flexWrap: 'wrap',
  },
  eyebrow: {
    margin: 0,
    fontSize: 13,
    color: COLORS.green,
    fontWeight: 600,
  },
  h1: {
    margin: '4px 0 0',
    fontSize: 26,
    fontWeight: 600,
    letterSpacing: '-0.01em',
  },
  stepper: {
    display: 'flex',
    marginBottom: 28,
  },
  stepItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  stepIndicatorRow: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
  },
  stepDot: {
    width: 28,
    height: 28,
    minWidth: 28,
    borderRadius: '50%',
    border: '2px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 600,
  },
  stepLine: {
    height: 2,
    flex: 1,
    marginLeft: 4,
    marginRight: 4,
  },
  stepLabel: {
    marginTop: 6,
    fontSize: 12,
    textAlign: 'center',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: COLORS.redLight,
    color: COLORS.red,
    border: `1px solid #fecaca`,
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 14,
    marginBottom: 16,
  },
  successCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    background: COLORS.greenLight,
    border: `1px solid #bbf7d0`,
    borderRadius: 12,
    padding: '20px',
  },
  successIcon: {
    width: 40,
    height: 40,
    minWidth: 40,
    borderRadius: '50%',
    background: COLORS.green,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    background: COLORS.card,
    border: `1px solid ${COLORS.line}`,
    borderRadius: 12,
    padding: '24px',
    marginBottom: 20,
  },
  sectionTitle: {
    margin: '0 0 4px',
    fontSize: 18,
    fontWeight: 600,
  },
  sectionSub: {
    margin: '0 0 20px',
    fontSize: 14,
    color: COLORS.inkSoft,
  },
  optionDesc: {
    margin: '6px 0 0',
    fontSize: 13,
    color: COLORS.inkSoft,
    lineHeight: 1.5,
  },
  planGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 14,
  },
  planCard: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    border: '1.5px solid',
    borderRadius: 12,
    padding: '18px',
    cursor: 'pointer',
    transition: 'border-color 0.15s ease',
  },
  radioHidden: {
    position: 'absolute',
    opacity: 0,
    width: 0,
    height: 0,
  },
  planTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  planIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planCheck: {
    width: 20,
    height: 20,
    borderRadius: '50%',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planTitle: {
    fontSize: 15,
    color: COLORS.ink,
    marginBottom: 2,
  },
  planTag: {
    margin: 0,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.02em',
    color: COLORS.inkSoft,
    textTransform: 'uppercase',
  },
  stuckNote: {
    marginTop: 16,
    fontSize: 12,
    color: COLORS.inkSoft,
    background: COLORS.paper,
    border: `1px dashed ${COLORS.line}`,
    borderRadius: 8,
    padding: '10px 12px',
    lineHeight: 1.5,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 6,
    color: COLORS.ink,
  },
  optionalTag: {
    fontWeight: 400,
    color: COLORS.inkSoft,
    fontSize: 12,
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${COLORS.line}`,
    borderRadius: 8,
    fontSize: 14,
    boxSizing: 'border-box',
    background: '#fff',
    color: COLORS.ink,
  },
  fieldHint: {
    margin: '4px 0 0',
    fontSize: 12,
    color: COLORS.red,
  },
  primaryOutlineBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 16px',
    background: COLORS.greenLight,
    border: `1.5px solid ${COLORS.green}`,
    borderRadius: 8,
    color: COLORS.greenDark,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
    justifyContent: 'center',
  },
  locationConfirmed: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: COLORS.greenDark,
    fontSize: 13,
    marginTop: 10,
    justifyContent: 'center',
  },
  dividerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    margin: '20px 0',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: COLORS.line,
  },
  dividerText: {
    fontSize: 12,
    color: COLORS.inkSoft,
  },
  coordRow: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
  },
  hoursList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  hourRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '10px 12px',
    border: `1px solid ${COLORS.line}`,
    borderRadius: 8,
    flexWrap: 'wrap',
  },
  hourDay: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    fontWeight: 500,
    minWidth: 110,
    color: COLORS.ink,
  },
  hourControls: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  timeInput: {
    padding: '6px 8px',
    border: `1px solid ${COLORS.line}`,
    borderRadius: 6,
    fontSize: 13,
  },
  closedTag: {
    fontSize: 13,
    color: COLORS.red,
    fontWeight: 500,
    minWidth: 130,
  },
  closedToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    color: COLORS.inkSoft,
    cursor: 'pointer',
  },
  reviewBox: {
    marginTop: 8,
    background: COLORS.paper,
    border: `1px solid ${COLORS.line}`,
    borderRadius: 8,
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  reviewRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 13,
  },
  reviewLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: COLORS.inkSoft,
  },
  reviewValue: {
    fontWeight: 600,
    color: COLORS.ink,
  },
  navRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  secondaryBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 18px',
    background: 'transparent',
    border: `1px solid ${COLORS.line}`,
    borderRadius: 8,
    color: COLORS.inkSoft,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
  primaryBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 22px',
    background: COLORS.green,
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    marginLeft: 'auto',
  },
};

export default CreateBusiness;