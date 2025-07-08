import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import PatientLogin from '../components/auth/PatientLogin';
import DoctorLogin from '../components/auth/DoctorLogin';
import { FiUser, FiUserPlus } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { FaStethoscope, FaUserMd, FaRegHospital, FaLock } from 'react-icons/fa';
import tabebakLogo from "../assets/tabebak_logo.svg";

const Login = () => {
  const [loginInProgress, setLoginInProgress] = useState(false);
  const [activeTab, setActiveTab] = useState('patient');
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get redirect URL from query params if available
  const searchParams = new URLSearchParams(location.search);
  const redirectUrl = searchParams.get('redirect');
  
  useEffect(() => {
    // Check if token exists - if so, redirect immediately
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');
    
    if (token && userRole) {
      // If there's a specific redirect URL, use it; otherwise, redirect to dashboard
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        const redirectPath = userRole === 'Doctor' ? '/doctor/dashboard' : 
                            userRole === 'Admin' ? '/admin/dashboard' : 
                            '/home';
        window.location.href = redirectPath;
      }
    }
  }, [redirectUrl]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // We're now handling doctor login in the same page, so we don't need to navigate
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <div className="flex items-center">
            <img src={tabebakLogo} alt="Tabebak Logo" className="h-16 mr-3" />
            <div>
              <h1 className="text-blue-700 font-bold text-2xl">Tabebak</h1>
              <p className="text-gray-600 text-sm">Better healthcare for you</p>
            </div>
          </div>
        </div>
        <h2 className="text-center text-3xl font-extrabold text-gray-900 mt-6">
          Welcome Back
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sign in to access your healthcare services
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-xl sm:px-10 border border-gray-100">
          <div className="flex rounded-lg overflow-hidden shadow-sm mb-6">
            <motion.button
              className={`flex-1 py-4 text-center font-medium transition-colors ${
                activeTab === 'patient'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
              onClick={() => handleTabChange('patient')}
              name="patientTabButton"
              id="patientTabButton"
              type="button"
              whileHover={{ y: activeTab === 'patient' ? 0 : -2 }}
              whileTap={{ y: 0 }}
            >
              <div className="flex items-center justify-center">
                <FiUser className="mr-2" /> Patient
              </div>
            </motion.button>
            <motion.button
              className={`flex-1 py-4 text-center font-medium transition-colors ${
                activeTab === 'doctor'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
              onClick={() => handleTabChange('doctor')}
              name="doctorTabButton"
              id="doctorTabButton"
              type="button"
              whileHover={{ y: activeTab === 'doctor' ? 0 : -2 }}
              whileTap={{ y: 0 }}
            >
              <div className="flex items-center justify-center">
                <FaUserMd className="mr-2" /> Doctor
              </div>
            </motion.button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-4 text-sm text-gray-500">
                {activeTab === 'patient' ? 'Login for patients' : 'Login for doctors'}
              </span>
            </div>
          </div>

          {/* Login Form */}
          <div className="mt-6">
            {activeTab === 'patient' ? (
              <>
                <div className="flex justify-center mb-4">
                  <div className="w-20 h-20 rounded-full bg-blue-50 border-2 border-blue-100 flex items-center justify-center">
                    <FiUser className="text-4xl text-blue-600" />
                  </div>
                </div>
                <PatientLogin 
                  embedded={true} 
                  setLoginInProgress={setLoginInProgress}
                  redirectUrl={redirectUrl} 
                />
              </>
            ) : (
              <>
                <div className="flex justify-center mb-4">
                  <div className="w-20 h-20 rounded-full bg-indigo-50 border-2 border-indigo-100 flex items-center justify-center">
                    <FaUserMd className="text-4xl text-indigo-600" />
                  </div>
                </div>
                <DoctorLogin 
                  embedded={true} 
                  setLoginInProgress={setLoginInProgress}
                  redirectUrl={redirectUrl} 
                />
              </>
            )}
          </div>

          {/* Forgot Password Link */}
          <div className="mt-4 text-center">
            <Link 
              to="/forgot-password"
              className="text-sm font-medium text-blue-600 hover:text-blue-500 flex items-center justify-center"
            >
              <FaLock className="mr-2" /> Forgot your password?
            </Link>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Or
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3">
              <div>
                <Link 
                  to={activeTab === 'patient' ? "/register" : "/doctor/register"}
                  className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Don't have an account? Sign up
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <div className="text-center text-xs text-gray-500">
              <div className="flex items-center justify-center space-x-4 mb-2">
                <FaRegHospital className="text-blue-500" />
                <FaStethoscope className="text-blue-500" />
              </div>
              <p>© 2023 TABEBAK. All rights reserved.</p>
              <p>By logging in, you agree to our Terms of Service and Privacy Policy</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;


