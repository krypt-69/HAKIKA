import React, { useEffect, useState } from 'react';
import { api } from '../api';

interface Policy {
  id: string;
  key: string;
  value: string;
  description: string;
  updated_at: string;
}

interface CreditPlan {
  id: string;
  name: string;
  price: number;
  credit_amount: number;
  credit_volume: number;
  active: boolean;
  description: string | null;
}

const Commercial: React.FC = () => {
  // Policies
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Credit Plans
  const [plans, setPlans] = useState<CreditPlan[]>([]);
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [newPlan, setNewPlan] = useState({ name: '', price: 500, credit_amount: 5000, credit_volume: 15000, description: '' });
  const [editingPlan, setEditingPlan] = useState<CreditPlan | null>(null);

  // Purchase History
  const [creditOrders, setCreditOrders] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [p, pl, co] = await Promise.all([
        api.admin.paymentPolicies(),
        api.admin.creditPlans(),
        api.admin.creditOrders(0, 30),
      ]);
      setPolicies(p || []);
      setPlans(pl || []);
      setCreditOrders(co || []);
      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // --- Policy editing ---
  const startEditPolicy = (policy: Policy) => {
    setEditingKey(policy.key);
    setEditValue(policy.value);
  };

  const savePolicy = async (key: string) => {
    try {
      await api.admin.updatePaymentPolicy(key, editValue);
      setSuccess(`Policy "${key}" updated.`);
      setEditingKey(null);
      fetchAll();
    } catch (e: any) { setError(e.message); }
  };

  // --- Plan editing ---
  const handleCreatePlan = async () => {
    try {
      await api.admin.createCreditPlan(
        newPlan.name, newPlan.price, newPlan.credit_amount,
        newPlan.credit_volume, newPlan.description
      );
      setShowCreatePlan(false);
      setNewPlan({ name: '', price: 500, credit_amount: 5000, credit_volume: 15000, description: '' });
      setSuccess('Credit plan created.');
      fetchAll();
    } catch (e: any) { setError(e.message); }
  };

  const handleUpdatePlan = async () => {
    if (!editingPlan) return;
    try {
      await api.admin.updateCreditPlan(editingPlan.id, {
        name: editingPlan.name,
        price: editingPlan.price,
        credit_amount: editingPlan.credit_amount,
        credit_volume: editingPlan.credit_volume,
        active: editingPlan.active,
        description: editingPlan.description,
      });
      setEditingPlan(null);
      setSuccess('Credit plan updated.');
      fetchAll();
    } catch (e: any) { setError(e.message); }
  };

  const handleDeactivatePlan = async (id: string) => {
    if (!confirm('Deactivate this plan?')) return;
    try {
      await api.admin.deleteCreditPlan(id);
      setSuccess('Plan deactivated.');
      fetchAll();
    } catch (e: any) { setError(e.message); }
  };

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 960 }}>
      <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: 24 }}>Commercial Controls</h1>
      {success && <div style={{ background: '#dcfce7', color: '#16a34a', padding: '10px 16px', borderRadius: 6, marginBottom: 16 }}>{success}</div>}
      {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 16px', borderRadius: 6, marginBottom: 16 }}>{error}</div>}

      {/* ── Payment Policies ── */}
      <Section title="Payment Policies">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: 8 }}>Key</th>
              <th style={{ padding: 8 }}>Value</th>
              <th style={{ padding: 8 }}>Description</th>
              <th style={{ padding: 8 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {policies.map(p => (
              <tr key={p.key} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: 8, fontWeight: 500 }}>{p.key}</td>
                <td style={{ padding: 8 }}>
                  {editingKey === p.key ? (
                    <input value={editValue} onChange={e => setEditValue(e.target.value)} style={{ width: 80, padding: 4 }} />
                  ) : p.value}
                </td>
                <td style={{ padding: 8, color: '#6b7280', fontSize: '0.875rem' }}>{p.description}</td>
                <td style={{ padding: 8 }}>
                  {editingKey === p.key ? (
                    <>
                      <button onClick={() => savePolicy(p.key)} style={{ marginRight: 6, padding: '4px 10px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4 }}>Save</button>
                      <button onClick={() => setEditingKey(null)} style={{ padding: '4px 10px', background: '#ddd', border: 'none', borderRadius: 4 }}>Cancel</button>
                    </>
                  ) : (
                    <button onClick={() => startEditPolicy(p)} style={{ padding: '4px 10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4 }}>Edit</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* ── Credit Plans ── */}
      <Section title="Credit Plans">
        <button onClick={() => setShowCreatePlan(true)} style={{ marginBottom: 12, padding: '8px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4 }}>
          + New Plan
        </button>
        {showCreatePlan && (
          <div style={{ background: '#f9fafb', padding: 16, borderRadius: 8, marginBottom: 12 }}>
            <h3 style={{ marginTop: 0 }}>Create Plan</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input placeholder="Name" value={newPlan.name} onChange={e => setNewPlan({ ...newPlan, name: e.target.value })} style={{ padding: 6 }} />
              <input type="number" placeholder="Price (KES)" value={newPlan.price} onChange={e => setNewPlan({ ...newPlan, price: Number(e.target.value) })} style={{ padding: 6 }} />
              <input type="number" placeholder="Credit Amount (KES)" value={newPlan.credit_amount} onChange={e => setNewPlan({ ...newPlan, credit_amount: Number(e.target.value) })} style={{ padding: 6 }} />
              <input type="number" placeholder="Credit Volume (KES)" value={newPlan.credit_volume} onChange={e => setNewPlan({ ...newPlan, credit_volume: Number(e.target.value) })} style={{ padding: 6 }} />
              <input placeholder="Description" value={newPlan.description} onChange={e => setNewPlan({ ...newPlan, description: e.target.value })} style={{ padding: 6 }} />
            </div>
            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <button onClick={handleCreatePlan} style={{ padding: '6px 14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4 }}>Create</button>
              <button onClick={() => setShowCreatePlan(false)} style={{ padding: '6px 14px', background: '#ddd', border: 'none', borderRadius: 4 }}>Cancel</button>
            </div>
          </div>
        )}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: 8 }}>Name</th>
              <th style={{ padding: 8 }}>Price</th>
              <th style={{ padding: 8 }}>Credit</th>
              <th style={{ padding: 8 }}>Volume</th>
              <th style={{ padding: 8 }}>Active</th>
              <th style={{ padding: 8 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {plans.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: 8 }}>
                  {editingPlan?.id === p.id ? (
                    <input value={editingPlan.name} onChange={e => setEditingPlan({ ...editingPlan, name: e.target.value })} style={{ padding: 4, width: '100%' }} />
                  ) : p.name}
                </td>
                <td style={{ padding: 8 }}>
                  {editingPlan?.id === p.id ? (
                    <input type="number" value={editingPlan.price} onChange={e => setEditingPlan({ ...editingPlan, price: Number(e.target.value) })} style={{ padding: 4, width: 80 }} />
                  ) : `KES ${p.price}`}
                </td>
                <td style={{ padding: 8 }}>
                  {editingPlan?.id === p.id ? (
                    <input type="number" value={editingPlan.credit_amount} onChange={e => setEditingPlan({ ...editingPlan, credit_amount: Number(e.target.value) })} style={{ padding: 4, width: 80 }} />
                  ) : `KES ${p.credit_amount}`}
                </td>
                <td style={{ padding: 8 }}>
                  {editingPlan?.id === p.id ? (
                    <input type="number" value={editingPlan.credit_volume} onChange={e => setEditingPlan({ ...editingPlan, credit_volume: Number(e.target.value) })} style={{ padding: 4, width: 80 }} />
                  ) : `KES ${p.credit_volume}`}
                </td>
                <td style={{ padding: 8 }}>{p.active ? 'Yes' : 'No'}</td>
                <td style={{ padding: 8 }}>
                  {editingPlan?.id === p.id ? (
                    <>
                      <button onClick={handleUpdatePlan} style={{ marginRight: 6, padding: '4px 10px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4 }}>Save</button>
                      <button onClick={() => setEditingPlan(null)} style={{ padding: '4px 10px', background: '#ddd', border: 'none', borderRadius: 4 }}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setEditingPlan({ ...p })} style={{ marginRight: 6, padding: '4px 10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4 }}>Edit</button>
                      <button onClick={() => handleDeactivatePlan(p.id)} style={{ padding: '4px 10px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4 }}>Deactivate</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* ── Credit Purchase History ── */}
      <Section title="Credit Purchase History">
        {creditOrders.length === 0 ? <p>No purchases yet.</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: 8 }}>Business</th>
                <th style={{ padding: 8 }}>Amount Paid</th>
                <th style={{ padding: 8 }}>Credit Received</th>
                <th style={{ padding: 8 }}>Status</th>
                <th style={{ padding: 8 }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {creditOrders.map(co => (
                <tr key={co.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 8, fontSize: '0.875rem' }}>{co.business_id?.slice(0, 8)}…</td>
                  <td style={{ padding: 8 }}>KES {co.amount_paid?.toFixed(2)}</td>
                  <td style={{ padding: 8 }}>KES {co.credit_received?.toFixed(2)}</td>
                  <td style={{ padding: 8 }}>{co.status}</td>
                  <td style={{ padding: 8, fontSize: '0.875rem' }}>{co.initiated_at ? new Date(co.initiated_at).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
};

// Small helper component
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ background: '#fff', padding: 20, borderRadius: 8, border: '1px solid #e5e7eb', marginBottom: 24 }}>
    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 12 }}>{title}</h2>
    {children}
  </div>
);

export default Commercial;
