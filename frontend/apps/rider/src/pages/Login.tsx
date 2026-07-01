import React, { useState } from 'react';
import { useAuth } from '@hakika/auth';
import { Navigate } from 'react-router-dom';

const Login: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('rider@test.com');
  const [password, setPassword] = useState('secret123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/" />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '100px auto', padding: 20 }}>
      <h1>Hakika Rider</h1>
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
        <button type="submit" disabled={loading}
          style={{ width: '100%', padding: 12, fontSize: 16, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8 }}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
};

export default Login;
