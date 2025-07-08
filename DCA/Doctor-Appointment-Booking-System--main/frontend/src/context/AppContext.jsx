import React, { createContext, useEffect, useState, useContext, useCallback } from "react";
import { toast } from "react-toastify";
import axios from "axios";
import { useNavigate } from 'react-router-dom';
import { requestDataRemoval, requestDataExport } from "../utils/gdprService";
import config from '../config/environment';
import { appointmentService, doctorService } from '../services/api';

export const AppContext = createContext();

// Add the useAppContext hook
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  return context;
};

const AppContextProvider = (props) => {
  // Use environment variable with a fallback for backend URL
  const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5109";
  const currencySymbol = "Egy";

  // Initialize axios defaults for consistent API calls
  useEffect(() => {
    // Set global axios defaults
    axios.defaults.baseURL = backendUrl;
    
    // Add request interceptor to handle common headers and errors
    axios.interceptors.request.use(
      config => {
        // Add a timeout to all requests
        config.timeout = 8000; // 8 seconds
        
        // Log API calls in development
        if (import.meta.env.DEV) {
          console.log(`API Call: ${config.method.toUpperCase()} ${config.url}`);
        }
        
        return config;
      },
      error => {
        return Promise.reject(error);
      }
    );
    
    // Add response interceptor to handle common errors
    axios.interceptors.response.use(
      response => response,
      error => {
        if (error.response) {
          // Handle specific HTTP errors
          if (error.response.status === 401) {
            toast.error('Authentication expired. Please log in again.');
          } else if (error.response.status === 404) {
            console.warn('Resource not found:', error.config.url);
          } else if (error.response.status >= 500) {
            toast.error('Server error. Please try again later.');
          }
        } else if (error.code === 'ECONNABORTED') {
          toast.error('Request timed out. Please check your connection.');
        } else if (!navigator.onLine) {
          toast.error('No internet connection.');
        }
        
        return Promise.reject(error);
      }
    );
  }, [backendUrl]);

  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Initialize auth state from localStorage instead of clearing it
  const [token, setToken] = useState(() => localStorage.getItem("token") || null);
  const [userRole, setUserRole] = useState(() => localStorage.getItem("userRole") || null);
  const [userData, setUserData] = useState(() => {
    try {
      const storedData = localStorage.getItem("userData");
      return storedData ? JSON.parse(storedData) : null;
    } catch (error) {
      console.error("Error parsing userData from localStorage:", error);
      return null;
    }
  });
  
  // Make setUserData available globally for cross-context updates
  useEffect(() => {
    // Create a global function to update userData from other contexts
    window.updateGlobalUserData = (newUserData) => {
      console.log("Updating global userData:", newUserData);
      setUserData(currentData => {
        const updatedData = { ...currentData, ...newUserData };
        localStorage.setItem("userData", JSON.stringify(updatedData));
        return updatedData;
      });
    };
    
    // Clean up on unmount
    return () => {
      delete window.updateGlobalUserData;
    };
  }, []);

  // Add doctor-specific state
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [doctorAppointments, setDoctorAppointments] = useState([]);
  const [doctorAvailability, setDoctorAvailability] = useState(null);
  
  // GDPR related states
  const [gdprRequestPending, setGdprRequestPending] = useState(false);
  const [gdprRequestId, setGdprRequestId] = useState(null);

  const navigate = useNavigate();

  // Add the helper function early in the file, near other utility functions
  const isUuidFormat = (id) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  };

  // Extract data from JWT token
  const extractTokenData = (token) => {
    if (!token) return null;
    
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error("Error decoding token:", error);
      return null;
    }
  };

  // Add function to refresh user data from token
  const refreshUserData = async () => {
    if (!token) return null;
    
    try {
      // Extract data from token
      const tokenData = extractTokenData(token);
      
      if (!tokenData) {
        console.error("Could not extract data from token");
        return null;
      }
      
      console.log("Token data:", tokenData);
      
      // Extract user ID from various possible claims in the token
      const userId = 
        tokenData["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] || 
        tokenData.nameid || 
        tokenData.userId || 
        tokenData.sub;
      
      // Extract role from token if available
      const role = tokenData["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || 
                  tokenData.role;
      
      if (role && !userRole) {
        console.log("Setting role from token:", role);
        setUserRole(role);
        localStorage.setItem("userRole", role);
      }
      
      if (userId) {
        console.log("Found user ID in token:", userId);
        localStorage.setItem("userId", userId);
        
        // For doctors, also store the userId in doctorId if we don't have it yet
        if (role === 'Doctor' || userRole === 'Doctor') {
          const storedDoctorId = localStorage.getItem("doctorId");
          if (!storedDoctorId) {
            console.log("Setting doctorId from userId for Doctor role:", userId);
            localStorage.setItem("doctorId", userId);
          }
        }
        
        // For patients, try to get the numeric patient ID if we don't have it yet
        if ((role === 'Patient' || userRole === 'Patient') && !localStorage.getItem("patientId")) {
          try {
            console.log("Fetching numeric patient ID for Patient role...");
            const response = await axios.get(`${backendUrl}/api/Patient/by-user-id/${userId}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.data && response.data.id) {
              const numericPatientId = response.data.id;
              console.log("Retrieved numeric patient ID:", numericPatientId);
              localStorage.setItem("patientId", numericPatientId);
            }
          } catch (err) {
            console.warn("Could not retrieve numeric patient ID:", err);
          }
        }
        
        // Don't fetch profile data here - let the role-specific contexts handle it
        // This prevents conflicts between contexts
        
        // Create basic user data with ID
        const basicUserData = {
          id: userId,
          userId: userId,
          role: role || userRole
        };
        
        console.log("Setting basic user data with ID:", basicUserData);
        setUserData(basicUserData);
        localStorage.setItem("userData", JSON.stringify(basicUserData));
        return basicUserData;
      }
      return null;
    } catch (error) {
      console.error("Error refreshing user data:", error);
      toast.error("Failed to refresh user data");
      return null;
    }
  };

  // Update localStorage when state changes
  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      localStorage.removeItem("token");
      delete axios.defaults.headers.common["Authorization"];
    }
  }, [token]);

  // Check for missing userData when token exists
  useEffect(() => {
    const checkUserData = async () => {
      if (token && !userData) {
        console.log("Token exists but userData is missing. Attempting to refresh...");
        await refreshUserData();
      }
    };
    
    checkUserData();
  }, [token, userData]);

  useEffect(() => {
    if (userRole) {
      localStorage.setItem("userRole", userRole);
    } else {
      localStorage.removeItem("userRole");
    }
  }, [userRole]);

  useEffect(() => {
    if (userData) {
      localStorage.setItem("userData", JSON.stringify(userData));
    } else {
      localStorage.removeItem("userData");
    }
  }, [userData]);

  // Instead of clearing localStorage, add a proper initialization function
  useEffect(() => {
    const initializeAuthState = () => {
      const storedToken = localStorage.getItem("token");
      const storedRole = localStorage.getItem("userRole");
      
      if (storedToken) {
        setToken(storedToken);
        axios.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;
        
        if (storedRole) {
          setUserRole(storedRole);
        }
        
        // Try to load user data if available
        try {
          const storedUserData = localStorage.getItem("userData");
          if (storedUserData) {
            setUserData(JSON.parse(storedUserData));
          } else {
            // If we have a token but no user data, try to refresh it
            refreshUserData();
          }
        } catch (error) {
          console.error("Error loading user data:", error);
        }
      }
    };
    
    initializeAuthState();
  }, []);

  // Update token handler
  const updateToken = useCallback((newToken) => {
    if (newToken) {
      setToken(newToken);
      localStorage.setItem('token', newToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    } else {
      setToken(null);
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    }
  }, []);

  // Logout handler
  const logout = useCallback(() => {
    // Clear all authentication data
    setToken(null);
    setUserRole(null);
    setUserData(null);
    setDoctorProfile(null);
    setDoctorAppointments([]);
    setDoctorAvailability(null);
    
    // Clear localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userData");
    localStorage.removeItem("doctorId");
    localStorage.removeItem("patientId");
    
    // Clear axios default headers
    delete axios.defaults.headers.common["Authorization"];
    
    // Navigate to public home page
    navigate('/public/home');
    
    toast.success("Logged out successfully");
  }, [navigate]);

  // Login function
  const login = async (credentials) => {
    if (!credentials.email || !credentials.password) {
      toast.error("Email and password are required");
      return { success: false, message: "Email and password are required" };
    }

      setLoading(true);
    try {
      const response = await axios.post(`${backendUrl}/api/Account/login`, credentials);

      if (response.data && response.data.token) {
        const tokenData = extractTokenData(response.data.token);
        
        setToken(response.data.token);
        setUserRole(tokenData.role);
        setUserId(tokenData.userId);
        
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('userRole', tokenData.role);
        localStorage.setItem('userId', tokenData.userId);
        
        await refreshUserData();
        
        toast.success("Login successful");
        return { success: true };
        }
        
      toast.error("Login failed. Please check your credentials.");
      return { success: false, message: "Login failed" };
          } catch (error) {
      console.error("Login error:", error);
      
      // Handle specific error cases
      if (error.response) {
        // Account deleted case
        if (error.response.data && error.response.data.accountDeleted) {
          toast.error(error.response.data.message);
          return { success: false, message: error.response.data.message, accountDeleted: true };
        }
        
        // Email confirmation required case
        if (error.response.data && error.response.data.requiresEmailConfirmation) {
        return { 
          success: false,
          requiresEmailConfirmation: true,
          userId: error.response.data.userId,
          email: error.response.data.email,
            message: error.response.data.message
          };
        }
        
        // Other error with response message
        const errorMessage = error.response.data?.message || "Login failed. Please try again.";
      toast.error(errorMessage);
      return { success: false, message: errorMessage };
      }
      
      // Generic error
      toast.error("Login failed. Please check your connection and try again.");
      return { success: false, message: "Login failed" };
    } finally {
      setLoading(false);
    }
  };

  // GDPR data removal function
  const requestGdprDataRemoval = async () => {
    if (!userData || !userData.id || !userData.email || !token) {
      toast.error("You must be logged in to request data removal");
      return { success: false, message: "Authentication required" };
    }

    // Check if token is still valid
    const tokenData = extractTokenData(token);
    if (!tokenData || (tokenData.exp && tokenData.exp < Date.now() / 1000)) {
      console.log("Token expired or invalid, attempting to refresh session");
      // Try to refresh the session or redirect to login
      toast.error("Your session has expired. Please log in again.");
      logout();
      return { success: false, message: "Authentication expired" };
    }

    setLoading(true);
    try {
      console.log("Requesting data removal for user:", userData.id);
      console.log("Current token (first 10 chars):", token.substring(0, 10) + "...");
      
      const result = await requestDataRemoval(userData.id, userData.email, token, backendUrl);
      console.log("Data removal result:", result);
      
      if (result.success) {
        setGdprRequestPending(true);
        setGdprRequestId(result.requestId);
        
        if (result.requestId) {
          localStorage.setItem("gdprRequestId", result.requestId);
          toast.success("Data removal request submitted successfully. You will be logged out once complete.");
        } else {
          // Immediate deletion case
          toast.success("Your account has been deleted successfully. You will be logged out shortly.");
          setTimeout(() => {
            logout();
            window.location.href = '/';
          }, 3000);
        }
      } else {
        console.error("Data removal failed:", result);
        
        // Handle authentication errors
        if (result.message && result.message.includes("Authentication")) {
          toast.error("Your session has expired. Please log in again.");
          logout();
          navigate('/login');
        } else {
          toast.error(result.message || "Failed to submit data removal request");
        }
      }
      
      return result;
    } catch (error) {
      console.error("GDPR data removal error:", error);
      toast.error("An error occurred while processing your request");
      return { 
        success: false, 
        message: "An unexpected error occurred", 
        error: error.message 
      };
    } finally {
      setLoading(false);
    }
  };

  // GDPR data export function
  const requestGdprDataExport = async () => {
    if (!userData || !userData.id || !userData.email || !token) {
      toast.error("You must be logged in to request data export");
      return { success: false, message: "Authentication required" };
    }

    setLoading(true);
    try {
      const result = await requestDataExport(userData.id, userData.email, token, backendUrl);
      
      if (result.success) {
        toast.success("Data export request submitted. You will receive an email with your data.");
      } else {
        toast.error(result.message || "Failed to request data export");
      }
      
      return result;
    } catch (error) {
      console.error("GDPR data export error:", error);
      toast.error("An error occurred while processing your request");
      return { 
        success: false, 
        message: "An unexpected error occurred", 
        error: error.message 
      };
    } finally {
      setLoading(false);
    }
  };

  // Update the getDoctorProfile function
  const getDoctorProfile = async () => {
    if (!token || userRole !== "Doctor") return null;
    
    try {
      setLoading(true);
      // Get user ID from userData
      const userId = userData?.id;
      if (!userId) {
        console.error("User ID not found in userData");
        return null;
      }

      console.log(`[AppContext] Attempting to fetch doctor profile for user ID: ${userId}`);

      try {
        // Check if userId is in UUID format
        const isUuid = isUuidFormat(userId);
        let doctorResponse;
        
        if (isUuid) {
          // If it's a UUID, use the by-user-id endpoint with path parameter
          doctorResponse = await axios.get(`${backendUrl}/api/Doctor/by-user-id/${userId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } else {
          // If it's a numeric ID, use query parameter
          doctorResponse = await axios.get(`${backendUrl}/api/Doctor?userId=${userId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
        }
        
        if (!doctorResponse.data || !doctorResponse.data.id) {
          console.error("Could not find doctor ID for this user");
          return null;
        }
        
        const doctorId = doctorResponse.data.id;
        console.log(`[AppContext] Successfully retrieved doctor ID: ${doctorId}`);
        
        // Now fetch the doctor profile using the numeric doctor ID
        const profileResponse = await axios.get(`${backendUrl}/api/Doctor/Profile/${doctorId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (profileResponse.data) {
          setDoctorProfile(profileResponse.data);
          setUserData(profileResponse.data);
          return profileResponse.data;
        }
        return null;
      } catch (apiError) {
        // Handle 404 errors specifically
        if (apiError.response && apiError.response.status === 404) {
          console.warn(`[AppContext] Doctor profile not found (404). This might be normal for new doctors.`);
          
          // Attempt to get basic doctor information from userData
          if (userData) {
            const basicDoctorProfile = {
              id: userData.id,
              firstName: userData.firstName || "",
              lastName: userData.lastName || "",
              email: userData.email || "",
              profilePicture: userData.profilePicture || null
            };
            
            console.log("[AppContext] Created basic doctor profile from user data:", basicDoctorProfile);
            setDoctorProfile(basicDoctorProfile);
            return basicDoctorProfile;
          }
        } else {
          // For other errors, log details and rethrow
          console.error("[AppContext] API error details:", apiError.response?.data || apiError.message);
          throw apiError;
        }
        return null;
      }
    } catch (error) {
      console.error("[AppContext] Error fetching doctor profile:", error);
      if (error.response?.status === 401) {
        logout();
      } else {
        toast.error(error.response?.data?.message || "Failed to fetch profile");
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Update other functions that make API calls to the Doctor endpoint
  const updateDoctorProfile = async (profileData) => {
    if (!token || userRole !== "Doctor") return false;
    
    try {
      setLoading(true);
      // Get user ID from userData
      const userId = userData?.id;
      if (!userId) {
        console.error("User ID not found in userData");
        return false;
      }

      // Check if userId is in UUID format
      const isUuid = isUuidFormat(userId);
      let doctorResponse;
      
      if (isUuid) {
        // If it's a UUID, use the by-user-id endpoint with path parameter
        doctorResponse = await axios.get(`${backendUrl}/api/Doctor/by-user-id/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        // If it's a numeric ID, use query parameter
        doctorResponse = await axios.get(`${backendUrl}/api/Doctor?userId=${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      
      if (!doctorResponse.data || !doctorResponse.data.id) {
        console.error("Could not find doctor ID for this user");
        return false;
      }
      
      const doctorId = doctorResponse.data.id;

      // Use the correct endpoint for updating doctor profile
      const response = await axios.put(
        `${backendUrl}/api/Doctor/update-doctor-profile/${doctorId}`,
        profileData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          } 
        }
      );
      
      if (response.data) {
      setDoctorProfile(response.data);
        setUserData(response.data);
      toast.success("Profile updated successfully");
      return true;
      }
      return false;
    } catch (error) {
      console.error("Error updating profile:", error);
      if (error.response?.status === 401) {
        logout();
      } else {
      toast.error(error.response?.data?.message || "Failed to update profile");
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getDoctorAppointments = async () => {
    try {
      setLoading(true);
      
      const doctorId = doctorProfile?.id || localStorage.getItem("doctorId");
      
      if (!doctorId) {
        toast.error("Doctor ID not found. Please complete your profile.");
        return [];
      }
      
      // Use the service instead of direct axios call
      const response = await doctorService.getDoctorAppointments(doctorId);
      
      if (response.data) {
        setDoctorAppointments(response.data);
        return response.data;
      } else {
        return [];
      }
    } catch (error) {
      console.error("Error fetching doctor appointments:", error);
      toast.error(error?.message || "Failed to fetch appointments");
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getDoctorAvailability = async () => {
    if (!token || userRole !== "Doctor") return null;
    
    try {
      setLoading(true);
      
      // Get user ID from userData
      const userId = userData?.id;
      if (!userId) {
        console.error("User ID not found in userData");
        return null;
      }

      // First, get the doctor ID using the by-user-id endpoint
      const doctorResponse = await axios.get(`${backendUrl}/api/Doctor/by-user-id/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!doctorResponse.data || !doctorResponse.data.id) {
        console.error("Could not find doctor ID for this user");
        return null;
      }
      
      const doctorId = doctorResponse.data.id;
      
      // Use the correct endpoint to get availability
      const response = await axios.get(`${backendUrl}/api/Doctor/availability/${doctorId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setDoctorAvailability(response.data);
      return response.data;
    } catch (error) {
      console.error("Error fetching availability:", error);
        toast.error(error.response?.data?.message || "Failed to fetch availability");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateDoctorAvailability = async (availabilityData) => {
    if (!token || userRole !== "Doctor") return false;
    
    try {
      setLoading(true);
      
      // Get user ID from userData
      const userId = userData?.id;
      if (!userId) {
        console.error("User ID not found in userData");
        return false;
      }

      // First, get the doctor ID using the by-user-id endpoint
      const doctorResponse = await axios.get(`${backendUrl}/api/Doctor/by-user-id/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!doctorResponse.data || !doctorResponse.data.id) {
        console.error("Could not find doctor ID for this user");
        return false;
      }
      
      const doctorId = doctorResponse.data.id;
      
      // Use the correct endpoint to update availability
      const response = await axios.put(
        `${backendUrl}/api/Doctor/availability/${doctorId}`,
        availabilityData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setDoctorAvailability(response.data);
      toast.success("Availability updated successfully");
      return true;
    } catch (error) {
      console.error("Error updating availability:", error);
      toast.error(error.response?.data?.message || "Failed to update availability");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Effect to fetch doctor profile when role is Doctor
  useEffect(() => {
    if (token && userRole === "Doctor") {
      getDoctorProfile();
    }
  }, [token, userRole]);

  const getDoctorsData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/Doctor`);
      setDoctors(response.data);
    } catch (error) {
      console.error("Error fetching doctors:", error);
      if (error.response?.status === 401) {
        logout(); // Logout if unauthorized
      } else {
        toast.error(error.response?.data?.message || "Failed to fetch doctors");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      getDoctorsData();
    }
  }, [token]);

  const getAppointments = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/doctor/appointments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data.success) {
        setDoctorAppointments(data.appointments.reverse());
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error?.message || error);
    }
  };

  const completeAppointment = async (appointmentId) => {
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/Appointment/confirm/${appointmentId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        getAppointments();
        toast.success(data.message || "Appointment confirmed successfully");
      } else {
        toast.error(data.message || "Failed to confirm appointment");
      }
    } catch (error) {
      toast.error(error?.message || error);
    }
  };

  const cancelAppointment = async (appointmentId) => {
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/Appointment/cancel/${appointmentId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        getAppointments();
        toast.success(data.message || "Appointment cancelled successfully");
      } else {
        toast.error(data.message || "Failed to cancel appointment");
      }
    } catch (error) {
      toast.error(error?.message || error);
    }
  };

  const getDashData = async () => {
    try {
      // Get doctor ID
      let doctorId;
      try {
        doctorId = localStorage.getItem("doctorId") || (userData && userData.id);
      } catch (error) {
        console.error("Error accessing localStorage for doctorId:", error);
        doctorId = userData && userData.id;
      }
      
      if (!doctorId) {
        console.error("No doctor ID available for fetching dashboard");
        toast.error("Doctor ID not found. Please try logging in again.");
        return null;
      }
      
      // Use the service instead of direct axios call
      const response = await doctorService.getDoctorDashboardData(doctorId);
      
      if (response.data && response.data.success) {
        setDoctorDashboard(response.data.dashData);
        return response.data.dashData;
      } else {
        toast.error(response.data?.message || "Failed to fetch dashboard data");
        return null;
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error(error?.message || "Failed to fetch dashboard data");
      return null;
    }
  };

  const getProfileData = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/doctor/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(data);
      return data;
    } catch (error) {
      console.error("Error fetching profile:", error);
      throw error;
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const { data } = await axios.put(
        `${backendUrl}/api/doctor/profile`,
        profileData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUser(data);
      return data;
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  };

  const updateAvailability = async (availability) => {
    try {
      const { data } = await axios.put(
        `${backendUrl}/api/doctor/availability`,
        availability,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return data;
    } catch (error) {
      console.error("Error updating availability:", error);
      throw error;
    }
  };

  // Add new functions for the available slots and checking availability
  const getAvailableSlots = async (doctorId, date) => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/Appointment/available-slots`, {
        params: { doctorId, date },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      return response.data;
    } catch (error) {
      console.error("Error fetching available slots:", error);
      toast.error(error.response?.data?.message || "Failed to fetch available slots");
      return [];
    } finally {
      setLoading(false);
    }
  };

  const checkAppointmentAvailability = async (appointmentData) => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/Appointment/check-availability`, {
        params: appointmentData,
        headers: { Authorization: `Bearer ${token}` }
      });
      
      return response.data;
    } catch (error) {
      console.error("Error checking appointment availability:", error);
      toast.error(error.response?.data?.message || "Failed to check appointment availability");
      return { available: false };
    } finally {
      setLoading(false);
    }
  };

  // Add the updateAppointmentStatus function before the return statement
  const updateAppointmentStatus = async (appointmentId, status) => {
    try {
      setLoading(true);
      // Use the service instead of direct axios call
      const response = await appointmentService.updateAppointmentStatus(appointmentId, status);
      
      await getDoctorAppointments(); // Refresh appointments
      toast.success(`Appointment ${status.toLowerCase()} successfully`);
      return true;
    } catch (error) {
      console.error("Error updating appointment status:", error);
      toast.error(error.response?.data?.message || `Failed to update appointment status`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppContext.Provider
      value={{
        backendUrl,
        currencySymbol,
    doctors,
        loading,
    token,
    setToken,
    userRole,
    setUserRole,
    userData,
    setUserData,
    doctorProfile,
        doctorAppointments,
        doctorAvailability,
    getDoctorProfile,
    updateDoctorProfile,
    getDoctorAppointments,
    updateAppointmentStatus,
    getDoctorAvailability,
        updateDoctorAvailability,
        cancelAppointment,
        logout,
        getAppointments,
        completeAppointment,
        getDashData,
        getProfileData,
        updateProfile,
        updateAvailability,
        login,
        // Add the new functions to the context
        getAvailableSlots,
        checkAppointmentAvailability,
        // Add the refresh function to the context
        refreshUserData,
        // GDPR related
        gdprRequestPending,
        gdprRequestId,
        requestGdprDataRemoval,
        requestGdprDataExport
      }}
    >
      {props.children}
    </AppContext.Provider>
  );
};

export default AppContextProvider;
