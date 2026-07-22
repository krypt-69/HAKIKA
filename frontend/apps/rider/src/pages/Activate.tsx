import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Config } from '@hakika/config';

const Activate: React.FC = () => {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [step, setStep] = useState<'identifier' | 'password'>('identifier');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [riderId, setRiderId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const resp = await fetch(`${Config.API_BASE}/auth/activate/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.detail || 'No pending rider found');
      }
      const data = await resp.json();
      setName(data.name);
      setBusinessName(data.business_name);
      setEmail(data.email);
      setRiderId(data.rider_id);
      setStep('password');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const resp = await fetch(`${Config.API_BASE}/auth/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.detail || 'Activation failed');
      }
      const data = await resp.json();
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('refreshToken', data.refresh_token);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '100px auto', padding: 20 }}>
      <h1>Activate Rider Account</h1>
      {step === 'identifier' && (
        <form onSubmit={handleCheck}>
          <div style={{ marginBottom: 12 }}>
            <label>Email or Phone</label>
            <input
              type="text"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              placeholder="Enter your email or phone"
              required
              style={{ width: '100%', padding: 10, fontSize: 16, marginTop: 4 }}
            />
          </div>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: 12, fontSize: 16, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8 }}
          >
            {loading ? 'Checking...' : 'Continue'}
          </button>
        </form>
      )}
      {step === 'password' && (
        <div>
          <p style={{ fontSize: 18, fontWeight: 'bold' }}>Welcome, {name}</p>
          <p style={{ color: '#666' }}>Business: {businessName}</p>
          <p style={{ color: '#666' }}>Email: {email}</p>
          <p style={{ fontSize: 14, color: '#888' }}>You will use this email to log in.</p>
          <form onSubmit={handleActivate}>
            <div style={{ marginBottom: 12 }}>
              <label>Create Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ width: '100%', padding: 10, fontSize: 16, marginTop: 4 }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label>Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                style={{ width: '100%', padding: 10, fontSize: 16, marginTop: 4 }}
              />
            </div>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: 12, fontSize: 16, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8 }}
            >
              {loading ? 'Activating...' : 'Activate & Login'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Activate;
