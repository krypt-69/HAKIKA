import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { Navigate, Link } from 'react-router-dom';

const Login: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/" />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try { await login(email, password); } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: 400, margin: '100px auto', padding: 20 }}>
      <h1>Hakika Business Login</h1>
      <form onSubmit={handleSubmit}>
        <div><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required style={{ width: '100%', padding: 10 }} /></div>
        <div><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required style={{ width: '100%', padding: 10, marginTop: 10 }} /></div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ width: '100%', padding: 12, marginTop: 10 }}>{loading ? 'Logging in...' : 'Login'}</button>
      </form>
      <p style={{ textAlign: 'center', marginTop: 12 }}>Don't have an account? <Link to="/register">Register</Link></p>
    </div>
  );
};

export default Login;
