import React, { useState } from 'react'
import Navbar from './components/Navbar'
import { Route, Routes, useLocation } from 'react-router-dom'
import Instruments from './pages/Instruments'
import InstrumentDetails from './pages/InstrumentDetails'
import MyBookings from './pages/MyBookings'
import PaymentPage from './pages/PaymentPage'
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
import AdminPayments from './pages/AdminPayments'
import Profile from './pages/Profile'
import ChatBot from './components/ChatBot'


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
  <Route path='/payment' element={<PaymentPage />} />
        <Route path='/owner' element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="add-instrument" element={<AddInstrument />} />
          <Route path="manage-instruments" element={<ManageInstruments />} />
          <Route path="manage-bookings" element={<ManageBookings />} />
        </Route>
  <Route path='/admin' element={role === 'admin' ? <AdminDashboard /> : <div className="flex items-center justify-center h-96 text-2xl font-bold text-red-500">Unauthorized</div>} />
  <Route path='/admin/payments' element={role === 'admin' ? <AdminPayments /> : <div className="flex items-center justify-center h-96 text-2xl font-bold text-red-500">Unauthorized</div>} />
      </Routes>

      {!isOwnerPath && <Footer />}
      {!isOwnerPath && <ChatBot />}
    </>
  );
};

export default App;
