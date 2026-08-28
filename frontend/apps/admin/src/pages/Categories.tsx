import React, { useEffect, useState } from 'react';
import { api } from '../api';

interface Category {
  id: number;
  name: string;
  acceptance_timeout_minutes: number;
  requires_deposit: boolean;
  image_url: string | null;
}

const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [newImage, setNewImage] = useState<File | null>(null);
  const [editImage, setEditImage] = useState<File | null>(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await api.admin.categories();
      setCategories(data || []);
      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await api.admin.createCategory(newName.trim(), newImage || undefined);
      setNewName('');
      setNewImage(null);
      setSuccess('Category created.');
      fetchCategories();
    } catch (e: any) { setError(e.message); }
  };

  const handleUpdate = async (id: number) => {
    if (!editName.trim()) return;
    try {
      await api.admin.updateCategory(id, editName.trim(), editImage || undefined);
      setEditingId(null);
      setEditName('');
      setEditImage(null);
      setSuccess('Category updated.');
      fetchCategories();
    } catch (e: any) { setError(e.message); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this category?')) return;
    try {
      await api.admin.deleteCategory(id);
      setSuccess('Category deleted.');
      fetchCategories();
    } catch (e: any) { setError(e.message); }
  };

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>;

  return (
    <div>
      <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: 24 }}>Categories</h1>
      {success && <div style={{ background: '#dcfce7', color: '#16a34a', padding: '10px 16px', borderRadius: 6, marginBottom: 16 }}>{success}</div>}
      {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 16px', borderRadius: 6, marginBottom: 16 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="New category name"
          style={{ flex: 1, padding: 8, borderRadius: 4, border: '1px solid #d1d5db' }}
        />
        <input
          type="file"
          accept="image/*"
          onChange={e => setNewImage(e.target.files?.[0] || null)}
          style={{ padding: 4 }}
        />
        <button onClick={handleCreate} style={{ padding: '8px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4 }}>
          Add
        </button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
            <th style={{ padding: 12 }}>ID</th>
            <th style={{ padding: 12 }}>Name</th>
            <th style={{ padding: 12 }}>Timeout (min)</th>
            <th style={{ padding: 12 }}>Deposit?</th>
            <th style={{ padding: 12 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {categories.map(c => (
            <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: 12 }}>{c.id}</td>
              <td style={{ padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {c.image_url ? (
                    <img src={c.image_url} alt={c.name} style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: '50%' }} />
                  ) : (
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{c.name.charAt(0).toUpperCase()}</div>
                  )}
                  {editingId === c.id ? (
                    <input value={editName} onChange={e => setEditName(e.target.value)} style={{ padding: 4, width: '100%' }} />
                  ) : c.name}
                </div>
              </td>
              <td style={{ padding: 12 }}>{c.acceptance_timeout_minutes}</td>
              <td style={{ padding: 12 }}>{c.requires_deposit ? 'Yes' : 'No'}</td>
              <td style={{ padding: 12 }}>
                {editingId === c.id ? (
                  <>
                    {c.image_url && !editImage && (
                      <img src={c.image_url} alt="Current" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, marginRight: 6 }} />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => setEditImage(e.target.files?.[0] || null)}
                      style={{ padding: 4, marginRight: 4 }}
                    />
                    <button onClick={() => handleUpdate(c.id)} style={{ marginRight: 6, padding: '4px 10px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4 }}>Save</button>
                    <button onClick={() => { setEditingId(null); setEditName(''); setEditImage(null); }} style={{ padding: '4px 10px', background: '#ddd', border: 'none', borderRadius: 4 }}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setEditingId(c.id); setEditName(c.name); }} style={{ marginRight: 6, padding: '4px 10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4 }}>Edit</button>
                    <button onClick={() => handleDelete(c.id)} style={{ padding: '4px 10px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4 }}>Delete</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Categories;
