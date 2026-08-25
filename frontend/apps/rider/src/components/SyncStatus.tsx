import React from 'react';

interface Props {
  isOnline: boolean;
  pendingCount: number;
  lastSyncStatus: 'success' | 'failed' | null;
  onSyncNow: () => void;
}

const SyncStatus: React.FC<Props> = ({ isOnline, pendingCount, lastSyncStatus, onSyncNow }) => {
  if (!isOnline && pendingCount === 0) return null;
  if (isOnline && pendingCount === 0 && lastSyncStatus !== 'failed') return null;

  let message = '';
  let color = '#f59e0b';
  if (!isOnline && pendingCount > 0) {
    message = `Offline — ${pendingCount} action(s) pending`;
  } else if (isOnline && pendingCount > 0) {
    message = `Syncing… ${pendingCount} action(s) remaining`;
    color = '#2563eb';
  } else if (lastSyncStatus === 'failed') {
    message = 'Sync failed — tap to retry';
    color = '#dc2626';
  } else if (lastSyncStatus === 'success') {
    message = 'All caught up';
    color = '#16a34a';
  }

  return (
    <div
      onClick={lastSyncStatus === 'failed' ? onSyncNow : undefined}
      style={{
        padding: '8px 16px',
        backgroundColor: color,
        color: '#fff',
        fontSize: 13,
        fontWeight: 600,
        textAlign: 'center',
        cursor: lastSyncStatus === 'failed' ? 'pointer' : 'default',
      }}
    >
      {message}
    </div>
  );
};

export default SyncStatus;
