import React, { useEffect, useState } from 'react';

const Health: React.FC = () => {
  const [health, setHealth] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('http://localhost:8000/api/v1/health')
      .then(r => r.json())
      .then(data => setHealth(data))
      .catch(err => setError(err.message));
  }, []);

  return (
    <div>
      <h1>System Health</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {health && (
        <div style={{ marginTop: 20, display: 'grid', gap: 12 }}>
          <div style={{ padding: 16, background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <strong>API:</strong> {health.status}
          </div>
          <div style={{ padding: 16, background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <strong>Database:</strong> {health.database}
          </div>
          <div style={{ padding: 16, background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <strong>Redis:</strong> {health.redis}
          </div>
          <div style={{ padding: 16, background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <strong>Payment Provider:</strong> {health.payment_provider}
          </div>
        </div>
      )}
    </div>
  );
};

export default Health;
