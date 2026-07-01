import React, { useState } from 'react';
import { useAuth } from '@hakika/auth';
import { Navigate, Link } from 'react-router-dom';

const Register: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/" />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const resp = await fetch('http://localhost:8000/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: 'owner' }),
      });
      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.error?.message || 'Registration failed');
      }
      setSuccess('Account created! Logging you in...');
      await login(email, password);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '100px auto', padding: 20 }}>
      <h1>Register Business Account</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
            style={{ width: '100%', padding: 10, fontSize: 16, marginTop: 4 }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
            style={{ width: '100%', padding: 10, fontSize: 16, marginTop: 4 }} />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {success && <p style={{ color: 'green' }}>{success}</p>}
        <button type="submit" disabled={loading}
          style={{ width: '100%', padding: 12, fontSize: 16, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8 }}>
          {loading ? 'Creating account...' : 'Register'}
        </button>
      </form>
      <p style={{ marginTop: 16, textAlign: 'center' }}>
        Already have an account? <Link to="/login">Login here</Link>
      </p>
    </div>
  );
};

export default Register;
