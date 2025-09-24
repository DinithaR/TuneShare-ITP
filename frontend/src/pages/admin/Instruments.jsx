import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';

const AdminInstruments = () => {
  const { axios } = useAppContext();
  const [instruments, setInstruments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', type: '', price: '', location: '' });

  const fetchInstruments = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/api/user/admin/instruments');
      if (data.success) setInstruments(data.instruments); else toast.error(data.message);
    } catch { toast.error('Failed to fetch instruments'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchInstruments(); }, []);

  const openEdit = (inst) => { setEditId(inst._id); setForm({ name: inst.name, type: inst.type || '', price: inst.price || '', location: inst.location || '' }); };
  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSave = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.put('/api/user/admin/instruments/edit', { instrumentId: editId, ...form });
      if (data.success) { toast.success('Instrument updated'); setEditId(null); fetchInstruments(); } else toast.error(data.message);
    } catch { toast.error('Failed to update instrument'); }
  };
  const onCancel = () => { setEditId(null); setForm({ name: '', type: '', price: '', location: '' }); };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this instrument?')) return;
    try {
      const { data } = await axios.delete(`/api/user/admin/instruments/${id}`);
      if (data.success) { toast.success('Instrument deleted'); fetchInstruments(); } else toast.error(data.message);
    } catch { toast.error('Failed to delete instrument'); }
  };

  return (
    <div className="bg-white rounded-2xl shadow p-6 border border-gray-100">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Instruments</h2>
      {loading ? <p className="text-gray-500">Loading...</p> : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border-separate border-spacing-y-2">
            <thead>
              <tr className="bg-gray-50 text-gray-700">
                <th className="py-2 px-4">Name</th>
                <th className="py-2 px-4">Type</th>
                <th className="py-2 px-4">Price</th>
                <th className="py-2 px-4">Location</th>
                <th className="py-2 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {instruments.map(inst => (
                <tr key={inst._id} className="bg-white shadow rounded">
                  <td className="py-2 px-4">{editId === inst._id ? (
                    <input name="name" value={form.name} onChange={onChange} className="border rounded px-2 py-1 w-28" />
                  ) : inst.name}</td>
                  <td className="py-2 px-4">{editId === inst._id ? (
                    <input name="type" value={form.type} onChange={onChange} className="border rounded px-2 py-1 w-24" />
                  ) : inst.type}</td>
                  <td className="py-2 px-4">{editId === inst._id ? (
                    <input type="number" name="price" value={form.price} onChange={onChange} className="border rounded px-2 py-1 w-20" />
                  ) : inst.price}</td>
                  <td className="py-2 px-4">{editId === inst._id ? (
                    <input name="location" value={form.location} onChange={onChange} className="border rounded px-2 py-1 w-28" />
                  ) : inst.location}</td>
                  <td className="py-2 px-4 flex gap-2">
                    {editId === inst._id ? (
                      <>
                        <button onClick={onSave} className="px-2 py-1 bg-green-600 text-white rounded text-xs">Save</button>
                        <button onClick={onCancel} className="px-2 py-1 bg-gray-300 text-gray-800 rounded text-xs">Cancel</button>
                      </>
                    ) : (
                      <>
                        <button onClick={()=>openEdit(inst)} className="px-2 py-1 bg-pink-500 text-white rounded text-xs">Edit</button>
                        <button onClick={()=>onDelete(inst._id)} className="px-2 py-1 bg-red-500 text-white rounded text-xs">Delete</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminInstruments;
