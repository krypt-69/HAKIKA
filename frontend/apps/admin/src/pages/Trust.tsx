import React, { useEffect, useState } from 'react';

const Trust: React.FC = () => {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('http://localhost:8000/api/v1/businesses')
      .then(r => r.json())
      .then(data => setBusinesses(data || []))
      .catch(err => setError(err.message));
  }, []);

  return (
    <div>
      <h1>Trust Scores</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 20 }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
            <th>Business</th>
            <th>Trust Score</th>
          </tr>
        </thead>
        <tbody>
          {businesses.map((b: any) => (
            <tr key={b.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td>{b.name}</td>
              <td>{b.trust_score?.toFixed(0)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Trust;
