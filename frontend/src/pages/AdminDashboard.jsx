

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
  const [userSearch, setUserSearch] = useState('');
  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsPages, setReviewsPages] = useState(1);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [summary, setSummary] = useState({ overall: { count: 0, avgRating: 0, minRating: 0, maxRating: 0 }, topInstruments: [] });
  // Add missing state for instruments section
  const [instruments, setInstruments] = useState([]);
  const [loadingInstruments, setLoadingInstruments] = useState(true);
  const [editInstrumentId, setEditInstrumentId] = useState(null);
  const [editInstrumentForm, setEditInstrumentForm] = useState({ name: '', type: '', price: '', location: '' });


  // Fetch all users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (userSearch && userSearch.trim()) params.set('search', userSearch.trim());
      const { data } = await axios.get(`/api/user/all?${params.toString()}`);
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

  const handleExportUsersPdf = async () => {
    try {
      const params = new URLSearchParams();
      if (userSearch && userSearch.trim()) params.set('search', userSearch.trim());
      const res = await axios.get(`/api/user/export/users.pdf?${params.toString()}` , { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = `users_report_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch (error) {
      toast.error('Failed to export users');
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
    fetchSummary();
    // eslint-disable-next-line
  }, []);

  const fetchReviews = async (page = 1) => {
    try {
      setLoadingReviews(true);
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (filterFrom) params.set('from', filterFrom);
      if (filterTo) params.set('to', filterTo);
      const { data } = await axios.get(`/api/reviews/admin/list?${params.toString()}`);
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

  const fetchSummary = async () => {
    try {
      const params = new URLSearchParams();
      if (filterFrom) params.set('from', filterFrom);
      if (filterTo) params.set('to', filterTo);
      const { data } = await axios.get(`/api/reviews/admin/summary?${params.toString()}`);
      if (data.success) setSummary(data);
    } catch (error) {
      // non-fatal
    }
  };

  const handleApplyFilters = () => {
    fetchReviews(1);
    fetchSummary();
  };

  const handleClearFilters = () => {
    setFilterFrom('');
    setFilterTo('');
    setTimeout(() => {
      fetchReviews(1);
      fetchSummary();
    }, 0);
  };

  const handleExportCsv = async () => {
    try {
      const params = new URLSearchParams();
      if (filterFrom) params.set('from', filterFrom);
      if (filterTo) params.set('to', filterTo);
      const url = `/api/reviews/admin/export?${params.toString()}`;
      const res = await axios.get(url, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = `reviews_report_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch (error) {
      toast.error('Export failed');
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
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-4">
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              onKeyDown={(e)=>{ if(e.key==='Enter') fetchUsers(); }}
              placeholder="Search by name or email..."
              className="border border-gray-300 rounded px-3 py-2 w-full md:w-72"
            />
            <div className="flex gap-2">
              <button onClick={fetchUsers} className="px-3 py-2 bg-blue-600 text-white rounded text-sm">Search</button>
              <button onClick={()=>{ setUserSearch(''); setTimeout(()=>fetchUsers(),0); }} className="px-3 py-2 bg-gray-200 text-gray-800 rounded text-sm">Clear</button>
              <button onClick={handleExportUsersPdf} className="px-3 py-2 bg-pink-500 text-white rounded text-sm">Export PDF</button>
            </div>
          </div>
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
          {/* Filters and actions */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-4">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">From</label>
                <input type="date" value={filterFrom} onChange={(e)=> setFilterFrom(e.target.value)} className="border rounded px-2 py-1" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">To</label>
                <input type="date" value={filterTo} onChange={(e)=> setFilterTo(e.target.value)} className="border rounded px-2 py-1" />
              </div>
              <button onClick={handleApplyFilters} className="px-3 py-2 bg-primary text-white rounded">Apply</button>
              <button onClick={handleClearFilters} className="px-3 py-2 border rounded">Clear</button>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleExportCsv} className="px-3 py-2 bg-green-600 text-white rounded">Export PDF</button>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="p-3 border rounded bg-gray-50">
              <div className="text-xs text-gray-500">Total Reviews</div>
              <div className="text-xl font-semibold">{summary.overall?.count ?? 0}</div>
            </div>
            <div className="p-3 border rounded bg-gray-50">
              <div className="text-xs text-gray-500">Average Rating</div>
              <div className="text-xl font-semibold">{(summary.overall?.avgRating ?? 0).toFixed(2)}</div>
            </div>
            <div className="p-3 border rounded bg-gray-50">
              <div className="text-xs text-gray-500">Min Rating</div>
              <div className="text-xl font-semibold">{summary.overall?.minRating ?? 0}</div>
            </div>
            <div className="p-3 border rounded bg-gray-50">
              <div className="text-xs text-gray-500">Max Rating</div>
              <div className="text-xl font-semibold">{summary.overall?.maxRating ?? 0}</div>
            </div>
          </div>

          {/* Top instruments */}
          {summary.topInstruments && summary.topInstruments.length > 0 && (
            <div className="mb-4">
              <div className="text-sm font-semibold mb-2">Top Instruments (by review count)</div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="text-gray-600">
                      <th className="text-left py-1 px-2">Instrument</th>
                      <th className="text-left py-1 px-2">Category</th>
                      <th className="text-left py-1 px-2">Reviews</th>
                      <th className="text-left py-1 px-2">Avg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.topInstruments.map((ti) => (
                      <tr key={ti.instrumentId} className="border-t">
                        <td className="py-1 px-2">{ti.brand} {ti.model}</td>
                        <td className="py-1 px-2">{ti.category}</td>
                        <td className="py-1 px-2">{ti.count}</td>
                        <td className="py-1 px-2">{ti.avgRating?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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
