import React, { useEffect, useState } from 'react'
import { assets } from '../../assets/assets'
import Title from '../../components/owner/Title'
import { useAppContext } from '../../context/AppContext'
import toast from 'react-hot-toast'


const ManageInstruments = () => {

  const {isOwner, axios, currency} = useAppContext()
  const [instruments, setInstruments] = useState([])

  const fetchOwnerInstruments = async ()=>{
    try {
      const {data} = await axios.get('/api/owner/instruments')
      if(data.success){
        setInstruments(data.instruments)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  const toggleAvailability = async (instrumentId)=>{
    try {
      const {data} = await axios.post('/api/owner/toggle-instrument', {instrumentId})
      if(data.success){
        toast.success(data.message)
        fetchOwnerInstruments()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  const deleteInstrument = async (instrumentId)=>{
    try {

      const confirm = window.confirm('Are you sure to delete this item?')

      if(!confirm) return null

      const {data} = await axios.post('/api/owner/delete-instrument', {instrumentId})
      if(data.success){
        toast.success(data.message)
        fetchOwnerInstruments()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  useEffect(()=>{
    isOwner && fetchOwnerInstruments()
  },[isOwner])

  return (
    <div className='px-4 pt-10 md:px-10 w-full'>


      <Title title="Manage Instruments" subTitle="View all listed instruments, update their details, or remove them from the booking platform." />
      
      <div className='max-w-3xl w-full rounded-md overflow-hidden border border-borderColor mt-6'>
        <table className='w-full border-collapse text-left text-sm text-primary-dull'>
          <thead className='text-primary-dull'>
            <tr>
              <th className='p-3 font-medium'>Instrument</th>
              <th className='p-3 font-medium max-md:hidden'>Category</th>
              <th className='p-3 font-medium'>Price</th>
              <th className='p-3 font-medium max-md:hidden'>Status</th>
              <th className='p-3 font-medium'>Actions</th>
            </tr>
          </thead>
          <tbody>
            {instruments.map((instrument, index)=>(
              <tr key={index} className='border-t border-borderColor'>
                <td className='p-3 flex items-center gap-3'>
                  <img src={instrument.image} alt="" className='h-12 w-12 aspect-square rounded-md object-cover' />
                  <div className='max-md:hidden'>
                    <p className='font-medium'>{instrument.brand} {instrument.model}</p>
                  </div>
                </td>
                <td className='p-3 max-md:hidden'>{instrument.category}</td>
                <td className='p-3'>{currency}{instrument.pricePerDay}/day</td>
                <td className='p-3 max-md:hidden'>
                  <span className={`px-3 py-1 rounded-full text-xs ${instrument.isAvailable ? 'bg-green-100 text-green-500' : 'bg-red-100 text-red-500'}`}>
                    {instrument.isAvailable ? "Available" : "Unavailable"}
                  </span>
                </td>
                <td className='flex items-center p-3'>
                  <img onClick={() => toggleAvailability(instrument._id)} src={instrument.isAvailable ? assets.eye_close_icon : assets.eye_icon} alt="" className='cursor-pointer'/>
                  <img onClick={() => deleteInstrument(instrument._id)} src={assets.delete_icon} alt="" className='cursor-pointer' />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>


    </div>
  )
}

export default ManageInstruments