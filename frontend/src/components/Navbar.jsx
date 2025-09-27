import React, { useState } from 'react';
import Loader from './Loader';
import { assets, menuLinks } from '../assets/assets';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import toast from 'react-hot-toast';

function Navbar() {
  const { setShowLogin, openLogin, user, logout, isOwner, axios, setIsOwner, role, authLoading } = useAppContext();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [navQuery, setNavQuery] = useState('');
  const navigate = useNavigate();

  const changeRole = async () => {
    try {
      const { data } = await axios.post('/api/owner/change-role');
      if (data.success) {
        setIsOwner(true);
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (authLoading) {
    return (
      <nav className="w-full border-b bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50 flex items-center justify-center h-20">
        <Loader />
      </nav>
    );
  }

  return (
    <>
      <nav
        className={`w-full border-b sticky top-0 z-50 transition-colors duration-300 ${open ? 'bg-transparent shadow-none backdrop-blur-0' : 'bg-white/80 backdrop-blur-md shadow-sm'}`}
        style={{ borderBottomColor: 'var(--color-borderColor)' }}
      >
        <div className="max-w-7xl mx-auto flex items-center gap-4 px-4 md:px-8 py-3">
          {/* Logo */}
          <Link to='/' className="flex-shrink-0 flex items-center gap-2">
            <img
              src={assets.navbarLogo}
              alt="TuneShare Logo"
              className="w-28 h-auto rounded-xl shadow-md hover:scale-105 transition-transform"
              style={{ boxShadow: `0 2px 8px var(--color-borderColor)` }}
            />
          </Link>

          {/* Search Bar (Desktop Only) */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-full border border-gray-200 bg-white shadow-sm focus-within:shadow-md min-w-[220px] max-w-[320px] flex-1">
            <input
              type="text"
              value={navQuery}
              onChange={(e)=>setNavQuery(e.target.value)}
              onKeyDown={(e)=>{ if(e.key==='Enter'){ const q = navQuery.trim(); if(q){ const params = new URLSearchParams({ q }); navigate(`/instruments?${params.toString()}`); }}}}
              className="flex-1 bg-transparent outline-none text-sm placeholder-gray-400"
              placeholder="Search instruments, brands, locations..."
              style={{ color: '#374151' }}
              aria-label="Search instruments"
            />
            <button
              type="button"
              onClick={()=>{ const q = navQuery.trim(); if(q){ const params = new URLSearchParams({ q }); navigate(`/instruments?${params.toString()}`); }}}
              className="p-1 rounded hover:bg-gray-100"
              aria-label="Search"
              title="Search"
            >
              <img src={assets.search_icon} alt="Search" className="w-5 h-5 opacity-60" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 flex-1 justify-center">
            {menuLinks && menuLinks.map((link, index) => (
              <Link
                key={index}
                to={link.path}
                className="text-base font-semibold text-gray-700 hover:text-pink-600 transition-colors px-2 py-1 rounded"
                style={{ letterSpacing: '0.01em' }}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Dashboard/List Buttons, Welcome, Profile, Logout - Desktop Only */}
          <div className="hidden md:flex items-center gap-2">
            {role === 'admin' && (
              <button
                onClick={() => navigate('/admin')}
                className="px-4 py-2 font-semibold rounded-lg transition-all duration-200 bg-pink-500 text-white hover:bg-pink-600 shadow-sm"
              >
                Admin Dashboard
              </button>
            )}
            {user && (
              <button
                onClick={() => isOwner ? navigate('/owner') : changeRole()}
                className="px-4 py-2 font-semibold rounded-lg transition-all duration-200 bg-gray-100 text-pink-700 hover:bg-gray-200 shadow-sm"
              >
                {isOwner ? 'Dashboard' : 'List Instruments'}
              </button>
            )}
            {user && (
              <div className="flex items-center gap-2 ml-2">
                <span className="text-primary font-semibold whitespace-nowrap">Welcome, {user.name}!</span>
                <button
                  onClick={() => navigate('/profile')}
                  className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-primary bg-white hover:shadow-md transition"
                  title="Profile"
                >
                  <img
                    src={user.image || '/src/assets/user_profile.jpg'}
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                </button>
              </div>
            )}
            {user ? (
              <button
                onClick={() => logout()}
                className="px-4 py-2 font-semibold rounded-lg transition-all duration-200 bg-pink-400 text-white hover:bg-pink-500 shadow-sm ml-2"
              >
                Logout
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openLogin('login')}
                  className="px-4 py-2 font-semibold rounded-lg transition-all duration-200 bg-white text-pink-700 border border-pink-300 hover:bg-pink-50 shadow-sm"
                >
                  Login
                </button>
                <button
                  onClick={() => openLogin('register')}
                  className="px-4 py-2 font-semibold rounded-lg transition-all duration-200 bg-pink-400 text-white hover:bg-pink-500 shadow-sm"
                >
                  Register
                </button>
              </div>
            )}
          </div>

          {/* Hamburger Menu Button (Mobile Only) */}
          <button
            className="md:hidden cursor-pointer z-50 p-2 rounded-md hover:bg-pink-50 transition-colors"
            aria-label="Toggle navigation menu"
            onClick={() => setOpen(!open)}
          >
            <img
              src={open ? assets.close_icon : assets.menu_icon}
              alt={open ? "Close menu" : "Open menu"}
              className="w-6 h-6"
            />
          </button>

          {/* Redesigned Mobile Menu Overlay and Drawer */}
          {open && (
            <>
              {/* Overlay */}
                <div className="fixed inset-0 z-40 bg-transparent md:hidden" onClick={() => setOpen(false)} />
              {/* Drawer - now left-aligned with solid background */}
              <aside className="fixed top-0 left-0 h-full w-80 max-w-full bg-white z-50 shadow-2xl flex flex-col md:hidden transition-transform duration-300" style={{ transform: open ? 'translateX(0)' : 'translateX(-100%)', background: '#fff' }}>
                {/* Header with logo and close button */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
                  <img src={assets.navbarLogo} alt="TuneShare Logo" className="w-28 h-auto rounded-xl" />
                  <button onClick={() => setOpen(false)} className="p-2 rounded hover:bg-gray-100 focus:outline-none">
                    <img src={assets.close_icon} alt="Close" className="w-7 h-7" />
                  </button>
                </div>
                {/* Menu Links */}
                <nav className="flex flex-col gap-2 px-6 py-6 border-b border-gray-100 bg-white">
                  {(Array.isArray(menuLinks) && menuLinks.length > 0) ? (
                    menuLinks.map((link, index) => (
                      <Link
                        key={index}
                        to={link.path}
                        onClick={() => setOpen(false)}
                        className="py-2 px-3 text-lg font-medium text-gray-700 rounded hover:bg-pink-50 hover:text-pink-600 transition"
                      >
                        {link.name}
                      </Link>
                    ))
                  ) : (
                    <span className="text-gray-400">No menu items</span>
                  )}
                </nav>
                {/* Dashboard/List Buttons */}
                <div className="flex flex-col gap-3 px-6 py-5 border-b border-gray-100 bg-white">
                  {role === 'admin' && (
                    <button
                      onClick={() => { setOpen(false); navigate('/admin'); }}
                      className="w-full py-3 font-semibold rounded-lg bg-pink-500 text-white hover:bg-pink-600 transition text-lg shadow"
                    >
                      Admin Dashboard
                    </button>
                  )}
                  {user && (
                    <button
                      onClick={() => { setOpen(false); isOwner ? navigate('/owner') : changeRole(); }}
                      className="w-full py-3 font-semibold rounded-lg bg-gray-100 text-pink-700 hover:bg-gray-200 transition text-lg shadow"
                    >
                      {isOwner ? 'Dashboard' : 'List Instruments'}
                    </button>
                  )}
                </div>
                {/* Profile and Auth */}
                <div className="flex flex-col items-center gap-3 px-6 py-6 bg-white">
                  {user && (
                    <>
                      <span className="text-primary font-semibold text-lg">Welcome, {user.name}!</span>
                      <button
                        onClick={() => { setOpen(false); navigate('/profile'); }}
                        className="flex items-center justify-center w-20 h-20 rounded-full border-2 border-primary bg-white hover:shadow-md transition"
                        title="Profile"
                      >
                        <img
                          src={user.image || '/src/assets/user_profile.jpg'}
                          alt="Profile"
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      </button>
                    </>
                  )}
                  {user ? (
                    <button
                      onClick={() => { setOpen(false); logout(); }}
                      className="w-full py-3 font-semibold rounded-lg bg-pink-400 text-white hover:bg-pink-500 transition text-lg shadow mt-2"
                    >
                      Logout
                    </button>
                  ) : (
                    <div className="w-full flex flex-col gap-2 mt-2">
                      <button
                        onClick={() => { setOpen(false); openLogin('login'); }}
                        className="w-full py-3 font-semibold rounded-lg bg-white text-pink-700 border border-pink-300 hover:bg-pink-50 transition text-lg shadow"
                      >
                        Login
                      </button>
                      <button
                        onClick={() => { setOpen(false); openLogin('register'); }}
                        className="w-full py-3 font-semibold rounded-lg bg-pink-400 text-white hover:bg-pink-500 transition text-lg shadow"
                      >
                        Register
                      </button>
                    </div>
                  )}
                </div>
              </aside>
            </>
          )}
        </div>
      </nav>
    </>
  );
}

export default Navbar;