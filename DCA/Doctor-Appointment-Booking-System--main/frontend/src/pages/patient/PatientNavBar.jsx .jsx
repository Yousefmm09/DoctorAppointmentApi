import React from 'react';
import { NavLink } from 'react-router-dom';
import { FiHome, FiUsers, FiCalendar, FiUser } from 'react-icons/fi';

const navLinks = [
  { label: 'Home', path: '/home', icon: <FiHome className="mr-2" /> },
  { label: 'Doctors', path: '/doctors', icon: <FiUsers className="mr-2" /> },
  { label: 'Appointments', path: '/my-appointments', icon: <FiCalendar className="mr-2" /> },
  { label: 'Profile', path: '/my-profile', icon: <FiUser className="mr-2" /> },
];

const PatientNavBar = () => (
  <nav className="bg-white shadow-sm border-b border-slate-100 flex items-center px-4 py-2 sticky top-0 z-10">
    <div className="flex gap-3 md:gap-6">
      {navLinks.map(link => (
        <NavLink
          key={link.path}
          to={link.path}
          className={({ isActive }) =>
            `text-sm md:text-base font-medium px-3 py-2 rounded-lg transition-colors flex items-center ${
              isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'
            }`
          }
        >
          {link.icon}
          {link.label}
        </NavLink>
      ))}
    </div>
  </nav>
);

export default PatientNavBar;
