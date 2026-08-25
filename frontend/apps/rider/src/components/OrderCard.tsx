import React from 'react';
import { haversineKm } from '../utils/distance';
import { Order } from '../types/order';

interface Props {
  order: Order;
  riderLocation: { lat: number; lon: number };
  onNavigate: (order: Order) => void;
  isPendingSync?: boolean;
  onArrive?: (orderId: string) => void;
  onTakePhoto?: () => void;
  onPhotoCapture?: (e: React.ChangeEvent<HTMLInputElement>, orderId: string) => void;
  fileInputRef?: React.RefObject<HTMLInputElement>;
  configBase: string;
  isSelected?: boolean;
  onSelect?: (orderId: string) => void;
}

function cleanCoord(val: any): number | null {
  if (val === null || val === undefined) return null;
  const match = String(val).match(/[-0-9.]+/);
  return match ? parseFloat(match[0]) : null;
}

const OrderCard: React.FC<Props> = ({
  order,
  riderLocation,
  onNavigate,
  isPendingSync,
  onArrive,
  onTakePhoto,
  onPhotoCapture,
  fileInputRef,
  configBase,
  isSelected,
  onSelect,
}) => {
  const pickupLat = cleanCoord(order.pickup_location?.lat);
  const pickupLon = cleanCoord(order.pickup_location?.lon);
  const deliveryLat = cleanCoord(order.delivery_location?.lat);
  const deliveryLon = cleanCoord(order.delivery_location?.lon);

  const pickupDistance =
    pickupLat && pickupLon
      ? haversineKm(riderLocation, { lat: pickupLat, lon: pickupLon })
      : null;
  const deliveryDistance =
    pickupLat && pickupLon && deliveryLat && deliveryLon
      ? haversineKm({ lat: pickupLat, lon: pickupLon }, { lat: deliveryLat, lon: deliveryLon })
      : null;
  const totalTrip =
    pickupDistance !== null && deliveryDistance !== null
      ? pickupDistance + deliveryDistance
      : null;

  return (
    <div
      onClick={() => onSelect?.(order.id)}
      style={{
        backgroundColor: '#fff',
        borderRadius: 12,
        border: isSelected ? '3px solid #2563eb' : '2px solid #2563eb',
        padding: 16,
        marginBottom: 16,
        cursor: onSelect ? 'pointer' : 'default',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#2563eb' }}>Invoice Ref</span>
            {isPendingSync && (
              <span style={{ backgroundColor: '#f59e0b', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                Pending sync
              </span>
            )}
          </div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#111827' }}>{order.order_number}</h3>
        </div>
        <span style={{
          backgroundColor: order.status === 'arrived' ? '#d1fae5' : '#dbeafe',
          color: order.status === 'arrived' ? '#065f46' : '#1e40af',
          padding: '4px 10px', borderRadius: 9999, fontSize: 12, fontWeight: 700, textTransform: 'capitalize'
        }}>
          {order.status.replace(/_/g, ' ')}
        </span>
      </div>

      {order.business_name && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px solid #f3f4f6' }}>
          {order.business_logo && (
            <img src={order.business_logo} alt="Logo" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6 }} />
          )}
          <div>
            <span style={{ fontSize: 11, color: '#9ca3af', display: 'block' }}>Pickup Point</span>
            <span style={{ fontWeight: 700, color: '#1f2937', fontSize: 14 }}>
              {order.business_name}
              {pickupDistance !== null && (
                <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 8 }}>
                  {pickupDistance.toFixed(1)} km away
                </span>
              )}
            </span>
          </div>
        </div>
      )}

      {deliveryDistance !== null && (
        <div style={{ padding: '4px 0', borderTop: '1px solid #f3f4f6' }}>
          <span style={{ fontSize: 12, color: '#6b7280' }}>
            Delivery: {deliveryDistance.toFixed(1)} km from pickup
          </span>
        </div>
      )}

      {totalTrip !== null && (
        <div style={{ padding: '4px 0', borderTop: '1px solid #f3f4f6', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
            Total trip: {totalTrip.toFixed(1)} km
          </span>
        </div>
      )}

      <div style={{ backgroundColor: '#f9fafb', padding: 12, borderRadius: 8, margin: '8px 0' }}>
        {order.items.map((item) => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
            {item.thumbnail_url && (
              <img src={item.thumbnail_url} alt="Item" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4 }} />
            )}
            <span style={{ fontSize: 14, color: '#4b5563', fontWeight: 500 }}>
              {item.product_name} <strong style={{ color: '#111827' }}>×{item.quantity}</strong>
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 12 }}>
        <div>
          <span style={{ fontSize: 11, color: '#9ca3af', display: 'block' }}>Recipient</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>
            {order.customer_name || 'Anonymous Recipient'}
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: 11, color: '#9ca3af', display: 'block' }}>Total Payout Amount</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#111827' }}>KES {order.total_amount}</span>
        </div>
      </div>

      {order.customer_phone && (
        <p style={{ margin: '0 0 16px 0', fontSize: 13, color: '#4b5563' }}>
          📞 <strong>Contact:</strong> {order.customer_phone}
        </p>
      )}

      <div style={{ display: 'flex', gap: 8, flexDirection: 'column', marginTop: 12 }}>
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(order); }}
          style={{ width: '100%', padding: '12px', backgroundColor: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
        >
          🧭 Start Navigation
        </button>

        {order.status === 'out_for_delivery' && onArrive && (
          <button
            onClick={(e) => { e.stopPropagation(); onArrive(order.id); }}
            style={{ width: '100%', padding: '14px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
          >
            Mark as Arrived at Target Destination
          </button>
        )}

        {order.status === 'arrived' && onTakePhoto && (
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 12, marginTop: 4 }}>
            <p style={{ color: '#059669', fontSize: 13, fontWeight: 600, margin: '0 0 8px 0', textAlign: 'center' }}>
              🎉 Standing by for Drop-off Verification Photo...
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); onTakePhoto(); }}
              style={{ width: '100%', padding: '12px', backgroundColor: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
            >
              📷 Capture Proof of Delivery Photo
            </button>
            {fileInputRef && (
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onPhotoCapture && onPhotoCapture(e, order.id)}
                style={{ display: 'none' }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderCard;
