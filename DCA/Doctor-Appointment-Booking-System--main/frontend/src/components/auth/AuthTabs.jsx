import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import PatientLogin from './PatientLogin';
import DoctorLogin from './DoctorLogin';
import { FaUserCircle, FaUserMd } from 'react-icons/fa';

const AuthTabs = () => {
  const [activeTab, setActiveTab] = useState('patient');
  const [activeView, setActiveView] = useState('login');
  const [loginInProgress, setLoginInProgress] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check for location state to set the active tab
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
    
    // Check if there's a success message to display
    if (location.state?.successMessage) {
      // Use toast to display the message (if available in this component)
      if (typeof toast !== 'undefined' && toast.success) {
        toast.success(location.state.successMessage);
      }
    }
  }, [location.state]);

  // Extract any success message from location state
  const successMessage = location.state?.successMessage;
  const errorMessage = location.state?.errorMessage;
  const emailConfirmationPending = location.state?.emailConfirmationPending;
  const email = location.state?.email;

  const handleTabChange = (tab) => {
    if (loginInProgress) {
      console.log("Login in progress, ignoring tab change");
      return;
    }
    setActiveTab(tab);
  };

  const handleViewChange = (view) => {
    if (loginInProgress) {
      console.log("Login in progress, ignoring view change");
      return;
    }
    
    if (view === 'register') {
      const registerPath = activeTab === 'patient' ? '/register' : '/doctor/register';
      navigate(registerPath, { state: { activeTab } });
    } else {
      setActiveView(view);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="text-center py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            TABEBAK {activeTab === 'patient' ? 'Patient' : 'Doctor'} Login
          </h1>
          <p className="text-sm text-gray-600 mt-2">
            Your trusted healthcare platform
          </p>
        </div>
        
        {/* Tab navigation */}
        <div className="flex border-b">
          <button
            onClick={() => handleTabChange('patient')}
            className={`flex-1 py-3 px-4 text-center ${
              activeTab === 'patient' 
                ? 'text-blue-600 border-b-2 border-blue-600 font-semibold' 
                : 'text-gray-500 hover:text-gray-700'
            } transition-colors duration-150 ease-in-out flex items-center justify-center`}
            disabled={loginInProgress}
          >
            <FaUserCircle className="mr-2" /> Patient
          </button>
          <button
            onClick={() => handleTabChange('doctor')}
            className={`flex-1 py-3 px-4 text-center ${
              activeTab === 'doctor' 
                ? 'text-indigo-600 border-b-2 border-indigo-600 font-semibold' 
                : 'text-gray-500 hover:text-gray-700'
            } transition-colors duration-150 ease-in-out flex items-center justify-center`}
            disabled={loginInProgress}
          >
            <FaUserMd className="mr-2" /> Doctor
          </button>
        </div>
        
        {/* Login Form Container */}
        <div className="px-4 py-6 sm:px-8 sm:py-8">
          {activeTab === 'patient' ? (
            <div className="flex items-center justify-center">
              <div className="w-full">
                <PatientLogin embedded={true} setLoginInProgress={setLoginInProgress} />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <div className="w-full">
                <DoctorLogin embedded={true} setLoginInProgress={setLoginInProgress} />
              </div>
            </div>
          )}
        </div>

        {/* Email Confirmation Messages */}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded-md">
            {successMessage}
            {emailConfirmationPending && email && (
              <div className="mt-2 text-sm">
                <p>Didn't receive the confirmation email?</p>
                <Link to={`/resend-confirmation?email=${encodeURIComponent(email)}`} className="text-blue-600 hover:underline">
                  Resend confirmation email
                </Link>
              </div>
            )}
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-md">
            {errorMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthTabs; 