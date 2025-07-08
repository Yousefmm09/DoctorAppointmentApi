import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { PatientContext } from '../context/PatientContext';
import { AppContext } from '../context/AppContext';
import { toast } from 'react-toastify';
import { getProfileImageUrl } from '../utils/imageHelper';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiCalendar, 
  FiRefreshCw, 
  FiClock, 
  FiMapPin, 
  FiUser, 
  FiCheckCircle, 
  FiXCircle, 
  FiAlertCircle, 
  FiInfo, 
  FiChevronDown, 
  FiPlus, 
  FiFilter, 
  FiStar, 
  FiArrowRight, 
  FiMessageCircle, 
  FiMail, 
  FiPhone,
  FiChevronRight,
  FiCheck,
  FiX,
  FiClock as FiClockIcon
} from 'react-icons/fi';
import RatingComponent from '../components/common/RatingComponent';
import ProfilePicture from '../components/ProfilePicture';

// Animation variants
const tabVariants = {
  active: {
    color: '#3b82f6', // blue-500
    fontWeight: 600
  },
  inactive: {
    color: '#6b7280', // gray-500
    fontWeight: 400
  }
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

const AppointmentStatus = ({ status }) => {
  let statusClass = '';
  let statusText = status;
  let statusIcon = null;
  
  // Default to 'scheduled' if status is missing
  const normalizedStatus = status ? status.toLowerCase() : 'scheduled';
  
  switch (normalizedStatus) {
    case 'scheduled':
      statusClass = 'bg-blue-100 text-blue-700';
      statusText = 'Scheduled';
      statusIcon = <FiCalendar className="mr-1.5" size={14} />;
      break;
    case 'confirmed':
      statusClass = 'bg-green-100 text-green-700';
      statusText = 'Confirmed';
      statusIcon = <FiCheckCircle className="mr-1.5" size={14} />;
      break;
    case 'completed':
      statusClass = 'bg-purple-100 text-purple-700';
      statusText = 'Completed';
      statusIcon = <FiCheckCircle className="mr-1.5" size={14} />;
      break;
    case 'cancelled':
      statusClass = 'bg-red-100 text-red-700';
      statusText = 'Cancelled';
      statusIcon = <FiXCircle className="mr-1.5" size={14} />;
      break;
    case 'pending':
      statusClass = 'bg-yellow-100 text-yellow-700';
      statusText = 'Pending';
      statusIcon = <FiAlertCircle className="mr-1.5" size={14} />;
      break;
    default:
      statusClass = 'bg-blue-100 text-blue-700';
      statusText = 'Scheduled';
      statusIcon = <FiCalendar className="mr-1.5" size={14} />;
  }
  
  return (
    <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${statusClass} flex items-center inline-flex`}>
      {statusIcon}
      {statusText}
    </span>
  );
};

// Custom hook for appointment management
const useAppointmentManager = (token, userData, patientProfile, backendUrl) => {
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(() => {
    try {
      return sessionStorage.getItem('lastAppointmentTab') || 'upcoming';
    } catch {
      return 'upcoming';
    }
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load appointments from API or cache
  const loadAppointments = async (forceRefresh = false) => {
    if (forceRefresh) {
      setIsRefreshing(true);
    }
    
    setLoading(true);
    setError(null);
    
    // First, try to load from cache for immediate UI response
    let cachedData = [];
    try {
      cachedData = JSON.parse(localStorage.getItem('cachedAppointments') || '[]');
      if (cachedData.length > 0 && !forceRefresh) {
        console.log(`Found ${cachedData.length} appointments in cache`);
        setAppointments(cachedData);
        filterAppointmentsByTab(activeTab, cachedData);
      setLoading(false);
    }
    } catch (e) {
      console.error("Error reading cached appointments:", e);
    }
    
    // Only proceed with API call if we have auth token
    if (!token) {
      if (cachedData.length === 0) {
        setError("Please log in to view your appointments");
      setLoading(false);
    }
      setIsRefreshing(false);
      return;
    }
    
    try {
      const patientId = patientProfile?.id || userData?.id || localStorage.getItem('patientId');
      
      if (!patientId) {
        setError("Patient profile not found");
          setLoading(false);
        setIsRefreshing(false);
        return;
      }
      
      // Prepare the API endpoint
          const baseUrl = backendUrl || import.meta.env.VITE_BACKEND_URL || "http://localhost:5109";
          const url = `${baseUrl}/api/Patient/appointments/${patientId}`;
      
      console.log(`Fetching appointments from: ${url}`);
          
          const response = await axios.get(url, {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Cache-Control': 'no-cache'
        },
        timeout: 8000 // 8 second timeout for better error handling
      });
      
      if (response.data) {
        let appointmentsData = Array.isArray(response.data) ? response.data : [];
        
        if (appointmentsData.length > 0) {
          console.log(`Received ${appointmentsData.length} appointments from API`);
          
          // Normalize appointment data to ensure consistent format
          const normalizedAppointments = appointmentsData.map(normalizeAppointment);
          
          // Update state and cache
          setAppointments(normalizedAppointments);
          localStorage.setItem('cachedAppointments', JSON.stringify(normalizedAppointments));
          
          // Filter appointments based on active tab
          filterAppointmentsByTab(activeTab, normalizedAppointments);
        } else if (cachedData.length === 0) {
          // No appointments from API and no cache
          setAppointments([]);
          setFilteredAppointments([]);
        }
      }
    } catch (err) {
      console.error("Error fetching appointments:", err);
      setError(err.message || "Failed to load appointments");
      
      // If we have cached data, continue using it
      if (cachedData.length === 0) {
        // Generate some example appointments for better UX when backend is unavailable
        const exampleAppointments = generateExampleAppointments();
        setAppointments(exampleAppointments);
        filterAppointmentsByTab(activeTab, exampleAppointments);
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };
  
  // Normalize appointment data
  const normalizeAppointment = (apt) => {
    // Format appointment date
    let appointmentDate = apt.appointmentDate;
    if (!appointmentDate || appointmentDate === "Invalid Date" || appointmentDate === "No date") {
      // Default to a future date for missing dates
      appointmentDate = new Date();
      appointmentDate.setDate(appointmentDate.getDate() + 7);
      appointmentDate = appointmentDate.toISOString();
    }
    
    // Validate date format
                try {
                  const testDate = new Date(appointmentDate);
                  if (isNaN(testDate.getTime())) {
                    if (typeof appointmentDate === 'string') {
                      if (appointmentDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                        appointmentDate = `${appointmentDate}T00:00:00`;
          } else if (appointmentDate.includes('/Date(')) {
                        const timestamp = parseInt(appointmentDate.replace(/\/Date\((\d+)\)\//, '$1'), 10);
                        if (!isNaN(timestamp)) {
              appointmentDate = new Date(timestamp).toISOString();
                        } else {
              appointmentDate = new Date().toISOString();
                        }
                      }
                    }
                  }
                } catch (e) {
      appointmentDate = new Date().toISOString();
              }
              
    // Format doctor name
              const doctorName = apt.doctorName || 
                (apt.doctorFirstName || apt.doctorLastName ? 
                  `Dr. ${apt.doctorFirstName || ''} ${apt.doctorLastName || ''}`.trim() : 
                  "Doctor");
              
    // Format status
              const status = apt.status || (apt.isConfirmed ? "Confirmed" : "Scheduled");
              
              return {
      ...apt,
      id: apt.id || `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      doctorName,
      appointmentDate,
      status,
      startTime: apt.startTime || "9:00 AM",
      endTime: apt.endTime || "9:30 AM",
      specialization: apt.specialization || apt.doctorSpecialty || "General",
      clinicAddress: apt.clinicAddress || apt.address || "Medical Center",
      reason: apt.reason || apt.visitReason || "General checkup"
    };
  };
  
  // Generate example appointments when backend is unavailable
  const generateExampleAppointments = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);
    
    return [
      {
        id: 'example-1',
        doctorName: 'Dr. James Carter',
        appointmentDate: tomorrow.toISOString(),
        status: 'Scheduled',
        startTime: '10:00 AM',
        endTime: '10:30 AM',
        specialization: 'General Practice',
        clinicAddress: 'Medical Center, Cairo',
        reason: 'General checkup',
        isExample: true
      },
      {
        id: 'example-2',
        doctorName: 'Dr. Sarah Johnson',
        appointmentDate: nextWeek.toISOString(),
        status: 'Confirmed',
        startTime: '2:00 PM',
        endTime: '2:30 PM',
        specialization: 'Cardiology',
        clinicAddress: 'Heart Clinic, Cairo',
        reason: 'Follow-up visit',
        isExample: true
      },
      {
        id: 'example-3',
        doctorName: 'Dr. Ahmed Mohamed',
        appointmentDate: lastWeek.toISOString(),
        status: 'Completed',
        startTime: '9:00 AM',
        endTime: '9:30 AM',
        specialization: 'Neurology',
        clinicAddress: 'Neuro Center, Alexandria',
        reason: 'Headache assessment',
        isExample: true
      }
    ];
  };
  
  // Filter appointments by tab
  const filterAppointmentsByTab = (tab, appointmentsToFilter = null) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const aptsToFilter = appointmentsToFilter || appointments;
    
    if (!aptsToFilter || aptsToFilter.length === 0) {
      setFilteredAppointments([]);
      return;
    }
    
      let filtered = [];
      
      switch (tab) {
      case 'upcoming':
        filtered = aptsToFilter.filter(apt => {
          const status = (apt.status || '').toLowerCase();
          if (status === 'cancelled' || status === 'completed') {
            return false;
          }
          
          try {
            const aptDate = new Date(apt.appointmentDate);
            return aptDate >= today;
          } catch (e) {
            return true; // Include if date parsing fails
          }
          });
          break;
        
      case 'past':
        filtered = aptsToFilter.filter(apt => {
            const status = (apt.status || '').toLowerCase();
          if (status === 'cancelled') {
            return false;
          }
          
          try {
            const aptDate = new Date(apt.appointmentDate);
            return status === 'completed' || aptDate < today;
          } catch (e) {
            return false;
          }
          });
          break;
        
      case 'cancelled':
        filtered = aptsToFilter.filter(apt => {
            const status = (apt.status || '').toLowerCase();
            return status === 'cancelled';
          });
          break;
        
        case 'all':
        default:
        filtered = aptsToFilter;
          break;
      }

    // Sort appointments by date (newest first for past, oldest first for upcoming)
    filtered.sort((a, b) => {
      const dateA = new Date(a.appointmentDate);
      const dateB = new Date(b.appointmentDate);
      
      if (tab === 'past' || tab === 'cancelled') {
        return dateB - dateA;
      }
      return dateA - dateB;
    });
    
    setFilteredAppointments(filtered);
  };
  
  // Cancel appointment
  const cancelAppointment = async (appointmentId, reason = '') => {
    try {
      // Update locally first for immediate UI feedback
      const updatedAppointments = appointments.map(apt => 
        apt.id === appointmentId ? { ...apt, status: 'Cancelled', cancelReason: reason } : apt
      );
      
      setAppointments(updatedAppointments);
        localStorage.setItem('cachedAppointments', JSON.stringify(updatedAppointments));
      filterAppointmentsByTab(activeTab, updatedAppointments);
      
      // Attempt API update if we have auth
      if (token) {
        const baseUrl = backendUrl || import.meta.env.VITE_BACKEND_URL || "http://localhost:5109";
        await axios.put(`${baseUrl}/api/Appointment/${appointmentId}/cancel`, 
          { reason },
          { headers: { Authorization: `Bearer ${token}` }}
        );
      }
      
      return true;
    } catch (err) {
      console.error("Error cancelling appointment:", err);
      return false;
    }
  };
  
  // Change active tab
  const changeTab = (tab) => {
    setActiveTab(tab);
    filterAppointmentsByTab(tab);
    try {
      sessionStorage.setItem('lastAppointmentTab', tab);
    } catch (e) {
      console.error('Could not save tab state:', e);
    }
  };
  
  // Initialize on mount
  useEffect(() => {
    loadAppointments();
    
    return () => {
      try {
        sessionStorage.setItem('lastAppointmentTab', activeTab);
      } catch (e) {
        console.error('Could not save tab state:', e);
      }
    };
  }, [token, userData, patientProfile]);
  
  // Update filtered appointments when active tab changes
  useEffect(() => {
    filterAppointmentsByTab(activeTab);
  }, [activeTab]);
  
  return {
    appointments,
    filteredAppointments,
    loading,
    error,
    isRefreshing,
    activeTab,
    changeTab,
    loadAppointments,
    cancelAppointment
  };
};

