import React from 'react'
import Title from './Title'
import { assets, dummyInstrumentData } from '../assets/assets'
import InstrumentCard from './InstrumentCard'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'

const FeaturedSection = () => {

    const navigate = useNavigate()
    const {instruments} = useAppContext()

  return (
    <div className='flex flex-col items-center py-24 px-6 md:px-16 lg:px-24 xl:px-32'>

        <div>
            <Title title='Featured Instruments' subtitle='Explore our selection of Music Instruments available for your next adventure.' />
        </div>

        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-18'>
            {
                instruments.slice(0,6).map((instrument)=> (
                    <div key={instrument._id}>
                        <InstrumentCard instrument={instrument} />
                    </div>
                ))
            }
        </div>

        <button onClick={()=> {navigate('/instruments'); scrollTo(0,0)}} className='flex items-center justify-center gap-2 px-6 py-2 border border-borderColor hover:bg-gray-50 rounded-md mt-18 cursor-pointer'>
            Explore all Instruments <img src={assets.arrow_icon} alt="arrow" />
        </button>
        
    </div>
  )
}

export default FeaturedSection
