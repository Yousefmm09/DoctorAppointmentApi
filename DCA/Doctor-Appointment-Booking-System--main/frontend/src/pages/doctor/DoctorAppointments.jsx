import React, { useContext, useEffect, useState, useMemo } from 'react';
import { AppContext } from '../../context/AppContext';
import { toast } from 'react-toastify';
import { DoctorContext } from '../../context/DoctorContext';
import ProfilePicture from '../../components/ProfilePicture';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  FiCalendar, 
  FiFilter, 
  FiCheckCircle, 
  FiXCircle, 
  FiClock,
  FiSearch,
  FiChevronDown,
  FiChevronUp,
  FiChevronLeft,
  FiChevronRight,
  FiRefreshCw,
  FiUser,
  FiList,
  FiGrid,
  FiMessageSquare,
  FiPhoneCall,
  FiMapPin,
  FiFileText,
  FiAlertTriangle,
  FiInfo
} from 'react-icons/fi';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { 
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 10, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: { type: "spring", stiffness: 100 }
  }
};

// Custom hook for appointments management
const useAppointments = (token, doctorProfile, backendUrl) => {
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch appointments
  const fetchAppointments = async (forceRefresh = false) => {
    if (forceRefresh) {
      setIsRefreshing(true);
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Get doctor ID from profile or localStorage
      const doctorId = doctorProfile?.id || localStorage.getItem("doctorId");
        
      if (!doctorId) {
        throw new Error("Doctor ID not found. Please complete your profile first.");
      }
      
      // Make API request to get appointments with payment information
      const response = await axios.get(
        `${backendUrl}/api/Appointment/doctor/${doctorId}/with-payments`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      if (response.data) {
        // Process and normalize appointments data
        const appointmentsData = Array.isArray(response.data) ? 
          response.data.map(normalizeAppointment) : [];
        
        setAppointments(appointmentsData);
        setFilteredAppointments(appointmentsData);
      }
    } catch (err) {
      console.error("Error fetching appointments:", err);
      setError(err.message || "Failed to load appointments");
      
      // Generate example appointments if none available
      if (appointments.length === 0) {
        const exampleAppointments = generateExampleAppointments();
        setAppointments(exampleAppointments);
        setFilteredAppointments(exampleAppointments);
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };
  
  // Normalize appointment data
  const normalizeAppointment = (apt) => {
    // Format appointment date
    let appointmentDate = apt.appointmentDate || apt.date;
    if (!appointmentDate) {
      appointmentDate = new Date();
      appointmentDate.setDate(appointmentDate.getDate() + Math.floor(Math.random() * 7));
      appointmentDate = appointmentDate.toISOString();
    }
    
    // Format time
    let startTime = apt.startTime || apt.appointmentTime || "9:00 AM";
    let endTime = apt.endTime || null;
    
    // Format patient name
    const patientName = apt.patientName || 
      (apt.patientFirstName || apt.patientLastName ? 
        `${apt.patientFirstName || ''} ${apt.patientLastName || ''}`.trim() : 
        "Patient");
    
    // Format status
    const status = apt.status || "Pending";
    
    // Payment information
    const paymentStatus = apt.payment?.status || apt.paymentStatus || "Pending";
    const paymentAmount = apt.payment?.amount || apt.appointmentFee || "N/A";
    const paymentMethod = apt.payment?.paymentMethod || "N/A";
    const paymentDate = apt.payment?.paymentDate ? new Date(apt.payment.paymentDate).toLocaleString() : "N/A";
    const transactionId = apt.payment?.transactionId || "N/A";
    
    return {
      ...apt,
      id: apt.id || `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      patientName,
      appointmentDate,
      status,
      startTime,
      endTime,
      patientEmail: apt.patientEmail || apt.email || "patient@example.com",
      patientPhoneNumber: apt.patientPhoneNumber || apt.phoneNumber || "N/A",
      reason: apt.reason || apt.visitReason || "General checkup",
      payment: {
        status: paymentStatus,
        amount: paymentAmount,
        method: paymentMethod,
        date: paymentDate,
        transactionId: transactionId
      }
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
        patientName: 'Ahmed Mohamed',
        appointmentDate: today.toISOString(),
        status: 'Confirmed',
        startTime: '10:00 AM',
        endTime: '10:30 AM',
        patientEmail: 'ahmed@example.com',
        patientPhoneNumber: '+201234567890',
        reason: 'General checkup',
        isExample: true
      },
      {
        id: 'example-2',
        patientName: 'Sara Ibrahim',
        appointmentDate: tomorrow.toISOString(),
        status: 'Pending',
        startTime: '2:00 PM',
        endTime: '2:30 PM',
        patientEmail: 'sara@example.com',
        patientPhoneNumber: '+201234567891',
        reason: 'Follow-up',
        isExample: true
      },
      {
        id: 'example-3',
        patientName: 'Mohammed Ali',
        appointmentDate: nextWeek.toISOString(),
        status: 'Confirmed',
        startTime: '11:30 AM',
        endTime: '12:00 PM',
        patientEmail: 'mohammed@example.com',
        patientPhoneNumber: '+201234567892',
        reason: 'Consultation',
        isExample: true
      },
      {
        id: 'example-4',
        patientName: 'Fatima Hassan',
        appointmentDate: lastWeek.toISOString(),
        status: 'Completed',
        startTime: '9:00 AM',
        endTime: '9:30 AM',
        patientEmail: 'fatima@example.com',
        patientPhoneNumber: '+201234567893',
        reason: 'Checkup',
        isExample: true
      }
    ];
  };
  
  // Update appointment status
  const updateAppointmentStatus = async (appointmentId, newStatus) => {
    try {
      // Optimistically update the UI
      const updatedAppointments = appointments.map(apt => 
        apt.id === appointmentId ? { ...apt, status: newStatus } : apt
      );
      setAppointments(updatedAppointments);
      setFilteredAppointments(prev => 
        prev.map(apt => apt.id === appointmentId ? { ...apt, status: newStatus } : apt)
      );
      
      // Make API request to update in the backend
      await axios.put(
        `${backendUrl}/api/Appointment/update-status/${appointmentId}`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      return true;
    } catch (err) {
      console.error("Error updating appointment status:", err);
      return false;
    }
  };
  
  // Filter appointments
  const filterAppointments = (filterOptions) => {
    const { status, dateRange, searchQuery } = filterOptions;
    
    let filtered = [...appointments];
    
    // Filter by status
    if (status && status !== 'all') {
      filtered = filtered.filter(apt => 
        apt.status.toLowerCase() === status.toLowerCase()
      );
    }
    
    // Filter by date range
    if (dateRange.start && dateRange.end) {
      const start = new Date(dateRange.start);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(dateRange.end);
      end.setHours(23, 59, 59, 999);
      
      filtered = filtered.filter(apt => {
        const aptDate = new Date(apt.appointmentDate);
        return aptDate >= start && aptDate <= end;
      });
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(apt => 
        apt.patientName.toLowerCase().includes(query) ||
        apt.patientEmail.toLowerCase().includes(query) ||
        apt.reason.toLowerCase().includes(query) ||
        apt.patientPhoneNumber.includes(query)
      );
    }
    
    // Sort appointments by date
    filtered.sort((a, b) => {
      return new Date(a.appointmentDate) - new Date(b.appointmentDate);
    });
    
    setFilteredAppointments(filtered);
  };
  
  // Initialize on mount
  useEffect(() => {
    if (token) {
      fetchAppointments();
    }
  }, [token, doctorProfile]);
  
  return {
    appointments,
    filteredAppointments,
    loading,
    error,
    isRefreshing,
    fetchAppointments,
    updateAppointmentStatus,
    filterAppointments
  };
};

// Status chip component
const StatusChip = ({ status }) => {
  const getStatusConfig = (status) => {
    const normalizedStatus = (status || "pending").toLowerCase();
    
    switch (normalizedStatus) {
      case 'completed':
        return { 
          className: 'bg-green-50 text-green-700 border border-green-100',
          icon: <FiCheckCircle className="mr-1.5" />
        };
      case 'confirmed':
        return { 
          className: 'bg-blue-50 text-blue-700 border border-blue-100',
          icon: <FiCalendar className="mr-1.5" />
        };
      case 'cancelled':
        return { 
          className: 'bg-red-50 text-red-700 border border-red-100',
          icon: <FiXCircle className="mr-1.5" />
        };
      case 'pending':
      default:
        return { 
          className: 'bg-yellow-50 text-yellow-700 border border-yellow-100',
          icon: <FiClock className="mr-1.5" />
        };
    }
  };
  
  const { className, icon } = getStatusConfig(status);
  
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center ${className}`}>
      {icon}
      {status}
    </span>
  );
};

// Add PaymentStatusChip component after StatusChip
const PaymentStatusChip = ({ status }) => {
  const getPaymentStatusConfig = (status) => {
    const normalizedStatus = (status || "pending").toLowerCase();
    
    switch (normalizedStatus) {
      case 'completed':
        return { 
          className: 'bg-green-50 text-green-700 border border-green-100',
          icon: <FiCheckCircle className="mr-1.5" />
        };
      case 'refunded':
        return { 
          className: 'bg-purple-50 text-purple-700 border border-purple-100',
          icon: <FiRefreshCw className="mr-1.5" />
        };
      case 'failed':
        return { 
          className: 'bg-red-50 text-red-700 border border-red-100',
          icon: <FiXCircle className="mr-1.5" />
        };
      case 'pending':
      default:
        return { 
          className: 'bg-yellow-50 text-yellow-700 border border-yellow-100',
          icon: <FiClock className="mr-1.5" />
        };
    }
  };
  
  const { className: paymentClassName, icon: paymentIcon } = getPaymentStatusConfig(status);
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center ${paymentClassName}`}>
      {paymentIcon}
      Payment: {status}
    </span>
  );
};

// Appointment card component
const AppointmentCard = ({ appointment, onStatusUpdate }) => {
  const [showActions, setShowActions] = useState(false);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
    
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return "N/A";
    }
  };
  
  return (
    <motion.div 
      variants={itemVariants}
      className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow transition-all"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center">
          <ProfilePicture
            src={appointment.patientProfilePicture}
            name={appointment.patientName}
            size="md"
          />
          <div className="ml-3">
            <h3 className="font-medium text-gray-900">{appointment.patientName}</h3>
            <p className="text-sm text-gray-500">{appointment.patientEmail}</p>
          </div>
        </div>
        <div className="flex flex-col space-y-2">
          <StatusChip status={appointment.status} />
          <PaymentStatusChip status={appointment.payment?.status || 'Pending'} />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <FiCalendar className="mr-2 text-gray-400" />
          {formatDate(appointment.appointmentDate)}
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <FiClock className="mr-2 text-gray-400" />
          {appointment.startTime}
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <FiPhoneCall className="mr-2 text-gray-400" />
          {appointment.patientPhoneNumber}
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <FiFileText className="mr-2 text-gray-400" />
          {appointment.reason}
        </div>
      </div>
      
      {/* Payment details section */}
      <div className="mt-2 mb-2">
        <button 
          onClick={() => setShowPaymentDetails(!showPaymentDetails)}
          className="flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
        >
          {showPaymentDetails ? 
            <FiChevronUp className="mr-1" /> : 
            <FiChevronDown className="mr-1" />
          } 
          {showPaymentDetails ? "Hide payment details" : "Show payment details"}
        </button>
        
        <AnimatePresence>
          {showPaymentDetails && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-gray-50 p-3 rounded-lg mt-2"
            >
              <h4 className="font-medium text-gray-800 mb-2">Payment Information</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Amount:</span>
                  <span className="ml-2 font-medium">{typeof appointment.payment?.amount === 'number' ? `${appointment.payment.amount.toFixed(2)} EGP` : appointment.payment?.amount}</span>
                </div>
                <div>
                  <span className="text-gray-500">Method:</span>
                  <span className="ml-2 font-medium">{appointment.payment?.method}</span>
                </div>
                <div>
                  <span className="text-gray-500">Date:</span>
                  <span className="ml-2 font-medium">{appointment.payment?.date}</span>
                </div>
                <div>
                  <span className="text-gray-500">Transaction ID:</span>
                  <span className="ml-2 font-medium">{appointment.payment?.transactionId}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <AnimatePresence>
        {(showActions || appointment.status === 'Pending') && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-gray-100 pt-3 mt-3 flex justify-between"
          >
            {appointment.status === 'Pending' && (
              <>
                <button
                  onClick={() => onStatusUpdate(appointment.id, 'Confirmed')}
                  className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                >
                  <FiCheckCircle className="inline-block mr-1.5" /> Confirm
                </button>
                <button
                  onClick={() => onStatusUpdate(appointment.id, 'Cancelled')}
                  className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                >
                  <FiXCircle className="inline-block mr-1.5" /> Cancel
                </button>
              </>
            )}
            
            {appointment.status === 'Confirmed' && (
              <button
                onClick={() => onStatusUpdate(appointment.id, 'Completed')}
                className="px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
              >
                <FiCheckCircle className="inline-block mr-1.5" /> Mark Complete
              </button>
            )}
            
            <button 
              className="px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
              onClick={() => window.location.href = `mailto:${appointment.patientEmail}`}
            >
              <FiMessageSquare className="inline-block mr-1.5" /> Contact
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Calendar day component
const CalendarDay = ({ day, month, year, hasAppointments, isToday, isSelected, onClick }) => (
  <button
    className={`h-10 w-10 rounded-full flex items-center justify-center text-sm relative ${
      isToday ? 'font-bold' : ''
    } ${
      isSelected ? 'bg-blue-500 text-white' : hasAppointments ? 'bg-blue-50 text-blue-700' : ''
    } ${
      day ? 'hover:bg-blue-100 hover:text-blue-800' : ''
    }`}
    onClick={() => day && onClick(day, month, year)}
    disabled={!day}
  >
    {day}
    {hasAppointments && !isSelected && (
      <span className="absolute bottom-1 left-1/2 transform -translate-x-1/2 h-1 w-1 bg-blue-500 rounded-full"></span>
    )}
  </button>
);

// Main component
const DoctorAppointments = () => {
  const { backendUrl, token } = useContext(AppContext);
  const { doctorProfile } = useContext(DoctorContext);
  const navigate = useNavigate();
  
  // State for filters
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days from now
  });
  
  // Calendar specific state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Use custom hook for appointments
  const {
    filteredAppointments,
    loading,
    error,
    isRefreshing,
    fetchAppointments,
    updateAppointmentStatus,
    filterAppointments
  } = useAppointments(token, doctorProfile, backendUrl);
  
  // Handle status update
  const handleStatusUpdate = async (appointmentId, status) => {
    const success = await updateAppointmentStatus(appointmentId, status);
    if (success) {
      toast.success(`Appointment marked as ${status}`);
        } else {
      toast.error("Failed to update appointment status");
    }
  };
  
  // Handle manual refresh
  const handleRefresh = () => {
    fetchAppointments(true);
  };
  
  // Handle filter changes
  useEffect(() => {
    filterAppointments({
      status: filterStatus,
      dateRange,
      searchQuery
    });
  }, [filterStatus, dateRange, searchQuery]);
  
  // Calendar utilities
  const daysInMonth = useMemo(() => {
    return new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  }, [currentMonth]);
  
  const firstDayOfMonth = useMemo(() => {
    return new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  }, [currentMonth]);
  
  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  
  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };
  
  const handleDateClick = (day, month, year) => {
    const newSelectedDate = new Date(year, month, day);
    setSelectedDate(newSelectedDate);
    
    // Update date range to focus on selected date
    setDateRange({
      start: newSelectedDate.toISOString().split('T')[0],
      end: newSelectedDate.toISOString().split('T')[0]
    });
  };

  // Get appointments for a specific date
  const getAppointmentsForDate = (day, month, year) => {
    const date = new Date(year, month, day).toISOString().split('T')[0];
    return filteredAppointments.filter(apt => 
      new Date(apt.appointmentDate).toISOString().split('T')[0] === date
    );
  };
  
  // Error display component
  const ErrorDisplay = ({ message, onRetry }) => (
    <div className="bg-red-50 border border-red-100 rounded-xl p-6 mb-6">
      <div className="flex items-center mb-4">
        <FiAlertTriangle className="text-red-500 mr-3 text-xl" />
        <h3 className="text-lg font-medium text-red-700">Unable to load appointments</h3>
      </div>
      <p className="text-red-600 mb-4">{message || "There was a problem connecting to the server."}</p>
      <div className="flex justify-end">
        <button 
          onClick={onRetry}
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
  
  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm animate-pulse">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center">
              <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
              <div className="ml-3">
                <div className="h-5 w-32 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 w-24 bg-gray-200 rounded"></div>
              </div>
            </div>
            <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[1, 2, 3, 4].map(j => (
              <div key={j} className="h-5 bg-gray-200 rounded"></div>
            ))}
        </div>
        </div>
      ))}
      </div>
    );
  
  // Empty state component
  const EmptyState = () => (
    <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full mb-4">
        <FiCalendar className="h-8 w-8 text-blue-500" />
      </div>
      <h3 className="text-xl font-medium text-gray-900 mb-2">No appointments found</h3>
      <p className="text-gray-600 mb-6">
        {filterStatus !== 'all' 
          ? `You don't have any ${filterStatus.toLowerCase()} appointments in the selected date range.`
          : "You don't have any appointments in the selected date range."}
      </p>
      <div className="flex justify-center">
        <button
          onClick={() => {
            setFilterStatus('all');
            setDateRange({
              start: new Date().toISOString().split('T')[0],
              end: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            });
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FiRefreshCw className="inline-block mr-2" /> Reset Filters
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* Page Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">My Appointments</h1>
          <p className="text-gray-600">Manage and view all your patient appointments</p>
          </div>
          
        <div className="mt-4 md:mt-0 flex items-center gap-3">
            <button
              onClick={handleRefresh}
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
            onClick={() => navigate('/doctor/availability')}
            className="inline-flex items-center justify-center px-4 py-2 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FiCalendar className="mr-2" /> Manage Availability
              </button>
        </div>
      </div>
      
      {/* Error display */}
      {error && (
        <ErrorDisplay message={error} onRetry={handleRefresh} />
      )}
      
      {/* Filters and Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="p-4 border-b border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search patient name, email, reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              />
          </div>
          
            {/* Date Range */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="px-3 py-2 border border-gray-200 rounded-lg"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="px-3 py-2 border border-gray-200 rounded-lg"
              />
          </div>
          
            {/* View toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg">
                            <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center ${
                  viewMode === 'list' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                <FiList className="mr-1.5" /> List
                            </button>
                            <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center ${
                  viewMode === 'calendar' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                <FiGrid className="mr-1.5" /> Calendar
                            </button>
            </div>
          </div>
        </div>
        
        {/* Status Filters */}
        <div className="p-4 flex flex-wrap gap-2">
          {['all', 'Pending', 'Confirmed', 'Completed', 'Cancelled'].map((status) => (
                          <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                filterStatus === status
                  ? status === 'all'
                    ? 'bg-blue-600 text-white'
                    : status === 'Pending'
                    ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                    : status === 'Confirmed'
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : status === 'Completed'
                    ? 'bg-green-100 text-green-700 border border-green-200'
                    : 'bg-red-100 text-red-700 border border-red-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? 'All' : status}
                          </button>
                ))}
          </div>
        </div>
      
      {/* Content */}
      {loading ? (
        <LoadingSkeleton />
      ) : filteredAppointments.length === 0 ? (
        <EmptyState />
      ) : viewMode === 'list' ? (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredAppointments.map(appointment => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              onStatusUpdate={handleStatusUpdate}
            />
          ))}
        </motion.div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Calendar Header */}
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <button
              onClick={handlePrevMonth}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
              <FiChevronLeft />
                </button>
            
            <h3 className="text-lg font-medium text-gray-800">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            
                <button
              onClick={handleNextMonth}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
              <FiChevronRight />
                </button>
            </div>
            
          {/* Calendar Grid */}
          <div className="p-4">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-sm font-medium text-gray-500">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-2">
              {/* Empty cells for days before the first of the month */}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className="h-10 w-10"></div>
              ))}
              
              {/* Actual days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const month = currentMonth.getMonth();
                const year = currentMonth.getFullYear();
                const date = new Date(year, month, day);
                
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                const selected = selectedDate;
                selected.setHours(0, 0, 0, 0);
                
                const isToday = date.getTime() === today.getTime();
                const isSelected = date.getTime() === selected.getTime();
                
                // Check if there are appointments on this day
                const appointmentsOnDay = getAppointmentsForDate(day, month, year);
                const hasAppointments = appointmentsOnDay.length > 0;
                
                return (
                  <CalendarDay
                    key={`day-${day}`}
                    day={day}
                    month={month}
                    year={year}
                    hasAppointments={hasAppointments}
                    isToday={isToday}
                    isSelected={isSelected}
                    onClick={handleDateClick}
                  />
                );
              })}
            </div>
          </div>
          
          {/* Selected Date Appointments */}
          <div className="border-t border-gray-100 p-4">
            <h3 className="text-lg font-medium text-gray-800 mb-4">
              Appointments for {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h3>
            
            <div className="space-y-4">
              {getAppointmentsForDate(
                selectedDate.getDate(),
                selectedDate.getMonth(),
                selectedDate.getFullYear()
              ).length === 0 ? (
                <p className="text-center py-4 text-gray-500">No appointments scheduled for this day</p>
              ) : (
                getAppointmentsForDate(
                  selectedDate.getDate(),
                  selectedDate.getMonth(),
                  selectedDate.getFullYear()
                ).map(appointment => (
                  <AppointmentCard
                    key={appointment.id} 
                    appointment={appointment}
                    onStatusUpdate={handleStatusUpdate}
                  />
                ))
                      )}
                    </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorAppointments;
