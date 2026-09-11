import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Image as ImageIcon, X as XIcon, Upload } from 'lucide-react';

interface ProductFormData {
  name: string;
  description: string;
  category_id: string;
  currency: string;
  original_price: string;
  discount_price: string;
  is_available: boolean;
  selling_unit: string;
  track_inventory: boolean;
  stock_quantity: string;
  min_order_quantity: string;
  max_order_quantity: string;
}

interface ProductFormProps {
  initialData?: ProductFormData;
  categories?: { id: number; name: string }[];
  onSubmit: (data: ProductFormData, imageFiles?: File[]) => void;
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
}

/* Same warm-paper palette used across the dashboard, product card & products page */
const PAPER = '#F6F2E9';
const CARD = '#FFFFFF';
const INK = '#26211B';
const INK_SOFT = '#7A7266';
const BORDER = '#E7DFCE';
const RUST = '#B4502F';
const FOREST = '#3C6B4C';

export const ProductForm: React.FC<ProductFormProps> = ({
  initialData,
  categories = [],
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Save Product',
}) => {
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    category_id: '',
    currency: 'KES',
    original_price: '',
    discount_price: '',
    is_available: true,
    selling_unit: 'Piece',
    track_inventory: false,
    stock_quantity: '',
    min_order_quantity: '1',
    max_order_quantity: '',
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        category_id: initialData.category_id || '',
        currency: initialData.currency || 'KES',
        original_price: initialData.original_price || '',
        discount_price: initialData.discount_price || '',
        is_available: initialData.is_available !== undefined ? initialData.is_available : true,
        selling_unit: initialData.selling_unit || 'Piece',
        track_inventory: initialData.track_inventory !== undefined ? initialData.track_inventory : false,
        stock_quantity: initialData.stock_quantity || '',
        min_order_quantity: initialData.min_order_quantity || '1',
        max_order_quantity: initialData.max_order_quantity || '',
      });
    }
  }, [initialData]);

  // Build/clean up object URL previews whenever the selected files change
  useEffect(() => {
    const urls = imageFiles.map(f => URL.createObjectURL(f));
    setPreviews(urls);
    return () => {
      urls.forEach(u => URL.revokeObjectURL(u));
    };
  }, [imageFiles]);

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setImageFiles(prev => [...prev, ...files]);
    // reset the input so selecting the same file(s) again still fires onChange
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData, imageFiles);
  };

  return (
    <form onSubmit={handleSubmit} className="product-form">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div className="form-field">
          <label className="form-label">Product Name</label>
          <input
            type="text"
            className="form-input"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>

        <div className="form-field">
          <label className="form-label">Description</label>
          <textarea
            className="form-input"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            style={{ fontFamily: 'inherit', resize: 'vertical' }}
          />
        </div>

        <div className="form-field">
          <label className="form-label">Original Price (KES)</label>
          <input
            type="number"
            step="0.01"
            className="form-input"
            value={formData.original_price}
            onChange={(e) => setFormData({ ...formData, original_price: e.target.value })}
            required
          />
        </div>

        <div className="form-field">
          <label className="form-label">Discount Price (optional)</label>
          <input
            type="number"
            step="0.01"
            className="form-input"
            value={formData.discount_price}
            onChange={(e) => setFormData({ ...formData, discount_price: e.target.value })}
          />
        </div>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={formData.is_available}
            onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
            className="form-checkbox"
          />
          <span className="checkbox-label">Available for ordering</span>
        </label>

        <div className="form-field">
          <label className="form-label">Category</label>
          <select
            className="form-input"
            value={formData.category_id || ''}
            onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
          >
            <option value="">Select category (optional)</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div className="form-field" style={{ flex: 1, minWidth: '140px' }}>
            <label className="form-label">Currency</label>
            <input type="text" className="form-input form-input--disabled" value={formData.currency || 'KES'} disabled />
          </div>
          <div className="form-field" style={{ flex: 1, minWidth: '140px' }}>
            <label className="form-label">Selling Unit</label>
            <select
              className="form-input"
              value={formData.selling_unit}
              onChange={(e) => setFormData({ ...formData, selling_unit: e.target.value })}
            >
              {['Piece','Kg','Gram','Litre','Millilitre','Metre','Pair','Set','Pack','Other'].map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-field">
          <label className="checkbox-row" style={{ marginBottom: 0 }}>
            <input
              type="checkbox"
              checked={formData.track_inventory}
              onChange={(e) => setFormData({ ...formData, track_inventory: e.target.checked })}
              className="form-checkbox"
            />
            <span className="checkbox-label">Track inventory</span>
          </label>
          {formData.track_inventory && (
            <input
              type="number"
              min="0"
              className="form-input"
              value={formData.stock_quantity}
              onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
              placeholder="Available quantity"
              style={{ marginTop: '8px' }}
            />
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div className="form-field" style={{ flex: 1, minWidth: '120px' }}>
            <label className="form-label">Minimum Order Quantity</label>
            <input
              type="number"
              min="1"
              className="form-input"
              value={formData.min_order_quantity}
              onChange={(e) => setFormData({ ...formData, min_order_quantity: e.target.value })}
            />
          </div>
          <div className="form-field" style={{ flex: 1, minWidth: '120px' }}>
            <label className="form-label">Maximum Quantity Per Order</label>
            <input
              type="number"
              min="0"
              className="form-input"
              value={formData.max_order_quantity}
              onChange={(e) => setFormData({ ...formData, max_order_quantity: e.target.value })}
              placeholder="Unlimited"
            />
          </div>
        </div>

        {formData.selling_unit === '' && null}

        {/* Multi-image upload */}
        <div className="form-field">
          <label className="form-label">Product Images (optional, select multiple)</label>

          <label className="upload-dropzone">
            <Upload size={18} color={FOREST} />
            <span>Click to choose images</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFilesSelected}
              style={{ display: 'none' }}
            />
          </label>

          {previews.length > 0 && (
            <div className="image-preview-grid">
              {previews.map((src, i) => (
                <div key={i} className="image-preview-item">
                  <img src={src} alt={`Selected ${i + 1}`} />
                  <button
                    type="button"
                    className="image-preview-remove"
                    onClick={() => removeImage(i)}
                  >
                    <XIcon size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {imageFiles.length > 0 && (
            <p className="image-count">
              {imageFiles.length} image{imageFiles.length !== 1 ? 's' : ''} selected
            </p>
          )}
        </div>

        <div className="form-actions">
          <Button type="submit" variant="primary" isLoading={isLoading} disabled={isLoading}>
            {submitLabel}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        .product-form {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .form-field { display: flex; flex-direction: column; }

        .form-label {
          display: block;
          font-size: 0.8rem;
          font-weight: 600;
          color: ${INK};
          margin-bottom: 6px;
          letter-spacing: 0.01em;
        }

        .form-input {
          width: 100%;
          padding: 10px 13px;
          border: 1.5px solid ${BORDER};
          border-radius: 10px;
          font-size: 0.95rem;
          color: ${INK};
          background: ${CARD};
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          box-sizing: border-box;
        }
        .form-input::placeholder { color: #B7AF9E; }
        .form-input:focus {
          border-color: ${FOREST};
          box-shadow: 0 0 0 3px ${FOREST}1A;
        }
        .form-input--disabled {
          background: ${PAPER};
          color: ${INK_SOFT};
          cursor: not-allowed;
        }

        select.form-input {
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%237A7266' stroke-width='1.6' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 13px center;
          padding-right: 34px;
        }

        .checkbox-row {
          display: flex;
          align-items: center;
          gap: 9px;
          cursor: pointer;
          margin-bottom: 2px;
        }
        .form-checkbox {
          width: 18px;
          height: 18px;
          accent-color: ${FOREST};
          cursor: pointer;
          flex-shrink: 0;
        }
        .checkbox-label {
          font-size: 0.88rem;
          font-weight: 500;
          color: ${INK};
        }

        .upload-dropzone {
          display: flex;
          align-items: center;
          gap: 9px;
          border: 1.5px dashed ${BORDER};
          border-radius: 12px;
          padding: 14px 16px;
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 500;
          color: ${INK_SOFT};
          background: ${PAPER};
          transition: border-color 0.15s, color 0.15s, background 0.15s;
        }
        .upload-dropzone:hover {
          border-color: ${FOREST};
          color: ${FOREST};
          background: #DEE8DD4D;
        }

        .image-preview-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
          gap: 8px;
          margin-top: 10px;
        }
        .image-preview-item {
          position: relative;
          width: 100%;
          aspect-ratio: 1 / 1;
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid ${BORDER};
        }
        .image-preview-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .image-preview-remove {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: rgba(38,33,27,0.65);
          color: #ffffff;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .image-preview-remove:hover { background: ${RUST}; }

        .image-count {
          font-size: 0.75rem;
          color: ${INK_SOFT};
          margin: 8px 0 0 0;
        }

        .form-actions {
          display: flex;
          gap: 10px;
          margin-top: 6px;
        }

        @media (max-width: 480px) {
          .form-input { font-size: 0.9rem; padding: 9px 12px; }
        }
      `}</style>
    </form>
  );
};