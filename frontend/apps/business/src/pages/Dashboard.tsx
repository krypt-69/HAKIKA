import React, { useEffect, useState } from 'react';
import { useAuth } from '@hakika/auth';

const Dashboard: React.FC = () => {
  const { businessId, businessName } = useAuth();
  const [name, setName] = useState<string | null>(businessName);

  useEffect(() => {
    if (name) return;
    if (!businessId) return;
    const token = localStorage.getItem('token');
    fetch(`http://localhost:8000/api/v1/businesses/${businessId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => setName(data.name))
      .catch(() => {});
  }, [businessId, name]);

  return (
    <div>
      <h1>Welcome to Hakika</h1>
      {name && <p style={{ fontSize: '1.2em', marginTop: 8 }}>Your business: <strong>{name}</strong></p>}
      {!name && <p>Loading your business...</p>}
    </div>
  );
};

export default Dashboard;
