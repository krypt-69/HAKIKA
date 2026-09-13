import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { api } from '../api';
import { Card, Button, LoadingSpinner, ErrorState, EmptyState, SectionHeader } from '../components';

// ==================================================================
// Design tokens
// A ledger built for merchants checking money on a phone between
// customers — deep ink for the balance, a single considered green
// for "money in", warm gold for "in motion", brick for "needs you".
// ==================================================================
const tokens = {
  ink: '#101827',
  inkSoft: '#5B6472',
  paper: '#F6F5F1',
  paperRaised: '#FFFFFF',
  hairline: '#E4E1D8',
  emerald: '#0E7A53',
  emeraldSoft: '#E4F1EA',
  gold: '#B4791F',
  goldSoft: '#F6ECD9',
  brick: '#B4402A',
  brickSoft: '#F6E5E0',
};

const fontImport = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600;700&display=swap');
`;

// -------------------- helpers --------------------
const formatKES = (value: number, decimals: number = 2) =>
  value.toLocaleString('en-KE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });

// Strict calendar-date preservation for the credit expiry field.
// Does NOT go through JS timezone machinery.
const formatExpiry = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const datePart = iso.slice(0, 10);
  const parts = datePart.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return '—';
  const [y, m, d] = parts;
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  if (m < 1 || m > 12) return '—';
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

const statusTone: Record<string, { fg: string; bg: string; label: string }> = {
  completed: { fg: tokens.emerald, bg: tokens.emeraldSoft, label: 'Completed' },
  success: { fg: tokens.emerald, bg: tokens.emeraldSoft, label: 'Completed' },
  paid: { fg: tokens.emerald, bg: tokens.emeraldSoft, label: 'Paid' },
  pending: { fg: tokens.gold, bg: tokens.goldSoft, label: 'Pending' },
  processing: { fg: tokens.gold, bg: tokens.goldSoft, label: 'Processing' },
  failed: { fg: tokens.brick, bg: tokens.brickSoft, label: 'Failed' },
  cancelled: { fg: tokens.brick, bg: tokens.brickSoft, label: 'Cancelled' },
};

const Status: React.FC<{ status: string }> = ({ status }) => {
  const tone = statusTone[status?.toLowerCase()] || { fg: tokens.inkSoft, bg: '#EEEDE7', label: status };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 500, color: tone.fg }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: tone.fg, flexShrink: 0 }} />
      {tone.label}
    </span>
  );
};

// A ledger row: date / description / amount / status.
// Reads as a bank statement line, not a database table dump.
const LedgerList: React.FC<{
  rows: { key: string; date: string; primary: string; secondary?: string; amount: string; status: string }[];
}> = ({ rows }) => (
  <div>
    <style>{`
      .ledger-row {
        display: grid;
        grid-template-columns: 88px 1fr auto;
        gap: 16px;
        align-items: center;
        padding: 16px 4px;
        border-bottom: 1px solid ${tokens.hairline};
      }
      .ledger-row:last-child { border-bottom: none; }
      .ledger-date {
        font-size: 0.78rem;
        color: ${tokens.inkSoft};
        font-variant-numeric: tabular-nums;
      }
      .ledger-amount {
        font-family: 'Fraunces', Georgia, serif;
        font-size: 1.05rem;
        color: ${tokens.ink};
        font-variant-numeric: tabular-nums;
        text-align: right;
        white-space: nowrap;
      }
      @media (max-width: 560px) {
        .ledger-row {
          grid-template-columns: 1fr auto;
          grid-template-rows: auto auto;
          row-gap: 4px;
        }
        .ledger-date { grid-column: 1; grid-row: 2; }
        .ledger-primary-wrap { grid-column: 1; grid-row: 1; }
        .ledger-amount { grid-column: 2; grid-row: 1 / span 2; align-self: center; }
      }
    `}</style>
    {rows.map(row => (
      <div className="ledger-row" key={row.key}>
        <span className="ledger-date">{row.date}</span>
        <div className="ledger-primary-wrap">
          <div style={{ fontSize: '0.92rem', color: tokens.ink, fontWeight: 500 }}>{row.primary}</div>
          {row.secondary && <div style={{ marginTop: 2 }}><Status status={row.status} /></div>}
        </div>
        <span className="ledger-amount">KES {row.amount}</span>
      </div>
    ))}
  </div>
);

const SectionLabel: React.FC<{ children: React.ReactNode; hint?: string }> = ({ children, hint }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14, marginTop: 40 }}>
    <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.2rem', fontWeight: 500, color: tokens.ink, margin: 0 }}>
      {children}
    </h2>
    {hint && <span style={{ fontSize: '0.8rem', color: tokens.inkSoft }}>{hint}</span>}
  </div>
);

// -------------------- CreditPaymentsView --------------------
interface CreditPlan {
  id: string;
  name: string;
  price: number;
  credit_amount: number;
  description: string | null;
}

interface MerchantCreditOrder {
  id: string;
  amount_paid: number;
  credit_received: number;
  status: string;
  payment_reference: string;
  created_at: string;
  completed_at: string | null;
}

const CreditPaymentsView: React.FC<{ business: any }> = ({ business }) => {
  const { businessId } = useAuth();
  const navigate = useNavigate();
  const [creditPlans, setCreditPlans] = useState<CreditPlan[]>([]);
  const [purchaseHistory, setPurchaseHistory] = useState<MerchantCreditOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);

  const fetchCreditData = async () => {
    if (!businessId) return;
    try {
      setLoading(true);
      const plans = await api.credit.getPlans();
      setCreditPlans(plans || []);
      const history = await api.credit.getHistory(businessId) as unknown as MerchantCreditOrder[];
      setPurchaseHistory(history || []);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load credit data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreditData();
  }, [businessId]);

  const handleSavePhoneAndRetry = async () => {
    const trimmed = phoneInput.trim();
    if (!trimmed || trimmed.length < 9) {
      setError('Enter a valid Kenyan phone number.');
      return;
    }
    setError('');
    try {
      await api.updatePhone(trimmed);
      setPhoneError(false);
      setPhoneInput('');
      if (pendingPlanId) {
        handlePurchase(pendingPlanId);
        setPendingPlanId(null);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to save phone number. Please try again.');
    }
  };

  const handlePurchase = async (planId: string) => {
    if (!businessId) return;
    setPurchasing(planId);
    setError('');
    setSuccess('');
    try {
      const result = await api.credit.purchase(businessId, planId);
      if (result.checkout_url) {
        window.open(result.checkout_url, '_blank');
        setSuccess('Checkout opened in a new tab. Complete payment to add credit.');
        setTimeout(() => fetchCreditData(), 5000);
      }
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('PHONE_NOT_SET') || msg.includes('phone number')) {
        setPhoneError(true);
        setPendingPlanId(planId);
        setError('');
      } else {
        setError(msg || 'Failed to initiate purchase');
      }
    } finally {
      setPurchasing(null);
    }
  };

  const creditBalance = business.credit_balance ?? 0;
  const remainingVolume = business.remaining_credit_volume ?? 0;
  const lowCredit = remainingVolume < 500;

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div>
      <style>{fontImport}</style>

      {success && (
        <div style={{ background: tokens.emeraldSoft, color: tokens.emerald, padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: '0.9rem', fontWeight: 500 }}>
          {success}
        </div>
      )}
      {error && (
        <div style={{ background: tokens.brickSoft, color: tokens.brick, padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: '0.9rem', fontWeight: 500 }}>
          {error}
        </div>
      )}

      {phoneError && (
        <div style={{ background: tokens.goldSoft, borderLeft: `3px solid ${tokens.gold}`, padding: '16px 18px', borderRadius: '0 8px 8px 0', marginBottom: 24 }}>
          <p style={{ fontWeight: 600, color: tokens.ink, marginBottom: 6 }}>Add a phone number to continue</p>
          <p style={{ fontSize: '0.88rem', color: tokens.inkSoft, marginBottom: 12 }}>
            We'll send the M-Pesa prompt to this number.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <input
              type="tel"
              value={phoneInput}
              onChange={e => setPhoneInput(e.target.value)}
              placeholder="0712 345 678"
              style={{ flex: '1 1 200px', padding: '10px 12px', borderRadius: 6, border: `1px solid ${tokens.hairline}`, fontSize: '0.9rem', background: tokens.paperRaised }}
            />
            <button
              onClick={handleSavePhoneAndRetry}
              style={{ padding: '10px 20px', background: tokens.ink, color: '#fff', border: 'none', borderRadius: 6, whiteSpace: 'nowrap', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem' }}
            >
              Save and continue
            </button>
          </div>
        </div>
      )}

      {/* Hero: the balance is the whole point of the page */}
      <div
        style={{
          background: tokens.ink,
          borderRadius: 16,
          padding: '32px 28px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 32,
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}
      >
        <div>
          <p style={{ color: '#9BA3B2', fontSize: '0.85rem', marginBottom: 8 }}>Available credit</p>
          <p
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: 'clamp(2.2rem, 7vw, 3.2rem)',
              fontWeight: 500,
              color: lowCredit ? '#E8917C' : '#7FD6AE',
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            KES {formatKES(creditBalance)}
            <span style={{ display: 'block', marginTop: 6, fontSize: '0.82rem', color: '#9BA3B2' }}>
              Expires: {formatExpiry(business.next_credit_expiry)}
            </span>
          </p>
          {lowCredit && (
            <p style={{ color: '#E8917C', fontSize: '0.85rem', marginTop: 10 }}>
              Running low — top up below to keep accepting orders.
            </p>
          )}
        </div>
        <div style={{ textAlign: 'left' }}>
          <p style={{ color: '#9BA3B2', fontSize: '0.85rem', marginBottom: 8 }}>Remaining order capacity</p>
          <p
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: 'clamp(1.3rem, 4vw, 1.7rem)',
              fontWeight: 500,
              color: '#F1F0EA',
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            KES {formatKES(remainingVolume)}
          </p>
        </div>
      </div>

      {/* Credit Plans */}
      <SectionLabel hint="One-time top-up, no subscription">Top up your credit</SectionLabel>
      {creditPlans.length === 0 ? (
        <EmptyState title="No plans available" description="Check back later for credit plans" />
      ) : (
        <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 8, marginLeft: -4, paddingLeft: 4 }}>
          {creditPlans.map((plan, i) => (
            <div
              key={plan.id}
              style={{
                minWidth: 220,
                flex: '0 0 auto',
                background: tokens.paperRaised,
                border: `1px solid ${tokens.hairline}`,
                borderLeft: `3px solid ${i % 2 === 0 ? tokens.emerald : tokens.gold}`,
                borderRadius: 10,
                padding: '18px 18px 16px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: tokens.ink, margin: 0 }}>{plan.name}</h3>
              <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.5rem', color: tokens.ink, margin: '10px 0 2px', fontVariantNumeric: 'tabular-nums' }}>
                KES {formatKES(plan.price, 0)}
              </p>
              <p style={{ fontSize: '0.8rem', color: tokens.inkSoft, marginBottom: plan.description ? 4 : 0 }}>
                Gives you KES {formatKES(plan.credit_amount, 0)} in processing credit
              </p>
              {plan.description && <p style={{ fontSize: '0.78rem', color: tokens.inkSoft, flexGrow: 1, marginTop: 4 }}>{plan.description}</p>}
              <button
                onClick={() => handlePurchase(plan.id)}
                disabled={purchasing === plan.id}
                style={{
                  marginTop: 16,
                  padding: '10px 0',
                  background: purchasing === plan.id ? '#C9C6BC' : tokens.ink,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: purchasing === plan.id ? 'default' : 'pointer',
                }}
              >
                {purchasing === plan.id ? 'Opening checkout…' : 'Buy credit'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Purchase History */}
      <SectionLabel>Credit purchases</SectionLabel>
      {purchaseHistory.length === 0 ? (
        <EmptyState title="No purchases yet" description="Your credit purchases will appear here" />
      ) : (
        <div style={{ background: tokens.paperRaised, border: `1px solid ${tokens.hairline}`, borderRadius: 10, padding: '4px 20px' }}>
          <LedgerList
            rows={purchaseHistory.map(order => ({
              key: order.id,
              date: formatDate(order.created_at),
              primary: `+ KES ${formatKES(order.credit_received, 0)} credit`,
              secondary: order.status,
              status: order.status,
              amount: formatKES(order.amount_paid, 0),
            }))}
          />
        </div>
      )}
    </div>
  );
};

// -------------------- PaygPaymentsView --------------------
interface Settlement {
  id: string;
  amount: number;
  status: string;
  created_at: string;
}

const PaygPaymentsView: React.FC = () => {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchSettlements = async () => {
    try {
      setLoading(true);
      const data = await api.settlements.list();
      setSettlements(data || []);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load settlements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettlements();
  }, []);

  if (loading) return <LoadingSpinner size="lg" />;

  const total = settlements.reduce((sum, s) => sum + (s.amount || 0), 0);
  const lastSettled = settlements.find(s => (s.status || '').toLowerCase() === 'completed' || (s.status || '').toLowerCase() === 'paid');

  return (
    <div>
      <style>{fontImport}</style>

      {error && (
        <div style={{ background: tokens.brickSoft, color: tokens.brick, padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: '0.9rem', fontWeight: 500 }}>
          {error}
        </div>
      )}

      <div
        style={{
          background: tokens.ink,
          borderRadius: 16,
          padding: '32px 28px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 32,
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}
      >
        <div>
          <p style={{ color: '#9BA3B2', fontSize: '0.85rem', marginBottom: 8 }}>Total settled to date</p>
          <p
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: 'clamp(2.2rem, 7vw, 3.2rem)',
              fontWeight: 500,
              color: '#7FD6AE',
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            KES {formatKES(total)}
          </p>
        </div>
        {lastSettled && (
          <div>
            <p style={{ color: '#9BA3B2', fontSize: '0.85rem', marginBottom: 8 }}>Last payout</p>
            <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 'clamp(1.3rem, 4vw, 1.7rem)', fontWeight: 500, color: '#F1F0EA', lineHeight: 1 }}>
              {formatDate(lastSettled.created_at)}
            </p>
          </div>
        )}
      </div>

      <SectionLabel>Payouts</SectionLabel>
      {settlements.length === 0 ? (
        <EmptyState title="No settlements yet" description="Settlements will appear here when customers pay for orders" />
      ) : (
        <div style={{ background: tokens.paperRaised, border: `1px solid ${tokens.hairline}`, borderRadius: 10, padding: '4px 20px' }}>
          <LedgerList
            rows={settlements.map(s => ({
              key: s.id,
              date: formatDate(s.created_at),
              primary: 'Order payout',
              secondary: s.status,
              status: s.status,
              amount: formatKES(s.amount),
            }))}
          />
        </div>
      )}
    </div>
  );
};

// -------------------- Main Settlements Page --------------------
const Settlements: React.FC = () => {
  const { businessId } = useAuth();
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!businessId) return;
    api.businesses.get(businessId)
      .then(data => {
        setBusiness(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [businessId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!business) {
    return <ErrorState message="Could not load business details." onRetry={() => window.location.reload()} />;
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 16px 60px', background: tokens.paper, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.6rem', fontWeight: 500, color: tokens.ink, margin: '4px 0 24px' }}>
        Payments
      </h1>
      {business.payment_model === 'credit' ? (
        <CreditPaymentsView business={business} />
      ) : (
        <PaygPaymentsView />
      )}
    </div>
  );
};

export default Settlements;