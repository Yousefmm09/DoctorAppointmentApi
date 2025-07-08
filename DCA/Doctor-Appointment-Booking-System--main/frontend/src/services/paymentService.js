import api from './api';

/**
 * Payment Service for handling payments via backend API
 * Supports both Paymob and mock payments
 */
const paymentService = {
    /**
     * Get payment URL for an appointment
     * @param {number} appointmentId - The appointment ID to pay for
     * @returns {Promise} - Promise with payment URL response
     */
    getPaymentUrl: async (appointmentId) => {
        try {
            return await api.post(`/Payment/pay-for-appointment/${appointmentId}`);
        } catch (error) {
            console.error('Payment URL generation error:', error);
            
            // If we get a 500 error, it might be a temporary backend issue
            if (error.response && error.response.status === 500) {
                console.log('Retrying payment URL generation after server error...');
                // Wait a moment and try again (longer delay)
                await new Promise(resolve => setTimeout(resolve, 2000));
                try {
                    return await api.post(`/Payment/pay-for-appointment/${appointmentId}`);
                } catch (retryError) {
                    console.error('Payment URL generation retry failed:', retryError);
                    throw retryError;
                }
            }
            throw error;
        }
    },
    
    /**
     * Check payment status
     * @param {number} appointmentId - The appointment ID to check status for
     * @returns {Promise} - Promise with payment status response
     */
    getPaymentStatus: async (appointmentId) => {
        try {
            return await api.get(`/Payment/payment-status/${appointmentId}`);
        } catch (error) {
            console.error('Payment status check error:', error);
            
            // If we get a 404 or 500, it might be because the payment record is still being created
            if (error.response && (error.response.status === 404 || error.response.status === 500)) {
                console.log('Retrying payment status check...');
                // Wait a moment and try again
                await new Promise(resolve => setTimeout(resolve, 2000));
                try {
                    return await api.get(`/Payment/payment-status/${appointmentId}`);
                } catch (retryError) {
                    console.error('Payment status check retry failed:', retryError);
                    throw retryError;
                }
            }
            throw error;
        }
    },
    
    /**
     * Test Paymob integration configuration
     * @returns {Promise} - Promise with Paymob integration status
     */
    testPaymobIntegration: async () => {
        try {
            return await api.get('/Payment/test-paymob-integration');
        } catch (error) {
            console.error('Paymob integration test error:', error);
            throw error;
        }
    },
    
    /**
     * Process payment webhook (for testing purposes)
     * @param {Object} data - Webhook data to send
     * @returns {Promise} - Promise with webhook response
     */
    processWebhook: (data) => api.post('/WebHook/paymob', data),
    
    /**
     * Complete a mock payment (for testing purposes)
     * @param {number} appointmentId - The appointment ID to pay for
     * @returns {Promise} - Promise with mock payment response
     */
    mockPaymentComplete: async (appointmentId) => {
        try {
            return await api.post(`/Payment/mock-payment-complete/${appointmentId}`);
        } catch (error) {
            console.error('Mock payment error:', error);
            
            // If we get a server error, try the webhook directly as fallback
            if (error.response && error.response.status === 500) {
                console.log('Retrying with direct webhook call...');
                await new Promise(resolve => setTimeout(resolve, 1000));
                try {
                    return await api.post(`/WebHook/mock-payment/${appointmentId}`, {});
                } catch (webhookError) {
                    console.error('Direct webhook call failed:', webhookError);
                    throw webhookError;
                }
            }
            throw error;
        }
    },
    
    /**
     * Check if a payment is required for an appointment
     * @param {number} appointmentId - The appointment ID to check
     * @returns {Promise<boolean>} - Promise resolving to true if payment is required
     */
    isPaymentRequired: async (appointmentId) => {
        try {
            const response = await api.get(`/Appointment/${appointmentId}`);
            if (response.data && response.data.isConfirmed) {
                return false; // No payment required if already confirmed
            }
            return true; // Payment required
        } catch (error) {
            console.error('Error checking if payment is required:', error);
            return true; // Default to requiring payment if check fails
        }
    }
};

export default paymentService; 