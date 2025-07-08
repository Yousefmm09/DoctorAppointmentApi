import axios from 'axios';

/**
 * GDPR Data Removal Service
 * 
 * This service provides functions for handling GDPR-related data operations
 * including user data removal requests and data exports.
 */

// Submit a GDPR data removal request for a user
export const requestDataRemoval = async (userId, userEmail, token, backendUrl) => {
  try {
    // Validate inputs
    if (!userId || !userEmail || !token) {
      throw new Error('Missing required parameters for data removal request');
    }

    console.log(`Submitting data removal request for user ID: ${userId}`);
    console.log(`Token being used (first 10 chars): ${token.substring(0, 10)}...`);
    
    // Make sure token is properly formatted with 'Bearer ' prefix
    const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    
    const response = await axios.post(
      `${backendUrl}/api/Account/gdpr/data-removal`,
      {
        userId: userId.toString(), // Ensure userId is a string
        userEmail,
        reason: 'User requested data removal',
        removalFlag: true
      },
      {
        headers: {
          'Authorization': authToken,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log("API response:", response.status, response.statusText);
    console.log("Response data:", response.data);

    // Check if this was an immediate deletion or a scheduled deletion
    if (response.data?.requestId) {
      // Scheduled deletion
      console.log(`Data removal scheduled with request ID: ${response.data.requestId}`);
      return {
        success: true,
        message: 'Data removal request submitted successfully',
        requestId: response.data.requestId,
        immediate: false
      };
    } else {
      // Immediate deletion
      console.log('Immediate data removal completed');
      return {
        success: true,
        message: 'Your account has been deleted successfully',
        immediate: true
      };
    }
  } catch (error) {
    console.error('GDPR data removal request error:', error);
    console.error('Error details:', error.response?.data);
    console.error('Error status:', error.response?.status);
    
    // Special handling for 401 Unauthorized errors
    if (error.response?.status === 401) {
      return {
        success: false,
        message: 'Authentication required. Your session may have expired.',
        error: error.response.data
      };
    }
    
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to submit data removal request',
      error: error.response?.data || error.message
    };
  }
};

// Get the status of a data removal request
export const getDataRemovalStatus = async (requestId, token, backendUrl) => {
  try {
    if (!requestId || !token) {
      throw new Error('Missing required parameters for status check');
    }

    const response = await axios.get(
      `${backendUrl}/api/Account/gdpr/data-removal/${requestId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    return {
      success: true,
      status: response.data.status,
      message: response.data.message
    };
  } catch (error) {
    console.error('Error checking data removal status:', error);
    return {
      success: false,
      message: 'Failed to check data removal status',
      error: error.response?.data || error.message
    };
  }
};

// Cancel a pending data removal request
export const cancelDataRemovalRequest = async (requestId, token, backendUrl) => {
  try {
    if (!requestId || !token) {
      throw new Error('Missing required parameters for cancellation');
    }

    const response = await axios.delete(
      `${backendUrl}/api/Account/gdpr/data-removal/${requestId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    return {
      success: true,
      message: 'Data removal request cancelled successfully'
    };
  } catch (error) {
    console.error('Error cancelling data removal request:', error);
    return {
      success: false,
      message: 'Failed to cancel data removal request',
      error: error.response?.data || error.message
    };
  }
};

// Request a copy of user data (GDPR data portability)
export const requestDataExport = async (userId, userEmail, token, backendUrl) => {
  try {
    if (!userId || !userEmail || !token) {
      throw new Error('Missing required parameters for data export');
    }

    const response = await axios.post(
      `${backendUrl}/api/Account/gdpr/data-export`,
      {
        userId,
        userEmail
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    return {
      success: true,
      message: 'Data export request submitted successfully',
      requestId: response.data?.requestId || null
    };
  } catch (error) {
    console.error('Error requesting data export:', error);
    return {
      success: false,
      message: 'Failed to request data export',
      error: error.response?.data || error.message
    };
  }
}; 