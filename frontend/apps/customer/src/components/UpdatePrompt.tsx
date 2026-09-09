import React from 'react';

interface UpdatePromptProps {
  needRefresh: (() => Promise<void>) | null;
  setNeedRefresh: React.Dispatch<React.SetStateAction<(() => Promise<void>) | null>>;
}

const UpdatePrompt: React.FC<UpdatePromptProps> = ({ needRefresh, setNeedRefresh }) => {
  if (!needRefresh) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 80,
      left: 16,
      right: 16,
      maxWidth: 420,
      margin: '0 auto',
      background: '#111111',
      color: '#ffffff',
      borderRadius: 12,
      padding: '14px 16px',
      boxShadow: '0 6px 24px rgba(0,0,0,0.25)',
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      <div>
        <strong style={{ fontSize: 15 }}>New version available</strong>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#d1d5db' }}>
          We've improved Hakika. Update now to get the latest version.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button
          onClick={() => setNeedRefresh(null)}
          style={{
            background: 'transparent',
            border: '1px solid #6b7280',
            color: '#ffffff',
            borderRadius: 8,
            padding: '8px 14px',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Later
        </button>
        <button
          onClick={async () => {
            if (needRefresh) {
              await needRefresh();
            }
          }}
          style={{
            background: '#16a34a',
            border: 'none',
            color: '#ffffff',
            borderRadius: 8,
            padding: '8px 14px',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Update
        </button>
      </div>
    </div>
  );
};

export default UpdatePrompt;
