import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, authenticatedFetch } from '@hakika/auth';
import { Config } from '@hakika/config';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [imageVersion, setImageVersion] = useState(0);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const resp = await authenticatedFetch(
          `${Config.API_BASE}/riders/me`,
          undefined,
          'hakika_rider'
        );
        if (!resp.ok) {
          throw new Error('Failed to load rider profile');
        }
        const data = await resp.json();
        setProfile(data);
        // Fetch associated businesses
        const bizResp = await authenticatedFetch(
          `${Config.API_BASE}/riders/me/businesses`,
          undefined,
          'hakika_rider'
        );
        if (bizResp.ok) {
          const bizData = await bizResp.json();
          setBusinesses(bizData || []);
        }
        const invResp = await authenticatedFetch(
          `${Config.API_BASE}/riders/invitations`,
          undefined,
          'hakika_rider'
        );
        if (invResp.ok) {
          const invData = await invResp.json();
          setInvitations(invData || []);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);

      const resp = await authenticatedFetch(
        `${Config.API_BASE}/riders/me/profile-picture`,
        { method: 'POST', body: formData },
        'hakika_rider'
      );
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ detail: 'Upload failed' }));
        throw new Error(err.detail || 'Upload failed');
      }

      const updated = await resp.json();
      setProfile(updated);
      setImageVersion(v => v + 1);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 24 }}>Loading profile...</div>;
  }


  const handleAcceptInvitation = async (invitationId: string) => {
    await authenticatedFetch(`${Config.API_BASE}/riders/invitations/${invitationId}/accept`, { method: 'POST' }, 'hakika_rider');
    window.location.reload();
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    await authenticatedFetch(`${Config.API_BASE}/riders/invitations/${invitationId}/decline`, { method: 'POST' }, 'hakika_rider');
    window.location.reload();
  };

  return (
    <div style={{ maxWidth: 500, margin: '40px auto', padding: 20 }}>
      <button onClick={() => navigate('/')} style={{ marginBottom: 16 }}>← Back</button>
      <h1>Rider Profile</h1>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {profile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {profile.profile_picture_url ? (
              <img
                src={`${profile.profile_picture_url}?v=${imageVersion}`}
                alt="Profile"
                style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  background: '#e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 48,
                  fontWeight: 700,
                  color: '#111111',
                }}
              >
                {profile.name?.charAt(0).toUpperCase() || 'R'}
              </div>
            )}

            <div>
              <p><strong>Name:</strong> {profile.name || 'N/A'}</p>
              <p><strong>Email:</strong> {profile.email || user?.email || 'N/A'}</p>
              <p><strong>Phone:</strong> {profile.phone || 'N/A'}</p>
              <p><strong>Status:</strong> {profile.status}</p>
            </div>
          </div>


          {invitations.length > 0 && (
            <div style={{ marginTop: 16, padding: 12, background: '#eff6ff', borderRadius: 8, border: '1px solid #2563eb' }}>
              <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 8 }}>Invitations</p>
              {invitations.map((inv: any) => (
                <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #eee' }}>
                  <span style={{ fontSize: '0.9rem', color: '#111827' }}>{inv.business_name}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => handleAcceptInvitation(inv.id)} style={{ padding: '5px 10px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.75rem' }}>Accept</button>
                    <button onClick={() => handleDeclineInvitation(inv.id)} style={{ padding: '5px 10px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.75rem' }}>Decline</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {businesses.length > 0 && (
            <div style={{ marginTop: 16, padding: 12, background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
              <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 8 }}>My Businesses</p>
              {businesses.map((biz: any) => (
                <div key={biz.business_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #eee' }}>
                  <span style={{ fontSize: '0.9rem', color: '#111827' }}>{biz.business_name}</span>
                  <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>{biz.status}</span>
                </div>
              ))}
            </div>
          )}


        </div>
      ) : (
        <p>Profile not found.</p>
      )}
    </div>
  );
};

export default Profile;
