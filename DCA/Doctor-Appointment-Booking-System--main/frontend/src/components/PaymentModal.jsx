import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { paymentService } from '../services/api';
import { FiCreditCard, FiCheckCircle, FiAlertCircle, FiLoader, FiExternalLink } from 'react-icons/fi';
import PaymobConfig, { 
  PAYMENT_STATUS, 
  isMockPaymentUrl, 
  isPaymobUrl,
  getPaymentStatusLabel,
  getPaymentStatusClasses 
} from '../utils/PaymobConfig';

const PaymentModal = ({ isOpen, onClose, appointmentId, appointmentDetails, onPaymentComplete }) => {
  const [loading, setLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState('');
  const [paymentStatus, setPaymentStatus] = useState(PAYMENT_STATUS.PENDING);
  const [error, setError] = useState(null);
  const [paymentWindowOpened, setPaymentWindowOpened] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const iframeRef = useRef(null);
  
  useEffect(() => {
    if (isOpen && appointmentId) {
      getPaymentUrl();
    }
    
    // Check payment status every 5 seconds
    const statusInterval = setInterval(() => {
      if (isOpen && appointmentId && paymentStatus === PAYMENT_STATUS.PENDING && (paymentWindowOpened || iframeLoaded)) {
        checkPaymentStatus();
      }
    }, 5000);
    
    return () => clearInterval(statusInterval);
  }, [isOpen, appointmentId, paymentWindowOpened, iframeLoaded, paymentStatus]);
  
  const getPaymentUrl = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Add a delay before making the request to ensure backend is ready
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const response = await paymentService.getPaymentUrl(appointmentId);
      if (response.data && response.data.payment_url) {
        setPaymentUrl(response.data.payment_url);
        setPaymentWindowOpened(false); // Reset this flag when we get a new URL
        setIframeLoaded(false);
        
        // Check if it's a direct Paymob URL
        if (isPaymobUrl(response.data.payment_url)) {
          console.log('Using Paymob iframe payment');
        } else if (isMockPaymentUrl(response.data.payment_url)) {
          console.log('Using mock payment');
        }
      } else {
        throw new Error('Invalid response from payment service');
      }
    } catch (error) {
      console.error('Error getting payment URL:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.details || 'Failed to initialize payment. Please try again.';
      setError(errorMessage);
      toast.error('Payment initialization failed');
      
      // If there's a specific error about UserAccountId, show a more helpful message
      if (error.response?.data?.details?.includes('FK_Payments_UserAccounts_UserAccountId')) {
        setError('There was an issue with your user account. Please try again or contact support.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  const checkPaymentStatus = async () => {
    try {
      const response = await paymentService.getPaymentStatus(appointmentId);
      if (response.data && response.data.status) {
        const status = response.data.status.toLowerCase();
        
        setPaymentStatus(status);
        
        if (status === PAYMENT_STATUS.COMPLETED) {
          toast.success('Payment completed successfully!');
          onPaymentComplete && onPaymentComplete();
          setTimeout(() => onClose(), 2000);
        } else if (status === PAYMENT_STATUS.FAILED) {
          setError('Payment failed. Please try again.');
          toast.error('Payment failed');
        }
      } else {
        console.error('Invalid payment status response:', response);
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      // Don't show error toast here as it might be annoying during polling
    }
  };
  
  const handlePayButtonClick = () => {
    if (paymentUrl) {
      setPaymentWindowOpened(true);
      
      // Use the PaymobConfig utility for handling payment windows
      if (isMockPaymentUrl(paymentUrl)) {
        // For mock payments, open in a popup window
        const width = 500;
        const height = 700;
        const paymentWindow = PaymobConfig.openPaymentWindow(paymentUrl, {
          useIframe: false,
          width,
          height
        });
        
        // Set up an interval to check if the window was closed
        if (paymentWindow) {
          const checkClosed = setInterval(() => {
            if (paymentWindow.closed) {
              clearInterval(checkClosed);
              // Window was closed, check payment status
              setTimeout(() => {
                checkPaymentStatus();
              }, 1000);
            }
          }, 500);
        }
      } else {
        // For real payment URLs, use the iframe instead
        setIframeLoaded(true);
      }
    }
  };
  
  const handleIframeLoad = () => {
    setIframeLoaded(true);
    setLoading(false);
  };

  const handleIframeError = () => {
    setError('Failed to load payment gateway. Please try again or use the external payment option.');
    setLoading(false);
    setIframeLoaded(false);
  };
  
  const handleExternalPayment = () => {
    if (paymentUrl) {
      // Open in a new tab instead of using iframe
      PaymobConfig.openPaymentWindow(paymentUrl, { 
        useIframe: false 
      });
      setPaymentWindowOpened(true);
    }
  };
  
  const handleMockPayment = async () => {
    try {
      setLoading(true);
      await paymentService.mockPaymentComplete(appointmentId);
      setPaymentStatus(PAYMENT_STATUS.COMPLETED);
      toast.success('Payment completed successfully!');
      onPaymentComplete && onPaymentComplete();
      setTimeout(() => onClose(), 2000);
    } catch (error) {
      console.error('Error with mock payment:', error);
      setError('Mock payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleRetry = () => {
    setError(null);
    getPaymentUrl();
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center">
            <FiCreditCard className="mr-2" /> Payment
          </h2>
          <button 
            onClick={onClose}
            className="text-white hover:text-gray-200"
          >
            &times;
          </button>
        </div>
        
        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <FiLoader className="animate-spin text-blue-600 text-4xl mb-4" />
              <p className="text-gray-600">Initializing payment...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8">
              <FiAlertCircle className="text-red-500 text-5xl mb-4" />
              <p className="text-red-500 mb-4">{error}</p>
              <button
                onClick={handleRetry}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : paymentStatus === PAYMENT_STATUS.COMPLETED ? (
            <div className="flex flex-col items-center justify-center py-8">
              <FiCheckCircle className="text-green-500 text-5xl mb-4" />
              <p className="text-green-500 text-xl mb-2">Payment Successful!</p>
              <p className="text-gray-600">Your appointment has been confirmed.</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h3 className="font-semibold text-lg mb-2">Appointment Details</h3>
                <div className="bg-gray-50 p-4 rounded">
                  <p><span className="font-medium">Doctor:</span> {appointmentDetails?.doctorName || 'N/A'}</p>
                  <p><span className="font-medium">Date:</span> {appointmentDetails?.date || 'N/A'}</p>
                  <p><span className="font-medium">Time:</span> {appointmentDetails?.time || 'N/A'}</p>
                  <p><span className="font-medium">Fee:</span> ${appointmentDetails?.fee || '0'}</p>
                </div>
              </div>
              
              {paymentUrl ? (
                <>
                  {iframeLoaded ? (
                    <div className="mb-4">
                      <div className="relative pt-[75%] w-full bg-gray-50 border border-gray-200 rounded">
                        <iframe
                          ref={iframeRef}
                          src={paymentUrl}
                          className="absolute inset-0 w-full h-full"
                          frameBorder="0"
                          onLoad={handleIframeLoad}
                          onError={handleIframeError}
                          title="Payment Gateway"
                          sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-top-navigation"
                          allow="payment"
                        />
                      </div>
                      <div className="text-center mt-3">
                        <button 
                          onClick={handleExternalPayment}
                          className="text-blue-600 hover:text-blue-800 underline flex items-center justify-center mx-auto"
                        >
                          Open in new window <FiExternalLink className="ml-1" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <p className="text-gray-600 mb-4">Click the button below to proceed with payment:</p>
                      <button 
                        onClick={handlePayButtonClick}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center"
                      >
                        <FiCreditCard className="mr-2" /> Pay Now
                      </button>
                      
                      {paymentWindowOpened && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                          <p>Payment window opened. After completing payment, your appointment will be automatically confirmed.</p>
                          <p className="mt-2">If you closed the payment window, click the button again to reopen it.</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Mock payment button - only shown in development */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="mt-4 pt-4 border-t border-gray-200 w-full text-center">
                      <p className="text-gray-500 text-xs mb-2">For testing purposes only:</p>
                      <button
                        onClick={handleMockPayment}
                        className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300"
                      >
                        Mock Payment
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center py-4">
                  <p className="text-gray-600 mb-4">Click the button below to initialize payment:</p>
                  <button 
                    onClick={getPaymentUrl}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
                  >
                    Initialize Payment
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default PaymentModal;
