import React, { useState } from 'react';
import { haversineKm } from '../utils/distance';
import { Order } from '../types/order';
import { PhoneIcon, CameraIcon, NavigateIcon, CheckCircleIcon, ChevronRightIcon } from './icons';
import { color, radius, shadow } from '../styles/tokens';

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
  const [showMore, setShowMore] = useState(false);

  const pickupLat = cleanCoord(order.pickup_location?.lat);
  const pickupLon = cleanCoord(order.pickup_location?.lon);
  const deliveryLat = cleanCoord(order.delivery_location?.lat);
  const deliveryLon = cleanCoord(order.delivery_location?.lon);

  const pickupDistance =
    pickupLat && pickupLon ? haversineKm(riderLocation, { lat: pickupLat, lon: pickupLon }) : null;
  const deliveryDistance =
    pickupLat && pickupLon && deliveryLat && deliveryLon
      ? haversineKm({ lat: pickupLat, lon: pickupLon }, { lat: deliveryLat, lon: deliveryLon })
      : null;
  const totalTrip =
    pickupDistance !== null && deliveryDistance !== null ? pickupDistance + deliveryDistance : null;

  const isArrived = order.status === 'arrived';

  return (
    <div
      onClick={() => onSelect?.(order.id)}
      style={{
        background: color.surface,
        borderRadius: radius.lg,
        border: `1px solid ${isSelected ? color.amber : color.border}`,
        boxShadow: isSelected ? `0 0 0 3px ${color.amberSoft}` : shadow.card,
        padding: 0,
        marginBottom: 14,
        cursor: onSelect ? 'pointer' : 'default',
        overflow: 'hidden',
        transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
      }}
    >
      {/* Header strip */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 16px 12px',
          borderBottom: `1px solid ${color.border}`,
        }}
      >
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: color.inkFaint, marginBottom: 2 }}>
            {order.order_number}
          </div>
          {isPendingSync && (
            <span
              style={{
                display: 'inline-block',
                background: color.amberSoft,
                color: color.amberDark,
                padding: '2px 8px',
                borderRadius: radius.pill,
                fontSize: 10.5,
                fontWeight: 650,
                marginTop: 2,
              }}
            >
              Pending sync
            </span>
          )}
        </div>
        <span
          style={{
            background: isArrived ? color.successSoft : color.infoSoft,
            color: isArrived ? color.success : color.info,
            padding: '4px 10px',
            borderRadius: radius.pill,
            fontSize: 11.5,
            fontWeight: 650,
            textTransform: 'capitalize',
          }}
        >
          {order.status.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Route summary */}
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          {/* vertical route line */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 3 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: color.success, flexShrink: 0 }} />
            <span style={{ width: 2, flex: 1, background: color.border, margin: '3px 0', minHeight: 22 }} />
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: color.danger, flexShrink: 0 }} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              {order.business_logo && (
                <img
                  src={order.business_logo}
                  alt=""
                  style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
                />
              )}
              <span style={{ fontSize: 14.5, fontWeight: 650, color: color.ink }}>
                {order.business_name || 'Pickup point'}
              </span>
              {pickupDistance !== null && (
                <span style={{ fontSize: 12, color: color.inkFaint, marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>
                  {pickupDistance.toFixed(1)} km
                </span>
              )}
            </div>
            <div style={{ height: 18 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14.5, fontWeight: 650, color: color.ink }}>
                {order.customer_name || 'Delivery address'}
              </span>
              {deliveryDistance !== null && (
                <span style={{ fontSize: 12, color: color.inkFaint, marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>
                  {deliveryDistance.toFixed(1)} km
                </span>
              )}
            </div>
          </div>
        </div>

        {totalTrip !== null && (
          <div
            style={{
              marginTop: 10,
              paddingTop: 10,
              borderTop: `1px solid ${color.border}`,
              fontSize: 12.5,
              color: color.inkMuted,
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>Total route</span>
            <span style={{ fontWeight: 650, color: color.ink, fontVariantNumeric: 'tabular-nums' }}>
              {totalTrip.toFixed(1)} km
            </span>
          </div>
        )}
      </div>

      {/* Items */}
      <div style={{ padding: '0 16px 14px' }}>
        <div style={{ background: color.surfaceMuted, borderRadius: radius.md, padding: 10 }}>
          {order.items.map((item) => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 2px' }}>
              {item.thumbnail_url ? (
                <img src={item.thumbnail_url} alt="" style={{ width: 30, height: 30, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
              ) : (
                <div style={{ width: 30, height: 30, borderRadius: 6, background: color.border, flexShrink: 0 }} />
              )}
              <span style={{ fontSize: 13.5, color: color.inkMuted, fontWeight: 500 }}>
                {item.product_name} <strong style={{ color: color.ink, fontWeight: 650 }}>\u00d7{item.quantity}</strong>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* More details toggle */}
      <div style={{ padding: '0 16px 12px' }}>
        <button
          onClick={() => setShowMore(v => !v)}
          style={{
            width: '100%',
            background: 'transparent',
            border: `1px solid ${color.border}`,
            borderRadius: 8,
            padding: '8px 12px',
            color: color.inkMuted,
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>More details</span>
          <ChevronRightIcon size={16} color={color.inkFaint} />
        </button>
      </div>
      {showMore && (
        <div style={{ padding: '0 16px 12px' }}>
          {/* Additional details already present in items and recipient section */}
        </div>
      )}

      {/* Recipient + payout */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 16px 14px',
        }}
      >
        <div>
          <div style={{ fontSize: 11, color: color.inkFaint, marginBottom: 2 }}>Recipient</div>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: color.inkMuted }}>
            {order.customer_name || 'Anonymous recipient'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: color.inkFaint, marginBottom: 2 }}>Payout</div>
          <div style={{ fontSize: 16.5, fontWeight: 700, color: color.ink, fontVariantNumeric: 'tabular-nums' }}>
            KES {order.total_amount}
          </div>
        </div>
      </div>

      {order.customer_phone && (
        <div style={{ padding: '0 16px 14px' }}>
          <a
            href={`tel:${order.customer_phone}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              color: color.inkMuted,
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            <PhoneIcon size={14} color={color.inkFaint} />
            {order.customer_phone}
          </a>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 16px 16px' }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(order);
          }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '13px',
            background: color.amber,
            color: color.ink,
            border: 'none',
            borderRadius: radius.md,
            fontWeight: 700,
            fontSize: 14.5,
            cursor: 'pointer',
          }}
        >
          <NavigateIcon size={16} color={color.ink} />
          Start navigation
        </button>

        {order.status === 'out_for_delivery' && onArrive && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onArrive(order.id);
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '13px',
              background: color.ink,
              color: color.surface,
              border: 'none',
              borderRadius: radius.md,
              fontWeight: 650,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            <CheckCircleIcon size={16} color={color.surface} />
            Mark as arrived
          </button>
        )}

        {isArrived && onTakePhoto && (
          <div style={{ borderTop: `1px solid ${color.border}`, paddingTop: 12, marginTop: 2 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: color.success,
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 10,
                justifyContent: 'center',
              }}
            >
              <CheckCircleIcon size={15} color={color.success} />
              Waiting for proof of delivery
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTakePhoto();
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '12px',
                background: color.surfaceMuted,
                color: color.ink,
                border: `1px solid ${color.border}`,
                borderRadius: radius.md,
                fontWeight: 650,
                fontSize: 13.5,
                cursor: 'pointer',
              }}
            >
              <CameraIcon size={16} color={color.ink} />
              Capture delivery photo
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