import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { toast } from 'react-toastify';
import { 
  FaUserMd, 
  FaUser,
  FaEnvelope, 
  FaLock, 
  FaPhone, 
  FaAddressCard, 
  FaBirthdayCake, 
  FaVenusMars, 
  FaCamera, 
  FaHospital, 
  FaClock, 
  FaFileAlt, 
  FaMoneyBillAlt, 
  FaGraduationCap, 
  FaBriefcase, 
  FaUserPlus,
  FaIdCard,
  FaStethoscope,
  FaEye,
  FaEyeSlash
} from 'react-icons/fa';
import { authService, specializationService } from '../../services/api';

// Global variable to prevent duplicate submissions
const registrationInProgress = { status: false };

const DoctorRegister = ({ embedded = false }) => {
  const navigate = useNavigate();
  const { setToken, setUserData, setUserRole } = useContext(AppContext);
  const [formData, setFormData] = useState({
    Email: '',
    Password: '',
    ConfirmPassword: '',
    FirstName: '',
    LastName: '',
    Address: '',
    PhoneNumber: '',
    Gender: '',
    DateOfBirth: '',
    ProfilePictureFile: null,
    SpecializationId: '',
    'Clinic.Name': '',
    'Clinic.Address': '',
    'Clinic.PhoneNumber': '',
    'Clinic.Description': '',
    'Clinic.LicenseNumber': '',
    'Clinic.OpeningTime': '',
    'Clinic.ClosingTime': '',
    Description: '',
    Qualification: '',
    Experience: '',
    CurrentFee: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [specializations, setSpecializations] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: ''
  });
  const totalSteps = 3;
  
  // Create refs for common inputs
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const firstNameRef = useRef(null);
  const lastNameRef = useRef(null);
  const clinicNameRef = useRef(null);
  const feeRef = useRef(null);

  // Fetch specializations on component mount
  useEffect(() => {
    const fetchSpecializations = async () => {
      try {
        const response = await specializationService.getAllSpecializations();
        setSpecializations(response.data);
      } catch (error) {
        console.error('Error fetching specializations:', error);
        toast.error('Failed to load specializations');
      }
    };

    fetchSpecializations();
  }, []);

  // Individual field change handlers - direct state updates
  const handleEmailChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, Email: value }));
    if (errors.Email) setErrors(prev => ({ ...prev, Email: '' }));
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, Password: value }));
    if (errors.Password) setErrors(prev => ({ ...prev, Password: '' }));
    updatePasswordStrength(value);
  };

  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, ConfirmPassword: value }));
    if (errors.ConfirmPassword) setErrors(prev => ({ ...prev, ConfirmPassword: '' }));
  };

  const handleFirstNameChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, FirstName: value }));
    if (errors.FirstName) setErrors(prev => ({ ...prev, FirstName: '' }));
  };

  const handleLastNameChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, LastName: value }));
    if (errors.LastName) setErrors(prev => ({ ...prev, LastName: '' }));
  };

  const handleAddressChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, Address: value }));
    if (errors.Address) setErrors(prev => ({ ...prev, Address: '' }));
  };

  const handlePhoneNumberChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, PhoneNumber: value }));
    if (errors.PhoneNumber) setErrors(prev => ({ ...prev, PhoneNumber: '' }));
  };

  const handleGenderChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, Gender: value }));
    if (errors.Gender) setErrors(prev => ({ ...prev, Gender: '' }));
  };

  const handleDateOfBirthChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, DateOfBirth: value }));
    if (errors.DateOfBirth) setErrors(prev => ({ ...prev, DateOfBirth: '' }));
  };

  const handleQualificationChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, Qualification: value }));
    if (errors.Qualification) setErrors(prev => ({ ...prev, Qualification: '' }));
  };

  const handleSpecializationChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, SpecializationId: value }));
    if (errors.SpecializationId) setErrors(prev => ({ ...prev, SpecializationId: '' }));
  };

  const handleClinicNameChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, 'Clinic.Name': value }));
    if (errors['Clinic.Name']) setErrors(prev => ({ ...prev, 'Clinic.Name': '' }));
  };

  const handleClinicAddressChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, 'Clinic.Address': value }));
    if (errors['Clinic.Address']) setErrors(prev => ({ ...prev, 'Clinic.Address': '' }));
  };

  const handleClinicPhoneNumberChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, 'Clinic.PhoneNumber': value }));
    if (errors['Clinic.PhoneNumber']) setErrors(prev => ({ ...prev, 'Clinic.PhoneNumber': '' }));
  };

  const handleClinicDescriptionChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, 'Clinic.Description': value }));
    if (errors['Clinic.Description']) setErrors(prev => ({ ...prev, 'Clinic.Description': '' }));
  };

  const handleClinicLicenseNumberChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, 'Clinic.LicenseNumber': value }));
    if (errors['Clinic.LicenseNumber']) setErrors(prev => ({ ...prev, 'Clinic.LicenseNumber': '' }));
  };

  const handleOpeningTimeChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, 'Clinic.OpeningTime': value }));
    if (errors['Clinic.OpeningTime']) setErrors(prev => ({ ...prev, 'Clinic.OpeningTime': '' }));
  };

  const handleClosingTimeChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, 'Clinic.ClosingTime': value }));
    if (errors['Clinic.ClosingTime']) setErrors(prev => ({ ...prev, 'Clinic.ClosingTime': '' }));
  };

  const handleDescriptionChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, Description: value }));
    if (errors.Description) setErrors(prev => ({ ...prev, Description: '' }));
  };

  const handleExperienceChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, Experience: value }));
    if (errors.Experience) setErrors(prev => ({ ...prev, Experience: '' }));
  };

  const handleFeeChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, CurrentFee: value }));
    if (errors.CurrentFee) setErrors(prev => ({ ...prev, CurrentFee: '' }));
  };

  const handleFileChange = (e) => {
    e.preventDefault(); // Prevent default behavior
    e.stopPropagation(); // Stop event propagation
    
    const file = e.target.files[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          ProfilePictureFile: 'File size must be less than 5MB'
        }));
        return;
      }
      
      // Check file type
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        setErrors(prev => ({
          ...prev,
          ProfilePictureFile: 'Only JPG, JPEG and PNG files are allowed'
        }));
        return;
      }
      
      setFormData(prev => ({
        ...prev,
        ProfilePictureFile: file
      }));
      
      // Clear error when valid file is selected
      if (errors.ProfilePictureFile) {
        setErrors(prev => ({
          ...prev,
          ProfilePictureFile: ''
        }));
      }
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  // Function to check password strength - simplified
  const updatePasswordStrength = (password) => {
    if (!password) {
      setPasswordStrength({ score: 0, feedback: '' });
      return;
    }
    
    // Simple password strength check
    let score = 0;
    let feedback = '';
    
    // Length check
    if (password.length >= 8) {
      score += 1;
    }
    
    // Uppercase letter check
    if (/[A-Z]/.test(password)) {
      score += 1;
    }
    
    // Lowercase letter check
    if (/[a-z]/.test(password)) {
      score += 1;
    }
    
    // Number check
    if (/[0-9]/.test(password)) {
      score += 1;
    }
    
    // Special character check
    if (/[^A-Za-z0-9]/.test(password)) {
      score += 1;
    }
    
    // Provide feedback based on score
    if (score === 0) {
      feedback = 'Very weak';
    } else if (score === 1) {
      feedback = 'Very weak';
    } else if (score === 2) {
      feedback = 'Weak';
    } else if (score === 3) {
      feedback = 'Moderate';
    } else if (score === 4) {
      feedback = 'Strong';
    } else if (score === 5) {
      feedback = 'Very strong';
    }
    
    setPasswordStrength({ score, feedback });
  };

  // Validation function - only validate the current step
  const validateCurrentStep = () => {
    const newErrors = {};
    
    if (currentStep === 1) {
      // Email validation
      if (!formData.Email) {
        newErrors.Email = 'Email is required';
      } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.Email)) {
        newErrors.Email = 'Email is not valid';
      }
      
      // Password validation
      if (!formData.Password) {
        newErrors.Password = 'Password is required';
      } else if (formData.Password.length < 6) {
        newErrors.Password = 'Password must be at least 6 characters';
      }
      
      // Confirm password validation
      if (!formData.ConfirmPassword) {
        newErrors.ConfirmPassword = 'Confirm password is required';
      } else if (formData.Password !== formData.ConfirmPassword) {
        newErrors.ConfirmPassword = 'Passwords do not match';
      }
      
      // Name validation
      if (!formData.FirstName) newErrors.FirstName = 'First name is required';
      if (!formData.LastName) newErrors.LastName = 'Last name is required';
      
      // Gender validation
      if (!formData.Gender) newErrors.Gender = 'Gender is required';
      
      // Date of birth validation
      if (!formData.DateOfBirth) {
        newErrors.DateOfBirth = 'Date of birth is required';
      } else {
        // Check if doctor is at least 21 years old
        const birthDate = new Date(formData.DateOfBirth);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (age < 21 || (age === 21 && monthDiff < 0)) {
          newErrors.DateOfBirth = 'You must be at least 21 years old';
        }
      }
      
      // Professional validation
      if (!formData.Qualification) newErrors.Qualification = 'Qualification is required';
      if (!formData.SpecializationId) newErrors.SpecializationId = 'Specialization is required';
    } else if (currentStep === 2) {
      if (!formData['Clinic.Name']) newErrors['Clinic.Name'] = 'Clinic name is required';
      if (!formData['Clinic.Address']) newErrors['Clinic.Address'] = 'Clinic address is required';
      
      // Phone validation
      if (!formData['Clinic.PhoneNumber']) {
        newErrors['Clinic.PhoneNumber'] = 'Clinic phone number is required';
      } else if (!/^\+?[0-9]{10,15}$/.test(formData['Clinic.PhoneNumber'].replace(/[\s-]/g, ''))) {
        newErrors['Clinic.PhoneNumber'] = 'Please enter a valid phone number';
      }
      
      if (!formData['Clinic.LicenseNumber']) newErrors['Clinic.LicenseNumber'] = 'Clinic license number is required';
      if (!formData['Clinic.OpeningTime']) newErrors['Clinic.OpeningTime'] = 'Opening time is required';
      if (!formData['Clinic.ClosingTime']) newErrors['Clinic.ClosingTime'] = 'Closing time is required';
      
      // Check if closing time is after opening time
      if (formData['Clinic.OpeningTime'] && formData['Clinic.ClosingTime']) {
        const openingTime = new Date(`2000-01-01T${formData['Clinic.OpeningTime']}`);
        const closingTime = new Date(`2000-01-01T${formData['Clinic.ClosingTime']}`);
        
        if (closingTime <= openingTime) {
          newErrors['Clinic.ClosingTime'] = 'Closing time must be after opening time';
        }
      }
    } else if (currentStep === 3) {
      if (!formData.Experience) newErrors.Experience = 'Experience is required';
      
      // Fee validation
      if (!formData.CurrentFee) {
        newErrors.CurrentFee = 'Current fee is required';
      } else if (isNaN(formData.CurrentFee) || parseFloat(formData.CurrentFee) <= 0) {
        newErrors.CurrentFee = 'Please enter a valid fee amount';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Navigation handlers
  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prevStep => Math.min(prevStep + 1, totalSteps));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prevStep => Math.max(prevStep - 1, 1));
  };

  const handleSubmit = async (e) => {
    if (e) {
      e.preventDefault();
    }
    
    // Prevent duplicate submissions
    if (loading || registrationInProgress.status) {
      console.log("Registration already in progress, ignoring duplicate submission");
      return;
    }
    
    // Validate current step
    if (!validateCurrentStep()) {
      toast.error(`Please fix the validation errors before proceeding.`);
      return;
    }
    
    // If not the last step, proceed to next step
    if (currentStep < totalSteps) {
      handleNext();
      return;
    }
    
    // Final submission
    setLoading(true);
    registrationInProgress.status = true;
    
    try {
      console.log("Creating FormData object for submission");
      const formDataToSend = new FormData();
      
      // Clean up email and format it properly
      const cleanEmail = formData.Email.trim().toLowerCase();
      formDataToSend.append('Email', cleanEmail);
      
      // Append all other form fields to FormData
      // Using a special handling for clinic properties to ensure they're properly structured
      Object.keys(formData).forEach(key => {
        if (key === 'Email') {
          // Skip (already handled above)
          return;
        } else if (key === 'ProfilePictureFile' && formData[key]) {
          formDataToSend.append(key, formData[key]);
        } else if (key.startsWith('Clinic.')) {
          // Properly handle clinic properties
          formDataToSend.append(key, formData[key] || '');
        } else if (formData[key] !== null && formData[key] !== '') {
          formDataToSend.append(key, formData[key]);
        }
      });
      
      // Log formData for debugging
      console.log("Sending doctor registration data");
      toast.info("Creating your doctor account...");
      
      const response = await authService.register(formDataToSend);
      
      console.log("Registration response:", response);
      
      if (response.status === 200 || response.status === 201) {
        toast.success('Registration successful! Please check your email to confirm your account.');
        
        // Reset form and state
        setFormData({
          Email: '',
          Password: '',
          ConfirmPassword: '',
          FirstName: '',
          LastName: '',
          Address: '',
          PhoneNumber: '',
          Gender: '',
          DateOfBirth: '',
          ProfilePictureFile: null,
          SpecializationId: '',
          'Clinic.Name': '',
          'Clinic.Address': '',
          'Clinic.PhoneNumber': '',
          'Clinic.Description': '',
          'Clinic.LicenseNumber': '',
          'Clinic.OpeningTime': '',
          'Clinic.ClosingTime': '',
          Description: '',
          Qualification: '',
          Experience: '',
          CurrentFee: ''
        });
        setPreviewImage(null);
        setCurrentStep(1);
        
        // Redirect to a confirmation page or inform the user to check their email
        navigate('/doctor/login', { 
          state: { 
            successMessage: 'Registration successful! Please check your email to confirm your account before logging in.',
            emailConfirmationPending: true,
            email: cleanEmail 
          } 
        });
      }
    } catch (error) {
      console.error('Registration error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        stack: error.stack
      });
      
      // Handle different error responses
      if (error.response?.status === 400 && error.response?.data) {
        // Handle validation errors from the server
        const serverErrors = error.response.data;
        console.log("Server validation errors:", serverErrors);
        
        // Check if the response is a structured error object
        if (typeof serverErrors === 'object' && !Array.isArray(serverErrors)) {
          const newErrors = {};
          
          // Process errors from the structure into our format
          Object.keys(serverErrors).forEach(key => {
            const errorMessages = serverErrors[key];
            if (Array.isArray(errorMessages)) {
              newErrors[key] = errorMessages.join('. ');
            } else if (typeof errorMessages === 'string') {
              newErrors[key] = errorMessages;
            }
          });
          
          if (Object.keys(newErrors).length > 0) {
            setErrors(prev => ({ ...prev, ...newErrors }));
            
            // Find which step contains the field with errors and navigate to it
            const fieldsWithErrors = Object.keys(newErrors);
            let stepWithErrors = currentStep;
            
            // Determine appropriate step to show based on errors
            if (fieldsWithErrors.some(field => field === 'Email' || field === 'Password' || field === 'FirstName' || field === 'LastName')) {
              stepWithErrors = 1;
            } else if (fieldsWithErrors.some(field => field.startsWith('Clinic.'))) {
              stepWithErrors = 2;
            } else {
              stepWithErrors = 3;
            }
            
            if (stepWithErrors !== currentStep) {
              setCurrentStep(stepWithErrors);
            }
            
            toast.error('Please fix the validation errors.');
            return;
          }
        }
        
        // Handle case where error response might be a string
        if (typeof serverErrors === 'string') {
          setErrors(prev => ({ ...prev, general: serverErrors }));
          toast.error(serverErrors);
          return;
        }
      }
      
      // Email already exists error
      if (error.response?.status === 409 || (error.response?.data && error.response?.data.includes('already exists'))) {
        setErrors(prev => ({ ...prev, Email: 'This email is already registered' }));
        toast.error('This email is already registered. Please use a different email or try to login.');
        setCurrentStep(1);
        return;
      }
      
      // General error message
      const errorMessage = error.response?.data?.message || 
                         error.response?.data || 
                         error.message || 
                         'Registration failed. Please try again later.';
                         
      setErrors(prev => ({ ...prev, general: errorMessage }));
      toast.error('Registration failed: ' + errorMessage);
    } finally {
      setLoading(false);
      registrationInProgress.status = false;
    }
  };

  // Helper function to render input fields with consistent styling
  const renderInputField = (name, label, type = "text", icon, required = true, placeholder = "", step, min, isPassword = false, isConfirmPassword = false) => {
    const getChangeHandler = () => {
      switch(name) {
        case 'Email': return handleEmailChange;
        case 'Password': return handlePasswordChange;
        case 'ConfirmPassword': return handleConfirmPasswordChange;
        case 'FirstName': return handleFirstNameChange;
        case 'LastName': return handleLastNameChange;
        case 'Address': return handleAddressChange;
        case 'PhoneNumber': return handlePhoneNumberChange;
        case 'DateOfBirth': return handleDateOfBirthChange;
        case 'Qualification': return handleQualificationChange;
        case 'SpecializationId': return handleSpecializationChange;
        case 'Clinic.Name': return handleClinicNameChange;
        case 'Clinic.Address': return handleClinicAddressChange;
        case 'Clinic.PhoneNumber': return handleClinicPhoneNumberChange;
        case 'Clinic.LicenseNumber': return handleClinicLicenseNumberChange;
        case 'Clinic.OpeningTime': return handleOpeningTimeChange;
        case 'Clinic.ClosingTime': return handleClosingTimeChange;
        case 'Clinic.Description': return handleClinicDescriptionChange;
        case 'Description': return handleDescriptionChange;
        case 'Experience': return handleExperienceChange;
        case 'CurrentFee': return handleFeeChange;
        default: return (e) => {
          const value = e.target.value;
          setFormData(prev => ({ ...prev, [name]: value }));
          if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
        };
      }
    };
    
    return (
      <div className="mb-4">
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
          {icon} {label} {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {icon}
          </div>
          <input
            id={name}
            name={name}
            type={
              isPassword 
                ? (showPassword ? "text" : "password")
                : isConfirmPassword
                  ? (showConfirmPassword ? "text" : "password")
                  : type
            }
            autoComplete={name}
            value={formData[name] || ''}
            onChange={getChangeHandler()}
            required={required}
            min={min}
            step={step}
            onFocus={(e) => e.target.select()}
            className={`w-full px-3 py-2 pl-10 ${isPassword || isConfirmPassword ? 'pr-10' : 'pr-3'} border ${errors[name] ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'} rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-150`}
            placeholder={placeholder}
            ref={
              name === 'Email' ? emailRef : 
              name === 'Password' ? passwordRef : 
              name === 'FirstName' ? firstNameRef : 
              name === 'LastName' ? lastNameRef : 
              name === 'Clinic.Name' ? clinicNameRef :
              name === 'CurrentFee' ? feeRef : null
            }
          />
          {isPassword && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          )}
          {isConfirmPassword && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <button
                type="button"
                onClick={toggleConfirmPasswordVisibility}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          )}
        </div>
        {errors[name] && (
          <p className="mt-1 text-sm text-red-600 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            {errors[name]}
          </p>
        )}
        {name === 'Password' && formData.Password && !errors.Password && (
          <div className="mt-1">
            <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${
                  passwordStrength.score <= 1 ? 'bg-red-500' :
                  passwordStrength.score === 2 ? 'bg-orange-500' :
                  passwordStrength.score === 3 ? 'bg-yellow-500' :
                  passwordStrength.score === 4 ? 'bg-green-500' :
                  passwordStrength.score === 5 ? 'bg-green-600' : ''
                }`}
                style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
              />
            </div>
            <p className={`text-xs mt-1 ${
              passwordStrength.score <= 2 ? 'text-red-600' :
              passwordStrength.score === 3 ? 'text-yellow-600' :
              'text-green-600'
            }`}>
              Password strength: {passwordStrength.feedback}
            </p>
          </div>
        )}
      </div>
    );
  };

  // Helper function to render select fields
  const renderSelectField = (name, label, options, icon, required = true) => {
    const getChangeHandler = () => {
      switch(name) {
        case 'Gender': return handleGenderChange;
        case 'SpecializationId': return handleSpecializationChange;
        default: return (e) => {
          const value = e.target.value;
          setFormData(prev => ({ ...prev, [name]: value }));
          if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
        };
      }
    };

    return (
      <div className="mb-4">
        <label htmlFor={name.toLowerCase().replace(/\./g, "-")} className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
          {icon && <span className="mr-2 text-indigo-500">{icon}</span>}
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
          <select
            id={name.toLowerCase().replace(/\./g, "-")}
            name={name}
            value={formData[name] || ''}
            onChange={getChangeHandler()}
            className={`w-full px-3 py-2 pl-10 border ${
              errors[name] ? 'border-red-500' : 'border-gray-300'
            } rounded-md shadow-sm focus:outline-none focus:ring-2 ${
              errors[name] ? 'focus:ring-red-500' : 'focus:ring-indigo-500'
            } focus:border-${errors[name] ? 'red' : 'indigo'}-500 transition-all duration-200`}
            required={required}
          >
            <option value="">Select {label}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400">{icon}</span>
      </div>
          )}
        </div>
        {errors[name] && (
          <p className="mt-1 text-sm text-red-600">{errors[name]}</p>
        )}
      </div>
    );
  };

  // Helper function to render textarea fields
  const renderTextareaField = (name, label, icon, required = true, placeholder = "", rows = 3) => {
    const getChangeHandler = () => {
      switch(name) {
        case 'Description': return handleDescriptionChange;
        case 'Clinic.Description': return handleClinicDescriptionChange;
        default: return (e) => {
          const value = e.target.value;
          setFormData(prev => ({ ...prev, [name]: value }));
          if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
        };
      }
    };

    return (
      <div className="mb-4">
        <label htmlFor={name.toLowerCase().replace(/\./g, "-")} className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
          {icon && <span className="mr-2 text-indigo-500">{icon}</span>}
          {label} {required && <span className="text-red-500">*</span>}
          </label>
        <div className="relative">
          {icon && (
            <div className="absolute top-3 left-3 flex items-center pointer-events-none">
              <span className="text-gray-400">{icon}</span>
            </div>
          )}
          <textarea
            id={name.toLowerCase().replace(/\./g, "-")}
            name={name}
            value={formData[name] || ''}
            onChange={getChangeHandler()}
            placeholder={placeholder}
            rows={rows}
            className={`w-full px-3 py-2 ${icon ? 'pl-10' : 'pl-3'} border ${
              errors[name] ? 'border-red-500' : 'border-gray-300'
            } rounded-md shadow-sm focus:outline-none focus:ring-2 ${
              errors[name] ? 'focus:ring-red-500' : 'focus:ring-indigo-500'
            } focus:border-${errors[name] ? 'red' : 'indigo'}-500 transition-all duration-200`}
            required={required}
          />
        </div>
        {errors[name] && (
          <p className="mt-1 text-sm text-red-600">{errors[name]}</p>
        )}
      </div>
    );
  };

  const PersonalInfoStep = () => (
    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-indigo-800 mb-4 flex items-center">
        <FaUserMd className="mr-2" /> Account and Personal Information
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
        {renderInputField("Email", "Email Address", "email", <FaEnvelope className="text-gray-400" />, true, "Enter your email address")}
        
        {renderInputField("Password", "Password", "password", <FaLock className="text-gray-400" />, true, "Create a secure password", "", "", true, true)}
        
        {renderInputField("ConfirmPassword", "Confirm Password", "password", <FaLock className="text-gray-400" />, true, "Confirm your password", "", "", true, true)}
        
        {renderInputField("FirstName", "First Name", "text", <FaUser className="text-gray-400" />, true, "Enter your first name")}
        
        {renderInputField("LastName", "Last Name", "text", <FaUser className="text-gray-400" />, true, "Enter your last name")}
        
        {renderInputField("Address", "Address", "text", <FaAddressCard className="text-gray-400" />, true, "Enter your address")}
        
        {renderInputField("PhoneNumber", "Phone Number", "tel", <FaPhone className="text-gray-400" />, true, "Enter your phone number")}
        
        <div className="mb-4">
          <label htmlFor="Gender" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
            <FaVenusMars className="text-gray-400 mr-2" /> Gender <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaVenusMars className="text-gray-400" />
      </div>
            <select
              id="Gender"
              name="Gender"
              value={formData.Gender}
              onChange={handleGenderChange}
              className={`w-full pl-10 pr-3 py-2 border ${
                errors.Gender ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'
              } rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-150`}
            >
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          {errors.Gender && (
            <p className="mt-1 text-sm text-red-600">{errors.Gender}</p>
          )}
      </div>
  
        {renderInputField("DateOfBirth", "Date of Birth", "date", <FaBirthdayCake className="text-gray-400" />, true, "Select your date of birth")}
        
        {renderInputField("Qualification", "Qualification", "text", <FaGraduationCap className="text-gray-400" />, true, "e.g., MBBS, MD, MS")}
        
        <div className="mb-4">
          <label htmlFor="SpecializationId" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
            <FaStethoscope className="text-gray-400 mr-2" /> Specialization <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaStethoscope className="text-gray-400" />
          </div>
            <select
              id="SpecializationId"
              name="SpecializationId"
              value={formData.SpecializationId}
              onChange={handleSpecializationChange}
              className={`w-full pl-10 pr-3 py-2 border ${
                errors.SpecializationId ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'
              } rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-150`}
            >
              <option value="">Select a specialization</option>
              {specializations.map((specialization) => (
                <option key={specialization.id} value={specialization.id}>
                  {specialization.name}
                </option>
              ))}
            </select>
          </div>
          {errors.SpecializationId && (
            <p className="mt-1 text-sm text-red-600">{errors.SpecializationId}</p>
          )}
        </div>
        
        <div className="col-span-1 md:col-span-2 mb-4">
          <label htmlFor="ProfilePictureFile" className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
            <FaCamera className="text-gray-400 mr-2" /> Profile Picture
          </label>
          <div className="flex items-center space-x-6">
            <div className="flex-1">
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
                <div className="space-y-1 text-center">
                  <FaCamera className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none">
                      <span>Upload a file</span>
              <input
                        id="file-upload" 
                name="ProfilePictureFile"
                        type="file" 
                        className="sr-only" 
                onChange={handleFileChange}
                        accept="image/*"
              />
            </label>
                    <p className="pl-1">or drag and drop</p>
        </div>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, GIF up to 5MB
                  </p>
                </div>
              </div>
        {errors.ProfilePictureFile && (
                <p className="mt-1 text-sm text-red-600">{errors.ProfilePictureFile}</p>
              )}
            </div>
            {previewImage && (
              <div className="h-32 w-32 overflow-hidden rounded-full border-4 border-white shadow-lg">
                <img 
                  src={previewImage} 
                  alt="Preview" 
                  className="h-full w-full object-cover"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const ClinicInfoStep = () => (
    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
        <FaHospital className="mr-2" /> Clinic Information
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
        {renderInputField("Clinic.Name", "Clinic Name", "text", <FaHospital className="text-gray-400" />, true, "Enter your clinic name")}
        
        {renderInputField("Clinic.Address", "Clinic Address", "text", <FaAddressCard className="text-gray-400" />, true, "Enter your clinic address")}
        
        {renderInputField("Clinic.PhoneNumber", "Clinic Phone", "tel", <FaPhone className="text-gray-400" />, true, "Enter clinic phone number")}
        
        {renderInputField("Clinic.LicenseNumber", "License Number", "text", <FaIdCard className="text-gray-400" />, true, "Enter clinic license number")}
        
        {renderInputField("Clinic.OpeningTime", "Opening Time", "time", <FaClock className="text-gray-400" />, true)}
        
        {renderInputField("Clinic.ClosingTime", "Closing Time", "time", <FaClock className="text-gray-400" />, true)}
        
        {renderTextareaField("Clinic.Description", "Clinic Description", <FaFileAlt className="text-gray-400" />, false, "Describe your clinic (optional)", 4)}
      </div>
    </div>
  );

  const ProfessionalInfoStep = () => (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
        <FaUserMd className="mr-2" /> Professional Details
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
        {renderInputField("Experience", "Experience (Years)", "number", <FaBriefcase className="text-gray-400" />, true, "Enter your experience in years", "0", "1")}
        
        {renderInputField("CurrentFee", "Consultation Fee", "number", <FaMoneyBillAlt className="text-gray-400" />, true, "Enter your consultation fee", "0", "0.01")}
        
        {renderTextareaField("Description", "Doctor Bio", <FaFileAlt className="text-gray-400" />, false, "Write a brief description about yourself, expertise, and approach to patient care", 5)}
      </div>
    </div>
  );

  const renderStepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between px-2">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex flex-col items-center">
            <div
              className={`flex items-center justify-center rounded-full h-12 w-12 text-lg font-medium transition-all duration-300 ${
                currentStep === step
                  ? "bg-indigo-600 text-white ring-4 ring-indigo-100"
                  : currentStep > step
                  ? "bg-green-500 text-white"
                  : "bg-gray-100 text-gray-500 border border-gray-300"
              }`}
            >
              {currentStep > step ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                step
              )}
            </div>
            <span className={`text-sm mt-2 font-medium ${currentStep === step ? 'text-indigo-600' : 'text-gray-500'}`}>
              {step === 1 ? "Account" : step === 2 ? "Clinic" : "Professional"}
            </span>
          </div>
        ))}
      </div>
      
      <div className="mt-6 relative">
        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-2 bg-indigo-600 rounded-full transition-all duration-500 ease-in-out"
            style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
          ></div>
        </div>
        
        <div className="flex justify-between mt-1 text-xs text-gray-500">
          <span>Personal Info</span>
          <span>Clinic Details</span>
          <span>Professional Details</span>
        </div>
      </div>
    </div>
  );

  const RegistrationForm = () => (
    <form onSubmit={handleSubmit} className="space-y-8" noValidate>
      {errors.general && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-start">
          <svg className="h-5 w-5 text-red-400 mr-2 mt-0.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span>{errors.general}</span>
        </div>
      )}
      
      {renderStepIndicator()}
      
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        {currentStep === 1 && <PersonalInfoStep />}
        {currentStep === 2 && <ClinicInfoStep />}
        {currentStep === 3 && <ProfessionalInfoStep />}
      </div>
      
      <div className="flex justify-between mt-6">
        {currentStep > 1 && (
          <button
            type="button"
            onClick={handlePrevious}
            className="px-6 py-3 border border-gray-300 rounded-md shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            Back
          </button>
        )}
        
        <button
          type="submit"
          disabled={loading}
          className={`${currentStep > 1 ? 'ml-auto' : 'w-full'} group relative flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            loading 
              ? 'bg-indigo-400 cursor-not-allowed' 
              : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
          }`}
          aria-busy={loading ? "true" : "false"}
        >
          {loading ? (
            <>
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                <svg className="animate-spin h-5 w-5 text-indigo-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </span>
              {currentStep === totalSteps ? "Creating Account..." : "Saving..."}
            </>
          ) : (
            <>
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                {currentStep === totalSteps ? <FaUserPlus className="h-5 w-5 text-indigo-500 group-hover:text-indigo-400" /> : null}
              </span>
              {currentStep === totalSteps ? "Complete Registration" : "Continue to Next Step"}
            </>
          )}
        </button>
      </div>
    </form>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex h-20 w-20 rounded-full bg-indigo-100 items-center justify-center mb-5">
            <FaUserMd className="h-10 w-10 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900">Doctor Registration</h1>
          <p className="mt-3 text-lg text-gray-500 max-w-3xl mx-auto">
            Join our platform to connect with patients and manage your practice efficiently.
          </p>
        </div>
        
        <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-gray-200">
          <div className="p-6 sm:p-8">
            <RegistrationForm />
          </div>
        </div>
        
        <div className="text-center mt-8">
          <p className="text-base text-gray-600">
            Already have an account?{" "}
            <Link to="/doctor/login" className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
              Sign in to your account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default DoctorRegister; 