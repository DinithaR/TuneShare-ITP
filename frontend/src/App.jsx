import React, { useState } from 'react'
import Navbar from './components/Navbar'
import { Route, Routes, useLocation } from 'react-router-dom'
import Instruments from './pages/Instruments'
import InstrumentDetails from './pages/InstrumentDetails'
import MyBookings from './pages/MyBookings'
import Home from './pages/Home'
import Footer from './components/Footer'
import Layout from './pages/owner/Layout'
import Dashboard from './pages/owner/Dashboard'
import AddInstrument from './pages/owner/AddInstrument'
import ManageInstruments from './pages/owner/ManageInstruments'
import ManageBookings from './pages/owner/ManageBookings'
import Login from './components/Login'
import { Toaster } from 'react-hot-toast'
import { useAppContext } from './context/AppContext'
import AdminDashboard from './pages/AdminDashboard'
import Profile from './pages/Profile'


const App = () => {
  const { showLogin, role } = useAppContext();
  const isOwnerPath = useLocation().pathname.startsWith('/owner');

  return (
    <>
      <Toaster />
      {showLogin && <Login />}

      {!isOwnerPath && <Navbar />}

  <Routes>
  <Route path='/profile' element={<Profile />} />
        <Route path='/' element={<Home />} />
        <Route path='/instrument-details/:id' element={<InstrumentDetails />} />
        <Route path='/instruments' element={<Instruments />} />
        <Route path='/my-bookings' element={<MyBookings />} />
        <Route path='/owner' element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="add-instrument" element={<AddInstrument />} />
          <Route path="manage-instruments" element={<ManageInstruments />} />
          <Route path="manage-bookings" element={<ManageBookings />} />
        </Route>
  <Route path='/admin' element={role === 'admin' ? <AdminDashboard /> : <div className="flex items-center justify-center h-96 text-2xl font-bold text-red-500">Unauthorized</div>} />
      </Routes>

      {!isOwnerPath && <Footer />}
    </>
  );
};

export default App;
