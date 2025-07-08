import React, { useContext, useEffect, useState } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { AdminContext } from '../../context/AdminContext';
import { 
  FaHome, 
  FaCalendarAlt, 
  FaUserMd, 
  FaUserPlus, 
  FaBars, 
  FaTimes, 
  FaSignOutAlt, 
  FaUserShield,
  FaStethoscope
} from 'react-icons/fa';
import NotificationsBell from '../../components/NotificationsBell';

const AdminLayout = () => {
  const { isAuthenticated, handleLogout, authChecked } = useContext(AdminContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [redirectAttempted, setRedirectAttempted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Use useEffect to handle redirection once, with proper dependencies
  useEffect(() => {
    // Only redirect if authentication check is complete and user is not authenticated
    if (authChecked && !isAuthenticated && !redirectAttempted) {
      console.log('AdminLayout: Not authenticated, redirecting to login');
      setRedirectAttempted(true);
      navigate('/admin/login', { replace: true });
    }
  }, [isAuthenticated, authChecked, navigate, redirectAttempted]);

  // If still loading authentication status, show loading indicator
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-300">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // If not authenticated but redirection has been attempted, show a message
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 border border-gray-700 text-gray-200 px-6 py-8 rounded-xl max-w-md w-full">
          <div className="flex items-center justify-center text-yellow-500 mb-4">
            <FaUserShield size={48} />
          </div>
          <h2 className="text-2xl font-bold text-center text-white mb-2">Authentication Required</h2>
          <p className="text-center text-gray-400 mb-6">You need to be logged in as an admin to access this page.</p>
          <button 
            onClick={() => navigate('/admin/login', { replace: true })}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const menuItems = [
    { title: 'Dashboard', path: '/admin/dashboard', icon: <FaHome className="h-5 w-5" /> },
    { title: 'Appointments', path: '/admin/appointments', icon: <FaCalendarAlt className="h-5 w-5" /> },
    { title: 'Doctors', path: '/admin/doctors', icon: <FaUserMd className="h-5 w-5" /> },
    { title: 'Add Specialization', path: '/admin/add-specialization', icon: <FaStethoscope className="h-5 w-5" /> }
  ];

  // Function for debugging
  const debugLogout = () => {
    console.log('Logout button clicked');
    console.log('Before logout - Token:', localStorage.getItem('token'));
    console.log('Before logout - Role:', localStorage.getItem('userRole'));
    
    // Call the context's logout function
    handleLogout();
    
    console.log('After logout - Token:', localStorage.getItem('token'));
    console.log('After logout - Role:', localStorage.getItem('userRole'));
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Top Navigation */}
      <nav className="bg-white shadow-sm z-10">
        <div className="max-w-full mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button 
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 md:hidden"
              >
                {sidebarOpen ? <FaTimes className="h-6 w-6" /> : <FaBars className="h-6 w-6" />}
              </button>
              <div className="flex items-center ml-2 md:ml-6">
                <div className="bg-blue-600 text-white p-2 rounded-md mr-2">
                  <FaUserShield className="h-5 w-5" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">Admin Portal</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <NotificationsBell />
              <button
                onClick={debugLogout}
                className="flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition duration-150"
              >
                <FaSignOutAlt className="mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar for mobile */}
        <div 
          className={`fixed inset-0 z-40 md:hidden transition-opacity duration-300 ${
            sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="absolute inset-0 bg-gray-600 opacity-75" onClick={() => setSidebarOpen(false)}></div>
          <div className="fixed inset-y-0 left-0 flex flex-col w-64 bg-white shadow-lg">
            <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-blue-600">Navigation</h2>
              <button 
                onClick={() => setSidebarOpen(false)} 
                className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              >
                <FaTimes className="h-6 w-6" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto pt-4 px-2 space-y-1">
              {menuItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`group flex items-center px-4 py-3 text-sm font-medium rounded-md ${
                    location.pathname === item.path 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className={`mr-3 ${
                    location.pathname === item.path ? 'text-blue-700' : 'text-gray-500 group-hover:text-gray-600'
                  }`}>
                    {item.icon}
                  </span>
                  {item.title}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        {/* Sidebar for desktop */}
        <div className="hidden md:flex md:flex-shrink-0">
          <div className="w-64 flex flex-col">
            <div className="flex flex-col h-0 flex-1 bg-white shadow-lg">
              <div className="flex-1 flex flex-col overflow-y-auto pt-5 pb-4">
                <nav className="flex-1 px-3 space-y-2">
                  {menuItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`group flex items-center px-4 py-3 text-sm font-medium rounded-md transition-all duration-200 ${
                        location.pathname === item.path 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'
                      }`}
                    >
                      <span className={`mr-3 transition-colors duration-200 ${
                        location.pathname === item.path ? 'text-blue-700' : 'text-gray-500 group-hover:text-blue-600'
                      }`}>
                        {item.icon}
                      </span>
                      {item.title}
                    </Link>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-full mx-auto px-4 sm:px-6 md:px-8 py-6">
            <div className="bg-white shadow-sm rounded-lg p-6">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;