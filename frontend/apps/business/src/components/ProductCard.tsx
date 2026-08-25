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
      <Card className="product-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Image */}
        <div
          className="product-image-wrap"
          onClick={() => sortedImages.length > 0 && openLightbox(0)}
          style={{
            width: '100%',
            height: '160px',
            background: '#f1f5f9',
            borderRadius: '8px',
            overflow: 'hidden',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            cursor: sortedImages.length > 0 ? 'zoom-in' : 'default',
          }}
        >
          {sortedImages.length > 0 ? (
            <>
              <img
                src={sortedImages[0].url}
                alt={product.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div className="zoom-hint">
                <ZoomIn size={14} />
                {sortedImages.length > 1 && <span>{sortedImages.length}</span>}
              </div>
            </>
          ) : (
            <ImageIcon size={32} color="#9ca3af" />
          )}
        </div>

        {/* Name & Description */}
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#111111', marginBottom: '4px' }}>
          {product.name}
        </h3>
        {product.description && (
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '8px', flex: 1 }}>
            {product.description}
          </p>
        )}

        {/* Pricing */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px' }}>
          <span style={{ fontSize: '1.125rem', fontWeight: 700, color: '#111111' }}>
            KES {finalPrice.toFixed(0)}
          </span>
          {hasDiscount && (
            <span style={{ fontSize: '0.875rem', color: '#9ca3af', textDecoration: 'line-through' }}>
              KES {product.original_price.toFixed(0)}
            </span>
          )}
        </div>

        {/* Availability Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            {product.is_available ? 'Available' : 'Unavailable'}
          </span>
          <button
            onClick={() => onToggleAvailability(product.id, product.is_available)}
            disabled={isToggling}
            style={{
              position: 'relative',
              width: '44px',
              height: '24px',
              background: product.is_available ? '#16a34a' : '#d1d5db',
              borderRadius: '12px',
              border: 'none',
              cursor: isToggling ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: '2px',
                left: product.is_available ? '22px' : '2px',
                width: '20px',
                height: '20px',
                background: '#ffffff',
                borderRadius: '50%',
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }}
            />
            {isToggling && (
              <span className="spinner spinner-sm" style={{ position: 'absolute', top: '2px', left: '10px' }} />
            )}
          </button>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
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
                  style={{ background: i === lightboxIndex ? '#16a34a' : 'rgba(255,255,255,0.4)' }}
                  onClick={() => setLightboxIndex(i)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        .zoom-hint {
          position: absolute;
          bottom: 6px;
          right: 6px;
          background: rgba(0,0,0,0.55);
          color: #ffffff;
          border-radius: 20px;
          padding: 3px 8px;
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.7rem;
          font-weight: 600;
        }
        .product-image-wrap:hover .zoom-hint {
          background: rgba(22,163,74,0.85);
        }

        .lightbox-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.85);
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
          border-radius: 8px;
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

        @media (max-width: 600px) {
          .lightbox-nav { width: 38px; height: 38px; }
          .lightbox-close { width: 36px; height: 36px; }
        }
      `}</style>
    </>
  );
};