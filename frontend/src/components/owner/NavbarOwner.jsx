import React from 'react'
import { assets } from '../../assets/assets'
import { Link } from 'react-router-dom'
import { useAppContext } from '../../context/AppContext';

const NavbarOwner = () => {
  const {user} = useAppContext();

  return (
    <div className='flex items-center justify-between px-6 md:px-10 py-4 text-primary-dull bg-light border-b border-borderColor relative transition-all'>
      <Link to='/'>
        <img src={assets.logo} alt="" className='h-15 h-w-30 rounded-xl shadow-md transition-transform hover:scale-105' />
      </Link>
      <p className='text-primary-dull font-medium'>Welcome, {user?.name || "Owner"}</p>
    </div>
  )
}

export default NavbarOwner