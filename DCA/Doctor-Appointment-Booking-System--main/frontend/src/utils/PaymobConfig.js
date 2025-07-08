/**
 * Paymob Payment Integration Configuration and Helpers
 * 
 * This file contains configuration settings and helper functions to work
 * with the Paymob payment gateway integration in the frontend.
 */

// Constants for status codes
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  VOIDED: 'voided',
  REFUNDED: 'refunded',
  UNKNOWN: 'unknown',
};

// Helper function to determine if a payment URL is a mock/test URL
export const isMockPaymentUrl = (url) => {
  if (!url) return false;
  return url.includes('mock-payment.html') || url.includes('test-payment');
};

// Helper function to determine if a payment URL is from Paymob
export const isPaymobUrl = (url) => {
  if (!url) return false;
  return url.includes('accept.paymob.com') || url.includes('accept.paymobsolutions.com');
};

// Get a descriptive label for payment status
export const getPaymentStatusLabel = (status) => {
  const statusMap = {
    [PAYMENT_STATUS.PENDING]: 'Pending',
    [PAYMENT_STATUS.COMPLETED]: 'Paid',
    [PAYMENT_STATUS.FAILED]: 'Failed',
    [PAYMENT_STATUS.VOIDED]: 'Voided',
    [PAYMENT_STATUS.REFUNDED]: 'Refunded',
    [PAYMENT_STATUS.UNKNOWN]: 'Unknown'
  };
  
  return statusMap[status?.toLowerCase() || PAYMENT_STATUS.UNKNOWN] || 'Unknown';
};

// Get CSS classes for payment status badges
export const getPaymentStatusClasses = (status) => {
  const statusMap = {
    [PAYMENT_STATUS.PENDING]: 'bg-yellow-100 text-yellow-800',
    [PAYMENT_STATUS.COMPLETED]: 'bg-green-100 text-green-800',
    [PAYMENT_STATUS.FAILED]: 'bg-red-100 text-red-800',
    [PAYMENT_STATUS.VOIDED]: 'bg-gray-100 text-gray-800',
    [PAYMENT_STATUS.REFUNDED]: 'bg-purple-100 text-purple-800',
    [PAYMENT_STATUS.UNKNOWN]: 'bg-gray-100 text-gray-800'
  };
  
  return statusMap[status?.toLowerCase() || PAYMENT_STATUS.UNKNOWN] || statusMap[PAYMENT_STATUS.UNKNOWN];
};

// Handle opening payment window - either in iframe or popup
export const openPaymentWindow = (paymentUrl, options = {}) => {
  const {
    useIframe = true,
    iframeTarget = null,
    onLoad = () => {},
    onError = () => {},
    width = 500,
    height = 700
  } = options;
  
  // For mock payments, always use popup
  if (isMockPaymentUrl(paymentUrl)) {
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;
    
    try {
      const popup = window.open(
        paymentUrl,
        'paymentWindow',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`
      );
      
      // Check if popup was blocked by browser
      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        console.warn('Payment popup was blocked by browser');
        return null;
      }
      
      return popup;
    } catch (error) {
      console.error('Error opening payment popup:', error);
      return null;
    }
  }
  
  // For real Paymob payments
  if (useIframe && iframeTarget) {
    // Use iframe
    iframeTarget.src = paymentUrl;
    iframeTarget.onload = onLoad;
    iframeTarget.onerror = onError;
    
    return null; // No window object to return for iframe mode
  } else {
    // Use popup for non-iframe mode
    try {
      const popup = window.open(paymentUrl, 'paymentWindow', `width=${width},height=${height},resizable=yes`);
      
      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        console.warn('Payment popup was blocked by browser');
        return null;
      }
      
      return popup;
    } catch (error) {
      console.error('Error opening payment popup:', error);
      return null;
    }
  }
};

export default {
  PAYMENT_STATUS,
  isMockPaymentUrl,
  isPaymobUrl,
  getPaymentStatusLabel,
  getPaymentStatusClasses,
  openPaymentWindow,
};
