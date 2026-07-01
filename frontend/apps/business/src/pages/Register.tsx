import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { api } from '../api';

const Register: React.FC = () => {
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
    try {
      await api.auth.register(email, password, 'owner');
      await login(email, password);
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: 400, margin: '100px auto', padding: 20 }}>
      <h1>Register Business Account</h1>
      <form onSubmit={handleSubmit}>
        <div><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required style={{ width: '100%', padding: 10 }} /></div>
        <div><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required style={{ width: '100%', padding: 10, marginTop: 10 }} /></div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ width: '100%', padding: 12, marginTop: 10 }}>{loading ? 'Creating...' : 'Register'}</button>
      </form>
      <p style={{ textAlign: 'center', marginTop: 12 }}>Already have an account? <Link to="/login">Login</Link></p>
    </div>
  );
};

export default Register;
