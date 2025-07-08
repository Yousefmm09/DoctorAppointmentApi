import React, { useState, useContext, useRef, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { toast } from 'react-toastify';
import { FaUser, FaEnvelope, FaLock, FaPhone, FaAddressCard, FaBirthdayCake, FaVenusMars, FaCamera, FaUserPlus, FaCity, FaMapMarkerAlt, FaEye, FaEyeSlash } from 'react-icons/fa';
import { authService } from '../../services/api';
import NavBar from '../../components/NavBar';

// Global variable to prevent multiple submissions
const registrationInProgress = { status: false };

// Debounce function to limit how often a function is called
const useDebounce = (callback, delay) => {
  const timeoutRef = useRef(null);
  
  return useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
};

const PatientRegister = ({ embedded = false }) => {
  const navigate = useNavigate();
  const { setToken, setUserData, setUserRole } = useContext(AppContext);
  
  // Form state
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
    city: '', // lowercase to match backend model
    ZipCode: '',
    ProfilePictureFile: null
  });
  
  // UI state
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: ''
  });
  
  // Create refs for key form fields
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);
  const firstNameRef = useRef(null);
  const lastNameRef = useRef(null);
  const formRef = useRef(null);
  
  // Debounced password strength calculation
  const debouncedUpdatePasswordStrength = useCallback(
    useDebounce((password) => {
      updatePasswordStrength(password);
    }, 300),
    []
  );
  
  // Focus first input on mount
  useEffect(() => {
    if (emailRef.current) {
      emailRef.current.focus();
    }
  }, []);

  // Simple change handler with no validation during typing
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    
    // Just update the form data
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
    
    // Clear any existing errors for this field
    if (errors[name]) {
      setErrors(prevErrors => ({
        ...prevErrors,
        [name]: ''
      }));
    }

    // Use debounced password strength update for better performance
    if (name === 'Password') {
      debouncedUpdatePasswordStrength(value);
    }
  };

  // Password strength handling
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
    if (score === 1) {
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

  // Password visibility toggles
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  // File upload handler
  const handleFileChange = (e) => {
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

  // Form validation - only runs on submission
  const validateForm = useCallback(() => {
    const newErrors = {};
    
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
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.Password)) {
      newErrors.Password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
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
    
    // Phone number validation
    if (!formData.PhoneNumber) {
      newErrors.PhoneNumber = 'Phone number is required';
    } else if (!/^\+?[0-9]{10,15}$/.test(formData.PhoneNumber.replace(/[\s-]/g, ''))) {
      newErrors.PhoneNumber = 'Please enter a valid phone number';
    }
    
    // Gender validation
    if (!formData.Gender) newErrors.Gender = 'Gender is required';
    
    // Date of birth validation
    if (!formData.DateOfBirth) {
      newErrors.DateOfBirth = 'Date of birth is required';
    } else {
      // Check if user is at least 18 years old
      const birthDate = new Date(formData.DateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (age < 18 || (age === 18 && monthDiff < 0)) {
        newErrors.DateOfBirth = 'You must be at least 18 years old';
      }
    }
    
    // Address validation
    if (!formData.Address) newErrors.Address = 'Address is required';
    
    // City validation
    if (!formData.City) newErrors.City = 'City is required';
    
    // Zip code validation if provided
    if (formData.ZipCode && !/^[0-9]{5}(-[0-9]{4})?$/.test(formData.ZipCode)) {
      newErrors.ZipCode = 'Please enter a valid zip code (e.g. 12345 or 12345-6789)';
    }

    // Only update errors state if there are actual changes
    const hasChanges = Object.keys(newErrors).length !== Object.keys(errors).length ||
      Object.keys(newErrors).some(key => newErrors[key] !== errors[key]);
      
    if (hasChanges) {
      setErrors(newErrors);
    }
    
    return Object.keys(newErrors).length === 0;
  }, [formData, errors]);

  // Form submission handler
  const handleSubmit = useCallback(async (e) => {
    if (e) {
      e.preventDefault();
    }
    
    // Prevent multiple submissions
    if (registrationInProgress.status) {
      return;
    }
    
    // Validate the form
    if (!validateForm()) {
      toast.error("Please fix the validation errors before submitting.");
      return;
    }

    setLoading(true);
    registrationInProgress.status = true;
    
    try {
      const formDataToSend = new FormData();
      
      // Clean up email and format it properly
      const cleanEmail = formData.Email.trim().toLowerCase();
      formDataToSend.append('Email', cleanEmail);
      
      // Append all other form fields to FormData
      Object.keys(formData).forEach(key => {
        if (key === 'Email') {
          // Already handled above
          return;
        } else if (key === 'ProfilePictureFile' && formData[key]) {
          formDataToSend.append(key, formData[key]);
        } else if (key === 'DateOfBirth' && formData[key] !== null && formData[key] !== '') {
          // Ensure date is in ISO format
          const date = new Date(formData[key]);
          formDataToSend.append(key, date.toISOString());
        } else if (key === 'ZipCode' && formData[key] !== null && formData[key] !== '') {
          // Make sure ZipCode is sent with the correct case
          formDataToSend.append('ZipCode', formData[key]);
        } else if (formData[key] !== null && formData[key] !== '') {
          formDataToSend.append(key, formData[key]);
        }
      });

      toast.info("Creating your account...");
      
      // Log FormData contents for debugging
      console.log("FormData keys being sent:");
      for (let pair of formDataToSend.entries()) {
        console.log(pair[0] + ': ' + (pair[0] === 'ProfilePictureFile' ? 'File object' : pair[1]));
      }
      
      const response = await authService.register(formDataToSend);
      
      if (response.status === 200 || response.status === 201) {
        toast.success('Registration successful! Please check your email to confirm your account.');
        
        // Reset form data
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
          city: '',
          ZipCode: '',
          ProfilePictureFile: null
        });
        setPreviewImage(null);
        
        // Redirect to a confirmation page or inform the user to check their email
        navigate('/login', { 
          state: { 
            successMessage: 'Registration successful! Please check your email to confirm your account before logging in.',
            emailConfirmationPending: true,
            email: cleanEmail
          } 
        });
      }
    } catch (error) {
      console.error('Registration error:', error);
      
      // Email already exists error
      if (error.response?.status === 409 || (error.response?.data && error.response?.data.includes('already exists'))) {
        setErrors(prev => ({ ...prev, Email: 'This email is already registered' }));
        toast.error('This email is already registered. Please use a different email or try to login.');
        
        // Scroll to email field
        if (emailRef.current) {
          emailRef.current.focus();
        }
        return;
      }
      
      // Handle validation errors from server
      if (error.response?.status === 400 && error.response?.data) {
        const serverErrors = error.response.data;
        
        // Check if the response is a structured error object
        if (typeof serverErrors === 'object' && !Array.isArray(serverErrors)) {
          const newErrors = {};
          
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
            toast.error('Please fix the validation errors.');
            return;
          }
        }
        
        if (typeof serverErrors === 'string') {
          setErrors(prev => ({ ...prev, general: serverErrors }));
          toast.error(serverErrors);
          return;
        }
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
  }, [formData, validateForm, navigate]);

  // Input field renderer
  const renderInputField = useCallback(({ name, label, type = "text", icon, required = true, placeholder = "", isPassword = false, isConfirmPassword = false }) => {
    return (
      <div className="mb-4">
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
          {icon && <span className="mr-2">{icon}</span>}
          {label} {required && <span className="text-red-500 ml-1">*</span>}
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
            onChange={handleChange}
            className={`w-full pl-10 ${isPassword || isConfirmPassword ? 'pr-10' : 'pr-3'} py-3 border ${errors[name] ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'} rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
            placeholder={placeholder}
            ref={
              name === 'Email' ? emailRef : 
              name === 'Password' ? passwordRef : 
              name === 'ConfirmPassword' ? confirmPasswordRef : 
              name === 'FirstName' ? firstNameRef : 
              name === 'LastName' ? lastNameRef : null
            }
          />
          {isPassword && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FaEyeSlash className="h-5 w-5" /> : <FaEye className="h-5 w-5" />}
              </button>
            </div>
          )}
          {isConfirmPassword && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <button
                type="button"
                onClick={toggleConfirmPasswordVisibility}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <FaEyeSlash className="h-5 w-5" /> : <FaEye className="h-5 w-5" />}
              </button>
            </div>
          )}
        </div>
        {errors[name] && (
          <p className="mt-1 text-sm text-red-600">
            {errors[name]}
          </p>
        )}
        {name === 'Password' && formData.Password && !errors.Password && (
          <div className="mt-1">
            <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${
                  passwordStrength.score === 1 ? 'bg-red-500' :
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
  }, [formData, errors, showPassword, showConfirmPassword, togglePasswordVisibility, toggleConfirmPasswordVisibility, handleChange, passwordStrength]);

  return (
    <>
      {!embedded && <NavBar />}
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Form Header */}
          {!embedded && (
            <div className="text-center mb-10">
              <div className="inline-flex h-20 w-20 rounded-full bg-blue-100 items-center justify-center mb-5">
                <FaUser className="h-10 w-10 text-blue-600" />
              </div>
              <h1 className="text-3xl font-extrabold text-gray-900">Patient Registration</h1>
              <p className="mt-3 text-lg text-gray-500 max-w-3xl mx-auto">
                Create your account to book appointments and access medical services.
              </p>
            </div>
          )}

          {/* Main Form Container */}
          <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-gray-200">
            <div className="p-6 sm:p-8">
              <form onSubmit={handleSubmit} ref={formRef} className="space-y-6">
                {/* General Error Message */}
                {errors.general && (
                  <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-start mb-6">
                    <svg className="h-5 w-5 text-red-400 mr-2 mt-0.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span>{errors.general}</span>
                  </div>
                )}

                {/* Account Information Section */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                  <h2 className="text-xl font-semibold text-blue-800 mb-4 flex items-center">
                    <FaUser className="mr-2" /> Account Information
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    {renderInputField({
                      name: "Email",
                      label: "Email Address",
                      type: "email",
                      icon: <FaEnvelope className="text-gray-400" />,
                      placeholder: "Enter your email address"
                    })}
                    
                    {renderInputField({
                      name: "Password",
                      label: "Password",
                      icon: <FaLock className="text-gray-400" />,
                      placeholder: "Choose a secure password",
                      isPassword: true
                    })}
                    
                    {renderInputField({
                      name: "ConfirmPassword",
                      label: "Confirm Password",
                      icon: <FaLock className="text-gray-400" />,
                      placeholder: "Confirm your password",
                      isConfirmPassword: true
                    })}
                  </div>
                </div>

                {/* Personal Information Section */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                  <h2 className="text-xl font-semibold text-green-800 mb-4 flex items-center">
                    <FaUser className="mr-2" /> Personal Information
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    {renderInputField({
                      name: "FirstName",
                      label: "First Name",
                      icon: <FaUser className="text-gray-400" />,
                      placeholder: "Enter your first name"
                    })}
                    
                    {renderInputField({
                      name: "LastName",
                      label: "Last Name",
                      icon: <FaUser className="text-gray-400" />,
                      placeholder: "Enter your last name"
                    })}
                    
                    {renderInputField({
                      name: "PhoneNumber",
                      label: "Phone Number",
                      icon: <FaPhone className="text-gray-400" />,
                      placeholder: "Enter your phone number"
                    })}
                    
                    <div className="mb-3">
                      <label htmlFor="Gender" className="block text-sm font-medium text-gray-700 mb-1">
                        <FaVenusMars className="text-gray-400 inline mr-2" /> Gender <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaVenusMars className="text-gray-400" />
                        </div>
                        <select
                          id="Gender"
                          name="Gender"
                          value={formData.Gender}
                          onChange={handleChange}
                          className={`w-full pl-10 pr-3 py-3 border ${errors.Gender ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'} rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
                        >
                          <option value="" disabled>Select gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      {errors.Gender && <p className="mt-1 text-sm text-red-600">{errors.Gender}</p>}
                    </div>
                    
                    {renderInputField({
                      name: "DateOfBirth",
                      label: "Date of Birth",
                      type: "date",
                      icon: <FaBirthdayCake className="text-gray-400" />,
                      placeholder: "Select your date of birth"
                    })}
                  </div>
                </div>

                {/* Address Information Section */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6">
                  <h2 className="text-xl font-semibold text-amber-800 mb-4 flex items-center">
                    <FaAddressCard className="mr-2" /> Address Information
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    {renderInputField({
                      name: "Address",
                      label: "Address",
                      icon: <FaAddressCard className="text-gray-400" />,
                      placeholder: "Enter your street address"
                    })}
                    
                    {renderInputField({
                      name: "City",
                      label: "City",
                      icon: <FaCity className="text-gray-400" />,
                      placeholder: "Enter your city"
                    })}
                    
                    {renderInputField({
                      name: "ZipCode",
                      label: "Zip Code",
                      icon: <FaMapMarkerAlt className="text-gray-400" />,
                      placeholder: "Enter your zip code",
                      required: false
                    })}
                  </div>
                </div>

                {/* Profile Picture Section */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-6">
                  <h2 className="text-xl font-semibold text-purple-800 mb-4 flex items-center">
                    <FaCamera className="mr-2" /> Profile Picture
                  </h2>

                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 mb-2">Upload a profile picture (Optional)</p>
                      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-400 transition-colors">
                        <div className="space-y-1 text-center">
                          <FaCamera className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="flex text-sm text-gray-600">
                            <label htmlFor="ProfilePictureFile" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
                              <span>Upload a file</span>
                              <input
                                id="ProfilePictureFile"
                                name="ProfilePictureFile"
                                type="file"
                                accept="image/png, image/jpeg, image/jpg"
                                className="sr-only"
                                onChange={handleFileChange}
                              />
                            </label>
                          </div>
                          <p className="text-xs text-gray-500">
                            PNG, JPG, JPEG up to 5MB
                          </p>
                        </div>
                      </div>
                      {errors.ProfilePictureFile && (
                        <p className="mt-1 text-sm text-red-600">{errors.ProfilePictureFile}</p>
                      )}
                    </div>
                    
                    {previewImage && (
                      <div className="flex flex-col items-center">
                        <p className="text-sm font-medium text-gray-700 mb-3">Preview</p>
                        <img
                          src={previewImage}
                          alt="Profile preview"
                          className="h-40 w-40 object-cover rounded-full border-4 border-white shadow-lg"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex items-center justify-center mt-8">
                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full md:w-2/3 py-3 px-6 border border-transparent rounded-lg shadow-lg text-base font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all ${
                      loading ? "opacity-70 cursor-not-allowed" : ""
                    } flex items-center justify-center`}
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating Account...
                      </>
                    ) : (
                      <>
                        <FaUserPlus className="mr-2" />
                        Register Account
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Already have an account link */}
          <div className="text-center mt-8">
            <p className="text-base text-gray-600">
              Already have an account?{" "}
              <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
                Sign in to your account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default PatientRegister; 