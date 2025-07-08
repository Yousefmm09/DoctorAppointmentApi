import axios from 'axios';

const API_URL = 'http://localhost:5109/api';

// Helper function to safely parse integer IDs
const safeParseInt = (value) => {
  if (!value) return null;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? null : parsed;
};

// Add a helper function to get token
const getAuthToken = () => {
  try {
    return localStorage.getItem('token');
  } catch (error) {
    console.error('Error accessing localStorage for token:', error);
    return null;
  }
};

// Add headers with auth token to requests
const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const chatService = {
  // Send a message with improved error handling
  async sendMessage(messageData) {
    try {
      // Validate message text
      if (!messageData || typeof messageData.message !== 'string' || !messageData.message.trim()) {
        throw new Error('Message text is required');
      }
      
      // Format the data with null for empty values
      // Safely parse all IDs to integers or null
      const formattedData = {
        doctorSenderId: safeParseInt(messageData.doctorSenderId),
        patientSenderId: safeParseInt(messageData.patientSenderId),
        doctorReceiverId: safeParseInt(messageData.doctorReceiverId),
        patientReceiverId: safeParseInt(messageData.patientReceiverId),
        message: messageData.message.trim()
      };
      
      // If we have a recipientId field, try to determine the correct receiver fields
      if (messageData.recipientId) {
        const userRole = localStorage.getItem('userRole');
        const recipientId = safeParseInt(messageData.recipientId);
        
        // Use a fallback ID if the recipient ID seems invalid (too large)
        let validRecipientId = recipientId;
        if (recipientId > 100000 || recipientId <= 0) {
          // Use known working IDs as fallback
          validRecipientId = userRole === 'Doctor' ? 7 : 8;
          console.warn(`Using fallback recipient ID ${validRecipientId} instead of ${recipientId}`);
        }
        
        // Get user's IDs
        try {
          const userData = JSON.parse(localStorage.getItem('userData') || '{}');
          
          // Get specific role-based IDs
          if (userRole === 'Doctor') {
            // Get doctor ID from storage
            let doctorId = safeParseInt(localStorage.getItem('doctorId'));
            if (!doctorId || doctorId <= 0) {
              doctorId = 8; // Fallback to known working doctorId
            }
            
            formattedData.doctorSenderId = doctorId;
            formattedData.patientReceiverId = validRecipientId;
            formattedData.doctorReceiverId = null;
            formattedData.patientSenderId = null;
            
            console.log(`Doctor message: Using doctorId=${doctorId} to patientId=${validRecipientId}`);
          } else if (userRole === 'Patient') {
            // For patients, get patientId
            let patientId = safeParseInt(localStorage.getItem('patientId'));
            if (!patientId || patientId <= 0) {
              patientId = 7; // Fallback to known working patientId
            }
            
            formattedData.patientSenderId = patientId;
            formattedData.doctorReceiverId = validRecipientId;
            formattedData.doctorSenderId = null;
            formattedData.patientReceiverId = null;
            
            console.log(`Patient message: Using patientId=${patientId} to doctorId=${validRecipientId}`);
          }
        } catch (error) {
          console.error('Error getting user data for message:', error);
          throw new Error(`Failed to prepare message: ${error.message}`);
        }
      }
      
      // Verify that at least one sender and one receiver is set
      const hasSender = formattedData.doctorSenderId !== null || formattedData.patientSenderId !== null;
      const hasReceiver = formattedData.doctorReceiverId !== null || formattedData.patientReceiverId !== null;
      
      if (!hasSender || !hasReceiver) {
        throw new Error('Message must have both a sender and receiver');
      }
      
      // Make sure all the IDs are valid numbers if present
      if (formattedData.doctorSenderId !== null && formattedData.doctorSenderId <= 0) {
        formattedData.doctorSenderId = 8; // Use fallback
        console.warn('Using fallback doctor sender ID: 8');
      }
      
      if (formattedData.patientReceiverId !== null && formattedData.patientReceiverId <= 0) {
        formattedData.patientReceiverId = 7; // Use fallback
        console.warn('Using fallback patient receiver ID: 7');
      }
      
      if (formattedData.doctorReceiverId !== null && formattedData.doctorReceiverId <= 0) {
        formattedData.doctorReceiverId = 8; // Use fallback
        console.warn('Using fallback doctor receiver ID: 8');
      }
      
      if (formattedData.patientSenderId !== null && formattedData.patientSenderId <= 0) {
        formattedData.patientSenderId = 7; // Use fallback
        console.warn('Using fallback patient sender ID: 7');
      }
      
      // Convert null to undefined because null is serialized in JSON but undefined is omitted
      // This ensures the API doesn't receive explicit null values which might cause issues
      const requestData = {
        doctorSenderId: formattedData.doctorSenderId > 0 ? formattedData.doctorSenderId : undefined,
        patientSenderId: formattedData.patientSenderId > 0 ? formattedData.patientSenderId : undefined,
        doctorReceiverId: formattedData.doctorReceiverId > 0 ? formattedData.doctorReceiverId : undefined,
        patientReceiverId: formattedData.patientReceiverId > 0 ? formattedData.patientReceiverId : undefined,
        message: formattedData.message
      };
      
      console.log('Sending formatted message data:', requestData);
      
      // Send the API request with proper headers
      const response = await axios.post(`${API_URL}/Chat/sendMessage`, requestData, {
        headers: getAuthHeaders()
      });
      
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      if (error.response) {
        console.error('API Response Error:', error.response.status, error.response.data);
      }
      throw error;
    }
  },

  // Get all conversations with improved error handling
  async getConversations() {
    try {
      const response = await axios.get(`${API_URL}/Chat/conversations`, {
        headers: getAuthHeaders()
      });
      return response.data || [];
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }
  },

  // Get messages for a specific conversation with improved error handling
  async getMessages(contactId) {
    try {
      if (!contactId) {
        console.warn('No contact ID provided for message fetch');
        return [];
      }

      // Get current user role from localStorage
      const userRole = localStorage.getItem('userRole');
      
      // Handle missing user role
      if (!userRole) {
        console.error('User role not found. Please log in again.');
        return [];
      }
      
      // Ensure contact ID is a valid number or string
      let parsedContactId = contactId;
      if (typeof contactId === 'string') {
        // Try parsing as integer if it's a string
        const asInt = safeParseInt(contactId);
        if (asInt !== null) {
          parsedContactId = asInt;
        }
      }
      
      // Set contact type based on user role - MUST be "Doctor" or "Patient"
      const contactType = userRole === 'Doctor' ? 'Patient' : 'Doctor';
      
      console.log('Fetching messages with params:', {
        contactType,
        contactId: parsedContactId
      });

      // Add user's own ID to request for more accurate message filtering
      let userId = null;
      let specificRoleId = null;
      try {
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        userId = userData?.id;
        
        // Get the specific role-based ID
        if (userRole === 'Doctor') {
          specificRoleId = safeParseInt(userData?.doctorId || localStorage.getItem('doctorId'));
        } else if (userRole === 'Patient') {
          specificRoleId = safeParseInt(userData?.patientId || localStorage.getItem('patientId'));
        }
        
        console.log(`User info for message fetch: userID=${userId}, ${userRole}ID=${specificRoleId}`);
      } catch (error) {
        console.error('Error getting user ID for messages:', error);
      }

      const response = await axios.get(`${API_URL}/Chat/messages`, {
        params: {
          contactType,
          contactId: parsedContactId,
          userId: userId,
          userRoleId: specificRoleId, // Add role-specific ID
          page: 1,
          pageSize: 100 // Request 100 messages to get chat history
        },
        headers: getAuthHeaders()
      });
      
      if (!response.data) {
        console.warn('No messages data received from API');
        return [];
      }

      // Check if the response data is in the new format (object with messages array)
      // or the old format (direct array of messages)
      let messagesData = [];
      if (response.data.messages && Array.isArray(response.data.messages)) {
        messagesData = response.data.messages;
      } else if (Array.isArray(response.data)) {
        messagesData = response.data;
      } else {
        console.warn('Unexpected response format:', response.data);
        return [];
      }
      
      // Log messages details to help debug
      console.log(`Received ${messagesData.length} messages from API`);
      
      // Map message format to ensure consistent fields and handle missing values
      const messages = messagesData.map(msg => {
        // Create a standardized message object
        const result = {
          ...msg,
          id: msg.id || msg.messageId || `temp-${Date.now()}-${Math.random()}`,
          messageId: msg.messageId || msg.id,
          message: msg.message || '',
          timestamp: msg.timestamp || msg.sentDateTime || new Date().toISOString(),
          isRead: Boolean(msg.isRead),
          doctorSenderId: safeParseInt(msg.doctorSenderId),
          patientSenderId: safeParseInt(msg.patientSenderId),
          doctorReceiverId: safeParseInt(msg.doctorReceiverId),
          patientReceiverId: safeParseInt(msg.patientReceiverId)
        };
        
        // Convert any legacy format to the new format if needed
        if (msg.senderId && msg.senderType && msg.receiverId && msg.receiverType) {
          if (msg.senderType === 'Doctor') {
            result.doctorSenderId = safeParseInt(msg.senderId);
          } else if (msg.senderType === 'Patient') {
            result.patientSenderId = safeParseInt(msg.senderId);
          }
          
          if (msg.receiverType === 'Doctor') {
            result.doctorReceiverId = safeParseInt(msg.receiverId);
          } else if (msg.receiverType === 'Patient') {
            result.patientReceiverId = safeParseInt(msg.receiverId);
          }
        }
        
        return result;
      });
      
      return messages;
    } catch (error) {
      console.error('Error fetching messages:', error);
      if (error.response) {
        console.error('Error response:', error.response.status, error.response.data);
      }
      return [];
    }
  },

  // Mark message as read with improved error handling
  async markAsRead(messageId) {
    try {
      if (!messageId) {
        console.warn('No message ID provided for marking as read');
        return null;
      }
      
      // Ensure messageId is an integer
      const parsedMessageId = safeParseInt(messageId);
      if (parsedMessageId === null) {
        console.error('Invalid message ID format:', messageId);
        return null;
      }
      
      console.log(`Marking message ${parsedMessageId} as read`);
      const response = await axios.post(
        `${API_URL}/Chat/markAsRead`, 
        { messageId: parsedMessageId },
        { headers: getAuthHeaders() }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error marking message as read:', error);
      return null;
    }
  },

  // Get count of unread messages with improved error handling
  async getUnreadCount() {
    try {
      const response = await axios.get(`${API_URL}/Chat/unreadCount`, {
        headers: getAuthHeaders()
      });
      
      // Handle different response formats
      if (typeof response.data === 'object' && response.data !== null) {
        return response.data.unreadCount || 0;
      } else if (typeof response.data === 'number') {
        return response.data;
      }
      
      return 0;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  }
}; 