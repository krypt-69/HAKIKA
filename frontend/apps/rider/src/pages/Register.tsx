import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, getTokenKey, getRefreshTokenKey } from '@hakika/auth';
import { Config } from '@hakika/config';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !email.trim() || !password) {
      setError('Username, email, and password are required');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch(`${Config.API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
          role: 'rider',
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ detail: 'Registration failed' }));
        throw new Error(err.detail || 'Registration failed');
      }

      // Automatically log in after registration
      const loginResp = await fetch(`${Config.API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (!loginResp.ok) {
        throw new Error('Registration succeeded but login failed. Please log in manually.');
      }
      const data = await loginResp.json();
      localStorage.setItem(getTokenKey('hakika_rider'), data.access_token);
      localStorage.setItem(getRefreshTokenKey('hakika_rider'), data.refresh_token);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: '40px auto', padding: 20 }}>
      <h1>Create Rider Account</h1>
      {error && <p style={{ color: 'red', background: '#fee2e2', padding: 10, borderRadius: 6 }}>{error}</p>}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
        <input placeholder="Name (optional)" value={name} onChange={e => setName(e.target.value)} />
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="tel" placeholder="Phone (e.g. 0712345678)" value={phone} onChange={e => setPhone(e.target.value)} />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
        <input type="password" placeholder="Confirm password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
        <button type="submit" disabled={loading} style={{ padding: 12, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600 }}>
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>
      <p style={{ marginTop: 16 }}>
        <Link to="/login" style={{ color: '#2563eb' }}>Already have an account? Login</Link>
      </p>
      <p style={{ marginTop: 8, fontSize: '0.85rem', color: '#6b7280' }}>
        <Link to="/activate" style={{ color: '#6b7280' }}>Legacy activation</Link>
      </p>
    </div>
  );
};

export default Register;
