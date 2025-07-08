import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DoctorLoginComponent from '../../components/auth/DoctorLogin';
import { FaUserMd, FaUserCircle, FaUserPlus, FaArrowLeft } from 'react-icons/fa';

const DoctorLogin = () => {
  const [loginInProgress, setLoginInProgress] = useState(false);
  
  useEffect(() => {
    console.log("Doctor Login page mounted");
    
    if (loginInProgress) {
      console.log("Doctor login in progress, skipping redirect check");
      return;
    }
    
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');
    
    if (token && userRole === 'Doctor') {
      console.log("Doctor Login page found existing token, redirecting");
      window.location.href = '/doctor/dashboard';
      return;
    }
    
    return () => {
      console.log("Doctor Login page unmounted");
    };
  }, [loginInProgress]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-white flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        {/* Header with logo */}
        <div className="px-8 pt-8 pb-4 text-center bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
          <div className="h-24 w-24 rounded-full bg-white flex items-center justify-center mb-4 mx-auto shadow-lg">
            <FaUserMd className="h-14 w-14 text-indigo-600" />
          </div>
          <h2 className="text-3xl font-bold mb-1">
            Doctor Portal
          </h2>
          <p className="text-blue-100 text-sm">
            Access your professional medical dashboard
          </p>
        </div>
        
        {/* Login form container */}
        <div className="px-8 py-6">
          <DoctorLoginComponent embedded={true} setLoginInProgress={setLoginInProgress} />
          
          {/* Navigation links */}
          <div className="mt-8 grid grid-cols-2 gap-4">
            <Link 
              to="/login" 
              className="flex items-center justify-center py-2.5 px-4 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-all shadow-sm"
            >
              <FaUserCircle className="mr-2 text-blue-600" /> 
              <span className="text-sm font-medium">Patient Login</span>
            </Link>
            
            <Link 
              to="/register" 
              className="flex items-center justify-center py-2.5 px-4 rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-sm"
              state={{ activeTab: 'doctor' }}
            >
              <FaUserPlus className="mr-2" /> 
              <span className="text-sm font-medium">Register</span>
            </Link>
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-8 py-4 bg-gray-50 border-t border-gray-100">
          <Link to="/" className="flex items-center justify-center text-sm text-gray-600 hover:text-indigo-600 transition-colors">
            <FaArrowLeft className="mr-2" /> Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DoctorLogin; 