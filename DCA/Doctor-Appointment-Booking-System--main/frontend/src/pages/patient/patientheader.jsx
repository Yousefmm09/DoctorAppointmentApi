import React, { useContext, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { PatientContext } from '../../context/PatientContext';
import { 
  FiHome,
  FiCalendar,
  FiClipboardCheck,
  FiSettings,
  FiLogOut,
  FiMenu,
  FiX,
  FiUser,
  FiMessageSquare
} from 'react-icons/fi';
import ProfilePicture from '../../components/ProfilePicture';
import NotificationsBell from '../../components/NotificationsBell';

const PatientHeader = () => {
  const { userData } = useContext(AppContext);
  const { patientProfile, handleLogout } = useContext(PatientContext);
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  // Handle window scroll for header styling
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Get profile data
  const profilePicture = patientProfile?.profilePicture || userData?.profilePicture || null;
  const firstName = patientProfile?.firstName || userData?.firstName || '';
  const lastName = patientProfile?.lastName || userData?.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim() || 'Patient';
  
  const isActive = (path) => {
    return location.pathname === path ? 'text-blue-600 border-blue-600 font-medium' : 'text-slate-600 hover:text-blue-600 hover:border-blue-500';
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white shadow-sm py-2' : 'bg-white/95 py-3'}`}>
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center">
          {/* Logo and Title */}
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-full p-2 shadow-sm">
              <FiUser className="text-white text-xl" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-800">
                MedConnect
              </h1>
              <p className="text-xs text-slate-500 hidden sm:block">Patient Portal</p>
            </div>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            <Link 
              to="/home" 
              className={`border-b-2 pb-1 transition-colors duration-200 flex items-center ${isActive('/home')}`}
            >
              <FiHome className="mr-2" /> Home
            </Link>
            <Link 
              to="/appointment" 
              className={`border-b-2 pb-1 transition-colors duration-200 flex items-center ${isActive('/appointment')}`}
            >
              <FiCalendar className="mr-2" /> Book Appointment
            </Link>
            <Link 
              to="/my-appointments" 
              className={`border-b-2 pb-1 transition-colors duration-200 flex items-center ${isActive('/my-appointments')}`}
            >
              <FiClipboardCheck className="mr-2" /> My Appointments
            </Link>
            <Link 
              to="/patient/contacts" 
              className={`border-b-2 pb-1 transition-colors duration-200 flex items-center ${isActive('/patient/contacts')}`}
            >
              <FiMessageSquare className="mr-2" /> Messages
            </Link>
            <Link 
              to="/my-profile" 
              className={`border-b-2 pb-1 transition-colors duration-200 flex items-center ${isActive('/my-profile')}`}
            >
              <FiSettings className="mr-2" /> My Profile
            </Link>
          </nav>
          
          {/* User Profile and Logout - Desktop */}
          <div className="hidden lg:flex items-center space-x-4">
            <div className="relative">
              <NotificationsBell />
            </div>
            
            <div className="h-8 w-px bg-slate-200 mx-1"></div>
            
            <button 
              onClick={handleLogout}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg flex items-center text-sm transition-colors"
            >
              <FiLogOut className="mr-1.5" /> Logout
            </button>
            
            <div className="flex items-center">
              <div className="mr-3 text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-800">{fullName}</p>
                <p className="text-xs text-slate-500">Patient</p>
              </div>
              <ProfilePicture 
                imageUrl={profilePicture}
                type="patient"
                className="h-9 w-9 ring-2 ring-slate-100"
                name={fullName}
              />
            </div>
          </div>
          
          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center">
            <div className="mr-3">
              <NotificationsBell />
            </div>
            
            <button 
              className="p-1.5 rounded text-slate-700 hover:bg-slate-100 focus:outline-none transition-colors"
              onClick={toggleMobileMenu}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <FiX className="h-6 w-6" />
              ) : (
                <FiMenu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu */}
      <div 
        className={`fixed inset-0 z-40 bg-white transform transition-transform duration-300 ease-in-out lg:hidden ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ top: '70px' }}
      >
        <div className="px-6 py-6 h-full overflow-y-auto">
          <div className="mb-8 flex items-center justify-center">
            <ProfilePicture 
              imageUrl={profilePicture}
              type="patient"
              className="h-20 w-20 ring-4 ring-slate-100"
              name={fullName}
            />
          </div>
          
          <p className="text-center text-slate-800 font-semibold mb-1">
            {fullName}
          </p>
          <p className="text-center text-slate-500 text-sm mb-8">
            Patient
          </p>
          
          <nav className="space-y-1.5">
            <Link 
              to="/home" 
              className={`block px-4 py-3 rounded-lg transition-colors duration-200 flex items-center ${
                isActive('/home') ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'
              }`}
              onClick={closeMobileMenu}
            >
              <FiHome className="mr-3" /> Home
            </Link>
            <Link 
              to="/appointment" 
              className={`block px-4 py-3 rounded-lg transition-colors duration-200 flex items-center ${
                isActive('/appointment') ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'
              }`}
              onClick={closeMobileMenu}
            >
              <FiCalendar className="mr-3" /> Book Appointment
            </Link>
            <Link 
              to="/my-appointments" 
              className={`block px-4 py-3 rounded-lg transition-colors duration-200 flex items-center ${
                isActive('/my-appointments') ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'
              }`}
              onClick={closeMobileMenu}
            >
              <FiClipboardCheck className="mr-3" /> My Appointments
            </Link>
            <Link 
              to="/patient/contacts" 
              className={`block px-4 py-3 rounded-lg transition-colors duration-200 flex items-center ${
                isActive('/patient/contacts') ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'
              }`}
              onClick={closeMobileMenu}
            >
              <FiMessageSquare className="mr-3" /> Messages
            </Link>
            <Link 
              to="/my-profile" 
              className={`block px-4 py-3 rounded-lg transition-colors duration-200 flex items-center ${
                isActive('/my-profile') ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'
              }`}
              onClick={closeMobileMenu}
            >
              <FiSettings className="mr-3" /> My Profile
            </Link>
          </nav>
          
          <div className="mt-10 pt-6 border-t border-slate-200">
            <button 
              onClick={handleLogout}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center justify-center text-sm transition-colors"
            >
              <FiLogOut className="mr-2" /> Logout
            </button>
          </div>
        </div>
      </div>
      
      {/* Overlay for mobile menu */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-30 lg:hidden"
          onClick={closeMobileMenu}
        ></div>
      )}
      
      {/* Spacer to push content below fixed header */}
      <div className="h-16"></div>
    </header>
  );
};

export default PatientHeader;
