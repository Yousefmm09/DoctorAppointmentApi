import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { phoneVerificationService } from '../../services/api';
import { FiPhone, FiCheckCircle, FiArrowRight, FiLock, FiLoader } from 'react-icons/fi';

const PhoneVerification = ({ 
  userId, 
  userType, 
  currentPhoneNumber, 
  onSuccess, 
  onCancel,
  className = '' 
}) => {
  const [step, setStep] = useState('input'); // 'input', 'verify', 'success'
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form validation
  const validatePhoneNumber = (phone) => {
    const phoneRegex = /^\+[0-9]{10,15}$/; // Basic validation for international numbers
    return phoneRegex.test(phone);
  };

  // Handle request verification code
  const handleRequestVerification = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!validatePhoneNumber(newPhoneNumber)) {
      setError('Please enter a valid phone number');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await phoneVerificationService.requestVerification({
        userId,
        userType,
        newPhoneNumber
      });
      
      if (response.data.success) {
        toast.success('Verification code sent to your phone');
        setStep('verify');
      } else {
        setError(response.data.message || 'Failed to send verification code');
        toast.error(response.data.message || 'Failed to send verification code');
      }
    } catch (err) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Failed to send verification code. Please try again.');
      }
      toast.error('Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  // Handle verification code submit
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!verificationCode || verificationCode.length < 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await phoneVerificationService.verifyCode({
        userId,
        userType,
        newPhoneNumber,
        verificationCode
      });
      
      if (response.data.success) {
        toast.success('Phone number verified successfully');
        setStep('success');
        
        // Wait a moment before calling onSuccess to show success state
        setTimeout(() => {
          if (onSuccess) onSuccess(newPhoneNumber);
        }, 1500);
      } else {
        setError(response.data.message || 'Failed to verify code');
        toast.error(response.data.message || 'Failed to verify code');
      }
    } catch (err) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Invalid verification code. Please try again.');
      }
      toast.error('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
        <FiPhone className="mr-2 text-blue-600" /> Change Phone Number
      </h2>
      
      {step === 'input' && (
        <form onSubmit={handleRequestVerification} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Phone Number
            </label>
            <input
              type="text"
              value={currentPhoneNumber || 'Not set'}
              disabled
              className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-500"
            />
          </div>
          
          <div>
            <label htmlFor="newPhoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
              New Phone Number
            </label>
            <div className="relative">
              <input
                id="newPhoneNumber"
                type="tel"
                value={newPhoneNumber}
                onChange={(e) => setNewPhoneNumber(e.target.value)}
                placeholder="e.g. +20123456789"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Enter your phone number with country code (e.g., +20 for Egypt)
            </p>
          </div>
          
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
          
          <div className="flex justify-between mt-6">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
              disabled={loading}
            >
              {loading ? (
                <>
                  <FiLoader className="animate-spin mr-2" /> Sending...
                </>
              ) : (
                <>
                  Send Code <FiArrowRight className="ml-2" />
                </>
              )}
            </button>
          </div>
        </form>
      )}
      
      {step === 'verify' && (
        <form onSubmit={handleVerifyCode} className="space-y-4">
          <div>
            <p className="mb-2 text-sm text-gray-600">
              We sent a verification code to <strong>{newPhoneNumber}</strong>
            </p>
            
            <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700 mb-1">
              Verification Code
            </label>
            <div className="relative">
              <input
                id="verificationCode"
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter 6-digit code"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <FiLock className="absolute right-3 top-2.5 text-gray-400" />
            </div>
          </div>
          
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
          
          <div className="flex justify-between mt-6">
            <button
              type="button"
              onClick={() => setStep('input')}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Back
            </button>
            
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
              disabled={loading}
            >
              {loading ? (
                <>
                  <FiLoader className="animate-spin mr-2" /> Verifying...
                </>
              ) : (
                <>
                  Verify <FiCheckCircle className="ml-2" />
                </>
              )}
            </button>
          </div>
        </form>
      )}
      
      {step === 'success' && (
        <div className="text-center py-4">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
            <FiCheckCircle className="text-green-500 text-xl" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Phone Number Updated</h3>
          <p className="text-gray-600 mb-4">
            Your phone number has been successfully changed to {newPhoneNumber}
          </p>
        </div>
      )}
    </div>
  );
};

export default PhoneVerification; 