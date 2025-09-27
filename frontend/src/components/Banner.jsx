import React, { useState } from 'react'
import { assets } from '../assets/assets'
import { useAppContext } from '../context/AppContext'
import toast from 'react-hot-toast'
import ConfirmModal from './ConfirmModal'

const Banner = () => {
  const { user, isOwner, setIsOwner, role, axios, setShowLogin, navigate } = useAppContext()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [promoteLoading, setPromoteLoading] = useState(false)

  const handleListClick = async () => {
    // If not logged in, prompt login
    if (!user) {
      setShowLogin(true)
      return
    }

    // Owners and admins go straight to dashboard
    if (isOwner || role === 'admin') {
      navigate('/owner')
      return
    }

    // Open custom confirm modal
    setConfirmOpen(true)
  }
  return (
    <div className="flex flex-col md:flex-row items-center justify-between px-8 md:px-14 pt-10 pb-10 bg-gradient-to-r from-[#F472B6] to-[#1E293B] max-w-6xl mx-3 md:mx-auto rounded-2xl overflow-hidden gap-8">
      <div className="text-white flex-1">
        <h2 className="text-3xl font-medium">Do you Own Instruments?</h2>
        <p className="mt-2">Monetize your instruments effortlessly by listing them.</p>
        <p className="max-w-md mt-2">
          We take care of your items and secure payments – so you can earn passive income, stress free.
        </p>
        <button onClick={handleListClick} className="px-6 py-2 bg-white hover:bg-slate-100 transition-all text-primary rounded-lg text-sm mt-4 cursor-pointer">
          List your Instrument
        </button>
      </div>
      <img
        src={assets.banner_instrument_image}
        alt="instrument"
        className="max-h-56 md:max-h-72 w-auto object-contain mt-8 md:mt-0 flex-1"
      />
      {/* Confirm become owner modal */}
      <ConfirmModal
        open={confirmOpen}
        title="Become an Owner"
        description="Do you want to become an owner and list your instruments?"
        confirmText="Yes, make me owner"
        cancelText="Not now"
        loading={promoteLoading}
        onCancel={() => !promoteLoading && setConfirmOpen(false)}
        onConfirm={async () => {
          setPromoteLoading(true)
          try {
            const { data } = await axios.post('/api/owner/change-role')
            if (data.success) {
              setIsOwner(true)
              toast.success(data.message || 'You are now an owner')
              setConfirmOpen(false)
              navigate('/owner')
            } else {
              toast.error(data.message || 'Failed to update role')
            }
          } catch (err) {
            toast.error(err?.response?.data?.message || err.message || 'Failed to update role')
          } finally {
            setPromoteLoading(false)
          }
        }}
      />
    </div>
  )
}

export default Banner