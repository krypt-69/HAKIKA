import React, { useState } from 'react';
import { Card, Button } from './index';
import { ChevronLeft, ChevronRight, X as XIcon, ImageIcon, ZoomIn } from 'lucide-react';

interface ProductImage {
  id: string;
  url: string;
  position: number;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  original_price: number;
  discount_price: number | null;
  is_available: boolean;
  selling_unit: string;
  track_inventory: boolean;
  stock_quantity: number | null;
  min_order_quantity: number;
  max_order_quantity: number | null;
  images: ProductImage[];
}

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onToggleAvailability: (id: string, current: boolean) => void;
  isDeleting?: boolean;
  isToggling?: boolean;
}

/* ---------------------------------------------------------------
   Same warm-paper palette as the dashboard, so product cards feel
   like part of the same material rather than a different app.
------------------------------------------------------------------*/
const PAPER = '#F6F2E9';
const CARD = '#FFFFFF';
const INK = '#26211B';
const INK_SOFT = '#7A7266';
const BORDER = '#E7DFCE';
const IMG_BG = '#EFE8D8';

const RUST = '#B4502F';
const RUST_LIGHT = '#F3DDD0';

const FOREST = '#3C6B4C';
const FOREST_LIGHT = '#DEE8DD';

const AMBER = '#B4791D';
const AMBER_LIGHT = '#F2E3C2';