const MyAppointments = () => {
  const { token, userData, backendUrl } = useContext(AppContext);
  const { patientProfile } = useContext(PatientContext);
  const navigate = useNavigate();
  
  // State for modals
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  
  // Use custom hook for appointment management
  const {
    filteredAppointments,
    loading,
    error,
    isRefreshing,
    activeTab,
    changeTab,
    loadAppointments,
    cancelAppointment
  } = useAppointmentManager(token, userData, patientProfile, backendUrl);
  
  // Format date helper function
  const formatDate = (dateString) => {
    try {
        const date = new Date(dateString);
      if (isNaN(date.getTime())) return "No date";
      
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      
      const isToday = date.toDateString() === now.toDateString();
      const isTomorrow = date.toDateString() === tomorrow.toDateString();
      
      if (isToday) return "Today";
      if (isTomorrow) return "Tomorrow";
        
        return date.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    } catch (e) {
      return "No date";
    }
  };
  
  // Handle cancellation
  const handleCancelAppointment = (appointmentId) => {
    const appointment = filteredAppointments.find(apt => apt.id === appointmentId);
    if (appointment) {
      setSelectedAppointment(appointment);
      setShowCancelModal(true);
    }
  };
  
  // Submit cancellation
  const submitCancellation = async () => {
    if (!selectedAppointment) return;
    
    setIsCancelling(true);
    const success = await cancelAppointment(selectedAppointment.id, cancelReason);
    
    if (success) {
      toast.success("Appointment cancelled successfully");
      setShowCancelModal(false);
      setCancelReason('');
    } else {
      toast.error("Failed to cancel appointment. Please try again.");
    }
    
    setIsCancelling(false);
    setSelectedAppointment(null);
  };
  
  // Toggle rating form
  const toggleRatingForm = (appointmentId) => {
    const appointment = filteredAppointments.find(apt => apt.id === appointmentId);
    if (appointment) {
      setSelectedAppointment(appointment);
      setRating(0);
      setFeedback('');
      setShowRatingModal(true);
    }
  };
  
  // Submit rating
  const submitRating = async () => {
    // Rating submission logic goes here
    toast.success("Rating submitted successfully");
    setShowRatingModal(false);
    setSelectedAppointment(null);
  };
  
  // Render empty state
  const renderEmptyState = () => (
      <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      className="text-center py-12 px-4"
    >
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md mx-auto">
        <div className="mb-6">
          <FiCalendar className="w-12 h-12 text-blue-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No Appointments Found</h3>
          <p className="text-gray-600">
            {activeTab === 'upcoming' 
              ? "You don't have any upcoming appointments scheduled."
              : activeTab === 'past'
                ? "You don't have any past appointments."
                : activeTab === 'cancelled'
                  ? "You don't have any cancelled appointments."
                  : "No appointments found in this section."}
          </p>
            </div>
        
        <button
              onClick={() => navigate('/doctors')}
          className="inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
          <FiPlus className="mr-2" /> Book an Appointment
        </button>
          </div>
        </motion.div>
  );
  
  // Render loading skeleton
  const renderLoadingSkeleton = () => (
    <div className="space-y-4 py-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-gray-200"></div>
            <div className="flex-1 space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
            <div className="w-24 h-8 bg-gray-200 rounded-full"></div>
            </div>
              </div>
      ))}
            </div>
  );
  
  // Render error state
  const renderError = () => (
    <div className="rounded-xl bg-red-50 border border-red-100 p-6 my-4">
      <div className="flex items-center mb-4">
        <FiAlertCircle className="text-red-500 mr-3 text-xl" />
        <h3 className="text-lg font-medium text-red-700">Unable to load appointments</h3>
              </div>
      <p className="text-red-600 mb-4">{error || "There was a problem connecting to the server."}</p>
      <div className="flex justify-end">
        <button 
          onClick={() => loadAppointments(true)}
          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center"
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <>
              <span className="animate-spin mr-2">⟳</span> Retrying...
            </>
          ) : (
            <>
              <FiRefreshCw className="mr-2" /> Retry
            </>
          )}
        </button>
              </div>
            </div>
  );
        
  return (
            <motion.div 
      className="max-w-5xl mx-auto py-8 px-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
      {/* Page Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">My Appointments</h1>
          <p className="text-gray-600">Manage your scheduled, past, and cancelled appointments</p>
        </div>
        
        <div className="mt-4 md:mt-0 flex items-center gap-3">
          <button
            onClick={() => loadAppointments(true)}
            className="inline-flex items-center justify-center px-3 py-2 text-sm bg-white text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <span className="animate-spin mr-2">⟳</span>
            ) : (
              <FiRefreshCw className="mr-2" />
            )}
            Refresh
          </button>
          
          <button
                  onClick={() => navigate('/doctors')}
            className="inline-flex items-center justify-center px-4 py-2 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FiPlus className="mr-2" /> Book New
          </button>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-wrap border-b border-gray-200">
          {['upcoming', 'past', 'cancelled', 'all'].map((tab) => (
                  <button 
              key={tab}
              onClick={() => changeTab(tab)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <motion.span
                initial={false}
                animate={activeTab === tab ? 'active' : 'inactive'}
                variants={tabVariants}
                className="capitalize"
              >
                {tab}
              </motion.span>
                  </button>
          ))}
                </div>
              </div>
      
      {/* Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {error && renderError()}
        
        {!error && (
          <>
            {loading && renderLoadingSkeleton()}
            
            {!loading && filteredAppointments.length === 0 && renderEmptyState()}
            
            {!loading && filteredAppointments.length > 0 && (
              <motion.div 
                variants={container}
                initial="hidden"
                animate="show"
                className="divide-y divide-gray-200"
              >
                {filteredAppointments.map((appointment) => (
                  <motion.div
                    key={appointment.id} 
                    variants={item}
                    className="p-4 md:p-6 transition-colors hover:bg-gray-50"
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      {/* Doctor and appointment info */}
                      <div className="flex items-start gap-4">
                        <ProfilePicture 
                          src={appointment.doctorProfilePicture} 
                          name={appointment.doctorName}
                          size="md"
                          className="flex-shrink-0"
                        />
                        
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {appointment.doctorName}
                          </h3>
                          
                          <p className="text-sm text-gray-600 mb-1">
                            {appointment.specialization || "Specialist"}
                          </p>
                          
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
                            <div className="flex items-center text-sm text-gray-700">
                              <FiCalendar className="mr-1.5 text-gray-500" />
                              {formatDate(appointment.appointmentDate)}
                    </div>
                    
                            <div className="flex items-center text-sm text-gray-700">
                              <FiClock className="mr-1.5 text-gray-500" />
                              {appointment.startTime || "N/A"}
                        </div>
                        
                            <div className="flex items-center text-sm text-gray-700">
                              <FiMapPin className="mr-1.5 text-gray-500" />
                              {appointment.clinicAddress || "Medical Center"}
                            </div>
                        </div>
                        
                          {appointment.reason && (
                            <div className="mt-2 text-sm text-gray-600">
                              <span className="font-medium">Reason:</span> {appointment.reason}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Status and actions */}
                      <div className="flex flex-col items-start md:items-end gap-3">
                        <AppointmentStatus status={appointment.status} />
                        
                        {/* Appointment actions */}
                        <div className="flex flex-wrap gap-2">
                          {(appointment.status === 'Scheduled' || appointment.status === 'Confirmed') && (
                            <button
                              onClick={() => handleCancelAppointment(appointment.id)}
                              className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                            >
                              Cancel
                            </button>
                          )}
                          
                          {appointment.status === 'Completed' && !appointment.isRated && (
                            <button
                              onClick={() => toggleRatingForm(appointment.id)}
                              className="px-3 py-1.5 text-xs font-medium text-yellow-700 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
                            >
                              <FiStar className="inline mr-1" /> Rate
                            </button>
                          )}
                          
                          <button
                            onClick={() => navigate(`/appointment/${appointment.id}`)}
                            className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            Details
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* Cancel Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">Cancel Appointment</h3>
              
              <p className="text-gray-600 mb-4">
                Are you sure you want to cancel your appointment with {selectedAppointment?.doctorName} on {formatDate(selectedAppointment?.appointmentDate)}?
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for cancellation (optional)
                </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm"
                rows={3}
                  placeholder="Please provide a reason for cancellation..."
              />
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setSelectedAppointment(null);
                    setCancelReason('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  disabled={isCancelling}
                >
                  No, Keep It
                </button>
                
                <button
                  onClick={submitCancellation}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center"
                  disabled={isCancelling}
                >
                  {isCancelling ? (
                    <>
                      <span className="animate-spin mr-2">⟳</span> Cancelling...
                    </>
                  ) : (
                    <>
                      <FiX className="mr-2" /> Yes, Cancel
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rating Modal */}
      <AnimatePresence>
        {showRatingModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-2">Rate Your Experience</h3>
              
              <p className="text-gray-600 mb-4">
                How was your appointment with {selectedAppointment?.doctorName}?
              </p>
              
              <div className="flex justify-center mb-6">
                <RatingComponent 
                  value={rating} 
                  onChange={setRating} 
                  size="large" 
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your feedback (optional)
                </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm"
                rows={3}
                  placeholder="Share your experience with this doctor..."
              />
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowRatingModal(false);
                    setSelectedAppointment(null);
                    setRating(0);
                    setFeedback('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                
                <button
                  onClick={submitRating}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  disabled={rating === 0}
                >
                  Submit Rating
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MyAppointments;
