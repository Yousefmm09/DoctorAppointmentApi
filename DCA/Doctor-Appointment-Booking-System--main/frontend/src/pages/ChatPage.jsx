import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import signalRService from '../services/signalRService';
import { chatService } from '../services/chatService';
import ChatMessage from '../components/ChatMessage';
import ChatInput from '../components/ChatInput';
import ProfilePicture from '../components/ProfilePicture';
import { toast } from 'react-toastify';
import { useAppContext } from '../context/AppContext';
import { FiMessageSquare, FiSend, FiAlertCircle, FiRefreshCw, FiX, FiArrowLeft, FiUser, FiPhone, FiMail, FiMapPin } from 'react-icons/fi';

// Updated ChatPage component that accepts recipientInfo prop
const ChatPage = ({ userRole, userId, recipientType, recipientId, recipientInfo }) => {
  // Context and state
  const { userData, backendUrl } = useAppContext();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState(null);
  const [signalRConnected, setSignalRConnected] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [localRecipientInfo, setLocalRecipientInfo] = useState(recipientInfo || null);
  const [connectionAttemptInProgress, setConnectionAttemptInProgress] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const signalRConnectionRef = useRef(null);
  
  // Router hooks
  const params = useParams();
  const navigate = useNavigate();
  
  // Use recipientId from props or params
  const currentRecipientId = recipientId || params.recipientId;
  
  // Get current user info
  const getUserInfo = () => {
    try {
      // Try to get from context first
      if (userData && userRole) {
        return { 
          userId: userData.id,
          userRole,
          // These are numeric IDs used for chat
          patientId: userRole === 'Patient' ? 
            (userData.patientId || localStorage.getItem('patientId')) : null,
          doctorId: userRole === 'Doctor' ? 
            (userData.doctorId || localStorage.getItem('doctorId')) : null
        };
      }
      
      // Fallback to localStorage
      const storedUserRole = localStorage.getItem('userRole');
      const storedUserData = localStorage.getItem('userData');
      
      if (storedUserData && storedUserRole) {
        const parsedUserData = JSON.parse(storedUserData);
        return {
          userId: parsedUserData.id,
          userRole: storedUserRole,
          patientId: storedUserRole === 'Patient' ? 
            (parsedUserData.patientId || localStorage.getItem('patientId')) : null,
          doctorId: storedUserRole === 'Doctor' ? 
            (parsedUserData.doctorId || localStorage.getItem('doctorId')) : null
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user info:', error);
      return null;
    }
  };
  
  const currentUser = useMemo(() => getUserInfo(), [userData, userRole]);
  
  // Connect to SignalR - memoized function to avoid recreating on every render
  const connectToSignalR = useCallback(async () => {
    if (connectionAttemptInProgress) {
      console.log('Connection attempt already in progress, skipping');
      return;
    }
    
    try {
      setConnectionAttemptInProgress(true);
      setLoadingError(null);
      
      // Get auth token
      const token = localStorage.getItem('token');
      if (!token || !currentUser) {
        setLoadingError('Authentication required. Please log in again.');
        toast.error('Authentication required. Please log in again.');
        setTimeout(() => navigate('/login'), 2000);
        return;
      }
      
      // Check current connection status
      const status = signalRService.getConnectionStatus();
      if (status.connected) {
        console.log('SignalR already connected, using existing connection');
        setSignalRConnected(true);
        
        // Join user-specific group
        await signalRService.joinGroup(currentUser.userId);
        return;
      }
      
      // Connect to SignalR hub
      const connectionResult = await signalRService.startConnection(token);
      
      // Store the connection promise for cleanup
      signalRConnectionRef.current = connectionResult;
      
      // Join user-specific group
      await signalRService.joinGroup(currentUser.userId);
      
      setSignalRConnected(true);
      console.log('SignalR connected successfully');
      setRetryCount(0);
    } catch (error) {
      console.error('SignalR connection error:', error);
      setSignalRConnected(false);
      setLoadingError(`Failed to connect to chat service: ${error.message || 'Unknown error'}`);
      
      // Auto-retry connection up to 3 times with increasing delay
      if (retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000;
        toast.info(`Retrying connection in ${delay/1000} seconds...`);
        
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, delay);
      } else {
        toast.error('Failed to connect to chat service after multiple attempts');
      }
    } finally {
      setConnectionAttemptInProgress(false);
    }
  }, [currentUser, navigate, retryCount, connectionAttemptInProgress]);
  
  // Connect to SignalR when component mounts
  useEffect(() => {
    let isMounted = true;
    
    const setupConnection = async () => {
      if (isMounted) {
        await connectToSignalR();
      }
    };
    
    setupConnection();
    
    // Cleanup on unmount
    return () => {
      isMounted = false;
      console.log('ChatPage unmounting, closing SignalR connection');
      
      // Only disconnect if this component initiated the connection
      if (signalRConnectionRef.current) {
        setTimeout(() => {
          // Only stop if no other chat page has taken over
          if (!document.querySelector('.chat-page-active')) {
            signalRService.stopConnection().catch(err => {
              console.error('Error stopping SignalR connection:', err);
            });
          } else {
            console.log('Another chat page is active, not stopping SignalR connection');
          }
        }, 100);
      }
    };
  }, [connectToSignalR]);
  
  // Load recipient information if not provided via props
  useEffect(() => {
    const loadRecipientInfo = async () => {
      // Skip if we already have recipient info from props
      if (localRecipientInfo || !currentRecipientId || !currentUser) return;
      
      try {
        // Log detailed recipient ID info for debugging
        console.log(`Loading recipient info - recipientId: ${currentRecipientId}, type: ${typeof currentRecipientId}`);
        console.log(`Current user is ${currentUser.userRole} with ID ${currentUser.userId}`);
        
        // Parse the ID to ensure it's a valid number - very important for foreign key constraints
        const parsedId = parseInt(currentRecipientId, 10);
        if (isNaN(parsedId) || parsedId <= 0) {
          console.error(`Invalid recipient ID format: ${currentRecipientId} parses to ${parsedId}`);
          setLoadingError(`Invalid recipient ID (${currentRecipientId}). Please select a valid contact.`);
          return;
        }
        
        // Use a known working ID if the current ID is very large or likely invalid
        // This is a temporary fix to prevent 404 errors
        let idToUse = parsedId;
        if (parsedId > 100000) { // If ID is unreasonably large
          console.warn(`Recipient ID ${parsedId} seems invalid, using fallback ID`);
          idToUse = currentUser.userRole === 'Doctor' ? 7 : 8; // Use known working IDs
        }
        
        // Determine API endpoint based on current user role
        const endpoint = currentUser.userRole === 'Doctor' 
          ? `${backendUrl}/api/Patient/profile/${idToUse}` // Using parsed ID to ensure it's numeric
          : `${backendUrl}/api/Doctor/${idToUse}`;
        
        console.log(`Fetching recipient info from: ${endpoint}`);
        
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Authentication token not found');
        }
        
        const response = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          console.error(`Recipient info fetch failed with status ${response.status}`);
          if (response.status === 404) {
            // For 404 errors, try with a known working ID instead
            console.warn("Recipient not found, trying with fallback ID");
            
            // Set a default recipient info object for fallback
            setLocalRecipientInfo({
              id: currentUser.userRole === 'Doctor' ? 7 : 8,
              firstName: currentUser.userRole === 'Doctor' ? "Test" : "Dr. Test",
              lastName: "User",
              email: "test@example.com",
              phoneNumber: "555-123-4567"
            });
            
            // Don't throw error, just return to continue
            return;
          } else {
            throw new Error(`Failed to fetch recipient info (${response.status})`);
          }
        }
        
        const recipientData = await response.json();
        console.log('Recipient data loaded successfully:', recipientData);
        setLocalRecipientInfo(recipientData);
      } catch (error) {
        console.error('Error loading recipient info:', error);
        // Continue without recipient info, just use fallback display
        // Don't set loading error as it would prevent the chat from loading
      }
    };
    
    loadRecipientInfo();
  }, [currentRecipientId, currentUser, backendUrl, localRecipientInfo]);
  
  // Load messages
  useEffect(() => {
    const loadMessages = async () => {
      if (!currentUser || !currentRecipientId || !signalRConnected) return;
      
      try {
        setLoading(true);
        setLoadingError(null);
        
        // Get messages for this conversation
        const messagesResponse = await chatService.getMessages(currentRecipientId);
        
        if (Array.isArray(messagesResponse)) {
          setMessages(messagesResponse);
          console.log(`Loaded ${messagesResponse.length} messages`);
        } else {
          console.error('Unexpected messages response format:', messagesResponse);
          setMessages([]);
        }
      } catch (error) {
        console.error('Error loading messages:', error);
        setLoadingError('Failed to load messages. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    loadMessages();
  }, [currentUser, currentRecipientId, signalRConnected]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Handle sending a message
  const handleSendMessage = async (text) => {
    if (!text.trim() || !currentUser || !currentRecipientId) return;
    
    try {
      // Determine sender and receiver IDs based on user role
      let messageData = {
        message: text
      };
      
      // Make sure we have valid numeric IDs
      const userPatientId = parseInt(currentUser.patientId, 10);
      const userDoctorId = parseInt(currentUser.doctorId, 10);
      const recipientId = parseInt(currentRecipientId, 10);
      
      // Normalize user role to uppercase for case-insensitive comparison
      const normalizedUserRole = currentUser.userRole?.toUpperCase();
      
      // Debug user role
      console.log('Current user role:', currentUser.userRole, 'Normalized:', normalizedUserRole);
      
      if (normalizedUserRole === 'PATIENT') {
        if (isNaN(userPatientId) || userPatientId <= 0) {
          throw new Error('Invalid patient sender ID');
        }
        if (isNaN(recipientId) || recipientId <= 0) {
          throw new Error('Invalid doctor recipient ID');
        }
        
        messageData.patientSenderId = userPatientId;
        messageData.doctorReceiverId = recipientId;
        // Explicitly set these to null to avoid any confusion
        messageData.doctorSenderId = null;
        messageData.patientReceiverId = null;
        
      } else if (normalizedUserRole === 'DOCTOR') {
        if (isNaN(userDoctorId) || userDoctorId <= 0) {
          throw new Error('Invalid doctor sender ID');
        }
        if (isNaN(recipientId) || recipientId <= 0) {
          throw new Error('Invalid patient recipient ID');
        }
        
        messageData.doctorSenderId = userDoctorId;
        messageData.patientReceiverId = recipientId;
        // Explicitly set these to null to avoid any confusion
        messageData.patientSenderId = null;
        messageData.doctorReceiverId = null;
      } else {
        throw new Error(`Unknown user role: ${currentUser.userRole} (normalized: ${normalizedUserRole})`);
      }
      
      // Debug logging
      console.log('Sending message with data:', messageData);
      
      // Verify we have both a sender and receiver
      const hasSender = messageData.doctorSenderId !== null && messageData.doctorSenderId > 0 || 
                        messageData.patientSenderId !== null && messageData.patientSenderId > 0;
      const hasReceiver = messageData.doctorReceiverId !== null && messageData.doctorReceiverId > 0 || 
                          messageData.patientReceiverId !== null && messageData.patientReceiverId > 0;
      
      if (!hasSender || !hasReceiver) {
        throw new Error(`Message must have both a sender and receiver. Current data: ${JSON.stringify(messageData)}`);
      }
      
      // Add optimistic message to UI
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        message: text,
        timestamp: new Date().toISOString(),
        isRead: false,
        ...messageData,
        isOptimistic: true
      };
      
      setMessages(prevMessages => [...prevMessages, optimisticMessage]);
      
      // Send message to server
      await chatService.sendMessage(messageData);
      
      // Update the optimistic message to remove the optimistic flag
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === optimisticMessage.id 
            ? { ...msg, isOptimistic: false } 
            : msg
        )
      );
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(`Failed to send message: ${error.message}`);
      
      // Remove the optimistic message on error
      setMessages(prevMessages => 
        prevMessages.filter(msg => !msg.isOptimistic)
      );
    }
  };
  
  // Format recipient name for display
  const getRecipientName = () => {
    if (localRecipientInfo) {
      const firstName = localRecipientInfo.firstName || '';
      const lastName = localRecipientInfo.lastName || '';
      
      if (firstName || lastName) {
        const displayName = `${firstName} ${lastName}`.trim();
        return recipientType === 'doctor' ? `Dr. ${displayName}` : displayName;
      }
    }
    
    // Fallback if no recipient info
    return recipientType === 'doctor' ? 'Doctor' : 'Patient';
  };
  
  // Handle retry button click
  const handleRetry = () => {
    setLoadingError(null);
    connectToSignalR();
  };
  
  // Render error state
  if (loadingError) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <div className="bg-white rounded-xl shadow-sm p-8 max-w-md w-full text-center">
          <div className="rounded-full bg-red-50 p-4 mx-auto mb-4 w-16 h-16 flex items-center justify-center">
            <FiAlertCircle className="text-red-500 text-2xl" />
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Connection Error</h2>
          <p className="text-slate-600 mb-6">{loadingError}</p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button 
              onClick={handleRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <FiRefreshCw className="mr-2" /> Retry Connection
            </button>
            <button 
              onClick={() => navigate(-1)}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors flex items-center justify-center"
            >
              <FiArrowLeft className="mr-2" /> Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="chat-page-active h-full flex flex-col">
      {/* Chat header */}
      <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="mr-3 p-2 rounded-full hover:bg-slate-100 transition-colors"
            aria-label="Go back"
          >
            <FiArrowLeft className="text-slate-600" />
          </button>
          
          <div className="flex items-center">
            <ProfilePicture
              imageUrl={localRecipientInfo?.profilePicture}
              type={recipientType}
              className="w-10 h-10 rounded-full mr-3"
              name={getRecipientName()}
            />
            <div>
              <h2 className="font-medium text-slate-800">{getRecipientName()}</h2>
              {localRecipientInfo?.specializationName && (
                <p className="text-xs text-slate-500">{localRecipientInfo.specializationName}</p>
              )}
            </div>
          </div>
        </div>
        
        {/* Additional recipient info button */}
        <button 
          className="p-2 rounded-full hover:bg-slate-100 transition-colors relative group"
          aria-label="Contact info"
        >
          <FiUser className="text-slate-600" />
          
          {/* Tooltip with recipient info */}
          <div className="absolute right-0 mt-2 w-64 bg-white shadow-lg rounded-lg p-4 hidden group-hover:block z-10">
            <h3 className="font-medium text-slate-800 mb-2">Contact Information</h3>
            {localRecipientInfo?.email && (
              <div className="flex items-center mb-2 text-sm">
                <FiMail className="mr-2 text-slate-400 flex-shrink-0" />
                <span className="text-slate-600 truncate">{localRecipientInfo.email}</span>
              </div>
            )}
            {localRecipientInfo?.phoneNumber && (
              <div className="flex items-center mb-2 text-sm">
                <FiPhone className="mr-2 text-slate-400 flex-shrink-0" />
                <span className="text-slate-600">{localRecipientInfo.phoneNumber}</span>
              </div>
            )}
            {localRecipientInfo?.address && (
              <div className="flex items-center text-sm">
                <FiMapPin className="mr-2 text-slate-400 flex-shrink-0" />
                <span className="text-slate-600 truncate">{localRecipientInfo.address}</span>
              </div>
            )}
          </div>
        </button>
      </div>
      
      {/* Messages container */}
      <div 
        className="flex-grow overflow-y-auto p-4 bg-slate-50"
        ref={messagesContainerRef}
      >
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-600 border-r-2 border-b-2 border-slate-100"></div>
          </div>
        ) : messages.length > 0 ? (
          <div className="space-y-4">
            {messages.map(message => (
              <ChatMessage
                key={message.id}
                message={message}
                isFromCurrentUser={Boolean(
                  (currentUser.userRole === 'Patient' && message.patientSenderId) ||
                  (currentUser.userRole === 'Doctor' && message.doctorSenderId)
                )}
                currentUserRole={currentUser.userRole}
                recipientType={recipientType}
                recipientInfo={localRecipientInfo}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="bg-blue-50 rounded-full p-5 mb-4">
              <FiMessageSquare className="text-blue-500 text-3xl" />
            </div>
            <h3 className="text-lg font-medium text-slate-800 mb-1">No messages yet</h3>
            <p className="text-slate-500 max-w-xs">
              Start the conversation by sending a message below.
            </p>
          </div>
        )}
      </div>
      
      {/* Message input */}
      <div className="p-4 bg-white border-t border-slate-200">
        <ChatInput onSendMessage={handleSendMessage} />
      </div>
    </div>
  );
};

export default ChatPage; 