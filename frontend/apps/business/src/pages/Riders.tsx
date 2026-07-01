import React, { useEffect, useState } from 'react';
import { useAuth } from '@hakika/auth';

interface Rider {
  id: string;
  name: string;
  phone: string;
  status: string;
}

const Riders: React.FC = () => {
  const { businessId, getClient } = useAuth();
  const [riders, setRiders] = useState<Rider[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showForm, setShowForm] = useState(false);
  const token = localStorage.getItem('token');

  const fetchRiders = async () => {
    if (!businessId) return;
    try {
      const resp = await fetch(`http://localhost:8000/api/v1/riders/${businessId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!resp.ok) throw new Error('Failed to load riders');
      const data = await resp.json();
      setRiders(data || []);
    } catch (err: any) { setError(err.message); }
  };

  useEffect(() => { fetchRiders(); }, [businessId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      const resp = await fetch(`http://localhost:8000/api/v1/riders/${businessId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name, phone, email: `${name.toLowerCase().replace(/\s/g, '.')}@rider.hakika` })
      });
      if (!resp.ok) throw new Error('Failed to create rider');
      setSuccess('Rider created!');
      setName('');
      setPhone('');
      setShowForm(false);
      fetchRiders();
    } catch (err: any) { setError(err.message); }
  };

  return (
    <div>
      <h1>Riders</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}

      <button onClick={() => { setShowForm(!showForm); setName(''); setPhone(''); setError(''); setSuccess(''); }}>
        {showForm ? 'Cancel' : '+ Add Rider'}
      </button>

      {showForm && (
        <form onSubmit={handleCreate} style={{ maxWidth: 400, margin: '20px 0' }}>
          <div><label>Name</label><input value={name} onChange={e => setName(e.target.value)} required style={{ width: '100%', padding: 8, marginTop: 4 }} /></div>
          <div><label>Phone</label><input value={phone} onChange={e => setPhone(e.target.value)} required style={{ width: '100%', padding: 8, marginTop: 4 }} /></div>
          <button type="submit" style={{ marginTop: 12, padding: '8px 16px' }}>Create Rider</button>
        </form>
      )}

      <hr style={{ margin: '20px 0' }} />

      {riders.length === 0 ? (
        <p>No riders yet. Add your first rider above.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
              <th>Name</th><th>Phone</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {riders.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid #eee' }}>
                <td>{r.name}</td><td>{r.phone}</td><td>{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Riders;
