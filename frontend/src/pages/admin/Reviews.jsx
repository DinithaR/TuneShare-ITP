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
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [summary, setSummary] = useState({ overall: { count: 0, avgRating: 0, minRating: 0, maxRating: 0 }, topInstruments: [] });

  const fetchReviews = async (p = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(p), limit: '20' });
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const { data } = await axios.get(`/api/reviews/admin/list?${params.toString()}`);
      if (data.success) {
        setReviews(data.reviews);
        setPage(data.page); setPages(data.pages); setTotal(data.total);
      } else toast.error(data.message);
    } catch { toast.error('Failed to fetch reviews'); } finally { setLoading(false); }
  };

  const fetchSummary = async () => {
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const { data } = await axios.get(`/api/reviews/admin/summary?${params.toString()}`);
      if (data.success) setSummary(data);
    } catch {
      // non-fatal
    }
  };

  useEffect(() => { fetchReviews(1); fetchSummary(); }, []);

  const applyFilters = () => { fetchReviews(1); fetchSummary(); };
  const clearFilters = () => { setFrom(''); setTo(''); setTimeout(() => { fetchReviews(1); fetchSummary(); }, 0); };

  const exportCsv = async () => {
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await axios.get(`/api/reviews/admin/export?${params.toString()}`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = `reviews_report_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch {
      toast.error('Export failed');
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this review?')) return;
    try {
      const { data } = await axios.delete(`/api/reviews/${id}`);
      if (data.success) { toast.success('Review deleted'); fetchReviews(page); } else toast.error(data.message);
    } catch { toast.error('Failed to delete review'); }
  };

  return (
    <div className="bg-white rounded-2xl shadow p-6 border border-gray-100">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-4">
        <h2 className="text-xl font-bold text-gray-800">Reviews</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input type="date" value={from} onChange={(e)=> setFrom(e.target.value)} className="border rounded px-2 py-1" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input type="date" value={to} onChange={(e)=> setTo(e.target.value)} className="border rounded px-2 py-1" />
          </div>
          <button onClick={applyFilters} className="px-3 py-2 bg-primary text-white rounded">Apply</button>
          <button onClick={clearFilters} className="px-3 py-2 border rounded">Clear</button>
          <button onClick={exportCsv} className="px-3 py-2 bg-green-600 text-white rounded">Export PDF</button>
        </div>
      </div>

      {/* Summary */}
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
