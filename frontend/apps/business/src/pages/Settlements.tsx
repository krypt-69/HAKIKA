import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { api } from '../api';
import { Card, Button, LoadingSpinner, ErrorState, EmptyState, SectionHeader } from '../components';

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
      <SectionHeader title="Payments & Credit" subtitle="Manage your credit balance and view transactions" />
      {success && <div style={{ background: '#dcfce7', color: '#16a34a', padding: '10px 16px', borderRadius: '6px', marginBottom: '16px' }}>{success}</div>}
      {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 16px', borderRadius: '6px', marginBottom: '16px' }}>{error}</div>}
      {phoneError && (
        <div style={{ background: '#fef9e7', border: '1px solid #f59e0b', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
          <p style={{ fontWeight: 600, color: '#111', marginBottom: 8 }}>Phone number required</p>
          <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: 12 }}>
            Add the phone number that should receive the M-Pesa STK prompt.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="tel"
              value={phoneInput}
              onChange={e => setPhoneInput(e.target.value)}
              placeholder="0712345678"
              style={{ flex: 1, padding: 8, borderRadius: 4, border: '1px solid #d1d5db' }}
            />
            <button
              onClick={handleSavePhoneAndRetry}
              style={{ padding: '8px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4, whiteSpace: 'nowrap' }}
            >
              Save & Retry
            </button>
          </div>
        </div>
      )}

      {/* Credit Balance & Volume Card */}
      <Card style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Available Credit</p>
            <p style={{ fontSize: '2rem', fontWeight: 700, color: lowCredit ? '#dc2626' : '#16a34a' }}>KES {creditBalance.toFixed(2)}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Remaining Volume</p>
            <p style={{ fontSize: '2rem', fontWeight: 700, color: '#111111' }}>KES {remainingVolume.toFixed(2)}</p>
            <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>Approximate remaining order capacity</p>
          </div>
        </div>
        {lowCredit && (
          <p style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: 12 }}>⚠️ Low credit – top up to continue accepting orders.</p>
        )}
      </Card>

      {/* Credit Plans */}
      <SectionHeader title="Credit Plans" subtitle="Purchase credit to accept more orders" />
      {creditPlans.length === 0 ? (
        <EmptyState title="No plans available" description="Check back later for credit plans" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {creditPlans.map(plan => (
            <Card key={plan.id}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{plan.name}</h3>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a', margin: '8px 0' }}>KES {plan.price.toFixed(0)}</p>
              <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Processing credit: KES {plan.credit_amount.toFixed(0)}</p>
              {plan.description && <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 4 }}>{plan.description}</p>}
              <Button variant="primary" size="sm" onClick={() => handlePurchase(plan.id)} isLoading={purchasing === plan.id} disabled={purchasing === plan.id} style={{ marginTop: 12, width: '100%' }}>
                Buy
              </Button>
            </Card>
          ))}
        </div>
      )}

      {/* Purchase History */}
      <SectionHeader title="Purchase History" subtitle="All credit purchases" />
      {purchaseHistory.length === 0 ? (
        <EmptyState title="No purchases yet" description="Your credit purchases will appear here" />
      ) : (
        <Card>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '8px' }}>Date</th>
                <th style={{ padding: '8px' }}>Amount Paid</th>
                <th style={{ padding: '8px' }}>Credit Received</th>
                <th style={{ padding: '8px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {purchaseHistory.map(order => (
                <tr key={order.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px', fontSize: '0.875rem' }}>{new Date(order.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: '8px' }}>KES {order.amount_paid.toFixed(0)}</td>
                  <td style={{ padding: '8px' }}>KES {order.credit_received.toFixed(0)}</td>
                  <td style={{ padding: '8px' }}>{order.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
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

  return (
    <div>
      <SectionHeader title="Payments & Settlements" subtitle="View your payout history" />
      {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 16px', borderRadius: '6px', marginBottom: '16px' }}>{error}</div>}

      {settlements.length === 0 ? (
        <EmptyState title="No settlements yet" description="Settlements will appear here when customers pay for orders" />
      ) : (
        <Card>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '8px' }}>Date</th>
                <th style={{ padding: '8px' }}>Amount</th>
                <th style={{ padding: '8px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {settlements.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px', fontSize: '0.875rem' }}>{new Date(s.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: '8px' }}>KES {s.amount.toFixed(2)}</td>
                  <td style={{ padding: '8px' }}>{s.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
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

  // Hard split by payment model
  if (business.payment_model === 'credit') {
    return <CreditPaymentsView business={business} />;
  }

  return <PaygPaymentsView />;
};

export default Settlements;
