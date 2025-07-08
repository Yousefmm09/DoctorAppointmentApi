import React, { useContext, useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import ProfilePicture from "./ProfilePicture";
import DarkModeToggle from "./ui/DarkModeToggle";
import { motion, AnimatePresence } from "framer-motion";
import { FiMenu, FiX, FiHome, FiCalendar, FiUser, FiMessageSquare, FiStar } from "react-icons/fi";

const NavBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { token, logout, userData, userRole } = useContext(AppContext);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProfileMenu && !event.target.closest('.profile-menu-container')) {
        setShowProfileMenu(false);
      }
      
      if (showMenu && !event.target.closest('.mobile-menu-container')) {
        setShowMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileMenu, showMenu]);

  // Close mobile menu on navigation
  useEffect(() => {
    setShowMenu(false);
  }, [location.pathname]);

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/public/home');
  };

  // Animation variants
  const navbarVariants = {
    transparent: {
      backgroundColor: "rgba(255, 255, 255, 0.9)",
      boxShadow: "0 0 0 rgba(0, 0, 0, 0)",
    },
    solid: {
      backgroundColor: "rgba(255, 255, 255, 1)",
      boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
    }
  };

  // Get navigation links based on user role
  const getNavigationLinks = () => {
    // Define common links based on authentication status
    const commonLinks = [
      { label: 'HOME', path: token ? '/home' : '/public/home' },
      { label: 'ABOUT', path: token ? '/patient/about' : '/about' },
      { label: 'CONTACT', path: token ? '/patient/contact' : '/contact' },
    ];

    // Add role-specific links
    if (token) {
      switch (userRole) {
        case 'Doctor':
          return [
            ...commonLinks,
          ];
        case 'Admin':
          return [
            ...commonLinks,
          ];
        default: // Patient
          return [
            ...commonLinks,
            { label: 'ALL DOCTORS', path: '/doctors' },
          ];
      }
    }

    return commonLinks;
  };

  // Get profile menu items based on user role
  const getProfileMenuItems = () => {
    // Common menu items for all user roles
    const commonItems = [
      { label: 'Privacy & Data Settings', path: '/gdpr-settings', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' }
    ];
    
    switch (userRole) {
      case 'Doctor':
        return [
          { label: 'My Profile', path: '/doctor/profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
          { label: 'My Appointments', path: '/doctor/appointments', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
          { label: 'My Availability', path: '/doctor/availability', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
          ...commonItems
        ];
      case 'Admin':
        return [
          { label: 'Dashboard', path: '/admin/dashboard', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
          { label: 'Manage Doctors', path: '/admin/doctors', icon: 'M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
          { label: 'All Appointments', path: '/admin/appointments', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
          ...commonItems
        ];
      default:
        return [
          { label: 'My Profile', path: '/my-profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
          { label: 'My Appointments', path: '/my-appointments', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
          ...commonItems
        ];
    }
  };

  return (
    <motion.header
      className="bg-white border-b border-gray-200 h-16"
      initial="transparent"
      animate={scrolled ? "solid" : "transparent"}
      variants={navbarVariants}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <NavLink to={token ? getRedirectPath(userRole) : '/'} className="text-2xl font-bold text-indigo-600">
              TABEBAK
            </NavLink>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {getNavigationLinks().map((link, index) => (
              <NavLink
                key={index}
                to={link.path}
                className={({ isActive }) =>
                  isActive
                    ? "text-indigo-600 font-medium"
                    : "text-gray-700 hover:text-indigo-600 transition-colors"
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Auth Buttons or User Profile */}
          <div className="flex items-center">
            {/* Dark Mode Toggle */}
            <DarkModeToggle className="mr-4" />

            {/* Authentication Buttons or Profile */}
            {token ? (
              <div className="relative profile-menu-container">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center space-x-3 bg-gray-50 hover:bg-gray-100 transition-colors px-3 py-1.5 rounded-full"
                >
                  <ProfilePicture
                    imageUrl={userData?.profilePicture}
                    type={userRole === 'Doctor' ? 'doctor' : 'patient'}
                    className="w-8 h-8"
                    name={userData?.firstName || userData?.name || ''}
                    doctorId={userRole === 'Doctor' ? userData?.id || localStorage.getItem("doctorId") : null}
                    patientId={userRole !== 'Doctor' ? userData?.id || localStorage.getItem("patientId") : null}
                  />
                  <span className="text-sm font-medium text-gray-800 hidden md:inline-block">
                    {userRole === 'Doctor' ? 'Dr. ' : ''}
                    {userData?.firstName || userData?.name || 'User'}
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 hidden md:inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Profile Dropdown */}
                <AnimatePresence>
                  {showProfileMenu && (
                    <motion.div
                      className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      {/* User info section at top of dropdown */}
                      <div className="px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center">
                          <ProfilePicture
                            imageUrl={userData?.profilePicture}
                            type={userRole === 'Doctor' ? 'doctor' : 'patient'}
                            className="w-10 h-10"
                            name={userData?.firstName || userData?.name || ''}
                            doctorId={userRole === 'Doctor' ? userData?.id || localStorage.getItem("doctorId") : null}
                            patientId={userRole !== 'Doctor' ? userData?.id || localStorage.getItem("patientId") : null}
                          />
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">
                              {userRole === 'Doctor' ? 'Dr. ' : ''}
                              {userData?.firstName || ''} {userData?.lastName || ''}
                            </p>
                            <p className="text-xs text-gray-500 truncate max-w-[150px]">
                              {userData?.email || ''}
                            </p>
                          </div>
                        </div>
                      </div>

                      {getProfileMenuItems().map((item, index) => (
                        <NavLink
                          key={index}
                          to={item.path}
                          className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                          onClick={() => setShowProfileMenu(false)}
                        >
                          <div className="flex items-center">
                            <svg className="w-5 h-5 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
                            </svg>
                            {item.label}
                          </div>
                        </NavLink>
                      ))}

                      <hr className="my-1 border-gray-200" />
                      
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                      >
                        <div className="flex items-center text-red-500">
                          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Logout
                        </div>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <NavLink
                  to="/login"
                  className="text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Login
                </NavLink>
                <NavLink
                  to="/register"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
                >
                  Register
                </NavLink>
              </div>
            )}

            {/* Mobile Menu Button */}
            <div className="ml-4 md:hidden">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                {showMenu ? (
                  <FiX className="h-6 w-6" />
                ) : (
                  <FiMenu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            className="md:hidden mobile-menu-container"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-white shadow-lg border-t border-gray-200 absolute left-0 right-0 z-50">
              {/* Navigation Links */}
              <div className="px-4 py-3 space-y-1">
                {getNavigationLinks().map((link, index) => (
                  <NavLink
                    key={index}
                    to={link.path}
                    className={({ isActive }) =>
                      `block px-3 py-2 rounded-md ${
                        isActive
                          ? "bg-indigo-50 text-indigo-600 font-medium"
                          : "text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
              </div>

              {/* Mobile Menu Actions */}
              {token ? (
                <div className="border-t border-gray-200 px-4 py-3">
                  {/* User Info */}
                  <div className="flex items-center px-3 py-2">
                    <ProfilePicture
                      imageUrl={userData?.profilePicture}
                      type={userRole === 'Doctor' ? 'doctor' : 'patient'}
                      className="w-10 h-10"
                      name={userData?.firstName || userData?.name || ''}
                      doctorId={userRole === 'Doctor' ? userData?.id || localStorage.getItem("doctorId") : null}
                      patientId={userRole !== 'Doctor' ? userData?.id || localStorage.getItem("patientId") : null}
                    />
                    <div className="ml-3">
                      <div className="text-base font-medium text-gray-800">
                        {userRole === 'Doctor' ? 'Dr. ' : ''}
                        {userData?.firstName || ''} {userData?.lastName || ''}
                      </div>
                      <div className="text-sm font-medium text-gray-500 truncate max-w-[200px]">
                        {userData?.email || ''}
                      </div>
                    </div>
                  </div>

                  {/* Profile Menu Items */}
                  <div className="mt-3 space-y-1">
                    {getProfileMenuItems().map((item, index) => (
                      <NavLink
                        key={index}
                        to={item.path}
                        className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
                      >
                        <div className="flex items-center">
                          <svg className="w-5 h-5 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
                          </svg>
                          {item.label}
                        </div>
                      </NavLink>
                    ))}

                    {/* Logout Button */}
                    <button
                      onClick={handleLogout}
                      className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50"
                    >
                      <div className="flex items-center">
                        <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Logout
                      </div>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border-t border-gray-200 px-4 py-3 flex flex-col space-y-2">
                  <NavLink
                    to="/login"
                    className="block w-full text-center px-4 py-2 text-indigo-600 border border-indigo-600 rounded-md font-medium hover:bg-indigo-50"
                  >
                    Login
                  </NavLink>
                  <NavLink
                    to="/register"
                    className="block w-full text-center px-4 py-2 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700"
                  >
                    Register
                  </NavLink>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
};

// Function to determine redirect path based on user role
const getRedirectPath = (userRole) => {
  switch (userRole) {
    case 'Doctor':
      return '/doctor/dashboard';
    case 'Admin':
      return '/admin/dashboard';
    case 'Patient':
      return '/home';
    default:
      return '/';
  }
};

export default NavBar;
