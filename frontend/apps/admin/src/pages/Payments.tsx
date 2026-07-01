import React, { useEffect, useState } from 'react';

const Payments: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    // Use a simple fetch to get recent payments – we don't have an admin payments list endpoint,
    // but we can query the latest orders and show their payment status.
    // For now, show a placeholder.
    setError('Admin payments list endpoint not available yet. Use settlements/orders to track.');
  }, []);

  return (
    <div>
      <h1>Payments</h1>
      {error && <p style={{ color: '#f59e0b' }}>{error}</p>}
    </div>
  );
};

export default Payments;
