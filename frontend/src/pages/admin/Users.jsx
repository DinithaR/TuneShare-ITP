import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';

const AdminUsers = () => {
  const { axios } = useAppContext();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editUserId, setEditUserId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', role: '' });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/api/user/all');
      if (data.success) setUsers(data.users); else toast.error(data.message);
    } catch (e) { toast.error('Failed to fetch users'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleChangeRole = async (userId, role) => {
    try {
      const { data } = await axios.post('/api/user/change-role', { userId, role });
      if (data.success) { toast.success('Role updated'); fetchUsers(); } else toast.error(data.message);
    } catch { toast.error('Failed to change role'); }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      const { data } = await axios.delete(`/api/user/delete/${userId}`);
      if (data.success) { toast.success('User deleted'); fetchUsers(); } else toast.error(data.message);
    } catch { toast.error('Failed to delete user'); }
  };

  const openEdit = (u) => { setEditUserId(u._id); setEditForm({ name: u.name, email: u.email, role: u.role }); };
  const handleEditChange = (e) => setEditForm({ ...editForm, [e.target.name]: e.target.value });
  const handleEditSubmit = async () => {
    try {
      const { data } = await axios.put('/api/user/edit', { userId: editUserId, ...editForm });
      if (data.success) { toast.success('User updated'); setEditUserId(null); fetchUsers(); } else toast.error(data.message);
    } catch { toast.error('Failed to update user'); }
  };
  const handleEditCancel = () => { setEditUserId(null); setEditForm({ name: '', email: '', role: '' }); };

  return (
    <div className="bg-white rounded-2xl shadow p-6 border border-gray-100">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Users</h2>
      {loading ? <p className="text-gray-500">Loading...</p> : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border-separate border-spacing-y-2">
            <thead>
              <tr className="bg-gray-50 text-gray-700">
                <th className="py-2 px-4">Name</th>
                <th className="py-2 px-4">Email</th>
                <th className="py-2 px-4">Role</th>
                <th className="py-2 px-4">Created</th>
                <th className="py-2 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id} className="bg-white shadow rounded">
                  <td className="py-2 px-4">{editUserId === u._id ? (
                    <input name="name" value={editForm.name} onChange={handleEditChange} className="border rounded px-2 py-1 w-28" />
                  ) : u.name}</td>
                  <td className="py-2 px-4">{editUserId === u._id ? (
                    <input name="email" value={editForm.email} onChange={handleEditChange} className="border rounded px-2 py-1 w-40" />
                  ) : u.email}</td>
                  <td className="py-2 px-4 capitalize">
                    <select className="border rounded px-2 py-1" value={u.role} onChange={(e)=>handleChangeRole(u._id,e.target.value)}>
                      <option value="user">User</option>
                      <option value="owner">Owner</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="py-2 px-4">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="py-2 px-4 flex gap-2">
                    {editUserId === u._id ? (
                      <>
                        <button onClick={handleEditSubmit} className="px-2 py-1 bg-green-600 text-white rounded text-xs">Save</button>
                        <button onClick={handleEditCancel} className="px-2 py-1 bg-gray-300 text-gray-800 rounded text-xs">Cancel</button>
                      </>
                    ) : (
                      <>
                        <button onClick={()=>openEdit(u)} className="px-2 py-1 bg-pink-500 text-white rounded text-xs">Edit</button>
                        <button onClick={()=>handleDelete(u._id)} className="px-2 py-1 bg-red-500 text-white rounded text-xs">Delete</button>
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

export default AdminUsers;
