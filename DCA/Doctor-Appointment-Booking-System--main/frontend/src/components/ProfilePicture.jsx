import React, { useState, useEffect, useContext } from 'react';
import { getProfileImageUrl } from '../utils/imageHelper';
import { DoctorContext } from '../context/DoctorContext';
import { PatientContext } from '../context/PatientContext';
import { AppContext } from '../context/AppContext';
import PropTypes from 'prop-types';

const ProfilePicture = ({ 
  imageUrl, 
  type = 'patient',
  className = 'w-10 h-10',
  alt = 'Profile',
  name = '',
  doctorId = null,
  patientId = null,
  showStatus = true
}) => {
  const [imgError, setImgError] = useState(false);
  const [imageSrc, setImageSrc] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  
  // Normalize type to lowercase for consistent handling
  const normalizedType = (type || '').toLowerCase();
  
  // Access contexts based on normalized type
  const doctorContext = normalizedType === 'doctor' ? useContext(DoctorContext) : null;
  const patientContext = normalizedType === 'patient' ? useContext(PatientContext) : null;
  const { userRole, backendUrl, userData } = useContext(AppContext);
  
  // Get profile data from the appropriate context
  const profileFromContext = normalizedType === 'doctor' 
    ? doctorContext?.doctorProfile 
    : normalizedType === 'patient'
      ? patientContext?.patientProfile
      : null;
  
  useEffect(() => {
    // Reset error state when imageUrl changes
    setImgError(false);
    
    const loadImage = () => {
      try {
        // First check if we have a direct URL or path to use
        if (imageUrl) {
          // If imageUrl is already a full URL, use it directly
          if (imageUrl.startsWith('http') || imageUrl.startsWith('data:')) {
            setImageSrc(imageUrl);
            return;
          }
          
          // If imageUrl is a relative path, join it with backend URL
          if (imageUrl.startsWith('/')) {
            setImageSrc(`${backendUrl}${imageUrl}`);
            return;
          }
        }
        
        // If no direct URL, try to determine ID based on type and fetch from API
        let idToUse = null;
        
        // Handle Doctor Images
        if (normalizedType === 'doctor') {
          // Try to get the doctor ID from props or context
          idToUse = doctorId || 
                    (profileFromContext?.id) || 
                    (userData?.doctorId) ||
                    (userRole?.toUpperCase() === 'DOCTOR' ? userData?.id : null) ||
                    localStorage.getItem("doctorId");
                    
          // If we have an ID, use the API endpoint with cache busting
          if (idToUse) {
            setImageSrc(`${backendUrl}/api/Doctor/profile-picture/${idToUse}?t=${Date.now()}`);
            return;
          }
          
          // If imageUrl might be an ID, try that as a fallback
          if (imageUrl && (typeof imageUrl === 'string' && /^\d+$/.test(imageUrl.trim()))) {
            setImageSrc(`${backendUrl}/api/Doctor/profile-picture/${imageUrl}?t=${Date.now()}`);
            return;
          }
        }
        // Handle Patient Images
        else if (normalizedType === 'patient') {
          // Try to get the patient ID from props or context
          idToUse = patientId || 
                    (profileFromContext?.id) || 
                    (userData?.patientId) ||
                    (userRole?.toUpperCase() === 'PATIENT' ? userData?.id : null) ||
                    localStorage.getItem("patientId");
                    
          // If we have an ID, use the API endpoint
          if (idToUse) {
            setImageSrc(`${backendUrl}/api/Patient/profile-picture/${idToUse}?t=${Date.now()}`);
            return;
          }
          
          // If imageUrl might be an ID, try that as a fallback
          if (imageUrl && (typeof imageUrl === 'string' && /^\d+$/.test(imageUrl.trim()))) {
            setImageSrc(`${backendUrl}/api/Patient/profile-picture/${imageUrl}?t=${Date.now()}`);
            return;
          }
        }
        
        // If we couldn't determine a good URL, set error
        setImgError(true);
      } catch (err) {
        console.error("Error setting profile image URL:", err);
        setImgError(true);
      }
    };
    
    loadImage();
  }, [imageUrl, normalizedType, doctorId, patientId, profileFromContext, userRole, userData, retryCount, backendUrl]);
  
  // Retry loading image if it fails
  const handleImageError = () => {
    setImgError(true);
    
    // Try to reload with a fresh cache buster if we haven't retried too many times
    if (retryCount < 2) {
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
      }, 500);
    }
  };
  
  // Get initials for the fallback
  const getInitials = () => {
    if (name && name.trim() !== '') {
      // If we have a name, extract initials
      const nameParts = name.trim().split(' ');
      if (nameParts.length >= 2) {
        return `${nameParts[0].charAt(0)}${nameParts[nameParts.length - 1].charAt(0)}`.toUpperCase();
      } else if (nameParts.length === 1) {
        return nameParts[0].charAt(0).toUpperCase();
      }
    }
    
    // Fallback if no proper name
    return normalizedType === 'doctor' ? 'DR' : 'P';
  };
  
  // Get background color based on type and name
  const getBackgroundColor = () => {
    if (normalizedType === 'doctor') {
      return 'bg-blue-100 hover:bg-blue-200';
    } else if (normalizedType === 'patient') {
      return 'bg-green-100 hover:bg-green-200';
    }
    return 'bg-gray-100 hover:bg-gray-200';
  };

  // Get text color based on type
  const getTextColor = () => {
    if (normalizedType === 'doctor') {
      return 'text-blue-700';
    } else if (normalizedType === 'patient') {
      return 'text-green-700';
    }
    return 'text-gray-700';
  };

  // Generate avatar URL as fallback if needed
  const getAvatarUrl = () => {
    const displayName = name || (normalizedType === 'doctor' ? 'Doctor' : 'Patient');
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0D8ABC&color=fff&size=256`;
  };

  const baseClasses = `relative overflow-hidden ${className} ${!imageUrl || imgError ? getBackgroundColor() : ''}`;
  const fallbackClasses = `flex items-center justify-center font-semibold ${getTextColor()}`;
  
  return (
    <div 
      className={`${baseClasses} ${fallbackClasses} rounded-full transition-all duration-200`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={name || (normalizedType === 'doctor' ? 'Doctor' : 'Patient')}
    >
      {(!imageUrl || imgError) ? (
        // If we have no image or error, show initials or fallback avatar
        <span className="text-sm">{getInitials()}</span>
      ) : (
        <img
          src={imageSrc || getAvatarUrl()}
          alt={name || 'Profile'}
          onError={handleImageError}
          className="w-full h-full object-cover"
        />
      )}
      
      {/* Online status indicator - only show if enabled */}
      {showStatus && (
        <div className="absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full bg-green-400"></div>
      )}
      
      {/* Hover overlay */}
      {isHovered && (
        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center transition-opacity duration-200">
          <span className="sr-only">View profile</span>
        </div>
      )}
    </div>
  );
};

ProfilePicture.propTypes = {
  imageUrl: PropTypes.string,
  type: PropTypes.oneOf(['doctor', 'patient', 'Doctor', 'Patient']), // Allow both cases
  className: PropTypes.string,
  alt: PropTypes.string,
  name: PropTypes.string,
  doctorId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  patientId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  showStatus: PropTypes.bool
};

export default ProfilePicture;