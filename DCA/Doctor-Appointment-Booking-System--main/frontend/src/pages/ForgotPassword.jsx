import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { FaEnvelope, FaArrowLeft } from 'react-icons/fa';
import tabebakLogo from "../assets/tabebak_logo.svg";

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const emailInputRef = useRef(null);
  
  // Get backend URL from environment variable
  const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5109";

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Reset error state
    setError('');
    
    // Validate email
    if (!email.trim()) {
      setError('Please enter your email address');
      emailInputRef.current.focus();
      return;
    }
    
    if (!validateEmail(email.trim())) {
      setError('Please enter a valid email address');
      emailInputRef.current.focus();
      return;
    }
    
    setLoading(true);
    
    try {
      // Call the backend API to request password reset
      const response = await axios.post(`${backendUrl}/api/Account/forgot-password`, {
        email: email.trim()
      });
      
      // API returns success even if email doesn't exist (for security)
      setSubmitted(true);
      toast.success('If your email is registered, you will receive a password reset link shortly.');
    } catch (error) {
      console.error('Error requesting password reset:', error);
      
      // Don't reveal if the email exists or not
      setSubmitted(true);
      toast.success('If your email is registered, you will receive a password reset link shortly.');
    } finally {
      setLoading(false);
    }
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
          {submitted ? 'Check Your Email' : 'Forgot Your Password?'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {submitted 
            ? 'If your email is registered, you will receive password reset instructions shortly.'
            : 'Enter your email address and we\'ll send you a link to reset your password.'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-xl sm:px-10 border border-gray-100">
          {submitted ? (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="mt-3 text-center sm:mt-5">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Email Sent</h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    We've sent a password reset link to <strong>{email}</strong>.
                    Please check your email and follow the instructions to reset your password.
                  </p>
                </div>
                <div className="mt-5">
                  <p className="text-sm text-gray-500">
                    Didn't receive an email? Check your spam folder or try again.
                  </p>
                </div>
              </div>
              <div className="mt-5 sm:mt-6">
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
                >
                  Try Again
                </button>
              </div>
              <div className="mt-3">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center w-full text-sm text-blue-600 hover:text-blue-800"
                >
                  <FaArrowLeft className="mr-2" /> Back to Login
                </Link>
              </div>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaEnvelope className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    ref={emailInputRef}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className={`appearance-none block w-full pl-10 pr-3 py-2 border ${
                      error ? 'border-red-300' : 'border-gray-300'
                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                    placeholder="Enter your email address"
                  />
                </div>
                {error && (
                  <p className="mt-2 text-sm text-red-600">{error}</p>
                )}
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    loading
                      ? 'bg-blue-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                  }`}
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </div>

              <div className="text-center">
                <Link
                  to="/login"
                  className="font-medium text-blue-600 hover:text-blue-500 flex items-center justify-center"
                >
                  <FaArrowLeft className="mr-2" /> Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword; 