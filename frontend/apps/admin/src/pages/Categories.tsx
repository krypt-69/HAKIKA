import React, { useEffect, useState } from 'react';
import { api } from '../api';

interface Category {
  id: number;
  name: string;
  acceptance_timeout_minutes: number;
  requires_deposit: boolean;
}

const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

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
      await api.admin.createCategory(newName.trim());
      setNewName('');
      setSuccess('Category created.');
      fetchCategories();
    } catch (e: any) { setError(e.message); }
  };

  const handleUpdate = async (id: number) => {
    if (!editName.trim()) return;
    try {
      await api.admin.updateCategory(id, editName.trim());
      setEditingId(null);
      setEditName('');
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
                {editingId === c.id ? (
                  <input value={editName} onChange={e => setEditName(e.target.value)} style={{ padding: 4, width: '100%' }} />
                ) : c.name}
              </td>
              <td style={{ padding: 12 }}>{c.acceptance_timeout_minutes}</td>
              <td style={{ padding: 12 }}>{c.requires_deposit ? 'Yes' : 'No'}</td>
              <td style={{ padding: 12 }}>
                {editingId === c.id ? (
                  <>
                    <button onClick={() => handleUpdate(c.id)} style={{ marginRight: 6, padding: '4px 10px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4 }}>Save</button>
                    <button onClick={() => { setEditingId(null); setEditName(''); }} style={{ padding: '4px 10px', background: '#ddd', border: 'none', borderRadius: 4 }}>Cancel</button>
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
