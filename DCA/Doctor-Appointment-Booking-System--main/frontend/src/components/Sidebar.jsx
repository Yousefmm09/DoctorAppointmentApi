import React, { useContext, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import ProfilePicture from './ProfilePicture'

const Sidebar = ({ menuItems = [] }) => {
  const location = useLocation()
  const { userData, userRole } = useContext(AppContext)

  // Add debugging log
  useEffect(() => {
    console.log("Sidebar rendered with menuItems:", menuItems);
    console.log("Sidebar userData:", userData);
    console.log("User role:", userRole);
  }, [userData, userRole, menuItems]);

  // If no menu items are provided, don't render the sidebar
  if (!menuItems.length) {
    console.warn("No menu items provided to Sidebar component");
    return null;
  }

  // Get user's display name
  const getDisplayName = () => {
    if (!userData) return 'User';
    
    const firstName = userData.firstName || '';
    const lastName = userData.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();
    
    if (fullName) {
      return userRole === 'Doctor' ? `Dr. ${fullName}` : fullName;
    }
    
    return userRole === 'Doctor' ? 'Doctor' : 'User';
  };

  // Get user's email with fallback
  const getEmail = () => {
    return userData?.email || localStorage.getItem('userEmail') || '';
  };

  // Get profile picture data
  const profilePicture = userData?.profilePicture || userData?.profileImageUrl || null;
  const userId = userData?.id || localStorage.getItem('userId');
  const doctorId = userRole === 'Doctor' ? userId || localStorage.getItem('doctorId') : null;
  const patientId = userRole !== 'Doctor' ? userId || localStorage.getItem('patientId') : null;

  return (
    <div className="h-full w-full bg-white overflow-y-auto flex flex-col">
      {/* User Info */}
      <div className="p-6 border-b border-gray-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <ProfilePicture 
              imageUrl={profilePicture}
              type={userRole === 'Doctor' ? 'doctor' : 'patient'}
              className="w-20 h-20 border-4 border-white shadow"
              name={getDisplayName()}
              doctorId={doctorId}
              patientId={patientId}
            />
            <div className="absolute bottom-1 right-1 w-4 h-4 border-2 border-white rounded-full bg-green-400"></div>
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-gray-900 text-lg">
              {getDisplayName()}
            </h3>
            <p className="text-sm text-gray-500 mt-1">{getEmail()}</p>
            <div className="mt-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {userRole || 'User'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map((item, index) => (
            <li key={index}>
              <NavLink
                to={item.path}
                className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-3 rounded-md transition-colors
                  ${isActive 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-100'
                  }
                `}
              >
                <svg 
                  className="w-5 h-5" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d={item.icon} 
                  />
                </svg>
                <span>{item.title}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      
      {/* Footer area */}
      <div className="p-4 border-t border-gray-200 text-center text-xs text-gray-500">
        <p>© 2023 Tabebak</p>
        <p className="mt-1">All rights reserved</p>
      </div>
    </div>
  )
}

export default Sidebar