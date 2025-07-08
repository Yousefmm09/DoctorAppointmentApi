import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiCheck, FiAlertTriangle } from 'react-icons/fi';

const EmailConfirmed = () => {
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const success = params.get('success');
    const error = params.get('error');
    const alreadyConfirmed = params.get('alreadyConfirmed');

    if (success === 'true') {
      setStatus('success');
      
      if (alreadyConfirmed === 'true') {
        toast.info('Your email was already confirmed. You can now login.');
      } else {
        toast.success('Email confirmed successfully! You can now login.');
      }
      
      // Redirect to login page after 3 seconds
      setTimeout(() => {
        navigate('/login', { state: { emailConfirmed: true } });
      }, 3000);
    } else {
      setStatus('error');
      
      switch (error) {
        case 'missing':
          setErrorMessage('Missing confirmation information. Please check your email for a valid confirmation link.');
          break;
        case 'notfound':
          setErrorMessage('User not found. Please register or request a new confirmation link.');
          break;
        case 'invalid':
          setErrorMessage('The confirmation link is invalid or has expired. Please request a new confirmation link.');
          break;
        case 'exception':
        default:
          setErrorMessage('An error occurred while confirming your email. Please try again or contact support.');
          break;
      }
    }
  }, [location.search, navigate]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white shadow-lg rounded-lg p-8 max-w-md w-full">
        {status === 'loading' && (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">Processing...</h2>
            <p className="text-gray-600 text-center">Please wait a moment...</p>
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

export default EmailConfirmed; 