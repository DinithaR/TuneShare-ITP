import React, { useState } from 'react'
import Title from '../components/Title'
import { assets, dummyInstrumentData } from '../assets/assets'
import InstrumentCard from '../components/InstrumentCard'
import { useSearchParams } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import toast from 'react-hot-toast'
import { useEffect } from 'react'


const Instruments = () => {


  // Getting search params form url
  const [searchParams] = useSearchParams()
  const pickupLocation = searchParams.get('pickupLocation')
  const pickupDate = searchParams.get('pickupDate')
  const returnDate = searchParams.get('returnDate')
  const q = searchParams.get('q') || ''


  const {instruments, axios, ratingsSummary} = useAppContext()


  const [input, setInput] = useState('')


  const isSearchData = pickupLocation && pickupDate && returnDate
  const [filteredInstruments, setFilteredInstruments] = useState([])

  const applyFilter = () => {
    if(input === ''){
      setFilteredInstruments(instruments)
      return null
    }

    const filtered = instruments.slice().filter((instrument) => {
      return instrument.brand?.toLowerCase().includes(input.toLowerCase())
      || instrument.model?.toLowerCase().includes(input.toLowerCase())
      || instrument.category?.toLowerCase().includes(input.toLowerCase())
      || instrument.name?.toLowerCase().includes(input.toLowerCase())
      || instrument.location?.toLowerCase().includes(input.toLowerCase())
      || instrument.features?.some(feature => 
        feature.toLowerCase().includes(input.toLowerCase())
      )
    })
    setFilteredInstruments(filtered)
  }

  const searchInstrumentAvailability = async () => {
    try {
      const {data} = await axios.post('/api/bookings/check-availability', 
      {location: pickupLocation, pickupDate, returnDate})
      if(data.success){
        const enriched = (data.availableInstruments || []).map(it => {
          const r = ratingsSummary?.[it._id];
          return r ? { ...it, avgRating: r.avgRating, reviewCount: r.count } : it;
        })
        setFilteredInstruments(enriched)
        if(data.availableInstruments.length === 0){
          toast.error('No Instruments Available')
        }
      } else {
        toast.error(data.message || 'Failed to check availability')
      }
    } catch (error) {
      toast.error('Failed to check instrument availability')
      console.error(error)
    }
  }


  useEffect(() => {
    if(isSearchData) {
      searchInstrumentAvailability()
    } else {
      setFilteredInstruments(instruments) // Show all instruments when no search params
    }
  }, [pickupLocation, pickupDate, returnDate, instruments])
  
  // If ratingsSummary updates while showing availability results, enrich list
  useEffect(() => {
    if (isSearchData && filteredInstruments.length > 0) {
      setFilteredInstruments(prev => prev.map(it => {
        const r = ratingsSummary?.[it._id];
        return r ? { ...it, avgRating: r.avgRating, reviewCount: r.count } : it;
      }))
    }
  }, [ratingsSummary])

  // Single useEffect for handling search/filter functionality
  useEffect(() => {
    if (instruments.length > 0 && !isSearchData) {
      applyFilter()
    }
  }, [input, instruments])

  // Initialize input from `q` query param when not using availability search
  useEffect(() => {
    if (!isSearchData) {
      setInput(q)
    }
  }, [q, isSearchData])


  return (
    <div>
      <div className='flex flex-col items-center py-20 bg-light max-md:px-4'>
        <Title title='Available Instruments' subtitle='Browse our selection of premium instruments available for your events' />


        <div className='flex items-center bg-white px-4 mt-6 max-w-140 w-full h-12 rounded-full shadow border border-borderColor'>
          <img src={assets.search_icon} alt="" className='w-4 h-4 mr-2' />
          
          <input 
            onChange={(e)=> setInput(e.target.value)} 
            value={input} 
            type="text" 
            placeholder='Search by make, model or features' 
            className='w-full h-full outline-none text-primary-dull placeholder-primary-dull/60' 
          />
          
          <img src={assets.filter_icon} alt="" className='w-4 h-4 ml-2' />
        </div>
      </div>


      <div className='px-6 md:px-16 lg:px-24 xl:px-32 mt-10'>
        <p className='text-primary-dull/70 xl:px-20 max-w-7xl mx-auto'>Showing {filteredInstruments.length} instruments</p>
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-4 xl:px-20 max-w-7xl mx-auto'>
          {filteredInstruments.map((instrument, index)=> (
            <InstrumentCard key={index} instrument={instrument} />
          ))}
        </div>
      </div>
    </div>
  )
}


export default Instruments


