import React, { useState } from 'react';
import { haversineKm } from '../utils/distance';
import { Order } from '../types/order';
import { PhoneIcon, CameraIcon, NavigateIcon, CheckCircleIcon, ChevronRightIcon } from './icons';
import { color, font, space, radius, shadow, getStatusStyle } from '../styles/tokens';

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

// Small filled/outlined dot used to tell pickup and delivery rows apart at a
// glance, without pulling in another icon asset.
const RouteDot: React.FC<{ filled?: boolean; tone: string }> = ({ filled, tone }) => (
  <span
    style={{
      width: 7,
      height: 7,
      borderRadius: '50%',
      background: filled ? tone : 'transparent',
      border: `1.5px solid ${tone}`,
      display: 'inline-block',
      flexShrink: 0,
    }}
  />
);

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
  const status = getStatusStyle(order.status);

  return (
    <div
      onClick={() => onSelect?.(order.id)}
      style={{
        fontFamily: font.family,
        background: color.surface,
        borderRadius: radius.lg,
        border: `1px solid ${isSelected ? color.amber : color.border}`,
        boxShadow: isSelected ? `0 0 0 3px ${color.amberSoft}` : shadow.card,
        marginBottom: space(3.5),
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
          padding: `${space(3.5)}px ${space(4)}px ${space(3)}px`,
          borderBottom: `1px solid ${color.border}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: space(2) }}>
          <span style={{ fontSize: font.size.caption, fontWeight: font.weight.semibold, color: color.inkFaint, fontVariantNumeric: 'tabular-nums' }}>
            {order.order_number}
          </span>
          {isPendingSync && (
            <span
              style={{
                background: color.amberSoft,
                color: color.amberDark,
                padding: '3px 8px',
                borderRadius: radius.pill,
                fontSize: 10.5,
                fontWeight: font.weight.semibold,
              }}
            >
              Pending sync
            </span>
          )}
        </div>
        <span
          style={{
            background: status.bg,
            color: status.fg,
            padding: '4px 10px',
            borderRadius: radius.pill,
            fontSize: font.size.caption,
            fontWeight: font.weight.semibold,
          }}
        >
          {status.label}
        </span>
      </div>

      {/* Compact summary (always visible) */}
      <div style={{ padding: space(4) }}>
        <div style={{ display: 'flex', gap: space(3), alignItems: 'flex-start' }}>
          {order.business_logo ? (
            <img
              src={order.business_logo}
              alt=""
              style={{ width: 64, height: 64, borderRadius: radius.md, objectFit: 'cover', flexShrink: 0 }}
            />
          ) : (
            <div style={{ width: 64, height: 64, borderRadius: radius.md, background: color.surfaceMuted, flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: font.size.bodyLarge,
                fontWeight: font.weight.bold,
                color: color.ink,
                marginBottom: space(2),
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {order.business_name || 'Pickup point'}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: space(2) }}>
              <RouteDot tone={color.amber} filled />
              <span style={{ fontSize: font.size.small, color: color.inkMuted, flex: 1 }}>Pickup</span>
              <span style={{ fontSize: font.size.small, fontWeight: font.weight.medium, color: color.ink, fontVariantNumeric: 'tabular-nums' }}>
                {pickupDistance !== null ? `${pickupDistance.toFixed(1)} km` : '—'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: space(2), marginTop: space(1.5) }}>
              <RouteDot tone={color.inkFaint} />
              <span style={{ fontSize: font.size.small, color: color.inkMuted, flex: 1 }}>Delivery</span>
              <span style={{ fontSize: font.size.small, fontWeight: font.weight.medium, color: color.ink, fontVariantNumeric: 'tabular-nums' }}>
                {deliveryDistance !== null ? `${deliveryDistance.toFixed(1)} km` : '—'}
              </span>
            </div>
          </div>
        </div>

        {order.delivery_note && order.delivery_note.trim() && (
          <div
            style={{
              marginTop: space(3),
              paddingTop: space(3),
              borderTop: `1px solid ${color.border}`,
              fontSize: font.size.small,
            }}
          >
            <div style={{ fontSize: font.size.caption, color: color.inkFaint, marginBottom: space(1) }}>
              Delivery information
            </div>
            <div style={{ color: color.ink, fontWeight: font.weight.medium, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {order.delivery_note}
            </div>
          </div>
        )}

        {totalTrip !== null && (
          <div
            style={{
              marginTop: space(3),
              paddingTop: space(3),
              borderTop: `1px solid ${color.border}`,
              fontSize: font.size.small,
              color: color.inkMuted,
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>Total route</span>
            <span style={{ fontWeight: font.weight.bold, color: color.ink, fontVariantNumeric: 'tabular-nums' }}>
              {totalTrip.toFixed(1)} km
            </span>
          </div>
        )}
      </div>

      {/* More details toggle (always visible) */}
      <div style={{ padding: `0 ${space(4)}px ${space(3)}px` }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMore((v) => !v);
          }}
          style={{
            width: '100%',
            minHeight: 44,
            background: 'transparent',
            border: `1px solid ${color.border}`,
            borderRadius: radius.sm,
            padding: `0 ${space(3)}px`,
            color: color.inkMuted,
            fontFamily: font.family,
            fontWeight: font.weight.semibold,
            fontSize: font.size.small,
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{showMore ? 'Hide details' : 'More details'}</span>
          <span
            style={{
              display: 'inline-flex',
              transform: showMore ? 'rotate(90deg)' : 'none',
              transition: 'transform 0.15s ease',
            }}
          >
            <ChevronRightIcon size={16} color={color.inkFaint} />
          </span>
        </button>
      </div>

      {/* Expanded content */}
      {showMore && (
        <>
          {/* Items */}
          <div style={{ padding: `0 ${space(4)}px ${space(3.5)}px` }}>
            <div style={{ background: color.surfaceMuted, borderRadius: radius.md, padding: space(2.5) }}>
              {order.items.map((item, idx) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: space(2.5),
                    padding: `${space(1.5)}px 0`,
                    borderTop: idx === 0 ? 'none' : `1px solid ${color.border}`,
                  }}
                >
                  {item.thumbnail_url ? (
                    <img src={item.thumbnail_url} alt="" style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: color.border, flexShrink: 0 }} />
                  )}
                  <span style={{ fontSize: font.size.small, color: color.inkMuted, fontWeight: font.weight.regular }}>
                    {item.product_name}{' '}
                    <span style={{ color: color.ink, fontWeight: font.weight.semibold }}>×{item.quantity}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recipient + payout */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: `0 ${space(4)}px ${space(3.5)}px` }}>
            <div>
              <div style={{ fontSize: font.size.caption, color: color.inkFaint, marginBottom: space(1) }}>Recipient</div>
              <div style={{ fontSize: font.size.small, fontWeight: font.weight.medium, color: color.inkMuted }}>
                {order.customer_name || 'Anonymous recipient'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: font.size.caption, color: color.inkFaint, marginBottom: space(1) }}>Payout</div>
              <div style={{ fontSize: font.size.title, fontWeight: font.weight.bold, color: color.ink, fontVariantNumeric: 'tabular-nums' }}>
                KES {order.total_amount}
              </div>
            </div>
          </div>

          {order.customer_phone && (
            <div style={{ padding: `0 ${space(4)}px ${space(3.5)}px` }}>
              <a
                href={`tel:${order.customer_phone}`}
                onClick={(e) => e.stopPropagation()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: space(1.5),
                  fontSize: font.size.small,
                  color: color.inkMuted,
                  textDecoration: 'none',
                  fontWeight: font.weight.medium,
                  minHeight: 32,
                }}
              >
                <PhoneIcon size={14} color={color.inkFaint} />
                {order.customer_phone}
              </a>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: space(2), padding: `0 ${space(4)}px ${space(4)}px` }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNavigate(order);
              }}
              style={{
                width: '100%',
                minHeight: 50,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: space(2),
                background: color.amber,
                color: color.ink,
                border: 'none',
                borderRadius: radius.md,
                fontFamily: font.family,
                fontWeight: font.weight.bold,
                fontSize: font.size.bodyLarge,
                cursor: 'pointer',
              }}
            >
              <NavigateIcon size={17} color={color.ink} />
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
                  minHeight: 48,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: space(2),
                  background: color.ink,
                  color: color.surface,
                  border: 'none',
                  borderRadius: radius.md,
                  fontFamily: font.family,
                  fontWeight: font.weight.semibold,
                  fontSize: font.size.body,
                  cursor: 'pointer',
                }}
              >
                <CheckCircleIcon size={16} color={color.surface} />
                Mark as arrived
              </button>
            )}

            {isArrived && onTakePhoto && (
              <div style={{ borderTop: `1px solid ${color.border}`, paddingTop: space(3), marginTop: space(0.5) }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: space(2),
                    color: color.success,
                    fontSize: font.size.small,
                    fontWeight: font.weight.semibold,
                    marginBottom: space(2.5),
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
                    minHeight: 48,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: space(2),
                    background: color.surfaceMuted,
                    color: color.ink,
                    border: `1px solid ${color.border}`,
                    borderRadius: radius.md,
                    fontFamily: font.family,
                    fontWeight: font.weight.semibold,
                    fontSize: font.size.small,
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
        </>
      )}
    </div>
  );
};

export default OrderCard;