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
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#111111', marginBottom: '4px' }}>
            Product Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '1rem',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#111111', marginBottom: '4px' }}>
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '1rem',
              fontFamily: 'inherit',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#111111', marginBottom: '4px' }}>
            Original Price (KES)
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.original_price}
            onChange={(e) => setFormData({ ...formData, original_price: e.target.value })}
            required
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '1rem',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#111111', marginBottom: '4px' }}>
            Discount Price (optional)
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.discount_price}
            onChange={(e) => setFormData({ ...formData, discount_price: e.target.value })}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '1rem',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={formData.is_available}
              onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
              style={{ width: '18px', height: '18px', accentColor: '#16a34a' }}
            />
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111111' }}>
              Available for ordering
            </span>
          </label>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#111111', marginBottom: '4px' }}>
            Category
          </label>
          <select
            value={formData.category_id || ''}
            onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '1rem' }}
          >
            <option value="">Select category (optional)</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '140px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#111111', marginBottom: '4px' }}>
              Currency
            </label>
            <input type="text" value={formData.currency || 'KES'} disabled style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '1rem', background: '#f9fafb' }} />
          </div>
          <div style={{ flex: 1, minWidth: '140px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#111111', marginBottom: '4px' }}>
              Selling Unit
            </label>
            <select
              value={formData.selling_unit}
              onChange={(e) => setFormData({ ...formData, selling_unit: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '1rem' }}
            >
              {['Piece','Kg','Gram','Litre','Millilitre','Metre','Pair','Set','Pack','Other'].map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={formData.track_inventory}
              onChange={(e) => setFormData({ ...formData, track_inventory: e.target.checked })}
              style={{ width: '18px', height: '18px', accentColor: '#16a34a' }}
            />
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111111' }}>
              Track inventory
            </span>
          </label>
          {formData.track_inventory && (
            <input
              type="number"
              min="0"
              value={formData.stock_quantity}
              onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
              placeholder="Available quantity"
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '1rem', marginTop: '8px' }}
            />
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '120px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#111111', marginBottom: '4px' }}>
              Minimum Order Quantity
            </label>
            <input
              type="number"
              min="1"
              value={formData.min_order_quantity}
              onChange={(e) => setFormData({ ...formData, min_order_quantity: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '1rem' }}
            />
          </div>
          <div style={{ flex: 1, minWidth: '120px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#111111', marginBottom: '4px' }}>
              Maximum Quantity Per Order
            </label>
            <input
              type="number"
              min="0"
              value={formData.max_order_quantity}
              onChange={(e) => setFormData({ ...formData, max_order_quantity: e.target.value })}
              placeholder="Unlimited"
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '1rem' }}
            />
          </div>
        </div>

        {formData.selling_unit === '' && null}

        {/* Multi-image upload */}
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#111111', marginBottom: '6px' }}>
            Product Images (optional, select multiple)
          </label>

          <label className="upload-dropzone">
            <Upload size={18} color="#6b7280" />
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
            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '6px' }}>
              {imageFiles.length} image{imageFiles.length !== 1 ? 's' : ''} selected
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <Button type="submit" variant="primary" isLoading={isLoading} disabled={isLoading}>
            {submitLabel}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>

      <style>{`
        .upload-dropzone {
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1.5px dashed #d1d5db;
          border-radius: 8px;
          padding: 12px 14px;
          cursor: pointer;
          font-size: 0.85rem;
          color: #6b7280;
          transition: border-color 0.15s, color 0.15s;
        }
        .upload-dropzone:hover {
          border-color: #16a34a;
          color: #16a34a;
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
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #e5e7eb;
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
          background: rgba(0,0,0,0.6);
          color: #ffffff;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .image-preview-remove:hover { background: #dc2626; }
      `}</style>
    </form>
  );
};