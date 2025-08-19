import React, { useState } from 'react';
import { assets, cityList } from '../assets/assets';
import { useAppContext } from '../context/AppContext';

const Hero = () => {
  const [pickupLocation, setPickupLocation] = useState('');

  const {pickupDate, setPickupDate,returnDate, setReturnDate, navigate} = useAppContext()

  const handleSearch = (e) => {
    e.preventDefault()
    navigate('/instruments?' + pickupLocation + '&pickupDate=' + pickupDate + '&returnDate=' + returnDate)
  }

  return (
    <div
      className="relative h-screen flex flex-col items-center justify-center gap-14 text-center
                 bg-cover bg-center"
      style={{
        backgroundImage: `url(${assets.hero_img})`,
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 z-0"></div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center w-full">
        <h1 className="text-4xl md:text-5xl font-semibold text-white drop-shadow-lg">Instruments on Rent</h1>

        <form
          onSubmit={handleSearch}
          className="flex flex-col md:flex-row items-center justify-between p-6
          rounded-lg md:rounded-full w-full max-w-2xl bg-white bg-opacity-90 shadow-lg
          gap-y-6 md:gap-y-0 md:gap-x-8 mt-8"
        >
          {/* Pickup Location */}
          <div className="flex flex-col items-start gap-2 min-w-[160px]">
            <select
              required
              value={pickupLocation}
              onChange={(e) => setPickupLocation(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Pickup Location</option>
              {cityList.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
            <p className="px-1 text-sm text-gray-500">
              {pickupLocation ? pickupLocation : 'Please select location'}
            </p>
          </div>

          {/* Pickup Date */}
          <div className="flex flex-col items-start gap-2 min-w-[160px]">
            <label htmlFor="pickup-date" className="mb-1">
              Pick up Date
            </label>
            <input
              value={pickupDate}
              onChange={e => setPickupDate(e.target.value)}
              type="date"
              id="pickup-date"
              min={new Date().toISOString().split('T')[0]}
              className="w-full text-sm text-gray-500 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          {/* Return Date */}
          <div className="flex flex-col items-start gap-2 min-w-[160px]">
            <label htmlFor="return-date" className="mb-1">
              Return Date
            </label>
            <input
              value={returnDate}
              onChange={e => setReturnDate(e.target.value)}
              type="date"
              id="return-date"
              className="w-full text-sm text-gray-500 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          {/* Search Button */}
          <button
            type="submit"
            className="flex items-center justify-center gap-1 px-9 py-3 bg-primary hover:bg-primary-dull text-white rounded-full cursor-pointer md:mt-0"
          >
            <img src={assets.search_icon} alt="search" className="brightness-300 h-5" />
            Search
          </button>
        </form>
      </div>
    </div>
  );
};

export default Hero;
