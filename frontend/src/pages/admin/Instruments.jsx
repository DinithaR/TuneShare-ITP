import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';

/*
  FIX NOTES:
  Original component used non-existent fields: name, type, price.
  Instrument schema uses: brand, model, category, pricePerDay, location, isAvailable.
  Editing previously sent wrong keys so updates were ignored by Mongoose.
  This rewrite aligns the admin UI with backend schema and adds availability toggle.
*/

const EMPTY_FORM = { brand: '', model: '', category: '', pricePerDay: '', location: '', isAvailable: true };

const AdminInstruments = () => {
  const { axios, currency = 'Rs.' } = useAppContext();
  const [instruments, setInstruments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchInstruments = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/api/user/admin/instruments');
      if (data.success) setInstruments(data.instruments); else toast.error(data.message || 'Failed to load instruments');
    } catch (err) { toast.error('Failed to fetch instruments'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchInstruments(); }, []);

  const openEdit = (inst) => {
    setEditId(inst._id);
    setForm({
      brand: inst.brand || '',
      model: inst.model || '',
      category: inst.category || '',
      pricePerDay: inst.pricePerDay || '',
      location: inst.location || '',
      isAvailable: inst.isAvailable
    });
  };

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const validate = () => {
    if (!form.brand.trim() || !form.model.trim() || !form.category.trim() || !form.location.trim()) return 'All text fields are required';
    if (form.pricePerDay === '' || Number(form.pricePerDay) <= 0) return 'Price per day must be a positive number';
    return null;
  };

  const onSave = async (e) => {
    e.preventDefault();
    const error = validate();
    if (error) { toast.error(error); return; }
    try {
      setSaving(true);
      const payload = { instrumentId: editId, ...form };
      const { data } = await axios.put('/api/user/admin/instruments/edit', payload);
      if (data.success) {
        toast.success('Instrument updated');
        setEditId(null);
        setForm(EMPTY_FORM);
        fetchInstruments();
      } else {
        toast.error(data.message || 'Update failed');
      }
    } catch { toast.error('Failed to update instrument'); }
    finally { setSaving(false); }
  };

  const onCancel = () => { setEditId(null); setForm(EMPTY_FORM); };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this instrument?')) return;
    try {
      const { data } = await axios.delete(`/api/user/admin/instruments/${id}`);
      if (data.success) { toast.success('Instrument deleted'); fetchInstruments(); } else toast.error(data.message || 'Delete failed');
    } catch { toast.error('Failed to delete instrument'); }
  };

  return (
    <div className="bg-white rounded-2xl shadow p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">Instruments</h2>
        <button onClick={fetchInstruments} className="text-xs px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700">Refresh</button>
      </div>
      {loading ? <p className="text-gray-500">Loading...</p> : instruments.length === 0 ? (
        <p className="text-gray-500 text-sm">No instruments found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border-separate border-spacing-y-2">
            <thead>
              <tr className="bg-gray-50 text-gray-700">
                <th className="py-2 px-3 text-left">Brand / Model</th>
                <th className="py-2 px-3 text-left">Category</th>
                <th className="py-2 px-3 text-left">Price / Day</th>
                <th className="py-2 px-3 text-left">Location</th>
                <th className="py-2 px-3 text-left">Avail.</th>
                <th className="py-2 px-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {instruments.map(inst => {
                const editing = editId === inst._id;
                return (
                  <tr key={inst._id} className="bg-white shadow rounded align-top">
                    <td className="py-2 px-3">
                      {editing ? (
                        <div className="flex flex-col gap-1">
                          <input name="brand" value={form.brand} onChange={onChange} placeholder="Brand" className="border rounded px-2 py-1 w-32" />
                          <input name="model" value={form.model} onChange={onChange} placeholder="Model" className="border rounded px-2 py-1 w-32" />
                        </div>
                      ) : <span>{inst.brand} {inst.model}</span>}
                    </td>
                    <td className="py-2 px-3">
                      {editing ? (
                        <input name="category" value={form.category} onChange={onChange} className="border rounded px-2 py-1 w-28" />
                      ) : inst.category}
                    </td>
                    <td className="py-2 px-3">
                      {editing ? (
                        <input type="number" min={0} step={0.01} name="pricePerDay" value={form.pricePerDay} onChange={onChange} className="border rounded px-2 py-1 w-24" />
                      ) : `${currency}${inst.pricePerDay}`}
                    </td>
                    <td className="py-2 px-3">
                      {editing ? (
                        <input name="location" value={form.location} onChange={onChange} className="border rounded px-2 py-1 w-32" />
                      ) : inst.location}
                    </td>
                    <td className="py-2 px-3">
                      {editing ? (
                        <label className="inline-flex items-center gap-1 text-xs">
                          <input type="checkbox" name="isAvailable" checked={form.isAvailable} onChange={onChange} />
                          <span>{form.isAvailable ? 'Yes' : 'No'}</span>
                        </label>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-full text-xs ${inst.isAvailable ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>{inst.isAvailable ? 'Yes' : 'No'}</span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      {editing ? (
                        <div className="flex flex-col gap-2 w-28">
                          <button disabled={saving} onClick={onSave} className="px-2 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded text-xs">{saving ? 'Saving...' : 'Save'}</button>
                          <button onClick={onCancel} className="px-2 py-1 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded text-xs">Cancel</button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 w-24">
                          <button onClick={() => openEdit(inst)} className="px-2 py-1 bg-pink-500 hover:bg-pink-600 text-white rounded text-xs">Edit</button>
                          <button onClick={() => onDelete(inst._id)} className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs">Delete</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminInstruments;
