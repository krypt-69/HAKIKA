import React, { useState } from 'react';
import type { TripStop } from '../services/tripBuilder';

interface Props {
  stop: TripStop;
  onConfirmPickup: () => void;
  onConfirmDelivery: () => void;
  onRecordEvidence: () => void;
  canSubmit: boolean;
}

const StopActionPanel: React.FC<Props> = ({
  stop,
  onConfirmPickup,
  onConfirmDelivery,
  onRecordEvidence,
  canSubmit,
}) => {
  const [action, setAction] = useState<'idle' | 'submitting' | 'success'>('idle');

  const handlePickup = () => {
    if (!canSubmit || action === 'submitting') return;
    setAction('submitting');
    onConfirmPickup();
    setAction('success');
  };

  const handleDelivery = () => {
    if (!canSubmit || action === 'submitting') return;
    setAction('submitting');
    onRecordEvidence();
    onConfirmDelivery();
    setAction('success');
  };

  return (
    <div style={{ backgroundColor: '#eff6ff', border: '1px solid #2563eb', borderRadius: 12, padding: 16, marginTop: 12 }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700 }}>
        {stop.type === 'pickup' ? 'Pickup' : 'Delivery'} — {stop.label}
      </h3>
      {stop.type === 'pickup' ? (
        <>
          <p style={{ fontSize: 14, color: '#4b5563' }}>
            Confirm you have picked up {stop.orderIds.length} order(s).
          </p>
          <button
            onClick={handlePickup}
            disabled={!canSubmit || action === 'submitting'}
            style={{
              width: '100%',
              padding: 12,
              backgroundColor: canSubmit && action !== 'submitting' ? '#16a34a' : '#9ca3af',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 700,
              cursor: canSubmit && action !== 'submitting' ? 'pointer' : 'not-allowed',
            }}
          >
            {action === 'submitting' ? 'Confirming…' : 'Confirm Pickup'}
          </button>
        </>
      ) : (
        <>
          <p style={{ fontSize: 14, color: '#4b5563' }}>
            Record delivery evidence and confirm delivery.
          </p>
          <button
            onClick={handleDelivery}
            disabled={!canSubmit || action === 'submitting'}
            style={{
              width: '100%',
              padding: 12,
              backgroundColor: canSubmit && action !== 'submitting' ? '#6366f1' : '#9ca3af',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 700,
              cursor: canSubmit && action !== 'submitting' ? 'pointer' : 'not-allowed',
            }}
          >
            {action === 'submitting' ? 'Submitting…' : 'Confirm Delivery'}
          </button>
        </>
      )}
    </div>
  );
};

export default StopActionPanel;
