import React, { useContext, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { DoctorContext } from '../../context/DoctorContext';
import { 
  FaUserMd, 
  FaCalendarAlt, 
  FaClipboardList, 
  FaCog, 
  FaSignOutAlt, 
  FaBars, 
  FaTimes,
  FaUserCircle,
  FaStar,
  FaRegClock,
  FaEnvelope,
  FaChevronDown,
  FaHeadset
} from 'react-icons/fa';
import ProfilePicture from '../../components/ProfilePicture';
import NotificationsBell from '../../components/NotificationsBell';

const DoctorHeader = () => {
  const { doctorProfile, handleLogout } = useContext(DoctorContext);
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  
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
  
  // Close mobile menu when location changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownOpen && !event.target.closest('.profile-dropdown')) {
        setProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileDropdownOpen]);
  
  // Get profile data
  const profilePicture = doctorProfile?.profilePicture || doctorProfile?.profileImageUrl || null;
  const firstName = doctorProfile?.firstName || '';
  const lastName = doctorProfile?.lastName || '';
  const fullName = `Dr. ${firstName} ${lastName}`.trim();
  
  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white shadow-md py-2' : 'bg-white py-3'}`}>
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center">
          {/* Logo and Title */}
          <div className="flex items-center">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg p-2 shadow-sm">
              <FaUserMd className="text-white text-xl" />
            </div>
            <div className="ml-3">
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
                MedConnect
              </h1>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">Doctor Portal</p>
            </div>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            <Link 
              to="/doctor/dashboard" 
              className={`px-4 py-2 rounded-lg transition-colors ${
                isActive('/doctor/dashboard') 
                  ? 'bg-blue-50 text-blue-700 font-medium' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              <FaClipboardList className="inline-block mr-2 mb-0.5" /> Dashboard
            </Link>
            <Link 
              to="/doctor/appointments" 
              className={`px-4 py-2 rounded-lg transition-colors ${
                isActive('/doctor/appointments') 
                  ? 'bg-blue-50 text-blue-700 font-medium' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              <FaCalendarAlt className="inline-block mr-2 mb-0.5" /> Appointments
            </Link>
            <Link 
              to="/doctor/availability" 
              className={`px-4 py-2 rounded-lg transition-colors ${
                isActive('/doctor/availability') 
                  ? 'bg-blue-50 text-blue-700 font-medium' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              <FaRegClock className="inline-block mr-2 mb-0.5" /> Availability
            </Link>
            <Link 
              to="/doctor/ratings" 
              className={`px-4 py-2 rounded-lg transition-colors ${
                isActive('/doctor/ratings') 
                  ? 'bg-blue-50 text-blue-700 font-medium' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              <FaStar className="inline-block mr-2 mb-0.5" /> Ratings
            </Link>
            <Link 
              to="/doctor/contacts" 
              className={`px-4 py-2 rounded-lg transition-colors ${
                isActive('/doctor/contacts') 
                  ? 'bg-blue-50 text-blue-700 font-medium' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              <FaEnvelope className="inline-block mr-2 mb-0.5" /> Messages
            </Link>
          </nav>
          
          {/* User Profile and Notifications - Desktop */}
          <div className="hidden lg:flex items-center space-x-3">
            {/* Notifications */}
            <NotificationsBell />
            
            {/* Profile Dropdown */}
            <div className="relative profile-dropdown">
              <button 
                className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors focus:outline-none"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              >
                <ProfilePicture 
                  imageUrl={profilePicture}
                  type="doctor"
                  className="h-8 w-8"
                  name={fullName}
                  doctorId={doctorProfile?.id || localStorage.getItem("doctorId")}
                />
                <span className="font-medium text-sm hidden md:inline-block max-w-[150px] truncate">
                  {fullName}
                </span>
                <FaChevronDown className="h-3 w-3 text-slate-400" />
              </button>
              
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg overflow-hidden z-50 border border-slate-200">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-medium text-slate-800">{fullName}</p>
                    <p className="text-xs text-slate-500 truncate">{doctorProfile?.email || 'No email'}</p>
                  </div>
                  <div className="py-1">
                    <Link 
                      to="/doctor/profile" 
                      className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center"
                    >
                      <FaCog className="mr-2 text-slate-500" /> Profile Settings
                    </Link>
                    <Link 
                      to="/contact" 
                      className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center"
                    >
                      <FaHeadset className="mr-2 text-slate-500" /> Support
                    </Link>
                  </div>
                  <div className="py-1 border-t border-slate-100">
                    <button 
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                    >
                      <FaSignOutAlt className="mr-2" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center">
            <div className="mr-2">
              <NotificationsBell />
            </div>
            <button 
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-800 focus:outline-none"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <FaTimes className="h-6 w-6" />
              ) : (
                <FaBars className="h-6 w-6" />
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
        style={{ top: '60px' }}
      >
        <div className="px-4 py-5 h-full overflow-y-auto">
          <div className="mb-6 flex items-center justify-center">
            <ProfilePicture 
              imageUrl={profilePicture}
              type="doctor"
              className="h-20 w-20 border-4 border-slate-100 shadow-sm"
              name={fullName}
              doctorId={doctorProfile?.id || localStorage.getItem("doctorId")}
            />
          </div>
          
          <p className="text-center text-slate-800 font-medium mb-1">
            {fullName}
          </p>
          <p className="text-center text-slate-500 text-sm mb-6">
            {doctorProfile?.specialization || 'Medical Doctor'}
          </p>
          
          <nav className="space-y-1">
            <Link 
              to="/doctor/dashboard" 
              className={`block px-4 py-3 rounded-lg transition-colors flex items-center ${
                isActive('/doctor/dashboard') 
                  ? 'bg-blue-50 text-blue-700 font-medium' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              <FaClipboardList className="mr-3 text-slate-400" /> Dashboard
            </Link>
            <Link 
              to="/doctor/appointments" 
              className={`block px-4 py-3 rounded-lg transition-colors flex items-center ${
                isActive('/doctor/appointments') 
                  ? 'bg-blue-50 text-blue-700 font-medium' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              <FaCalendarAlt className="mr-3 text-slate-400" /> Appointments
            </Link>
            <Link 
              to="/doctor/availability" 
              className={`block px-4 py-3 rounded-lg transition-colors flex items-center ${
                isActive('/doctor/availability') 
                  ? 'bg-blue-50 text-blue-700 font-medium' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              <FaRegClock className="mr-3 text-slate-400" /> Availability
            </Link>
            <Link 
              to="/doctor/ratings" 
              className={`block px-4 py-3 rounded-lg transition-colors flex items-center ${
                isActive('/doctor/ratings') 
                  ? 'bg-blue-50 text-blue-700 font-medium' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              <FaStar className="mr-3 text-slate-400" /> Ratings
            </Link>
            <Link 
              to="/doctor/contacts" 
              className={`block px-4 py-3 rounded-lg transition-colors flex items-center ${
                isActive('/doctor/contacts') 
                  ? 'bg-blue-50 text-blue-700 font-medium' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              <FaEnvelope className="mr-3 text-slate-400" /> Messages
            </Link>
            <Link 
              to="/doctor/profile" 
              className={`block px-4 py-3 rounded-lg transition-colors flex items-center ${
                isActive('/doctor/profile') 
                  ? 'bg-blue-50 text-blue-700 font-medium' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              <FaCog className="mr-3 text-slate-400" /> Profile
            </Link>
          </nav>
          
          <div className="mt-10 pt-6 border-t border-slate-200">
            <button 
              onClick={handleLogout}
              className="w-full bg-red-50 hover:bg-red-100 text-red-600 py-3 rounded-lg flex items-center justify-center text-sm transition-colors"
            >
              <FaSignOutAlt className="mr-2" /> Sign Out
            </button>
          </div>
        </div>
      </div>
      
      {/* Overlay for mobile menu */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        ></div>
      )}
      
      {/* Spacer to push content below fixed header */}
      <div className="h-16"></div>
    </header>
  );
};

export default DoctorHeader;