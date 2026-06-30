import React, { useState } from 'react';
import { useCustomerAuth } from '../auth/CustomerAuthContext';
import { Navigate } from 'react-router-dom';

const PhoneLogin: React.FC = () => {
  const { loginWithPhone, isAuthenticated } = useCustomerAuth();
  const [phone, setPhone] = useState('0715982985');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/" />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginWithPhone(phone);
    } catch (err: any) {
      setError(err.message || 'Failed to verify phone');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '100px auto', padding: 20, textAlign: 'center' }}>
      <h1>Welcome to Hakika</h1>
      <p>Enter your phone number to continue</p>
      <form onSubmit={handleSubmit}>
        <input
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="0712345678"
          required
          style={{ width: '100%', padding: 12, fontSize: 18, marginTop: 20 }}
        />
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: 12, marginTop: 16, fontSize: 16 }}
        >
          {loading ? 'Verifying...' : 'Continue'}
        </button>
      </form>
    </div>
  );
};

export default PhoneLogin;
