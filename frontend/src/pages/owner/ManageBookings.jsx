import React, { useEffect, useState } from 'react'
import Title from '../../components/owner/Title'
import { useAppContext } from '../../context/AppContext'
import toast from 'react-hot-toast'

const ManageBookings = () => {
  const {axios, currency, user} = useAppContext()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [scope, setScope] = useState('mine') // 'mine' or 'all' (admin only)

  const fetchOwnerBookings = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.append('page', page)
      params.append('limit', 10)
      if (debouncedSearch) params.append('q', debouncedSearch)
      if (user?.role === 'admin') {
        params.append('scope', scope === 'all' ? 'all' : 'mine')
      }
      const {data} = await axios.get(`/api/bookings/owner?${params.toString()}`)
      if (data.success) {
        // Client-side guard: filter to ensure bookings belong to owner (unless admin scope)
        let list = data.bookings || []
        // Server now applies scope; additional client guard (non-admin should never see others)
        if (user?.role !== 'admin') {
          list = list.filter(b => String(b.owner || b.instrument?.owner) === String(user?._id))
        } else if (scope === 'mine') {
          list = list.filter(b => String(b.owner || b.instrument?.owner) === String(user?._id))
        }
        setBookings(list)
        if (data.totalPages) setTotalPages(data.totalPages)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      console.error('Fetch bookings error:', error)
      toast.error(error.response?.data?.message || error.message || 'Failed to fetch bookings')
    } finally {
      setLoading(false)
    }
  }

  const changeBookingStatus = async (bookingId, status) => {
    try {
      const {data} = await axios.post('/api/bookings/change-status', {
        bookingId, 
        status
      })
      
      if(data.success){
        toast.success(data.message)
        fetchOwnerBookings()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      console.error('Status change error:', error)
      toast.error(error.response?.data?.message || error.message || 'Failed to update booking status')
    }
  }

  const markPickup = async (bookingId) => {
    try {
      const { data } = await axios.post('/api/bookings/mark-pickup', { bookingId })
      if (data.success) {
        toast.success('Pickup marked')
        fetchOwnerBookings()
      } else {
        toast.error(data.message)
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to mark pickup')
    }
  }

  const markReturn = async (bookingId) => {
    try {
      const { data } = await axios.post('/api/bookings/mark-return', { bookingId })
      if (data.success) {
        toast.success('Return marked')
        fetchOwnerBookings()
      } else {
        toast.error(data.message)
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to mark return')
    }
  }

  // Safe date formatter
  const formatDate = (dateString) => {
    try {
      return dateString ? new Date(dateString).toLocaleDateString() : 'N/A'
    } catch (error) {
      return 'Invalid Date'
    }
  }

  useEffect(() => {
    fetchOwnerBookings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, scope])

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400)
    return () => clearTimeout(t)
  }, [search])

  return (
    <div className='px-4 pt-10 md:px-10 w-full'>
      <div className='flex items-start justify-between flex-wrap gap-4'>
        <div>
          <Title 
            title="Manage Bookings" 
            subTitle="Track customer bookings, approve or cancel requests, and manage booking lifecycle." 
          />
          <div className='mt-3 flex items-center gap-2'>
            <span className='inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border bg-white shadow-sm'>
              Viewing: {user?.role === 'admin' ? (scope === 'all' ? 'All Owners' : 'Your Listings') : 'Your Listings'}
            </span>
            {user?.role === 'admin' && scope === 'all' && (
              <span className='text-[10px] text-gray-500'>Toggle to limit view to only instruments you own.</span>
            )}
          </div>
        </div>
        {user?.role === 'admin' && (
          <div className='flex items-center gap-2 bg-white border border-borderColor rounded-md p-1 text-xs shadow-sm'>
            <button
              onClick={()=>{ setScope('mine'); setPage(1); }}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${scope==='mine' ? 'bg-primary text-white' : 'hover:bg-primary/10'}`}
            >Your Listings</button>
            <button
              onClick={()=>{ setScope('all'); setPage(1); }}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${scope==='all' ? 'bg-primary text-white' : 'hover:bg-primary/10'}`}
            >All Owners</button>
          </div>
        )}
      </div>
      
      <div className='flex items-center gap-3 mt-6 max-w-3xl'>
        <input 
          type='text'
          value={search}
          onChange={e=>{ setSearch(e.target.value); setPage(1); }}
          placeholder='Search by instrument, location, status...'
          className='flex-1 border border-borderColor rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary'
        />
        {debouncedSearch && (
          <button onClick={()=>{ setSearch(''); setDebouncedSearch(''); setPage(1); }} className='text-xs text-gray-500 hover:text-gray-700'>Clear</button>
        )}
      </div>

      <div className='max-w-3xl w-full rounded-md overflow-hidden border border-borderColor mt-4'>
        <table className='w-full border-collapse text-left text-sm text-primary-dull'>
          <thead className='text-primary-dull'>
            <tr>
              <th className='p-3 font-medium'>Instrument</th>
              <th className='p-3 font-medium max-md:hidden'>Date Range</th>
              <th className='p-3 font-medium'>Total</th>
              <th className='p-3 font-medium max-md:hidden'>Payment</th>
              <th className='p-3 font-medium'>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-gray-500">
                  Loading bookings...
                </td>
              </tr>
            ) : bookings.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-gray-500">
                  No bookings found
                </td>
              </tr>
            ) : (
              bookings.map((booking, index) => (
                <tr key={booking._id || index} className='border-t border-borderColor text-primary-dull'>
                  <td className='p-3 flex items-center gap-3'>
                    <img 
                      src={booking.instrument?.image || '/default-instrument.png'} 
                      alt={`${booking.instrument?.brand || 'Unknown'} ${booking.instrument?.model || 'Instrument'}`}
                      className='h-12 w-12 aspect-square rounded-md object-cover'
                      onError={(e) => {
                        e.target.src = '/default-instrument.png'
                      }}
                    />
                    <p className='font-medium max-md:hidden'>
                      {booking.instrument?.brand || 'Unknown'} {booking.instrument?.model || 'Instrument'}
                    </p>
                  </td>
                  
                  <td className='p-3 max-md:hidden'>
                    {formatDate(booking.pickupDate)} to {formatDate(booking.returnDate)}
                  </td>

                  <td className='p-3'>
                    {currency}{booking.price || 0}
                  </td>

                  <td className='p-3 max-md:hidden'>
                    {(() => {
                      let label = 'Unpaid';
                      let cls = 'bg-red-100 text-red-600';
                      if (booking.paymentStatus === 'paid') {
                        if (booking.status === 'confirmed') {
                          label = 'Paid';
                          cls = 'bg-green-100 text-green-600';
                        } else {
                          label = 'Awaiting Approval';
                          cls = 'bg-amber-100 text-amber-600';
                        }
                      }
                      return <span className={`px-3 py-1 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
                    })()}
                  </td>

                  <td className='p-3'>
                    {booking.status === 'pending' ? (
                      <select
                        onChange={(e) => changeBookingStatus(booking._id, e.target.value)}
                        value={booking.status}
                        className='px-2 py-1.5 mt-1 text-primary-dull border border-borderColor rounded-md outline-none focus:ring-2 focus:ring-primary focus:border-primary'
                      >
                        <option value="pending">Pending</option>
                        {/* Disable confirm if unpaid */}
                        <option value="confirmed" disabled={booking.paymentStatus !== 'paid'}>
                          Confirmed {booking.paymentStatus !== 'paid' ? '(pay first)' : ''}
                        </option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    ) : (
                      <div className='flex flex-col gap-1'>
                        <span 
                          className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                            booking.status === 'confirmed' 
                              ? 'bg-green-100 text-green-600' 
                              : booking.status === 'cancelled'
                              ? 'bg-red-100 text-red-600'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {booking.status}
                        </span>
                        {booking.status === 'cancelled' && booking.cancelledAt && (
                          <span className='text-[10px] text-red-500 italic'>Cancelled {new Date(booking.cancelledAt).toLocaleDateString()}</span>
                        )}
                        {/* Operational buttons */}
                        {booking.status === 'confirmed' && booking.paymentStatus === 'paid' && !booking.pickupConfirmedAt && (
                          <button
                            onClick={()=>markPickup(booking._id)}
                            className='text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700'
                          >Mark Picked Up</button>
                        )}
                        {booking.pickupConfirmedAt && !booking.returnConfirmedAt && (
                          <button
                            onClick={()=>markReturn(booking._id)}
                            className='text-xs px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700'
                          >Mark Returned</button>
                        )}
                        {booking.pickupConfirmedAt && (
                          <span className='text-[10px] text-gray-500'>Picked up {new Date(booking.pickupConfirmedAt).toLocaleDateString()}</span>
                        )}
                        {booking.returnConfirmedAt && (
                          <span className='text-[10px] text-gray-500'>Returned {new Date(booking.returnConfirmedAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className='flex gap-2 mt-6 flex-wrap'>
          <button
            disabled={page===1}
            onClick={()=>setPage(p=>Math.max(1,p-1))}
            className={`px-3 py-1 rounded border text-xs ${page===1?'opacity-40 cursor-not-allowed':'hover:bg-primary/5'}`}
          >Prev</button>
          {Array.from({length: totalPages},(_,i)=>i+1).filter(p=> p===1 || p===totalPages || (p>=page-2 && p<=page+2)).map(p => (
            <button
              key={p}
              onClick={()=>setPage(p)}
              className={`px-3 py-1 rounded border text-xs ${p===page? 'bg-primary text-white border-primary':'hover:bg-primary/5'}`}
            >{p}</button>
          ))}
          <button
            disabled={page===totalPages}
            onClick={()=>setPage(p=>Math.min(totalPages,p+1))}
            className={`px-3 py-1 rounded border text-xs ${page===totalPages?'opacity-40 cursor-not-allowed':'hover:bg-primary/5'}`}
          >Next</button>
        </div>
      )}
    </div>
  )
}

export default ManageBookings