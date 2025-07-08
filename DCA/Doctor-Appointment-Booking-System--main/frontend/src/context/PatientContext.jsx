import { createContext, useState, useEffect, useCallback, useContext, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { AppContext } from "./AppContext";

export const PatientContext = createContext();

export const PatientContextProvider = (props) => {
  const navigate = useNavigate();
  const { userData: appUserData, token: appToken, userRole: appUserRole } = useContext(AppContext);
  
  const [token, setToken] = useState(() => {
    try {
      const storedToken = localStorage.getItem('token');
      const storedUserRole = localStorage.getItem('userRole');
      if (storedToken && storedUserRole?.toLowerCase() === 'patient') {
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        return storedToken;
      }
    } catch (error) {
      console.error("Error accessing localStorage:", error);
    }
    return null;
  });
  
  const [user, setUser] = useState(null);
  const [patientProfile, setPatientProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      const storedToken = localStorage.getItem('token');
      const storedUserRole = localStorage.getItem('userRole');
      return !!(storedToken && storedUserRole?.toLowerCase() === 'patient');
    } catch (error) {
      console.error("Error checking authentication:", error);
      return false;
    }
  });

  const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5109";

  // Add debug logging function at the beginning of the component
  const logDebug = useCallback((message, data = null) => {
    console.log(`[PatientContext] ${message}`, data || '');
  }, []);

  // Update the parseJwt function with more robust parsing
  const parseJwt = (token) => {
    try {
    if (!token) {
        console.warn('[PatientContext] Cannot parse empty token');
      return null;
    }

      // Split the token and get the payload part
      const base64Url = token.split('.')[1];
      if (!base64Url) {
        console.warn('[PatientContext] Invalid token format - missing payload');
        return null;
      }

      // Replace characters and decode
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );

      // Parse the JSON payload
      const decoded = JSON.parse(jsonPayload);
      
      // Extract userId using various possible formats
      const userId = decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
                    decoded.sub ||
                    decoded.userId ||
                    decoded.UserId;
      
      // Log the token contents for debugging (without sensitive data)
      const debugInfo = {
        exp: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : 'none',
        hasNameId: !!decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'],
        nameId: decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'],
        hasSub: !!decoded.sub,
        hasUserId: !!decoded.userId || !!decoded.UserId,
        roles: decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || 
              decoded.role || 
              decoded.Role || 
              'none',
        extractedUserId: userId
      };
      
      console.log('[PatientContext] Token parsed successfully:', debugInfo);
      console.log('[PatientContext] Full token payload:', decoded);
      
      return decoded;
    } catch (error) {
      console.error('[PatientContext] Error parsing token:', error);
      return null;
    }
  };

  // Update the token validation function with more comprehensive checks
  const validateToken = (token) => {
    try {
    if (!token) {
        console.log('[PatientContext] No token provided for validation');
      return false;
    }

      const decoded = parseJwt(token);
      if (!decoded) {
        console.log('[PatientContext] Could not decode token');
        return false;
      }

      // Extract claims using various possible formats
      const role = decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || 
                  decoded['role'] || 
                  decoded['Role'];

      const userId = decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
                    decoded['sub'] ||
                    decoded['userId'] ||
                    decoded['UserId'];

      const exp = decoded['exp'];

      // Log the extracted values for debugging
      console.log('[PatientContext] Token validation:', {
        hasRole: !!role,
        role: role,
        hasUserId: !!userId,
        expirationTime: exp ? new Date(exp * 1000).toISOString() : 'none'
      });

      // Check expiration
      if (exp) {
        const currentTime = Math.floor(Date.now() / 1000);
        if (currentTime >= exp) {
          console.log('[PatientContext] Token has expired');
          return false;
        }
      }

      // Verify role (case-insensitive)
      // Handle both string and array formats for role
      let isPatient = false;
      if (Array.isArray(role)) {
        isPatient = role.some(r => typeof r === 'string' && r.toLowerCase() === 'patient');
      } else {
        isPatient = typeof role === 'string' && role.toLowerCase() === 'patient';
      }

      if (!role || !isPatient) {
        console.log('[PatientContext] Token is not for a patient role:', role);
        return false;
      }

      // Verify user ID exists
      if (!userId) {
        console.log('[PatientContext] Token missing user ID');
        return false;
      }

      console.log('[PatientContext] Token validation successful');
      return true;
    } catch (error) {
      console.error('[PatientContext] Token validation error:', error);
      return false;
    }
  };

  // Update the token recovery logic with better error handling
  const recoverToken = () => {
    try {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        console.log('[PatientContext] No token found in localStorage');
        return null;
      }

      // Check stored role first
      const storedRole = localStorage.getItem('userRole');
      if (!storedRole || storedRole.toLowerCase() !== 'patient') {
        console.log('[PatientContext] Stored role is not patient:', storedRole);
        return null;
      }

      if (!validateToken(storedToken)) {
        console.log('[PatientContext] Stored token is invalid, clearing...');
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        return null;
      }

      console.log('[PatientContext] Successfully recovered valid token');
      return storedToken;
    } catch (error) {
      console.error('[PatientContext] Token recovery error:', error);
      return null;
    }
  };

  // Update the useEffect for token initialization
  useEffect(() => {
    if (appUserRole && appUserRole.toLowerCase() !== 'patient') {
      console.log("[PatientContext] Role is not Patient, skipping initialization.");
      setToken(null);
      setIsAuthenticated(false);
      setUser(null);
      setPatientProfile(null);
      setAppointments([]);
      setLoading(false); 
      setAuthInitialized(true);
      return; 
    }
    
    const initializeToken = () => {
      console.log('[PatientContext] Initializing token...');
      
      // First check context token
      if (token && validateToken(token)) {
        console.log('[PatientContext] Using valid token from context');
        return;
      }

      // Try to recover from localStorage
      const recoveredToken = recoverToken();
      if (recoveredToken) {
        console.log('[PatientContext] Recovered valid token from localStorage');
        setToken(recoveredToken);
        return;
      }

      // No valid token found
      console.log('[PatientContext] No valid token found');
      setToken(null);
    };

    initializeToken();
  }, [appUserRole]);

  // Setup axios default headers - must be defined BEFORE the useEffects that use it
  const setupAxiosHeaders = useCallback((token) => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, []);

  // Update handleLogout to use window.location.href for more reliable navigation
  const handleLogout = useCallback((redirect = true) => {
    try {
      logDebug('Performing logout', { redirect });
      
      // Clear all localStorage items related to authentication
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userId');
      localStorage.removeItem('patientId');
      localStorage.removeItem('userData');
      
      // Clear state
      setToken(null);
      setIsAuthenticated(false);
      setUser(null);
      setPatientProfile(null);
      
      // Clear authorization header
      delete axios.defaults.headers.common['Authorization'];
      
      if (redirect) {
        logDebug('Redirecting to login page');
        // Use direct location change for more reliable navigation
        setTimeout(() => {
          window.location.href = '/login';
        }, 300);
      }
    } catch (error) {
      console.error("Logout error:", error);
      if (redirect) {
        toast.error("Error during logout. Please try again.");
      }
    }
  }, [logDebug]);

  // Get patient by user ID - define this before useEffects that use it
  const getPatientByUserId = useCallback(async (userId) => {
    if (!userId) {
      console.error("Cannot fetch patient profile: userId is missing");
      return null;
    }
    
    // Check if we already have the profile for this user to prevent unnecessary fetches
    if (patientProfile && patientProfile.userId === userId) {
      console.log("Already have patient profile for user ID:", userId);
      return patientProfile;
    }
    
    // Get the most up-to-date token from various sources
    const currentToken = token || appToken || localStorage.getItem('token');
    
    if (!currentToken) {
      console.error("Cannot fetch patient profile: token is missing");
      return null;
    }
    
    console.log("Attempting to fetch patient profile for user ID:", userId);
    
    try {
      // Explicitly set the Authorization header for this request
      const response = await axios.get(`${backendUrl}/api/Patient/by-user-id/${userId}`, {
        headers: { 
          'Authorization': `Bearer ${currentToken}`,
          'Cache-Control': 'no-cache'
        }
      });
      
      if (response.data) {
        console.log("Successfully fetched patient profile:", response.data);
        
        // Store patient ID in localStorage for future use
        if (response.data.id) {
        localStorage.setItem('patientId', response.data.id);
        }
        
        // Update state with patient profile
        setPatientProfile(response.data);
        setUser({
          id: response.data.applicationUserId || userId,
          firstName: response.data.firstName,
          lastName: response.data.lastName,
          email: response.data.email,
          profilePicture: response.data.profilePicture
          });
        
        return response.data;
      }
      
      console.warn("Patient profile API returned empty data");
      return null;
    } catch (error) {
      console.error("Error fetching patient profile:", error);
      
      if (error.response) {
        console.error("Error response:", error.response.status, error.response.data);
        
        // Handle unauthorized error
        if (error.response.status === 401) {
          console.warn("Unauthorized access to patient profile, logging out");
          handleLogout(false);
        }
      }
      
      return null;
    }
  }, [token, appToken, backendUrl, patientProfile, setPatientProfile, setUser, handleLogout]);

  // Get patient appointments
  const getPatientAppointments = useCallback(async (patientId) => {
    if (!isAuthenticated || !patientId) return [];
    
    try {
      const response = await axios.get(`${backendUrl}/api/Patient/appointments/${patientId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        setAppointments(response.data);
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Appointments fetch error:', error);
      if (error.response?.status === 401) {
        handleLogout();
      }
      toast.error(error.response?.data?.message || 'Error fetching appointments');
      return [];
    }
  }, [token, backendUrl, isAuthenticated, handleLogout]);

  // Add a navigation lock mechanism
  const navigationLock = useRef(false);
  const lastTokenSync = useRef(null);
  const syncTimeout = useRef(null);

  // Consolidated token sync function
  const synchronizeToken = useCallback((newToken, source = 'unknown') => {
    // Prevent multiple syncs within 1 second
    const now = Date.now();
    if (lastTokenSync.current && (now - lastTokenSync.current) < 1000) {
      return;
    }
    
    // Skip if token is the same as current one
    if (newToken === token) {
      return;
    }
    
    lastTokenSync.current = now;
    logDebug(`Token sync requested from ${source}`);

    if (!newToken) {
      logDebug('No token provided for sync');
      return;
    }

    const tokenData = parseJwt(newToken);
    if (!tokenData) {
      logDebug('Invalid token or non-patient token');
      return;
    }

    setToken(newToken);
    setIsAuthenticated(true);
    setupAxiosHeaders(newToken);
  }, [parseJwt, setupAxiosHeaders, logDebug, token]);

  // Update AppContext sync effect
  useEffect(() => {
    if (appUserRole && appUserRole.toLowerCase() !== 'patient') return;
    
    if (!appUserData?.id) return;
    
    // Clear any pending sync
    if (syncTimeout.current) {
      clearTimeout(syncTimeout.current);
    }

    syncTimeout.current = setTimeout(async () => {
      if (navigationLock.current) return;
      
      try {
        navigationLock.current = true;
        const currentToken = token || appToken || localStorage.getItem('token');
        
        // Only fetch profile if we don't have it yet or if user ID changed
        if (currentToken && (!patientProfile || patientProfile.userId !== appUserData.id)) {
          synchronizeToken(currentToken, 'AppContext sync');
          await getPatientByUserId(appUserData.id);
        }
      } finally {
        navigationLock.current = false;
      }
    }, 300); // Debounce sync operations

    return () => {
      if (syncTimeout.current) {
        clearTimeout(syncTimeout.current);
      }
    };
  }, [appUserData?.id, appUserRole]);

  // Update navigation effect
  useEffect(() => {
    if (!isAuthenticated || !token || navigationLock.current) return;

    const currentPath = window.location.pathname;
    const isLoginPage = currentPath === '/login' || currentPath === '/';
    const isDoctorPath = currentPath.includes('/doctor/');
    const isAdminPath = currentPath.includes('/admin/');

    if (isLoginPage && !isDoctorPath && !isAdminPath) {
      navigationLock.current = true;
      
      // Use RAF to ensure smooth navigation
      requestAnimationFrame(() => {
        navigate('/home', { replace: true });
        
        // Release navigation lock after navigation
        setTimeout(() => {
          navigationLock.current = false;
        }, 500);
      });
    }
  }, [isAuthenticated, token, navigate]);

  // Sync with AppContext's userData when it changes
  useEffect(() => {
    const syncUserData = async () => {
      if (appUserRole && appUserRole.toLowerCase() !== 'patient') return;
      
      if (!appUserData?.id) return;
      
      // Prevent multiple syncs for the same user and if we already have the profile
      if (patientProfile?.userId === appUserData.id) return;
      
      const currentToken = token || appToken || localStorage.getItem('token');
      if (!currentToken) return;

      try {
        console.log("PatientContext.jsx:297 Syncing profile for user ID:", appUserData.id);
        const patientData = await getPatientByUserId(appUserData.id);
        
        // Update AppContext's userData with patient profile data to ensure it's displayed in navbar/sidebar
        if (patientData && setUser) {
          const updatedUserData = {
            ...appUserData,
            firstName: patientData.firstName || patientData.FirstName,
            lastName: patientData.lastName || patientData.LastName,
            profilePicture: patientData.profilePicture || patientData.ProfilePicture,
            email: patientData.email || patientData.Email
          };
          setUser(updatedUserData);
          
          // Update global userData in AppContext if possible
          if (window.updateGlobalUserData) {
            window.updateGlobalUserData(updatedUserData);
          }
        }
      } catch (error) {
        console.error("Error fetching patient profile during sync:", error);
      }
    };
    
    if (authInitialized) {
      syncUserData();
    }
  }, [appUserData?.id, appUserRole, authInitialized]);

  // Add diagnostic check when AppContext token changes
  useEffect(() => {
    if (appToken && !token && appToken !== token) {
      logDebug('Received token from AppContext, analyzing...', { tokenExists: !!appToken });
      
      // Try to parse the token to check if it's valid for patients
      const tokenData = parseJwt(appToken);
      if (tokenData) {
        // Check if the token role matches patient
        const role = tokenData["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || 
                  tokenData['role'] || 
                  tokenData['Role'];
                  
        if (role && role.toLowerCase() === 'patient') {
          logDebug('Token valid for patient context, updating state');
          setToken(appToken);
          setIsAuthenticated(true);
        } else {
          logDebug('Token not for patient role, ignoring');
        }
      } else {
        logDebug('Token not valid for patient context, ignoring');
      }
    }
  }, [appToken, token, logDebug, parseJwt]);

  // Update the initial authentication check
  useEffect(() => {
    if (appUserRole && appUserRole.toLowerCase() !== 'patient') {
        setLoading(false);
        setAuthInitialized(true);
        return;
    }

    if (authInitialized) return; 
    
    const checkAuthentication = async () => {
      logDebug('Initializing authentication check');
      try {
        // Get token from multiple sources
        const storedToken = token || appToken || localStorage.getItem('token');
        const storedUserRole = localStorage.getItem('userRole');
        
        if (storedToken && storedUserRole?.toLowerCase() === 'patient') {
          // Validate the token is actually for a patient
          const isValid = validateToken(storedToken);
          
          if (isValid) {
          const tokenData = parseJwt(storedToken);
          
            // Extract userId from token claims using various possible formats
            const userId = tokenData['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
                          tokenData['sub'] ||
                          tokenData['userId'] ||
                          tokenData['UserId'] ||
                          localStorage.getItem('userId');
            
            // If we still don't have a userId, try to extract it from other claims
            let extractedUserId = userId;
            if (!extractedUserId) {
              // Log all available claims for debugging
              console.log('[PatientContext] All token claims:', tokenData);
              
              // Try to find any claim that might contain a user ID
              for (const key in tokenData) {
                if (key.toLowerCase().includes('id') || key.toLowerCase().includes('user')) {
                  console.log(`[PatientContext] Potential userId found in claim '${key}':`, tokenData[key]);
                  extractedUserId = tokenData[key];
                  break;
                }
              }
            }
            
            // Store userId in localStorage if found
            if (extractedUserId) {
              localStorage.setItem('userId', extractedUserId);
              logDebug('Valid patient token found during init', { userId: extractedUserId });
            
            // Set state and headers
            setToken(storedToken);
            setIsAuthenticated(true);
            setupAxiosHeaders(storedToken);
            
            // Try to get patient profile
            try {
                // Check if we already have a patientId in localStorage
                let patientId = localStorage.getItem('patientId');
                
                // If we don't have a patientId, try to get it from the API
                if (!patientId) {
                  const patientResponse = await getPatientByUserId(extractedUserId);
                  if (patientResponse && patientResponse.id) {
                    patientId = patientResponse.id;
                    localStorage.setItem('patientId', patientId);
                    console.log('[PatientContext] Retrieved patientId:', patientId);
                  }
                } else {
                  console.log('[PatientContext] Using stored patientId:', patientId);
                  // Still fetch the profile to update state
                  await getPatientByUserId(extractedUserId);
                }
                
                // Force a navigation to the home page if we're on the login page
                const currentPath = window.location.pathname;
                if (currentPath === '/login' || currentPath === '/') {
                  console.log('[PatientContext] Redirecting to patient home page');
                  window.location.href = '/home';
                }
            } catch (error) {
                console.error('[PatientContext] Failed to get patient profile during init:', error);
              // Continue even if profile fetch fails
            }
          } else {
              console.error('[PatientContext] Cannot fetch patient profile: userId not found in token');
              handleLogout(false);
            }
          } else {
            logDebug('Token validation failed during init', { hasTokenData: !!parseJwt(storedToken) });
            handleLogout(false);
          }
        } else {
          logDebug('No valid patient token found during init', { 
            hasToken: !!storedToken, 
            role: storedUserRole 
          });
          // Clear patient-specific state without redirecting
          setToken(null);
          setIsAuthenticated(false);
          setUser(null);
          setPatientProfile(null);
        }
      } catch (error) {
        console.error('[PatientContext] Authentication check error:', error);
      } finally {
        setLoading(false);
        setAuthInitialized(true);
        logDebug('Authentication initialization complete');
      }
    };

    checkAuthentication();
  }, [token, appToken, setupAxiosHeaders, parseJwt, getPatientByUserId, handleLogout, logDebug]);

  // Check token expiration periodically
  useEffect(() => {
    if (!token) return;
    
    const checkTokenInterval = setInterval(() => {
      const valid = validateToken(token);
      
      if (!valid) {
        console.warn("Patient token expired, logging out");
        handleLogout();
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(checkTokenInterval);
  }, [token, validateToken]);

  // Setup security headers for all requests
  useEffect(() => {
    // Add security headers to all axios requests
    const requestInterceptor = axios.interceptors.request.use(
      config => {
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
        
        // Prevent caching of sensitive data
        config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
        config.headers['Pragma'] = 'no-cache';
        config.headers['Expires'] = '0';
        
        return config;
      },
      error => Promise.reject(error)
    );
    
    // Add global response interceptor to handle auth errors
    const responseInterceptor = axios.interceptors.response.use(
      response => response,
      error => {
        if (error.response && error.response.status === 401 && isAuthenticated) {
          console.warn("Unauthorized request detected, logging out");
          handleLogout();
        }
        return Promise.reject(error);
      }
    );
    
    // Cleanup interceptors on unmount
    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [token, isAuthenticated]);

  // Get all patients (Admin only)
  const getAllPatients = useCallback(async () => {
    if (!isAuthenticated) return [];
    
    try {
      const response = await axios.get(`${backendUrl}/api/Patient`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Patients fetch error:', error);
      if (error.response?.status === 401) {
        handleLogout();
      }
      toast.error(error.response?.data?.message || 'Error fetching patients');
      return [];
    }
  }, [token, backendUrl, isAuthenticated, handleLogout]);

  // Get patient by ID
  const getPatientById = useCallback(async (patientId) => {
    if (!isAuthenticated || !patientId) return null;
    
    try {
      const response = await axios.get(`${backendUrl}/api/Patient/${patientId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        setPatientProfile(response.data);
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Patient fetch error:', error);
      if (error.response?.status === 401) {
        handleLogout();
      }
      toast.error(error.response?.data?.message || 'Error fetching patient details');
      return null;
    }
  }, [token, backendUrl, isAuthenticated, handleLogout]);

  // Get patient profile
  const getPatientProfile = useCallback(async (patientId) => {
    if (!isAuthenticated || !patientId) return null;
    
    try {
      console.log("Getting patient profile for ID:", patientId);
      // First try the by-user-id endpoint if it looks like a GUID (user ID)
      const isUserIdFormat = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientId);
      
      let endpoint = isUserIdFormat 
        ? `${backendUrl}/api/Patient/by-user-id/${patientId}`
        : `${backendUrl}/api/Patient/${patientId}`;
        
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        setPatientProfile(response.data);
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Patient profile fetch error:', error);
      if (error.response?.status === 401) {
        handleLogout();
      }
      toast.error(error.response?.data?.message || 'Error fetching patient profile');
      return null;
    }
  }, [token, backendUrl, isAuthenticated, handleLogout]);

  // Update patient profile
  const updatePatientProfile = useCallback(async (patientId, profileData) => {
    if (!isAuthenticated || !patientId) return false;
    
    try {
      console.log('Updating patient profile with ID:', patientId);
      let contentTypeHeader = {};
      let dataToSend = profileData;
      
      // Check if profileData is FormData - don't set Content-Type for FormData
      if (!(profileData instanceof FormData)) {
        contentTypeHeader = { 'Content-Type': 'application/json' };
        console.log('Using JSON content type for profile update');
        
        // If sending JSON data, ensure field names are PascalCase (not lowercase)
        if (typeof profileData === 'object' && profileData !== null) {
          // Fields should already be in PascalCase, but double-check
          const processedData = {};
          Object.keys(profileData).forEach(key => {
            const pascalKey = key.charAt(0).toUpperCase() + key.slice(1);
            processedData[pascalKey] = profileData[key];
          });
          dataToSend = processedData;
          console.log('Processed data for API call:', dataToSend);
        }
      } else {
        console.log('Using multipart/form-data content type for profile update');
        
        // Debug FormData content
        if (profileData instanceof FormData) {
          console.log('FormData entries:');
          for (let pair of profileData.entries()) {
            console.log(pair[0] + ': ' + (pair[1] instanceof File ? `File: ${pair[1].name}` : pair[1]));
          }
        }
      }
      
      console.log(`Making API call to: ${backendUrl}/api/Patient/update-profile/${patientId}`);
      
      const response = await axios.put(`${backendUrl}/api/Patient/update-profile/${patientId}`, dataToSend, {
        headers: { 
          Authorization: `Bearer ${token}`,
          ...contentTypeHeader
        }
      });
      
      if (response.status === 200) {
        console.log('Profile update successful:', response.data);
        setPatientProfile(response.data);
        toast.success('Profile updated successfully');
        return true;
      }
      console.warn('Profile update returned non-200 status:', response.status);
      return false;
    } catch (error) {
      console.error('Profile update error:', error);
      
      // Add detailed error logging
      if (error.response) {
        console.error('Error response status:', error.response.status);
        console.error('Error response data:', error.response.data ? JSON.stringify(error.response.data) : 'No response data');
        console.error('Error response headers:', error.response.headers);
      } else if (error.request) {
        console.error('No response received from server');
      } else {
        console.error('Error setting up request:', error.message);
      }
      
      if (error.response?.status === 401) {
        handleLogout();
      }
      toast.error(error.response?.data?.message || error.message || 'Error updating profile');
      return false;
    }
  }, [isAuthenticated, token, backendUrl, handleLogout]);

  // Get appointment by ID
  const getAppointmentById = useCallback(async (appointmentId) => {
    if (!isAuthenticated || !appointmentId) return null;
    
    try {
      const response = await axios.get(`${backendUrl}/api/Appointment/${appointmentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Appointment fetch error:', error);
      if (error.response?.status === 401) {
        handleLogout();
      }
      toast.error(error.response?.data?.message || 'Error fetching appointment details');
      return null;
    }
  }, [token, backendUrl, isAuthenticated, handleLogout]);

  // Book new appointment
  const bookAppointment = useCallback(async (appointmentData) => {
    if (!isAuthenticated) return null;
    
    try {
      const response = await axios.post(`${backendUrl}/api/Appointment`, appointmentData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data) {
        toast.success('Appointment booked successfully');
        // Refresh appointments list if we have patientProfile
        if (patientProfile?.id) {
          getPatientAppointments(patientProfile.id);
        }
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Appointment booking error:', error);
      if (error.response?.status === 401) {
        handleLogout();
      }
      toast.error(error.response?.data?.message || 'Error booking appointment');
      return null;
    }
  }, [token, backendUrl, isAuthenticated, handleLogout, patientProfile, getPatientAppointments]);

  // Get available appointment slots
  const getAvailableSlots = useCallback(async (doctorId, date) => {
    try {
      const response = await axios.get(`${backendUrl}/api/Appointment/available-slots`, {
        params: { doctorId, date },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        setAvailableSlots(response.data);
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Available slots fetch error:', error);
      if (error.response?.status === 401 && isAuthenticated) {
        handleLogout();
      }
      toast.error(error.response?.data?.message || 'Error fetching available slots');
      return [];
    }
  }, [token, backendUrl, isAuthenticated, handleLogout]);

  // Check appointment availability
  const checkAvailability = useCallback(async (doctorId, date, timeSlot) => {
    try {
      const response = await axios.get(`${backendUrl}/api/Appointment/check-availability`, {
        params: { doctorId, date, timeSlot },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      return response.data;
    } catch (error) {
      console.error('Availability check error:', error);
      if (error.response?.status === 401 && isAuthenticated) {
        handleLogout();
      }
      toast.error(error.response?.data?.message || 'Error checking availability');
      return false;
    }
  }, [token, backendUrl, isAuthenticated, handleLogout]);

  // Cancel appointment
  const cancelAppointment = useCallback(async (appointmentId) => {
    if (!isAuthenticated || !appointmentId) return false;
    
    try {
      const response = await axios.post(`${backendUrl}/api/Appointment/cancel/${appointmentId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.status === 200) {
        toast.success('Appointment cancelled successfully');
        // Update appointments list if we have patientProfile
        if (patientProfile?.id) {
          getPatientAppointments(patientProfile.id);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Appointment cancellation error:', error);
      if (error.response?.status === 401) {
        handleLogout();
      }
      toast.error(error.response?.data?.message || 'Error cancelling appointment');
      return false;
    }
  }, [token, backendUrl, isAuthenticated, handleLogout, patientProfile, getPatientAppointments]);

  // Confirm appointment
  const confirmAppointment = useCallback(async (appointmentId) => {
    if (!isAuthenticated || !appointmentId) return false;
    
    try {
      const response = await axios.post(`${backendUrl}/api/Appointment/confirm/${appointmentId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.status === 200) {
        toast.success('Appointment confirmed successfully');
        // Update appointments list if we have patientProfile
        if (patientProfile?.id) {
          getPatientAppointments(patientProfile.id);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Appointment confirmation error:', error);
      if (error.response?.status === 401) {
        handleLogout();
      }
      toast.error(error.response?.data?.message || 'Error confirming appointment');
      return false;
    }
  }, [token, backendUrl, isAuthenticated, handleLogout, patientProfile, getPatientAppointments]);

  // Add this new effect to ensure token preservation
  useEffect(() => {
    // If we have a valid token in localStorage, make sure it's not cleared
    const storedToken = localStorage.getItem('token');
    const storedUserRole = localStorage.getItem('userRole');
    
    if (storedToken && storedUserRole?.toLowerCase() === 'patient') {
      // Validate the token to make sure it's actually for a patient
      if (validateToken(storedToken)) {
        console.log('[PatientContext] Preserving valid patient token');
        setToken(storedToken);
        setIsAuthenticated(true);
        setupAxiosHeaders(storedToken);
      }
    }
  }, []);

  const value = {
    token,
    setToken,
    user,
    setUser,
    patientProfile,
    appointments,
    availableSlots,
    loading,
    isAuthenticated,
    backendUrl,
    validateToken,
    handleLogout,
    getAllPatients,
    getPatientById,
    getPatientByUserId,
    getPatientProfile,
    updatePatientProfile,
    getPatientAppointments,
    getAppointmentById,
    bookAppointment,
    getAvailableSlots,
    checkAvailability,
    cancelAppointment,
    confirmAppointment
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <PatientContext.Provider value={value}>
      {props.children}
    </PatientContext.Provider>
  );
};

export default PatientContextProvider; 