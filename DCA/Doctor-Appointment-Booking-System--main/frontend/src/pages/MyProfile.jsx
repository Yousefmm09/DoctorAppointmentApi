import React, { useContext, useState, useEffect } from "react";
import { AppContext } from "../context/AppContext";
import { toast } from "react-toastify";
import axios from "axios";
import { getProfileImageUrl } from "../utils/imageHelper";
import { PatientContext } from '../context/PatientContext';
import { FaCamera, FaSave, FaEdit, FaTimes, FaIdCard, FaPhone, FaEnvelope, FaMapMarkerAlt, FaCalendarAlt, FaUserMd, FaHistory, FaExclamationTriangle, FaUser } from 'react-icons/fa';
import { FiUser, FiPhone, FiMail, FiMapPin, FiCalendar, FiInfo, FiSave, FiEdit, FiX, FiCamera, FiAlertTriangle, FiCheckCircle, FiLoader, FiRefreshCw } from 'react-icons/fi';
import ProfilePicture from "../components/ProfilePicture";
import PhoneVerification from "../components/common/PhoneVerification";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const MyProfile = () => {
  const { userData, setUserData, token, backendUrl, userRole } = useContext(AppContext);
  const { patientProfile, updatePatientProfile, getPatientByUserId } = useContext(PatientContext);
  const [isEdit, setIsEdit] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    id: '',
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    medicalHistory: '',
    allergies: '',
    emergencyContactName: '',
    emergencyContactNumber: ''
  });
  const [errors, setErrors] = useState({});
  const [profilePicture, setProfilePicture] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [patientId, setPatientId] = useState(null);
  const [activeTab, setActiveTab] = useState('personal');
  const [dataLoaded, setDataLoaded] = useState(false);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const navigate = useNavigate();

  const fieldGroups = {
    personal: ["firstName", "lastName", "email", "phoneNumber", "dateOfBirth", "gender"],
    address: ["address", "city", "state", "zipCode"],
    medical: ["medicalHistory", "allergies", "emergencyContactName", "emergencyContactNumber"]
  };

  useEffect(() => {
    if (patientProfile) {
      console.log("Setting form data from patient profile:", patientProfile);
      
      if (Object.keys(patientProfile).length > 1) {
        const formattedDOB = patientProfile.dateOfBirth 
          ? new Date(patientProfile.dateOfBirth).toISOString().split('T')[0] 
          : '';
          
        setFormData({
          id: patientProfile.id || '',
          firstName: patientProfile.firstName || '',
          lastName: patientProfile.lastName || '',
          email: patientProfile.email || '',
          phoneNumber: patientProfile.phoneNumber || '',
          dateOfBirth: formattedDOB,
          gender: patientProfile.gender || '',
          address: patientProfile.address || '',
          city: patientProfile.city || '',
          state: patientProfile.state || '',
          zipCode: patientProfile.zipCode || '',
          medicalHistory: patientProfile.medicalHistory || '',
          allergies: patientProfile.allergies || '',
          emergencyContactName: patientProfile.emergencyContactName || '',
          emergencyContactNumber: patientProfile.emergencyContactNumber || ''
        });
        
        console.log("Form data set:", {
          firstName: patientProfile.firstName,
          lastName: patientProfile.lastName,
          email: patientProfile.email,
          dateOfBirth: formattedDOB
        });
        
        if (patientProfile.id) {
          const numericId = parseInt(patientProfile.id);
          setPatientId(numericId);
          localStorage.setItem('patientId', numericId);
          console.log("Patient ID set from context:", numericId);
        }
        
        if (patientProfile.profilePicture) {
          const profileImageUrl = getProfileImageUrl(patientProfile.profilePicture, 'patient');
          setPreviewImage(profileImageUrl);
        }
        
        setDataLoaded(true);
        setLoading(false);
      } else {
        console.log("Skipping form data update - incomplete profile data in context");
        if (dataLoaded) {
          setLoading(false);
        }
      }
    }
  }, [patientProfile]);

  const refreshProfile = async () => {
    setLoading(true);
    setDataLoaded(false);
    await loadUserProfile();
  };

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const userId = userData?.id || localStorage.getItem('userId');
        const authToken = token || localStorage.getItem('token');
        
        if (!userId || !authToken) {
          console.error('Missing userId or token for profile fetch');
          setLoading(false);
          return;
        }
        
        console.log('Direct API call to fetch profile data');
        
        let patientIdToUse = localStorage.getItem('patientId');
        
        if (!patientIdToUse) {
          console.log("No patient ID found in localStorage, will try to get from API");
        } else {
          console.log("Using patient ID from localStorage:", patientIdToUse);
        }
        
        const response = await axios.get(`${backendUrl}/api/Patient/profile/${patientIdToUse || 0}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (response.data) {
          console.log('Directly fetched profile data:', response.data);
          
          const patientIdFromApi = response.data.id;
          
          if (patientIdFromApi && !isNaN(parseInt(patientIdFromApi))) {
            const numericPatientId = parseInt(patientIdFromApi);
            
            setPatientId(numericPatientId);
            console.log("Setting patientId state to:", numericPatientId);
            
            localStorage.setItem('patientId', numericPatientId);
            console.log("Saved patientId to localStorage:", numericPatientId);
          } else {
            console.error("Invalid patient ID from API:", patientIdFromApi);
          }
          
          setFormData({
            id: response.data.id || '',
            firstName: response.data.firstName || '',
            lastName: response.data.lastName || '',
            email: response.data.email || '',
            phoneNumber: response.data.phoneNumber || '',
            dateOfBirth: response.data.dateOfBirth ? new Date(response.data.dateOfBirth).toISOString().split('T')[0] : '',
            gender: response.data.gender || '',
            address: response.data.address || '',
            city: response.data.city || '',
            state: response.data.state || '',
            zipCode: response.data.zipCode || '',
            medicalHistory: response.data.medicalHistory || '',
            allergies: response.data.allergies || '',
            emergencyContactName: response.data.emergencyContactName || '',
            emergencyContactNumber: response.data.emergencyContactNumber || ''
          });
          
          if (updatePatientProfile && typeof updatePatientProfile === 'function') {
            console.log('Updating patient context with directly fetched data');
            
            const contextData = {
              Id: response.data.id,
              FirstName: response.data.firstName,
              LastName: response.data.lastName,
              Email: response.data.email,
              PhoneNumber: response.data.phoneNumber,
              ProfilePicture: response.data.profilePicture,
              Address: response.data.address,
              Gender: response.data.gender,
              DateOfBirth: response.data.dateOfBirth,
              City: response.data.city,
              ZipCode: response.data.zipCode
            };
            
            try {
              await updatePatientProfile(response.data.id, contextData);
              console.log("Profile context updated successfully");
            } catch (err) {
              console.error("Failed to update profile context:", err);
              
              if (err.response) {
                console.error("Error response status:", err.response.status);
                console.error("Error response data:", JSON.stringify(err.response.data));
              }
            }
          }
          
          if (response.data.profilePicture) {
            try {
              const profileImageUrl = getProfileImageUrl(response.data.profilePicture, 'patient');
              console.log("Profile image URL:", profileImageUrl);
              
              const img = new Image();
              img.onload = () => {
                console.log("Profile image loaded successfully");
                setPreviewImage(profileImageUrl);
              };
              img.onerror = () => {
                console.error("Failed to load profile image, using fallback");
                setPreviewImage(null);
              };
              img.src = profileImageUrl;
            } catch (err) {
              console.error("Error processing profile picture URL:", err);
            }
          }
          
          setDataLoaded(true);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error directly fetching profile:', error);
        if (error.response) {
          console.error("Error response status:", error.response.status);
          console.error("Error response data:", JSON.stringify(error.response.data));
        }
        loadUserProfile();
      }
    };
    
    if (!dataLoaded) {
      fetchProfileData();
    }
  }, [userData, token, backendUrl, updatePatientProfile, dataLoaded]);

  useEffect(() => {
    if (!dataLoaded && token) {
      loadUserProfile();
    }
  }, [token, dataLoaded]);

  const loadUserProfile = async () => {
    try {
      let userId = null;
      let authToken = token;
      
      if (userData && userData.id) {
        userId = userData.id;
      } else {
        userId = localStorage.getItem('userId');
      }
      
      if (!authToken) {
        authToken = localStorage.getItem('token');
        if (!authToken) {
          setError('Authentication token not found. Please try logging in again.');
          setLoading(false);
          return;
        }
      }
      
      if (!userId) {
        setError('User ID not found. Please try logging in again.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        const patientData = await getPatientByUserId(userId);
        
        if (patientData) {
          console.log("Patient data loaded from context:", patientData);
          
          if (patientData.id && !isNaN(parseInt(patientData.id))) {
            const numericPatientId = parseInt(patientData.id);
            
            setPatientId(numericPatientId);
            console.log("Setting patientId state from context to:", numericPatientId);
            
            localStorage.setItem('patientId', numericPatientId);
            console.log("Saved patientId from context to localStorage:", numericPatientId);
          } else {
            console.error("Invalid patient ID from context:", patientData.id);
          }
          
          setLoading(false);
        } else {
          console.log("Loading profile directly for user ID:", userId);
          const profileResponse = await axios.get(`${backendUrl}/api/Patient/by-user-id/${userId}`, {
            headers: {
              'Authorization': `Bearer ${authToken}`
            }
          });
          
          const data = profileResponse.data;
          console.log("Profile data loaded directly:", data);
          
          if (data.id && !isNaN(parseInt(data.id))) {
            const numericPatientId = parseInt(data.id);
            
            setPatientId(numericPatientId);
            console.log("Setting patientId state from API to:", numericPatientId);
            
            localStorage.setItem('patientId', numericPatientId);
            console.log("Saved patientId from API to localStorage:", numericPatientId);
          } else {
            console.error("Invalid patient ID from API:", data.id);
          }
          
          setFormData({
            id: data.id,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            email: data.email || '',
            phoneNumber: data.phoneNumber || '',
            dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString().split('T')[0] : '',
            gender: data.gender || '',
            address: data.address || '',
            city: data.city || '',
            state: data.state || '',
            zipCode: data.zipCode || '',
            medicalHistory: data.medicalHistory || '',
            allergies: data.allergies || '',
            emergencyContactName: data.emergencyContactName || '',
            emergencyContactNumber: data.emergencyContactNumber || ''
          });
          
          if (data.profilePicture) {
            const profileImageUrl = getProfileImageUrl(data.profilePicture, 'patient');
            console.log("Profile image URL:", profileImageUrl);
            setPreviewImage(profileImageUrl);
          }
          
          setUserData(prev => ({
            ...prev,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phoneNumber: data.phoneNumber,
            profilePicture: data.profilePicture
          }));
          
          setLoading(false);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        if (error.response?.status === 404) {
          setIsCreating(true);
        } else {
          setError(error.response?.data?.title || error.message || 'Failed to load profile data');
          toast.error(error.response?.data?.title || error.message || 'Failed to load profile data');
        }
        setLoading(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setError('An unexpected error occurred. Please try again later.');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserProfile();
  }, []);

  useEffect(() => {
    const returnPath = localStorage.getItem('returnToPath');
    if (returnPath && patientProfile?.id && !isEdit && !loading && !isCreating) {
      console.log(`Profile complete, returning to: ${returnPath}`);
      localStorage.removeItem('returnToPath');
      navigate(returnPath);
    }
  }, [patientProfile, isEdit, loading, isCreating, navigate]);

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }
    
    setProfilePicture(file);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.firstName) newErrors.firstName = 'First name is required';
    if (!formData.lastName) newErrors.lastName = 'Last name is required';
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.phoneNumber) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^[\d\s+()-]+$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Phone number is invalid';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("Please correct the errors in the form");
      return;
    }
    
    setUpdating(true);
    
    try {
      let authToken = token;
      if (!authToken) {
        authToken = localStorage.getItem('token');
        if (!authToken) {
          throw new Error('Authentication token not found. Please try logging in again.');
        }
      }
      
      console.log("Current formData.id:", formData.id, "type:", typeof formData.id);
      console.log("Current patientId state:", patientId, "type:", typeof patientId);
      console.log("Current localStorage patientId:", localStorage.getItem('patientId'));
      
      let patientIdValue = null;
      
      if (formData.id && !isNaN(parseInt(formData.id))) {
        patientIdValue = parseInt(formData.id);
        console.log("Using formData.id:", patientIdValue);
      } 
      else if (patientId && !isNaN(parseInt(patientId))) {
        patientIdValue = parseInt(patientId);
        console.log("Using patientId state:", patientIdValue);
      } 
      else if (localStorage.getItem('patientId') && !isNaN(parseInt(localStorage.getItem('patientId')))) {
        patientIdValue = parseInt(localStorage.getItem('patientId'));
        console.log("Using localStorage patientId:", patientIdValue);
      }
      
      if (!patientIdValue || isNaN(patientIdValue)) {
        throw new Error('Patient ID is missing or invalid. Please refresh the page and try again.');
      }
      
      const formDataToSend = new FormData();
      
      console.log("Submitting update with patient ID:", patientIdValue);
      
      formDataToSend.append("Id", patientIdValue);
      
      formDataToSend.append("FirstName", formData.firstName || '');
      formDataToSend.append("LastName", formData.lastName || '');
      formDataToSend.append("Email", formData.email || '');
      formDataToSend.append("PhoneNumber", formData.phoneNumber || '');
      
      if (formData.address) formDataToSend.append("Address", formData.address);
      if (formData.gender) formDataToSend.append("Gender", formData.gender);
      if (formData.dateOfBirth) formDataToSend.append("DateOfBirth", formData.dateOfBirth);
      if (formData.city) formDataToSend.append("City", formData.city);
      if (formData.zipCode) formDataToSend.append("ZipCode", formData.zipCode);
      if (formData.state) formDataToSend.append("State", formData.state);
      if (formData.medicalHistory) formDataToSend.append("MedicalHistory", formData.medicalHistory);
      if (formData.allergies) formDataToSend.append("Allergies", formData.allergies);
      if (formData.emergencyContactName) formDataToSend.append("EmergencyContactName", formData.emergencyContactName);
      if (formData.emergencyContactNumber) formDataToSend.append("EmergencyContactNumber", formData.emergencyContactNumber);
      
      if (profilePicture) {
        formDataToSend.append("ProfilePictureFile", profilePicture);
      }

      console.log("FormData entries being sent:");
      for (let pair of formDataToSend.entries()) {
        console.log(pair[0] + ': ' + (pair[1] instanceof File ? `File: ${pair[1].name}` : pair[1]));
      }

      console.log("Using direct API call for update");
      const response = await axios.put(
        `${backendUrl}/api/Patient/update-profile/${patientIdValue}`,
        formDataToSend,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          }
        }
      );
      
      const success = response.status >= 200 && response.status < 300;
      console.log("Profile update response:", response);
      
      if (success) {
        setUserData(prev => ({
          ...prev,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phoneNumber: formData.phoneNumber
        }));
        
        setIsEdit(false);
        toast.success('Profile updated successfully');
        
        if (patientIdValue) {
          localStorage.setItem('patientId', patientIdValue);
        }
        
        await loadUserProfile();
        
        const returnPath = localStorage.getItem('returnToPath');
        if (returnPath) {
          localStorage.removeItem('returnToPath');
          navigate(returnPath);
        }
      } else {
        throw new Error("Failed to update profile");
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      
      if (error.response) {
        console.error('Error response status:', error.response.status);
        console.error('Error response data:', error.response.data ? JSON.stringify(error.response.data) : 'No response data');
        
        if (error.response.data && error.response.data.errors) {
          const validationErrors = error.response.data.errors;
          console.error('Validation errors:', validationErrors);
          
          if (typeof validationErrors === 'object') {
            Object.keys(validationErrors).forEach(key => {
              toast.error(`${key}: ${validationErrors[key].join(', ')}`);
            });
          }
        }
      } else if (error.request) {
        console.error('No response received from server');
        toast.error('Server did not respond. Please check your connection and try again.');
      } else {
        console.error('Error setting up request:', error.message);
        toast.error(error.message || 'Failed to update profile');
      }
    } finally {
      setUpdating(false);
    }
  };

  const cancelEdit = () => {
    if (patientProfile) {
      setFormData({
        id: patientProfile.id,
        firstName: patientProfile.firstName || '',
        lastName: patientProfile.lastName || '',
        email: patientProfile.email || '',
        phoneNumber: patientProfile.phoneNumber || '',
        dateOfBirth: patientProfile.dateOfBirth ? new Date(patientProfile.dateOfBirth).toISOString().split('T')[0] : '',
        gender: patientProfile.gender || '',
        address: patientProfile.address || '',
        city: patientProfile.city || '',
        state: patientProfile.state || '',
        zipCode: patientProfile.zipCode || '',
        medicalHistory: patientProfile.medicalHistory || '',
        allergies: patientProfile.allergies || '',
        emergencyContactName: patientProfile.emergencyContactName || '',
        emergencyContactNumber: patientProfile.emergencyContactNumber || ''
      });
      
      if (patientProfile.profilePicture) {
        setPreviewImage(getProfileImageUrl(patientProfile.profilePicture, 'patient'));
      } else {
        setPreviewImage(null);
      }
      
      setProfilePicture(null);
    }
    
    setErrors({});
    setIsEdit(false);
  };

  const renderProfileAvatar = () => {
    const sanitizedFirstName = formData.firstName?.trim() || '';
    const sanitizedLastName = formData.lastName?.trim() || '';
    
    const getInitials = () => {
      if (sanitizedFirstName && sanitizedLastName) {
        try {
          const firstInitial = [...sanitizedFirstName].find(char => /\p{L}/u.test(char)) || '?';
          const lastInitial = [...sanitizedLastName].find(char => /\p{L}/u.test(char)) || '?';
          return `${firstInitial}${lastInitial}`.toUpperCase();
        } catch (e) {
          console.error("Error creating initials:", e);
          return "??";
        }
      } 
      else if (sanitizedFirstName) {
        try {
          const initial = [...sanitizedFirstName].find(char => /\p{L}/u.test(char)) || '?';
          return initial.toUpperCase();
        } catch (e) {
          console.error("Error creating initial:", e);
          return "?";
        }
      }
      return "U";
    };

    if (previewImage) {
      return (
        <div className="w-full h-full rounded-full overflow-hidden">
          <img 
            src={previewImage} 
            alt={`${sanitizedFirstName || ''} ${sanitizedLastName || ''} profile`} 
            className="w-full h-full object-cover"
            onError={(e) => {
              console.log("Image failed to load, using fallback");
              e.target.onerror = null;
              e.target.style.display = 'none';
              e.target.parentNode.style.backgroundColor = '#10b981';
              e.target.parentNode.style.display = 'flex';
              e.target.parentNode.style.alignItems = 'center';
              e.target.parentNode.style.justifyContent = 'center';
              
              const textElem = document.createElement('span');
              textElem.textContent = getInitials();
              textElem.style.color = 'white';
              textElem.style.fontSize = '1.875rem';
              textElem.style.fontWeight = 'bold';
              e.target.parentNode.appendChild(textElem);
            }}
          />
        </div>
      );
    }
    
    return (
      <div className="w-full h-full rounded-full bg-emerald-500 flex items-center justify-center text-white text-3xl font-bold">
        {getInitials()}
      </div>
    );
  };

  const renderInputField = (field, label, type = "text", icon = null, placeholder = "", disabled = !isEdit) => {
    // Special handling for phone number field to add Change button
    if (field === 'phoneNumber') {
      return (
        <div className="mb-4">
          <label htmlFor={field} className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
            {icon && <span className="mr-2">{icon}</span>}
            {label}
          </label>
          <div className="flex">
            <input
              type={type}
              id={field}
              name={field}
              value={formData[field] || ''}
              onChange={handleChange}
              placeholder={placeholder}
              disabled={true} // Always disabled for phone number
              className={`w-full px-3 py-2 border ${
                errors[field] ? 'border-red-500' : 'border-gray-300'
              } rounded-l-md shadow-sm focus:outline-none focus:ring-2 ${
                errors[field] ? 'focus:ring-red-500' : 'focus:ring-blue-500'
              } focus:border-${errors[field] ? 'red' : 'blue'}-500 bg-gray-100 text-gray-500`}
            />
            <button
              type="button"
              onClick={() => setShowPhoneVerification(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 transition-colors"
              disabled={!isEdit}
            >
              Change
            </button>
          </div>
          {errors[field] && (
            <p className="mt-1 text-sm text-red-600">{errors[field]}</p>
          )}
        </div>
      );
    }
    
    // Regular input field for other fields
    return (
      <div className="mb-4">
        <label htmlFor={field} className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
          {icon && <span className="mr-2">{icon}</span>}
          {label}
        </label>
        <input
          type={type}
          id={field}
          name={field}
          value={formData[field] || ''}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-3 py-2 border ${
            errors[field] ? 'border-red-500' : 'border-gray-300'
          } rounded-md shadow-sm focus:outline-none focus:ring-2 ${
            errors[field] ? 'focus:ring-red-500' : 'focus:ring-blue-500'
          } focus:border-${errors[field] ? 'red' : 'blue'}-500 ${
            disabled ? 'bg-gray-100 text-gray-500' : 'bg-white'
          } transition-colors duration-200`}
        />
        {errors[field] && (
          <p className="mt-1 text-sm text-red-600">{errors[field]}</p>
        )}
      </div>
    );
  };

  const renderPersonalInfoTab = () => {
    return (
      <div className="space-y-4 py-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <FiUser className="mr-2 text-blue-600" /> Personal Information
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          {renderInputField("firstName", "First Name", "text", <FiUser />, "Enter your first name")}
          {renderInputField("lastName", "Last Name", "text", <FiUser />, "Enter your last name")}
          {renderInputField("email", "Email Address", "email", <FiMail />, "Enter your email address")}
          {renderInputField("phoneNumber", "Phone Number", "tel", <FiPhone />, "Enter your phone number")}
          {renderInputField("dateOfBirth", "Date of Birth", "date", <FiCalendar />)}
          
          <div className="mb-4">
            <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
              <FiInfo className="inline mr-2" /> Gender
            </label>
            <select
              id="gender"
              name="gender"
              value={formData.gender || ''}
              onChange={handleChange}
              disabled={!isEdit}
              className={`w-full px-3 py-2 border ${
                errors.gender ? 'border-red-500' : 'border-gray-300'
              } rounded-md shadow-sm focus:outline-none focus:ring-2 ${
                errors.gender ? 'focus:ring-red-500' : 'focus:ring-blue-500'
              } focus:border-${errors.gender ? 'red' : 'blue'}-500 ${
                !isEdit ? 'bg-gray-100 text-gray-500' : 'bg-white'
              } transition-colors duration-200`}
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
            {errors.gender && (
              <p className="mt-1 text-sm text-red-600">{errors.gender}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderAddressTab = () => {
    return (
      <div className="space-y-4 py-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <FiMapPin className="mr-2 text-blue-600" /> Address Information
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          {renderInputField("address", "Address Line", "text", <FiMapPin />, "Enter your street address")}
          {renderInputField("city", "City", "text", <FiMapPin />, "Enter your city")}
          {renderInputField("state", "State/Province", "text", <FiMapPin />, "Enter your state")}
          {renderInputField("zipCode", "Zip/Postal Code", "text", <FiMapPin />, "Enter your zip code")}
        </div>
      </div>
    );
  };

  const renderMedicalTab = () => {
    return (
      <div className="space-y-4 py-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <FiAlertTriangle className="mr-2 text-blue-600" /> Medical Information
        </h3>
        
        <div className="mb-4">
          <label htmlFor="medicalhistory" className="block text-sm font-medium text-gray-700 mb-1">
            <FiAlertTriangle className="inline mr-2" /> Medical History
          </label>
          <textarea
            id="medicalhistory"
            name="medicalHistory"
            value={formData.medicalHistory || ''}
            onChange={handleChange}
            disabled={!isEdit}
            placeholder="Enter your medical history"
            className={`w-full px-3 py-2 border ${
              errors.medicalHistory ? 'border-red-500' : 'border-gray-300'
            } rounded-md shadow-sm focus:outline-none focus:ring-2 ${
              errors.medicalHistory ? 'focus:ring-red-500' : 'focus:ring-blue-500'
            } focus:border-${errors.medicalHistory ? 'red' : 'blue'}-500 ${
              !isEdit ? 'bg-gray-100 text-gray-500' : 'bg-white'
            } transition-colors duration-200`}
            rows={4}
          />
          {errors.medicalHistory && (
            <p className="mt-1 text-sm text-red-600">{errors.medicalHistory}</p>
          )}
        </div>
        
        <div className="mb-4">
          <label htmlFor="allergies" className="block text-sm font-medium text-gray-700 mb-1">
            <FiAlertTriangle className="inline mr-2" /> Allergies
          </label>
          <textarea
            id="allergies"
            name="allergies"
            value={formData.allergies || ''}
            onChange={handleChange}
            disabled={!isEdit}
            placeholder="Enter your allergies"
            className={`w-full px-3 py-2 border ${
              errors.allergies ? 'border-red-500' : 'border-gray-300'
            } rounded-md shadow-sm focus:outline-none focus:ring-2 ${
              errors.allergies ? 'focus:ring-red-500' : 'focus:ring-blue-500'
            } focus:border-${errors.allergies ? 'red' : 'blue'}-500 ${
              !isEdit ? 'bg-gray-100 text-gray-500' : 'bg-white'
            } transition-colors duration-200`}
            rows={3}
          />
          {errors.allergies && (
            <p className="mt-1 text-sm text-red-600">{errors.allergies}</p>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          {renderInputField("emergencyContactName", "Emergency Contact Name", "text", <FiUser />, "Enter emergency contact name")}
          {renderInputField("emergencyContactNumber", "Emergency Contact Number", "tel", <FiPhone />, "Enter emergency contact number")}
        </div>
      </div>
    );
  };

  // Handle phone verification success
  const handlePhoneVerificationSuccess = (newPhoneNumber) => {
    setFormData(prev => ({ ...prev, phoneNumber: newPhoneNumber }));
    setShowPhoneVerification(false);
    // Re-fetch patient profile to get the updated phone number
    if (getPatientByUserId && userData?.id) {
      getPatientByUserId(userData.id);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <motion.div 
          className="bg-white rounded-xl shadow-md p-8 max-w-md w-full text-center border border-slate-100"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-16 h-16 border-4 border-t-blue-600 border-blue-100 border-b-blue-600 rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Loading your profile</h2>
          <p className="text-slate-500 mb-4">Please wait while we retrieve your information...</p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-blue-500 rounded-full"
              initial={{ width: "10%" }}
              animate={{ width: "80%" }}
              transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
            />
          </div>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-xl p-8 shadow-md max-w-md w-full text-center border border-slate-100"
        >
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FiAlertTriangle className="text-red-500 text-4xl" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Profile Error</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.button
              onClick={() => navigate('/login')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              Return to Login
            </motion.button>
            <motion.button
              onClick={refreshProfile}
              className="px-6 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <FiRefreshCw className="mr-2" /> Try Again
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!loading && (!formData.firstName || !formData.lastName)) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-8 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-xl shadow-md p-8 max-w-lg w-full text-center border border-slate-100"
        >
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FiAlertTriangle className="text-yellow-500 text-3xl" />
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-3">Profile Information Missing</h2>
          <p className="text-slate-600 mb-6">
            We couldn't load your complete profile information. This may happen if you're a new user or if there was an issue with your profile data.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.button
              onClick={() => setIsEdit(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center shadow-sm"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <FiEdit className="mr-2" /> Edit Profile
            </motion.button>
            <motion.button
              onClick={refreshProfile}
              className="px-6 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <FiRefreshCw className="mr-2" /> Refresh Data
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex flex-wrap justify-between items-center">
            <h1 className="text-3xl font-bold text-slate-900">My Profile</h1>
            <motion.button
              onClick={refreshProfile}
              className="flex items-center text-sm font-medium px-3 py-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FiRefreshCw className="mr-1.5" size={14} />
              Refresh Data
            </motion.button>
          </div>
          <p className="text-slate-600 mt-1">
            Manage your personal information and health details
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="md:col-span-1"
          >
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden sticky top-8">
              <div className="p-6 flex flex-col items-center">
                <motion.div 
                  className="relative group"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <div className="w-32 h-32 relative rounded-full bg-blue-50 border-2 border-white shadow-md overflow-hidden">
                    {renderProfileAvatar()}
                  </div>
                  
                  <label 
                    htmlFor="profile-picture" 
                    className={`absolute inset-0 flex items-center justify-center rounded-full cursor-pointer 
                      ${isEdit ? 'bg-black bg-opacity-40 opacity-100' : 'opacity-0 group-hover:opacity-100 bg-black bg-opacity-0 group-hover:bg-opacity-40'} 
                      transition-all duration-200`}
                  >
                    <FiCamera className="text-white w-8 h-8" />
                    <input
                      type="file"
                      id="profile-picture"
                      className="sr-only"
                      onChange={handleProfilePictureChange}
                      disabled={!isEdit}
                      accept="image/*"
                    />
                  </label>
                </motion.div>
                
                <h2 className="mt-4 text-xl font-bold text-slate-900">
                  {formData.firstName || ''} {formData.lastName || ''}
                </h2>
                
                {formData.email && (
                  <p className="text-slate-500 text-sm mt-1 flex items-center">
                    <FiMail className="mr-2 text-slate-400" />
                    {formData.email}
                  </p>
                )}
                
                <div className="mt-6 w-full flex md:hidden">
                  {isEdit ? (
                    <div className="flex w-full gap-3">
                      <motion.button
                        onClick={cancelEdit}
                        className="flex-1 px-4 py-2 bg-slate-200 text-slate-800 rounded-lg flex items-center justify-center hover:bg-slate-300 transition-colors"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <FiX className="mr-2" /> Cancel
                      </motion.button>
                      <motion.button
                        onClick={handleSubmit}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center justify-center hover:bg-blue-700 transition-colors shadow-sm"
                        disabled={updating}
                        whileHover={!updating ? { scale: 1.03 } : {}}
                        whileTap={!updating ? { scale: 0.97 } : {}}
                      >
                        {updating ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <FiSave className="mr-2" /> Save
                          </>
                        )}
                      </motion.button>
                    </div>
                  ) : (
                    <motion.button
                      onClick={() => setIsEdit(true)}
                      className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg flex items-center justify-center hover:bg-blue-700 transition-colors shadow-sm"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <FiEdit className="mr-2" /> Edit Profile
                    </motion.button>
                  )}
                </div>

                <div className="mt-6 w-full">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-slate-700">Profile completion</div>
                    <div className="text-sm font-medium text-blue-600">
                      {calculateProfileCompletion(formData)}%
                    </div>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${calculateProfileCompletion(formData)}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                      className="h-2 bg-blue-600 rounded-full" 
                    ></motion.div>
                  </div>
                  {calculateProfileCompletion(formData) < 100 && (
                    <p className="mt-2 text-xs text-slate-500">
                      Complete your profile to help doctors provide better care
                    </p>
                  )}
                </div>
                
                <div className="mt-8 w-full hidden md:block">
                  <nav className="space-y-1">
                    {['personal', 'address', 'medical'].map((tab) => (
                      <motion.button
                        key={tab}
                        className={`flex items-center px-4 py-3 w-full rounded-lg text-left transition-colors ${
                          activeTab === tab
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                        onClick={() => setActiveTab(tab)}
                        whileHover={activeTab !== tab ? { x: 4 } : {}}
                        whileTap={{ scale: 0.98 }}
                      >
                        {tab === 'personal' && <FiUser className="mr-3 text-current" />}
                        {tab === 'address' && <FiMapPin className="mr-3 text-current" />}
                        {tab === 'medical' && <FiInfo className="mr-3 text-current" />}
                        {tab.charAt(0).toUpperCase() + tab.slice(1)} Information
                      </motion.button>
                    ))}
                  </nav>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="md:col-span-2"
          >
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="md:hidden border-b border-slate-200">
                <div className="flex">
                  {['personal', 'address', 'medical'].map((tab) => (
                    <motion.button
                      key={tab}
                      className={`flex-1 text-center py-3 text-sm font-medium transition-colors ${
                        activeTab === tab 
                          ? 'text-blue-600 border-b-2 border-blue-600'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                      onClick={() => setActiveTab(tab)}
                      whileHover={activeTab !== tab ? { y: -2 } : {}}
                      whileTap={{ scale: 0.98 }}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </motion.button>
                  ))}
                </div>
              </div>
              
              <div className="px-6 py-4 border-b border-slate-100 hidden md:flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-900">
                  {activeTab === 'personal' && 'Personal Information'}
                  {activeTab === 'address' && 'Address Information'}
                  {activeTab === 'medical' && 'Medical Information'}
                </h3>
                
                {isEdit ? (
                  <div className="flex items-center gap-3">
                    <motion.button
                      onClick={cancelEdit}
                      className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg flex items-center hover:bg-slate-200 transition-colors"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <FiX className="mr-2" /> Cancel
                    </motion.button>
                    <motion.button
                      onClick={handleSubmit}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center hover:bg-blue-700 transition-colors shadow-sm"
                      disabled={updating}
                      whileHover={!updating ? { scale: 1.03 } : {}}
                      whileTap={!updating ? { scale: 0.97 } : {}}
                    >
                      {updating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <FiSave className="mr-2" /> Save Changes
                        </>
                      )}
                    </motion.button>
                  </div>
                ) : (
                  <motion.button
                    onClick={() => setIsEdit(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center hover:bg-blue-700 transition-colors shadow-sm"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <FiEdit className="mr-2" /> Edit Profile
                  </motion.button>
                )}
              </div>
              
              <div className="p-6">
                {activeTab === 'personal' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {renderInputField('firstName', 'First Name', 'text', <FiUser className="text-gray-400" />)}
                      {renderInputField('lastName', 'Last Name', 'text', <FiUser className="text-gray-400" />)}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {renderInputField('email', 'Email', 'email', <FiMail className="text-gray-400" />)}
                      {renderInputField('phoneNumber', 'Phone Number', 'tel', <FiPhone className="text-gray-400" />)}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {renderInputField('dateOfBirth', 'Date of Birth', 'date', <FiCalendar className="text-gray-400" />)}
                      
                      <div className="mb-4">
                        <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                          <FiUser className="mr-2 text-gray-400" />
                          Gender
                        </label>
                        <select
                          id="gender"
                          name="gender"
                          value={formData.gender || ''}
                          onChange={handleChange}
                          disabled={!isEdit}
                          className={`w-full px-3 py-2 border ${
                            errors.gender ? 'border-red-500' : 'border-gray-300'
                          } rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500`}
                        >
                          <option value="">Select gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                          <option value="prefer-not-to-say">Prefer not to say</option>
                        </select>
                        {errors.gender && <p className="mt-1 text-sm text-red-500">{errors.gender}</p>}
                      </div>
                    </div>
                  </motion.div>
                )}
                
                {activeTab === 'address' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    {renderInputField('address', 'Street Address', 'text', <FiMapPin className="text-gray-400" />)}
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {renderInputField('city', 'City', 'text')}
                      {renderInputField('state', 'State/Province', 'text')}
                      {renderInputField('zipCode', 'ZIP / Postal Code', 'text')}
                    </div>
                  </motion.div>
                )}
                
                {activeTab === 'medical' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    <div className="mb-4">
                      <label htmlFor="medicalHistory" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                        <FiInfo className="mr-2 text-gray-400" />
                        Medical History
                      </label>
                      <textarea
                        id="medicalHistory"
                        name="medicalHistory"
                        rows={4}
                        value={formData.medicalHistory || ''}
                        onChange={handleChange}
                        placeholder="List any significant medical conditions, surgeries, or chronic illnesses"
                        disabled={!isEdit}
                        className={`w-full px-3 py-2 border ${
                          errors.medicalHistory ? 'border-red-500' : 'border-gray-300'
                        } rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500`}
                      />
                    </div>
                    
                    <div className="mb-4">
                      <label htmlFor="allergies" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                        <FiAlertTriangle className="mr-2 text-gray-400" />
                        Allergies
                      </label>
                      <textarea
                        id="allergies"
                        name="allergies"
                        rows={3}
                        value={formData.allergies || ''}
                        onChange={handleChange}
                        placeholder="List any allergies to medications, food, or other substances"
                        disabled={!isEdit}
                        className={`w-full px-3 py-2 border ${
                          errors.allergies ? 'border-red-500' : 'border-gray-300'
                        } rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500`}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {renderInputField('emergencyContactName', 'Emergency Contact Name', 'text', <FiUser className="text-gray-400" />)}
                      {renderInputField('emergencyContactNumber', 'Emergency Contact Phone', 'tel', <FiPhone className="text-gray-400" />)}
                    </div>
                  </motion.div>
                )}
                
                <div className="mt-8 flex md:hidden">
                  {isEdit ? (
                    <button
                      onClick={handleSubmit}
                      className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg flex items-center justify-center hover:bg-blue-700 transition-colors"
                      disabled={updating}
                    >
                      {updating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <FiSave className="mr-2" /> Save Changes
                        </>
                      )}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Phone verification modal */}
      {showPhoneVerification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="max-w-md w-full mx-4">
            <PhoneVerification
              userId={userData?.id}
              userType="Patient"
              currentPhoneNumber={formData.phoneNumber}
              onSuccess={handlePhoneVerificationSuccess}
              onCancel={() => setShowPhoneVerification(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const calculateProfileCompletion = (formData) => {
  let totalFields = 0;
  let completedFields = 0;
  
  Object.keys(formData).forEach(key => {
    if (key === 'id') return;
    
    totalFields++;
    if (formData[key] && formData[key] !== '') {
      completedFields++;
    }
  });
  
  return Math.floor((completedFields / totalFields) * 100);
}

export default MyProfile;
