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
import { Search, X as XIcon, CheckCircle2, AlertCircle } from 'lucide-react';

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
  selling_unit: string;
  track_inventory: boolean;
  stock_quantity: number | null;
  min_order_quantity: number;
  max_order_quantity: number | null;
  images: ProductImage[];
}

/* Same warm-paper palette used across the dashboard & product cards */
const PAPER = '#F6F2E9';
const CARD = '#FFFFFF';
const INK = '#26211B';
const INK_SOFT = '#7A7266';
const BORDER = '#E7DFCE';

const RUST = '#B4502F';
const RUST_LIGHT = '#F3DDD0';

const FOREST = '#3C6B4C';
const FOREST_LIGHT = '#DEE8DD';

const Products: React.FC = () => {
  const { businessId } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
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
    api.productCategories().then(setCategories).catch(() => {});
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
        selling_unit: formData.selling_unit,
        track_inventory: formData.track_inventory,
        stock_quantity: formData.track_inventory ? Number(formData.stock_quantity || 0) : null,
        min_order_quantity: Number(formData.min_order_quantity || 1),
        max_order_quantity: formData.max_order_quantity ? Number(formData.max_order_quantity) : null,
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px', background: PAPER }}>
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
        <div className="banner banner--success">
          <CheckCircle2 size={16} />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="banner banner--error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Search */}
      <div className="search-bar">
        <Search size={16} color={INK_SOFT} />
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
        <div className="products-grid">
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
          categories={categories}
          initialData={
            editingProduct
              ? {
                  name: editingProduct.name,
                  description: editingProduct.description || '',
                  category_id: '',
                  currency: 'KES',
                  original_price: String(editingProduct.original_price),
                  discount_price: editingProduct.discount_price ? String(editingProduct.discount_price) : '',
                  is_available: editingProduct.is_available,
                  selling_unit: editingProduct.selling_unit || 'Piece',
                  track_inventory: editingProduct.track_inventory || false,
                  stock_quantity: editingProduct.stock_quantity !== null ? String(editingProduct.stock_quantity) : '',
                  min_order_quantity: String(editingProduct.min_order_quantity || 1),
                  max_order_quantity: editingProduct.max_order_quantity !== null ? String(editingProduct.max_order_quantity) : '',
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
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400..800&family=Inter:wght@400;500;600;700&display=swap');

        .products-page {
          background: ${PAPER};
          min-height: 100vh;
          padding: 20px 20px 48px;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        .products-page h1,
        .products-page h2,
        .products-page h3 {
          font-family: 'Fraunces', serif;
        }

        .banner {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 11px 16px;
          border-radius: 12px;
          margin-bottom: 16px;
          font-size: 0.88rem;
          font-weight: 500;
        }
        .banner--success {
          background: ${FOREST_LIGHT};
          color: ${FOREST};
          border: 1px solid ${FOREST}26;
        }
        .banner--error {
          background: ${RUST_LIGHT};
          color: ${RUST};
          border: 1px solid ${RUST}26;
        }

        .search-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          background: ${CARD};
          border: 1px solid ${BORDER};
          border-radius: 12px;
          padding: 11px 16px;
          margin-bottom: 20px;
          max-width: 480px;
          box-shadow: 0 1px 2px rgba(38, 33, 27, 0.03);
        }
        .search-bar:focus-within {
          border-color: ${FOREST};
        }
        .search-input {
          border: none;
          outline: none;
          background: transparent;
          flex: 1;
          font-size: 0.9rem;
          color: ${INK};
          font-family: 'Inter', sans-serif;
        }
        .search-input::placeholder {
          color: ${INK_SOFT};
        }
        .search-clear {
          border: none;
          background: transparent;
          cursor: pointer;
          color: ${INK_SOFT};
          display: flex;
          align-items: center;
          padding: 2px;
          border-radius: 50%;
        }
        .search-clear:hover {
          background: ${PAPER};
          color: ${RUST};
        }

        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 18px;
        }

        @media (max-width: 640px) {
          .products-page { padding: 16px 14px 40px; }
          .search-bar { max-width: 100%; }
          .products-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
        }
      `}</style>
    </div>
  );
};

export default Products;