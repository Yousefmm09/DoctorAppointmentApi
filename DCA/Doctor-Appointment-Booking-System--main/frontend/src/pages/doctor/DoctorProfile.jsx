import React, { useState, useEffect, useRef, useContext } from "react";
import { DoctorContext } from "../../context/DoctorContext";
import { AppContext } from "../../context/AppContext";
import { toast } from "react-toastify";
import axios from "axios";
import {
  FaUserMd,
  FaEnvelope,
  FaPhone,
  FaStethoscope,
  FaCalendarAlt,
  FaGraduationCap,
  FaMoneyBillAlt,
  FaClock,
  FaMapMarkerAlt,
  FaClinicMedical,
  FaIdCard,
  FaCamera,
  FaHospital,
  FaInfoCircle,
  FaNotesMedical,
  FaEdit,
  FaSave,
  FaTimes
} from "react-icons/fa";
import { motion } from "framer-motion";
import ProfilePicture from "../../components/ProfilePicture";
import RatingComponent from "../../components/common/RatingComponent";
import PhoneVerification from "../../components/common/PhoneVerification";

const DoctorProfile = () => {
  // Contexts
  const { backendUrl, token } = useContext(AppContext);
  const { doctorProfile, updateDoctorProfile, updateDoctorProfilePicture } = useContext(DoctorContext);
  
  // States
  const [activeTab, setActiveTab] = useState("personal");
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [formTouched, setFormTouched] = useState({});
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  
  // Form data state
  const [formData, setFormData] = useState({
    Id: "",
    FirstName: "",
    LastName: "",
    Email: "",
    PhoneNumber: "",
    ProfilePicture: "",
    currentFee: "",
    Experience: "",
    Address: "",
    DateofBitrh: "",
    Qualification: "",
    ClinicName: "",
    ClinicAddress: "",
    ClinicPhoneNumber: "",
    Description: "",
    LicenseNumber: "",
    OpeningTime: "",
    ClosingTime: "",
    ProfilePictureFile: null
  });
  
  // Refs
  const fileInputRef = useRef(null);
  
  // Add a utility function to convert time to RTL format if needed
  const convertTimeToRTL = (timeString, userLocale) => {
    // If no time or not in Arabic locale, return as is
    if (!timeString || !userLocale || !userLocale.includes('ar')) {
      return timeString;
    }
    
    // Time format conversion logic for Arabic locales
    try {
      // Extract hours and minutes from the time string
      let hours, minutes, period;
      
      // Try to parse different time formats
      if (timeString.includes(':')) {
        const [timePart, periodPart] = timeString.split(/\s+/);
        const [hoursPart, minutesPart] = timePart.split(':');
        
        hours = parseInt(hoursPart, 10);
        minutes = parseInt(minutesPart, 10);
        period = periodPart?.toUpperCase();
      } else {
        // If the time is in a different format, return as is
        return timeString;
      }
      
      // Convert to Arabic numerals
      const latinToArabicMap = {
        '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤',
        '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩'
      };
      
      const hoursArabic = hours.toString().split('').map(digit => latinToArabicMap[digit]).join('');
      const minutesArabic = minutes.toString().padStart(2, '0').split('').map(digit => latinToArabicMap[digit]).join('');
      
      // Add period in Arabic (ص for AM, م for PM)
      const periodArabic = (period === 'AM' || period === 'am') ? 'ص' : 'م';
      
      return `${hoursArabic}:${minutesArabic} ${periodArabic}`;
    } catch (error) {
      console.error('Error converting time to RTL:', error);
      return timeString;
    }
  };
  
  // Update the useEffect hook to handle RTL time formats
  useEffect(() => {
    if (doctorProfile) {
      // Get user locale from browser or default to "en"
      const userLocale = navigator.language || "en";
      const isRTL = userLocale.includes('ar');
      
      // Create a sanitized copy of the data
      const sanitizedData = Object.entries(doctorProfile).reduce((acc, [key, value]) => {
        // Convert string literals to empty strings and handle null/undefined
        if (value === "string" || value === null || value === undefined) {
          acc[key] = "";
        } else {
          // Convert key format if needed (camelCase to PascalCase)
          const pascalKey = key.charAt(0).toUpperCase() + key.slice(1);
          acc[pascalKey] = value;
        }
        return acc;
      }, {});
      
      // Process opening and closing times for RTL if needed
      let openingTime = doctorProfile.openingTime || "";
      let closingTime = doctorProfile.closingTime || "";
      
      if (isRTL) {
        openingTime = convertTimeToRTL(openingTime, userLocale);
        closingTime = convertTimeToRTL(closingTime, userLocale);
      }
      
      // Handle specifically named fields
      setFormData({
        Id: doctorProfile.id || "",
        FirstName: doctorProfile.firstName || "",
        LastName: doctorProfile.lastName || "",
        Email: doctorProfile.email || "",
        PhoneNumber: doctorProfile.phoneNumber || "",
        ProfilePicture: doctorProfile.profilePicture || "",
        currentFee: doctorProfile.currentFee || "",
        Experience: doctorProfile.experience || "",
        Address: doctorProfile.address || "",
        DateofBitrh: doctorProfile.dateofBitrh ? doctorProfile.dateofBitrh.split("T")[0] : "",
        Qualification: doctorProfile.qualification || "",
        ClinicName: doctorProfile.clinicName || "",
        ClinicAddress: doctorProfile.clinicAddress || "",
        ClinicPhoneNumber: doctorProfile.clinicPhoneNumber || "",
        Description: doctorProfile.description || "",
        LicenseNumber: doctorProfile.licenseNumber || "",
        OpeningTime: openingTime,
        ClosingTime: closingTime,
        ProfilePictureFile: null
      });
      
      // Set image preview if available
      if (doctorProfile.profilePicture) {
        setImagePreview(
          doctorProfile.profilePicture.startsWith("http")
            ? doctorProfile.profilePicture
            : `${backendUrl}/api/Doctor/profile-picture/${doctorProfile.id}`
        );
      }
    }
  }, [doctorProfile, backendUrl]);
  
  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Update form data
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
    
    // Mark field as touched
    setFormTouched((prev) => ({
      ...prev,
      [name]: true
    }));
    
    // Clear error for this field if it exists
    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: ""
      }));
    }
  };
  
  // Handle image upload
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.match("image.*")) {
        toast.error("Please select an image file");
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image file is too large. Maximum size is 5MB");
        return;
      }
      
      // Update form data
      setFormData((prev) => ({
        ...prev,
        ProfilePictureFile: file
      }));
      
      // Create preview
      const reader = new FileReader();
      reader.onloadstart = () => setIsUploading(true);
      reader.onload = (event) => {
        setImagePreview(event.target.result);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Handle profile picture upload
  const handleProfilePictureUpload = async () => {
    if (!formData.ProfilePictureFile) {
      toast.error("Please select an image first");
      return;
    }
    
    setIsUploading(true);
    try {
      const success = await updateDoctorProfilePicture(formData.ProfilePictureFile);
      
      if (success) {
        toast.success("Profile picture updated successfully!");
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        
        // Update preview with cache busting
        if (doctorProfile?.id) {
          setImagePreview(`${backendUrl}/api/Doctor/profile-picture/${doctorProfile.id}?t=${Date.now()}`);
          setFormData((prev) => ({ ...prev, ProfilePictureFile: null }));
        }
      } else {
        toast.error("Failed to update profile picture");
      }
    } catch (error) {
      console.error("Error updating profile picture:", error);
      toast.error("Failed to update profile picture");
    } finally {
      setIsUploading(false);
    }
  };
  
  // Validate form
  const validateForm = () => {
    const errors = {};
    
    // Required fields validation
    const requiredFields = [
      { key: "FirstName", label: "First Name" },
      { key: "LastName", label: "Last Name" },
      { key: "Email", label: "Email" },
      { key: "PhoneNumber", label: "Phone Number" },
      { key: "Qualification", label: "Qualification" },
      { key: "ClinicName", label: "Clinic Name" }
    ];
    
    requiredFields.forEach(({ key, label }) => {
      if (!formData[key] || formData[key].trim() === "") {
        errors[key] = `${label} is required`;
      }
    });
    
    // Email validation
    if (formData.Email && !/\S+@\S+\.\S+/.test(formData.Email)) {
      errors.Email = "Please enter a valid email address";
    }
    
    // Phone validation
    if (formData.PhoneNumber && !/^\d{10,15}$/.test(formData.PhoneNumber.replace(/[^0-9]/g, ""))) {
      errors.PhoneNumber = "Please enter a valid phone number";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Add the convertRTLTimeIfNeeded function back
  const convertRTLTimeIfNeeded = (timeString) => {
    if (!timeString) return "";
    
    // Check if the time string has Arabic numerals
    const hasArabicNumerals = /[\u0660-\u0669]/.test(timeString);
    
    if (hasArabicNumerals) {
      // Convert Arabic numerals to Latin (0-9)
      const arabicToLatinMap = {
        '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
        '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
      };
      
      // Replace Arabic numerals with Latin
      let latinTime = timeString;
      Object.entries(arabicToLatinMap).forEach(([arabic, latin]) => {
        latinTime = latinTime.replace(new RegExp(arabic, 'g'), latin);
      });
      
      // Handle AM/PM in Arabic
      if (latinTime.includes('ص')) {
        latinTime = latinTime.replace('ص', 'AM');
      } else if (latinTime.includes('م')) {
        latinTime = latinTime.replace('م', 'PM');
      }
      
      return latinTime.trim();
    }
    
    return timeString;
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      toast.error("Please fix the validation errors before saving");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create FormData object
      const formDataObj = new FormData();
      
      // Add all fields to FormData
      Object.entries(formData).forEach(([key, value]) => {
        // Skip ProfilePictureFile as it's handled separately
        if (key === "ProfilePictureFile") return;
        
        // Convert time fields if they contain RTL text
        if (key === "OpeningTime" || key === "ClosingTime") {
          const convertedTime = convertRTLTimeIfNeeded(value);
          formDataObj.append(key, convertedTime);
        } else if (value !== null && value !== undefined) {
          formDataObj.append(key, value);
        }
      });
      
      // Handle profile picture file
      if (formData.ProfilePictureFile) {
        formDataObj.append("ProfilePictureFile", formData.ProfilePictureFile);
      } else {
        // Add a dummy empty file if no new file is selected
        const emptyBlob = new Blob([""], { type: "application/octet-stream" });
        formDataObj.append("ProfilePictureFile", emptyBlob);
      }
      
      // For debugging - log what's being sent
      console.log("Submitting form data:");
      for (let [key, value] of formDataObj.entries()) {
        if (key !== "ProfilePictureFile") {
          console.log(`${key}: ${value}`);
        } else {
          console.log(`${key}: [File object]`);
        }
      }
      
      // Update profile
      const success = await updateDoctorProfile(formDataObj);
      
      if (success) {
        toast.success("Profile updated successfully!");
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      
      // Handle validation errors
      if (error.response?.data?.errors) {
        const serverErrors = {};
        Object.entries(error.response.data.errors).forEach(([key, messages]) => {
          serverErrors[key] = Array.isArray(messages) ? messages[0] : messages;
        });
        setFormErrors(serverErrors);
        
        // Show first error message
        const firstError = Object.values(serverErrors)[0];
        toast.error(firstError || "Failed to update profile");
      } else {
        toast.error("Failed to update profile");
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Toggle edit mode
  const toggleEdit = () => {
    if (isEditing) {
      // Discard changes
      if (doctorProfile) {
        setFormData({
          Id: doctorProfile.id || "",
          FirstName: doctorProfile.firstName || "",
          LastName: doctorProfile.lastName || "",
          Email: doctorProfile.email || "",
          PhoneNumber: doctorProfile.phoneNumber || "",
          ProfilePicture: doctorProfile.profilePicture || "",
          currentFee: doctorProfile.currentFee || "",
          Experience: doctorProfile.experience || "",
          Address: doctorProfile.address || "",
          DateofBitrh: doctorProfile.dateofBitrh ? doctorProfile.dateofBitrh.split("T")[0] : "",
          Qualification: doctorProfile.qualification || "",
          ClinicName: doctorProfile.clinicName || "",
          ClinicAddress: doctorProfile.clinicAddress || "",
          ClinicPhoneNumber: doctorProfile.clinicPhoneNumber || "",
          Description: doctorProfile.description || "",
          LicenseNumber: doctorProfile.licenseNumber || "",
          OpeningTime: doctorProfile.openingTime || "",
          ClosingTime: doctorProfile.closingTime || "",
          ProfilePictureFile: null
        });
      }
      
      // Reset errors
      setFormErrors({});
      setFormTouched({});
    } else {
      // Entering edit mode - make sure required fields have default values
      if (!formData.ClinicName) {
        setFormData(prev => ({
          ...prev,
          ClinicName: "Default Clinic"
        }));
      }
    }
    
    setIsEditing(!isEditing);
  };
  
  // Handle profile picture change
  const handleProfilePictureClick = () => {
    if (isEditing) {
      fileInputRef.current?.click();
    }
  };

  // Handle phone verification success
  const handlePhoneVerificationSuccess = (newPhoneNumber) => {
    setFormData(prev => ({ ...prev, PhoneNumber: newPhoneNumber }));
    setShowPhoneVerification(false);
    // Re-fetch doctor profile to get the updated phone number
    if (updateDoctorProfile) {
      // In a real implementation, you might want to refresh the doctor profile data
      // rather than just updating the local state
    }
  };
  
  if (!doctorProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600"></div>
      </div>
    );
  }
  
  // Render input field with error handling
  const renderInputField = ({
    name,
    label,
    type = "text",
    icon,
    required = false,
    placeholder = "",
    disabled = !isEditing
  }) => {
    const hasError = !!formErrors[name] && (formTouched[name] || isSubmitting);
    
    // Special handling for phone number field to add Change button
    if (name === 'PhoneNumber') {
      return (
        <div className="mb-5">
          <label htmlFor={name} className="block text-sm font-medium text-slate-700 mb-1">
            {icon && <span className="mr-2 inline-block text-blue-500">{icon}</span>}
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          <div className="flex">
            <div className="relative flex-grow">
              {icon && (
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  {icon}
                </div>
              )}
              <input
                id={name}
                name={name}
                type={type}
                value={formData[name] === "string" ? "" : formData[name] || ""}
                onChange={handleChange}
                disabled={true} // Always disabled for phone number
                placeholder={placeholder}
                className={`block w-full ${icon ? "pl-10" : "pl-3"} pr-3 py-2.5 border ${
                  hasError
                    ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                    : "border-slate-200 focus:ring-blue-500 focus:border-blue-500"
                } border-r-0 rounded-l-lg bg-slate-50 text-slate-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all`}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowPhoneVerification(true)}
              disabled={!isEditing}
              className={`px-4 py-2.5 ${
                isEditing 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-slate-200 text-slate-400'
              } rounded-r-lg transition-colors`}
            >
              Change
            </button>
          </div>
          {hasError && (
            <p className="mt-1 text-sm text-red-600">{formErrors[name]}</p>
          )}
        </div>
      );
    }
    
    // Special handling for time inputs to support RTL
    if (type === "time") {
      return (
        <div className="mb-5">
          <label htmlFor={name} className="block text-sm font-medium text-slate-700 mb-1">
            {icon && <span className="mr-2 inline-block text-blue-500">{icon}</span>}
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          <div className="relative">
            {icon && (
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                {icon}
              </div>
            )}
            <input
              id={name}
              name={name}
              // Use text type instead of time to allow RTL time formats
              type="text"
              dir="auto"
              value={formData[name] === "string" ? "" : formData[name] || ""}
              onChange={handleChange}
              disabled={disabled}
              placeholder={placeholder || "HH:MM AM/PM"}
              className={`block w-full ${icon ? "pl-10" : "pl-3"} pr-3 py-2.5 border ${
                hasError
                  ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                  : "border-slate-200 focus:ring-blue-500 focus:border-blue-500"
              } ${
                disabled ? "bg-slate-50 text-slate-500" : "bg-white"
              } rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all`}
            />
            {hasError && (
              <p className="mt-1 text-sm text-red-600">{formErrors[name]}</p>
            )}
          </div>
        </div>
      );
    }
    
    // Regular input fields (unchanged)
    return (
      <div className="mb-5">
        <label htmlFor={name} className="block text-sm font-medium text-slate-700 mb-1">
          {icon && <span className="mr-2 inline-block text-blue-500">{icon}</span>}
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              {icon}
            </div>
          )}
          <input
            id={name}
            name={name}
            type={type}
            value={formData[name] === "string" ? "" : formData[name] || ""}
            onChange={handleChange}
            disabled={disabled}
            placeholder={placeholder}
            className={`block w-full ${icon ? "pl-10" : "pl-3"} pr-3 py-2.5 border ${
              hasError
                ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                : "border-slate-200 focus:ring-blue-500 focus:border-blue-500"
            } ${
              disabled ? "bg-slate-50 text-slate-500" : "bg-white"
            } rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all`}
          />
          {hasError && (
            <p className="mt-1 text-sm text-red-600">{formErrors[name]}</p>
          )}
        </div>
      </div>
    );
  };
  
  // Render textarea field with error handling
  const renderTextareaField = ({
    name,
    label,
    icon,
    required = false,
    placeholder = "",
    rows = 3,
    disabled = !isEditing
  }) => {
    const hasError = !!formErrors[name] && (formTouched[name] || isSubmitting);
    
    return (
      <div className="mb-5">
        <label htmlFor={name} className="block text-sm font-medium text-slate-700 mb-1">
          {icon && <span className="mr-2 inline-block text-blue-500">{icon}</span>}
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <textarea
          id={name}
          name={name}
          value={formData[name] === "string" ? "" : formData[name] || ""}
          onChange={handleChange}
          disabled={disabled}
          placeholder={placeholder}
          rows={rows}
          className={`block w-full px-3 py-2.5 border ${
            hasError
              ? "border-red-300 focus:ring-red-500 focus:border-red-500"
              : "border-slate-200 focus:ring-blue-500 focus:border-blue-500"
          } ${
            disabled ? "bg-slate-50 text-slate-500" : "bg-white"
          } rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all`}
        />
        {hasError && (
          <p className="mt-1 text-sm text-red-600">{formErrors[name]}</p>
        )}
      </div>
    );
  };

  // Form Content
  const renderFormContent = () => {
    // Personal Information
    if (activeTab === "personal") {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-xl shadow-sm p-6 border border-slate-100"
        >
          <div className="flex items-center mb-6 pb-2 border-b border-slate-100">
            <div className="bg-blue-50 p-2 rounded-full mr-3">
              <FaUserMd className="text-xl text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-800">Personal Information</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderInputField({
              name: "FirstName", 
              label: "First Name", 
              icon: <FaUserMd />,
              required: true,
              placeholder: "Enter your first name"
            })}
            
            {renderInputField({
              name: "LastName", 
              label: "Last Name", 
              icon: <FaUserMd />,
              required: true,
              placeholder: "Enter your last name"
            })}
            
            {renderInputField({
              name: "Email", 
              label: "Email Address", 
              type: "email",
              icon: <FaEnvelope />,
              required: true,
              placeholder: "Enter your email address"
            })}
            
            {renderInputField({
              name: "PhoneNumber", 
              label: "Phone Number", 
              icon: <FaPhone />,
              required: true,
              placeholder: "Enter your phone number"
            })}
            
            {renderInputField({
              name: "DateofBitrh", 
              label: "Date of Birth", 
              type: "date",
              icon: <FaCalendarAlt />,
              placeholder: "Select your birth date"
            })}
            
            {renderInputField({
              name: "Address", 
              label: "Home Address", 
              icon: <FaMapMarkerAlt />,
              placeholder: "Enter your home address"
            })}
          </div>
          
          <div className="mt-6">
            {renderTextareaField({
              name: "Description", 
              label: "About Yourself", 
              icon: <FaInfoCircle />,
              placeholder: "Share information about yourself that might be relevant for patients",
              rows: 4
            })}
          </div>
        </motion.div>
      );
    }
    
    // Professional Information
    if (activeTab === "professional") {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-xl shadow-sm p-6 border border-slate-100"
        >
          <div className="flex items-center mb-6 pb-2 border-b border-slate-100">
            <div className="bg-blue-50 p-2 rounded-full mr-3">
              <FaStethoscope className="text-xl text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-800">Professional Information</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderInputField({
              name: "Qualification", 
              label: "Qualifications", 
              icon: <FaGraduationCap />,
              required: true,
              placeholder: "e.g., MD, MBBS, MS"
            })}
            
            {renderInputField({
              name: "Experience", 
              label: "Years of Experience", 
              type: "number",
              icon: <FaStethoscope />,
              placeholder: "Enter years of experience"
            })}
            
            {renderInputField({
              name: "currentFee", 
              label: "Consultation Fee ($)", 
              type: "number",
              icon: <FaMoneyBillAlt />,
              placeholder: "Enter your consultation fee"
            })}
            
            {renderInputField({
              name: "LicenseNumber", 
              label: "License Number", 
              icon: <FaIdCard />,
              placeholder: "Enter your medical license number"
            })}
          </div>
          
          <div className="mt-6">
            {renderTextareaField({
              name: "Specialization", 
              label: "Specializations", 
              icon: <FaNotesMedical />,
              placeholder: "Enter your medical specializations",
              rows: 3
            })}
          </div>
        </motion.div>
      );
    }
    
    // Clinic Information
    if (activeTab === "clinic") {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-xl shadow-sm p-6 border border-slate-100"
        >
          <div className="flex items-center mb-6 pb-2 border-b border-slate-100">
            <div className="bg-blue-50 p-2 rounded-full mr-3">
              <FaHospital className="text-xl text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-800">Clinic Information</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderInputField({
              name: "ClinicName", 
              label: "Clinic Name", 
              icon: <FaClinicMedical />,
              required: true,
              placeholder: "Enter your clinic name"
            })}
            
            {renderInputField({
              name: "ClinicPhoneNumber", 
              label: "Clinic Phone", 
              icon: <FaPhone />,
              placeholder: "Enter clinic phone number"
            })}
            
            {renderInputField({
              name: "OpeningTime", 
              label: "Opening Time", 
              type: "time",
              icon: <FaClock />,
              placeholder: "e.g., 10:00 AM / ١٠:٠٠ ص"
            })}
            
            {renderInputField({
              name: "ClosingTime", 
              label: "Closing Time", 
              type: "time",
              icon: <FaClock />,
              placeholder: "e.g., 11:00 PM / ١١:٠٠ م"
            })}
          </div>
          
          <div className="mt-6">
            {renderTextareaField({
              name: "ClinicAddress", 
              label: "Clinic Address", 
              icon: <FaMapMarkerAlt />,
              placeholder: "Enter full clinic address",
              rows: 3
            })}
          </div>
        </motion.div>
      );
    }
    
    return null;
  };
  
  // Form Actions
  const renderFormActions = () => {
    if (!isEditing) return null;
    
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white p-4 border-t border-slate-200 shadow-md z-10">
        <div className="max-w-6xl mx-auto flex justify-end space-x-4">
          <button
            type="button"
            onClick={toggleEdit}
            className="px-6 py-2.5 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            disabled={isSubmitting}
          >
            <FaTimes className="inline mr-2" /> Cancel
          </button>
          
          <button
            type="submit"
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                Saving...
              </>
            ) : (
              <>
                <FaSave className="inline mr-2" /> Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto pb-16">
      {/* Profile Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-xl shadow-lg overflow-hidden mb-8 border border-slate-100"
      >
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-32 md:h-48"></div>
        <div className="px-8 pb-8 relative">
          {/* Profile Image */}
          <div className="absolute -top-16 left-8 flex flex-col items-center">
            <div 
              className="relative group cursor-pointer"
              onClick={handleProfilePictureClick}
            >
              <div className="h-32 w-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white">
                {isUploading ? (
                  <div className="h-full w-full flex items-center justify-center bg-gray-100">
                    <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                  </div>
                ) : (
                  imagePreview ? (
                    <img 
                      src={imagePreview} 
                      alt="Doctor" 
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-gray-100">
                      <FaUserMd className="h-16 w-16 text-gray-300" />
                    </div>
                  )
                )}
              </div>
              {isEditing && (
                <div className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-2 shadow-md hover:bg-blue-700 transition-colors">
                  <FaCamera className="text-white text-sm" />
                </div>
              )}
            </div>
            
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/*"
              className="hidden"
            />
            
            {isEditing && formData.ProfilePictureFile && (
              <button
                type="button"
                onClick={handleProfilePictureUpload}
                disabled={isUploading}
                className="mt-4 px-4 py-2 bg-white text-blue-600 rounded-lg shadow hover:bg-blue-50 transition-colors text-sm font-medium border border-blue-100"
              >
                {isUploading ? "Uploading..." : "Save Photo"}
              </button>
            )}
          </div>
          
          {/* Profile Info */}
          <div className="ml-44 md:ml-48 flex flex-col md:flex-row md:items-center md:justify-between pt-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-800">
                Dr. {formData.FirstName} {formData.LastName}
              </h1>
              <p className="text-slate-500 text-base md:text-lg">{doctorProfile.specialization || "Medical Doctor"}</p>
            </div>
            
            <button
              onClick={toggleEdit}
              className={`mt-4 md:mt-0 px-6 py-2.5 rounded-lg font-medium flex items-center justify-center transition-colors ${
                isEditing 
                  ? "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200" 
                  : "bg-blue-600 text-white hover:bg-blue-700"
              } shadow`}
            >
              {isEditing ? (
                <>
                  <FaTimes className="mr-2" /> Cancel
                </>
              ) : (
                <>
                  <FaEdit className="mr-2" /> Edit Profile
                </>
              )}
            </button>
          </div>
          
          <div className="ml-44 md:ml-48 mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center">
              <div className="bg-blue-50 p-2 rounded-lg mr-3">
                <FaEnvelope className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Email</p>
                <p className="font-medium text-slate-700">{formData.Email || "Not provided"}</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="bg-blue-50 p-2 rounded-lg mr-3">
                <FaPhone className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Phone</p>
                <p className="font-medium text-slate-700">{formData.PhoneNumber || "Not provided"}</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="bg-blue-50 p-2 rounded-lg mr-3">
                <FaMoneyBillAlt className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Consultation Fee</p>
                <p className="font-medium text-slate-700">${formData.currentFee || "0"}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 mb-8 overflow-x-auto scrollbar-hide bg-white rounded-t-xl shadow-sm">
        <button
          className={`px-6 py-4 font-medium text-sm whitespace-nowrap ${
            activeTab === "personal"
              ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
              : "text-slate-600 hover:text-blue-500 hover:bg-slate-50"
          }`}
          onClick={() => setActiveTab("personal")}
        >
          <FaUserMd className="inline-block mr-2" /> Personal Info
        </button>
        
        <button
          className={`px-6 py-4 font-medium text-sm whitespace-nowrap ${
            activeTab === "professional"
              ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
              : "text-slate-600 hover:text-blue-500 hover:bg-slate-50"
          }`}
          onClick={() => setActiveTab("professional")}
        >
          <FaStethoscope className="inline-block mr-2" /> Professional Info
        </button>
        
        <button
          className={`px-6 py-4 font-medium text-sm whitespace-nowrap ${
            activeTab === "clinic"
              ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
              : "text-slate-600 hover:text-blue-500 hover:bg-slate-50"
          }`}
          onClick={() => setActiveTab("clinic")}
        >
          <FaHospital className="inline-block mr-2" /> Clinic Details <span className="text-red-500">*</span>
        </button>
      </div>
      
      {/* Form Content */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {renderFormContent()}
        {renderFormActions()}
      </form>
      
      {/* Phone verification modal */}
      {showPhoneVerification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="max-w-md w-full mx-4">
            <PhoneVerification
              userId={doctorProfile?.id}
              userType="Doctor"
              currentPhoneNumber={formData.PhoneNumber}
              onSuccess={handlePhoneVerificationSuccess}
              onCancel={() => setShowPhoneVerification(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorProfile;
