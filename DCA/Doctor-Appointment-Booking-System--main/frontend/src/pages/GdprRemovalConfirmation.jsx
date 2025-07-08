import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';

const GdprRemovalConfirmation = () => {
  const context = useContext(AppContext);
  console.log("AppContext in GdprRemovalConfirmation:", context);
  
  const { backendUrl, token, logout, userData, requestGdprDataRemoval, extractTokenData } = context;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  // Check if user is logged in and token is valid
  useEffect(() => {
    console.log("GdprRemovalConfirmation - userData:", userData);
    console.log("GdprRemovalConfirmation - token:", token ? "Token exists" : "No token");
    
    if (!userData || !token) {
      toast.error("You must be logged in to access this page");
      navigate('/login');
      return;
    }

    // Validate token
    if (extractTokenData) {
      const tokenData = extractTokenData(token);
      if (!tokenData || (tokenData.exp && tokenData.exp < Date.now() / 1000)) {
        console.log("Token expired, redirecting to login");
        toast.error("Your session has expired. Please log in again.");
        logout();
        navigate('/login');
      }
    }
  }, [userData, token, navigate, logout, extractTokenData]);

  const handleRemovalConfirmation = async () => {
    // Check token validity
    if (!token) {
      toast.error("Your session has expired. Please log in again.");
      logout();
      navigate('/login');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log("Starting account deletion process");
      console.log("requestGdprDataRemoval function exists:", typeof requestGdprDataRemoval === 'function');
      
      if (typeof requestGdprDataRemoval !== 'function') {
        // Fallback to direct API call if function is not available
        console.log("Falling back to direct API call");
        
        // Make sure token is properly formatted
        const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        
        const response = await axios.post(
          `${backendUrl}/api/Account/gdpr/data-removal`,
          {
            userId: userData.id.toString(),
            userEmail: userData.email,
            reason: 'User requested account deletion'
          },
          {
            headers: {
              'Authorization': authToken,
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log("Direct API call response:", response);
        
        setSuccess(true);
        toast.success('Your account has been successfully deleted');
        
        // Log out the user and redirect to home page
        setTimeout(() => {
          logout();
          navigate('/');
        }, 3000);
      } else {
        // Use the AppContext function
        console.log("Using requestGdprDataRemoval from context");
        const result = await requestGdprDataRemoval();
        console.log("requestGdprDataRemoval result:", result);
        
        if (result.success) {
          setSuccess(true);
          toast.success('Your account has been successfully deleted');
          
          // Log out the user and redirect to home page
          setTimeout(() => {
            logout();
            navigate('/');
          }, 3000);
        } else {
          if (result.message && result.message.includes("Authentication")) {
            // Handle authentication errors
            setError("Your session has expired. Please log in again.");
            toast.error("Your session has expired. Please log in again.");
            setTimeout(() => {
              logout();
              navigate('/login');
            }, 2000);
          } else {
            setError(result.message || 'Failed to process data removal request');
            toast.error(result.message || 'Failed to process data removal request');
          }
        }
      }
    } catch (error) {
      console.error('Error processing data removal:', error);
      console.error('Error details:', error.response?.data);
      
      // Handle authentication errors
      if (error.response?.status === 401) {
        setError("Authentication failed. Your session may have expired.");
        toast.error("Authentication failed. Please log in again.");
        setTimeout(() => {
          logout();
          navigate('/login');
        }, 2000);
      } else {
        setError(error.message || 'An unexpected error occurred');
        toast.error(error.message || 'An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md overflow-hidden max-w-2xl mx-auto">
        <div className="p-6 bg-red-600 text-white">
          <h1 className="text-2xl font-bold">Account Deletion Confirmation</h1>
        </div>
        
        <div className="p-8">
          {success ? (
            <div className="text-center">
              <div className="bg-green-100 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
                <p className="font-medium">Account Deletion Successful</p>
                <p className="text-sm mt-2">Your account and all associated data have been permanently removed from our systems.</p>
              </div>
              <p className="mb-6">You will be redirected to the home page shortly.</p>
              <button
                onClick={() => navigate('/')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Go to Home Page
              </button>
            </div>
          ) : (
            <>
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
                <h3 className="text-yellow-800 font-medium mb-2">Account Deletion Warning</h3>
                <p className="text-yellow-700 mb-2">
                  You are about to permanently delete your account and all associated data:
                </p>
                {userData && (
                  <ul className="list-disc ml-6 text-yellow-700 mb-2">
                    <li><strong>Email:</strong> {userData.email}</li>
                    <li><strong>Name:</strong> {userData.firstName} {userData.lastName}</li>
                  </ul>
                )}
                <p className="text-yellow-700 font-medium">
                  This action cannot be undone. All your data, appointments, and records will be permanently erased.
                </p>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                <h3 className="text-red-700 font-medium mb-2">Warning</h3>
                <p className="text-red-600">
                  This is being performed in accordance with your right to data deletion.
                  If you wish to use our services in the future, you will need to create a new account.
                </p>
              </div>
              
              {error && (
                <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded mb-6">
                  <p className="font-medium">Error</p>
                  <p className="text-sm">{error}</p>
                </div>
              )}
              
              <div className="flex justify-end">
                <button
                  onClick={() => navigate('/gdpr-settings')}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 mr-4"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRemovalConfirmation}
                  disabled={loading}
                  className={`px-4 py-2 text-white rounded-md ${
                    loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {loading ? 'Processing...' : 'Confirm Account Deletion'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GdprRemovalConfirmation; 