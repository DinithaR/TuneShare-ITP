import React, { useEffect, useState } from 'react'
import { assets } from '../../assets/assets'
import Title from '../../components/owner/Title'
import { useAppContext } from '../../context/AppContext'
import toast from 'react-hot-toast'


const ManageInstruments = () => {

  const {isOwner, axios, currency} = useAppContext()
  const [instruments, setInstruments] = useState([])
  const [editing, setEditing] = useState(null) // instrument being edited
  const [editImages, setEditImages] = useState([])

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

  const openEdit = (ins)=>{
    setEditing({
      instrumentId: ins._id,
      brand: ins.brand,
      model: ins.model,
      category: ins.category,
      pricePerDay: ins.pricePerDay,
      location: ins.location,
      description: ins.description,
      currentImages: ins.images && ins.images.length ? ins.images : (ins.image ? [ins.image] : []),
      keepImages: ins.images && ins.images.length ? [...ins.images] : (ins.image ? [ins.image] : [])
    })
    setEditImages([])
  }

  const submitEdit = async (e)=>{
    e.preventDefault()
    try {
      const totalImages = (editing.keepImages?.length || 0) + editImages.length
      if(totalImages === 0){
        return toast.error('Please keep or add at least one image')
      }
      if(totalImages > 5){
        return toast.error('You can only have up to 5 images')
      }
      const formData = new FormData()
      const payload = { ...editing }
      delete payload.currentImages
      // keepImages will be used by backend to merge
      formData.append('instrumentData', JSON.stringify(payload))
      // If user selected new images, send them to replace; else keep existing on server
      editImages.forEach(f => formData.append('images', f))
      const { data } = await axios.post('/api/owner/update-instrument', formData)
      if(data.success){
        toast.success('Instrument updated')
        setEditing(null)
        setEditImages([])
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
                <td className='flex items-center gap-3 p-3'>
                  <img onClick={() => toggleAvailability(instrument._id)} src={instrument.isAvailable ? assets.eye_close_icon : assets.eye_icon} alt="" className='cursor-pointer'/>
                  <img onClick={() => openEdit(instrument)} src={assets.edit_icon} alt="" className='cursor-pointer h-4 w-4'/>
                  <img onClick={() => deleteInstrument(instrument._id)} src={assets.delete_icon} alt="" className='cursor-pointer' />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50 overflow-y-auto'>
          <div className='bg-white w-full max-w-xl rounded-lg p-5 shadow-lg my-8 max-h-[85vh] overflow-y-auto'>
            <div className='flex items-center justify-between mb-3'>
              <h3 className='text-lg font-semibold'>Edit Instrument</h3>
              <button onClick={()=>{setEditing(null); setEditImages([])}} className='text-sm text-gray-500'>Close</button>
            </div>
            <form onSubmit={submitEdit} className='space-y-4'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div>
                  <label className='text-sm'>Brand</label>
                  <input value={editing.brand} onChange={e=> setEditing({...editing, brand: e.target.value})} className='w-full border px-3 py-2 rounded mt-1' required />
                </div>
                <div>
                  <label className='text-sm'>Model</label>
                  <input value={editing.model} onChange={e=> setEditing({...editing, model: e.target.value})} className='w-full border px-3 py-2 rounded mt-1' required />
                </div>
              </div>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div>
                  <label className='text-sm'>Category</label>
                  <input value={editing.category} onChange={e=> setEditing({...editing, category: e.target.value})} className='w-full border px-3 py-2 rounded mt-1' required />
                </div>
                <div>
                  <label className='text-sm'>Price Per Day</label>
                  <input type='number' value={editing.pricePerDay} onChange={e=> setEditing({...editing, pricePerDay: Number(e.target.value)})} className='w-full border px-3 py-2 rounded mt-1' required />
                </div>
              </div>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div>
                  <label className='text-sm'>Location</label>
                  <input value={editing.location} onChange={e=> setEditing({...editing, location: e.target.value})} className='w-full border px-3 py-2 rounded mt-1' required />
                </div>
              </div>
              <div>
                <label className='text-sm'>Description</label>
                <textarea rows={4} value={editing.description} onChange={e=> setEditing({...editing, description: e.target.value})} className='w-full border px-3 py-2 rounded mt-1' />
              </div>

              {/* Current images preview */}
              {editing.currentImages?.length > 0 && (
                <div>
                  <label className='text-sm block mb-1'>Current Images</label>
                  <div className='grid grid-cols-5 gap-2'>
                    {editing.currentImages.map((url, idx) => {
                      const kept = editing.keepImages?.includes(url)
                      return (
                        <button
                          type='button'
                          key={idx}
                          onClick={()=>{
                            setEditing(prev => {
                              const keep = new Set(prev.keepImages || [])
                              if(keep.has(url)) keep.delete(url); else keep.add(url)
                              return {...prev, keepImages: Array.from(keep)}
                            })
                          }}
                          className={`relative border rounded overflow-hidden ${kept ? 'ring-2 ring-primary' : 'opacity-70'}`}
                          title={kept ? 'Click to remove' : 'Click to keep'}
                        >
                          <img src={url} alt={`current-${idx}`} className='w-full h-16 object-cover' />
                          <span className={`absolute bottom-1 left-1 text-[10px] px-1.5 py-0.5 rounded ${kept ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                            {kept ? 'Keep' : 'Remove'}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Add new images */}
              <div>
                {(() => {
                  const remaining = Math.max(0, 5 - (editing.keepImages?.length || 0))
                  return (
                    <>
                      <label className='text-sm block'>Add Images (optional)</label>
                      <p className='text-xs text-gray-500'>You can add up to {remaining} more image(s). Max 5 total.</p>
                      <input
                        type='file'
                        accept='image/*'
                        multiple
                        disabled={remaining === 0}
                        onChange={e=>{
                          const files = Array.from(e.target.files || [])
                          setEditImages(files.slice(0, remaining))
                        }}
                        className='mt-1 disabled:opacity-50'
                      />
                    </>
                  )
                })()}
                {editImages.length > 0 && (
                  <div className='grid grid-cols-5 gap-2 mt-2'>
                    {editImages.map((f, idx) => (
                      <img key={idx} src={URL.createObjectURL(f)} alt={`new-${idx}`} className='w-full h-16 object-cover rounded border' />
                    ))}
                  </div>
                )}
              </div>

              <div className='flex justify-end gap-2'>
                <button type='button' onClick={()=>{setEditing(null); setEditImages([])}} className='px-4 py-2 border rounded'>Cancel</button>
                <button type='submit' className='px-4 py-2 bg-primary text-white rounded'>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  )
}

export default ManageInstruments