import React, { useState } from 'react'
import Title from '../../components/owner/Title'
import { assets } from '../../assets/assets'
import { useAppContext } from '../../context/AppContext'
import toast from 'react-hot-toast'


const AddInstrument = () => {

  const {axios, currency} = useAppContext()


  const [images, setImages] = useState([])
  const [instrument, setInstrument] = useState({
    brand: '',
    model: '',
    pricePerDay: '',
    category: '',
    location: '',
    description: '',
  })

  const [isLoading, setIsLoading] = useState(false)
  const onSubmitHandler = async (e)=>{
    e.preventDefault()
    if(isLoading) return null

    setIsLoading(true)
    try {
  const formData = new FormData()
  // Append up to 5 images
  images.forEach((file) => formData.append('images', file))
      const instrumentToSend = {
        ...instrument,
        // Ensure numeric value is sent; default to 0 if invalid (backend validates)
        pricePerDay: Number(instrument.pricePerDay) || 0,
      }
      formData.append('instrumentData', JSON.stringify(instrumentToSend))

      const {data} = await axios.post('/api/owner/add-instrument', formData)

      if(data.success){
        toast.success(data.message)
        setImages([])
        setInstrument({
          brand: '',
          model: '',
          pricePerDay: '',
          category: '',
          location: '',
          description: '',
        })
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }


  return (
    <div className='px-2 py-10 md:px-10 flex-1'>
      <Title title="Add new Instrument" subTitle="Fill in details to list a new instrument for booking, including pricing, availability, and details." />      


      <form onSubmit={onSubmitHandler} className='flex flex-col gap-5 text-[#1E293B] text-sm mt-6 max-w-xl'>


        {/* Instrument Images */}
        <div className='flex items-start gap-4 w-full'>
          <label htmlFor="instrument-images" className='cursor-pointer'>
            <img src={assets.upload_icon} alt="" className='h-14 rounded'/>
            <input
              type="file"
              id="instrument-images"
              accept='image/*'
              multiple
              hidden
              onChange={e=>{
                const files = Array.from(e.target.files || [])
                setImages(files.slice(0,5))
              }}
            />
          </label>
          <div className='flex-1'>
            <p className='text-sm text-[#1E293B]'>Upload up to 5 pictures of your instrument</p>
            {images.length > 0 && (
              <div className='mt-2 grid grid-cols-5 gap-2'>
                {images.map((file, idx) => (
                  <img key={idx} src={URL.createObjectURL(file)} alt={file.name} className='h-16 w-16 object-cover rounded border'/>
                ))}
              </div>
            )}
          </div>
        </div>


        {/* Instrument Brand & Model */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <div className='flex flex-col w-full'>
            <label>Brand</label>
            <input type="text" placeholder='eg: Yamaha, Bose, JBL...' required className='px-3 py-2 mt-1 border border-[#FBCFE8] rounded-md outline-none' value={instrument.brand} onChange={e=>setInstrument({...instrument, brand: e.target.value})}/>
          </div>
          <div className='flex flex-col w-full'>
            <label>Model</label>
            <input type="text" placeholder='eg: Yamaha, Bose, JBL...' required className='px-3 py-2 mt-1 border border-[#FBCFE8] rounded-md outline-none' value={instrument.model} onChange={e=>setInstrument({...instrument, model: e.target.value})}/>
          </div>
        </div>


        {/* Instrument Price and Category */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <div className='flex flex-col w-full'>
            <label>Category</label>
            <select onChange={e=> setInstrument({...instrument, category: e.target.value})} value={instrument.category} className='px-3 py-2 mt-1 border border-[#FBCFE8] rounded-md outline-none'>
              <option value="">Select a category</option>
              <option value="String">String</option>
              <option value="Percussion">Percussion</option>
              <option value="Electronic">Electronic</option>
            </select>
          </div>
          <div className='flex flex-col w-full'>
            <label>Location</label>
            <select onChange={e=> setInstrument({...instrument, location: e.target.value})} value={instrument.location} className='px-3 py-2 mt-1 border border-[#FBCFE8] rounded-md outline-none'>
              <option value="">Select a Location</option>
              <option value="Malabe">Malabe</option>
              <option value="Avissavella">Avissavella</option>
              <option value="Matara">Matara</option>
            </select>
          </div>
          
        </div>


        <div className='flex flex-col w-full'>
          <label>Daily Price ({currency})</label>
          <input
            type="number"
            placeholder='1000'
            min={1}
            step={1}
            required
            className='px-3 py-2 mt-1 border border-[#FBCFE8] rounded-md outline-none'
            value={instrument.pricePerDay}
            onChange={e => {
              const v = e.target.value;
              // Allow empty field without forcing 0; otherwise coerce to number
              setInstrument({ ...instrument, pricePerDay: v === '' ? '' : Number(v) })
            }}
          />
        </div>


        {/* Description */}
        <div className='flex flex-col w-full'>
          <label>Description</label>
          <textarea rows={5} placeholder='' required className='px-3 py-2 mt-1 border border-[#FBCFE8] rounded-md outline-none' value={instrument.description} onChange={e=>setInstrument({...instrument, description: e.target.value})}></textarea>
        </div>


        <button className='flex items-center gap-2 px-4 py-2.5 mt-4 bg-[#F472B6] text-white rounded-md font-medium w-max cursor-pointer'>
          <img src={assets.tick_icon} alt="" className='h-5'/>
          {isLoading ? 'Listing...' : 'List your Instrument'}
        </button>


      </form>
    </div>
  )
}


export default AddInstrument