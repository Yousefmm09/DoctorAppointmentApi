import React, { useState, useEffect } from 'react';
import { FiCreditCard, FiCheck, FiX, FiClock, FiAlertCircle } from 'react-icons/fi';
import { paymentService } from '../services/api';
import { toast } from 'react-toastify';

const AppointmentPaymentStatus = ({ appointmentId, onPaymentStatusChange }) => {
  const [status, setStatus] = useState('loading');
  const [paymentData, setPaymentData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (appointmentId) {
      checkPaymentStatus();
    }
  }, [appointmentId]);

  const checkPaymentStatus = async () => {
    try {
      setStatus('loading');
      setError(null);
      
      const response = await paymentService.getPaymentStatus(appointmentId);
      
      if (response.data) {
        setPaymentData(response.data);
        setStatus(response.data.status.toLowerCase());
        
        // Notify parent component of status change
        if (onPaymentStatusChange) {
          onPaymentStatusChange(response.data.status.toLowerCase());
        }
      } else {
        setStatus('unknown');
        setError('Could not retrieve payment information');
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      setStatus('error');
      setError('Failed to check payment status');
    }
  };

  const handlePayNow = async () => {
    try {
      const response = await paymentService.getPaymentUrl(appointmentId);
      if (response.data && response.data.payment_url) {
        window.open(response.data.payment_url, '_blank', 'noopener,noreferrer');
      } else {
        toast.error('Could not generate payment URL');
      }
    } catch (error) {
      console.error('Error generating payment URL:', error);
      toast.error('Failed to initialize payment');
    }
  };

  const handleMockPayment = async () => {
    try {
      await paymentService.mockPaymentComplete(appointmentId);
      toast.success('Payment completed successfully!');
      checkPaymentStatus();
    } catch (error) {
      console.error('Error with mock payment:', error);
      toast.error('Mock payment failed');
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <FiCheck className="mr-1" /> Paid
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <FiX className="mr-1" /> Failed
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <FiClock className="mr-1" /> Pending
          </span>
        );
      case 'loading':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-blue-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Checking
          </span>
        );
      case 'error':
      case 'unknown':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <FiAlertCircle className="mr-1" /> Unknown
          </span>
        );
    }
  };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <FiCreditCard className="text-gray-500 mr-2" />
          <span className="text-sm font-medium text-gray-700">Payment Status:</span>
          <div className="ml-2">{getStatusBadge()}</div>
        </div>
        
        {status !== 'completed' && (
          <div className="flex space-x-2">
            <button
              onClick={checkPaymentStatus}
              className="text-xs text-blue-600 hover:text-blue-800"
              title="Refresh payment status"
            >
              Refresh
            </button>
            
            {status !== 'loading' && (
              <button
                onClick={handlePayNow}
                className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
              >
                Pay Now
              </button>
            )}
            
            <button
              onClick={handleMockPayment}
              className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300"
              title="For testing purposes only"
            >
              Mock Pay
            </button>
          </div>
        )}
      </div>
      
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
};

export default AppointmentPaymentStatus; 