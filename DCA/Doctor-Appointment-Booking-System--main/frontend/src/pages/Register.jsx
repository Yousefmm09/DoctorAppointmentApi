import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import PatientRegister from '../components/auth/PatientRegister';
import DoctorRegister from '../components/auth/DoctorRegister';
import { FaUserCircle, FaUserMd } from 'react-icons/fa';

const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('patient');
  
  // Check for tab parameter in location state
  useEffect(() => {
    // If location state contains activeTab, use that value
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Logo and header */}
        <div className="px-8 pt-8 pb-4 text-center">
          <div className="h-20 w-20 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center mb-4 mx-auto shadow-lg">
            {activeTab === 'patient' ? (
              <FaUserCircle className="h-12 w-12 text-white" />
            ) : (
              <FaUserMd className="h-12 w-12 text-white" />
            )}
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-1">
            Create Your Account
          </h2>
          <p className="text-gray-600 mb-4">
            {activeTab === 'patient' ? 'Patient registration' : 'Doctor registration'}
          </p>
        </div>

        {/* Tabs for User Type Selection */}
        <div className="flex border-b">
          <button
            className={`flex-1 py-4 text-center font-medium transition-colors ${
              activeTab === 'patient'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => handleTabChange('patient')}
            name="patientTabButton"
            id="patientTabButton"
            type="button"
          >
            <div className="flex items-center justify-center">
              <FaUserCircle className="mr-2" /> Patient
            </div>
          </button>
          <button
            className={`flex-1 py-4 text-center font-medium transition-colors ${
              activeTab === 'doctor'
                ? 'bg-indigo-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => handleTabChange('doctor')}
            name="doctorTabButton"
            id="doctorTabButton"
            type="button"
          >
            <div className="flex items-center justify-center">
              <FaUserMd className="mr-2" /> Doctor
            </div>
          </button>
        </div>

        {/* Tabs for Login/Register */}
        <div className="flex border-b bg-gray-50">
          <Link
            to="/login"
            className="flex-1 py-3 text-center font-medium transition-colors text-gray-600 hover:text-gray-800"
          >
            Login
          </Link>
          <button
            className="flex-1 py-3 text-center font-medium transition-colors border-b-2 border-blue-500 text-blue-600"
            name="registerTabButton"
            id="registerTabButton"
            type="button"
            disabled
          >
            Register
          </button>
        </div>

        {/* Registration Form Container */}
        <div className="px-6 py-6 sm:px-8 sm:py-8">
          {activeTab === 'patient' ? (
            <PatientRegister embedded={true} />
          ) : (
            <DoctorRegister embedded={true} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Register; 