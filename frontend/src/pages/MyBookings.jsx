import React, { useEffect, useState } from 'react'
import { assets } from '../assets/assets'
import Title from '../components/Title'
import { useAppContext } from '../context/AppContext'
import toast from 'react-hot-toast'

const MyBookings = () => {
  const [bookings, setBookings] = useState([])
  const [editId, setEditId] = useState(null)
  const [editData, setEditData] = useState({ pickupDate: '', returnDate: '' })
  const currency = import.meta.env.VITE_CURRENCY
  const { axios } = useAppContext()

  const fetchMyBookings = async () => {
    try {
      const { data } = await axios.get('/api/bookings/user');
      if (data.success) {
        setBookings(data.bookings);
      } else {
        setBookings([]);
      }
    } catch (error) {
      setBookings([]);
    }
  };

  useEffect(() => {
    fetchMyBookings();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this booking?')) return;
    try {
      const { data } = await axios.delete(`/api/bookings/user/${id}`);
      if (data.success) {
        toast.success('Booking deleted');
        setBookings(bookings.filter(b => b._id !== id));
      } else {
                    <img src={booking?.instrument?.image || ''} alt={booking?.instrument?.name || 'Instrument'} className='w-full h-auto aspect-video object-cover'/>
      }
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  const handleEditClick = (booking) => {
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

  return (
    <div className='px-6 md:px-16 lg:px-32 2xl:px-48 mt-16 text-sm max-w-7xl'>
      <Title title='My Booking' subtitle='View and manage your all bookings' align='left' />
      <div>
        {bookings.length === 0 ? (
          <div className="text-center text-gray-500 py-20 text-lg">You have no bookings yet.</div>
        ) : (
          bookings.map((booking, index) => (
            <div key={booking._id} className='grid grid-cols-1 md:grid-cols-4 gap-6 p-6 border rounded-lg mt-5 first:mt-12' style={{ borderColor: 'var(--color-borderColor)' }}>
              {/* Instrument Image + info */}
              <div className='md:col-span-1'>
                <div className='rounded-md overflow-hidden mb-3'>
                  <img src={booking?.instrument?.image || ''} alt={booking?.instrument?.name || 'Instrument'} className='w-full h-auto aspect-video object-cover'/>
                </div>
                <p className='text-lg font-medium mt-2'>{booking?.instrument?.brand || ''} {booking?.instrument?.model || ''}</p>
                <p className='text-gray-500'>{booking?.instrument?.category || ''} • {booking?.instrument?.location || ''}</p>
              </div>
              {/* Booking Info */}
              <div className='md:col-span-2'>
                <div className='flex items-center gap-2'>
                  <p className='px-3 py-1.5 rounded' style={{ backgroundColor: 'var(--color-light)' }}>Booking #{index+1}</p>
                  <p className={`px-3 py-1 text-xs rounded-full ${booking.status === 'confirmed' ? 'bg-green-400/15 text-green-600' : 'bg-red-400/15 text-red-600'}`}>{booking.status}</p>
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
                <div className='flex gap-2 mt-4'>
                  <button onClick={() => handleEditClick(booking)} className='px-3 py-1 bg-pink-500 hover:bg-pink-600 text-white rounded transition-colors'>Edit</button>
                  <button onClick={() => handleDelete(booking._id)} className='px-3 py-1 bg-red-500 text-white rounded'>Delete</button>
                </div>
              </div>
              {/* Price */}
              <div className='md:col-span-1 flex flex-col justify-between gap-6'>
                <div className='text-sm text-gray-500 text-right'>
                  <p>Total Price</p>
                  <h1 className='text-2xl font-semibold' style={{ color: 'var(--color-primary)' }}>{currency}{booking.price}</h1>
                  <p>Booked on {booking.createdAt.split('T')[0]}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default MyBookings