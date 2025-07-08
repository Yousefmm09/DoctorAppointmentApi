import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { FaLock, FaEye, FaEyeSlash, FaArrowLeft, FaCheck } from 'react-icons/fa';
import tabebakLogo from "../assets/tabebak_logo.svg";

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({});
  const [tokenValid, setTokenValid] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get backend URL from environment variable
  const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5109";
  
  // Extract query parameters
  const queryParams = new URLSearchParams(location.search);
  const userId = queryParams.get('userId');
  const token = queryParams.get('token');
  const encoding = queryParams.get('encoding') || 'base64';

  // Password validation
  const validatePassword = (password) => {
    const errors = {};
    
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    } else if (!/[A-Z]/.test(password)) {
      errors.password = 'Password must contain at least one uppercase letter';
    } else if (!/[a-z]/.test(password)) {
      errors.password = 'Password must contain at least one lowercase letter';
    } else if (!/[0-9]/.test(password)) {
      errors.password = 'Password must contain at least one number';
    } else if (!/[^A-Za-z0-9]/.test(password)) {
      errors.password = 'Password must contain at least one special character';
    }
    
    return errors;
  };

  // Check if token and userId are present
  useEffect(() => {
    if (!token || !userId) {
      setTokenValid(false);
      toast.error('Invalid or missing reset token. Please request a new password reset link.');
    }
  }, [token, userId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Reset errors
    setErrors({});
    
    // Validate passwords
    const passwordErrors = validatePassword(newPassword);
    
    if (Object.keys(passwordErrors).length > 0) {
      setErrors(passwordErrors);
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }
    
    setLoading(true);
    
    try {
      // Call the backend API to reset password
      const response = await axios.post(`${backendUrl}/api/Account/reset-password`, {
        userId,
        token,
        newPassword,
        confirmPassword,
        encoding
      });
      
      setSuccess(true);
      toast.success('Your password has been reset successfully. You can now log in with your new password.');
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      console.error('Error resetting password:', error);
      
      const errorMessage = error.response?.data?.message || 
                          'Unable to reset password. The link may have expired or is invalid.';
      
      toast.error(errorMessage);
      setErrors({ general: errorMessage });
      
      // If token is invalid, mark as invalid
      if (error.response?.status === 400) {
        setTokenValid(false);
      }
    } finally {
      setLoading(false);
    }
  };

  // Password strength indicator
  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, text: '', color: 'bg-gray-200' };
    
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    
    const strengthMap = {
      0: { text: 'Very Weak', color: 'bg-red-500' },
      1: { text: 'Weak', color: 'bg-red-400' },
      2: { text: 'Fair', color: 'bg-yellow-500' },
      3: { text: 'Good', color: 'bg-yellow-400' },
      4: { text: 'Strong', color: 'bg-green-400' },
      5: { text: 'Very Strong', color: 'bg-green-500' }
    };
    
    return { 
      strength, 
      ...strengthMap[strength],
      width: `${(strength / 5) * 100}%`
    };
  };
  
  const passwordStrength = getPasswordStrength(newPassword);

  // If token is invalid, show error message
  if (!tokenValid) {
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
            Invalid Reset Link
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            The password reset link is invalid or has expired.
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-xl sm:rounded-xl sm:px-10 border border-gray-100">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="mt-3 text-center sm:mt-5">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Link Expired or Invalid</h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    The password reset link you clicked is no longer valid. This could be because:
                  </p>
                  <ul className="mt-2 text-sm text-gray-500 list-disc list-inside">
                    <li>The link has expired (links are valid for 24 hours)</li>
                    <li>The link has already been used</li>
                    <li>The link was modified or is incomplete</li>
                  </ul>
                </div>
              </div>
              <div className="mt-5 sm:mt-6">
                <Link
                  to="/forgot-password"
                  className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
                >
                  Request a New Reset Link
                </Link>
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
          </div>
        </div>
      </div>
    );
  }

  // If password reset was successful
  if (success) {
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
            Password Reset Complete
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Your password has been successfully updated.
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-xl sm:rounded-xl sm:px-10 border border-gray-100">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <FaCheck className="h-6 w-6 text-green-600" />
              </div>
              <div className="mt-3 text-center sm:mt-5">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Success!</h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    Your password has been reset successfully. You can now log in with your new password.
                  </p>
                </div>
              </div>
              <div className="mt-5 sm:mt-6">
                <Link
                  to="/login"
                  className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
                >
                  Go to Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
          Reset Your Password
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Create a new secure password for your account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-xl sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {errors.general && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-sm text-red-600">{errors.general}</p>
              </div>
            )}
            
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaLock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="new-password"
                  name="new-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className={`appearance-none block w-full pl-10 pr-10 py-2 border ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  placeholder="Enter your new password"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-500 focus:outline-none"
                  >
                    {showPassword ? (
                      <FaEyeSlash className="h-5 w-5" />
                    ) : (
                      <FaEye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
              {errors.password && (
                <p className="mt-2 text-sm text-red-600">{errors.password}</p>
              )}
              
              {/* Password strength indicator */}
              {newPassword && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full ${passwordStrength.color}`} 
                      style={{ width: passwordStrength.width }}
                    ></div>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Password strength: <span className="font-medium">{passwordStrength.text}</span>
                  </p>
                  <ul className="mt-1 text-xs text-gray-500 list-disc list-inside">
                    <li className={newPassword.length >= 8 ? "text-green-600" : ""}>
                      At least 8 characters
                    </li>
                    <li className={/[A-Z]/.test(newPassword) ? "text-green-600" : ""}>
                      At least one uppercase letter
                    </li>
                    <li className={/[a-z]/.test(newPassword) ? "text-green-600" : ""}>
                      At least one lowercase letter
                    </li>
                    <li className={/[0-9]/.test(newPassword) ? "text-green-600" : ""}>
                      At least one number
                    </li>
                    <li className={/[^A-Za-z0-9]/.test(newPassword) ? "text-green-600" : ""}>
                      At least one special character
                    </li>
                  </ul>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaLock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className={`appearance-none block w-full pl-10 pr-10 py-2 border ${
                    errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                  } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  placeholder="Confirm your new password"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-gray-400 hover:text-gray-500 focus:outline-none"
                  >
                    {showConfirmPassword ? (
                      <FaEyeSlash className="h-5 w-5" />
                    ) : (
                      <FaEye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
              {errors.confirmPassword && (
                <p className="mt-2 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
              {confirmPassword && newPassword === confirmPassword && (
                <p className="mt-2 text-xs text-green-600">Passwords match</p>
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
                {loading ? 'Resetting...' : 'Reset Password'}
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
        </div>
      </div>
    </div>
  );
};

export default ResetPassword; 