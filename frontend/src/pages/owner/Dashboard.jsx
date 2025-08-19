import React, { useEffect, useState } from 'react'
import { assets, dummyDashboardData } from '../../assets/assets'
import Title from '../../components/owner/Title'
import { useAppContext } from '../../context/AppContext'
import toast from 'react-hot-toast'

const Dashboard = () => {

  const {axios, isOwner, currency} = useAppContext()

  const [data, setData] = useState({
    totalInstruments: 0,
    totalBookings: 0,
    pendingBookings: 0,
    completedBookings: 0,
    recentBookings: [],
    monthlyRevenue: 0,
  })

  const dashboardCards = [
    {title: "Total Instruments", value: data.totalInstruments, icon: assets.instrumentIconColored},
    {title: "Total Bookings", value: data.totalBookings, icon: assets.listIconColored},
    {title: "Pending", value: data.pendingBookings, icon: assets.cautionIconColored},
    {title: "Confirmed", value: data.completedBookings, icon: assets.listIconColored},
  ]

  const fetchDashboardData = async () => {
    try {
      const {data} = await axios.get('/api/owner/dashboard')
      if(data.success){
        setData(data.dashboardData)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  useEffect(() => {
    if(isOwner){
      fetchDashboardData()
    }
  },[isOwner])

  return (
    <div className='px-4 pt-10 md:px-10 flex-1 bg-light min-h-screen'>
      <Title 
        title="Owner Dashboard" 
        subTitle="Monitor overall platform performance including total instruments, bookings, revenue and recent activities" 
      />

      <div className='grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 my-8 max-w-3xl'>
        {dashboardCards.map((card, index) => (
          <div key={index} className='flex gap-2 items-center justify-between p-4 rounded-md border border-borderColor bg-white shadow-sm hover:shadow-md transition-shadow'>
            <div>
              <h1 className='text-xs text-primary-dull/70'>{card.title}</h1>
              <p className='text-lg font-semibold text-primary-dull'>{card.value}</p>
            </div>
            <div className='flex items-center justify-center w-10 h-10 rounded-full bg-primary/10'>
              <img src={card.icon} alt="" className='h-4 w-4'/>
            </div>
          </div>
        ))}
      </div>

      <div className='flex flex-wrap items-start gap-6 mb-8 w-full'>
        
        {/* recent booking */}
        <div className='p-4 md:p-6 border border-borderColor rounded-md max-w-lg w-full bg-white shadow-sm'>
          <h1 className='text-lg font-medium text-primary-dull'>Recent Bookings</h1>
          <p className='text-primary-dull/70'>Latest customer bookings</p>
          {data.recentBookings.map((booking, index) => (
            <div key={index} className='mt-4 flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <div className='hidden md:flex items-center justify-center w-12 h-12 rounded-full bg-primary/10'>
                  <img src={assets.listIconColored} alt="" className='h-5 w-5' />
                </div>
                <div>
                  <p className='text-primary-dull font-medium'>{booking.instrument?.brand} {booking.instrument?.model}</p>
                  <p className='text-sm text-primary-dull/70'>
                    {booking.createdAt ? booking.createdAt.split('T')[0] : 'N/A'}
                  </p>
                </div>
              </div>
              <div className='flex items-center gap-2 font-medium'>
                <p className='text-sm text-primary-dull/70'>{currency}{booking.price}</p>
                <p className='px-3 py-0.5 border border-borderColor rounded-full text-sm text-primary bg-primary/5'>{booking.status}</p>
              </div>
            </div>
          ))}
        </div>
        
        {/* monthly revenue */}
        <div className='p-4 md:p-6 mb-6 border border-borderColor rounded-md w-full md:max-w-xs bg-white shadow-sm'>
          <h1 className='text-lg font-medium text-primary-dull'>Monthly Revenue</h1>
          <p className='text-primary-dull/70'>Revenue for current month</p>
          <p className='text-3xl mt-6 font-semibold text-primary'>{currency}{data.monthlyRevenue}</p>
        </div>
      </div>
    </div>
  )
}

export default Dashboard