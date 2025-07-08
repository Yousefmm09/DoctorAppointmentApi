import React, { useContext, useState, useRef, useEffect } from "react";
import { AppContext } from "../../context/AppContext";
import { toast } from "react-toastify";
import { useNavigate, useLocation, Link } from "react-router-dom";
import NavBar from '../../components/NavBar';
import { FaEnvelope, FaLock, FaSignInAlt, FaUserCircle, FaEye, FaEyeSlash, FaRegCheckCircle } from 'react-icons/fa';
import axios from 'axios';
import { authEndpoints } from '../../config/auth';

// Global flag to prevent multiple login attempts
const loginInProgress = { status: false };

const PatientLogin = ({ embedded = false, setLoginInProgress, redirectUrl }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, setToken, setUserRole, setUserData } = useContext(AppContext);
  const navigate = useNavigate();
  const location = useLocation();
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const formRef = useRef(null);
  const [errors, setErrors] = useState({});
  
  // Load remembered email on component mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    const rememberMe = localStorage.getItem('rememberMe') === 'true';
    
    if (rememberedEmail && rememberMe) {
      setEmail(rememberedEmail);
      setRemember(true);
    }
    
    // Focus email input if empty, otherwise focus password
    if (emailInputRef.current) {
      if (!rememberedEmail) {
        emailInputRef.current.focus();
      } else {
        passwordInputRef.current.focus();
      }
    }
  }, []);

  // Simple change handlers that just update state without validation
  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (errors.email) setErrors({...errors, email: ''});
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (errors.password) setErrors({...errors, password: ''});
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Form validation only happens on submission
  const validateForm = () => {
    const newErrors = {};
    
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email)) {
      newErrors.email = 'Email is not valid';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Only validate on submission
    if (!validateForm()) {
      return;
    }
    
    // Prevent multiple login attempts
    if (loading) {
      return;
    }
    
    setLoading(true);
    if (setLoginInProgress) {
      setLoginInProgress(true);
    }

    try {
      const result = await login({
        email: email.trim().toLowerCase(),
        password,
        remember
      });

      // Check if login was successful
      if (result && result.success) {
        // Store authentication data
        localStorage.setItem('token', result.token);
        localStorage.setItem('userRole', 'Patient');
        localStorage.setItem('userEmail', email);
        
        // Extract user ID from token
        try {
          const tokenParts = result.token.split('.');
          if (tokenParts.length === 3) {
            const tokenPayload = JSON.parse(atob(tokenParts[1]));
            console.log('[PatientLogin] Token payload:', tokenPayload);
            
            // Try to find user ID in token claims
            const userId = 
              tokenPayload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
              tokenPayload['sub'] ||
              tokenPayload['userId'] ||
              tokenPayload['UserId'];
              
            if (userId) {
              console.log('[PatientLogin] Found userId in token:', userId);
              localStorage.setItem('userId', userId);
              
              // Fetch patient numeric ID immediately after login
              try {
                const baseUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5109";
                const response = await axios.get(`${baseUrl}/api/Patient/by-user-id/${userId}`, {
                  headers: { Authorization: `Bearer ${result.token}` }
                });
                
                if (response.data && response.data.id) {
                  const patientId = response.data.id;
                  console.log('[PatientLogin] Retrieved patient ID:', patientId);
                  localStorage.setItem('patientId', patientId);
                }
              } catch (error) {
                console.error('[PatientLogin] Error fetching patient ID:', error);
              }
            } else {
              console.warn('[PatientLogin] Could not find userId in token');
              
              // Try to find any claim that might contain a user ID
              for (const key in tokenPayload) {
                if (key.toLowerCase().includes('id') || key.toLowerCase().includes('user')) {
                  console.log(`[PatientLogin] Potential userId found in claim '${key}':`, tokenPayload[key]);
                  localStorage.setItem('userId', tokenPayload[key]);
                  break;
                }
              }
            }
          }
        } catch (tokenError) {
          console.error('[PatientLogin] Error extracting userId from token:', tokenError);
        }
        
        if (result.userData) {
          localStorage.setItem('userData', JSON.stringify(result.userData));
          
          // Extract and store userId from userData if available
          if (result.userData.id || result.userData.userId) {
            const userId = result.userData.id || result.userData.userId;
            console.log('[PatientLogin] Found userId in userData:', userId);
            localStorage.setItem('userId', userId.toString());
          }
        }

        // Handle remember me
        if (remember) {
          localStorage.setItem('rememberMe', 'true');
          localStorage.setItem('rememberedEmail', email);
        } else {
          localStorage.removeItem('rememberMe');
          localStorage.removeItem('rememberedEmail');
        }

        // Update context
        setToken(result.token);
        setUserRole('Patient');
        if (result.userData) {
          setUserData(result.userData);
        }

        toast.success('Login successful! Redirecting...');
        
        // Use a short delay to ensure state updates are processed
        setTimeout(() => {
          // Check if we have a redirect URL and navigate to it
          if (redirectUrl) {
            window.location.href = redirectUrl;
          } else {
            // Force a hard navigation to ensure all contexts are properly loaded
            window.location.href = '/home';
          }
        }, 500);
      } 
      // Handle email confirmation required error
      else if (result && result.requiresEmailConfirmation) {
        const unconfirmedEmail = result.email;
        
        setErrors({
          general: (
            <div>
              <p>Please confirm your email before logging in.</p>
              <button 
                onClick={() => navigate('/resend-confirmation', { state: { email: unconfirmedEmail } })}
                className="mt-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-1 rounded text-sm"
              >
                Resend confirmation email
              </button>
            </div>
          )
        });
        
        toast.error(
          <div>
            <p>Email not confirmed. Please check your inbox and confirm your email.</p>
          </div>,
          { autoClose: 8000 }
        );
      }
      else {
        // Show specific error message if provided, otherwise generic message
        const errorMessage = result?.message || 'Login failed. Please check your credentials.';
        toast.error(errorMessage);
        setErrors({
          general: errorMessage
        });
      }
    } catch (error) {
      console.error('Login failed:', error);
      
      // Handle other errors
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.title || 
                          error.message || 
                          'Login failed. Please check your credentials.';
      toast.error(errorMessage);
      setErrors({
        general: errorMessage
      });
    } finally {
      setLoading(false);
      if (setLoginInProgress) {
        setLoginInProgress(false);
      }
    }
  };

  return (
    <>
      {!embedded && <NavBar />}
      <div className={`${!embedded ? "min-h-[80vh] flex items-center justify-center" : "w-full"}`}>
        <div className="w-full max-w-md">
          {/* Form Header */}
          {!embedded && (
            <div className="mb-8 text-center">
              <div className="h-20 w-20 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center mb-4 mx-auto shadow-lg">
                <FaUserCircle className="text-white text-5xl" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                Welcome to <span className="text-blue-600">TABEBAK</span>
              </h2>
              <p className="text-gray-600 text-sm">
                Access your appointments and medical records
              </p>
            </div>
          )}

          {/* Login Form */}
          <div className={`${!embedded ? "bg-white rounded-xl shadow-xl overflow-hidden" : ""}`}>
            <div className={`${!embedded ? "p-6" : "p-0"}`}>
              {!embedded && (
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center justify-center">
                  <FaUserCircle className="mr-2 text-blue-500" /> 
                  Patient Login
                </h3>
              )}

              {errors.general && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 flex items-center">
                  <svg className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {errors.general}
                </div>
              )}

              <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    <FaEnvelope className="inline mr-2 text-blue-500" /> Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaEnvelope className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={handleEmailChange}
                      ref={emailInputRef}
                      className={`block w-full pl-10 pr-3 py-3 border ${
                        errors.email ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                      } rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent sm:text-sm`}
                      placeholder="your-email@example.com"
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* Password Field */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      <FaLock className="inline mr-2 text-blue-500" /> Password
                    </label>
                    <a href="#" className="text-xs font-medium text-blue-600 hover:text-blue-500">
                      Forgot password?
                    </a>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaLock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={handlePasswordChange}
                      ref={passwordInputRef}
                      className={`block w-full pl-10 pr-10 py-3 border ${
                        errors.password ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                      } rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent sm:text-sm`}
                      placeholder="••••••••"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <button
                        type="button"
                        onClick={togglePasswordVisibility}
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
                    <p className="mt-1 text-sm text-red-600">
                      {errors.password}
                    </p>
                  )}
                </div>

                {/* Remember Me */}
                <div className="flex items-center">
                  <div className="flex items-center h-5">
                    <input
                      id="remember_me"
                      name="remember_me"
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-2 text-sm">
                    <label htmlFor="remember_me" className="font-medium text-gray-700 cursor-pointer">
                      Remember me
                    </label>
                  </div>
                </div>

                {/* Submit Button */}
                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                  >
                    <span className="flex items-center">
                      {loading ? (
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <FaSignInAlt className="mr-2" />
                      )}
                      {loading ? "Signing in..." : "Sign in"}
                    </span>
                  </button>
                </div>
              </form>

              {/* Register Link (only if not embedded) */}
              {!embedded && (
                <div className="mt-6">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700">
                      Don't have an account?{" "}
                      <Link to="/register" className="text-blue-600 hover:text-blue-500">
                        Register now
                      </Link>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PatientLogin; 