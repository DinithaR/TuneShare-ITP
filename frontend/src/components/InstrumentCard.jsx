import React from 'react'
import { useAppContext } from '../context/AppContext'
import { assets } from '../assets/assets'
import { useNavigate } from 'react-router-dom'

const InstrumentCard = ({ instrument }) => {
    const currency = import.meta.env.VITE_CURRENCY
    const { user, ratingsSummary } = useAppContext()
    const navigate = useNavigate()

    return (
        <div onClick={()=> {navigate(`/instrument-details/${instrument._id}`); scrollTo(0,0)}} className='group rounded-xl overflow-hidden shadow-lg hover:-translate-y-1 transition-all duration-500 cursor-pointer'>
            <div className='relative h-48 overflow-hidden'>
                <img src={instrument.image} alt="Instrument Image" className='w-full h-full object-cover transition-transform duration-500 group-hover:scale-105' />
                {instrument.isAvailable ? (
                    <p className='absolute top-4 left-4 bg-primary/90 text-white text-xs px-2.5 py-1 rounded-full shadow-md'>Available Now</p>
                ) : (
                    <p className='absolute top-4 left-4 bg-red-600/90 text-white text-xs px-2.5 py-1 rounded-full shadow-md'>Unavailable</p>
                )}
                {user && instrument.owner === user._id && (
                  <p className='absolute top-4 right-4 bg-amber-500/90 text-white text-xs px-2.5 py-1 rounded-full shadow-md backdrop-blur-sm'>Your Listing</p>
                )}
                                <div className='absolute bottom-4 right-4 flex flex-col items-end gap-2'>
                                        {(() => {
                                                const s = ratingsSummary?.[instrument?._id];
                                                const avgSource = (typeof s?.avgRating === 'number') ? s.avgRating : instrument?.avgRating;
                                                const countSource = (typeof s?.count === 'number') ? s.count : instrument?.reviewCount;
                                                const avg = Number.isFinite(avgSource) ? avgSource : 0;
                                                const count = Number.isFinite(countSource) ? Number(countSource) : 0;
                                                return (
                                                    <div className='bg-black/75 text-yellow-300 text-xs px-2 py-1 rounded-md' aria-label={`Average rating ${avg.toFixed(1)} from ${count} reviews`}>
                                                        ⭐ {avg.toFixed(1)} <span className='text-white/70'>({count})</span>
                                                    </div>
                                                );
                                        })()}
                    <div className='bg-black/80 backdrop-blur-sm text-white px-3 py-2 rounded-lg'>
                        <span className='font-semibold'>{currency}{instrument.pricePerDay}</span>
                        <span className='text-sm text-white/80'> / day</span>
                    </div>
                </div>
            </div>
            <div className='p-4 sm:p-5'>
                <div className='flex justify-between items-start mb-2'>
                    <div>
                        <h3 className='text-lg font-medium'>{instrument.brand} {instrument.model}</h3>
                        <p className='text-muted-foreground text-sm'>{instrument.category}</p>
                    </div>
                </div>
                <div className='mt-4 grid grid-cols-2 gap-y-2 text-green-600'>
                    <div className='flex items-center text-sm text-muted-foreground'>
                        <img src={assets.location_icon} alt="" className='h-4 mr-2' />
                        <span>{instrument.location}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default InstrumentCard