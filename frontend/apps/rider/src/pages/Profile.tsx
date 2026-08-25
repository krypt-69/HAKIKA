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

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              padding: '10px 16px',
              backgroundColor: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              cursor: 'pointer',
              opacity: uploading ? 0.6 : 1,
            }}
          >
            {uploading ? 'Uploading...' : 'Change Profile Picture'}
          </button>
        </div>
      ) : (
        <p>Profile not found.</p>
      )}
    </div>
  );
};

export default Profile;
