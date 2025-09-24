import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const linkClass = ({ isActive }) =>
  `block px-3 py-2 rounded-lg text-sm ${isActive ? 'bg-pink-100 text-pink-700' : 'text-gray-700 hover:bg-gray-50'}`;

const AdminLayout = () => {
  return (
    <div className="px-4 md:px-8 lg:px-12 mt-16 max-w-7xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-6 text-pink-600 tracking-tight">Admin</h1>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <aside className="md:col-span-1 bg-white rounded-2xl shadow border border-gray-100 p-4 h-max sticky top-20">
          <nav className="space-y-1">
            <NavLink to="." end className={linkClass}>Overview</NavLink>
            <NavLink to="/admin/users" className={linkClass}>Users</NavLink>
            <NavLink to="/admin/instruments" className={linkClass}>Instruments</NavLink>
            <NavLink to="/admin/bookings" className={linkClass}>Bookings</NavLink>
            <NavLink to="/admin/payments" className={linkClass}>Payments</NavLink>
            <NavLink to="/admin/reviews" className={linkClass}>Reviews</NavLink>
          </nav>
        </aside>
        <main className="md:col-span-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
