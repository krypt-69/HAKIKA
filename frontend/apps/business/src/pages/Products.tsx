import { Config } from "@hakika/config";
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useAuth } from '../AuthContext';
import { api } from '../api';
import {
  Button,
  LoadingSpinner,
  ErrorState,
  EmptyState,
  SectionHeader,
  Modal,
  ProductCard,
  ProductForm,
} from '../components';
import { Search, X as XIcon } from 'lucide-react';

interface ProductImage {
  id: string;
  position: number;
  url: string;
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

const GREEN = '#16a34a';
const GREY = '#6b7280';
const BLACK = '#111111';

const Products: React.FC = () => {
  const { businessId } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const token = localStorage.getItem('hakika_business_token');
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchProducts = async () => {
    if (!businessId) return;
    try {
      setLoading(true);
      const data = await api.products.listByBusiness(businessId);
      setProducts(data || []);
      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [businessId]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.trim().toLowerCase();
    return products.filter(
      p => p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)
    );
  }, [products, searchQuery]);

  const resetModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setFormSubmitting(false);
    setSuccess('');
    setError('');
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleSubmitForm = async (formData: any, imageFiles?: File[]) => {
    if (!businessId) return;
    setFormSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        original_price: Number(formData.original_price),
        discount_price: formData.discount_price ? Number(formData.discount_price) : null,
        is_available: formData.is_available,
      };

      let productId: string;

      if (editingProduct) {
        await api.products.update(editingProduct.id, payload);
        productId = editingProduct.id;
        setSuccess('Product updated successfully!');
      } else {
        const data: any = await api.products.create(businessId, payload);
        productId = data.id;
        setSuccess('Product created successfully!');
      }

      if (imageFiles && imageFiles.length > 0) {
        for (const file of imageFiles) {
          const fd = new FormData();
          fd.append('file', file);
          const uploadResp = await fetch(`${Config.API_BASE}/products/${productId}/images`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: fd,
          });
          if (!uploadResp.ok) {
            throw new Error('Image upload failed for one or more files');
          }
        }
        setSuccess((s) => s + ` ${imageFiles.length} image(s) uploaded.`);
      }

      await fetchProducts();
      resetModal();
    } catch (err: any) {
      setError(err.message || 'Failed to save product');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    setDeletingId(productId);
    try {
      await api.products.delete(productId);
      setSuccess('Product deleted.');
      await fetchProducts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleAvailability = async (productId: string, currentAvailable: boolean) => {
    setTogglingId(productId);
    try {
      const updated = { is_available: !currentAvailable };
      await api.products.update(productId, updated);
      await fetchProducts();
      setSuccess(`Product ${!currentAvailable ? 'activated' : 'deactivated'}.`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error && !products.length) {
    return <ErrorState message={error} onRetry={fetchProducts} />;
  }

  return (
    <div className="products-page">
      <SectionHeader
        title="Products"
        subtitle="Manage your product catalog"
        action={
          <Button variant="primary" onClick={handleAddNew}>
            + Add Product
          </Button>
        }
      />

      {success && (
        <div style={{ background: '#dcfce7', color: '#16a34a', padding: '10px 16px', borderRadius: '6px', marginBottom: '16px' }}>
          {success}
        </div>
      )}
      {error && (
        <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 16px', borderRadius: '6px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Search */}
      <div className="search-bar">
        <Search size={16} color={GREY} />
        <input
          className="search-input"
          type="text"
          placeholder="Search products by name or description..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button className="search-clear" onClick={() => setSearchQuery('')}>
            <XIcon size={14} />
          </button>
        )}
      </div>

      {products.length === 0 ? (
        <EmptyState
          title="No products yet"
          description="Add your first product to start receiving orders"
          action={
            <Button variant="primary" onClick={handleAddNew}>
              Add Product
            </Button>
          }
        />
      ) : filteredProducts.length === 0 ? (
        <EmptyState
          title="No matching products"
          description="Try a different search term"
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px',
          }}
        >
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleAvailability={handleToggleAvailability}
              isDeleting={deletingId === product.id}
              isToggling={togglingId === product.id}
            />
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={resetModal}
        title={editingProduct ? 'Edit Product' : 'Add Product'}
        size="md"
      >
        <ProductForm
          initialData={
            editingProduct
              ? {
                  name: editingProduct.name,
                  description: editingProduct.description || '',
                  original_price: String(editingProduct.original_price),
                  discount_price: editingProduct.discount_price ? String(editingProduct.discount_price) : '',
                  is_available: editingProduct.is_available,
                }
              : undefined
          }
          onSubmit={handleSubmitForm}
          onCancel={resetModal}
          isLoading={formSubmitting}
          submitLabel={editingProduct ? 'Update Product' : 'Create Product'}
        />
      </Modal>

      <style>{`
        .search-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 10px 14px;
          margin-bottom: 18px;
          max-width: 480px;
        }
        .search-input {
          border: none;
          outline: none;
          flex: 1;
          font-size: 0.9rem;
          color: ${BLACK};
        }
        .search-clear {
          border: none;
          background: transparent;
          cursor: pointer;
          color: ${GREY};
          display: flex;
          align-items: center;
        }
        @media (max-width: 640px) {
          .search-bar { max-width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default Products;