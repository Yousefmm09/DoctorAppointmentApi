import { useContext } from 'react';
import { AppContext } from '../context/AppContext';

// Helper function to get the full URL for a profile picture
export const getProfileImageUrl = (imagePath, type = 'patient', profileData = null) => {
  // Get the backend URL from environment variables or use default
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5109';
  
  // If no image path is provided, return a local placeholder
  if (!imagePath || typeof imagePath !== 'string') {
    return `/assets/placeholder-${type}.png`;
  }

  // Check if the path is already a full URL
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  try {
    // DOCTOR PROFILE PICTURES: Use the dedicated endpoint
    if (type === 'doctor') {
      // Get the doctor ID - from different possible sources
      let doctorId = null;
      
      // Case 1: Direct numeric ID as string
      if (typeof profileData === 'string' && /^\d+$/.test(profileData.trim())) {
        doctorId = profileData.trim();
      } 
      // Case 2: Object with ID property
      else if (profileData && typeof profileData === 'object') {
        if (profileData.id) {
          doctorId = profileData.id;
        } else if (profileData.doctorId) {
          doctorId = profileData.doctorId;
        }
      }
      // Case 3: From localStorage if we have no other ID
      if (!doctorId) {
        const storedDoctorId = localStorage.getItem("doctorId");
        if (storedDoctorId) {
          doctorId = storedDoctorId;
        }
      }
      
      // If we have a doctorId, always use the dedicated endpoint
      if (doctorId) {
        // Add timestamp to prevent browser caching
        return `${backendUrl}/api/Doctor/profile-picture/${doctorId}`;
      }
      
      // If imageUrl looks like it might be a doctor ID (either UUID or numeric)
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(imagePath) || /^\d+$/.test(imagePath)) {
        return `${backendUrl}/api/Doctor/profile-picture/${imagePath}`;
      }

      // If it's a full path, use it directly
      if (imagePath.startsWith('/uploads/doctor/') || imagePath.startsWith('/uploads/doctors/')) {
        return `${backendUrl}${imagePath}`;
      }

      // If no other condition matches, try using it as a doctor ID
      return `${backendUrl}/api/Doctor/profile-picture/${imagePath}`;
    }
    
    // PATIENT PROFILE PICTURES: Use the dedicated endpoint
    if (type === 'patient') {
      // Get the patient ID - from different possible sources
      let patientId = null;
      
      // Case 1: Direct numeric ID as string
      if (typeof profileData === 'string' && /^\d+$/.test(profileData.trim())) {
        patientId = profileData.trim();
      } 
      // Case 2: Object with ID property
      else if (profileData && typeof profileData === 'object') {
        if (profileData.id) {
          patientId = profileData.id;
        } else if (profileData.patientId) {
          patientId = profileData.patientId;
        }
      }
      // Case 3: From localStorage if we have no other ID
      if (!patientId) {
        const storedPatientId = localStorage.getItem("patientId");
        if (storedPatientId) {
          patientId = storedPatientId;
        }
      }
      
      // If we have a patientId, use the dedicated endpoint
      if (patientId) {
        // Add timestamp to prevent browser caching
        return `${backendUrl}/api/Patient/profile-picture/${patientId}?t=${Date.now()}`;
      }
      
      // If imageUrl looks like it might be a patient ID (numeric)
      if (/^\d+$/.test(imagePath)) {
        return `${backendUrl}/api/Patient/profile-picture/${imagePath}?t=${Date.now()}`;
      }
    }
    
    // OTHER IMAGES: Use the direct path
    const formattedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
    return `${backendUrl}${formattedPath}`;
  } catch (error) {
    console.error('Error formatting image URL:', error);
    return `/assets/placeholder-${type}.png`;
  }
};

// Custom hook to get a profile image URL using the AppContext
export const useProfileImage = (imagePath, type = 'patient') => {
  const { backendUrl } = useContext(AppContext);
  
  if (!imagePath || typeof imagePath !== 'string') {
    return `/assets/placeholder-${type}.png`;
  }
  
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  try {
    // For doctor profiles, use the dedicated endpoint
    if (type === 'doctor') {
      // If imageUrl looks like it might be a doctor ID
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(imagePath) || /^\d+$/.test(imagePath)) {
        return `${backendUrl}/api/Doctor/profile-picture/${imagePath}`;
      }
      // If it's a full path, use it directly
      if (imagePath.startsWith('/uploads/doctor/') || imagePath.startsWith('/uploads/doctors/')) {
        return `${backendUrl}${imagePath}`;
      }
      // If no other condition matches, try using it as a doctor ID
      return `${backendUrl}/api/Doctor/profile-picture/${imagePath}`;
    }
    
    // For patient profiles, use the dedicated endpoint
    if (type === 'patient') {
      // If imageUrl looks like it might be a patient ID
      if (/^\d+$/.test(imagePath)) {
        return `${backendUrl}/api/Patient/profile-picture/${imagePath}?t=${Date.now()}`;
      }
    }
    
    // For other image types, use the direct file path
    const formattedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
    return `${backendUrl}${formattedPath}`;
  } catch (error) {
    console.error('Error formatting image URL:', error);
    return `/assets/placeholder-${type}.png`;
  }
};

// Function to format dates
export const formatDate = (dateString) => {
  if (!dateString) return 'Not specified';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};
