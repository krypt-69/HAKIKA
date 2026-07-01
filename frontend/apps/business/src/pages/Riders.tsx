import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { api } from '../api';

const Riders: React.FC = () => {
  const { businessId } = useAuth();
  const [riders, setRiders] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const fetchRiders = () => {
    if (!businessId) return;
    api.riders.listByBusiness(businessId).then(setRiders).catch((e: any) => setError(e.message));
  };

  useEffect(() => { fetchRiders(); }, [businessId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await fetch(`http://localhost:8000/api/v1/riders/${businessId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ name, phone, email: `${name.toLowerCase().replace(/\s/g, '.')}@rider.hakika` })
      });
      setName(''); setPhone('');
      fetchRiders();
    } catch (err: any) { setError(err.message); }
  };

  return (
    <div>
      <h1>Riders</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleCreate} style={{ marginBottom: 20 }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" required style={{ padding: 8, marginRight: 8 }} />
        <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone" required style={{ padding: 8, marginRight: 8 }} />
        <button type="submit" style={{ padding: 8 }}>Add Rider</button>
      </form>
      {riders.length === 0 && <p>No riders yet.</p>}
      {riders.map(r => (
        <div key={r.id} style={{ border: '1px solid #ddd', padding: 8, marginBottom: 4 }}>
          {r.name} – {r.phone} ({r.status})
        </div>
      ))}
    </div>
  );
};

export default Riders;
