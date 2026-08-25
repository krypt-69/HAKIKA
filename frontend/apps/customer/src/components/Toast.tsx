import React, { useEffect, useState } from 'react';

interface Props {
  message: string | null;
  onDismiss: () => void;
}

const Toast: React.FC<Props> = ({ message, onDismiss }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onDismiss, 300);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [message, onDismiss]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: '#111',
        color: '#fff',
        padding: '12px 24px',
        borderRadius: 8,
        fontSize: 14,
        fontWeight: 600,
        zIndex: 1000,
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      }}
    >
      {message}
    </div>
  );
};

export default Toast;
