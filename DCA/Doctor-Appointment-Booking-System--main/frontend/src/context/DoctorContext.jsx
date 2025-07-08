import { createContext, useState, useEffect, useCallback, useContext } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate, useLocation } from "react-router-dom";
import { AppContext } from "./AppContext";

export const DoctorContext = createContext();

const DoctorContextProvider = (props) => {
  const backendUrl = "http://localhost:5109";
  const [loading, setLoading] = useState(true);
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem("token") || null;
    } catch (e) {
      console.error("Error accessing localStorage:", e);
      return null;
    }
  });
  const [userId, setUserId] = useState(() => {
    try {
      return localStorage.getItem("userId") || null;
    } catch (e) {
      console.error("Error accessing localStorage:", e);
      return null;
    }
  });
  const [appointments, setAppointments] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [availability, setAvailability] = useState([]);

  const navigate = useNavigate();
  const location = useLocation();
  
  // Access AppContext to detect token changes there
  const appContext = useContext(AppContext);
  const appToken = appContext?.token;
  const appUserRole = appContext?.userRole;
  const appUserData = appContext?.userData;

  // Add validateToken function to fix the Reference Error
  const validateToken = useCallback((token) => {
    if (!token) return false;
    
    try {
      // Parse the JWT token to get the payload
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      // Extract common claim formats
      const role = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || 
                  payload['role'] || 
                  payload['Role'];
      
      // Normalize the role for comparison
      const normalizedRole = typeof role === 'string' ? role.toLowerCase() : '';
      
      // Check if this is a doctor token
      return normalizedRole === 'doctor';
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }, []);

  // Helper function to set up axios headers
  const setupAxiosHeaders = useCallback((token) => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common["Authorization"];
    }
  }, []);
  
  // Define handleLogout before using it in the initializeAuth effect
  const handleLogout = useCallback(async (shouldNavigate = true) => {
    try {
      // First update state before removing from localStorage to prevent race conditions
      setToken(null);
      setIsAuthenticated(false);
      setDoctorProfile(null);
      setUserId(null);
      delete axios.defaults.headers.common["Authorization"];
      
      // Now remove from localStorage
      localStorage.removeItem("token");
      localStorage.removeItem("userRole");
      localStorage.removeItem("doctorProfile");
      localStorage.removeItem("doctorId");
      localStorage.removeItem("userData");
      localStorage.removeItem("userId");
    } catch (error) {
      console.error("Error clearing localStorage during logout:", error);
    }
    
    if (shouldNavigate) {
      console.log("DoctorContext - Logging out and navigating to login page");
      navigate("/doctor/login");
    }
    return Promise.resolve(); // Ensure this returns a resolved promise for the initialization
  }, [navigate]);
  
  // Set auth headers for axios when token changes
  useEffect(() => {
    console.log("DoctorContext - Token changed effect running, token exists:", !!token);
    if (token) {
      // Get the role and check if this is a doctor token
      const userRole = localStorage.getItem("userRole");
      console.log("DoctorContext - Role from localStorage:", userRole);
      
      // Only proceed with doctor-specific logic for doctor roles
      if (userRole === "Doctor") {
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        setIsAuthenticated(true);
        
        // Add redirection to doctor dashboard after successful authentication
        const currentPath = window.location.pathname;
        console.log("DoctorContext - Current path:", currentPath, "Token present, should redirect if on login page");
        
        if (currentPath.includes('login') || currentPath === '/') {
          console.log("DoctorContext - Redirecting to doctor dashboard after successful login");
          // Use history to avoid unmounting issues during navigation
          setTimeout(() => {
            try {
              // Check if token still exists before redirecting
              if (localStorage.getItem('token') && localStorage.getItem('userRole') === 'Doctor') {
                window.location.href = '/doctor/dashboard';
              }
            } catch (e) {
              console.error("Error during navigation:", e);
            }
          }, 500); // Longer delay to ensure other state updates complete
        }
      } else {
        console.log("DoctorContext - Token belongs to a non-doctor role, skipping doctor context actions");
        // Keep authentication state false for non-doctor roles
        setIsAuthenticated(false);
      }
    } else {
      delete axios.defaults.headers.common["Authorization"];
      setIsAuthenticated(false);
    }
  }, [token]);
  
  // Sync with AppContext token changes
  useEffect(() => {
    if (appToken && !token && localStorage.getItem("userRole") === "Doctor") {
      console.log("DoctorContext - Syncing token from AppContext");
      setToken(appToken);
      setIsAuthenticated(true);
    }
  }, [appToken, token]);
  
  // Initialize auth state on component mount
  useEffect(() => {
    // *** ADD ROLE CHECK HERE ***
    if (appUserRole && appUserRole.toLowerCase() !== 'doctor') {
      console.log("[DoctorContext] Role is not Doctor, skipping initialization.");
      // Clear doctor-specific state
      setToken(null);
      setIsAuthenticated(false);
      setDoctorProfile(null);
      setAppointments([]);
      setAvailability(null);
      setLoading(false);
      setAuthInitialized(true); // Mark as initialized even if skipped
      return;
    }

    // Proceed only if role is Doctor or not yet determined
    console.log("[DoctorContext] Running initial auth check effect.");
    const storedToken = localStorage.getItem('token'); // Check local storage as fallback
    const currentToken = appToken || storedToken;
    const storedUserRole = localStorage.getItem('userRole');

    if (currentToken && (storedUserRole === 'Doctor' || appUserRole === 'Doctor')) {
      console.log("[DoctorContext] Token found, validating...");
      if (validateToken(currentToken)) {
        console.log("[DoctorContext] Token valid, setting state.");
        setToken(currentToken);
        setIsAuthenticated(true);
        setupAxiosHeaders(currentToken);
        
        // Get doctor ID from localStorage or extract from token
        const doctorId = localStorage.getItem('doctorId') || localStorage.getItem('userId');
        
        if (doctorId) {
          console.log("[DoctorContext] Doctor ID found:", doctorId);
          setUserId(doctorId);
          localStorage.setItem('doctorId', doctorId);
          
          // Fetch doctor profile data
          getDoctorProfileData(doctorId).then(() => {
            // Check if we're on login page and redirect if needed
            const currentPath = window.location.pathname;
            if (currentPath === '/doctor/login' || currentPath === '/') {
              console.log("[DoctorContext] Redirecting to doctor dashboard");
              window.location.href = '/doctor/dashboard';
            }
          }).catch(error => {
            console.error("[DoctorContext] Error fetching doctor profile:", error);
          });
        } else {
          console.warn("[DoctorContext] No doctor ID found");
        }
      } else {
        console.warn("[DoctorContext] Initial token validation failed.");
        handleLogout(false);
      }
    } else {
      console.log("[DoctorContext] No token found initially or not a doctor role.");
      // Clear any potentially leftover state
      setToken(null);
      setIsAuthenticated(false);
    }
    setLoading(false);
    setAuthInitialized(true);
    console.log("[DoctorContext] Auth initialization complete.");

  }, [appToken, appUserRole, appUserData?.id, validateToken, setupAxiosHeaders, handleLogout]); 

  // Helper function to check if a string is in UUID format
  const isUuidFormat = (id) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  };

  // Helper to get doctor profile data by user id
  const getDoctorProfileData = useCallback(async (userId) => {
    try {
      console.log("[DoctorContext] Fetching doctor profile for user:", userId);
      
      // Check if userId is in UUID format
      const isUuid = isUuidFormat(userId);
      let response;
      
      if (isUuid) {
        // If it's a UUID, use the by-user-id endpoint with path parameter
        response = await axios.get(`${backendUrl}/api/Doctor/by-user-id/${userId}`);
      } else {
        // If it's a numeric ID, use query parameter
        response = await axios.get(`${backendUrl}/api/Doctor?userId=${userId}`);
      }
      
      if (response.data && response.data.id) {
        const doctorId = response.data.id;
        console.log("[DoctorContext] Found doctor ID:", doctorId);
        
        // Store doctor ID
        localStorage.setItem("doctorId", doctorId);
        
        // Now fetch complete profile
        const profileResponse = await axios.get(`${backendUrl}/api/Doctor/Profile/${doctorId}`);
        if (profileResponse.data) {
          setDoctorProfile(profileResponse.data);
          return profileResponse.data;
        }
      }
      return null;
    } catch (error) {
      console.error("[DoctorContext] Error fetching doctor profile:", error);
      
      // Check if the error is a 404 (doctor not found)
      if (error.response && error.response.status === 404) {
        console.warn("[DoctorContext] Doctor profile not found for user ID:", userId);
        // Try alternative endpoints if available
        try {
          // Try direct doctor ID if available
          const doctorId = localStorage.getItem("doctorId");
          if (doctorId) {
            console.log("[DoctorContext] Trying direct doctor ID:", doctorId);
            const altResponse = await axios.get(`${backendUrl}/api/Doctor/Profile/${doctorId}`);
            if (altResponse.data) {
              setDoctorProfile(altResponse.data);
              return altResponse.data;
            }
          }
        } catch (altError) {
          console.error("[DoctorContext] Alternative profile fetch also failed:", altError);
        }
      }
      
      return null;
    }
  }, [backendUrl]);

  // Define refreshAuthState function - called from login components
  const refreshAuthState = useCallback(async () => {
    console.log("DoctorContext - Refreshing auth state");
    try {
      // Get token and role from localStorage
      const storedToken = localStorage.getItem("token");
      const userRole = localStorage.getItem("userRole");
      
      if (storedToken && userRole === "Doctor") {
        setToken(storedToken);
        setIsAuthenticated(true);
        
        // Extract userId from token
        const userId = extractUserInfoFromToken(storedToken);
        
        // Set axios auth header
        axios.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;
        
        // Try to get the doctor profile if we have a userId
        if (userId) {
          try {
            await getDoctorProfile();
          } catch (profileError) {
            console.error("Error fetching doctor profile during refresh:", profileError);
            // Continue even if profile fetch fails
          }
        }
        
        return true;
      } else {
        console.log("DoctorContext - No valid token or role found during refresh");
        return false;
      }
    } catch (error) {
      console.error("Error refreshing auth state:", error);
      return false;
    }
  }, []);
  
  const extractUserInfoFromToken = useCallback((token) => {
    if (!token) return null;
    
    try {
      // JWT tokens have 3 parts: header.payload.signature
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.error("Invalid JWT token format");
        return null;
      }
      
      const payload = parts[1];
      // The payload is base64 encoded - handle padding correctly
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const decodedPayload = JSON.parse(
        decodeURIComponent(
          atob(base64)
            .split('')
            .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        )
      );
      
      console.log("Token data:", decodedPayload);
      
      // Look for the user ID in various common claim formats
      const extractedUserId = 
        decodedPayload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] || 
        decodedPayload.nameid || 
        decodedPayload.sub || 
        decodedPayload.userId;
      
      if (extractedUserId) {
        console.log("Extracted userId from token:", extractedUserId);
        setUserId(extractedUserId);
        
        // Save userId to localStorage for persistence
        try {
          localStorage.setItem("userId", extractedUserId);
        } catch (error) {
          console.error("Error saving userId to localStorage:", error);
        }
        
        return extractedUserId;
      }
    } catch (error) {
      console.error("Error extracting user info from token:", error);
    }
    return null;
  }, []);
  
  const getDoctorProfile = useCallback(async () => {
    if (!isAuthenticated || !token) return null;
    
    try {
      console.log("Fetching doctor profile...");
      
      // First, extract user ID directly from the token
      const userIdFromToken = extractUserInfoFromToken(token);
      
      if (!userIdFromToken) {
        console.error("Could not extract user ID from token");
        
        // Fallback to userId or localStorage
        let currentUserId = userId || localStorage.getItem("userId");
        if (!currentUserId) {
          console.error("No user ID available. Cannot fetch doctor profile.");
          toast.error("Could not determine user ID. Please log in again.");
          handleLogout();
          return null;
        }
        
        console.log("Using user ID from state/localStorage:", currentUserId);
      } else {
        console.log("Using user ID from token:", userIdFromToken);
      }
      
      // Use the user ID from token or fallback
      const currentUserId = userIdFromToken || userId || localStorage.getItem("userId");
      
      // Now try to get the doctor ID using the by-user-id endpoint
      let doctorId = null;
      try {
        console.log("Trying to fetch doctor by user ID:", currentUserId);
        
        // Check if userId is in UUID format
        const isUuid = isUuidFormat(currentUserId);
        let response;
        
        if (isUuid) {
          // If it's a UUID, use the by-user-id endpoint with path parameter
          response = await axios.get(`${backendUrl}/api/Doctor/by-user-id/${currentUserId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } else {
          // If it's a numeric ID, use query parameter
          response = await axios.get(`${backendUrl}/api/Doctor?userId=${currentUserId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
        }
        
        if (response.data && response.data.id) {
          doctorId = response.data.id;
          console.log("Retrieved doctor ID by user ID:", doctorId);
          // Save doctorId to localStorage for future use
          try {
            localStorage.setItem("doctorId", doctorId);
          } catch (error) {
            console.error("Error saving doctorId to localStorage:", error);
          }
        } else {
          console.error("Response from by-user-id endpoint did not contain doctor ID");
        }
      } catch (error) {
        console.error("[DoctorContext] Error fetching doctor by user ID:", error);
        
        // Check for 404 and display more informative message
        if (error.response && error.response.status === 404) {
          console.warn("[DoctorContext] Doctor profile not found for user ID:", currentUserId);
          // Don't show error toast for 404s on this endpoint
          
          // If this is a Doctor user, see if we can create a basic profile
          const userRole = localStorage.getItem("userRole");
          if (userRole === "Doctor") {
            // Create basic doctor profile from available user data
            const userEmail = localStorage.getItem("userEmail") || userIdFromToken;
            const firstName = localStorage.getItem("firstName") || "";
            const lastName = localStorage.getItem("lastName") || "";
            
            // Generate a temporary doctorId if needed
            if (!doctorId) {
              // Use userId as temporary doctorId for new doctors
              doctorId = currentUserId;
              localStorage.setItem("doctorId", doctorId);
              console.log("[DoctorContext] Trying direct doctor ID:", doctorId);
            }
            
            const basicProfile = {
              id: doctorId,
              userId: currentUserId,
              email: userEmail,
              firstName,
              lastName,
              profilePicture: null,
              profileCompleted: false
            };
            
            setDoctorProfile(basicProfile);
            console.log("[DoctorContext] Created basic doctor profile:", basicProfile);
            
            // Show info notification instead of error
            toast.info("Please complete your doctor profile to continue", { autoClose: 5000 });
            
            return basicProfile;
          }
        } else {
          // For other errors, continue with the existing logic
          toast.error("Error retrieving doctor information. Please try again.");
        }
        
        // Fallback to using doctorId from localStorage if that fails
        doctorId = localStorage.getItem("doctorId");
        if (doctorId) {
          console.log("Falling back to doctorId from localStorage:", doctorId);
        }
      }
      
      // If still no doctorId and user is a Doctor, this is a problem
      // If user is not a Doctor, this is expected
      if (!doctorId) {
        // Check if user is actually supposed to be a doctor
        const userRole = localStorage.getItem("userRole");
        if (userRole === "Doctor") {
          console.error("Doctor ID not found for a user with Doctor role");
          
          // Last resort: use userId as doctorId for first-time login
          doctorId = currentUserId;
          localStorage.setItem("doctorId", doctorId);
          console.log("[DoctorContext] Using userId as temporary doctorId:", doctorId);
          
          // Create and return a basic profile
          const basicProfile = {
            id: doctorId,
            userId: currentUserId,
            email: localStorage.getItem("userEmail") || "",
            firstName: localStorage.getItem("firstName") || "",
            lastName: localStorage.getItem("lastName") || "",
            profilePicture: null,
            profileCompleted: false
          };
          
          setDoctorProfile(basicProfile);
          return basicProfile;
        } else {
          console.log("No doctor ID found, but user is not a doctor so this is expected");
        }
        return null;
      }
      
      // Now actually fetch the doctor profile
      try {
        const response = await axios.get(`${backendUrl}/api/Doctor/Profile/${doctorId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data) {
          setDoctorProfile(response.data);
          // Save profile to localStorage for faster access
          try {
            localStorage.setItem("doctorProfile", JSON.stringify(response.data));
          } catch (error) {
            console.error("Error saving doctor profile to localStorage:", error);
          }
          return response.data;
        }
      } catch (profileError) {
        console.error("Error fetching doctor profile:", profileError);
        
        // Handle 404 errors specially - this could be a new doctor account
        if (profileError.response?.status === 404) {
          console.warn("Doctor profile not found (404) - this might be expected for new doctors");
          
          // Create a basic doctor profile using available user data
          const userEmail = localStorage.getItem("userEmail");
          const firstName = localStorage.getItem("firstName") || "";
          const lastName = localStorage.getItem("lastName") || "";
          
          const basicProfile = {
            id: doctorId,
            userId: currentUserId,
            email: userEmail,
            firstName: firstName,
            lastName: lastName,
            profilePicture: null,
            // Add other required fields with default values
            profileCompleted: false
          };
          
          setDoctorProfile(basicProfile);
          console.log("Created basic doctor profile for new doctor:", basicProfile);
          
          // Show info notification instead of error
          toast.info("Please complete your doctor profile to continue", { autoClose: 5000 });
          
          return basicProfile;
        }
        
        // Handle other errors normally
        if (profileError.response?.status === 401) {
          handleLogout();
        } else {
          toast.error(profileError.response?.data?.message || "Failed to load doctor profile");
        }
      }
      
      return null;
    } catch (error) {
      console.error("Error in getDoctorProfile:", error);
      return null;
    }
  }, [backendUrl, token, isAuthenticated, userId, handleLogout, extractUserInfoFromToken]);
  
  const getAppointments = useCallback(async () => {
    if (!isAuthenticated || !token) return [];
    
    try {
      setLoading(true);
      
      // Get doctor ID from localStorage or profile
      const doctorId = localStorage.getItem("doctorId") || (doctorProfile && doctorProfile.id);
      
      if (!doctorId) {
        console.error("No doctor ID available");
        return [];
      }
      
      // Use the correct endpoint for getting doctor appointments
      const response = await axios.get(`${backendUrl}/api/Doctor/get-appointment-from-doctor/${doctorId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        // The backend returns appointments in the correct format
        setAppointments(response.data);
        return response.data;
      }
      return [];
    } catch (error) {
      console.error("Error fetching appointments:", error);
      if (error.response?.status === 400) {
        toast.error("Invalid doctor ID");
      } else if (error.response?.status === 404) {
        toast.error("No appointments found");
      } else if (error.response?.status === 401) {
        handleLogout();
      } else {
        toast.error("Failed to fetch appointments");
      }
      return [];
    } finally {
      setLoading(false);
    }
  }, [token, backendUrl, isAuthenticated, doctorProfile, handleLogout]);
  
  const updateAppointmentStatus = async (appointmentId, status) => {
    if (!isAuthenticated || !token) return false;
    
    try {
      let endpoint;
      let method;
      let requestData = {};
      
      // Format the request based on status type
      switch (status.toLowerCase()) {
        case 'confirmed':
        endpoint = `${backendUrl}/api/Appointment/confirm/${appointmentId}`;
          method = 'post';
          break;
        case 'cancelled':
        endpoint = `${backendUrl}/api/Appointment/cancel/${appointmentId}`;
          method = 'post';
          break;
        case 'completed':
          endpoint = `${backendUrl}/api/Appointment/complete/${appointmentId}`;
          method = 'post';
          break;
        default:
        endpoint = `${backendUrl}/api/Appointment/${appointmentId}`;
          method = 'put';
          requestData = {
            id: appointmentId,
            status: status
          };
      }
      
      const response = await axios({
        method: method,
        url: endpoint,
        data: requestData,
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data) {
        // Refresh appointments data
        await getAppointments();
        toast.success(`Appointment ${status.toLowerCase()} successfully`);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error updating appointment status:", error);
      
      if (error.response) {
        if (error.response.status === 401) {
        handleLogout();
        } else if (error.response.status === 400) {
          const errorMessage = error.response.data?.message || 
                             error.response.data?.title ||
                             Object.values(error.response.data?.errors || {}).flat().join(", ") ||
                             `Failed to ${status.toLowerCase()} appointment`;
          toast.error(errorMessage);
        } else if (error.response.status === 404) {
          toast.error("Appointment not found");
      } else {
          toast.error(`Failed to ${status.toLowerCase()} appointment`);
        }
      } else {
        toast.error(`Failed to ${status.toLowerCase()} appointment. Please check your connection.`);
      }
      return false;
    }
  };

  // Function to get a specific appointment by ID
  const getAppointmentById = async (appointmentId) => {
    if (!isAuthenticated || !token) return null;
    
    try {
      const response = await axios.get(`${backendUrl}/api/Appointment/${appointmentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error("Error fetching appointment details:", error);
      toast.error("Failed to fetch appointment details");
      return null;
    }
  };

  // Function to create a new appointment
  const createAppointment = async (appointmentData) => {
    if (!isAuthenticated || !token) return false;
    
    try {
      const response = await axios.post(
        `${backendUrl}/api/Appointment`, 
        appointmentData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data) {
        toast.success("Appointment created successfully");
        // Refresh appointments list
        getAppointments();
        return response.data;
      }
      return null;
    } catch (error) {
      console.error("Error creating appointment:", error);
      toast.error(error.response?.data?.message || "Failed to create appointment");
      return null;
    }
  };

  // Function to update an appointment
  const updateAppointment = async (appointmentId, appointmentData) => {
    if (!isAuthenticated || !token) return false;
    
    try {
      const response = await axios.put(
        `${backendUrl}/api/Appointment/${appointmentId}`,
        appointmentData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data) {
        toast.success("Appointment updated successfully");
        // Refresh appointments list
        getAppointments();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error updating appointment:", error);
      toast.error(error.response?.data?.message || "Failed to update appointment");
      return false;
    }
  };

  const getDoctorDashboard = useCallback(async () => {
    if (!isAuthenticated || !token) return null;
    
    let doctorId;
    try {
      doctorId = localStorage.getItem("doctorId") || (doctorProfile && doctorProfile.id);
    } catch (error) {
      console.error("Error accessing localStorage for doctorId:", error);
      doctorId = doctorProfile && doctorProfile.id;
    }
    
    if (!doctorId) {
      console.error("No doctor ID available for fetching dashboard");
      return null;
    }
    
    try {
      // Use the correct endpoint for doctor dashboard
      const response = await axios.get(`${backendUrl}/api/Doctor/doctor/dashboard/${doctorId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        const dashboardData = {
          totalAppointments: response.data.totalAppointments,
          todaysAppointments: response.data.todaysAppointments,
          completedAppointments: response.data.completedAppointments,
          latestAppointment: response.data.latestAppointment
        };
        setDashboardData(dashboardData);
        return dashboardData;
        }
        return null;
    } catch (error) {
      console.error("Error fetching doctor dashboard:", error);
      if (error.response?.status === 404) {
        toast.error("Doctor not found");
      } else if (error.response?.status === 401) {
          handleLogout();
        } else {
        toast.error("Failed to fetch dashboard data");
        }
        return null;
    }
  }, [token, backendUrl, isAuthenticated, doctorProfile, handleLogout]);
  
  const getDoctorAvailability = useCallback(async () => {
    if (!isAuthenticated || !token) return [];
    
    let doctorId;
    try {
      doctorId = localStorage.getItem("doctorId") || (doctorProfile && doctorProfile.id);
    } catch (error) {
      console.error("Error accessing localStorage for doctorId:", error);
      doctorId = doctorProfile && doctorProfile.id;
    }
    
    if (!doctorId) {
      console.error("No doctor ID available for fetching availability");
      return [];
    }
    
    try {
      const response = await axios.get(`${backendUrl}/api/Doctor/availability/${doctorId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        setAvailability(response.data);
        return response.data;
      }
      return [];
    } catch (error) {
      console.error("Error fetching doctor availability:", error);
      if (error.response?.status === 401) {
        handleLogout();
      } else {
        toast.error(error.response?.data?.message || "Failed to fetch availability");
      }
      return [];
    }
  }, [token, backendUrl, isAuthenticated, doctorProfile, handleLogout]);
  
  const updateDoctorAvailability = async (availabilityData) => {
    if (!isAuthenticated || !token) return false;
    
    let doctorId;
    try {
      doctorId = localStorage.getItem("doctorId") || (doctorProfile && doctorProfile.id);
    } catch (error) {
      console.error("Error accessing localStorage for doctorId:", error);
      doctorId = doctorProfile && doctorProfile.id;
    }
    
    if (!doctorId) {
      console.error("No doctor ID available for updating availability");
      toast.error("Doctor ID not found. Please log in again.");
      return false;
    }
    
    try {
      const response = await axios.put(
        `${backendUrl}/api/Doctor/availability/${doctorId}`,
        availabilityData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data) {
        setAvailability(response.data);
        toast.success("Availability updated successfully");
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error updating doctor availability:", error);
      if (error.response?.status === 401) {
        handleLogout();
      } else {
        toast.error(error.response?.data?.message || "Failed to update availability");
      }
      return false;
    }
  };

  // Function to update only the doctor's profile picture
  const updateDoctorProfilePicture = async (pictureFile) => {
    if (!isAuthenticated || !token) return false;
    
    try {
      // Get the doctor ID
      let doctorId = localStorage.getItem("doctorId");
      if (!doctorId && doctorProfile) {
        doctorId = doctorProfile.id;
      }
      
      if (!doctorId) {
        doctorId = 1; // Fallback to ID 1 if we can't find it
        console.log("Using fallback doctor ID:", doctorId);
      } else {
        console.log("Using doctor ID for picture update:", doctorId);
      }

      if (!pictureFile) {
        console.error("No profile picture file provided");
        toast.error("No profile picture selected.");
        return false;
      }

      // Create FormData specifically for the profile picture update
      const formData = new FormData();
      formData.append("ProfilePictureFile", pictureFile);
      
      console.log("Sending profile picture update to:", 
        `${backendUrl}/api/Doctor/update-doctor-profile-picture/${doctorId}`);
      
      // Use the specific endpoint for updating the profile picture
      const response = await axios.put(
        `${backendUrl}/api/Doctor/update-doctor-profile-picture/${doctorId}`,
        formData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          } 
        }
      );
      
      if (response.data) {
        console.log("Profile picture update response:", response.data);
        
        // Update the profile with the returned data
        if (response.data.doctor) {
          setDoctorProfile(response.data.doctor);
          try {
            localStorage.setItem("doctorProfile", JSON.stringify(response.data.doctor));
          } catch (error) {
            console.error("Error saving updated profile to localStorage:", error);
          }
        }
        
        toast.success(response.data.message || "Profile picture updated successfully");
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Error updating doctor profile picture:", error);
      
      if (error.response) {
        console.error("Error response data:", error.response.data);
        
        // Display specific error message if available
        toast.error(error.response.data?.message || "Failed to update profile picture");
      } else {
        toast.error("Failed to update profile picture. Please try again.");
      }
      
      return false;
    }
  };

  // Add new functions for appointment management
  const getAvailableSlots = async (date) => {
    if (!isAuthenticated || !token) return [];
    
    // Need doctorId for checking availability
    let doctorId;
    try {
      doctorId = localStorage.getItem("doctorId") || (doctorProfile && doctorProfile.id);
    } catch (error) {
      console.error("Error accessing localStorage for doctorId:", error);
      doctorId = doctorProfile && doctorProfile.id;
    }
    
    if (!doctorId) {
      console.error("No doctor ID available for fetching available slots");
      return [];
    }
    
    try {
      const response = await axios.get(`${backendUrl}/api/Appointment/available-slots`, {
        params: { doctorId, date },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error("Error fetching available slots:", error);
      toast.error("Failed to fetch available slots. Please try again.");
      return [];
    }
  };
  
  const checkAppointmentAvailability = async (appointmentData) => {
    if (!isAuthenticated || !token) return { available: false };
    
    try {
      const response = await axios.get(`${backendUrl}/api/Appointment/check-availability`, {
        params: appointmentData,
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        return response.data;
      }
      return { available: false };
    } catch (error) {
      console.error("Error checking appointment availability:", error);
      toast.error("Failed to check appointment availability. Please try again.");
      return { available: false };
    }
  };

  const updateDoctorProfile = async (profileData) => {
    if (!isAuthenticated || !token) return false;
    
    try {
      console.log("Starting doctor profile update process");
      
      // Get the doctor ID
      let doctorId = localStorage.getItem("doctorId");
      if (!doctorId && doctorProfile) {
        doctorId = doctorProfile.id;
      }
      
      if (!doctorId) {
        doctorId = 1; // Fallback to ID 1 if we can't find it
        console.log("Using fallback doctor ID:", doctorId);
      } else {
        console.log("Using doctor ID:", doctorId);
      }
      
      // Ensure profileData is FormData - backend uses [FromForm] attribute
      let formData;
      if (profileData instanceof FormData) {
        formData = profileData;
        
        // No longer removing ProfilePicture and ProfilePictureFile fields as they are required
        // by the backend validation. Instead, ensure they are included in the API calls
      } else {
        // Convert object to FormData if needed
        formData = new FormData();
        Object.keys(profileData).forEach(key => {
          // No longer excluding ProfilePicture and ProfilePictureFile fields
          if (profileData[key] !== null && profileData[key] !== undefined) {
            formData.append(key, profileData[key]);
          }
        });
      }
      
      console.log("Sending form data to:", `${backendUrl}/api/Doctor/update-doctor-profile/${doctorId}`);
      
      // Use multipart/form-data content type for FormData
      const response = await axios.put(
        `${backendUrl}/api/Doctor/update-doctor-profile/${doctorId}`,
        formData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          } 
        }
      );
      
      if (response.data) {
        console.log("Profile update successful:", response.data);
        
        // Update local state with response data
        if (response.data.doctor) {
          setDoctorProfile(response.data.doctor);
          try {
            localStorage.setItem("doctorProfile", JSON.stringify(response.data.doctor));
          } catch (storageError) {
            console.error("Error saving profile to localStorage:", storageError);
          }
        } else if (typeof response.data === 'object') {
          setDoctorProfile(response.data);
          try {
            localStorage.setItem("doctorProfile", JSON.stringify(response.data));
          } catch (storageError) {
            console.error("Error saving profile to localStorage:", storageError);
          }
        } else {
          // If response doesn't contain doctor data, fetch the profile again
          try {
            const profileResponse = await axios.get(`${backendUrl}/api/Doctor/Profile/${doctorId}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            if (profileResponse.data) {
              setDoctorProfile(profileResponse.data);
              localStorage.setItem("doctorProfile", JSON.stringify(profileResponse.data));
            }
          } catch (fetchError) {
            console.error("Error fetching updated profile:", fetchError);
          }
        }
        
        toast.success(response.data.message || "Profile updated successfully");
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Error updating doctor profile:", error);
      
      // Detailed error logging
      if (error.response) {
        console.error("Error response data:", error.response.data);
        console.error("Error response status:", error.response.status);
        console.error("Error response headers:", error.response.headers);
        
        if (error.response.data && error.response.data.errors) {
          console.error("Validation errors:", error.response.data.errors);
          
          const errorMessages = Object.values(error.response.data.errors)
            .flat()
            .join(", ");
          
          if (errorMessages) {
            toast.error(`Validation errors: ${errorMessages}`);
          } else {
            toast.error(error.response.data.title || "Validation failed");
          }
        } else {
          toast.error(error.response.data?.message || error.response.data?.title || "Failed to update profile");
        }
      } else {
        toast.error("Failed to update profile. Please try again.");
      }
      
      return false;
    }
  };

  const value = {
    loading,
    isAuthenticated,
    doctorProfile,
    token,
    setToken,
    appointments,
    availability,
    dashboardData,
    userId,
    backendUrl,
    handleLogout,
    getDoctorProfile,
    refreshAuthState,
    extractUserInfoFromToken,
    getAppointments,
    getAppointmentById,
    createAppointment,
    updateAppointment,
    updateAppointmentStatus,
    updateDoctorProfile,
    getDoctorDashboard,
    getDoctorAvailability,
    updateDoctorAvailability,
    getAvailableSlots,
    checkAppointmentAvailability,
    updateDoctorProfilePicture
  }

  return (
    <DoctorContext.Provider value={value}>
      {props.children}
    </DoctorContext.Provider>
  )
}

export default DoctorContextProvider;
export { DoctorContextProvider };