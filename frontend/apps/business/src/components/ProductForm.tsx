import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Image as ImageIcon, X as XIcon, Upload } from 'lucide-react';

interface ProductFormData {
  name: string;
  description: string;
  original_price: string;
  discount_price: string;
  is_available: boolean;
}

interface ProductFormProps {
  initialData?: ProductFormData;
  onSubmit: (data: ProductFormData, imageFiles?: File[]) => void;
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
}

export const ProductForm: React.FC<ProductFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Save Product',
}) => {
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    original_price: '',
    discount_price: '',
    is_available: true,
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        original_price: initialData.original_price || '',
        discount_price: initialData.discount_price || '',
        is_available: initialData.is_available !== undefined ? initialData.is_available : true,
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