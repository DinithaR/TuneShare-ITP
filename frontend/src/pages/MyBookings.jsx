import React, { useEffect, useState } from 'react'
import { assets } from '../assets/assets'
import Title from '../components/Title'
import { useAppContext } from '../context/AppContext'
import toast from 'react-hot-toast'
import { useNavigate, Link } from 'react-router-dom'
import BillingInfoModal from '../components/BillingInfoModal'

const MyBookings = () => {
  const [bookings, setBookings] = useState([])
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editData, setEditData] = useState({ pickupDate: '', returnDate: '' })
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [paymentStatus, setPaymentStatus] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [status, setStatus] = useState('')
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)
  const [receiptLoading, setReceiptLoading] = useState(false)
  const [paymentForReceipt, setPaymentForReceipt] = useState(null)
  const [billingOpen, setBillingOpen] = useState(false)
  const [pendingPayment, setPendingPayment] = useState(null) // { bookingId, type: 'rental'|'late_fee' }
  const navigate = useNavigate();
  const currency = import.meta.env.VITE_CURRENCY
  const { axios } = useAppContext()

  const fetchMyBookings = async (query='') => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (query) params.append('q', query)
      params.append('page', page)
      params.append('limit', 6)
      if (paymentStatus) params.append('paymentStatus', paymentStatus)
      if (startDate) params.append('startDate', startDate)
  if (endDate) params.append('endDate', endDate)
  if (status) params.append('status', status)
      const { data } = await axios.get(`/api/bookings/user?${params.toString()}`);
      if (data.success) {
        setBookings(data.bookings);
        if (data.totalPages) setTotalPages(data.totalPages)
      } else {
        setBookings([]);
      }
    } catch (error) {
      setBookings([]);
    } finally {
      setLoading(false)
    }
  };

  const location = useNavigate && window.history.state && window.history.state.usr ? window.history.state.usr : {};
  useEffect(() => {
    // Refetch if redirected from payment success
    if (location && location.refetch) {
      fetchMyBookings();
      // Optionally, clear the refetch flag
      window.history.replaceState({}, document.title);
    } else {
      fetchMyBookings();
    }
  }, []);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400)
    return () => clearTimeout(t)
  }, [search])

  // Refetch when debounced search changes
  useEffect(() => {
    fetchMyBookings(debouncedSearch)
  }, [debouncedSearch, page, paymentStatus, startDate, endDate, status])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, paymentStatus, startDate, endDate, status])

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this booking? This action cannot be undone.')) return;
    try {
      const { data } = await axios.delete(`/api/bookings/user/${id}`); // backend now soft-cancels
      if (data.success) {
        toast.success('Booking cancelled');
        // Refresh list to get cancelledAt timestamp
        setBookings(prev => prev.map(b => b._id === id ? data.booking : b));
      } else {
        toast.error(data.message || 'Cancel failed');
      }
    } catch (error) {
      toast.error('Cancel failed');
    }
  };

  const handleEditClick = (booking) => {
    // Disallow editing once the booking has been paid
  if (booking.paymentStatus === 'paid' || booking.status === 'cancelled') return;
    setEditId(booking._id);
    setEditData({
      pickupDate: booking.pickupDate.split('T')[0],
      returnDate: booking.returnDate.split('T')[0]
    });
  };

  const handleEditChange = (e) => {
    setEditData({ ...editData, [e.target.name]: e.target.value });
  };

  const handleEditSave = async (id) => {
    try {
      const { data } = await axios.put(`/api/bookings/user/${id}`, editData);
      if (data.success) {
        toast.success('Booking updated');
        setEditId(null);
        fetchMyBookings();
      } else {
        toast.error(data.message || 'Update failed');
      }
    } catch (error) {
      toast.error('Update failed');
    }
  };

  const handleEditCancel = () => {
    setEditId(null);
    setEditData({ pickupDate: '', returnDate: '' });
  };

  const handlePayNow = (bookingId) => {
    setPendingPayment({ bookingId, type: 'rental' })
    setBillingOpen(true)
  }

  const handlePayLateFee = (e, bookingId) => {
    e?.stopPropagation?.()
    setPendingPayment({ bookingId, type: 'late_fee' })
    setBillingOpen(true)
  }

  const submitBillingAndPay = async (billingInfo) => {
    if (!pendingPayment) return;
    try {
      const endpoint = pendingPayment.type === 'late_fee' ? '/api/payments/create-late-fee-session' : '/api/payments/create-checkout-session';
      const { data } = await axios.post(endpoint, { bookingId: pendingPayment.bookingId, billingInfo });
      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.message || 'Could not start payment');
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not start payment');
    } finally {
      setBillingOpen(false);
      setPendingPayment(null);
    }
  }

  const openBookingModal = (booking) => {
    setSelectedBooking(booking)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedBooking(null)
  }

  const openReceipt = async (e, bookingId) => {
    e?.stopPropagation?.()
    try {
      setReceiptLoading(true)
      setReceiptModalOpen(true)
      const { data } = await axios.get(`/api/payments/for-booking/${bookingId}`)
      if (data.success) {
        setPaymentForReceipt(data.payment)
      } else {
        setPaymentForReceipt(null)
        toast.error(data.message || 'Receipt not available')
      }
    } catch (err) {
      setPaymentForReceipt(null)
      toast.error('Failed to load receipt')
    } finally {
      setReceiptLoading(false)
    }
  }

  const closeReceipt = () => {
    setReceiptModalOpen(false)
    setPaymentForReceipt(null)
  }

  return (
    <div className='px-6 md:px-16 lg:px-32 2xl:px-48 mt-16 text-sm max-w-7xl'>
      <Title title='My Booking' subtitle='View and manage your all bookings' align='left' />
      <div>
        <div className='mt-6 flex flex-col md:flex-row md:items-end gap-3 flex-wrap'>
          <input
            type='text'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Search by instrument, location, status...'
            className='w-full md:w-80 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-400'
          />
          {debouncedSearch && (
            <button
              onClick={() => { setSearch(''); setDebouncedSearch(''); }}
              className='text-sm text-gray-500 hover:text-gray-700'
            >Clear</button>
          )}
          <div className='flex gap-2 items-center'>
            <div className='flex flex-col'>
              <label className='text-xs text-gray-500'>Start Date</label>
              <input type='date' value={startDate} onChange={e=>setStartDate(e.target.value)} className='border rounded px-2 py-1 text-sm'/>
            </div>
            <div className='flex flex-col'>
              <label className='text-xs text-gray-500'>End Date</label>
              <input type='date' value={endDate} onChange={e=>setEndDate(e.target.value)} className='border rounded px-2 py-1 text-sm'/>
            </div>
            <div className='flex flex-col'>
              <label className='text-xs text-gray-500'>Payment</label>
              <select value={paymentStatus} onChange={e=>setPaymentStatus(e.target.value)} className='border rounded px-2 py-1 text-sm'>
                <option value=''>All</option>
                <option value='paid'>Paid</option>
                <option value='pending'>Pending</option>
              </select>
            </div>
            <div className='flex flex-col'>
              <label className='text-xs text-gray-500'>Status</label>
              <select value={status} onChange={e=>setStatus(e.target.value)} className='border rounded px-2 py-1 text-sm'>
                <option value=''>All</option>
                <option value='pending'>Pending</option>
                <option value='confirmed'>Confirmed</option>
                <option value='cancelled'>Cancelled</option>
              </select>
            </div>
            {(paymentStatus || startDate || endDate || status) && (
              <button
                onClick={()=>{ setPaymentStatus(''); setStartDate(''); setEndDate(''); setStatus(''); }}
                className='text-xs text-gray-500 h-7 self-end mb-0.5 hover:text-gray-700'
              >Reset Filters</button>
            )}
          </div>
        </div>
        {loading && (
          <div className='text-gray-500 mt-6'>Loading bookings...</div>
        )}
        {bookings.length === 0 ? (
          <div className="text-center text-gray-500 py-20 text-lg">{debouncedSearch ? 'No bookings match your search.' : 'You have no bookings yet.'}</div>
        ) : (
          bookings.map((booking, index) => (
            <div
              key={booking._id}
              className='grid grid-cols-1 md:grid-cols-4 gap-6 p-6 border rounded-lg mt-5 first:mt-12 hover:shadow-sm transition-shadow'
              style={{ borderColor: 'var(--color-borderColor)' }}
            >
              {/* Instrument Image + info */}
              <div className='md:col-span-1'>
                <div
                  className='rounded-md overflow-hidden mb-3 cursor-pointer'
                  role='button'
                  tabIndex={0}
                  title='View booking details'
                  onClick={() => openBookingModal(booking)}
                  onKeyDown={(e)=>{ if(e.key==='Enter') openBookingModal(booking) }}
                >
                  <img src={booking?.instrument?.image || ''} alt={booking?.instrument?.name || 'Instrument'} className='w-full h-auto aspect-video object-cover'/>
                </div>
                <p className='text-lg font-medium mt-2'>{highlight(`${booking?.instrument?.brand || ''} ${booking?.instrument?.model || ''}`, debouncedSearch)}</p>
                <p className='text-gray-500'>{highlight(booking?.instrument?.category || '', debouncedSearch)} • {highlight(booking?.instrument?.location || '', debouncedSearch)}</p>
              </div>
              {/* Booking Info */}
              <div className='md:col-span-2'>
                <div className='flex items-center gap-2'>
                  <p className='px-3 py-1.5 rounded' style={{ backgroundColor: 'var(--color-light)' }}>Booking #{(page-1)*6 + index + 1}</p>
                  {/* Status badge with more nuanced colors */}
                  {(() => {
                    let badgeText = booking.status;
                    let badgeClasses = 'px-3 py-1 text-xs rounded-full ';
                    if (booking.status === 'confirmed') {
                      badgeClasses += 'bg-green-400/15 text-green-600';
                    } else if (booking.status === 'cancelled') {
                      badgeClasses += 'bg-red-400/15 text-red-600';
                    } else {
                      // pending
                      if (booking.paymentStatus === 'paid') {
                        badgeText = 'awaiting-approval';
                        badgeClasses += 'bg-amber-400/15 text-amber-600';
                      } else {
                        badgeClasses += 'bg-gray-400/15 text-gray-600';
                      }
                    }
                    return <p className={badgeClasses}>{highlight(badgeText, debouncedSearch)}</p>;
                  })()}
                </div>
                {editId === booking._id ? (
                  <div className='mt-3 flex flex-col gap-2'>
                    <label>
                      Pickup Date:
                      <input
                        type='date'
                        name='pickupDate'
                        value={editData.pickupDate}
                        onChange={handleEditChange}
                        className='ml-2 border rounded px-2 py-1'
                      />
                    </label>
                    <label>
                      Return Date:
                      <input
                        type='date'
                        name='returnDate'
                        value={editData.returnDate}
                        onChange={handleEditChange}
                        className='ml-2 border rounded px-2 py-1'
                      />
                    </label>
                    <div className='flex gap-2 mt-2'>
                      <button onClick={() => handleEditSave(booking._id)} className='px-3 py-1 bg-green-500 text-white rounded'>Save</button>
                      <button onClick={handleEditCancel} className='px-3 py-1 bg-gray-300 rounded'>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className='flex items-start gap-2 mt-3'>
                      <img src={assets.calendar_icon_colored} alt="" className='w-4 h-4 mt-1'/>
                      <div>
                        <p className='text-gray-500'>Rental Period</p>
                        <p>{booking.pickupDate.split('T')[0]} to {booking.returnDate.split('T')[0]}</p>
                      </div>
                    </div>
                    <div className='flex items-start gap-2 mt-3'>
                      <img src={assets.location_icon} alt="" className='w-4 h-4 mt-1'/>
                      <div>
                        <p className='text-gray-500'>Pick-up Location</p>
                        <p>{booking?.instrument?.location || ''}</p>
                      </div>
                    </div>
                  </>
                )}
                {booking.paymentStatus !== 'paid' && booking.status !== 'cancelled' && (
                  <div className='flex gap-2 mt-4'>
                    <button onClick={(e) => { e.stopPropagation(); handleEditClick(booking) }} className='px-3 py-1 bg-pink-500 hover:bg-pink-600 text-white rounded transition-colors disabled:opacity-40' disabled={booking.status==='cancelled'}>Edit</button>
                    <button onClick={(e) => { e.stopPropagation(); handleCancel(booking._id) }} className='px-3 py-1 bg-red-500 text-white rounded'>Cancel</button>
                  </div>
                )}
                {booking.status === 'cancelled' && booking.cancelledAt && (
                  <p className='mt-4 text-xs italic text-red-600'>This booking was cancelled on {new Date(booking.cancelledAt).toLocaleDateString()}</p>
                )}
              </div>
              {/* Price */}
              <div className='md:col-span-1 flex flex-col justify-between gap-6'>
                <div className='text-sm text-gray-500 text-right space-y-1'>
                  <p>Total Price</p>
                  <h1 className='text-2xl font-semibold' style={{ color: 'var(--color-primary)' }}>{currency}{booking.price}</h1>
                  <p>Booked on {booking.createdAt.split('T')[0]}</p>
                  {booking.lateFee > 0 && (
                    <div className='mt-1 text-xs'>
                      <span className='inline-block bg-amber-50 text-amber-700 px-2 py-0.5 rounded'>
                        Late Fee: {currency}{booking.lateFee} {booking.lateFeePaid ? '(paid)' : '(unpaid)'}
                      </span>
                    </div>
                  )}
                  {booking.paymentStatus === 'paid' && (
                    <div className='mt-2 text-xs text-green-600 space-y-0.5'>
                      <p className='font-medium'>Payment: Paid</p>
                      {booking.status !== 'confirmed' && (
                        <p className='text-amber-600'>Awaiting owner approval</p>
                      )}
                      {booking.commission != null && (
                        <p className='text-gray-500'>Commission: {currency}{booking.commission}</p>
                      )}
                      {booking.ownerPayout != null && (
                        <p className='text-gray-500'>Owner Payout: {currency}{booking.ownerPayout}</p>
                      )}
                      <div className='pt-2 flex gap-2 justify-end'>
                        <button
                          onClick={(e)=>openReceipt(e, booking._id)}
                          className='px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded'
                          title='View payment receipt'
                        >View Receipt</button>
                        {/* Download will be available inside modal once payment is fetched */}
                      </div>
                    </div>
                  )}
                </div>
                {/* Show Pay Now if not paid, else show Cancel if paid and not confirmed */}
                {booking.status === 'cancelled' ? null : booking.paymentStatus !== 'paid' ? (
                  <div className='mt-4'>
                    <button
          onClick={(e) => { e.stopPropagation(); handlePayNow(booking._id) }}
                      className='w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg mt-2'
                    >
                      Pay Now
                    </button>
                  </div>
                ) : booking.status !== 'confirmed' ? (
                  <div className='mt-4'>
                    <button
          onClick={(e) => { e.stopPropagation(); handleCancel(booking._id) }}
                      className='w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg mt-2'
                    >
                      Cancel Booking
                    </button>
                  </div>
                ) : null}
                {/* Late fee payment CTA if applicable */}
                {booking.lateFee > 0 && !booking.lateFeePaid && (
                  <div className='mt-2'>
                    <button
                      onClick={(e)=>handlePayLateFee(e, booking._id)}
                      className='w-full bg-amber-600 hover:bg-amber-700 text-white py-2 rounded-lg'
                      title={`Late by ${booking.lateDays} day(s). Pay late fee.`}
                    >
                      Pay Late Fee ({currency}{booking.lateFee})
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {totalPages > 1 && (
          <div className='flex flex-wrap gap-2 mt-10 justify-center'>
            <button disabled={page===1} onClick={()=>setPage(p=>Math.max(1,p-1))} className={`px-3 py-1 rounded border text-sm ${page===1?'opacity-40 cursor-not-allowed':'hover:bg-pink-50'}`}>Prev</button>
            {Array.from({length: totalPages}, (_,i)=>i+1).filter(p=> p===1 || p===totalPages || (p>=page-2 && p<=page+2)).map(p=> (
              <button key={p} onClick={()=>setPage(p)} className={`px-3 py-1 rounded border text-sm ${p===page? 'bg-pink-500 text-white border-pink-500':'hover:bg-pink-50'}`}>{p}</button>
            ))}
            <button disabled={page===totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className={`px-3 py-1 rounded border text-sm ${page===totalPages?'opacity-40 cursor-not-allowed':'hover:bg-pink-50'}`}>Next</button>
          </div>
        )}
      </div>
      {showModal && selectedBooking && (
        <div className='fixed inset-0 z-50 flex items-center justify-center'>
          <div className='absolute inset-0 bg-black/40 backdrop-blur-sm' onClick={closeModal}></div>
          <div className='relative bg-white max-w-2xl w-full mx-4 rounded-lg shadow-xl p-6 animate-fadeIn border' style={{ borderColor: 'var(--color-borderColor)' }}>
            <button onClick={closeModal} className='absolute top-3 right-3 text-gray-500 hover:text-gray-700' aria-label='Close'>✕</button>
            <div className='flex flex-col md:flex-row gap-6'>
              <div className='md:w-1/2'>
                <div className='rounded-md overflow-hidden'>
                  <img src={selectedBooking?.instrument?.image || ''} alt='' className='w-full h-auto object-cover aspect-video' />
                </div>
                <Link
                  to={`/instrument-details/${selectedBooking?.instrument?._id}`}
                  onClick={closeModal}
                  className='mt-3 inline-block text-sm text-pink-600 hover:underline'
                >View Instrument Details →</Link>
              </div>
              <div className='flex-1 space-y-4 text-sm'>
                <div>
                  <h2 className='text-xl font-semibold'>{selectedBooking?.instrument?.brand} {selectedBooking?.instrument?.model}</h2>
                  <p className='text-gray-500'>{selectedBooking?.instrument?.category} • {selectedBooking?.instrument?.location}</p>
                </div>
                <div className='grid grid-cols-2 gap-4'>
                  <Info label='Pickup Date' value={selectedBooking.pickupDate.split('T')[0]} />
                  <Info label='Return Date' value={selectedBooking.returnDate.split('T')[0]} />
                  <Info label='Status' value={selectedBooking.status} />
                  <Info label='Payment' value={selectedBooking.paymentStatus} />
                  <Info label='Price' value={`${currency}${selectedBooking.price}`} />
                  <Info label='Booked On' value={selectedBooking.createdAt.split('T')[0]} />
                  {selectedBooking.commission != null && <Info label='Commission' value={`${currency}${selectedBooking.commission}`} />}
                  {selectedBooking.ownerPayout != null && <Info label='Owner Payout' value={`${currency}${selectedBooking.ownerPayout}`} />}
                </div>
                {selectedBooking.paymentStatus !== 'paid' && (
                  <button
                    onClick={() => { closeModal(); handlePayNow(selectedBooking._id); }}
                    className='mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded'
                  >Pay Now</button>
                )}
                {selectedBooking.paymentStatus === 'paid' && (
                  <div className='flex gap-2 mt-2'>
                    <button
                      onClick={() => { closeModal(); openReceipt(null, selectedBooking._id); }}
                      className='bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded'
                    >View Receipt</button>
                    {selectedBooking.lateFee > 0 && !selectedBooking.lateFeePaid && (
                      <button
                        onClick={() => { closeModal(); handlePayLateFee(null, selectedBooking._id); }}
                        className='bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded'
                      >Pay Late Fee ({currency}{selectedBooking.lateFee})</button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <ReceiptModal open={receiptModalOpen} onClose={closeReceipt} loading={receiptLoading} payment={paymentForReceipt} currency={currency} axios={axios} />
      <BillingInfoModal open={billingOpen} onClose={() => { setBillingOpen(false); setPendingPayment(null); }} onSubmit={submitBillingAndPay} />
    </div>
  )
}

function highlight(text, q){
  if(!q) return text
  try {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(${escaped})`, 'ig')
    const parts = String(text).split(regex)
    return parts.map((part, i) => i % 2 === 1 ? <mark key={i} className='bg-yellow-200 px-0.5 rounded'>{part}</mark> : part)
  } catch { return text }
}

export default MyBookings

// Small info display component inside modal
function Info({ label, value }) {
  return (
    <div>
      <p className='text-gray-500 text-xs uppercase tracking-wide'>{label}</p>
      <p className='font-medium mt-0.5 break-words'>{value}</p>
    </div>
  )
}

// Receipt Modal
function ReceiptModal({ open, onClose, loading, payment, currency, axios }) {
  if (!open) return null
  const [downloading, setDownloading] = React.useState(false)
  const amount = payment?.displayAmount ?? Math.round((payment?.amount || 0) / 100)
  const booking = payment?.booking
  const instrument = booking?.instrument
  const status = payment?.status
  const paidAt = payment?.paidAt ? new Date(payment.paidAt).toLocaleString() : null
  const createdAt = payment?.createdAt ? new Date(payment.createdAt).toLocaleString() : null
  const handleDownload = async () => {
    if (!payment?._id) return
    try {
      setDownloading(true)
      const res = await axios.get(`/api/payments/receipt/${payment._id}`,{ responseType: 'blob' })
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `receipt_${payment._id}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      toast.error('Failed to download receipt')
    } finally {
      setDownloading(false)
    }
  }
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center'>
      <div className='absolute inset-0 bg-black/40 backdrop-blur-sm' onClick={onClose}></div>
      <div className='relative bg-white max-w-lg w-full mx-4 rounded-lg shadow-xl p-6 animate-fadeIn border' style={{ borderColor: 'var(--color-borderColor)' }}>
        <button onClick={onClose} className='absolute top-3 right-3 text-gray-500 hover:text-gray-700' aria-label='Close'>✕</button>
        <h3 className='text-xl font-semibold mb-1'>Payment Receipt</h3>
        {loading ? (
          <p className='text-gray-500'>Loading…</p>
        ) : payment ? (
          <div className='text-sm space-y-2'>
            <div>
              <p className='text-gray-500'>Payment ID</p>
              <p className='font-medium break-all'>{payment._id}</p>
            </div>
            {booking && (
              <div className='grid grid-cols-2 gap-3'>
                <Info label='Booking ID' value={booking._id} />
                <Info label='Status' value={status} />
                <Info label='Amount' value={`${currency}${amount}`} />
                {paidAt && <Info label='Paid At' value={paidAt} />}
                {createdAt && <Info label='Created' value={createdAt} />}
              </div>
            )}
            {instrument && (
              <div className='mt-2'>
                <p className='text-gray-500 text-xs uppercase tracking-wide'>Instrument</p>
                <p className='font-medium'>{instrument.brand} {instrument.model}</p>
                {instrument.location && <p className='text-gray-500'>Location: {instrument.location}</p>}
              </div>
            )}
            <div className='pt-3 flex gap-2'>
              {payment?._id && (
                <button onClick={handleDownload} className='bg-gray-800 hover:bg-black text-white px-4 py-2 rounded disabled:opacity-60' disabled={downloading}>
                  {downloading ? 'Downloading…' : 'Download PDF'}
                </button>
              )}
              <button onClick={onClose} className='px-4 py-2 rounded border'>Close</button>
            </div>
          </div>
        ) : (
          <p className='text-red-600'>Receipt not available.</p>
        )}
      </div>
    </div>
  )
}