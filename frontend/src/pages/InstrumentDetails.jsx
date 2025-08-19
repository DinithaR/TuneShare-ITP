import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { assets } from '../assets/assets'
import Loader from '../components/Loader'
import { useAppContext } from '../context/AppContext'
import toast from 'react-hot-toast'

const InstrumentDetails = () => {
  
  const {id} = useParams()
  const {instruments, axios, pickupDate, setPickupDate, returnDate, setReturnDate} = useAppContext()
  const navigate = useNavigate()
  const [instrument, setInstrument] = useState(null)
  const currency = import.meta.env.VITE_CURRENCY

  const handleSubmit = async (e) => {
    e.preventDefault();
    
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

      console.log('Response received:', data);

      if(data.success){
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
    } else if (instruments.length > 0) {
      // If instruments are loaded but instrument not found, show error
      toast.error('Instrument not found')
      navigate('/instruments')
    }
  }, [instruments, id, navigate])
  
  return instrument ? (
    <div className='px-6 md:px-16 lg:px-24 xl:px-32 mt-16'>
      <button onClick={() => navigate(-1)} className='flex items-center gap-2 mb-6 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer'>
        <img src={assets.arrow_icon} alt="" className='rotate-180 opacity-65 w-4 h-4' />
        Go Back
      </button>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12'>
        
        {/* Left: Instrument Image & Details */}
        <div className='lg:col-span-2'>
          <img src={instrument.image} alt={`${instrument.brand || ''} ${instrument.model || ''}`} className='w-full h-auto max-h-96 object-cover rounded-xl mb-6 shadow-md' />
          <div className='space-y-6'>
            <div>
              <h1 className='text-3xl font-bold text-gray-800'>
                {instrument.brand || ''} {instrument.model || instrument.name || 'Instrument'}
              </h1>
              <p className='text-gray-500 text-lg mt-2'>{instrument.category || 'Musical Instrument'}</p>
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
        </div>
        
        {/* Right: Booking Form */}
        <div className='lg:sticky lg:top-20 lg:h-fit'>
          <form onSubmit={handleSubmit} className='bg-white shadow-lg rounded-xl p-6 space-y-6 border border-borderColor'>
            
            <div className='flex items-center justify-between'>
              <span className='text-2xl text-primary-dull font-semibold'>
                {currency}{instrument.pricePerDay || 0}
              </span>
              <span className='text-base text-gray-400 font-normal'>per day</span>
            </div>

            <hr className='border-borderColor'/>

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
              className='w-full bg-primary hover:bg-primary-dull transition-colors duration-200 py-3 font-medium text-white rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
            >
              Book Now
            </button>
            
            <p className='text-center text-sm text-gray-500'>
              No credit card required to reserve
            </p>

          </form>
        </div>
      </div>
      
    </div>
  ) : <Loader />
}

export default InstrumentDetails


