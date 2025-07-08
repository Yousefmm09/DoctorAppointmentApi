import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';

const PrivateRoute = ({ children, allowedRoles }) => {
  const { token, userRole } = useContext(AppContext);

  if (!token) {
    // If not logged in, redirect to login page
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    // If user role is not allowed, redirect to home
    return <Navigate to="/Home" replace />;
  }

  // If authorized, render the children
  return children;
};

export default PrivateRoute; 