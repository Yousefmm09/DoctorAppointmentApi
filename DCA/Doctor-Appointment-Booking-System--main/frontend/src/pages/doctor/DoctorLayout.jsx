import React, { useContext, useEffect, useState } from "react";
import { Outlet, Navigate, useLocation, Link } from "react-router-dom";
import { DoctorContext } from "../../context/DoctorContext";
import { 
  FaUserMd, 
  FaCalendarAlt, 
  FaSignOutAlt,
  FaTachometerAlt,
  FaRegClock,
  FaStar,
  FaEnvelope,
  FaBars,
  FaTimes,
  FaUserCog,
  FaBell,
  FaClinicMedical,
  FaRegQuestionCircle,
  FaCog,
  FaChartLine
} from 'react-icons/fa';
import { MdOutlineMenuOpen } from "react-icons/md";
import ProfilePicture from '../../components/ProfilePicture';
import Notifications from '../../components/Notifications';

const DoctorLayout = ({ menuItems }) => {
  const { token, isAuthenticated, doctorProfile, getDoctorProfile, handleLogout } = useContext(DoctorContext);
  const [isLoading, setIsLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const [shouldRedirect, setShouldRedirect] = useState(false);
  
  // Check authentication status once
  useEffect(() => {
    if (authChecked) return; // Only run once
    
    const verifyDoctorAuth = async () => {
      console.log("Checking doctor authentication...");
      try {
        // Check if localStorage has valid doctor data
        const storedToken = localStorage.getItem('token');
        const userRole = localStorage.getItem('userRole');
        const storedUserId = localStorage.getItem('userId');
        const storedDoctorId = localStorage.getItem('doctorId');
        
        if (!storedToken || userRole !== 'Doctor') {
          console.log("No valid doctor token in localStorage");
          setShouldRedirect(true);
          setAuthChecked(true);
          setIsLoading(false);
          return;
        }
        
        // Log available IDs for debugging
        if (storedUserId) {
          console.log("Found userId in localStorage:", storedUserId);
        }
        
        if (storedDoctorId) {
          console.log("Found doctorId in localStorage:", storedDoctorId);
        } else {
          console.log("No doctorId found in localStorage");
        }
        
        // If we don't have a doctor profile yet, try to fetch it
        if (!doctorProfile) {
          try {
            // Attempt to load doctor profile using API
            console.log("Attempting to load doctor profile");
            const profile = await getDoctorProfile();
            console.log("Profile loaded:", profile ? "success" : "failed");
          } catch (error) {
            console.error("Failed to load doctor profile:", error);
          }
        } else {
          console.log("Doctor profile already loaded in context");
        }
      } catch (error) {
        console.error("Error in doctor authentication check:", error);
      } finally {
        setAuthChecked(true);
        setIsLoading(false);
      }
    };

    verifyDoctorAuth();
  }, [doctorProfile, getDoctorProfile, authChecked]);

  const isActive = (path) => {
    return location.pathname === path;
  };

  // If loading, show a loading spinner
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex justify-center items-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
          <p className="mt-6 text-lg text-gray-600 font-medium">Loading doctor dashboard...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated as a doctor
  if (shouldRedirect || !token || !isAuthenticated || localStorage.getItem('userRole') !== 'Doctor') {
    console.log("Not authenticated, redirecting to login");
    return <Navigate to="/doctor/login" state={{ from: location }} replace />;
  }

  // If all checks pass, render the doctor layout
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
      
      {/* Sidebar Navigation - Modern Style */}
      <aside className={`
        fixed top-0 left-0 z-30 h-screen w-72 bg-white border-r border-slate-200
        text-slate-700 transition-transform duration-300 ease-in-out transform shadow-lg
        lg:translate-x-0 lg:static lg:h-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar Header with Logo */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg p-2 shadow-md">
              <FaUserMd className="text-white text-xl" />
            </div>
            <div className="ml-3">
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
                MedConnect
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Doctor Portal
              </p>
            </div>
            
            {/* Close button - mobile only */}
            <button 
              onClick={() => setSidebarOpen(false)}
              className="ml-auto p-1 text-slate-400 hover:text-slate-600 lg:hidden"
            >
              <FaTimes />
            </button>
          </div>
        </div>
        
        {/* Doctor Profile Summary */}
        <div className="p-6 flex flex-col items-center border-b border-slate-200">
          <div className="relative">
            <ProfilePicture 
              imageUrl={doctorProfile?.profilePicture || doctorProfile?.profileImageUrl}
              type="doctor"
              className="h-20 w-20 border-4 border-white shadow-md"
              name={doctorProfile ? `${doctorProfile.firstName} ${doctorProfile.lastName}` : 'Doctor'}
              doctorId={doctorProfile?.id || localStorage.getItem("doctorId")}
            />
            <div className="absolute bottom-0 right-0 h-4 w-4 bg-green-500 rounded-full border-2 border-white"></div>
          </div>
          <h2 className="mt-3 text-lg font-semibold text-slate-800">
            Dr. {doctorProfile?.firstName} {doctorProfile?.lastName}
          </h2>
          <p className="text-sm text-slate-500">
            {doctorProfile?.specialization || 'Medical Doctor'}
          </p>
          <div className="mt-2 text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
            Online
          </div>
        </div>
        
        {/* Navigation Links */}
        <nav className="px-4 py-6">
          <div className="text-xs uppercase text-slate-500 font-semibold px-3 mb-4">Main Menu</div>
          <ul className="space-y-1">
            <li>
              <Link 
                to="/doctor/dashboard" 
                className={`flex items-center px-3 py-3 rounded-lg transition-all ${
                  isActive('/doctor/dashboard') 
                    ? 'bg-blue-50 text-blue-700 font-medium' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <FaTachometerAlt className={`mr-3 ${isActive('/doctor/dashboard') ? 'text-blue-600' : 'text-slate-400'}`} /> 
                <span>Dashboard</span>
              </Link>
            </li>
            <li>
              <Link 
                to="/doctor/appointments" 
                className={`flex items-center px-3 py-3 rounded-lg transition-all ${
                  isActive('/doctor/appointments') 
                    ? 'bg-blue-50 text-blue-700 font-medium' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <FaCalendarAlt className={`mr-3 ${isActive('/doctor/appointments') ? 'text-blue-600' : 'text-slate-400'}`} /> 
                <span>Appointments</span>
              </Link>
            </li>
            <li>
              <Link 
                to="/doctor/availability" 
                className={`flex items-center px-3 py-3 rounded-lg transition-all ${
                  isActive('/doctor/availability') 
                    ? 'bg-blue-50 text-blue-700 font-medium' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <FaRegClock className={`mr-3 ${isActive('/doctor/availability') ? 'text-blue-600' : 'text-slate-400'}`} /> 
                <span>Availability</span>
              </Link>
            </li>
            <li>
              <Link 
                to="/doctor/ratings" 
                className={`flex items-center px-3 py-3 rounded-lg transition-all ${
                  isActive('/doctor/ratings') 
                    ? 'bg-blue-50 text-blue-700 font-medium' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <FaStar className={`mr-3 ${isActive('/doctor/ratings') ? 'text-blue-600' : 'text-slate-400'}`} /> 
                <span>Ratings & Reviews</span>
              </Link>
            </li>
            <li>
              <Link 
                to="/doctor/contacts" 
                className={`flex items-center px-3 py-3 rounded-lg transition-all ${
                  isActive('/doctor/contacts') 
                    ? 'bg-blue-50 text-blue-700 font-medium' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <FaEnvelope className={`mr-3 ${isActive('/doctor/contacts') ? 'text-blue-600' : 'text-slate-400'}`} /> 
                <span>Messages</span>
              </Link>
            </li>
          </ul>
          
          <div className="text-xs uppercase text-slate-500 font-semibold px-3 mt-8 mb-4">Account</div>
          <ul className="space-y-1">
            <li>
              <Link 
                to="/doctor/profile" 
                className={`flex items-center px-3 py-3 rounded-lg transition-all ${
                  isActive('/doctor/profile') 
                    ? 'bg-blue-50 text-blue-700 font-medium' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <FaUserCog className={`mr-3 ${isActive('/doctor/profile') ? 'text-blue-600' : 'text-slate-400'}`} /> 
                <span>Profile Settings</span>
              </Link>
            </li>
          </ul>
        </nav>
        
        {/* Logout Button */}
        <div className="mt-auto p-6 border-t border-slate-200">
          <button 
            onClick={handleLogout}
            className="w-full bg-red-50 text-red-600 hover:bg-red-100 py-3 px-4 rounded-lg flex items-center justify-center transition-colors"
          >
            <FaSignOutAlt className="mr-2" /> Sign Out
          </button>
        </div>
      </aside>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* Top Header Bar */}
        <header className="bg-white shadow-sm py-3 px-6 flex items-center justify-between sticky top-0 z-10">
          {/* Left Section: Mobile Menu Toggle & Page Title */}
          <div className="flex items-center">
            {/* Mobile Menu Toggle */}
            <button 
              className="lg:hidden flex items-center justify-center w-10 h-10 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? (
                <FaTimes className="h-5 w-5" />
              ) : (
                <MdOutlineMenuOpen className="h-6 w-6" />
              )}
            </button>
            
            {/* Page Title - Desktop */}
            <div className="hidden md:block ml-4">
              <h1 className="text-xl font-semibold text-slate-800">
                Welcome, Dr. {doctorProfile?.firstName} {doctorProfile?.lastName}
              </h1>
              <p className="text-sm text-slate-500">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          
          {/* Right Section: Actions & Profile */}
          <div className="flex items-center space-x-4">
            {/* Notifications - Replace with our component */}
            <Notifications />
            
            {/* Settings */}
            <Link 
              to="/doctor/profile" 
              className="p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none"
            >
              <FaCog className="h-5 w-5" />
            </Link>
            
            {/* Help */}
            <button 
              className="p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none hidden md:block"
            >
              <FaRegQuestionCircle className="h-5 w-5" />
            </button>
            
            {/* Profile Menu */}
            <div className="flex items-center">
              <ProfilePicture 
                imageUrl={doctorProfile?.profilePicture || doctorProfile?.profileImageUrl}
                type="doctor"
                className="h-10 w-10 border-2 border-white shadow-sm"
                name={doctorProfile ? `${doctorProfile.firstName} ${doctorProfile.lastName}` : 'Doctor'}
                doctorId={doctorProfile?.id || localStorage.getItem("doctorId")}
              />
            </div>
          </div>
        </header>
        
        {/* Main Content Area */}
        <main className="flex-1 p-6 overflow-y-auto bg-slate-50">
          <Outlet />
        </main>
        
        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 py-4 px-6">
          <div className="text-center text-slate-500 text-sm">
            &copy; {new Date().getFullYear()} MedConnect Doctor Portal. All rights reserved.
          </div>
        </footer>
      </div>
    </div>
  );
};

export default DoctorLayout; 