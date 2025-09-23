

import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  // Instrument edit/delete handlers
  const openEditInstrument = (instrument) => {
    setEditInstrumentId(instrument._id);
    setEditInstrumentForm({
      name: instrument.name,
      type: instrument.type || '',
      price: instrument.price || '',
      location: instrument.location || ''
    });
  };

  const handleEditInstrumentChange = (e) => {
    setEditInstrumentForm({ ...editInstrumentForm, [e.target.name]: e.target.value });
  };

  const handleEditInstrumentSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.put('/api/user/admin/instruments/edit', { instrumentId: editInstrumentId, ...editInstrumentForm });
      if (data.success) {
        toast.success('Instrument updated');
        setEditInstrumentId(null);
        fetchInstruments();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('Failed to update instrument');
    }
  };

  const handleEditInstrumentCancel = () => {
    setEditInstrumentId(null);
    setEditInstrumentForm({ name: '', type: '', price: '', location: '' });
  };

  const handleDeleteInstrument = async (instrumentId) => {
    if (!window.confirm('Are you sure you want to delete this instrument?')) return;
    try {
      const { data } = await axios.delete(`/api/user/admin/instruments/${instrumentId}`);
      if (data.success) {
        toast.success('Instrument deleted');
        fetchInstruments();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('Failed to delete instrument');
    }
  };
  // Fetch all instruments
  const fetchInstruments = async () => {
    try {
      setLoadingInstruments(true);
      const { data } = await axios.get('/api/user/admin/instruments');
      if (data.success) {
        setInstruments(data.instruments);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('Failed to fetch instruments');
    } finally {
      setLoadingInstruments(false);
    }
  };
  const { axios, token } = useAppContext();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsPages, setReviewsPages] = useState(1);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  // Add missing state for instruments section
  const [instruments, setInstruments] = useState([]);
  const [loadingInstruments, setLoadingInstruments] = useState(true);
  const [editInstrumentId, setEditInstrumentId] = useState(null);
  const [editInstrumentForm, setEditInstrumentForm] = useState({ name: '', type: '', price: '', location: '' });


  // Fetch all users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/api/user/all');
      if (data.success) {
        setUsers(data.users);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  // Change user role
  const handleChangeRole = async (userId, newRole) => {
    try {
      const { data } = await axios.post('/api/user/change-role', { userId, role: newRole });
      if (data.success) {
        toast.success('Role updated');
        fetchUsers();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('Failed to change role');
    }
  };

  // Delete user
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      const { data } = await axios.delete(`/api/user/delete/${userId}`);
      if (data.success) {
        toast.success('User deleted');
        fetchUsers();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  // Edit user details
  const [editUserId, setEditUserId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', role: '' });

  // Open edit user modal/row
  const openEdit = (user) => {
    setEditUserId(user._id);
    setEditForm({ name: user.name, email: user.email, role: user.role });
  };

  // Handle edit user input change
  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  // Submit user edit
  const handleEditSubmit = async () => {
    try {
      // The backend expects userId in the body, not in the URL
      const { data } = await axios.put('/api/user/edit', { userId: editUserId, ...editForm });
      if (data.success) {
        toast.success('User updated');
        setEditUserId(null);
        fetchUsers();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('Failed to update user');
    }
  };

  // Cancel user edit
  const handleEditCancel = () => {
    setEditUserId(null);
    setEditForm({ name: '', email: '', role: '' });
  };

  // Fetch users and instruments on mount
  useEffect(() => {
    fetchUsers();
    fetchInstruments();
    fetchReviews(1);
    // eslint-disable-next-line
  }, []);

  const fetchReviews = async (page = 1) => {
    try {
      setLoadingReviews(true);
      const { data } = await axios.get(`/api/reviews/admin/list?page=${page}&limit=20`);
      if (data.success) {
        setReviews(data.reviews);
        setReviewsPage(data.page);
        setReviewsPages(data.pages);
        setReviewsTotal(data.total);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('Failed to fetch reviews');
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleDeleteReview = async (id) => {
    if (!window.confirm('Delete this review?')) return;
    try {
      const { data } = await axios.delete(`/api/reviews/${id}`);
      if (data.success) {
        toast.success('Review deleted');
        fetchReviews(reviewsPage);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('Failed to delete review');
    }
  };
  return (
    <div className="px-2 md:px-8 py-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-8 text-pink-600 tracking-tight">Admin Dashboard</h1>

      <div className="flex flex-col gap-8">
        {/* Users Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-pink-400 rounded-full"></span> Users
          </h2>
          {loading ? (
            <p className="text-gray-500">Loading users...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border-separate border-spacing-y-2">
                <thead>
                  <tr className="bg-gray-50 text-gray-700">
                    <th className="py-2 px-4 font-semibold">Name</th>
                    <th className="py-2 px-4 font-semibold">Email</th>
                    <th className="py-2 px-4 font-semibold">Role</th>
                    <th className="py-2 px-4 font-semibold">Created</th>
                    <th className="py-2 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user._id} className="bg-white shadow rounded-lg">
                      <td className="py-2 px-4">
                        {editUserId === user._id ? (
                          <input
                            type="text"
                            name="name"
                            value={editForm.name}
                            onChange={handleEditChange}
                            className="border rounded px-2 py-1 w-28"
                          />
                        ) : (
                          user.name
                        )}
                      </td>
                      <td className="py-2 px-4">
                        {editUserId === user._id ? (
                          <input
                            type="email"
                            name="email"
                            value={editForm.email}
                            onChange={handleEditChange}
                            className="border rounded px-2 py-1 w-40"
                          />
                        ) : (
                          user.email
                        )}
                      </td>
                      <td className="py-2 px-4 capitalize">
                        {editUserId === user._id ? (
                          <select
                            name="role"
                            value={editForm.role || user.role}
                            onChange={e => handleChangeRole(user._id, e.target.value)}
                            className="border rounded px-2 py-1"
                          >
                            <option value="user">User</option>
                            <option value="owner">Owner</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <>
                            {user.role}
                            <select
                              className="ml-2 border rounded px-1 py-0.5 text-xs"
                              value={user.role}
                              onChange={e => handleChangeRole(user._id, e.target.value)}
                            >
                              <option value="user">User</option>
                              <option value="owner">Owner</option>
                              <option value="admin">Admin</option>
                            </select>
                          </>
                        )}
                      </td>
                      <td className="py-2 px-4">{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td className="py-2 px-4 flex gap-2">
                        {editUserId === user._id ? (
                          <>
                            <button
                              onClick={handleEditSubmit}
                              className="px-2 py-1 bg-green-600 text-white rounded text-xs shadow hover:bg-green-700"
                            >Save</button>
                            <button
                              onClick={handleEditCancel}
                              className="px-2 py-1 bg-gray-300 text-primary-dull rounded text-xs shadow hover:bg-gray-400"
                            >Cancel</button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => openEdit(user)}
                              className="px-2 py-1 bg-pink-500 text-white rounded text-xs shadow hover:bg-pink-600"
                            >Edit</button>
                            <button
                              onClick={() => handleDeleteUser(user._id)}
                              className="px-2 py-1 bg-red-500 text-white rounded text-xs shadow hover:bg-red-600"
                            >Delete</button>
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

  {/* Instruments Section */}
  <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-blue-400 rounded-full"></span> Instrument Listings
          </h2>
          {loadingInstruments ? (
            <p className="text-gray-500">Loading instruments...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border-separate border-spacing-y-2">
                <thead>
                  <tr className="bg-gray-50 text-gray-700">
                    <th className="py-2 px-4 font-semibold">Name</th>
                    <th className="py-2 px-4 font-semibold">Type</th>
                    <th className="py-2 px-4 font-semibold">Price</th>
                    <th className="py-2 px-4 font-semibold">Location</th>
                    <th className="py-2 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {instruments.map(inst => (
                    <tr key={inst._id} className="bg-white shadow rounded-lg">
                      <td className="py-2 px-4">
                        {editInstrumentId === inst._id ? (
                          <input
                            type="text"
                            name="name"
                            value={editInstrumentForm.name}
                            onChange={handleEditInstrumentChange}
                            className="border rounded px-2 py-1 w-28"
                          />
                        ) : (
                          inst.name
                        )}
                      </td>
                      <td className="py-2 px-4">
                        {editInstrumentId === inst._id ? (
                          <input
                            type="text"
                            name="type"
                            value={editInstrumentForm.type}
                            onChange={handleEditInstrumentChange}
                            className="border rounded px-2 py-1 w-24"
                          />
                        ) : (
                          inst.type
                        )}
                      </td>
                      <td className="py-2 px-4">
                        {editInstrumentId === inst._id ? (
                          <input
                            type="number"
                            name="price"
                            value={editInstrumentForm.price}
                            onChange={handleEditInstrumentChange}
                            className="border rounded px-2 py-1 w-20"
                          />
                        ) : (
                          inst.price
                        )}
                      </td>
                      <td className="py-2 px-4">
                        {editInstrumentId === inst._id ? (
                          <input
                            type="text"
                            name="location"
                            value={editInstrumentForm.location}
                            onChange={handleEditInstrumentChange}
                            className="border rounded px-2 py-1 w-28"
                          />
                        ) : (
                          inst.location
                        )}
                      </td>
                      <td className="py-2 px-4 flex gap-2">
                        {editInstrumentId === inst._id ? (
                          <>
                            <button
                              onClick={handleEditInstrumentSubmit}
                              className="px-2 py-1 bg-green-600 text-white rounded text-xs shadow hover:bg-green-700"
                            >Save</button>
                            <button
                              onClick={handleEditInstrumentCancel}
                              className="px-2 py-1 bg-gray-300 text-primary-dull rounded text-xs shadow hover:bg-gray-400"
                            >Cancel</button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => openEditInstrument(inst)}
                              className="px-2 py-1 bg-pink-500 text-white rounded text-xs shadow hover:bg-pink-600"
                            >Edit</button>
                            <button
                              onClick={() => handleDeleteInstrument(inst._id)}
                              className="px-2 py-1 bg-red-500 text-white rounded text-xs shadow hover:bg-red-600"
                            >Delete</button>
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
        {/* Reviews Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full"></span> Ratings & Reviews
          </h2>
          {loadingReviews ? (
            <p className="text-gray-500">Loading reviews...</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border-separate border-spacing-y-2">
                  <thead>
                    <tr className="bg-gray-50 text-gray-700">
                      <th className="py-2 px-4 font-semibold">Instrument</th>
                      <th className="py-2 px-4 font-semibold">User</th>
                      <th className="py-2 px-4 font-semibold">Rating</th>
                      <th className="py-2 px-4 font-semibold">Comment</th>
                      <th className="py-2 px-4 font-semibold">Date</th>
                      <th className="py-2 px-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviews.map(r => (
                      <tr key={r._id} className="bg-white shadow rounded-lg">
                        <td className="py-2 px-4">
                          {(r.instrument?.brand || '') + ' ' + (r.instrument?.model || '')}
                          <div className="text-xs text-gray-500">{r.instrument?.category}</div>
                        </td>
                        <td className="py-2 px-4">
                          <div className="font-medium">{r.user?.name}</div>
                          <div className="text-xs text-gray-500">{r.user?.email}</div>
                        </td>
                        <td className="py-2 px-4">⭐ {r.rating}</td>
                        <td className="py-2 px-4 max-w-md truncate" title={r.comment}>{r.comment}</td>
                        <td className="py-2 px-4">{new Date(r.createdAt).toLocaleDateString()}</td>
                        <td className="py-2 px-4">
                          <button onClick={() => handleDeleteReview(r._id)} className="px-2 py-1 bg-red-500 text-white rounded text-xs shadow hover:bg-red-600">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {reviewsPages > 1 && (
                <div className="flex items-center justify-end gap-2 mt-4">
                  <button disabled={reviewsPage<=1} onClick={() => fetchReviews(reviewsPage-1)} className="px-3 py-1 border rounded disabled:opacity-50">Prev</button>
                  <span className="text-sm text-gray-600">Page {reviewsPage} of {reviewsPages}</span>
                  <button disabled={reviewsPage>=reviewsPages} onClick={() => fetchReviews(reviewsPage+1)} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
