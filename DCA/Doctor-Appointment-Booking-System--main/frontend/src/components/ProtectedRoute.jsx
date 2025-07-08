import React, { useContext, useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AppContext } from '../context/AppContext';

// Define role-specific login paths
const LOGIN_PATHS = {
  Patient: '/login',
  Doctor: '/doctor/login', // Assuming this exists or will be created
  Admin: '/admin/login'
};

// Define role-specific home/dashboard paths
const HOME_PATHS = {
  Patient: '/home',
  Doctor: '/doctor/dashboard',
  Admin: '/admin/dashboard'
};

const ProtectedRoute = ({ allowedRoles }) => {
  const { token, userRole } = useContext(AppContext);
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Add debugging information
    console.log("ProtectedRoute checking access at:", location.pathname);
    console.log("Auth state - Token exists:", !!token);
    console.log("Auth state - User role:", userRole);
    console.log("Auth state - Allowed roles:", allowedRoles);

    const checkAuth = () => {
      // Check localStorage first if context isn't populated
      const storedToken = localStorage.getItem('token');
      const storedRole = localStorage.getItem('userRole');
      
      // Use either context values or localStorage values
      const effectiveToken = token || storedToken;
      const effectiveRole = userRole || storedRole;
      
      console.log("Auth check - Effective token exists:", !!effectiveToken);
      console.log("Auth check - Effective role:", effectiveRole);
      
      // Determine if user is authenticated and authorized
      const authenticated = !!effectiveToken;
      
      let authorized = false;
      if (authenticated && allowedRoles && effectiveRole) {
        if (Array.isArray(allowedRoles)) {
          authorized = allowedRoles.includes(effectiveRole);
        } else {
          authorized = allowedRoles === effectiveRole;
        }
      }
      
      console.log("Auth decision - Authenticated:", authenticated);
      console.log("Auth decision - Authorized:", authorized);
      
      setIsAuthenticated(authenticated);
      setIsAuthorized(authorized);
      setIsLoading(false);
    };

    // Short timeout to allow context to initialize
    const timeoutId = setTimeout(checkAuth, 100);
    return () => clearTimeout(timeoutId);
  }, [token, userRole, allowedRoles, location.pathname]);

  // While checking authentication, show a loading indicator
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="ml-3">Verifying authentication...</p>
      </div>
    );
  }

  // If authenticated and authorized, render the outlet
  if (isAuthenticated && isAuthorized) {
    return <Outlet />;
  }

  // If authenticated but not authorized for this route
  if (isAuthenticated && !isAuthorized) {
    // User is logged in but not authorized for this route
    // Redirect to their appropriate home page based on their role
    const storedRole = userRole || localStorage.getItem('userRole');
    const homePath = HOME_PATHS[storedRole] || '/';
    console.log(`User is ${storedRole} but trying to access ${allowedRoles} route. Redirecting to ${homePath}`);
    return <Navigate to={homePath} replace />;
  }

  // If not authenticated, redirect to appropriate login page
  const targetPath = location.pathname.includes('/admin') 
    ? LOGIN_PATHS.Admin
    : location.pathname.includes('/doctor')
      ? LOGIN_PATHS.Doctor
      : LOGIN_PATHS.Patient;

  console.log("Redirecting to:", targetPath, "from:", location.pathname);
  return <Navigate to={targetPath} state={{ from: location }} replace />;
};

export default ProtectedRoute; 