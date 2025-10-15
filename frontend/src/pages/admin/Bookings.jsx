import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../../context/AppContext';

const AdminBookings = () => {
  const { axios } = useAppContext();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('current'); // 'current' | 'previous'
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(''); // '', pending, confirmed, cancelled
  const [payment, setPayment] = useState(''); // '', paid, pending

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        setError('');
        const { data } = await axios.get('/api/bookings/owner');
        if (data.success) {
          setBookings(Array.isArray(data.bookings) ? data.bookings : []);
        } else {
          setError(data.message || 'Failed to load bookings');
        }
      } catch (e) {
        setError('Failed to load bookings');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [axios]);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bookings.filter(b => {
      // Current: returnDate >= today; Previous: returnDate < today
      const ret = new Date(b.returnDate);
      const isCurrent = ret >= today;
      if ((tab === 'current' && !isCurrent) || (tab === 'previous' && isCurrent)) return false;

      if (status && b.status !== status) return false;
      if (payment && b.paymentStatus !== payment) return false;

      if (!q) return true;
      const instr = b.instrument || {};
      const user = b.user || {};
      const hay = [
        b._id,
        b.status,
        b.paymentStatus,
        instr.brand,
        instr.model,
        instr.category,
        instr.location,
        user.name,
        user.email
      ].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [bookings, tab, search, status, payment, today]);

  const counts = useMemo(() => {
    let current = 0, previous = 0;
    for (const b of bookings) {
      const ret = new Date(b.returnDate);
      (ret >= today ? current++ : previous++);
    }
    return { current, previous };
  }, [bookings, today]);

  return (
    <div className="bg-white rounded-2xl shadow p-6 border border-gray-100">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-xl font-bold text-gray-800">Bookings</h2>
        <div className="flex gap-2 text-sm">
          <button onClick={() => setTab('current')} className={`px-3 py-1.5 rounded-full border ${tab==='current' ? 'bg-pink-600 border-pink-600 text-white' : 'hover:bg-gray-50'}`}>
            Current ({counts.current})
          </button>
          <button onClick={() => setTab('previous')} className={`px-3 py-1.5 rounded-full border ${tab==='previous' ? 'bg-pink-600 border-pink-600 text-white' : 'hover:bg-gray-50'}`}>
            Previous ({counts.previous})
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Search</label>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search booking, user, instrument..." className="border rounded px-3 py-2 text-sm w-72" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Status</label>
          <select value={status} onChange={e=>setStatus(e.target.value)} className="border rounded px-2 py-2 text-sm">
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Payment</label>
          <select value={payment} onChange={e=>setPayment(e.target.value)} className="border rounded px-2 py-2 text-sm">
            <option value="">All</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        {(search || status || payment) && (
          <button onClick={()=>{ setSearch(''); setStatus(''); setPayment(''); }} className="text-xs text-gray-600 hover:text-gray-800 mb-1">Reset</button>
        )}
      </div>

      {loading ? (
        <div className="text-gray-600 mt-6">Loading bookings…</div>
      ) : error ? (
        <div className="text-red-600 mt-6">{error}</div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full border text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left">
                <Th>ID</Th>
                <Th>Instrument</Th>
                <Th>Customer</Th>
                <Th>Pickup</Th>
                <Th>Return</Th>
                <Th>Status</Th>
                <Th>Payment</Th>
                <Th>Created</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-gray-500">No {tab} bookings.</td>
                </tr>
              ) : (
                filtered.map(b => (
                  <tr key={b._id} className="border-t">
                    <Td className="font-mono text-xs">{shortId(b._id)}</Td>
                    <Td>
                      <div className="font-medium">{(b.instrument?.brand || '') + ' ' + (b.instrument?.model || '')}</div>
                      <div className="text-gray-500">{b.instrument?.location}</div>
                    </Td>
                    <Td>
                      <div className="font-medium">{b.user?.name || '—'}</div>
                      <div className="text-gray-500 text-xs">{b.user?.email || '—'}</div>
                    </Td>
                    <Td>{fmtDate(b.pickupDate)}</Td>
                    <Td>{fmtDate(b.returnDate)}</Td>
                    <Td>{renderStatus(b.status, b.paymentStatus)}</Td>
                    <Td>{renderPayment(b.paymentStatus)}</Td>
                    <Td>{fmtDate(b.createdAt)}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

function Th({ children }) {
  return <th className="px-3 py-2 border-b font-semibold text-gray-700 whitespace-nowrap">{children}</th>;
}
function Td({ children, className='' }) {
  return <td className={`px-3 py-2 align-top whitespace-nowrap ${className}`}>{children}</td>;
}

function fmtDate(d) {
  if (!d) return '—';
  try {
    const date = new Date(d);
    return date.toISOString().slice(0, 10);
  } catch { return '—'; }
}
function formatRef(id, prefix = 'R', digits = 4) {
  if (!id) return `${prefix}${'0'.repeat(digits)}`;
  const s = String(id);
  const hex = s.replace(/[^0-9a-fA-F]/g, '');
  let num = 0;
  if (hex.length >= 4) {
    num = parseInt(hex.slice(-4), 16) % Math.pow(10, digits);
  } else {
    for (let i = 0; i < s.length; i++) num = (num + s.charCodeAt(i)) % Math.pow(10, digits);
  }
  return `${prefix}${String(num).padStart(digits, '0')}`;
}
function shortId(id) {
  return formatRef(id, 'R');
}
function renderPayment(ps) {
  const classes = 'px-2 py-1 rounded-full text-xs inline-block';
  if (ps === 'paid') return <span className={`${classes} bg-green-100 text-green-700`}>Paid</span>;
  return <span className={`${classes} bg-gray-100 text-gray-700`}>Pending</span>;
}
function renderStatus(s, paymentStatus) {
  const classes = 'px-2 py-1 rounded-full text-xs inline-block';
  if (s === 'confirmed') return <span className={`${classes} bg-green-100 text-green-700`}>Confirmed</span>;
  if (s === 'cancelled') return <span className={`${classes} bg-red-100 text-red-700`}>Cancelled</span>;
  // pending
  if (paymentStatus === 'paid') return <span className={`${classes} bg-amber-100 text-amber-700`}>Awaiting approval</span>;
  return <span className={`${classes} bg-gray-100 text-gray-700`}>Pending</span>;
}

export default AdminBookings;
