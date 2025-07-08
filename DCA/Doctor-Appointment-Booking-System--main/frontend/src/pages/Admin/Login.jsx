import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminContext } from '../../context/AdminContext';
import { toast } from 'react-toastify';
import axios from 'axios';

// Default admin credentials for convenience
const DEFAULT_ADMIN_EMAIL = "admin@system.com";
const DEFAULT_ADMIN_PASSWORD = "Admin@12345";

const Login = () => {
  // Pre-fill with default admin credentials
  const [email, setEmail] = useState(DEFAULT_ADMIN_EMAIL);
  const [password, setPassword] = useState(DEFAULT_ADMIN_PASSWORD);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [rememberMe, setRememberMe] = useState(false);
  const { setAToken, backendUrl } = useContext(AdminContext);
  const navigate = useNavigate();

  // Check if user is already logged in or has remember me set
  useEffect(() => {
    // Check for existing token
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');
    
    // Check for remembered credentials
    const rememberedEmail = localStorage.getItem('adminEmail');
    const rememberedPassword = localStorage.getItem('adminPassword');
    
    if (rememberedEmail && rememberedPassword) {
      setEmail(rememberedEmail);
      setPassword(rememberedPassword);
      setRememberMe(true);
    }
    
    if (token && userRole === 'Admin') {
      console.log('User already logged in as Admin, redirecting to dashboard');
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setAToken(token);
      navigate('/admin/dashboard', { replace: true });
    }
  }, [setAToken, navigate]);

  const parseJwt = (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(window.atob(base64));
    } catch (error) {
      console.error('Error parsing JWT:', error);
      return null;
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      console.log('Attempting login for:', email);
      console.log('Backend URL:', backendUrl);
      
      // Log complete request details
      console.log('Login request details:', {
        url: `${backendUrl}/api/Account/Login`,
        method: 'POST',
        data: { email, password: "***" }
      });
      
      const response = await axios.post(`${backendUrl}/api/Account/Login`, {
        email,
        password
      });
      
      console.log('Login response:', response.data);
      
      if (response.data && response.data.token) {
        const tokenData = parseJwt(response.data.token);
        console.log('Token data:', tokenData);
        
        // Check if the user is an admin
        const role = tokenData['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
        console.log('User role from token:', role);
        
        if (role !== 'Admin') {
          toast.error('Access denied. Admin privileges required.');
          setLoading(false);
          return;
        }
        
        // Save auth data
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('userRole', 'Admin');
        localStorage.setItem('userEmail', email);
        
        // Handle remember me
        if (rememberMe) {
          localStorage.setItem('adminEmail', email);
          localStorage.setItem('adminPassword', password);
        } else {
          localStorage.removeItem('adminEmail');
          localStorage.removeItem('adminPassword');
        }
        
        // Update app state
        setAToken(response.data.token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        
        toast.success('Login successful!');
        console.log('Redirecting to admin dashboard...');
        
        // Set a short delay before navigation to ensure context updates
        setTimeout(() => {
          // Force a hard navigation with page reload to ensure proper state initialization
          window.location.href = '/admin/dashboard';
        }, 500);
      } else {
        toast.error('Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // Enhanced error handling with specific messages
      if (error.response) {
        if (error.response.status === 401) {
          toast.error('Invalid email or password');
        } else if (error.response.status === 403) {
          toast.error('Your account does not have admin privileges');
        } else if (error.response.status === 404) {
          toast.error('Service not available. Please try again later');
        } else {
          toast.error(error.response.data?.message || 'Login failed');
        }
        
        console.error('Error response status:', error.response.status);
        console.error('Error response data:', error.response.data);
      } else if (error.request) {
        toast.error('Network error. Please check your connection');
        console.error('No response received. Request:', error.request);
      } else {
        toast.error('Login failed. Please try again');
        console.error('Error setting up request:', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAutoFill = () => {
    setEmail(DEFAULT_ADMIN_EMAIL);
    setPassword(DEFAULT_ADMIN_PASSWORD);
    setErrors({});
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div>
          <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">Admin Login</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Admin access only
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md -space-y-px">
            <div className="mb-4">
              <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700">Email</label>
              <input
                id="adminEmail"
                type="email"
                name="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>

            <div className="mb-6">
              <label htmlFor="adminPassword" className="block text-sm font-medium text-gray-700">Password</label>
              <input
                id="adminPassword"
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>

            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <input
                  id="admin-remember-me"
                  name="remember-me"
                  type="checkbox"
                  autoComplete="off"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="admin-remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>
            </div>
          </div>

          <div className="flex flex-col space-y-3">
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </>
              ) : 'Sign in'}
            </button>
            
            <button
              type="button"
              onClick={handleAutoFill}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Use default admin credentials
            </button>
          </div>
          
          <div className="text-sm text-gray-600 bg-gray-100 p-3 rounded">
            <p><strong>Default Credentials:</strong></p>
            <p>Email: {DEFAULT_ADMIN_EMAIL}</p>
            <p>Password: {DEFAULT_ADMIN_PASSWORD}</p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
