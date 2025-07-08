import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiMail, FiCheck, FiAlertTriangle } from 'react-icons/fi';
import { resendConfirmationEmail } from '../services/api';

const ResendConfirmation = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // null, 'success', or 'error'
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get email from query parameters or location state if available
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const emailFromQuery = params.get('email');
    const emailFromState = location.state?.email;
    
    if (emailFromQuery) {
      setEmail(emailFromQuery);
    } else if (emailFromState) {
      setEmail(emailFromState);
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);
    setStatus(null);
    
    try {
      const response = await resendConfirmationEmail(email.trim());
      
      setStatus('success');
      setMessage(response.message || 'A new confirmation email has been sent. Please check your inbox.');
      toast.success('Confirmation email sent successfully!');
    } catch (error) {
      console.error('Error resending confirmation email:', error);
      
      // Handle different error cases
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          setMessage(error.response.data);
        } else if (error.response.data.message) {
          setMessage(error.response.data.message);
        } else {
          setMessage('Failed to resend confirmation email. Please try again later.');
        }
      } else {
        setMessage('Network error. Please check your connection and try again.');
      }
      
      setStatus('error');
      toast.error('Failed to resend confirmation email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white shadow-lg rounded-lg p-8 max-w-md w-full">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-blue-100 p-3 rounded-full mb-4">
            <FiMail className="h-10 w-10 text-blue-500" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Resend Confirmation Email</h2>
          <p className="text-gray-600 text-center">
            Enter your email address below to receive a new confirmation link.
          </p>
        </div>

        {status === 'success' && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4 flex items-start">
            <FiCheck className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
            <p className="text-green-700">{message}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4 flex items-start">
            <FiAlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
            <p className="text-red-700">{message}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              disabled={loading || status === 'success'}
              required
            />
          </div>

          <div className="flex items-center justify-between space-x-4 pt-2">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Back to Login
            </button>
            
            <button
              type="submit"
              disabled={loading || status === 'success'}
              className={`px-6 py-2 text-sm font-medium text-white bg-blue-500 rounded-md transition-colors ${
                loading || status === 'success' 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:bg-blue-600'
              }`}
            >
              {loading ? (
                <span className="flex items-center">
                  <span className="animate-spin h-4 w-4 mr-2 border-t-2 border-white rounded-full"></span>
                  Sending...
                </span>
              ) : status === 'success' ? (
                'Sent Successfully'
              ) : (
                'Resend Confirmation'
              )}
            </button>
          </div>
        </form>

        {status === 'success' && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Check your inbox (and spam folder) for the confirmation email.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResendConfirmation; 