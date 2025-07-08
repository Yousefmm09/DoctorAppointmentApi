import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { FiHome, FiCalendar, FiUser, FiMessageSquare, FiClipboardCheck, FiSettings, FiLogOut } from 'react-icons/fi';
import { AppContext } from '../../context/AppContext';
import { PatientContext } from '../../context/PatientContext';
import ProfilePicture from '../../components/ProfilePicture';

const patientMenuItems = [
  { title: 'Dashboard', path: '/patient/dashboard', icon: <FiHome className="w-5 h-5" /> },
  { title: 'Appointments', path: '/my-appointments', icon: <FiCalendar className="w-5 h-5" /> },
  { title: 'Messages', path: '/patient/contacts', icon: <FiMessageSquare className="w-5 h-5" /> },
  { title: 'My Profile', path: '/my-profile', icon: <FiUser className="w-5 h-5" /> },
];

const PatientSidebar = () => {
  const { userData } = useContext(AppContext);
  const { patientProfile, handleLogout } = useContext(PatientContext);
  
  // Get profile picture and name data
  const profilePicture = patientProfile?.profilePicture || userData?.profilePicture || null;
  const firstName = patientProfile?.firstName || userData?.firstName || '';
  const lastName = patientProfile?.lastName || userData?.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim() || 'Patient';
  const email = userData?.email || patientProfile?.email || '';
  const patientId = patientProfile?.id || userData?.id || localStorage.getItem('patientId');
  
  return (
    <aside className="w-64 bg-white border-r border-slate-100 shadow-sm flex flex-col min-h-screen">
      {/* User Info Header */}
      <div className="p-6 border-b border-gray-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <ProfilePicture 
              imageUrl={profilePicture}
              type="patient"
              className="w-20 h-20 border-4 border-white shadow"
              name={fullName}
              patientId={patientId}
            />
            <div className="absolute bottom-1 right-1 w-4 h-4 border-2 border-white rounded-full bg-green-400"></div>
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-gray-900 text-lg">{fullName}</h3>
            <p className="text-sm text-gray-500 mt-1">{email}</p>
            <div className="mt-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Patient
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 py-4">
        <div className="px-4 mb-2 text-xs font-medium text-slate-400 uppercase tracking-wider">Menu</div>
        <ul className="space-y-1 px-3">
          {patientMenuItems.map(item => (
            <li key={item.title}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                    isActive ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-50 text-slate-600'
                  }`
                }
              >
                {item.icon}
                <span>{item.title}</span>
              </NavLink>
            </li>
          ))}
        </ul>
        
        <div className="px-4 pt-6 mt-4 mb-2 text-xs font-medium text-slate-400 uppercase tracking-wider border-t border-slate-100">
          Support
        </div>
        
        <ul className="space-y-1 px-3">
          <li>
            <NavLink
              to="/help"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                  isActive ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-50 text-slate-600'
                }`
              }
            >
              <FiSettings className="w-5 h-5" />
              <span>Help & Settings</span>
            </NavLink>
          </li>
        </ul>
      </nav>
      
      {/* Footer with Logout */}
      <div className="p-4 border-t border-slate-100">
        <button 
          onClick={handleLogout} 
          className="flex items-center gap-3 px-4 py-2.5 w-full text-left rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <FiLogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
        
        <div className="mt-4 text-center text-xs text-gray-500">
          <p>© 2023 Tabebak</p>
          <p className="mt-1">All rights reserved</p>
        </div>
      </div>
    </aside>
  );
};

export default PatientSidebar;
