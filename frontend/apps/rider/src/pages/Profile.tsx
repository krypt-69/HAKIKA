import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, authenticatedFetch } from '@hakika/auth';
import { Config } from '@hakika/config';
import { CameraIcon, PhoneIcon, CheckCircleIcon, AlertIcon } from '../components/icons';
import { color, radius, shadow, font } from '../styles/tokens';

const BackIcon: React.FC<{ size?: number; c?: string }> = ({ size = 16, c = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 5l-7 7 7 7" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const MailIcon: React.FC<{ size?: number; c?: string }> = ({ size = 15, c = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3.5" y="5.5" width="17" height="13" rx="2" stroke={c} strokeWidth="1.8" />
    <path d="M4.5 6.5l7.5 6 7.5-6" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const BuildingIcon: React.FC<{ size?: number; c?: string }> = ({ size = 15, c = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="3.5" width="10" height="17" rx="1" stroke={c} strokeWidth="1.8" />
    <path d="M15 9h4v11.5h-4M8 7.5h.01M11.5 7.5h.01M8 11h.01M11.5 11h.01M8 14.5h.01M11.5 14.5h.01" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

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
        const resp = await authenticatedFetch(`${Config.API_BASE}/riders/me`, undefined, 'hakika_rider');
        if (!resp.ok) throw new Error('Failed to load rider profile');
        const data = await resp.json();
        setProfile(data);

        const bizResp = await authenticatedFetch(`${Config.API_BASE}/riders/me/businesses`, undefined, 'hakika_rider');
        if (bizResp.ok) setBusinesses((await bizResp.json()) || []);

        const invResp = await authenticatedFetch(`${Config.API_BASE}/riders/invitations`, undefined, 'hakika_rider');
        if (invResp.ok) setInvitations((await invResp.json()) || []);
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

  const handleAcceptInvitation = async (invitationId: string) => {
    await authenticatedFetch(`${Config.API_BASE}/riders/invitations/${invitationId}/accept`, { method: 'POST' }, 'hakika_rider');
    window.location.reload();
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    await authenticatedFetch(`${Config.API_BASE}/riders/invitations/${invitationId}/decline`, { method: 'POST' }, 'hakika_rider');
    window.location.reload();
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: color.surfaceMuted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: color.inkFaint, fontSize: 14, fontFamily: font.family }}>Loading profile\u2026</span>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: color.surfaceMuted, fontFamily: font.family }}>
      {/* Sticky header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: color.surface, borderBottom: `1px solid ${color.border}` }}>
        <div style={{ maxWidth: 520, margin: '0 auto', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/')}
            aria-label="Back"
            style={{
              width: 36,
              height: 36,
              borderRadius: radius.pill,
              border: `1px solid ${color.border}`,
              background: color.surface,
              color: color.inkMuted,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <BackIcon />
          </button>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: color.ink, letterSpacing: '-0.01em' }}>Profile</h1>
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '20px 20px 40px' }}>
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: color.dangerSoft,
              color: color.danger,
              padding: '12px 14px',
              borderRadius: radius.md,
              marginBottom: 16,
              fontSize: 13.5,
              fontWeight: 500,
            }}
          >
            <AlertIcon size={16} />
            {error}
          </div>
        )}

        {profile ? (
          <>
            {/* Identity card */}
            <div
              style={{
                background: color.surface,
                border: `1px solid ${color.border}`,
                borderRadius: radius.lg,
                boxShadow: shadow.card,
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <div style={{ position: 'relative', marginBottom: 14 }}>
                {profile.profile_picture_url ? (
                  <img
                    src={`${profile.profile_picture_url}?v=${imageVersion}`}
                    alt="Profile"
                    style={{ width: 92, height: 92, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${color.surface}`, boxShadow: shadow.card }}
                  />
                ) : (
                  <div
                    style={{
                      width: 92,
                      height: 92,
                      borderRadius: '50%',
                      background: color.amberSoft,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 34,
                      fontWeight: 700,
                      color: color.amberDark,
                    }}
                  >
                    {profile.name?.charAt(0).toUpperCase() || 'R'}
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  aria-label="Change profile picture"
                  style={{
                    position: 'absolute',
                    bottom: -2,
                    right: -2,
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: color.ink,
                    color: color.surface,
                    border: `2px solid ${color.surface}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    opacity: uploading ? 0.6 : 1,
                  }}
                >
                  <CameraIcon size={14} color={color.surface} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
              </div>

              <div style={{ fontSize: 18, fontWeight: 700, color: color.ink, marginBottom: 2 }}>
                {profile.name || 'Rider'}
              </div>
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 650,
                  padding: '3px 10px',
                  borderRadius: radius.pill,
                  background: profile.status === 'active' ? color.successSoft : color.surfaceMuted,
                  color: profile.status === 'active' ? color.success : color.inkMuted,
                  textTransform: 'capitalize',
                }}
              >
                {profile.status || 'unknown'}
              </span>

              <div style={{ width: '100%', marginTop: 20, borderTop: `1px solid ${color.border}`, paddingTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                  <MailIcon c={color.inkFaint} />
                  <span style={{ fontSize: 13.5, color: color.inkMuted }}>{profile.email || user?.email || '\u2014'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                  <PhoneIcon size={15} color={color.inkFaint} />
                  <span style={{ fontSize: 13.5, color: color.inkMuted }}>{profile.phone || '\u2014'}</span>
                </div>
              </div>

              {uploading && (
                <div style={{ marginTop: 12, fontSize: 12.5, color: color.inkFaint }}>Uploading photo\u2026</div>
              )}
            </div>

            {/* Invitations */}
            {invitations.length > 0 && (
              <div
                style={{
                  background: color.infoSoft,
                  border: `1px solid ${color.info}22`,
                  borderRadius: radius.lg,
                  padding: 16,
                  marginBottom: 16,
                }}
              >
                <div style={{ fontSize: 13.5, fontWeight: 650, color: color.info, marginBottom: 10 }}>
                  Business invitations
                </div>
                {invitations.map((inv: any) => (
                  <div
                    key={inv.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 0',
                      borderTop: `1px solid ${color.info}18`,
                    }}
                  >
                    <span style={{ fontSize: 13.5, color: color.ink, fontWeight: 550 }}>{inv.business_name}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => handleAcceptInvitation(inv.id)}
                        style={{
                          padding: '6px 12px',
                          background: color.success,
                          color: '#fff',
                          border: 'none',
                          borderRadius: radius.sm,
                          fontSize: 12,
                          fontWeight: 650,
                          cursor: 'pointer',
                        }}
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleDeclineInvitation(inv.id)}
                        style={{
                          padding: '6px 12px',
                          background: 'transparent',
                          color: color.danger,
                          border: `1px solid ${color.danger}33`,
                          borderRadius: radius.sm,
                          fontSize: 12,
                          fontWeight: 650,
                          cursor: 'pointer',
                        }}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Businesses */}
            {businesses.length > 0 && (
              <div
                style={{
                  background: color.surface,
                  border: `1px solid ${color.border}`,
                  borderRadius: radius.lg,
                  boxShadow: shadow.card,
                  padding: 16,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <BuildingIcon c={color.inkMuted} />
                  <span style={{ fontSize: 13.5, fontWeight: 650, color: color.ink }}>My businesses</span>
                </div>
                {businesses.map((biz: any) => (
                  <div
                    key={biz.business_id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 0',
                      borderTop: `1px solid ${color.border}`,
                    }}
                  >
                    <span style={{ fontSize: 13.5, color: color.inkMuted, fontWeight: 500 }}>{biz.business_name}</span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 11.5,
                        fontWeight: 650,
                        color: color.success,
                        background: color.successSoft,
                        padding: '3px 9px',
                        borderRadius: radius.pill,
                        textTransform: 'capitalize',
                      }}
                    >
                      <CheckCircleIcon size={11} color={color.success} />
                      {biz.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <p style={{ color: color.inkFaint, fontSize: 14 }}>Profile not found.</p>
        )}
      </div>
    </div>
  );
};

export default Profile;