const formatKES = (n: number) => n.toLocaleString('en-KE', { maximumFractionDigits: 0 });

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onEdit,
  onDelete,
  onToggleAvailability,
  isDeleting = false,
  isToggling = false,
}) => {
  const finalPrice = product.discount_price ?? product.original_price;
  const hasDiscount = product.discount_price !== null && product.discount_price < product.original_price;
  const discountPct = hasDiscount
    ? Math.round(((product.original_price - (product.discount_price as number)) / product.original_price) * 100)
    : 0;
  const sortedImages = [...(product.images || [])].sort((a, b) => a.position - b.position);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const showNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLightboxIndex(i => (i + 1) % sortedImages.length);
  };

  const showPrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLightboxIndex(i => (i - 1 + sortedImages.length) % sortedImages.length);
  };

  return (
    <>
      <Card className="product-card">
        {/* Image */}
        <div
          className="product-image-wrap"
          onClick={() => sortedImages.length > 0 && openLightbox(0)}
        >
          {sortedImages.length > 0 ? (
            <>
              <img
                src={sortedImages[0].url}
                alt={product.name}
                className="product-image"
              />
              <div className="zoom-hint">
                <ZoomIn size={12} />
                {sortedImages.length > 1 && <span>{sortedImages.length}</span>}
              </div>
            </>
          ) : (
            <ImageIcon size={28} color={INK_SOFT} strokeWidth={1.6} />
          )}

          {hasDiscount && <div className="discount-badge">-{discountPct}%</div>}

          <div className={`status-chip ${product.is_available ? 'status-chip--on' : 'status-chip--off'}`}>
            <span className="status-chip-dot" />
            {product.is_available ? 'Live' : 'Paused'}
          </div>
        </div>

        {/* Name & Description */}
        <div className="product-body">
          <h3 className="product-name">{product.name}</h3>
          {product.description && (
            <p className="product-desc">{product.description}</p>
          )}

          {/* Pricing */}
          <div className="price-row">
            <span className="price-main">
              KES {formatKES(finalPrice)}
              {product.selling_unit ? <span className="price-unit"> / {product.selling_unit}</span> : null}
            </span>
            {hasDiscount && (
              <span className="price-was">KES {formatKES(product.original_price)}</span>
            )}
          </div>

          {/* Meta pills */}
          {(product.track_inventory && product.stock_quantity !== null) || product.min_order_quantity > 1 ? (
            <div className="meta-row">
              {product.track_inventory && product.stock_quantity !== null && (
                <span className={`meta-pill ${product.stock_quantity <= 5 ? 'meta-pill--low' : ''}`}>
                  {product.stock_quantity} in stock
                </span>
              )}
              {product.min_order_quantity > 1 && (
                <span className="meta-pill">Min {product.min_order_quantity}</span>
              )}
            </div>
          ) : null}

          {/* Availability Toggle */}
          <div className="toggle-row">
            <span className="toggle-label">Available to order</span>
            <button
              onClick={() => onToggleAvailability(product.id, product.is_available)}
              disabled={isToggling}
              className="toggle-switch"
              style={{ background: product.is_available ? FOREST : '#D8D0BF' }}
            >
              <span
                className="toggle-knob"
                style={{ left: product.is_available ? '22px' : '2px' }}
              />
              {isToggling && <span className="spinner spinner-sm toggle-spinner" />}
            </button>
          </div>

          {/* Actions */}
          <div className="action-row">
            <Button variant="secondary" size="sm" onClick={() => onEdit(product)} style={{ flex: 1 }}>
              Edit
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => onDelete(product.id)}
              disabled={isDeleting}
              style={{ flex: 1 }}
            >
              {isDeleting ? '...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Lightbox */}
      {lightboxOpen && sortedImages.length > 0 && (
        <div className="lightbox-overlay" onClick={() => setLightboxOpen(false)}>
          <button className="lightbox-close" onClick={() => setLightboxOpen(false)}>
            <XIcon size={22} />
          </button>

          {sortedImages.length > 1 && (
            <button className="lightbox-nav lightbox-nav-left" onClick={showPrev}>
              <ChevronLeft size={26} />
            </button>
          )}

          <img
            src={sortedImages[lightboxIndex].url}
            alt={product.name}
            className="lightbox-image"
            onClick={(e) => e.stopPropagation()}
          />

          {sortedImages.length > 1 && (
            <button className="lightbox-nav lightbox-nav-right" onClick={showNext}>
              <ChevronRight size={26} />
            </button>
          )}

          {sortedImages.length > 1 && (
            <div className="lightbox-dots" onClick={(e) => e.stopPropagation()}>
              {sortedImages.map((img, i) => (
                <span
                  key={img.id}
                  className="lightbox-dot"
                  style={{ background: i === lightboxIndex ? FOREST : 'rgba(255,255,255,0.4)' }}
                  onClick={() => setLightboxIndex(i)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400..800&family=Inter:wght@400;500;600;700&display=swap');

        .product-card {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: ${CARD};
          border: 1px solid ${BORDER};
          border-radius: 16px;
          overflow: hidden;
          padding: 0 !important;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .product-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(38, 33, 27, 0.08);
        }

        .product-image-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 4 / 3;
          background: ${IMG_BG};
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          cursor: pointer;
        }
        .product-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }
        .product-image-wrap:hover .product-image {
          transform: scale(1.04);
        }

        .zoom-hint {
          position: absolute;
          bottom: 8px;
          right: 8px;
          background: rgba(38,33,27,0.62);
          color: #ffffff;
          border-radius: 20px;
          padding: 3px 8px;
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.68rem;
          font-weight: 600;
        }
        .product-image-wrap:hover .zoom-hint {
          background: ${FOREST};
        }

        .discount-badge {
          position: absolute;
          top: 8px;
          left: 8px;
          background: ${RUST};
          color: #ffffff;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 20px;
          letter-spacing: 0.01em;
        }

        .status-chip {
          position: absolute;
          top: 8px;
          right: 8px;
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.66rem;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 20px;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          backdrop-filter: blur(2px);
        }
        .status-chip--on { background: rgba(222,232,221,0.92); color: ${FOREST}; }
        .status-chip--off { background: rgba(243,221,208,0.92); color: ${RUST}; }
        .status-chip-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
        }

        .product-body {
          padding: 14px;
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .product-name {
          font-family: 'Fraunces', serif;
          font-size: 1rem;
          font-weight: 700;
          color: ${INK};
          margin: 0 0 3px 0;
          line-height: 1.25;
        }
        .product-desc {
          font-size: 0.8rem;
          color: ${INK_SOFT};
          margin: 0 0 10px 0;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .price-row {
          display: flex;
          align-items: baseline;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 8px;
        }
        .price-main {
          font-family: 'Fraunces', serif;
          font-size: 1.05rem;
          font-weight: 700;
          color: ${INK};
        }
        .price-unit {
          font-family: 'Inter', sans-serif;
          font-size: 0.72rem;
          font-weight: 500;
          color: ${INK_SOFT};
        }
        .price-was {
          font-size: 0.78rem;
          color: ${INK_SOFT};
          text-decoration: line-through;
        }

        .meta-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 10px;
        }
        .meta-pill {
          font-size: 0.68rem;
          font-weight: 600;
          color: ${INK_SOFT};
          background: ${PAPER};
          border: 1px solid ${BORDER};
          padding: 3px 8px;
          border-radius: 20px;
        }
        .meta-pill--low {
          color: ${AMBER};
          background: ${AMBER_LIGHT};
          border-color: transparent;
        }

        .toggle-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin: 4px 0 12px 0;
          padding-top: 10px;
          border-top: 1px solid ${BORDER};
        }
        .toggle-label {
          font-size: 0.78rem;
          color: ${INK_SOFT};
          font-weight: 500;
        }
        .toggle-switch {
          position: relative;
          width: 42px;
          height: 23px;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          transition: background 0.2s;
          flex-shrink: 0;
          padding: 0;
        }
        .toggle-switch:disabled { cursor: not-allowed; opacity: 0.7; }
        .toggle-knob {
          position: absolute;
          top: 2px;
          width: 19px;
          height: 19px;
          background: #ffffff;
          border-radius: 50%;
          transition: left 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.25);
        }
        .toggle-spinner {
          position: absolute;
          top: 2px;
          left: 9px;
        }

        .action-row {
          display: flex;
          gap: 8px;
          margin-top: auto;
        }

        .lightbox-overlay {
          position: fixed;
          inset: 0;
          background: rgba(20,17,13,0.88);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 24px;
        }
        .lightbox-image {
          max-width: 90vw;
          max-height: 85vh;
          object-fit: contain;
          border-radius: 10px;
          cursor: default;
        }
        .lightbox-close {
          position: absolute;
          top: 18px;
          right: 18px;
          background: rgba(255,255,255,0.1);
          border: none;
          color: #ffffff;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .lightbox-close:hover { background: rgba(255,255,255,0.2); }
        .lightbox-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(255,255,255,0.1);
          border: none;
          color: #ffffff;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .lightbox-nav:hover { background: rgba(255,255,255,0.2); }
        .lightbox-nav-left { left: 18px; }
        .lightbox-nav-right { right: 18px; }
        .lightbox-dots {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 8px;
        }
        .lightbox-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          cursor: pointer;
        }

        /* Tuned so two cards sit comfortably side by side on phones */
        @media (max-width: 600px) {
          .product-body { padding: 10px; }
          .product-name { font-size: 0.86rem; }
          .product-desc { font-size: 0.72rem; -webkit-line-clamp: 2; margin-bottom: 8px; }
          .price-main { font-size: 0.92rem; }
          .price-was { font-size: 0.68rem; }
          .meta-pill { font-size: 0.62rem; padding: 2px 6px; }
          .toggle-label { font-size: 0.68rem; }
          .toggle-row { margin: 2px 0 10px 0; padding-top: 8px; }
          .toggle-switch { width: 36px; height: 20px; }
          .toggle-knob { width: 16px; height: 16px; }
          .action-row { gap: 6px; }
          .status-chip { font-size: 0.58rem; padding: 2px 6px; }
          .discount-badge { font-size: 0.62rem; padding: 2px 6px; }
          .zoom-hint { font-size: 0.6rem; padding: 2px 6px; }
          .lightbox-nav { width: 38px; height: 38px; }
          .lightbox-close { width: 36px; height: 36px; }
        }
      `}</style>
    </>
  );
};