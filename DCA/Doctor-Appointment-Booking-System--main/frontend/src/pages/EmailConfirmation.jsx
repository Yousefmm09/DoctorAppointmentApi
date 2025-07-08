import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiCheck, FiAlertTriangle, FiExternalLink } from 'react-icons/fi';
import { confirmEmail } from '../services/api';

const EmailConfirmation = () => {
  const [status, setStatus] = useState('confirming'); // confirming, success, or error
  const [errorMessage, setErrorMessage] = useState('');
  const [directLink, setDirectLink] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const userId = params.get('userId');
    const token = params.get('token');
    const success = params.get('success');
    const error = params.get('error');

    // If we already have a success or error parameter, it means we were redirected back from the API
    if (success === 'true') {
      setStatus('success');
      toast.success('Email confirmed successfully! You can now login.');
      
      // Redirect to login page after 3 seconds
      setTimeout(() => {
        navigate('/login', { state: { emailConfirmed: true } });
      }, 3000);
      return;
    }
    
    if (error) {
      setStatus('error');
      if (error === 'invalid') {
        setErrorMessage('The confirmation link is invalid or has expired. Please request a new confirmation link.');
      } else {
        setErrorMessage('An error occurred while confirming your email. Please try again or contact support.');
      }
      return;
    }

    if (!userId || !token) {
      setStatus('error');
      setErrorMessage('Missing confirmation information. Please check your email for a valid confirmation link.');
      return;
    }

    // Create direct link for manual confirmation if automatic redirect fails
    const apiUrl = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5109'}/api/Account/ConfirmEmail`;
    const confirmationUrl = `${apiUrl}?userId=${encodeURIComponent(userId)}&token=${encodeURIComponent(token)}`;
    setDirectLink(confirmationUrl);

    // Try to redirect to the backend API
    try {
      window.location.href = confirmationUrl;
      
      // If we're still here after 5 seconds, the redirect might have failed
      setTimeout(() => {
        setStatus('manual');
      }, 5000);
    } catch (error) {
      console.error('Redirect error:', error);
      setStatus('manual');
    }
  }, [location.search, navigate]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white shadow-lg rounded-lg p-8 max-w-md w-full">
        {status === 'confirming' && (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">Confirming Your Email</h2>
            <p className="text-gray-600 text-center">Please wait while we confirm your email address...</p>
          </div>
        )}

        {status === 'manual' && (
          <div className="flex flex-col items-center">
            <div className="bg-yellow-100 p-3 rounded-full mb-4">
              <FiExternalLink className="h-12 w-12 text-yellow-500" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">Manual Confirmation Required</h2>
            <p className="text-gray-600 text-center mb-4">
              Automatic redirection failed. Please click the button below to confirm your email:
            </p>
            <a 
              href={directLink} 
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors mb-4"
              target="_blank"
              rel="noopener noreferrer"
            >
              Confirm Email
            </a>
            <p className="text-sm text-gray-500">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <div className="mt-2 p-2 bg-gray-100 rounded-md w-full overflow-x-auto">
              <code className="text-xs break-all">{directLink}</code>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center">
            <div className="bg-green-100 p-3 rounded-full mb-4">
              <FiCheck className="h-12 w-12 text-green-500" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">Email Confirmed!</h2>
            <p className="text-gray-600 text-center mb-4">
              Your email has been successfully confirmed. You will be redirected to the login page in a moment.
            </p>
            <button 
              onClick={() => navigate('/login')} 
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              Go to Login
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center">
            <div className="bg-red-100 p-3 rounded-full mb-4">
              <FiAlertTriangle className="h-12 w-12 text-red-500" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">Email Confirmation Failed</h2>
            <p className="text-gray-600 text-center mb-4">
              {errorMessage}
            </p>
            <div className="flex space-x-4">
              <button 
                onClick={() => navigate('/login')} 
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                Go to Login
              </button>
              <button 
                onClick={() => navigate('/resend-confirmation')} 
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-md transition-colors"
              >
                Resend Confirmation
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailConfirmation; 