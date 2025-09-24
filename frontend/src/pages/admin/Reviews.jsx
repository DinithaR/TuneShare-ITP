import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';

const AdminReviews = () => {
  const { axios } = useAppContext();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchReviews = async (p = 1) => {
    try {
      setLoading(true);
      const { data } = await axios.get(`/api/reviews/admin/list?page=${p}&limit=20`);
      if (data.success) {
        setReviews(data.reviews);
        setPage(data.page); setPages(data.pages); setTotal(data.total);
      } else toast.error(data.message);
    } catch { toast.error('Failed to fetch reviews'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchReviews(1); }, []);

  const onDelete = async (id) => {
    if (!window.confirm('Delete this review?')) return;
    try {
      const { data } = await axios.delete(`/api/reviews/${id}`);
      if (data.success) { toast.success('Review deleted'); fetchReviews(page); } else toast.error(data.message);
    } catch { toast.error('Failed to delete review'); }
  };

  return (
    <div className="bg-white rounded-2xl shadow p-6 border border-gray-100">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Reviews</h2>
      {loading ? <p className="text-gray-500">Loading...</p> : reviews.length === 0 ? (
        <p className="text-gray-500">No reviews yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border-separate border-spacing-y-2">
            <thead>
              <tr className="bg-gray-50 text-gray-700">
                <th className="py-2 px-4">Instrument</th>
                <th className="py-2 px-4">User</th>
                <th className="py-2 px-4">Rating</th>
                <th className="py-2 px-4">Comment</th>
                <th className="py-2 px-4">Date</th>
                <th className="py-2 px-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map(r => (
                <tr key={r._id} className="bg-white shadow rounded">
                  <td className="py-2 px-4">{r.instrument?.brand} {r.instrument?.model}</td>
                  <td className="py-2 px-4">{r.user?.name}</td>
                  <td className="py-2 px-4">{r.rating}</td>
                  <td className="py-2 px-4 max-w-xs truncate">{r.comment}</td>
                  <td className="py-2 px-4">{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td className="py-2 px-4">
                    <button onClick={()=>onDelete(r._id)} className="px-2 py-1 bg-red-500 text-white rounded text-xs">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pages > 1 && (
            <div className="flex items-center gap-2 mt-4">
              <button disabled={page<=1} onClick={()=>fetchReviews(page-1)} className="px-3 py-1 border rounded disabled:opacity-50">Prev</button>
              <span className="text-xs text-gray-600">Page {page} of {pages} • {total} total</span>
              <button disabled={page>=pages} onClick={()=>fetchReviews(page+1)} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminReviews;
