import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import Title from '../components/Title';
import toast from 'react-hot-toast';

const AdminPayments = () => {
  const { axios, currency } = useAppContext();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  // Filters
  const [q, setQ] = useState('');
  const [type, setType] = useState(''); // '', 'rental', 'late_fee'
  const [status, setStatus] = useState(''); // '', 'pending', 'succeeded', 'failed'
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/api/payments/admin');
      if (data.success) setPayments(data.payments); else toast.error('Failed to load payments');
    } catch (err) {
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPayments(); }, []);

  const downloadReport = async (paymentId) => {
    try {
      const res = await axios.get(`/api/payments/report/${paymentId}`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payment_${paymentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      toast.error('Failed to download report');
    }
  };

  // Helpers
  const fmtAmount = (n, ccy) => {
    if (typeof n !== 'number') return '-';
    try {
      const f = new Intl.NumberFormat('en-LK');
      const code = (ccy || currency || 'LKR');
      return `${code}${f.format(n)}`;
    } catch {
      return `${currency || 'LKR'}${n}`;
    }
  };

  const withinDate = (iso, from, to) => {
    if (!iso) return false;
    const d = new Date(iso);
    if (from) {
      const f = new Date(from + 'T00:00:00');
      if (d < f) return false;
    }
    if (to) {
      const t = new Date(to + 'T23:59:59');
      if (d > t) return false;
    }
    return true;
  };

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    const min = minAmount ? Number(minAmount) : null;
    const max = maxAmount ? Number(maxAmount) : null;
    return payments.filter(p => {
      // Type
      if (type && p.type !== type) return false;
      // Status
      if (status && p.status !== status) return false;
      // Amount range (use displayAmount)
      if (min != null && Number(p.displayAmount) < min) return false;
      if (max != null && Number(p.displayAmount) > max) return false;
      // Date range (createdAt)
      if ((fromDate || toDate) && !withinDate(p.createdAt, fromDate, toDate)) return false;
      // Text search: user name/email, instrument brand/model, booking id, stripe ids
      if (text) {
        const hay = [
          p.user?.name,
          p.user?.email,
          p.booking?._id,
          p.booking?.instrument?.brand,
          p.booking?.instrument?.model,
          p.type,
          p.status,
          p.stripeSessionId,
          p.stripePaymentIntentId
        ].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(text)) return false;
      }
      return true;
    });
  }, [payments, q, type, status, fromDate, toDate, minAmount, maxAmount]);

  return (
    <div className='px-4 md:px-8 lg:px-12 2xl:px-16 mt-16 text-sm w-full max-w-none'>
      <Title title='Payments' subtitle='All platform transactions' align='left' />
      {/* Filters */}
      <div className='mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 items-end'>
        <input
          value={q}
          onChange={e=>setQ(e.target.value)}
          placeholder='Search: user, email, instrument, booking, stripe id...'
          className='border rounded px-3 py-2 w-full min-w-0'
        />
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 w-full min-w-0'>
          <select value={type} onChange={e=>setType(e.target.value)} className='border rounded px-3 py-2 w-full'>
            <option value=''>All Types</option>
            <option value='rental'>Rental</option>
            <option value='late_fee'>Late Fee</option>
          </select>
          <select value={status} onChange={e=>setStatus(e.target.value)} className='border rounded px-3 py-2 w-full'>
            <option value=''>All Statuses</option>
            <option value='pending'>Pending</option>
            <option value='succeeded'>Succeeded</option>
            <option value='failed'>Failed</option>
          </select>
        </div>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 w-full min-w-0'>
          <input type='date' value={fromDate} onChange={e=>setFromDate(e.target.value)} className='border rounded px-3 py-2 w-full' />
          <input type='date' value={toDate} onChange={e=>setToDate(e.target.value)} className='border rounded px-3 py-2 w-full' />
        </div>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 w-full min-w-0'>
          <input type='number' min='0' placeholder='Min amount' value={minAmount} onChange={e=>setMinAmount(e.target.value)} className='border rounded px-3 py-2 w-full' />
          <input type='number' min='0' placeholder='Max amount' value={maxAmount} onChange={e=>setMaxAmount(e.target.value)} className='border rounded px-3 py-2 w-full' />
        </div>
        <div className='md:col-span-2 lg:col-span-1 flex gap-2 items-center justify-between w-full'>
          <button onClick={()=>{ setQ(''); setType(''); setStatus(''); setFromDate(''); setToDate(''); setMinAmount(''); setMaxAmount(''); }} className='px-3 py-2 border rounded'>Reset</button>
          <div className='text-gray-500 text-xs whitespace-nowrap'>Showing {filtered.length} of {payments.length}</div>
        </div>
      </div>
      {loading ? (
        <div className='py-10 text-center text-gray-500'>Loading...</div>
      ) : payments.length === 0 ? (
        <div className='py-10 text-center text-gray-500'>No payments yet.</div>
      ) : (
        <div className='overflow-x-auto mt-6'>
          <table className='w-full border text-xs md:text-sm table-auto'>
            <thead className='bg-gray-50'>
              <tr>
                <th className='p-2 border'>Booking</th>
                <th className='p-2 border'>User</th>
                <th className='p-2 border'>Instrument</th>
                <th className='p-2 border'>Type</th>
                <th className='p-2 border'>Amount</th>
                <th className='p-2 border'>Commission</th>
                <th className='p-2 border'>Owner Payout</th>
                <th className='p-2 border'>Status</th>
                <th className='p-2 border'>Created</th>
                <th className='p-2 border'>Paid</th>
                <th className='p-2 border'>Notes</th>
                <th className='p-2 border'>Report</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p._id} className='hover:bg-gray-50'>
                  <td className='p-2 border'>{p.booking?._id?.slice(-6)}</td>
                  <td className='p-2 border'>
                    <div className='flex flex-col'>
                      <span className='font-medium'>{p.user?.name || '-'}</span>
                      <span className='text-gray-500 text-[11px]'>{p.user?.email || ''}</span>
                    </div>
                  </td>
                  <td className='p-2 border'>{p.booking?.instrument?.brand} {p.booking?.instrument?.model}</td>
                  <td className='p-2 border'>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${p.type === 'late_fee' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                      {p.type === 'late_fee' ? 'Late Fee' : 'Rental'}
                    </span>
                  </td>
                  <td className='p-2 border text-right'>{fmtAmount(p.displayAmount, (p.currency || '').toUpperCase())}</td>
                  <td className='p-2 border text-right text-gray-700'>{fmtAmount(p.commission, (p.currency || '').toUpperCase())}</td>
                  <td className='p-2 border text-right text-gray-700'>{fmtAmount(p.ownerPayout, (p.currency || '').toUpperCase())}</td>
                  <td className='p-2 border'>
                    <span className={`px-2 py-1 rounded-full text-xs ${p.status === 'succeeded' ? 'bg-green-100 text-green-600' : p.status === 'failed' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>{p.status}</span>
                  </td>
                  <td className='p-2 border'>
                    <div className='flex flex-col'>
                      <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                      <span className='text-[11px] text-gray-500'>{new Date(p.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </td>
                  <td className='p-2 border'>
                    {p.paidAt ? (
                      <div className='flex flex-col'>
                        <span>{new Date(p.paidAt).toLocaleDateString()}</span>
                        <span className='text-[11px] text-gray-500'>{new Date(p.paidAt).toLocaleTimeString()}</span>
                      </div>
                    ) : <span className='text-gray-400'>—</span>}
                  </td>
                  <td className='p-2 border text-xs text-gray-600'>
                    {p.type === 'late_fee' ? (
                      <div className='space-y-0.5'>
                        <div>Late by {p?.booking?.lateDays ?? 0} day(s)</div>
                        <div>{p?.booking?.lateFeePaid ? 'Late fee paid' : 'Late fee unpaid'}</div>
                      </div>
                    ) : (
                      <div className='space-y-0.5'>
                        <div className='text-gray-600'>Commission {fmtAmount(p.commission, (p.currency || '').toUpperCase())}</div>
                        <div className='text-gray-500 text-[11px]'>Session: {p.stripeSessionId?.slice(-8) || '-'}</div>
                      </div>
                    )}
                  </td>
                  <td className='p-2 border text-center'>
                    <button onClick={() => downloadReport(p._id)} className='px-2 py-1 bg-pink-500 text-white rounded text-xs hover:bg-pink-600'>Download</button>
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

export default AdminPayments;
