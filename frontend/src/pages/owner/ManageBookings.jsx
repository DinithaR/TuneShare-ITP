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
  const [scope, setScope] = useState('owner') // 'owner' | 'all' (admin only)

  const fetchOwnerBookings = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.append('page', page)
      params.append('limit', 10)
      if (debouncedSearch) params.append('q', debouncedSearch)
      if (user?.role === 'admin') params.append('scope', scope)
      const {data} = await axios.get(`/api/bookings/owner?${params.toString()}`)
      if (data.success) {
        let list = data.bookings || []
        // Defensive guard: ensure only this owner's bookings (API already scopes, but keep UI safe)
        if (user?.role !== 'admin' || scope === 'owner') {
            const uid = String(user?._id)
            const filtered = list.filter(b => String(b.owner || b.instrument?.owner) === uid)
            if (filtered.length !== list.length) {
              console.warn('Filtered out bookings not owned by this user in UI safeguard')
            }
            list = filtered
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
      <div className='flex flex-col md:flex-row md:items-start md:justify-between gap-4'>
        <Title 
          title="Manage Bookings" 
          subTitle="Track all customer bookings, approve or cancel requests, and manage bookings statuses." 
        />
        <div className='flex flex-col items-start gap-2 md:items-end'>
          <div className='flex items-center gap-2'>
            <span
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border
                ${ (user?.role === 'admin' && scope === 'all')
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-violet-50 text-violet-700 border-violet-200'}`}
              title={user?.role === 'admin' && scope === 'all' ? 'Showing bookings for all owners' : 'Showing only your listings'}
            >
              {user?.role === 'admin' && scope === 'all' ? 'Viewing: All Owners' : 'Viewing: Your Listings'}
            </span>
          </div>
          {user?.role === 'admin' && (
            <div className='flex items-center gap-1 bg-gray-100 rounded-md p-1 text-xs font-medium border border-gray-200'>
              <button
                type='button'
                onClick={() => { setScope('owner'); setPage(1); }}
                className={`px-3 py-1 rounded-md transition-colors ${scope==='owner' ? 'bg-white shadow border border-gray-300' : 'hover:text-gray-700 text-gray-500'}`}
              >Your Listings</button>
              <button
                type='button'
                onClick={() => { setScope('all'); setPage(1); }}
                className={`px-3 py-1 rounded-md transition-colors ${scope==='all' ? 'bg-white shadow border border-gray-300' : 'hover:text-gray-700 text-gray-500'}`}
              >All Owners</button>
            </div>
          )}
        </div>
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
