import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@hakika/auth';

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

const Products: React.FC = () => {
  const { getClient, businessId } = useAuth();
  const client = getClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: '', description: '', original_price: '', discount_price: '' });
  const token = localStorage.getItem('token');
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchProducts = async () => {
    if (!businessId) return;
    const data: any = await client.products.listByBusiness(businessId);
    setProducts(data || []);
  };

  useEffect(() => { fetchProducts(); }, [businessId]);

  const resetForm = () => {
    setForm({ name: '', description: '', original_price: '', discount_price: '' });
    setEditingProduct(null);
    setShowForm(false);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        original_price: Number(form.original_price),
        discount_price: form.discount_price ? Number(form.discount_price) : null,
      };
      if (editingProduct) {
        await client.products.update(editingProduct.id, payload);
        setSuccess('Product updated!');
      } else {
        await client.products.create(businessId!, payload);
        setSuccess('Product created!');
      }
      resetForm();
      await fetchProducts();
    } catch (err: any) { setError(err.message); }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      description: product.description || '',
      original_price: String(product.original_price),
      discount_price: product.discount_price ? String(product.discount_price) : '',
    });
    setShowForm(true);
  };

  const handleDelete = async (productId: string) => {
    setError('');
    try {
      await client.products.delete(productId);
      setSuccess('Product deleted');
      await fetchProducts();
    } catch (err: any) { setError(err.message); }
  };

  const handleUploadImage = async (productId: string, file: File) => {
    setError(''); setSuccess('');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const resp = await fetch(`http://localhost:8000/api/v1/products/${productId}/images`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData
      });
      if (!resp.ok) throw new Error('Upload failed');
      setSuccess('Image uploaded');
      await fetchProducts();
    } catch (err: any) { setError(err.message); }
  };

  const handleDeleteImage = async (productId: string, imageId: string) => {
    setError(''); setSuccess('');
    try {
      const resp = await fetch(`http://localhost:8000/api/v1/products/${productId}/images/${imageId}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!resp.ok) throw new Error('Delete failed');
      setSuccess('Image deleted');
      await fetchProducts();
    } catch (err: any) { setError(err.message); }
  };

  const finalPrice = (p: Product) => p.discount_price ?? p.original_price;

  if (!businessId) return <p>No business set up. <a href="/onboarding">Create one</a>.</p>;

  return (
    <div>
      <h1>Products</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}

      <button onClick={() => { resetForm(); setShowForm(!showForm); }}>
        {showForm ? 'Cancel' : '+ Add Product'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ maxWidth: 400, marginTop: 20 }}>
          <div><label>Name:</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required style={{ width: '100%', padding: 8, marginTop: 4 }} /></div>
          <div><label>Description:</label><input value={form.description} onChange={e => setForm({...form, description: e.target.value})} style={{ width: '100%', padding: 8, marginTop: 4 }} /></div>
          <div><label>Original Price:</label><input type="number" step="0.01" value={form.original_price} onChange={e => setForm({...form, original_price: e.target.value})} required style={{ width: '100%', padding: 8, marginTop: 4 }} /></div>
          <div><label>Discount Price:</label><input type="number" step="0.01" value={form.discount_price} onChange={e => setForm({...form, discount_price: e.target.value})} style={{ width: '100%', padding: 8, marginTop: 4 }} /></div>
          <button type="submit" style={{ marginTop: 10, padding: 10 }}>{editingProduct ? 'Update' : 'Create'}</button>
        </form>
      )}

      <hr style={{ margin: '20px 0' }} />

      {products.length === 0 ? (<p>No products yet.</p>) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left' }}>
              <th>Image</th><th>Name</th><th>Original</th><th>Discount</th><th>Final</th><th>Images</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid #ddd' }}>
                <td>
                  {p.images.length > 0 ? (
                    <img src={`http://localhost:8000${p.images[0].url}`} style={{ width: 40, height: 40, objectFit: 'cover' }} />
                  ) : <span style={{ fontSize: 12, color: '#999' }}>No img</span>}
                </td>
                <td>{p.name}</td>
                <td>KES {p.original_price}</td>
                <td>{p.discount_price ? `KES ${p.discount_price}` : '—'}</td>
                <td>KES {finalPrice(p)}</td>
                <td>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {p.images.map(img => (
                      <div key={img.id} style={{ position: 'relative' }}>
                        <img src={`http://localhost:8000${img.url}`} style={{ width: 30, height: 30, objectFit: 'cover' }} />
                        <button onClick={() => handleDeleteImage(p.id, img.id)}
                          style={{ position: 'absolute', top: -5, right: -5, background: 'red', color: '#fff',
                                   border: 'none', borderRadius: 10, width: 16, height: 16, fontSize: 10, cursor: 'pointer' }}>×</button>
                      </div>
                    ))}
                    {p.images.length < 3 && (
                      <button onClick={() => fileRef.current?.click()}
                        style={{ width: 30, height: 30, border: '1px dashed #ccc', background: 'none', cursor: 'pointer' }}>
                        +
                        <input type="file" accept="image/*" style={{ display: 'none' }}
                          ref={fileRef}
                          onChange={e => { if (e.target.files?.[0]) { handleUploadImage(p.id, e.target.files[0]); e.target.value = ''; } }} />
                      </button>
                    )}
                  </div>
                </td>
                <td>
                  <button onClick={() => handleEdit(p)}>Edit</button>
                  <button onClick={() => handleDelete(p.id)} style={{ marginLeft: 8, color: 'red' }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Products;
