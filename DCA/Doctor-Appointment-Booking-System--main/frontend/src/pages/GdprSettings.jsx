import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const GdprSettings = () => {
  const { 
    userData, 
    token, 
    userRole,
    requestGdprDataRemoval, 
    requestGdprDataExport,
    gdprRequestPending,
    gdprRequestId,
    loading 
  } = useContext(AppContext);
  
  const [showRemovalConfirm, setShowRemovalConfirm] = useState(false);
  const [processingExport, setProcessingExport] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect if not logged in
    if (!userData || !token) {
      toast.error("You must be logged in to access this page");
      navigate('/login');
    }
  }, [userData, token, navigate]);

  const handleRemovalRequest = async () => {
    setShowRemovalConfirm(false);
    navigate('/gdpr-removal-confirmation');
  };

  const handleExportRequest = async () => {
    setProcessingExport(true);
    
    try {
      const result = await requestGdprDataExport();
      if (result.success) {
        // Success toast is already handled in the context
      }
    } catch (error) {
      console.error("Error during data export request:", error);
      toast.error("Failed to process your request. Please try again later.");
    } finally {
      setProcessingExport(false);
    }
  };

  // Display loading state while waiting for authentication or making requests
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-gray-600">Processing your request...</p>
        </div>
      </div>
    );
  }

  // Helper function to safely display user information
  const displayUserInfo = (label, value, defaultText = 'Not available') => (
    <p className="text-sm text-gray-600 mb-2">
      <span className="font-medium">{label}:</span> {value || defaultText}
    </p>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 bg-blue-600 text-white">
          <h1 className="text-2xl font-bold">Account & Privacy Settings</h1>
        </div>
        
        <div className="p-8">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold mb-6">Your Data Privacy Rights</h2>
            
            <p className="text-gray-600 mb-8">
              You have rights to access, export, and request deletion of your personal data. 
              Use the options below to exercise these rights.
            </p>
            
            <div className="border-t border-gray-200 pt-6 mt-6">
              <h3 className="text-lg font-medium mb-4">Data Export</h3>
              <p className="text-gray-600 mb-4">
                Request a copy of all the personal data we have stored about you. 
                You will receive an email with your data once the request is processed.
              </p>
              <button
                onClick={handleExportRequest}
                disabled={processingExport || gdprRequestPending}
                className={`px-4 py-2 rounded-md text-white ${
                  processingExport || gdprRequestPending
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {processingExport ? 'Processing...' : 'Export My Data'}
              </button>
            </div>
            
            <div className="border-t border-gray-200 pt-6 mt-6">
              <h3 className="text-lg font-medium mb-4">Account Deletion</h3>
              <p className="text-gray-600 mb-4">
                Request permanent deletion of your account and personal data. This action cannot be undone.
                After deletion, you will need to create a new account if you wish to use our services again.
              </p>
              
              {gdprRequestPending ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                  <p className="text-yellow-700">
                    Your data removal request (ID: {gdprRequestId}) is currently being processed. 
                    You will be notified once the process is complete.
                  </p>
                </div>
              ) : (
                <>
                  {showRemovalConfirm ? (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                      <h4 className="text-red-700 font-medium mb-2">Confirm Account Deletion</h4>
                      <p className="text-red-600 mb-4">
                        Are you absolutely sure you want to delete your account and all associated data? 
                        This action cannot be undone.
                      </p>
                      <div className="flex space-x-4">
                        <button
                          onClick={handleRemovalRequest}
                          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                        >
                          Yes, Delete My Account
                        </button>
                        <button
                          onClick={() => setShowRemovalConfirm(false)}
                          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowRemovalConfirm(true)}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      Delete My Account
                    </button>
                  )}
                </>
              )}
            </div>
            
            <div className="border-t border-gray-200 pt-6 mt-6">
              <h3 className="text-lg font-medium mb-4">Your Account Information</h3>
              <div className="bg-gray-50 p-4 rounded-md">
                {displayUserInfo('User ID', userData?.id)}
                {displayUserInfo('Email', userData?.email)}
                {displayUserInfo('Name', userData?.firstName && userData?.lastName ? 
                  `${userData.firstName} ${userData.lastName}` : null)}
                {displayUserInfo('Account Type', userRole)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GdprSettings; 