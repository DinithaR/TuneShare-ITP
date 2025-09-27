import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { assets } from '../assets/assets'
import Loader from '../components/Loader'
import { useAppContext } from '../context/AppContext'
import toast from 'react-hot-toast'
// import PaymentForm from '../components/PaymentForm'

const InstrumentDetails = () => {
  
  const {id} = useParams()
  const {instruments, axios, pickupDate, setPickupDate, returnDate, setReturnDate, user, fetchRatingsSummary} = useAppContext()
  const navigate = useNavigate()
  const [instrument, setInstrument] = useState(null)
  const [reviews, setReviews] = useState([])
  const [avgRating, setAvgRating] = useState(0)
  const [reviewCount, setReviewCount] = useState(0)
  const [myRating, setMyRating] = useState(0)
  const [myComment, setMyComment] = useState('')
  const [loadingReviews, setLoadingReviews] = useState(true)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  // const [clientSecret, setClientSecret] = useState(null)
  // const [bookingId, setBookingId] = useState(null)
  const currency = import.meta.env.VITE_CURRENCY

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!instrument?.isAvailable) {
      toast.error('Instrument currently unavailable');
      return;
    }
    
    // Add validation before sending request
    if (!pickupDate || !returnDate) {
      toast.error('Please select both pickup and return dates');
      return;
    }
    
    if (new Date(returnDate) <= new Date(pickupDate)) {
      toast.error('Return date must be after pickup date');
      return;
    }

    console.log('Sending booking request with:', {
      instrument: id,
      pickupDate,
      returnDate
    });

    try {
      const {data} = await axios.post('/api/bookings/create', {
        instrument: id, 
        pickupDate, 
        returnDate
      });
      if(data.success && data.booking) {
        toast.success('Booking created!')
        navigate('/my-bookings')
      } else if(data.success) {
        toast.success(data.message)
        navigate('/my-bookings')
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      console.error('Full error object:', error);
      console.error('Error response:', error.response);
      console.error('Error data:', error.response?.data);
      
      const errorMessage = error.response?.data?.message || error.message || 'Booking failed';
      toast.error(errorMessage);
    }
  }

  useEffect(() => {
    const foundInstrument = instruments.find(instrument => instrument._id === id)
    if (foundInstrument) {
      setInstrument(foundInstrument)
      // Also fetch populated owner details to ensure up-to-date owner info
      axios.get(`/api/user/instruments/${id}`).then(({data})=>{
        if (data.success && data.instrument) setInstrument(data.instrument)
      }).catch(()=>{})
    } else if (instruments.length > 0) {
      // If instruments are loaded but instrument not found, attempt direct fetch
      axios.get(`/api/user/instruments/${id}`).then(({data})=>{
        if (data.success && data.instrument) setInstrument(data.instrument)
        else {
          toast.error('Instrument not found')
          navigate('/instruments')
        }
      }).catch(()=>{
        toast.error('Instrument not found')
        navigate('/instruments')
      })
    }
  }, [instruments, id, navigate])

  // Prepare images list for gallery (supports multiple images)
  const imageList = useMemo(() => {
    if (!instrument) return []
    if (instrument.images && instrument.images.length > 0) return instrument.images
    if (instrument.image) return [instrument.image]
    return [assets.hero_img]
  }, [instrument])

  // Reset active image when instrument changes
  useEffect(() => {
    setActiveImageIndex(0)
  }, [instrument?._id])

  // Fetch reviews
  useEffect(() => {
    const load = async () => {
      try {
        setLoadingReviews(true)
        const { data } = await axios.get(`/api/reviews/instrument/${id}`)
        if (data.success) {
          setReviews(data.reviews)
          setAvgRating(data.stats.avgRating || 0)
          setReviewCount(data.stats.count || 0)
        }
        // load my review if logged in
        if (user) {
          const my = await axios.get(`/api/reviews/instrument/${id}/me`)
          if (my.data.success && my.data.review) {
            setMyRating(my.data.review.rating)
            setMyComment(my.data.review.comment || '')
          }
        }
      } catch (e) {
        // ignore
      } finally {
        setLoadingReviews(false)
      }
    }
    if (id) load()
  }, [id, user])

  const handleReviewSubmit = async (e) => {
    e.preventDefault()
    if (!myRating) return toast.error('Please select a rating')
    try {
      const { data } = await axios.post('/api/reviews/upsert', {
        instrumentId: id,
        rating: Number(myRating),
        comment: myComment
      })
      if (data.success) {
        toast.success('Review saved')
        // refresh lists
        setAvgRating(data.stats.avgRating || 0)
        setReviewCount(data.stats.count || 0)
        // Refresh global ratings so cards update
        fetchRatingsSummary?.()
        // Update or insert my review into list
        setReviews((prev) => {
          const rest = prev.filter(r => r.user?._id !== user?._id)
          return [data.review, ...rest]
        })
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    }
  }
  
  return instrument ? (
    <div className='px-6 md:px-16 lg:px-24 xl:px-32 mt-16'>
      <button onClick={() => navigate(-1)} className='flex items-center gap-2 mb-6 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer'>
        <img src={assets.arrow_icon} alt="" className='rotate-180 opacity-65 w-4 h-4' />
        Go Back
      </button>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12'>
        
        {/* Left: Instrument Images & Details */}
        <div className='lg:col-span-2'>
          {/* Main Image */}
          <img
            src={imageList[activeImageIndex]}
            alt={`${instrument.brand || ''} ${instrument.model || ''}`}
            className='w-full h-auto max-h-96 object-cover rounded-xl mb-3 shadow-md'
          />
          {/* Thumbnails */}
          {imageList.length > 1 && (
            <div className='grid grid-cols-5 gap-2 mb-6'>
              {imageList.map((url, idx) => (
                <button
                  key={idx}
                  type='button'
                  onClick={() => setActiveImageIndex(idx)}
                  className={`border rounded-lg overflow-hidden focus:outline-none ${idx === activeImageIndex ? 'ring-2 ring-primary border-primary' : 'border-borderColor'}`}
                >
                  <img src={url} alt={`thumb-${idx}`} className='w-full h-16 object-cover' />
                </button>
              ))}
            </div>
          )}
          <div className='space-y-6'>
            <div>
              <div className='flex items-center flex-wrap gap-3'>
                <h1 className='text-3xl font-bold text-gray-800'>
                  {instrument.brand || ''} {instrument.model || instrument.name || 'Instrument'}
                </h1>
                {user && instrument.owner === user._id && (
                  <span className='text-xs bg-amber-500/90 text-white px-2.5 py-1 rounded-full shadow-sm'>Your Listing</span>
                )}
              </div>
              <div className='flex items-center gap-3 mt-2 flex-wrap'>
                <p className='text-gray-500 text-lg'>{instrument.category || 'Musical Instrument'}</p>
                {reviewCount > 0 && (
                  <span className='text-sm bg-yellow-100 text-yellow-700 px-2 py-1 rounded-md'>
                    ⭐ {avgRating.toFixed(1)} ({reviewCount})
                  </span>
                )}
                {instrument?.owner && (
                  <span className='text-sm bg-blue-50 text-blue-700 px-2 py-1 rounded-md'>
                    Owner: {instrument.owner.name || 'Unknown'}
                  </span>
                )}
              </div>
              {instrument?.owner && (
                <div className='mt-1 text-sm text-gray-600'>
                  <span className='mr-2'>Contact:</span>
                  <a href={`mailto:${instrument.owner.email}`} className='text-blue-600 underline'>
                    {instrument.owner.email}
                  </a>
                </div>
              )}
            </div>
            <hr className='border-borderColor my-6'/>

            <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4'>
              {[
                {icon: assets.location_icon, text: instrument.location || 'Location not specified'}
              ].map(({icon, text}) => (
                <div key={text} className='flex flex-col items-center bg-light p-4 rounded-lg border border-borderColor'>
                  <img src={icon} alt="" className='h-5 w-5 mb-2 opacity-70'/>
                  <span className='text-sm text-gray-600 text-center'>{text}</span>
                </div>
              ))}
            </div>

            {/* Description */}
            {instrument.description && (
              <div>
                <h2 className='text-xl font-medium mb-3 text-gray-800'>Description</h2>
                <p className='text-gray-600 leading-relaxed'>{instrument.description}</p>
              </div>
            )}

            {/* Features */}
            {instrument.features && instrument.features.length > 0 && (
              <div>
                <h2 className='text-xl font-medium mb-3 text-gray-800'>Features</h2>
                <ul className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                  {
                    instrument.features.map((feature, index) => (
                      <li key={index} className='flex items-center text-gray-600'>
                        <img src={assets.check_icon} className='h-4 w-4 mr-3 opacity-70' alt="" />
                        <span>{feature}</span>
                      </li>
                    ))
                  }
                </ul>
              </div>
            )}

          </div>

          {/* Reviews Section */}
          <div className='mt-8'>
            <h2 className='text-xl font-semibold mb-4 text-gray-800'>Ratings & Reviews</h2>
            {user ? (
              <form onSubmit={handleReviewSubmit} className='mb-6 p-4 border border-borderColor rounded-lg'>
                <div className='flex items-center gap-3 mb-3'>
                  <label className='text-sm text-gray-700'>Your rating:</label>
                  <select value={myRating} onChange={(e)=> setMyRating(e.target.value)} className='border rounded px-2 py-1'>
                    <option value={0}>Select</option>
                    {[1,2,3,4,5].map(n=> <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <textarea value={myComment} onChange={(e)=> setMyComment(e.target.value)} placeholder='Share your experience…' className='w-full border border-borderColor rounded-lg p-2 mb-3' rows={3} />
                <button className='bg-primary text-white px-4 py-2 rounded-lg'>Submit review</button>
              </form>
            ) : (
              <p className='text-sm text-gray-500 mb-4'>Log in to leave a review.</p>
            )}

            {loadingReviews ? (
              <p className='text-sm text-gray-500'>Loading reviews…</p>
            ) : (
              <div className='space-y-4'>
                {reviews.length === 0 && <p className='text-sm text-gray-500'>No reviews yet.</p>}
                {reviews.map((r)=> (
                  <div key={r._id} className='border border-borderColor rounded-lg p-3'>
                    <div className='flex items-center justify-between mb-1'>
                      <div className='flex items-center gap-2'>
                        <span className='font-medium'>{r.user?.name || 'User'}</span>
                        <span className='text-yellow-600'>⭐ {r.rating}</span>
                      </div>
                      <span className='text-xs text-gray-400'>{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                    {r.comment && <p className='text-sm text-gray-700'>{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Right: Booking Form */}
        <div className='lg:sticky lg:top-20 lg:h-fit'>
          <form onSubmit={handleSubmit} className={`bg-white shadow-lg rounded-xl p-6 space-y-6 border border-borderColor ${(!instrument.isAvailable || (user && instrument.owner === user._id)) ? 'opacity-60 pointer-events-none' : ''}`}>
              <div className='flex items-center justify-between'>
                <span className='text-2xl text-primary-dull font-semibold'>
                  {currency}{instrument.pricePerDay || 0}
                </span>
                <span className='text-base text-gray-400 font-normal'>per day</span>
              </div>
              <hr className='border-borderColor'/>
              {!instrument.isAvailable && (
                <div className='p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-md'>
                  This instrument is currently rented out and unavailable for new bookings.
                </div>
              )}
              {user && instrument.owner === user._id && instrument.isAvailable && (
                <div className='p-3 bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-md'>
                  You are the owner of this instrument. Owners cannot create bookings for their own listings.
                </div>
              )}
              <div className='space-y-4'>
                <div className='flex flex-col gap-2'>
                  <label htmlFor="pickup-date" className='text-sm font-medium text-primary-dull'>
                    Pickup Date
                  </label>
                  <input 
                    value={pickupDate} onChange={(e) => setPickupDate(e.target.value)}
                    type="date" 
                    className='w-full border border-borderColor px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary' 
                    required 
                    id='pickup-date' 
                    min={new Date().toISOString().split('T')[0]} 
                  />
                </div>
                <div className='flex flex-col gap-2'>
                  <label htmlFor="return-date" className='text-sm font-medium text-primary-dull'>
                    Return Date
                  </label>
                  <input 
                    value={returnDate} onChange={(e) => setReturnDate(e.target.value)}
                    type="date" 
                    className='w-full border border-borderColor px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary' 
                    required 
                    id='return-date' 
                    min={pickupDate || new Date().toISOString().split('T')[0]} 
                  />
                </div>
              </div>
              <button 
                type="submit"
                disabled={!instrument.isAvailable || (user && instrument.owner === user._id)}
                className={`w-full transition-colors duration-200 py-3 font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${instrument.isAvailable && !(user && instrument.owner === user._id) ? 'bg-primary hover:bg-primary-dull cursor-pointer' : 'bg-gray-400 cursor-not-allowed'}`}
              >
                {!instrument.isAvailable ? 'Unavailable' : (user && instrument.owner === user._id) ? 'Owner Cannot Book' : 'Book Now'}
              </button>
              {instrument.isAvailable && !(user && instrument.owner === user._id) && (
                <p className='text-center text-sm text-gray-500'>
                  No credit card required to reserve
                </p>
              )}
            </form>
        </div>
      </div>
      
    </div>
  ) : <Loader />
}

export default InstrumentDetails


