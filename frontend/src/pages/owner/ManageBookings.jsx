import React, { useEffect, useState } from 'react'
import Title from '../../components/owner/Title'
import { useAppContext } from '../../context/AppContext'
import toast from 'react-hot-toast'

const ManageBookings = () => {
  const {axios, currency} = useAppContext()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchOwnerBookings = async () => {
    try {
      setLoading(true)
      const {data} = await axios.get('/api/bookings/owner')
      if (data.success) {
        setBookings(data.bookings)
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
  }, [])

  return (
    <div className='px-4 pt-10 md:px-10 w-full'>
      <Title 
        title="Manage Bookings" 
        subTitle="Track all customer bookings, approve or cancel requests, and manage bookings statuses." 
      />
      
      <div className='max-w-3xl w-full rounded-md overflow-hidden border border-borderColor mt-6'>
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
                    <span className='bg-light px-3 py-1 rounded-full text-xs'>
                      Offline
                    </span>
                  </td>

                  <td className='p-3'>
                    {booking.status === 'pending' ? (
                      <select 
                        onChange={(e) => changeBookingStatus(booking._id, e.target.value)} 
                        value={booking.status} 
                        className='px-2 py-1.5 mt-1 text-primary-dull border border-borderColor rounded-md outline-none focus:ring-2 focus:ring-primary focus:border-primary'
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
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
    </div>
  )
}

export default ManageBookings