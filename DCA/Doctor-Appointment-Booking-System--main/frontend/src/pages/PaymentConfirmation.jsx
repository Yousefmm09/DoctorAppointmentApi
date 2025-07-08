import React, { useEffect, useState, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { paymentService } from '../services/api';
import { FiCheckCircle, FiAlertCircle, FiLoader, FiCreditCard, FiArrowLeft } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { AppContext } from '../context/AppContext';

const PaymentConfirmation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUserData } = useContext(AppContext);
  
  const [status, setStatus] = useState('checking');
  const [paymentData, setPaymentData] = useState(null);
  const appointmentId = searchParams.get('appointment_id') || searchParams.get('appointmentId');
  const success = searchParams.get('success') === 'true';
  
  useEffect(() => {
    const checkPaymentStatus = async () => {
      if (!appointmentId) {
        setStatus('error');
        return;
      }
      
      try {
        // Wait a moment to ensure payment processing is complete
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check payment status
        const response = await paymentService.getPaymentStatus(appointmentId);
        setPaymentData(response.data);
        
        if (response.data && response.data.status) {
          // Set status based on the payment data
          if (response.data.status.toLowerCase() === 'completed') {
            setStatus('success');
            refreshUserData(); // Refresh user data to update appointment list
            toast.success('Payment successful! Your appointment is confirmed.');
          } else if (response.data.status.toLowerCase() === 'pending') {
            setStatus('pending');
          } else {
            setStatus('failed');
          }
        } else {
          setStatus('unknown');
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        setStatus('error');
        
        // If the payment was supposedly successful but we can't verify, treat as success
        if (success) {
          setStatus('success');
          toast.info('Payment reported as successful, but verification is pending.');
        }
      }
    };
    
    checkPaymentStatus();
  }, [appointmentId, success, refreshUserData]);
  
  const handleRetry = async () => {
    try {
      const response = await paymentService.getPaymentUrl(appointmentId);
      if (response.data && response.data.payment_url) {
        window.location.href = response.data.payment_url;
      } else {
        toast.error('Could not generate payment URL');
      }
    } catch (error) {
      console.error('Error generating payment URL:', error);
      toast.error('Failed to initialize payment');
    }
  };
  
  const renderStatusContent = () => {
    switch (status) {
      case 'success':
        return (
          <div className="text-center">
            <FiCheckCircle className="text-green-500 text-6xl mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Successful!</h2>
            <p className="text-gray-600 mb-8">Your appointment has been confirmed.</p>
            <button
              onClick={() => navigate('/my-appointments')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              View My Appointments
            </button>
          </div>
        );
        
      case 'failed':
        return (
          <div className="text-center">
            <FiAlertCircle className="text-red-500 text-6xl mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Failed</h2>
            <p className="text-gray-600 mb-8">We couldn't process your payment. Please try again.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={handleRetry}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FiCreditCard className="inline mr-2" /> Try Again
              </button>
              <button
                onClick={() => navigate('/my-appointments')}
                className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors"
              >
                <FiArrowLeft className="inline mr-2" /> Back to Appointments
              </button>
            </div>
          </div>
        );
        
      case 'pending':
        return (
          <div className="text-center">
            <div className="bg-yellow-50 p-4 rounded-lg mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Processing</h2>
              <p className="text-gray-600">Your payment is being processed. This may take a moment.</p>
              <p className="text-gray-500 text-sm mt-4">You'll receive an email once the payment is confirmed.</p>
            </div>
            <button
              onClick={() => navigate('/my-appointments')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              View My Appointments
            </button>
          </div>
        );
        
      case 'error':
      case 'unknown':
        return (
          <div className="text-center">
            <FiAlertCircle className="text-gray-500 text-6xl mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Status Unknown</h2>
            <p className="text-gray-600 mb-8">We couldn't verify the status of your payment.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Check Again
              </button>
              <button
                onClick={() => navigate('/my-appointments')}
                className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors"
              >
                <FiArrowLeft className="inline mr-2" /> Back to Appointments
              </button>
            </div>
          </div>
        );
        
      default: // checking
        return (
          <div className="text-center">
            <FiLoader className="animate-spin text-blue-600 text-6xl mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Verifying Payment</h2>
            <p className="text-gray-600">Please wait while we verify your payment...</p>
          </div>
        );
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-8">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">Payment Confirmation</h1>
        {renderStatusContent()}
        
        {paymentData && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-700 mb-3">Transaction Details</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <p className="text-gray-500">Transaction ID:</p>
                <p className="text-gray-700 font-medium">{paymentData.transactionId || 'N/A'}</p>
                <p className="text-gray-500">Amount:</p>
                <p className="text-gray-700 font-medium">${paymentData.amount || '0.00'}</p>
                <p className="text-gray-500">Payment Method:</p>
                <p className="text-gray-700 font-medium">{paymentData.paymentMethod || 'N/A'}</p>
                <p className="text-gray-500">Date:</p>
                <p className="text-gray-700 font-medium">
                  {paymentData.paymentDate ? new Date(paymentData.paymentDate).toLocaleString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentConfirmation; 