import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { api } from '../api';

const Dashboard: React.FC = () => {
  const { businessId } = useAuth();
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (!businessId) return;
    api.businesses.get(businessId).then((data: any) => setName(data.name || 'Your Business'));
  }, [businessId]);

  return (
    <div>
      <h1>Welcome to Hakika</h1>
      {name ? (
        <p style={{ fontSize: '1.2em', marginTop: 8 }}>Your business: <strong>{name}</strong></p>
      ) : (
        <p>Loading your business...</p>
      )}
    </div>
  );
};

export default Dashboard;
