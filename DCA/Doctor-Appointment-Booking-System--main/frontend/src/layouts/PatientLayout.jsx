import React, { useContext, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { AppContext } from '../context/AppContext';
import { FiHome, FiUsers, FiCalendar, FiStar, FiUser, FiMessageCircle, FiPhone } from 'react-icons/fi';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';
import NotificationComponent from '../components/NotificationComponent';

const PatientLayout = () => {
  const { userData, token, userRole } = useContext(AppContext);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Define menu items for patient sidebar
  const PATIENT_MENU_ITEMS = [
    { 
      title: 'Home', 
      path: '/home', 
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' 
    },
    { 
      title: 'Find Doctors', 
      path: '/doctors', 
      icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' 
    },
    { 
      title: 'My Appointments', 
      path: '/my-appointments', 
      icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' 
    },
    { 
      title: 'Doctor Ratings', 
      path: '/my-doctor-ratings', 
      icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' 
    },
    { 
      title: 'My Profile', 
      path: '/my-profile', 
      icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' 
    },
    { 
      title: 'Messages', 
      path: '/patient/messages', 
      icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' 
    },
    { 
      title: 'Contacts', 
      path: '/patient/contacts', 
      icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' 
    }
  ];

  // Check if user is authenticated as a patient
  useEffect(() => {
    if (!token || userRole !== 'Patient') {
      navigate('/login', { 
        state: { 
          message: 'Please log in as a patient to access this page'
        } 
      });
    }
  }, [token, userRole, navigate]);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top Navigation - Fixed at top */}
      <div className="sticky top-0 z-50 w-full">
        <div className="relative">
          <NavBar />
          <div className="absolute right-16 top-5 md:right-20 md:top-5">
            <NotificationComponent />
          </div>
        </div>
      </div>
      
      <div className="flex flex-1 pt-0 w-full">
        {/* Sidebar - Fixed height and scrollable */}
        <div className="hidden md:block w-64 h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto bg-white border-r border-gray-200 shadow-sm">
          <Sidebar menuItems={PATIENT_MENU_ITEMS} />
        </div>
        
        {/* Main Content - Takes remaining space and scrollable */}
        <div className="flex-1 overflow-auto bg-gray-50 min-h-[calc(100vh-4rem)]">
          <Outlet />
        </div>
      </div>
      
      {/* Footer - Only show on certain pages */}
      {!location.pathname.includes('/my-appointments') && (
        <Footer />
      )}
    </div>
  );
};

export default PatientLayout; 