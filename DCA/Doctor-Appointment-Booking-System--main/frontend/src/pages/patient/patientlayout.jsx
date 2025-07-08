import React, { useContext, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import PatientHeader from './patientheader';
import PatientSidebar from './PatientSidebar';
import { AppContext } from '../../context/AppContext';
import { PatientContext } from '../../context/PatientContext';
import { FiUser, FiCalendar, FiChevronRight, FiX, FiBell } from 'react-icons/fi';

const PatientLayout = () => {
  const location = useLocation();
  const { userData } = useContext(AppContext);
  const { patientProfile } = useContext(PatientContext);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(true);
  
  // Hide welcome banner after 5 seconds
  useEffect(() => {
    if (showWelcomeBanner) {
      const timer = setTimeout(() => {
        setShowWelcomeBanner(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [showWelcomeBanner]);
  
  // Get patient name
  const getPatientName = () => {
    if (patientProfile?.firstName) {
      return `${patientProfile.firstName} ${patientProfile.lastName || ''}`;
    } else if (userData?.firstName) {
      return `${userData.firstName} ${userData.lastName || ''}`;
    }
    return 'Patient';
  };
  
  // Get page title based on current route
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/home':
        return 'Dashboard';
      case '/appointment':
        return 'Book Appointment';
      case '/my-appointments':
        return 'My Appointments';
      case '/my-profile':
        return 'My Profile';
      case '/patient/contacts':
        return 'Messages';
      default:
        return 'Patient Portal';
    }
  };
  
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <PatientHeader />
      
      <div className="flex flex-1 pt-16">
        <PatientSidebar />
        
        <main className="flex-1 p-6 md:p-8 max-w-7xl">
          {/* Welcome Banner */}
          {showWelcomeBanner && (
            <div className="mb-6 relative">
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-5 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="bg-blue-50 p-3 rounded-lg mr-4 hidden sm:flex">
                      <FiUser className="text-blue-500 text-xl" />
                    </div>
                    <div>
                      <h2 className="text-slate-800 text-lg font-medium">Welcome, {getPatientName()}</h2>
                      <p className="text-slate-500 text-sm mt-1">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <span className="bg-blue-50 text-blue-600 text-xs font-medium px-2.5 py-1 rounded-full hidden sm:inline-flex items-center mr-3">
                      <FiBell className="mr-1" size={12} />
                      2 Notifications
                    </span>
                    
                    <button 
                      onClick={() => setShowWelcomeBanner(false)}
                      className="text-slate-400 hover:text-slate-500 p-1 rounded-full hover:bg-slate-100 transition-colors"
                      aria-label="Close welcome banner"
                    >
                      <FiX size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Page Header */}
          <div className="mb-6">
            <div className="flex items-center text-sm text-slate-500 mb-2">
              <span>Patient Portal</span>
              <FiChevronRight className="mx-2 text-slate-300 text-xs" />
              <span className="font-medium text-slate-700">{getPageTitle()}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800">{getPageTitle()}</h1>
          </div>
          
          {/* Page Content */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-8">
            <Outlet />
          </div>
          
          {/* Footer */}
          <footer className="mt-auto pt-6 pb-8 border-t border-slate-200">
            <div className="max-w-7xl mx-auto px-4">
              <div className="md:flex md:items-center md:justify-between">
                <div className="flex justify-center md:order-2 space-x-6">
                  <a href="#" className="text-slate-400 hover:text-slate-600 text-sm">Privacy Policy</a>
                  <a href="#" className="text-slate-400 hover:text-slate-600 text-sm">Terms of Service</a>
                  <a href="#" className="text-slate-400 hover:text-slate-600 text-sm">Contact Support</a>
                </div>
                <div className="mt-8 md:mt-0 md:order-1">
                  <p className="text-center text-sm text-slate-400">
                    &copy; {new Date().getFullYear()} MedConnect. All rights reserved.
                  </p>
                </div>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default PatientLayout;
