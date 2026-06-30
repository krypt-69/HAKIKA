import React, { useEffect, useState } from 'react';
import { useAuth } from '@hakika/auth';

interface Product {
  id: string;
  name: string;
  description: string | null;
  original_price: number;
  discount_price: number | null;
  is_available: boolean;
  business_id: string;
}

interface Business {
  id: string;
  name: string;
}

const Products: React.FC = () => {
  const { getClient } = useAuth();
  const client = getClient();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: '', description: '', original_price: '', discount_price: '' });

  useEffect(() => {
    client.businesses.list().then((data: any) => setBusinesses(data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedBusiness) return;
    client.products.listByBusiness(selectedBusiness).then((data: any) => setProducts(data || [])).catch(() => {});
  }, [selectedBusiness]);

  const resetForm = () => {
    setForm({ name: '', description: '', original_price: '', discount_price: '' });
    setEditingProduct(null);
    setShowForm(false);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
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
        await client.products.create(selectedBusiness, payload);
        setSuccess('Product created!');
      }
      resetForm();
      const data: any = await client.products.listByBusiness(selectedBusiness);
      setProducts(data || []);
    } catch (err: any) {
      setError(err.message);
    }
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
      const data: any = await client.products.listByBusiness(selectedBusiness);
      setProducts(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const finalPrice = (p: Product) => p.discount_price ?? p.original_price;

  return (
    <div>
      <h1>Products</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}

      <div style={{ marginBottom: 20 }}>
        <label>Select Business: </label>
        <select value={selectedBusiness} onChange={e => setSelectedBusiness(e.target.value)}>
          <option value="">-- Choose --</option>
          {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {selectedBusiness && (
        <>
          <button onClick={() => { resetForm(); setShowForm(!showForm); }}>
            {showForm ? 'Cancel' : '+ Add Product'}
          </button>

          {showForm && (
            <form onSubmit={handleSubmit} style={{ maxWidth: 400, marginTop: 20 }}>
              <div><label>Name:</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required style={{ width: '100%' }} /></div>
              <div><label>Description:</label><input value={form.description} onChange={e => setForm({...form, description: e.target.value})} style={{ width: '100%' }} /></div>
              <div><label>Original Price:</label><input type="number" step="0.01" value={form.original_price} onChange={e => setForm({...form, original_price: e.target.value})} required style={{ width: '100%' }} /></div>
              <div><label>Discount Price:</label><input type="number" step="0.01" value={form.discount_price} onChange={e => setForm({...form, discount_price: e.target.value})} style={{ width: '100%' }} /></div>
              <button type="submit" style={{ marginTop: 10 }}>{editingProduct ? 'Update' : 'Create'}</button>
            </form>
          )}

          <hr style={{ margin: '20px 0' }} />

          {products.length === 0 ? (
            <p>No products for this business.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Name</th>
                  <th style={{ textAlign: 'left' }}>Original</th>
                  <th style={{ textAlign: 'left' }}>Discount</th>
                  <th style={{ textAlign: 'left' }}>Final</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #ddd' }}>
                    <td>{p.name}</td>
                    <td>KES {p.original_price}</td>
                    <td>{p.discount_price ? `KES ${p.discount_price}` : '—'}</td>
                    <td>KES {finalPrice(p)}</td>
                    <td>
                      <button onClick={() => handleEdit(p)}>Edit</button>
                      <button onClick={() => handleDelete(p.id)} style={{ marginLeft: 8, color: 'red' }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
};

export default Products;
