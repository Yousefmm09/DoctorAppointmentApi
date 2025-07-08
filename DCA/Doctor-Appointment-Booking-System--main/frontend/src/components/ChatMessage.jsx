import React from 'react';
import PropTypes from 'prop-types';
import { format } from 'date-fns';
import ProfilePicture from './ProfilePicture';
import { FiCheck, FiCheckCircle } from 'react-icons/fi';

const ChatMessage = ({ message, isFromCurrentUser, currentUserRole, recipientType, recipientInfo }) => {
  if (!message) return null;
  
  // Ensure isFromCurrentUser is always a boolean
  const isSender = Boolean(isFromCurrentUser);
  
  // Format timestamp
  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return '';
      return format(date, 'h:mm a');
    } catch (error) {
      console.error('Error formatting message time:', error);
      return '';
    }
  };

  // Get sender name
  const getSenderName = () => {
    if (isSender) {
      return 'You';
    }
    
    if (recipientInfo) {
      const firstName = recipientInfo.firstName || '';
      const lastName = recipientInfo.lastName || '';
      
      if (firstName || lastName) {
        const displayName = `${firstName} ${lastName}`.trim();
        return recipientType === 'doctor' ? `Dr. ${displayName}` : displayName;
      }
    }
    
    return recipientType === 'doctor' ? 'Doctor' : 'Patient';
  };
  
  // Get profile image URL
  const getProfileImageUrl = () => {
    if (isSender) {
      return null; // Use default avatar for current user
    }
    
    return recipientInfo?.profilePicture || null;
  };
  
  // Determine user role type for ProfilePicture
  const getUserRoleType = (role) => {
    // Normalize role to lowercase for consistent handling
    const normalizedRole = (role || '').toLowerCase();
    if (normalizedRole === 'doctor' || normalizedRole === 'patient') {
      return normalizedRole;
    }
    // Default to patient if unknown
    return 'patient';
  };
  
  return (
    <div className={`flex ${isSender ? 'justify-end' : 'justify-start'} mb-4`}>
      {/* Avatar for other user's messages */}
      {!isSender && (
        <div className="flex-shrink-0 mr-3">
          <ProfilePicture
            imageUrl={getProfileImageUrl()}
            type={recipientType}
            className="w-8 h-8 rounded-full"
            name={getSenderName()}
          />
        </div>
      )}
      
      {/* Message content */}
      <div className={`flex flex-col max-w-[75%]`}>
        {/* Sender name */}
        {!isSender && (
          <span className="text-xs text-slate-500 mb-1 ml-1">{getSenderName()}</span>
        )}
        
        {/* Message bubble */}
        <div 
          className={`rounded-lg px-4 py-2 inline-block ${
            isSender 
              ? 'bg-blue-600 text-white rounded-br-none' 
              : 'bg-white border border-slate-200 rounded-bl-none shadow-sm'
          }`}
        >
          <p className={`text-sm ${isSender ? 'text-white' : 'text-slate-800'}`}>
            {message.message}
          </p>
        </div>
        
        {/* Timestamp and read status */}
        <div className={`flex items-center mt-1 text-xs ${isSender ? 'justify-end' : 'justify-start'}`}>
          <span className="text-slate-500 mr-1">
            {formatMessageTime(message.timestamp)}
          </span>
          
          {isSender && (
            <span className="text-blue-500">
              {message.isRead ? (
                <FiCheckCircle className="w-3 h-3" />
              ) : (
                <FiCheck className="w-3 h-3" />
              )}
            </span>
          )}
        </div>
      </div>
      
      {/* Avatar for current user's messages */}
      {isSender && (
        <div className="flex-shrink-0 ml-3">
          <ProfilePicture
            imageUrl={null}
            type={getUserRoleType(currentUserRole)}
            className="w-8 h-8 rounded-full"
            name="You"
          />
        </div>
      )}
    </div>
  );
};

ChatMessage.propTypes = {
  message: PropTypes.object.isRequired,
  isFromCurrentUser: PropTypes.bool.isRequired,
  currentUserRole: PropTypes.string.isRequired,
  recipientType: PropTypes.string.isRequired,
  recipientInfo: PropTypes.object
};

export default ChatMessage; 