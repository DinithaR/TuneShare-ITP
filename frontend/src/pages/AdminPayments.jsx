import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import Title from '../components/Title';
import toast from 'react-hot-toast';

const AdminPayments = () => {
  const { axios } = useAppContext();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className='px-6 md:px-16 lg:px-32 2xl:px-48 mt-16 text-sm max-w-7xl'>
      <Title title='Payments' subtitle='All platform transactions' align='left' />
      {loading ? (
        <div className='py-10 text-center text-gray-500'>Loading...</div>
      ) : payments.length === 0 ? (
        <div className='py-10 text-center text-gray-500'>No payments yet.</div>
      ) : (
        <div className='overflow-x-auto mt-6'>
          <table className='min-w-full border text-xs md:text-sm'>
            <thead className='bg-gray-50'>
              <tr>
                <th className='p-2 border'>Booking</th>
                <th className='p-2 border'>User</th>
                <th className='p-2 border'>Instrument</th>
                <th className='p-2 border'>Type</th>
                <th className='p-2 border'>Amount (LKR)</th>
                <th className='p-2 border'>Commission</th>
                <th className='p-2 border'>Owner Payout</th>
                <th className='p-2 border'>Status</th>
                <th className='p-2 border'>Created</th>
                <th className='p-2 border'>Notes</th>
                <th className='p-2 border'>Report</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p._id} className='hover:bg-gray-50'>
                  <td className='p-2 border'>{p.booking?._id?.slice(-6)}</td>
                  <td className='p-2 border'>{p.user?.name}</td>
                  <td className='p-2 border'>{p.booking?.instrument?.brand} {p.booking?.instrument?.model}</td>
                  <td className='p-2 border'>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${p.type === 'late_fee' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                      {p.type === 'late_fee' ? 'Late Fee' : 'Rental'}
                    </span>
                  </td>
                  <td className='p-2 border text-right'>{p.displayAmount}</td>
                  <td className='p-2 border text-right'>{p.commission}</td>
                  <td className='p-2 border text-right'>{p.ownerPayout}</td>
                  <td className='p-2 border'>
                    <span className={`px-2 py-1 rounded-full text-xs ${p.status === 'succeeded' ? 'bg-green-100 text-green-600' : p.status === 'failed' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>{p.status}</span>
                  </td>
                  <td className='p-2 border'>{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td className='p-2 border text-xs text-gray-600'>
                    {p.type === 'late_fee' ? (
                      <div className='space-y-0.5'>
                        <div>Late by {p?.booking?.lateDays ?? 0} day(s)</div>
                        <div>{p?.booking?.lateFeePaid ? 'Late fee paid' : 'Late fee unpaid'}</div>
                      </div>
                    ) : (
                      <span className='text-gray-400'>—</span>
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
